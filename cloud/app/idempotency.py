"""
Idempotency store for /sync/push.

The previous implementation was a module-level `dict` that:
  - never expired (unbounded memory growth),
  - was keyed only by the header value, so caller A could replay caller B's
    Idempotency-Key and receive B's push results, and
  - was per-process, so it silently did nothing with >1 uvicorn worker.

This version is TTL'd, size-capped, namespaced per user, and uses Redis when
one is configured so the guarantee actually holds across workers.
"""
import asyncio
import json
import time
from collections import OrderedDict
from typing import Any, Dict, Optional

DEFAULT_TTL_SECONDS = 24 * 3600
MAX_LOCAL_ENTRIES = 10_000


def _key(user_id: str, idempotency_key: str) -> str:
    return f"idem:{user_id}:{idempotency_key}"


class IdempotencyStore:
    def __init__(self, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> None:
        self._ttl = ttl_seconds
        self._local: "OrderedDict[str, tuple[float, Dict[str, Any]]]" = OrderedDict()
        self._lock = asyncio.Lock()
        self._redis = None

    async def use_redis(self, url: str) -> bool:
        try:
            import redis.asyncio as aioredis  # type: ignore

            client = aioredis.from_url(url, decode_responses=True)
            await client.ping()
            self._redis = client
            return True
        except Exception:
            return False

    async def get(self, user_id: str, idempotency_key: str) -> Optional[Dict[str, Any]]:
        k = _key(user_id, idempotency_key)
        if self._redis is not None:
            raw = await self._redis.get(k)
            return json.loads(raw) if raw else None

        async with self._lock:
            entry = self._local.get(k)
            if entry is None:
                return None
            expires_at, value = entry
            if expires_at < time.monotonic():
                self._local.pop(k, None)
                return None
            self._local.move_to_end(k)
            return value

    async def put(self, user_id: str, idempotency_key: str, value: Dict[str, Any]) -> None:
        k = _key(user_id, idempotency_key)
        if self._redis is not None:
            await self._redis.set(k, json.dumps(value, default=str), ex=self._ttl)
            return

        async with self._lock:
            now = time.monotonic()
            # Drop expired entries opportunistically.
            for expired in [ek for ek, (exp, _) in self._local.items() if exp < now][:512]:
                self._local.pop(expired, None)
            self._local[k] = (now + self._ttl, value)
            self._local.move_to_end(k)
            while len(self._local) > MAX_LOCAL_ENTRIES:
                self._local.popitem(last=False)


idempotency_store = IdempotencyStore()
