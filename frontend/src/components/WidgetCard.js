import React, { useEffect, useState } from "react";
import axios from "axios";
const API_URL = "http://localhost:8000";

export default function WidgetCard({ widget, onDelete }) {
  const [value, setValue] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await axios.get(`${API_URL}/sensor/${widget.device_id}?period=1h`);
      if (res.data.length > 0) {
        const lastValue = res.data[res.data.length - 1].value;
        const [metric, val] = lastValue.split(":");
        if (metric === widget.metric) setValue(val);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [widget.device_id, widget.metric]);

  return (
    <div className="bg-white shadow-md p-4 rounded-lg flex flex-col items-center">
      <h3 className="text-lg font-bold">{widget.metric.toUpperCase()}</h3>
      <p className="text-2xl">{value ?? "--"}</p>
      <button onClick={() => onDelete(widget.id)} className="mt-2 bg-red-500 text-white px-2 py-1 rounded">
        Remove
      </button>
    </div>
  );
}
