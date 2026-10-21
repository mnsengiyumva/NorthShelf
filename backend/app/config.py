from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://northshelf:northshelf_dev@localhost:5432/northshelf"
    app_name: str = "NorthShelf API"


settings = Settings()
