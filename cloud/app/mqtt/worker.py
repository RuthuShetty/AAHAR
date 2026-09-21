"""
AAHAR MQTT Ingestion Worker
Subscribes to silage probe readings: aahar/{farm_id}/{probe_id}/reading
Validates against contracts, stores in TimescaleDB, and detects threshold breaches.
"""
import asyncio
import json
import logging
import math
import logging
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from cloud.app.config import settings
from cloud.app.database import AsyncSessionLocal
from cloud.app.models.entities import RegisteredProbe, ProbeReading, Bunker, utc_now

logger = logging.getLogger("aahar.mqtt")

# Active alert subscribers (in-memory pubsub for websockets)
alert_subscribers: List[Callable[[Dict[str, Any]], Any]] = []


def register_alert_callback(cb: Callable[[Dict[str, Any]], Any]) -> None:
    alert_subscribers.append(cb)


def unregister_alert_callback(cb: Callable[[Dict[str, Any]], Any]) -> None:
    if cb in alert_subscribers:
        alert_subscribers.remove(cb)


async def broadcast_alert(alert_data: Dict[str, Any]) -> None:
    for cb in list(alert_subscribers):
        try:
            res = cb(alert_data)
            if asyncio.iscoroutine(res):
                await res
        except Exception as e:
            logger.error(f"Error broadcasting alert: {e}")


async def process_probe_message(
    payload_str: str,
    topic: str,
    session: Optional[AsyncSession] = None,
) -> Dict[str, Any]:
    """
    Processes a single probe reading JSON message.
    Can be called directly by MQTT client or in unit/integration tests.
    """
    try:
        data = json.loads(payload_str)
    except json.JSONDecodeError:
        logger.warning("discarded malformed probe payload on %s", topic)
        return {"status": "rejected", "reason": "malformed_json"}
    if not isinstance(data, dict):
        return {"status": "rejected", "reason": "payload_not_an_object"}

    # Topic format: aahar/{farm_id}/{probe_id}/reading
    parts = topic.split("/")
    if len(parts) != 4 or parts[0] != "aahar" or parts[3] != "reading":
        return {"status": "rejected", "reason": "unexpected_topic"}
    farm_id, probe_id = parts[1], parts[2]

    # The broker ACL must already bind a client to its own topic prefix, but
    # the ingestion worker verifies it again: a probe is only allowed to write
    # readings for the farm it is registered to. Previously farm_id was taken
    # from the topic string and trusted, so any client able to publish could
    # inject readings into any farm's silage record.
    if session is not None:
        probe = await session.get(RegisteredProbe, probe_id)
        if probe is None:
            logger.warning("reading from unregistered probe %s", probe_id)
            return {"status": "rejected", "reason": "unregistered_probe"}
        if probe.farm_id != farm_id:
            logger.warning(
                "probe %s published for farm %s but is registered to %s",
                probe_id, farm_id, probe.farm_id,
            )
            return {"status": "rejected", "reason": "probe_farm_mismatch"}
        if not probe.is_active:
            return {"status": "rejected", "reason": "probe_deactivated"}

    rec_id = data.get("id")
    bunker_id = data.get("bunker_id", farm_id)
    reading_time_raw = data.get("reading_time")

    if isinstance(reading_time_raw, str):
        try:
            reading_time = datetime.fromisoformat(reading_time_raw.replace("Z", "+00:00"))
        except ValueError:
            reading_time = utc_now()
    else:
        reading_time = utc_now()

    # Was: ph=4.0, core_temp_c=25.0, moisture_pct=65.0, co2_ppm=1000.0 as
    # defaults. A probe message missing a channel -- or an empty {} -- became a
    # healthy, well-fermented reading in the permanent record and fed the
    # spoilage forecast. Missing channels are now None.
    def _channel(name: str):
        raw = data.get(name)
        if raw is None:
            return None
        try:
            value = float(raw)
        except (TypeError, ValueError):
            return None
        return value if math.isfinite(value) else None

    ph = _channel("ph")
    core_temp_c = _channel("core_temp_c")
    moisture_pct = _channel("moisture_pct")
    co2_ppm = _channel("co2_ppm")
    o2_pct = _channel("o2_pct")
    voc_index = _channel("voc_index")
    fermentation_quality = _channel("fermentation_quality")

    # Threshold checks
    alerts = []
    if ph > 4.2:
        alerts.append({
            "type": "PH_ELEVATED",
            "severity": "danger" if ph > 4.8 else "caution",
            "message": f"Silage pH elevated to {ph:.2f} (Target < 4.2). Risk of clostridial fermentation.",
        })
    if core_temp_c > 35.0:
        alerts.append({
            "type": "TEMPERATURE_SPIKE",
            "severity": "danger",
            "message": f"Core temperature spiked to {core_temp_c:.1f}°C. Aerobic spoilage active.",
        })
    if o2_pct > 2.0:
        alerts.append({
            "type": "SEAL_BREACH",
            "severity": "danger",
            "message": f"Oxygen ingress detected at {o2_pct:.1f}% (Normal < 2%). Silage seal compromised.",
        })

    reading = ProbeReading(
        id=rec_id,
        bunker_id=bunker_id,
        farm_id=farm_id,
        probe_id=probe_id,
        reading_time=reading_time,
        ph=ph,
        core_temp_c=core_temp_c,
        moisture_pct=moisture_pct,
        co2_ppm=co2_ppm,
        o2_pct=o2_pct,
        voc_index=voc_index,
        fermentation_quality=fermentation_quality,
        server_received_at=utc_now(),
    )

    should_close = False
    if session is None:
        session = AsyncSessionLocal()
        should_close = True

    try:
        session.add(reading)
        await session.commit()
    finally:
        if should_close:
            await session.close()

    result = {
        "id": rec_id,
        "farm_id": farm_id,
        "probe_id": probe_id,
        "bunker_id": bunker_id,
        "ph": ph,
        "core_temp_c": core_temp_c,
        "alerts": alerts,
    }

    if alerts:
        await broadcast_alert(result)

    return result


async def run_mqtt_worker():
    """Background task connecting to EMQX MQTT broker and processing probe messages."""
    try:
        import aiomqtt
    except ImportError:
        logger.warning("aiomqtt not installed, skipping MQTT daemon loop.")
        return

    while True:
        try:
            logger.info(f"Connecting to MQTT broker at {settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}...")
            async with aiomqtt.Client(
                hostname=settings.MQTT_BROKER_HOST,
                port=settings.MQTT_BROKER_PORT,
            ) as client:
                await client.subscribe(settings.MQTT_PROBE_TOPIC)
                logger.info(f"Subscribed to topic: {settings.MQTT_PROBE_TOPIC}")

                async for message in client.messages:
                    try:
                        payload = message.payload.decode("utf-8")
                        await process_probe_message(payload, str(message.topic))
                    except Exception as ex:
                        logger.error(f"Error handling MQTT message: {ex}")
        except Exception as e:
            logger.warning(f"MQTT connection failed: {e}. Retrying in 10s...")
            await asyncio.sleep(10)
