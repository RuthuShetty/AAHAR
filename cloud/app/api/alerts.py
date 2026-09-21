"""
AAHAR Live Alerts API & WebSocket Console
Broadcasts silage probe alerts and high adulteration catches to dashboard.
"""
import asyncio
from typing import Any, Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from cloud.app.mqtt.worker import register_alert_callback, unregister_alert_callback

router = APIRouter(tags=["alerts"])

# Connected WebSocket dashboard clients
active_websockets: List[WebSocket] = []
recent_alerts: List[Dict[str, Any]] = []


async def on_new_alert(alert_data: Dict[str, Any]):
    recent_alerts.append(alert_data)
    if len(recent_alerts) > 100:
        recent_alerts.pop(0)

    for ws in list(active_websockets):
        try:
            await ws.send_json(alert_data)
        except Exception:
            if ws in active_websockets:
                active_websockets.remove(ws)


register_alert_callback(on_new_alert)


@router.websocket("/ws/alerts")
async def websocket_alerts_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.append(websocket)
    try:
        # Send recent alerts on initial connect
        for alert in recent_alerts[-10:]:
            await websocket.send_json(alert)

        while True:
            # Keepalive ping/pong
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        if websocket in active_websockets:
            active_websockets.remove(websocket)
    except Exception:
        if websocket in active_websockets:
            active_websockets.remove(websocket)


@router.get("/alerts/recent")
async def get_recent_alerts():
    return {
        "count": len(recent_alerts),
        "alerts": list(reversed(recent_alerts[-25:])),
    }
