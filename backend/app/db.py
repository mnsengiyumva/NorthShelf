from sqlalchemy import create_engine

from .config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)


def get_conn():
    """FastAPI dependency: one DB connection per request."""
    with engine.connect() as conn:
        yield conn
