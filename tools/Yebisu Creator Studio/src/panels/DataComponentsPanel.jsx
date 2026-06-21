import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import { FormCtx } from "../context.js";
import { Lbl, Btn } from "../components/ui.jsx";
import { C, SI } from "../theme.js";
import { api } from "../api.js";
import { BASE } from "../constants.js";

const DC_TYPES = [
  { value: "double", label: "Number" },
  { value: "bool", label: "Bool" },
  { value: "string", label: "String" },
  { value: "item", label: "Item Stack" },
];

function defaultForDC(type) {
  if (type === "bool") return false;
  if (type === "string") return "";
  if (type === "item") return "";
  return 0;
}

export function useDataComponents() {
  const [components, setComponents] = useState([]);
  const reload = useCallback(() => {
    fetch(`${BASE}/datacomponents/list`).then(r => r.json()).then(j => { if (j.ok) setComponents(j.components || []); }).catch(() => {});
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { components, reload };
}

export default function DataComponentsPanel() {
  const { form, F } = useContext(FormCtx);
  const comps = form.dataComponents || [];
  const [dirty, setDirty] = useState(false);
  const [hov, setHov] = useState(null);
  const saveRef = useRef(null);

  const update = (next) => {
    F("dataComponents", next);
    setDirty(true);
  };

  useEffect(() => {
    if (comps.length > 0) {
      api("/datacomponents/save", { components: comps });
    }
  }, []);

  useEffect(() => {
    if (!dirty) return;
    clearTimeout(saveRef.current);
    saveRef.current = setTimeout(async () => {
      await api("/datacomponents/save", { components: comps });
      setDirty(false);
    }, 800);
    return () => clearTimeout(saveRef.current);
  }, [dirty, comps]);

  const add = (type) => {
    let name = "new_" + type, i = 1;
    while (comps.some(c => c.name === name)) name = `new_${type}_${i++}`;
    update([...comps, { name, type, default: defaultForDC(type) }]);
  };
  const del = (idx) => update(comps.filter((_, i) => i !== idx));
  const upd = (idx, field, val) => update(comps.map((c, i) => i === idx ? { ...c, [field]: val } : c));

  return <div style={{ padding: "14px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
    <Lbl>Data Components</Lbl>

    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {DC_TYPES.map(t => (
        <Btn key={t.value} sm v="g" onClick={() => add(t.value)}>+ {t.label}</Btn>
      ))}
    </div>

    {comps.length === 0 && <div style={{ color: C.faint, fontSize: 12, padding: "12px 0" }}>No data components defined</div>}

    {DC_TYPES.map(dt => {
      const ofType = comps.map((c, i) => ({ ...c, _idx: i })).filter(c => c.type === dt.value);
      if (!ofType.length) return null;
      return <div key={dt.value} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 11, color: C.dim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 6 }}>{dt.label}</div>
        {ofType.map(c => (
          <div key={c._idx} style={{ display: "flex", alignItems: "center", gap: 6, background: C.card, border: `1px solid ${C.inpB}`, borderRadius: 4, padding: "6px 10px", position: "relative" }}
            onMouseEnter={() => setHov(c._idx)} onMouseLeave={() => setHov(null)}>
            {hov === c._idx && <div onClick={() => del(c._idx)} style={{ position: "absolute", top: -5, right: -5, width: 13, height: 13, borderRadius: "50%", background: "#ff5f57", cursor: "pointer", zIndex: 5 }} />}
            <input value={c.name} onChange={e => upd(c._idx, "name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              style={{ ...SI.inp, flex: 1, padding: "4px 8px", fontSize: 12 }} placeholder="name" />
            {c.type === "double" && <input type="number" value={c.default ?? 0} onChange={e => upd(c._idx, "default", parseFloat(e.target.value) || 0)}
              style={{ ...SI.inp, width: 70, padding: "4px 8px", fontSize: 12 }} placeholder="default" />}
            {c.type === "bool" && <select value={c.default ? "true" : "false"} onChange={e => upd(c._idx, "default", e.target.value === "true")}
              style={{ ...SI.inp, width: 70, padding: "4px 8px", fontSize: 12 }}>
              <option value="false">false</option>
              <option value="true">true</option>
            </select>}
            {c.type === "string" && <input value={c.default ?? ""} onChange={e => upd(c._idx, "default", e.target.value)}
              style={{ ...SI.inp, width: 100, padding: "4px 8px", fontSize: 12 }} placeholder="default" />}
            {c.type === "item" && <span style={{ fontSize: 11, color: C.faint }}>item stack</span>}
          </div>
        ))}
      </div>;
    })}
  </div>;
}
