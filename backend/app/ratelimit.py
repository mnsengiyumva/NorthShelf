"""A small in-memory sliding-window rate limiter.

Good enough while NorthShelf runs as a single server process. If it ever runs as
several processes or servers, move the counters to a shared store such as Redis.
"""
import threading
import time
from collections import deque

from fastapi import HTTPException, Request

from .config import settings

_MAX_WINDOW = 24 * 3600


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def _prune(self, key: str, window: float, now: float) -> deque[float] | None:
        q = self._events.get(key)
        if q is None:
            return None
        cutoff = now - window
        while q and q[0] <= cutoff:
            q.popleft()
        if not q:
            del self._events[key]
            return None
        return q

    def check(self, key: str, limit: int, window: float, detail: str | None = None) -> None:
        """Raise 429 if `key` already has `limit` events inside the window."""
        if not settings.rate_limit_enabled:
            return
        now = time.monotonic()
        with self._lock:
            q = self._prune(key, window, now)
            if q is not None and len(q) >= limit:
                retry_after = max(1, int(q[0] + window - now) + 1)
                raise HTTPException(
                    status_code=429,
                    detail=detail or "Too many requests. Please try again later.",
                    headers={"Retry-After": str(retry_after)},
                )

    def add(self, key: str) -> None:
        if not settings.rate_limit_enabled:
            return
        now = time.monotonic()
        with self._lock:
            self._events.setdefault(key, deque()).append(now)
            if len(self._events) > 20000:  # occasional sweep so memory can't grow forever
                for k in list(self._events):
                    self._prune(k, _MAX_WINDOW, now)

    def hit(self, key: str, limit: int, window: float, detail: str | None = None) -> None:
        """Check, then count this request."""
        self.check(key, limit, window, detail)
        self.add(key)

    def reset(self) -> None:
        with self._lock:
            self._events.clear()


limiter = SlidingWindowLimiter()


def client_ip(request: Request) -> str:
    # Behind a proxy, run uvicorn with --proxy-headers so this is the visitor's real IP.
    return request.client.host if request.client else "unknown"
