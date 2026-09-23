from typing import List
import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "MoiDoctar API"

    # Supabase Configuration
    SUPABASE_URL: str = "https://your-project.supabase.co"
    SUPABASE_KEY: str = "your-supabase-anon-or-service-role-key"

    # Security & JWT
    SECRET_KEY: str = "moidoctar-dev-secret-key-2026-auth-session"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Google Sign-In (OAuth Client ID from Google Cloud Console).
    # Must match the frontend's VITE_GOOGLE_CLIENT_ID - used to verify that
    # a Google ID token was actually issued for this app before trusting it.
    GOOGLE_CLIENT_ID: str = ""

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,https://moidoctar.vercel.app"

    @property
    def normalized_supabase_url(self) -> str:
        url = (self.SUPABASE_URL or "").strip().rstrip("/")
        import re
        match = re.search(r"/project/([a-zA-Z0-9_-]+)", url)
        if match:
            return f"https://{match.group(1)}.supabase.co"
        return url

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
