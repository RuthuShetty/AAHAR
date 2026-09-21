"""
AAHAR rate limiting.

Deliberately dependency-free: a fixed-window counter with an in-process
store by default and a Redis store when REDIS_URL is reachable. Adding
slowapi would pull in limits//redis wiring for the same behaviour.

LIMITATION (documented, not hidden): the in-process store is per-worker.
With N uvicorn workers the effective limit is N x the configured value.
Set AAHAR_RATE_LIMIT_BACKEND=redis for a shared counter in production.
"""
import asyncio
import functools
import inspect
import os
import time
from collections import defaultdict
from typing import Callable, Deque, Dict, Optional, Tuple
from collections import deque

from fastapi import HTTPException, Request, status

_WINDOW_UNITS = {"second": 1, "minute": 60, "hour": 3600, "day": 86400}


def parse_rate(rate: str) -> Tuple[int, int]:
    """'5/hour' -> (5, 3600)."""
    count_str, _, unit = rate.partition("/")
    unit = unit.strip().rstrip("s")
    if unit not in _WINDOW_UNITS:
        raise ValueError(f"Unsupported rate unit: {unit!r}")
    return int(count_str), _WINDOW_UNITS[unit]


class _InProcessStore:
    def __init__(self) -> None:
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def hit(self, key: str, limit: int, window: int) -> Tuple[bool, int]:
        now = time.monotonic()
        async with self._lock:
            bucket = self._hits[key]
            cutoff = now - window
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                retry_after = int(bucket[0] + window - now) + 1
                return False, retry_after
            bucket.append(now)
            # Opportunistic cleanup so the dict cannot grow without bound.
            if len(self._hits) > 50_000:
                for k in [k for k, v in self._hits.items() if not v][:10_000]:
                    self._hits.pop(k, None)
            return True, 0


class _RedisStore:
    def __init__(self, client) -> None:
        self._client = client

    async def hit(self, key: str, limit: int, window: int) -> Tuple[bool, int]:
        pipe = self._client.pipeline()
        pipe.incr(key, 1)
        pipe.expire(key, window, nx=True)
        count, _ = await pipe.execute()
        if count > limit:
            ttl = await self._client.ttl(key)
            return False, max(int(ttl), 1)
        return True, 0


class RateLimiter:
    def __init__(self) -> None:
        self._store = _InProcessStore()
        self.enabled = os.getenv("AAHAR_RATE_LIMIT_ENABLED", "1") != "0"

    def reset(self) -> None:
        """Reset in-memory hit counts (primarily used in test fixtures)."""
        if isinstance(self._store, _InProcessStore):
            self._store._hits.clear()

    async def use_redis(self, url: str) -> bool:
        """Attach a shared Redis counter. Returns False if unavailable."""
        try:
            import redis.asyncio as aioredis  # type: ignore

            client = aioredis.from_url(url, decode_responses=True)
            await client.ping()
            self._store = _RedisStore(client)
            return True
        except Exception:
            return False

    @staticmethod
    def client_key(request: Request, scope: str) -> str:
        # Prefer the authenticated subject; fall back to peer IP.
        subject = getattr(request.state, "user_id", None)
        if not subject:
            fwd = request.headers.get("x-forwarded-for", "")
            subject = fwd.split(",")[0].strip() or (
                request.client.host if request.client else "anonymous"
            )
        return f"rl:{scope}:{subject}"

    def limit(self, rate: str) -> Callable:
        limit_count, window = parse_rate(rate)

        def decorator(func: Callable) -> Callable:
            scope = f"{func.__module__}.{func.__qualname__}"

            @functools.wraps(func)
            async def wrapper(*args, **kwargs):
                if self.enabled:
                    request: Optional[Request] = kwargs.get("request")
                    if request is None:
                        request = next(
                            (a for a in args if isinstance(a, Request)), None
                        )
                    if request is not None:
                        ok, retry_after = await self._store.hit(
                            self.client_key(request, scope), limit_count, window
                        )
                        if not ok:
                            raise HTTPException(
                                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                                detail="Rate limit exceeded. Please slow down.",
                                headers={"Retry-After": str(retry_after)},
                            )
                return await func(*args, **kwargs)

            # Preserve the signature so FastAPI still resolves dependencies.
            wrapper.__signature__ = inspect.signature(func)  # type: ignore[attr-defined]
            return wrapper

        return decorator


limiter = RateLimiter()
