import React, { useEffect, useState } from "react";
import axios from "axios";
import WidgetCard from "./WidgetCard";

const API_URL = "http://localhost:8000";

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [newWidget, setNewWidget] = useState({ device_id: "", metric: "" });
  const [ws, setWs] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/devices`).then((res) => setDevices(res.data));
    loadWidgets();

    const socket = new WebSocket("ws://localhost:8000/ws");
    socket.onopen = () => console.log("WS connected");
    socket.onmessage = (e) => {
      // cihaz durum güncellemeleri burada akabilir (gerekirse state'e yansıt)
      console.log("WS:", e.data);
    };
    setWs(socket);
    return () => socket.close();
  }, []);

  const loadWidgets = async () => {
    const res = await axios.get(`${API_URL}/widgets`);
    setWidgets(res.data);
  };

  const addWidget = async () => {
    if (newWidget.device_id && newWidget.metric) {
      await axios.post(`${API_URL}/widgets`, newWidget);
      setNewWidget({ device_id: "", metric: "" });
      loadWidgets();
    }
  };

  const deleteWidget = async (id) => {
    await axios.delete(`${API_URL}/widgets/${id}`);
    loadWidgets();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">🏠 Dashboard</h2>
      <div className="mb-6 flex gap-2">
        <select value={newWidget.device_id} onChange={(e)=>setNewWidget({...newWidget, device_id:e.target.value})} className="p-2 border rounded">
          <option value="">Select Device</option>
          {devices.filter((d) => d.type.includes("sensor")).map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select value={newWidget.metric} onChange={(e)=>setNewWidget({...newWidget, metric:e.target.value})} className="p-2 border rounded">
          <option value="">Select Metric</option>
          <option value="temperature">Temperature</option>
          <option value="humidity">Humidity</option>
          <option value="illuminance">Illuminance</option>
          <option value="occupancy">Occupancy</option>
        </select>
        <button onClick={addWidget} className="bg-green-500 text-white px-4 py-2 rounded">➕ Add Widget</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {widgets.map((w) => (
          <WidgetCard key={w.id} widget={w} onDelete={deleteWidget} />
        ))}
      </div>

      <h3 className="text-xl font-bold mt-8 mb-2">Devices</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {devices.map((d) => (<WidgetDevice key={d.id} device={d} ws={ws} />))}
      </div>
    </div>
  );
}

function WidgetDevice({ device, ws }) {
  return <div className="bg-white rounded p-4"><Device core={device} ws={ws} /></div>;
}

function Device({ core, ws }) {
  return <div><strong>{core.name}</strong><DeviceButtons device={core} ws={ws}/></div>;
}

function DeviceButtons({ device, ws }) {
  if (device.type !== "light") return null;
  return (
    <button onClick={()=>ws?.send(JSON.stringify({action:"toggle", id:device.id}))}
            className="mt-2 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">
      Toggle
    </button>
  );
}
