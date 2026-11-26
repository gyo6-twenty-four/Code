from contextlib import asynccontextmanager

import httpx
from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .auth import require_user
from .body_limit import BodyLimitMiddleware
from .config import Settings
from .errors import AIServiceError
from .generation import RateLimiter, generate_draft
from .providers import provider_config
from .schemas import GenerationRequest, GenerationResponse


def create_app(settings: Settings | None = None, transport=None) -> FastAPI:
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        async with httpx.AsyncClient(transport=transport, follow_redirects=False) as client:
            app.state.client = client
            yield

    app = FastAPI(title="교육24 AI", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.limiter = RateLimiter(settings.setek_rate_limit, settings.setek_rate_window_ms)
    app.add_middleware(BodyLimitMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.exception_handler(AIServiceError)
    async def service_error(_request: Request, error: AIServiceError):
        return JSONResponse(
            {"message": error.message},
            status_code=error.status,
            headers={"Cache-Control": "no-store", **error.headers},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, error: RequestValidationError):
        first = error.errors()[0]
        message = str(first.get("ctx", {}).get("error", "생성 요청 형식을 확인해 주세요."))
        return JSONResponse(
            {"message": message}, status_code=400, headers={"Cache-Control": "no-store"}
        )

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    @app.get("/api/setek/status")
    async def status():
        config = provider_config(settings)
        return JSONResponse(
            {"configured": config is not None, "provider": config.name if config else ""},
            headers={"Cache-Control": "no-store"},
        )

    @app.post(
        "/api/setek/generate", response_model=GenerationResponse, response_model_exclude_none=True
    )
    async def generate(
        payload: GenerationRequest, request: Request, uid: str = Depends(require_user)
    ):
        app.state.limiter.check(uid)
        config = provider_config(settings)
        if config is None:
            raise AIServiceError(
                "AI 연결이 아직 설정되지 않았어요. AI 서버의 API 키를 확인해 주세요.", 503
            )
        result = await generate_draft(payload, request.app.state.client, config)
        return JSONResponse(
            result.model_dump(by_alias=True, exclude_none=True),
            headers={"Cache-Control": "no-store"},
        )

    return app


app = create_app()
