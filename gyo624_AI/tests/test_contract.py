import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.fields import count_units, utf16_length
from app.generation import input_sentences
from app.prompt_builder import build_user_prompt, clean_generated_text, split_generated_draft
from app.schemas import GenerationRequest

CASES = json.loads((Path(__file__).parent / "fixtures/legacy-prompts.json").read_text())


@pytest.mark.parametrize("case", CASES)
def test_python_prompt_matches_existing_javascript(case):
    parsed = GenerationRequest.model_validate(case["request"])
    assert build_user_prompt(parsed.prompt_data()) == case["prompt"]


def test_counts_and_teacher_notes():
    assert count_units("가 나.") == 4
    assert count_units("가 나.", "bytes") == 8
    assert count_units("🙂") == 1
    assert utf16_length("🙂") == 2
    assert clean_generated_text("```\n탐구함.\n```") == "탐구함."
    assert split_generated_draft("탐구함.\n\n교사 확인\n- 입력을 검토해야 함") == {
        "content": "탐구함.",
        "notes": ["입력을 검토해야 함"],
    }


def test_source_offsets_preserve_decimals_and_javascript_unicode_positions(payload):
    text = "🙂 12.3cm와 12.8cm를 비교했다. 다음 값을 정리했다.\n차이를 0.5cm로 계산했다."
    payload["lesson"] = {"lessonActivities": text}
    sources = input_sentences(GenerationRequest.model_validate(payload).prompt_data())
    expected = ["🙂 12.3cm와 12.8cm를 비교했다.", "다음 값을 정리했다.", "차이를 0.5cm로 계산했다."]
    assert [row["text"] for row in sources] == expected
    for row in sources:
        assert row["start"] == utf16_length(text[: text.index(row["text"])])
        encoded = text.encode("utf-16-le")
        assert (
            encoded[row["start"] * 2 : (row["start"] + utf16_length(row["text"])) * 2].decode(
                "utf-16-le"
            )
            == row["text"]
        )


def test_unknown_identity_fields_are_not_in_ai_payload(payload):
    parsed = GenerationRequest.model_validate(
        {**payload, "studentName": "가상학생", "studentId": "unused-id"}
    )
    text = json.dumps(parsed.prompt_data(), ensure_ascii=False)
    assert "가상학생" not in text
    assert "unused-id" not in text


@pytest.mark.parametrize(
    "update",
    [
        {"traits": ["미등록 특성"]},
        {"targetLength": True},
        {"targetLength": 50.5},
        {"targetLength": 2001},
        {"mode": "shorten", "previousContent": ""},
        {"lesson": {}, "traits": ["탐구 능력"]},
        {"lesson": {"lessonActivities": "010-1234-5678로 보냈다."}},
        {"lesson": {"lessonActivities": "teacher@example.com으로 보냈다."}},
        {"lesson": {"lessonActivities": "가" * 2001}},
    ],
)
def test_invalid_input_is_rejected(payload, update):
    with pytest.raises(ValidationError):
        GenerationRequest.model_validate({**payload, **update})
