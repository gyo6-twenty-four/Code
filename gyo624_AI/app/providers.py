from dataclasses import dataclass

import httpx
from pydantic import SecretStr

from .config import Settings
from .errors import AIServiceError

# Preserve existing model defaults during extraction; availability is not verified here.
DEFAULT_MODELS = {
    "openai": "gpt-6.1-terra",
    "gemini": "gemini-2.0-flash",
    "anthropic": "claude-3-5-haiku-latest",
}


@dataclass(frozen=True)
class ProviderConfig:
    name: str
    model: str
    api_key: SecretStr


def provider_config(settings: Settings) -> ProviderConfig | None:
    name = settings.ai_provider.strip().lower() or (
        "openai" if settings.openai_api_key.get_secret_value().strip() else ""
    )
    key = settings.ai_api_key.get_secret_value().strip()
    if not key and name == "openai":
        key = settings.openai_api_key.get_secret_value().strip()
    if name not in DEFAULT_MODELS or not key:
        return None
    model = settings.ai_model.strip() or (settings.openai_model.strip() if name == "openai" else "")
    return ProviderConfig(name, model or DEFAULT_MODELS[name], SecretStr(key))


async def generate(
    client: httpx.AsyncClient, config: ProviderConfig, system: str, user: str, max_tokens: int
) -> str:
    key = config.api_key.get_secret_value()
    if config.name == "openai":
        legacy = config.model.startswith(("gpt-3", "gpt-4"))
        url = "https://api.openai.com/v1/chat/completions"
        headers = {"authorization": f"Bearer {key}"}
        body = {
            "model": config.model,
            "temperature": 0.4,
            **(
                {"max_tokens": max_tokens}
                if legacy
                else {"max_completion_tokens": max_tokens, "reasoning_effort": "none"}
            ),
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        }
    elif config.name == "gemini":
        from urllib.parse import quote

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{quote(config.model, safe='')}:generateContent"
        headers = {"x-goog-api-key": key}
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {"temperature": 0.4, "maxOutputTokens": max_tokens},
        }
    else:
        url = "https://api.anthropic.com/v1/messages"
        headers = {"x-api-key": key, "anthropic-version": "2023-06-01"}
        body = {
            "model": config.model,
            "max_tokens": max_tokens,
            "temperature": 0.4,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        }
    try:
        response = await client.post(url, headers=headers, json=body, timeout=45)
    except httpx.TimeoutException:
        raise AIServiceError("AI 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.") from None
    except httpx.RequestError:
        raise AIServiceError("AI 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.") from None
    if not response.is_success:
        if response.status_code == 429:
            raise AIServiceError("AI 사용량이 많아 잠시 후 다시 시도해 주세요.", 429)
        if response.status_code in (401, 403):
            raise AIServiceError("AI 인증에 실패했어요. 서버의 API 키를 확인해 주세요.")
        if response.status_code == 404:
            raise AIServiceError("AI 모델을 찾지 못했어요. 서버의 AI_MODEL 값을 확인해 주세요.")
        raise AIServiceError("AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.")
    try:
        data = response.json()
        if config.name == "openai":
            text = data["choices"][0]["message"]["content"]
        elif config.name == "gemini":
            text = "".join(
                part.get("text", "") for part in data["candidates"][0]["content"]["parts"]
            )
        else:
            text = "".join(
                part.get("text", "") for part in data["content"] if part.get("type") == "text"
            )
        if not isinstance(text, str) or not text.strip():
            raise ValueError("empty-output")
        return text
    except (ValueError, KeyError, IndexError, TypeError, AttributeError):
        raise AIServiceError("AI 응답 형식을 확인하지 못했어요. 다시 시도해 주세요.") from None
