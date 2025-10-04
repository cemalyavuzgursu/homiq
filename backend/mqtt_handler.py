import paho.mqtt.client as mqtt
from database import save_device, save_sensor_data, get_devices
from automation_engine import check_automations

MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "zigbee2mqtt/#"

client = mqtt.Client()

def on_connect(client, userdata, flags, rc):
    print("✅ Connected to MQTT broker")
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    print(f"📩 MQTT message: {msg.topic} {msg.payload}")
    try:
        import json
        payload = json.loads(msg.payload.decode())
        device_id = msg.topic.replace("zigbee2mqtt/", "")
        state = payload.get("state", "unknown")
        device_type = payload.get("type", "generic")
        name = payload.get("friendly_name", device_id)

        save_device(device_id, name, device_type, state)

        for key in ["temperature", "humidity", "illuminance", "occupancy"]:
            if key in payload:
                save_sensor_data(device_id, f"{key}:{payload[key]}")

        devices = get_devices()
        check_automations(devices)

    except Exception as e:
        print("❌ Error parsing MQTT message:", e)

def start_mqtt():
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()
    return client

def publish_state(device_id, new_state):
    topic = f"zigbee2mqtt/{device_id}/set"
    payload = {"state": new_state}
    import json
    client.publish(topic, json.dumps(payload))
    print(f"🚀 Published to {topic}: {payload}")
