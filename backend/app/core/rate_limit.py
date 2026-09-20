"""In-process sliding-window rate limiting (mitigation for abuse/brute force).

The limiter is intentionally dependency-free and process-local. A single
process already protects the authentication and public computational
endpoints in the current single-instance deployment. For a multi-worker or
horizontally scaled deployment swap ``_STORE`` for a shared store (Redis)
keeping the same ``rate_limit`` dependency interface.

Security invariants:
- Windows are sliding (not fixed), so bursts straddling a boundary are still
  counted together.
- Events are keyed per bucket + client IP so one endpoint cannot exhaust
  another endpoint's budget.
- Failed checks never register a new event, so a blocked client cannot
  extend its own lockout by hammering the endpoint.
"""

from __future__ import annotations

import threading
from collections import defaultdict, deque
from typing import Callable

from fastapi import HTTPException, Request, status

from app.core.config import get_settings


def client_ip(request: Request) -> str:
    """Return the client IP, honouring a trusted X-Forwarded-For when enabled.

    The header is only consulted when ``TRUST_PROXY_HEADERS`` is True (app runs
    behind a reverse proxy); otherwise clients could trivially spoof it to
    bypass per-IP limits.
    """
    if get_settings().trust_proxy_headers:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class _SlidingWindowStore:
    def __init__(self) -> None:
        self._events: defaultdict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def is_allowed(self, key: str, *, limit: int, window_seconds: float) -> bool:
        if limit < 1 or window_seconds <= 0:
            raise ValueError("limit must be >= 1 and window_seconds must be > 0")
        now = _monotonic()
        cutoff = now - window_seconds
        with self._lock:
            events = self._events[key]
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= limit:
                return False
            events.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._events.clear()


_STORE = _SlidingWindowStore()


def _monotonic() -> float:
    import time

    return time.monotonic()


def reset_rate_limits() -> None:
    _STORE.reset()


def rate_limit(
    limit: int,
    window_seconds: float,
    bucket: str,
) -> Callable[[Request], None]:
    """Return a FastAPI dependency enforcing ``limit`` calls per ``window_seconds`` per IP.

    Example: ``current_user=Depends(rate_limit(20, 300, "login"))``
    """

    def dependency(request: Request) -> None:
        settings = get_settings()
        effective_limit = limit if settings.app_env in ("production", "test") else max(limit, 500)
        ip = client_ip(request)
        key = f"{bucket}:{ip}"
        if not _STORE.is_allowed(key, limit=effective_limit, window_seconds=window_seconds):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(int(window_seconds))},
            )

    return dependency