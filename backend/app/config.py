from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://northshelf:northshelf_dev@localhost:5432/northshelf"
    app_name: str = "NorthShelf API"

    # Auth. In production, set JWT_SECRET to a long random value and COOKIE_SECURE=true (HTTPS only).
    jwt_secret: str = "dev-only-insecure-secret-change-me"
    access_token_minutes: int = 60 * 24 * 7  # 7 days
    cookie_name: str = "northshelf_session"
    cookie_secure: bool = False

    # File storage: any S3-compatible service (Cloudflare R2 in dev and production).
    s3_endpoint_url: str = ""        # e.g. https://<account-id>.r2.cloudflarestorage.com
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_bucket: str = ""
    s3_region: str = "auto"
    max_upload_mb: int = 25

    # Per-user upload limits (moderators and admins are exempt)
    max_pending_per_user: int = 10       # uploads waiting for review at once
    max_uploads_per_day: int = 15        # in any 24 hours (counts deleted/rejected ones too)
    max_user_storage_mb: int = 500       # total size of a user's non-removed uploads

    # Rate limiting (in-memory; fine for a single server process)
    rate_limit_enabled: bool = True


settings = Settings()
