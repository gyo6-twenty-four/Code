import json

import httpx
import pytest
from conftest import AUTH, TEXT, linked_response

from app.config import Settings
from app.generation import RateLimiter
from app.providers import provider_config


def user_response():
    return httpx.Response(200, json={"users": [{"localId": "teacher-1"}]})


def test_health_status_and_openapi(client_factory):
    client, calls = client_factory(ai_api_key="")
    assert client.get("/health").json() == {"status": "ok"}
    response = client.get("/api/setek/status")
    assert response.json() == {"configured": False, "provider": ""}
    assert response.headers["cache-control"] == "no-store"
    schema = client.get("/openapi.json").json()
    assert "/api/setek/generate" in schema["paths"]
    assert "GenerationRequest" in schema["components"]["schemas"]
    assert calls == []


def test_authentication_is_required(client_factory, payload):
    client, calls = client_factory()
    assert client.post("/api/setek/generate", json=payload).status_code == 401
    assert calls == []


@pytest.mark.parametrize(
    "auth_response,expected",
    [
        (httpx.Response(400, json={"error": {"message": "INVALID_ID_TOKEN"}}), 401),
        (httpx.Response(200, json={"users": [{"localId": "t", "disabled": True}]}), 403),
        (httpx.Response(503, text="temporary failure"), 502),
    ],
)
def test_invalid_or_disabled_user_is_rejected(client_factory, payload, auth_response, expected):
    def handler(request):
        assert request.url.host == "identitytoolkit.googleapis.com"
        return auth_response

    client, _ = client_factory(handler)
    assert client.post("/api/setek/generate", headers=AUTH, json=payload).status_code == expected


def test_missing_auth_or_model_configuration(client_factory, payload):
    client, calls = client_factory(firebase_web_api_key="")
    assert client.post("/api/setek/generate", headers=AUTH, json=payload).status_code == 503
    assert calls == []
    client, calls = client_factory(ai_api_key="")
    assert client.post("/api/setek/generate", headers=AUTH, json=payload).status_code == 503
    assert len(calls) == 1


