import httpx
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .errors import AIServiceError

bearer = HTTPBearer(auto_error=False)


async def require_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> str:
    if credentials is None or not credentials.credentials.strip():
        raise AIServiceError("로그인해 주세요.", 401)
    key = request.app.state.settings.firebase_web_api_key.get_secret_value()
    if not key:
        raise AIServiceError("로그인 확인에 필요한 서버 설정이 없어요.", 503)
    try:
        response = await request.app.state.client.post(
            "https://identitytoolkit.googleapis.com/v1/accounts:lookup",
            params={"key": key},
            json={"idToken": credentials.credentials},
            timeout=15,
        )
    except httpx.RequestError:
        raise AIServiceError(
            "로그인 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요."
        ) from None
    if response.status_code >= 500:
        raise AIServiceError("로그인 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.")
    try:
        user = response.json()["users"][0]
        uid = user["localId"]
        if not response.is_success or not isinstance(uid, str) or not uid:
            raise ValueError("invalid-user")
    except (ValueError, KeyError, IndexError, TypeError):
        raise AIServiceError(
            "로그인이 확인되지 않아요. 다시 로그인한 뒤 시도해 주세요.", 401
        ) from None
    if user.get("disabled"):
        raise AIServiceError("사용할 수 없는 계정이에요.", 403)
    return uid
