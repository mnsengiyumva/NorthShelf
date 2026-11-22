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


settings = Settings()
