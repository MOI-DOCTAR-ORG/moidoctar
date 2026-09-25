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

    # Google Gemini AI Triage (API Key from Google AI Studio).
    GOOGLE_API_KEY: str = ""
    # Any number of extra keys, comma / space / newline separated. The pool
    # rotates through them and skips keys that are rate limited or invalid.
    GOOGLE_API_KEYS: str = ""
    GEMINI_MODEL: str = "gemini-flash-lite-latest"

    # Emails that are treated as admins (can manage AI API keys), in addition
    # to users whose role is "admin". Comma separated.
    ADMIN_EMAILS: str = ""

    # Server Port
    PORT: int = 3000

    # Resend Email Service (recommended for OTP & transactional emails).
    # Get your API key from https://resend.com/api-keys
    RESEND_API_KEY: str = ""
    RESEND_FROM: str = "MoiDoctar <onboarding@resend.dev>"

    # SMTP (outbound email for OTP verification codes / password-reset
    # codes). If SMTP_HOST is left blank, OTP codes are logged to the
    # server console instead of emailed, so signup/verify/reset still work
    # end-to-end in local dev without real SMTP credentials configured.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    # Optional. Falls back to SMTP_USER when unset.
    SMTP_FROM: str = ""
    # STARTTLS on a plaintext connection (typical for port 587). Ignored
    # when SMTP_USE_SSL is true.
    SMTP_USE_TLS: bool = True
    # Implicit TLS from the first byte (typical for port 465).
    SMTP_USE_SSL: bool = False

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,https://moidoctar.vercel.app,https://moidoctar8.pxxlspace.cv"

    @property
    def effective_resend_api_key(self) -> str:
        key = (
            os.getenv("RESEND_API_KEY")
            or os.getenv("RESEND_KEY")
            or os.getenv("RESEND_TOKEN")
            or self.RESEND_API_KEY
            or ""
        ).strip().strip("'\" \t\r\n")
        return key

    @property
    def effective_resend_from(self) -> str:
        addr = (
            os.getenv("RESEND_FROM")
            or os.getenv("RESEND_SENDER")
            or self.RESEND_FROM
            or "MoiDoctar <onboarding@resend.dev>"
        ).strip().strip("'\" \t\r\n")
        return addr

    @property
    def effective_smtp_host(self) -> str:
        return (
            os.getenv("SMTP_HOST")
            or os.getenv("SMTP_SERVER")
            or os.getenv("MAIL_HOST")
            or os.getenv("MAIL_SERVER")
            or os.getenv("EMAIL_HOST")
            or os.getenv("EMAIL_SERVER")
            or self.SMTP_HOST
            or ""
        ).strip().strip("'\" \t\r\n")

    @property
    def effective_smtp_user(self) -> str:
        return (
            os.getenv("SMTP_USER")
            or os.getenv("SMTP_USERNAME")
            or os.getenv("SMTP_EMAIL")
            or os.getenv("MAIL_USER")
            or os.getenv("MAIL_USERNAME")
            or os.getenv("EMAIL_USER")
            or os.getenv("EMAIL_USERNAME")
            or os.getenv("GMAIL_USER")
            or os.getenv("GMAIL_USERNAME")
            or self.SMTP_USER
            or ""
        ).strip().strip("'\" \t\r\n")

    @property
    def effective_smtp_password(self) -> str:
        # App passwords often have spaces like "abcd efgh ijkl mnop", remove spaces
        raw = (
            os.getenv("SMTP_PASSWORD")
            or os.getenv("SMTP_PASS")
            or os.getenv("SMTP_KEY")
            or os.getenv("EMAIL_PASSWORD")
            or os.getenv("EMAIL_PASS")
            or os.getenv("MAIL_PASSWORD")
            or os.getenv("MAIL_PASS")
            or os.getenv("GMAIL_APP_PASSWORD")
            or os.getenv("GMAIL_PASSWORD")
            or os.getenv("GMAIL_PASS")
            or os.getenv("APP_PASSWORD")
            or self.SMTP_PASSWORD
            or ""
        ).strip().strip("'\" \t\r\n")
        return raw.replace(" ", "")

    @property
    def effective_smtp_port(self) -> int:
        raw = (
            os.getenv("SMTP_PORT")
            or os.getenv("MAIL_PORT")
            or os.getenv("EMAIL_PORT")
            or str(self.SMTP_PORT)
            or "587"
        ).strip().strip("'\" \t\r\n")
        try:
            return int(raw)
        except (ValueError, TypeError):
            return 587

    @property
    def effective_smtp_use_ssl(self) -> bool:
        raw = (
            os.getenv("SMTP_USE_SSL")
            or os.getenv("SMTP_SSL")
            or os.getenv("MAIL_USE_SSL")
            or os.getenv("MAIL_SSL")
            or os.getenv("EMAIL_USE_SSL")
        )
        if raw is not None:
            return str(raw).strip().lower() in ("true", "1", "yes", "on")
        # Automatically use SSL if port is 465
        return self.effective_smtp_port == 465

    @property
    def effective_smtp_use_tls(self) -> bool:
        raw = (
            os.getenv("SMTP_USE_TLS")
            or os.getenv("SMTP_TLS")
            or os.getenv("MAIL_USE_TLS")
            or os.getenv("MAIL_TLS")
            or os.getenv("EMAIL_USE_TLS")
        )
        if raw is not None:
            return str(raw).strip().lower() in ("true", "1", "yes", "on")
        # If not SSL and port is 587 or 25, default to STARTTLS True
        return not self.effective_smtp_use_ssl

    @property
    def effective_smtp_from(self) -> str:
        raw = (
            os.getenv("SMTP_FROM")
            or os.getenv("MAIL_FROM")
            or os.getenv("EMAIL_FROM")
            or os.getenv("DEFAULT_FROM_EMAIL")
            or os.getenv("MAIL_SENDER")
            or self.SMTP_FROM
            or ""
        ).strip().strip("'\" \t\r\n")
        if raw:
            return raw
        user = self.effective_smtp_user
        if user and "@" in user:
            return f"MoiDoctar <{user}>"
        return "MoiDoctar <noreply@moidoctar.com>"

    @property
    def email_provider_preference(self) -> str:
        """Returns 'smtp', 'resend', or 'auto'."""
        provider = (
            os.getenv("EMAIL_PROVIDER")
            or os.getenv("MAIL_PROVIDER")
            or os.getenv("EMAIL_BACKEND")
            or ""
        ).strip().lower()
        if provider in ("smtp", "mail"):
            return "smtp"
        if provider == "resend":
            return "resend"
        return "auto"


    @property
    def normalized_supabase_url(self) -> str:
        url = (self.SUPABASE_URL or "").strip().rstrip("/")
        import re
        match = re.search(r"/project/([a-zA-Z0-9_-]+)", url)
        if match:
            return f"https://{match.group(1)}.supabase.co"
        return url

    @property
    def admin_emails_list(self) -> List[str]:
        return [e.strip().lower() for e in self.ADMIN_EMAILS.split(",") if e.strip()]

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
