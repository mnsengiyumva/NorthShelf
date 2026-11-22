from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://northshelf:northshelf_dev@localhost:5432/northshelf"
    app_name: str = "NorthShelf API"

    # Auth. In production, set JWT_SECRET to a long random value and COOKIE_SECURE=true (HTTPS only).
    jwt_secret: str = "dev-only-insecure-secret-change-me"
    access_token_minutes: int = 60 * 24 * 7  # 7 days
    cookie_name: str = "northshelf_session"
    cookie_secure: bool = False


settings = Settings()
