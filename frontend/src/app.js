import React, { useState } from "react";
import Dashboard from "./components/Dashboard";
import AutomationPage from "./components/AutomationPage";
import SensorHistory from "./components/SensorHistory";

export default function App() {
  const [page, setPage] = useState("dashboard");
  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="flex justify-center gap-4 mb-6">
        <button onClick={() => setPage("dashboard")} className="px-4 py-2 bg-green-500 text-white rounded">Dashboard</button>
        <button onClick={() => setPage("automation")} className="px-4 py-2 bg-blue-500 text-white rounded">Automation</button>
        <button onClick={() => setPage("history")} className="px-4 py-2 bg-purple-500 text-white rounded">Sensor History</button>
      </div>
      {page === "dashboard" && <Dashboard />}
      {page === "automation" && <AutomationPage />}
      {page === "history" && <SensorHistory />}
    </div>
  );
}
