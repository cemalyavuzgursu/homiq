import React, { useEffect, useState } from "react";
import axios from "axios";
const API_URL = "http://localhost:8000";

export default function AutomationPage() {
  const [devices, setDevices] = useState([]);
  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState({ conditions: [], action_device: "", action_state: "ON", logic: "AND" });

  useEffect(() => {
    axios.get(`${API_URL}/devices`).then((res) => setDevices(res.data));
    loadRules();
  }, []);

  const loadRules = async () => {
    const res = await axios.get(`${API_URL}/automation`);
    setRules(res.data);
  };

  const addCondition = () => {
    setNewRule({ ...newRule, conditions: [...newRule.conditions, { device: "", operator: "=", value: "" }] });
  };

  const updateCondition = (i, field, value) => {
    const updated = [...newRule.conditions]; updated[i][field] = value;
    setNewRule({ ...newRule, conditions: updated });
  };

  const saveRule = async () => {
    await axios.post(`${API_URL}/automation`, newRule);
    setNewRule({ conditions: [], action_device: "", action_state: "ON", logic: "AND" });
    loadRules();
  };

  const deleteRule = async (id) => {
    await axios.delete(`${API_URL}/automation/${id}`);
    loadRules();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">⚙️ Automation Rules</h2>
      <div className="bg-white p-4 rounded shadow mb-6">
        <h3 className="font-bold mb-2">New Automation</h3>
        <div className="mb-4">
          <label className="block font-semibold">Logic</label>
          <select value={newRule.logic} onChange={(e)=>setNewRule({...newRule, logic:e.target.value})} className="p-2 border rounded">
            <option value="AND">AND</option><option value="OR">OR</option>
          </select>
        </div>

        {newRule.conditions.map((c, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <select value={c.device} onChange={(e)=>updateCondition(i,"device",e.target.value)} className="p-2 border rounded">
              <option value="">Select Device</option>
              <option value="time">Time</option>
              {devices.map((d)=>(<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
            <select value={c.operator} onChange={(e)=>updateCondition(i,"operator",e.target.value)} className="p-2 border rounded">
              <option value="=">=</option><option value="!=">!=</option>
              <option value=">">&gt;</option><option value="<">&lt;</option>
              <option value=">=">&gt;=</option><option value="<=">&lt;=</option>
            </select>
            <input type="text" value={c.value} onChange={(e)=>updateCondition(i,"value",e.target.value)} placeholder="Value" className="p-2 border rounded" />
          </div>
        ))}
        <button onClick={addCondition} className="bg-gray-500 text-white px-4 py-2 rounded mr-2">+ Condition</button>

        <div className="mt-4">
          <label className="block font-semibold">Action Device</label>
          <select value={newRule.action_device} onChange={(e)=>setNewRule({...newRule, action_device:e.target.value})} className="p-2 border rounded">
            <option value="">Select Device</option>
            {devices.map((d)=>(<option key={d.id} value={d.id}>{d.name}</option>))}
          </select>
        </div>
        <div className="mt-2">
          <label className="block font-semibold">Action State</label>
          <select value={newRule.action_state} onChange={(e)=>setNewRule({...newRule, action_state:e.target.value})} className="p-2 border rounded">
            <option value="ON">ON</option><option value="OFF">OFF</option>
          </select>
        </div>
        <button onClick={saveRule} className="bg-green-500 text-white px-4 py-2 rounded mt-4">Save Rule</button>
      </div>

      <h3 className="text-xl font-bold mb-2">Existing Rules</h3>
      {rules.map((r) => (
        <div key={r.id} className="bg-gray-100 p-4 rounded mb-2 flex justify-between items-center">
          <span>{r.logic} → {r.action_device} = {r.action_state}</span>
          <button onClick={()=>deleteRule(r.id)} className="bg-red-500 text-white px-3 py-1 rounded">Delete</button>
        </div>
      ))}
    </div>
  );
}
