from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn, json, sqlite3
from apscheduler.schedulers.background import BackgroundScheduler

from mqtt_handler import start_mqtt, publish_state
from database import (
    init_db, get_devices, save_device,
    save_automation, get_automations, update_automation, delete_automation,
    get_sensor_history, save_widget, get_widgets, delete_widget
)
from automation_engine import check_automations

app = FastAPI()
mqtt_client = None
scheduler = BackgroundScheduler()
active_connections = []

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    global mqtt_client
    init_db()
    mqtt_client = start_mqtt()
    scheduler.add_job(check_time_automations, "interval", minutes=1)
    scheduler.start()

def check_time_automations():
    devices = get_devices()
    check_automations(devices)

@app.get("/health")
async def health(): return {"status":"ok"}

@app.get("/devices")
async def list_devices(): return get_devices()

@app.get("/sensor/{device_id}")
async def sensor_history(device_id: str, period: str = "24h"):
    return get_sensor_history(device_id, period)

@app.post("/automation")
async def create_automation(rule: dict):
    save_automation(rule["conditions"], rule["action_device"], rule["action_state"], rule.get("logic","AND"))
    return {"status": "ok", "message": "Automation saved"}

@app.get("/automation")
async def list_automations(): return get_automations()

@app.put("/automation/{rule_id}")
async def edit_automation(rule_id: int, rule: dict):
    update_automation(rule_id, rule["conditions"], rule["action_device"], rule["action_state"], rule.get("logic","AND"))
    return {"status":"ok","message":"Automation updated"}

@app.delete("/automation/{rule_id}")
async def remove_automation(rule_id: int):
    delete_automation(rule_id); return {"status":"ok","message":"Automation deleted"}

@app.get("/widgets")
async def list_widgets(): return get_widgets()

@app.post("/widgets")
async def add_widget(widget: dict):
    save_widget(widget["device_id"], widget["metric"]); return {"status":"ok","message":"Widget added"}

@app.delete("/widgets/{widget_id}")
async def remove_widget(widget_id: int):
    delete_widget(widget_id); return {"status":"ok","message":"Widget removed"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept(); active_connections.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("action") == "toggle":
                device_id = msg["id"]
                conn = sqlite3.connect("devices.db"); c = conn.cursor()
                c.execute("SELECT state, name, type FROM devices WHERE id=?", (device_id,))
                row = c.fetchone(); conn.close()
                if row:
                    current_state, name, device_type = row
                    new_state = "OFF" if current_state == "ON" else "ON"
                    publish_state(device_id, new_state)
                    save_device(device_id, name, device_type, new_state)
                    update_msg = json.dumps({"id": device_id,"name": name,"type": device_type,"state": new_state})
                    for ws in active_connections: await ws.send_text(update_msg)
    finally:
        if websocket in active_connections: active_connections.remove(websocket)

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
