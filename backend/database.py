import sqlite3

DB_NAME = "devices.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS devices (
            id TEXT PRIMARY KEY,
            name TEXT,
            type TEXT,
            state TEXT
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS automations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conditions TEXT,
            action_device TEXT,
            action_state TEXT,
            logic TEXT
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS sensor_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            value TEXT
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS widgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT,
            metric TEXT
        )
    """)
    conn.commit()
    conn.close()

def save_device(device_id, name, device_type, state):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("""
        INSERT OR REPLACE INTO devices (id, name, type, state)
        VALUES (?, ?, ?, ?)
    """, (device_id, name, device_type, state))
    conn.commit()
    conn.close()

def get_devices():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT id, name, type, state FROM devices")
    devices = c.fetchall()
    conn.close()
    return [{"id": d[0], "name": d[1], "type": d[2], "state": d[3]} for d in devices]

def save_sensor_data(device_id, value):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("INSERT INTO sensor_data (device_id, value) VALUES (?, ?)", (device_id, str(value)))
    conn.commit()
    conn.close()

def get_sensor_history(device_id, period="24h"):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    if period == "1h":
        c.execute("""SELECT timestamp, value FROM sensor_data 
                     WHERE device_id=? AND timestamp >= datetime('now','-1 hour')
                     ORDER BY id ASC""", (device_id,))
    elif period == "7d":
        c.execute("""SELECT timestamp, value FROM sensor_data 
                     WHERE device_id=? AND timestamp >= datetime('now','-7 days')
                     ORDER BY id ASC""", (device_id,))
    else:
        c.execute("""SELECT timestamp, value FROM sensor_data 
                     WHERE device_id=? AND timestamp >= datetime('now','-1 day')
                     ORDER BY id ASC""", (device_id,))
    rows = c.fetchall()
    conn.close()
    return [{"time": r[0], "value": r[1]} for r in rows]

def save_automation(conditions, action_device, action_state, logic="AND"):
    import json
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("""INSERT INTO automations (conditions, action_device, action_state, logic)
                 VALUES (?, ?, ?, ?)""",
              (json.dumps(conditions), action_device, action_state, logic))
    conn.commit()
    conn.close()

def get_automations():
    import json
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT id, conditions, action_device, action_state, logic FROM automations")
    rows = c.fetchall()
    conn.close()
    return [{"id": r[0], "conditions": __import__("json").loads(r[1]),
             "action_device": r[2], "action_state": r[3], "logic": r[4]} for r in rows]

def update_automation(rule_id, conditions, action_device, action_state, logic):
    import json
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("""UPDATE automations
                 SET conditions=?, action_device=?, action_state=?, logic=?
                 WHERE id=?""",
              (json.dumps(conditions), action_device, action_state, logic, rule_id))
    conn.commit()
    conn.close()

def delete_automation(rule_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM automations WHERE id=?", (rule_id,))
    conn.commit()
    conn.close()

def save_widget(device_id, metric):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("INSERT INTO widgets (device_id, metric) VALUES (?, ?)", (device_id, metric))
    conn.commit()
    conn.close()

def get_widgets():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT id, device_id, metric FROM widgets")
    rows = c.fetchall()
    conn.close()
    return [{"id": r[0], "device_id": r[1], "metric": r[2]} for r in rows]

def delete_widget(widget_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM widgets WHERE id=?", (widget_id,))
    conn.commit()
    conn.close()
