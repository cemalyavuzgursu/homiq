import React from "react";

export default function DeviceCard({ device, ws }) {
  const toggleDevice = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "toggle", id: device.id }));
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 flex flex-col items-center">
      <h2 className="text-xl font-semibold mb-2">{device.name}</h2>
      <p className="text-gray-600">Type: {device.type}</p>
      <p className="text-gray-600 mb-4">State: {device.state}</p>
      {device.type === "light" && (
        <button
          onClick={toggleDevice}
          className={`px-4 py-2 rounded ${device.state === "ON" ? "bg-yellow-400" : "bg-gray-300"}`}
        >
          {device.state === "ON" ? "Turn Off" : "Turn On"}
        </button>
      )}
    </div>
  );
}
