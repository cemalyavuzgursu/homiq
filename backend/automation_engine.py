from database import get_automations
from mqtt_handler import publish_state
from datetime import datetime

def evaluate_condition(condition, devices):
    if condition["device"] == "time":
        current_time = datetime.now().strftime("%H:%M")
        left = current_time
        right = condition["value"]
    else:
        device = next((d for d in devices if d["id"] == condition["device"]), None)
        if not device:
            return False
        left = device["state"]
        right = condition["value"]

    op = condition["operator"]
    try:
        if op == "=": return str(left) == str(right)
        if op == "!=": return str(left) != str(right)
        if op == ">": return float(left) > float(right)
        if op == "<": return float(left) < float(right)
        if op == ">=": return float(left) >= float(right)
        if op == "<=": return float(left) <= float(right)
    except:
        return False
    return False

def check_automations(devices):
    for rule in get_automations():
        results = [evaluate_condition(c, devices) for c in rule["conditions"]]
        passed = all(results) if rule["logic"] == "AND" else any(results)
        if passed:
            print(f"⚡ Automation triggered: {rule}")
            publish_state(rule["action_device"], rule["action_state"])
