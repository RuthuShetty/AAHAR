"""
AAHAR Sync Engine
Handles batch upsert with idempotency, field-level Lamport clock merges,
and cursor-paged delta pull.
"""
import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from cloud.app.config import settings
from cloud.app.models.entities import (
    SyncEnvelopeRecord,
    Measurement,
    Spectrum,
    Farm,
    Herd,
    Bunker,
    ProbeReading,
    Advisory,
    Batch,
    utc_now,
)
from cloud.app.sync.lamport import merge_field_level_entity


KNOWN_ENTITIES = {
    "measurement", "spectrum", "probe_reading", "advisory",
    "farm", "herd", "bunker", "batch", "sync_run", "ota_event",
}


def compute_hash(data: Any) -> str:
    """Computes SHA256 of json-serialized payload with sorted keys."""
    raw = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def compute_thresholds_hash() -> str:
    try:
        with open(settings.THRESHOLDS_PATH, "r", encoding="utf-8") as f:
            content = f.read().strip()
        return hashlib.sha256(content.encode("utf-8")).hexdigest()
    except Exception:
        return hashlib.sha256(b"{}").hexdigest()


class SyncEngine:
    @staticmethod
    async def process_push_envelope(
        db: AsyncSession,
        env: Dict[str, Any],
        now: datetime,
    ) -> Dict[str, Any]:
        rec_id = env.get("id")
        entity_type = env.get("entity")
        farm_id = env.get("farm_id")
        device_id = env.get("device_id")
        schema_version = env.get("schema_version", 1)
        captured_at_raw = env.get("captured_at")
        clock = env.get("clock", {"device": device_id or "unknown", "counter": 0})
        payload = env.get("payload", {})
        payload_hash = env.get("payload_hash")

        if not rec_id or not entity_type or not farm_id:
            return {
                "id": rec_id or "unknown",
                "status": "rejected",
                "reject_reason": "Missing required envelope fields: id, entity, or farm_id",
                "server_received_at": now.isoformat(),
            }

        if entity_type not in KNOWN_ENTITIES:
            return {
                "id": rec_id,
                "status": "rejected",
                "reject_reason": f"Unknown entity type: {entity_type}",
                "server_received_at": now.isoformat(),
            }

        # Integrity: recompute the hash rather than storing the client's claim.
        # Previously payload_hash was accepted verbatim, so duplicate detection
        # and tamper-evidence were both spoofable.
        computed_hash = compute_hash(payload)
        if payload_hash and payload_hash != computed_hash:
            return {
                "id": rec_id,
                "status": "rejected",
                "reject_reason": "payload_hash does not match payload contents",
                "server_received_at": now.isoformat(),
            }
        payload_hash = computed_hash

        # Parse captured_at
        if isinstance(captured_at_raw, str):
            try:
                captured_at = datetime.fromisoformat(captured_at_raw.replace("Z", "+00:00"))
            except ValueError:
                captured_at = now
        elif isinstance(captured_at_raw, datetime):
            captured_at = captured_at_raw
        else:
            captured_at = now

        # 1. Check if this exact record already exists in sync_envelopes
        existing_env = await db.get(SyncEnvelopeRecord, rec_id)
        if existing_env:
            if existing_env.payload_hash == payload_hash:
                return {
                    "id": rec_id,
                    "status": "duplicate",
                    "server_received_at": existing_env.server_received_at.isoformat(),
                }

        # 2. Immutable entities: measurement, spectrum, probe_reading, advisory
        immutable_entities = {"measurement", "spectrum", "probe_reading", "advisory"}
        if entity_type in immutable_entities:
            if existing_env:
                # Same id, different payload, on an append-only entity. Surface
                # it instead of discarding the record without telling anyone.
                return {
                    "id": rec_id,
                    "status": "rejected",
                    "reject_reason": (
                        "Immutable record already exists with different content; "
                        "assign a new id."
                    ),
                    "server_received_at": existing_env.server_received_at.isoformat(),
                }

            # Insert domain record
            if entity_type == "measurement":
                m = Measurement(
                    id=rec_id,
                    farm_id=farm_id,
                    device_id=device_id or "UNKNOWN",
                    feed_type=payload.get("feed_type", "OTHER"),
                    sample_temperature_c=payload.get("sample_temperature_c"),
                    ambient_temperature_c=payload.get("ambient_temperature_c"),
                    ambient_humidity_pct=payload.get("ambient_humidity_pct"),
                    proximates=payload.get("proximates", {}),
                    safety=payload.get("safety", {}),
                    derived=payload.get("derived", {}),
                    grade=payload.get("grade", "C"),
                    in_distribution=payload.get("in_distribution", True),
                    captured_at=captured_at,
                    server_received_at=now,
                    raw_spectrum_id=payload.get("raw_spectrum_id"),
                    image_keys=payload.get("image_keys", []),
                    clock=clock,
                    sync_state="synced",
                    payload_hash=payload_hash or compute_hash(payload),
                )
                db.add(m)

            elif entity_type == "spectrum":
                spec = Spectrum(
                    id=rec_id,
                    measurement_id=payload.get("measurement_id", rec_id),
                    wavelengths=payload.get("wavelengths", []),
                    intensities=payload.get("intensities", []),
                    repeats=payload.get("repeats", 3),
                    dark_reference=payload.get("dark_reference"),
                    white_reference=payload.get("white_reference"),
                    captured_at=captured_at,
                    server_received_at=now,
                )
                db.add(spec)

            elif entity_type == "probe_reading":
                # A missing sensor field used to be silently replaced with a
                # plausible constant (ph=4.0, temp=25.0, ...). That injects
                # invented measurements into a scientific dataset and into the
                # spoilage forecast. Missing channels are now NULL, and a
                # reading with no usable channel at all is rejected.
                bunker_id = payload.get("bunker_id")
                if not bunker_id:
                    return {
                        "id": rec_id,
                        "status": "rejected",
                        "reject_reason": "probe_reading.payload.bunker_id is required",
                        "server_received_at": now.isoformat(),
                    }

                channels = {}
                for field in (
                    "ph", "core_temp_c", "moisture_pct",
                    "co2_ppm", "o2_pct", "voc_index", "fermentation_quality",
                ):
                    raw = payload.get(field)
                    if raw is None:
                        channels[field] = None
                        continue
                    try:
                        channels[field] = float(raw)
                    except (TypeError, ValueError):
                        return {
                            "id": rec_id,
                            "status": "rejected",
                            "reject_reason": f"probe_reading.{field} is not numeric",
                            "server_received_at": now.isoformat(),
                        }

                if all(v is None for v in channels.values()):
                    return {
                        "id": rec_id,
                        "status": "rejected",
                        "reject_reason": "probe_reading contains no sensor channels",
                        "server_received_at": now.isoformat(),
                    }

                pr = ProbeReading(
                    id=rec_id,
                    bunker_id=bunker_id,
                    farm_id=farm_id,
                    probe_id=payload.get("probe_id") or device_id or "UNKNOWN",
                    reading_time=captured_at,
                    server_received_at=now,
                    **channels,
                )
                db.add(pr)

            elif entity_type == "advisory":
                adv = Advisory(
                    id=rec_id,
                    measurement_id=payload.get("measurement_id", rec_id),
                    farm_id=farm_id,
                    grade=payload.get("grade", "C"),
                    value_for_money=payload.get("value_for_money", {}),
                    safety_actions=payload.get("safety_actions", []),
                    ration_actions=payload.get("ration_actions", []),
                    storage_actions=payload.get("storage_actions", []),
                    silage_actions=payload.get("silage_actions", []),
                    herd_impacts=payload.get("herd_impacts", []),
                    local_text=payload.get("local_text", {}),
                    is_authoritative=False,  # Client local advisory
                    generated_at=captured_at,
                )
                db.add(adv)

            # Store sync envelope
            new_env = SyncEnvelopeRecord(
                id=rec_id,
                entity=entity_type,
                schema_version=schema_version,
                farm_id=farm_id,
                device_id=device_id or "UNKNOWN",
                captured_at=captured_at,
                clock=clock,
                server_received_at=now,
                sync_state="synced",
                payload_hash=payload_hash or compute_hash(payload),
                payload=payload,
            )
            db.add(new_env)

            return {
                "id": rec_id,
                "status": "accepted",
                "server_received_at": now.isoformat(),
            }

        # 3. Mutable entities: farm, herd, bunker
        payload_to_store = payload
        had_conflict = False

        if entity_type == "farm":
            existing_farm = await db.get(Farm, rec_id)
            if not existing_farm:
                loc = payload.get("location", {})
                new_farm = Farm(
                    id=rec_id,
                    name=payload.get("name", "My Farm"),
                    village=loc.get("village"),
                    district=loc.get("district"),
                    state=loc.get("state"),
                    pin_code=loc.get("pincode"),
                    contact_phone=payload.get("owner_phone"),
                    device_id=device_id,
                    lamport_counter=clock.get("counter", 0),
                    field_clocks=payload.get("fields", {}),
                    created_at=captured_at,
                    updated_at=now,
                )
                db.add(new_farm)
                had_conflict = False
                payload_to_store = payload
            else:
                existing_dict = {
                    "name": existing_farm.name,
                    "owner_phone": existing_farm.contact_phone,
                    "location": {
                        "village": existing_farm.village,
                        "district": existing_farm.district,
                        "state": existing_farm.state,
                        "pincode": existing_farm.pin_code,
                    },
                    "fields": existing_farm.field_clocks or {},
                }
                if existing_env and isinstance(existing_env.payload, dict):
                    existing_dict = {**existing_env.payload, **existing_dict}

                merged, had_changes, had_conflict = merge_field_level_entity(
                    existing_payload=existing_dict,
                    incoming_payload=payload,
                    incoming_envelope_clock=clock,
                )
                payload_to_store = merged
                if had_changes:
                    existing_farm.name = merged.get("name", existing_farm.name)
                    existing_farm.contact_phone = merged.get("owner_phone", existing_farm.contact_phone)
                    m_loc = merged.get("location", {})
                    if m_loc:
                        existing_farm.village = m_loc.get("village", existing_farm.village)
                        existing_farm.district = m_loc.get("district", existing_farm.district)
                        existing_farm.state = m_loc.get("state", existing_farm.state)
                        existing_farm.pin_code = m_loc.get("pincode", existing_farm.pin_code)
                    existing_farm.field_clocks = merged.get("fields", {})
                    existing_farm.lamport_counter = max(existing_farm.lamport_counter, clock.get("counter", 0)) + 1
                    existing_farm.updated_at = now

        elif entity_type == "herd":
            existing_herd = await db.get(Herd, rec_id)
            if not existing_herd:
                new_herd = Herd(
                    id=rec_id,
                    farm_id=farm_id,
                    total_milking=0,
                    total_dry=0,
                    total_heifers=0,
                    total_calves=0,
                    breeds=payload.get("animals", []),
                    average_daily_yield_litres=0.0,
                    ration_on_hand=payload.get("feed_on_hand", []),
                    lamport_counter=clock.get("counter", 0),
                    field_clocks=payload.get("fields", {}),
                    updated_at=now,
                )
                db.add(new_herd)
                had_conflict = False
                payload_to_store = payload
            else:
                existing_dict = {
                    "animals": existing_herd.breeds or [],
                    "feed_on_hand": existing_herd.ration_on_hand or [],
                    "fields": existing_herd.field_clocks or {},
                }
                if existing_env and isinstance(existing_env.payload, dict):
                    existing_dict = {**existing_env.payload, **existing_dict}

                merged, had_changes, had_conflict = merge_field_level_entity(
                    existing_payload=existing_dict,
                    incoming_payload=payload,
                    incoming_envelope_clock=clock,
                )
                payload_to_store = merged
                if had_changes:
                    existing_herd.breeds = merged.get("animals", existing_herd.breeds)
                    existing_herd.ration_on_hand = merged.get("feed_on_hand", existing_herd.ration_on_hand)
                    existing_herd.field_clocks = merged.get("fields", {})
                    existing_herd.lamport_counter = max(existing_herd.lamport_counter, clock.get("counter", 0)) + 1
                    existing_herd.updated_at = now

        elif entity_type == "bunker":
            existing_bunker = await db.get(Bunker, rec_id)
            if not existing_bunker:
                new_bunker = Bunker(
                    id=rec_id,
                    farm_id=farm_id,
                    name=payload.get("name", "Bunker 1"),
                    bunker_type=payload.get("bunker_type", "bunker"),
                    dimensions=payload.get("dimensions", {}),
                    crop_type=payload.get("crop_type", "maize"),
                    ensiled_at=now,
                    probe_positions=payload.get("probe_positions", []),
                    lamport_counter=clock.get("counter", 0),
                    field_clocks=payload.get("fields", {}),
                    updated_at=now,
                )
                db.add(new_bunker)
                had_conflict = False
                payload_to_store = payload
            else:
                existing_dict = {
                    "name": existing_bunker.name,
                    "dimensions": existing_bunker.dimensions or {},
                    "probe_positions": existing_bunker.probe_positions or [],
                    "fields": existing_bunker.field_clocks or {},
                }
                if existing_env and isinstance(existing_env.payload, dict):
                    existing_dict = {**existing_env.payload, **existing_dict}

                merged, had_changes, had_conflict = merge_field_level_entity(
                    existing_payload=existing_dict,
                    incoming_payload=payload,
                    incoming_envelope_clock=clock,
                )
                payload_to_store = merged
                if had_changes:
                    existing_bunker.name = merged.get("name", existing_bunker.name)
                    existing_bunker.dimensions = merged.get("dimensions", existing_bunker.dimensions)
                    existing_bunker.probe_positions = merged.get("probe_positions", existing_bunker.probe_positions)
                    existing_bunker.field_clocks = merged.get("fields", {})
                    existing_bunker.lamport_counter = max(existing_bunker.lamport_counter, clock.get("counter", 0)) + 1
                    existing_bunker.updated_at = now
        else:
            # Other entities (sync_run, batch, ota_event, etc.)
            had_conflict = False
            payload_to_store = payload

        # Update or record envelope
        if not existing_env:
            new_env = SyncEnvelopeRecord(
                id=rec_id,
                entity=entity_type,
                schema_version=schema_version,
                farm_id=farm_id,
                device_id=device_id or "UNKNOWN",
                captured_at=captured_at,
                clock=clock,
                server_received_at=now,
                sync_state="conflict" if had_conflict else "synced",
                payload_hash=compute_hash(payload_to_store),
                payload=payload_to_store,
            )
            db.add(new_env)
        else:
            existing_env.clock = clock
            existing_env.server_received_at = now
            existing_env.sync_state = "conflict" if had_conflict else "synced"
            existing_env.payload = payload_to_store
            existing_env.payload_hash = compute_hash(payload_to_store)

        return {
            "id": rec_id,
            "status": "conflict" if had_conflict else "accepted",
            "server_received_at": now.isoformat(),
        }

    @staticmethod
    async def push_batch(
        db: AsyncSession,
        records: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Process a batch atomically: either every accepted record lands or none
        does. Previously a mid-batch exception left earlier records applied to
        the session with no commit and no signal to the client.
        """
        now = utc_now()
        results = []
        try:
            for r in records:
                results.append(await SyncEngine.process_push_envelope(db, r, now))
            await db.commit()
        except Exception:
            await db.rollback()
            raise
        return results

    @staticmethod
    async def pull_deltas(
        db: AsyncSession,
        farm_id: str,
        cursor: Optional[str] = None,
        limit: int = 200,
    ) -> Tuple[List[Dict[str, Any]], str, bool]:
        """
        Keyset pagination over (server_received_at, id).

        The previous implementation paged on `server_received_at` alone with a
        strict `>` filter. Every record in one push batch is stamped with the
        SAME `server_received_at` (it is computed once per batch), so whenever a
        batch straddled a page boundary the remainder of that timestamp group
        was skipped permanently. That is silent, unrecoverable data loss on the
        client. A composite cursor makes the ordering total, so no row can fall
        between two pages.

        Cursor format: "<iso8601 server_received_at>|<id>". Empty/absent means
        start from the beginning of the stream.
        """
        limit = max(1, min(limit, 500))
        query = select(SyncEnvelopeRecord).filter(SyncEnvelopeRecord.farm_id == farm_id)

        if cursor:
            parsed = _parse_cursor(cursor)
            if parsed is None:
                raise ValueError(f"Malformed sync cursor: {cursor!r}")
            cursor_dt, cursor_id = parsed
            query = query.filter(
                or_(
                    SyncEnvelopeRecord.server_received_at > cursor_dt,
                    and_(
                        SyncEnvelopeRecord.server_received_at == cursor_dt,
                        SyncEnvelopeRecord.id > cursor_id,
                    ),
                )
            )

        query = query.order_by(
            SyncEnvelopeRecord.server_received_at.asc(),
            SyncEnvelopeRecord.id.asc(),
        ).limit(limit + 1)

        rows = (await db.execute(query)).scalars().all()
        has_more = len(rows) > limit
        items = rows[:limit]

        envelopes = [
            {
                "id": item.id,
                "entity": item.entity,
                "schema_version": item.schema_version,
                "farm_id": item.farm_id,
                "device_id": item.device_id,
                "captured_at": item.captured_at.isoformat(),
                "clock": item.clock,
                "server_received_at": item.server_received_at.isoformat(),
                "sync_state": item.sync_state,
                "payload_hash": item.payload_hash,
                "payload": item.payload,
            }
            for item in items
        ]

        if items:
            last = items[-1]
            new_cursor = f"{_as_utc(last.server_received_at).isoformat()}|{last.id}"
        else:
            new_cursor = cursor or ""

        return envelopes, new_cursor, has_more


def _as_utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def _parse_cursor(cursor: str) -> Optional[Tuple[datetime, str]]:
    """Parse '<iso>|<id>'. Returns None if unparseable."""
    ts_part, sep, id_part = cursor.partition("|")
    if not sep:
        return None
    # Handle '+' turned into ' ' by query parameter decoding
    if " " in ts_part and "+" not in ts_part:
        ts_part = re.sub(r"\s(\d{2}:\d{2})$", r"+\1", ts_part)
    try:
        dt = datetime.fromisoformat(ts_part.replace("Z", "+00:00"))
    except ValueError:
        return None
    return _as_utc(dt), id_part
