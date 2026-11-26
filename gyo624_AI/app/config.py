from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(ROOT / ".env", ROOT / ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ai_provider: str = ""
    ai_api_key: SecretStr = SecretStr("")
    openai_api_key: SecretStr = SecretStr("")
    ai_model: str = ""
    openai_model: str = ""
    firebase_web_api_key: SecretStr = SecretStr("")
    setek_rate_limit: int = Field(default=8, gt=0)
    setek_rate_window_ms: int = Field(default=600_000, gt=0)
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def origins(self) -> list[str]:
        return [value.strip() for value in self.allowed_origins.split(",") if value.strip()]
