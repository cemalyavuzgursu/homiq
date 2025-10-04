import React, { useEffect, useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const API_URL = "http://localhost:8000";

export default function SensorHistory() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [history, setHistory] = useState([]);
  const [period, setPeriod] = useState("24h");

  useEffect(() => { axios.get(`${API_URL}/devices`).then((r) => setDevices(r.data)); }, []);

  const fetchHistory = async () => {
    if (!selectedDevice) return;
    const res = await axios.get(`${API_URL}/sensor/${selectedDevice}?period=${period}`);
    setHistory(res.data);
  };

  const data = {
    labels: history.map((h) => h.time),
    datasets: [{ label: `Sensor Value (${period})`,
      data: history.map((h) => parseFloat(h.value.split(":")[1] || 0)),
      borderColor: "rgba(75, 192, 192, 1)", backgroundColor: "rgba(75, 192, 192, 0.2)" }],
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">📊 Sensor History</h2>
      <div className="flex gap-2 mb-4">
        <select value={selectedDevice} onChange={(e)=>setSelectedDevice(e.target.value)} className="p-2 border rounded">
          <option value="">Select Sensor</option>
          {devices.filter((d)=>d.type.includes("sensor")).map((d)=>(
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select value={period} onChange={(e)=>setPeriod(e.target.value)} className="p-2 border rounded">
          <option value="1h">Last 1 Hour</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
        </select>
        <button onClick={fetchHistory} className="bg-blue-500 text-white px-4 py-2 rounded">Load</button>
      </div>
      {history.length > 0 && <div className="mt-6"><Line data={data} /></div>}
    </div>
  );
}