def test_generated_contract_and_identity_filtering(client_factory, payload):
    def handler(request):
        if request.url.host == "identitytoolkit.googleapis.com":
            assert json.loads(request.content)["idToken"] == "test-token"
            return user_response()
        body = json.loads(request.content)
        assert "가상학생" not in json.dumps(body, ensure_ascii=False)
        assert "test-secret" not in json.dumps(body)
        assert body["model"] == "gpt-4o-mini"
        assert "max_tokens" in body and "reasoning_effort" not in body
        return httpx.Response(
            200, json={"choices": [{"message": {"content": f"{TEXT}\n\n교사 확인\n- 원문 확인"}}]}
        )

    client, _ = client_factory(handler, ai_model="gpt-4o-mini")
    response = client.post(
        "/api/setek/generate", headers=AUTH, json={**payload, "studentName": "가상학생"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == TEXT
    assert data["reviewNotes"] == ["원문 확인"]
    assert data["characterCount"] == len(TEXT)
    assert data["byteCount"] == len(TEXT.encode("utf-8"))
    assert "sentences" not in data
    assert data["count"] == data["characterCount"]
    assert response.headers["cache-control"] == "no-store"


def test_linked_response_matches_frontend_shape(client_factory, payload):
    def handler(request):
        return (
            user_response()
            if request.url.host == "identitytoolkit.googleapis.com"
            else linked_response()
        )

    client, _ = client_factory(handler)
    response = client.post(
        "/api/setek/generate", headers=AUTH, json={**payload, "includeSources": True}
    )
    assert response.status_code == 200
    assert response.json()["sentences"] == [
        {
            "text": TEXT,
            "sources": [
                {
                    "field": "lesson.lessonActivities",
                    "start": 0,
                    "text": payload["lesson"]["lessonActivities"],
                }
            ],
        }
    ]


@pytest.mark.parametrize("ids", [[99], [True], [0], [1.5]])
def test_invalid_source_reference_is_not_returned(client_factory, payload, ids):
    def handler(request):
        return (
            user_response()
            if request.url.host == "identitytoolkit.googleapis.com"
            else linked_response(ids=ids)
        )

    client, _ = client_factory(handler)
    response = client.post(
        "/api/setek/generate", headers=AUTH, json={**payload, "includeSources": True}
    )
    assert response.status_code == 502
    assert "sentences" not in response.json()


def test_short_draft_expands_once_using_original_sources(client_factory, payload):
    provider_calls = []

    def handler(request):
        if request.url.host == "identitytoolkit.googleapis.com":
            return user_response()
        provider_calls.append(json.loads(request.content))
        return linked_response("꼭짓점을 설명함." if len(provider_calls) == 1 else TEXT)

    client, _ = client_factory(handler)
    response = client.post(
        "/api/setek/generate", headers=AUTH, json={**payload, "includeSources": True}
    )
    assert response.status_code == 200
    assert response.json()["content"] == TEXT
    assert len(provider_calls) == 2
    assert "크게 못 미친다" in provider_calls[1]["messages"][1]["content"]
    assert "없는 활동" in provider_calls[1]["messages"][1]["content"]


def test_rate_limit_stops_additional_model_calls(client_factory, payload):
    client, calls = client_factory(setek_rate_limit=1)
    assert client.post("/api/setek/generate", headers=AUTH, json=payload).status_code == 200
    before = sum(request.url.host == "api.openai.com" for request in calls)
    response = client.post("/api/setek/generate", headers=AUTH, json=payload)
    assert response.status_code == 429
    assert int(response.headers["retry-after"]) >= 1
    assert sum(request.url.host == "api.openai.com" for request in calls) == before


@pytest.mark.parametrize("status,expected", [(401, 502), (404, 502), (429, 429), (500, 502)])
def test_provider_errors_are_sanitized(client_factory, payload, status, expected):
    def handler(request):
        return (
            user_response()
            if request.url.host == "identitytoolkit.googleapis.com"
            else httpx.Response(status, text="test-secret private upstream detail")
        )

    client, _ = client_factory(handler)
    response = client.post("/api/setek/generate", headers=AUTH, json=payload)
    assert response.status_code == expected
    assert "test-secret" not in response.text
    assert "private upstream" not in response.text


def test_timeout_preserves_error_contract(client_factory, payload):
    def handler(request):
        if request.url.host == "identitytoolkit.googleapis.com":
            return user_response()
        raise httpx.ReadTimeout("private detail", request=request)

    client, _ = client_factory(handler)
    response = client.post("/api/setek/generate", headers=AUTH, json=payload)
    assert response.status_code == 502
    assert "지연" in response.json()["message"]


@pytest.mark.parametrize("provider", ["gemini", "anthropic"])
def test_other_providers_return_same_contract(client_factory, payload, provider):
    def handler(request):
        if request.url.host == "identitytoolkit.googleapis.com":
            return user_response()
        result = (
            {"candidates": [{"content": {"parts": [{"text": TEXT}]}}]}
            if provider == "gemini"
            else {"content": [{"type": "text", "text": TEXT}]}
        )
        return httpx.Response(200, json=result)

    client, _ = client_factory(handler, ai_provider=provider)
    response = client.post("/api/setek/generate", headers=AUTH, json=payload)
    assert response.status_code == 200
    assert response.json()["content"] == TEXT
    assert response.json()["provider"] == provider


def test_cors_and_body_limit_and_invalid_json(client_factory):
    client, calls = client_factory()
    allowed = client.options(
        "/api/setek/generate",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Authorization, Content-Type",
        },
    )
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    blocked = client.options(
        "/api/setek/generate",
        headers={"Origin": "https://unlisted.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in blocked.headers
    response = client.post(
        "/api/setek/generate",
        content="x" * 100001,
        headers={**AUTH, "Origin": "http://localhost:5173"},
    )
    assert response.status_code == 413
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert calls == []
    assert (
        client.post(
            "/api/setek/generate", content="{", headers={**AUTH, "Content-Type": "application/json"}
        ).status_code
        == 400
    )


def test_openai_key_fallback_and_redacted_config():
    settings = Settings(
        _env_file=None,
        ai_provider="",
        ai_api_key="",
        openai_api_key="private-test-key",
        openai_model="test-model",
    )
    config = provider_config(settings)
    assert config.name == "openai" and config.model == "test-model"
    assert "private-test-key" not in repr(config)
    assert "private-test-key" not in repr(settings)


def test_rate_limit_expiry():
    now = [100.0]
    limiter = RateLimiter(limit=1, window_ms=1000, clock=lambda: now[0])
    limiter.check("teacher")
    now[0] += 1
    limiter.check("teacher")
