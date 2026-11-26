import json
import math
import re
import time
from collections import deque

import httpx

from .errors import AIServiceError
from .fields import count_units, utf16_length
from .prompt_builder import (
    SOURCE_INSTRUCTIONS,
    SYSTEM_PROMPT,
    build_user_prompt,
    clean_generated_text,
    split_generated_draft,
)
from .providers import ProviderConfig, generate
from .schemas import SOURCE_GROUPS, GenerationRequest, GenerationResponse


class RateLimiter:
    """Per-process limit; production-wide limits belong in a shared gateway/store."""

    def __init__(self, limit=8, window_ms=600_000, clock=time.monotonic):
        self.limit = limit
        self.window = window_ms / 1000
        self.clock = clock
        self.hits: dict[str, deque] = {}

    def check(self, uid: str):
        now = self.clock()
        if len(self.hits) > 1024:
            self.hits = {
                key: items
                for key, items in self.hits.items()
                if items and now - items[-1] < self.window
            }
        recent = self.hits.setdefault(uid, deque())
        while recent and now - recent[0] >= self.window:
            recent.popleft()
        if len(recent) >= self.limit:
            retry = max(1, math.ceil(recent[0] + self.window - now))
            raise AIServiceError(
                f"생성 요청이 많아요. {retry}초 후에 다시 시도해 주세요.",
                429,
                {"Retry-After": str(retry)},
            )
        recent.append(now)


def input_sentences(data: dict) -> list[dict]:
    """Split newline/sentence boundaries, preserving decimal points and UTF-16 offsets."""
    originals = []
    groups = [(group, data[group], fields) for group, fields in SOURCE_GROUPS]
    groups.append(("traits", {"traitNote": data["traitNote"]}, (("traitNote", ""),)))
    for group, values, fields in groups:
        for key, _label in fields:
            value = values[key]
            for line in re.finditer(r"[^\n]+", value):
                start = 0
                for boundary in re.finditer(r"(?<=[.!?。！？])(?=\s|$)|$", line.group()):
                    segment = line.group()[start : boundary.start()]
                    text = segment.strip()
                    if text:
                        offset = line.start() + start + len(segment) - len(segment.lstrip())
                        originals.append(
                            {
                                "field": f"{group}.{key}",
                                "start": utf16_length(value[:offset]),
                                "text": text,
                            }
                        )
                    start = boundary.start()
    return originals


def read_linked_draft(output: str, originals: list[dict]) -> dict:
    try:
        data = json.loads(clean_generated_text(output))
        rows, notes = data["sentences"], data["notes"]
        if (
            not isinstance(rows, list)
            or not isinstance(notes, list)
            or not all(isinstance(note, str) for note in notes)
        ):
            raise ValueError("invalid-shape")
        sentences = []
        for row in rows:
            text, ids = row["text"], row["sourceIds"]
            if (
                not isinstance(text, str)
                or not text.strip()
                or "\n" in text
                or "\r" in text
                or not isinstance(ids, list)
                or not ids
                or not all(type(index) is int and 1 <= index <= len(originals) for index in ids)
            ):
                raise ValueError("invalid-source")
            sentences.append(
                {
                    "text": text.strip(),
                    "sources": [originals[index - 1] for index in dict.fromkeys(ids)],
                }
            )
        return {
            "content": " ".join(row["text"] for row in sentences),
            "notes": notes,
            "sentences": sentences,
        }
    except (ValueError, KeyError, IndexError, TypeError):
        raise AIServiceError("AI의 문장별 근거를 확인하지 못했어요. 다시 생성해 주세요.") from None


async def generate_draft(
    payload: GenerationRequest, client: httpx.AsyncClient, config: ProviderConfig
) -> GenerationResponse:
    data = payload.prompt_data()
    originals = input_sentences(data) if payload.include_sources else None
    source_prompt = ""
    system = SYSTEM_PROMPT
    if originals is not None:
        numbered = [[index + 1, row["text"]] for index, row in enumerate(originals)]
        source_prompt = "\n\n교사 입력 원문 (번호, 문장): " + json.dumps(
            numbered, ensure_ascii=False, separators=(",", ":")
        )
        system += SOURCE_INSTRUCTIONS
    budget = math.ceil(payload.target_length * (1.2 if payload.unit == "bytes" else 2.5))
    max_tokens = min(4000, budget + (500 if originals is not None else 200))

    async def draft(values):
        output = await generate(
            client, config, system, build_user_prompt(values) + source_prompt, max_tokens
        )
        return (
            read_linked_draft(output, originals)
            if originals is not None
            else split_generated_draft(output)
        )

    result = await draft(data)
    first_count = count_units(result["content"], payload.unit)
    if payload.mode != "shorten" and 0 < first_count < math.ceil(payload.target_length * 0.8):
        expanded = await draft(
            {
                **data,
                "mode": "expand",
                "previousContent": result["content"],
                "currentCount": first_count,
            }
        )
        if count_units(expanded["content"], payload.unit) > first_count:
            result = expanded
    content = result["content"]
    if not content and not result["notes"]:
        raise AIServiceError("AI가 빈 초안을 돌려줬어요. 다시 생성해 주세요.")
    count = count_units(content, payload.unit)
    return GenerationResponse(
        content=content,
        review_notes=result["notes"],
        sentences=result.get("sentences"),
        count=count,
        character_count=count_units(content),
        byte_count=count_units(content, "bytes"),
        unit=payload.unit,
        target_length=payload.target_length,
        over_limit=count > payload.target_length,
        provider=config.name,
    )
