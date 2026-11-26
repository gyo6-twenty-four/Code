import copy
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

TEXT = "이차함수 그래프의 꼭짓점을 찾아 그래프의 모양과 위치를 비교하고 그 결과를 활동지에 정리함."
BASE = {
    "curriculumName": "2022 개정 교육과정",
    "curriculumYear": 2022,
    "schoolLevel": "high",
    "subjectName": "수학",
    "subjectType": "일반선택",
    "standards": [],
    "lesson": {"lessonActivities": "이차함수 그래프의 꼭짓점을 설명했다."},
    "student": {},
    "growth": {},
    "traits": [],
    "unit": "characters",
    "targetLength": 50,
}
AUTH = {"Authorization": "Bearer test-token"}


@pytest.fixture
def payload():
    return copy.deepcopy(BASE)


@pytest.fixture
def client_factory():
    clients = []

    def factory(handler=None, **overrides):
        settings = Settings(
            _env_file=None,
            **{
                "ai_provider": "openai",
                "ai_api_key": "test-secret",
                "openai_api_key": "",
                "firebase_web_api_key": "test-project",
                **overrides,
            },
        )
        calls = []

        def dispatch(request):
            calls.append(request)
            if handler:
                return handler(request)
            if request.url.host == "identitytoolkit.googleapis.com":
                return httpx.Response(200, json={"users": [{"localId": "teacher-1"}]})
            return httpx.Response(200, json={"choices": [{"message": {"content": TEXT}}]})

        client = TestClient(create_app(settings, transport=httpx.MockTransport(dispatch)))
        client.__enter__()
        clients.append(client)
        return client, calls

    yield factory
    for client in clients:
        client.__exit__(None, None, None)


def linked_response(text=TEXT, ids=None, notes=None):
    content = json.dumps(
        {"sentences": [{"text": text, "sourceIds": ids or [1]}], "notes": notes or []},
        ensure_ascii=False,
    )
    return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})
