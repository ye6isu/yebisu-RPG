import React, { useState, useRef, useCallback, useEffect } from "react";
import { Lbl, Btn, Chk } from "../components/ui.jsx";
import { api } from "../api.js";
import { C, SI } from "../theme.js";
import { BASE } from "../constants.js";

export const ATTR_SENTINEL = "new";
export const ATTR_DEFAULT = { id: "", constName: "", titleText: "", min: 0, base: 0, max: 100, syncToClient: true };

export function useAttributes() {
  const [attributes, setAttributes] = useState([]);
  const reload = useCallback(() => { fetch(`${BASE}/attributes/list`).then(r => r.json()).then(j => { if (j.ok) setAttributes(j.attributes || []); }).catch(() => { }); }, []);
  useEffect(() => { reload(); }, [reload]);
  return { attributes, reload };
}

export function autoConstName(id) { return id.toUpperCase(); }

export default function AttributesPage({ onEditingChange, newTrigger, editing, setEditing }) {
  const { attributes, reload } = useAttributes();
  const [local, setLocal] = useState([]);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  useEffect(() => { if (!dirtyRef.current) setLocal(attributes.map(a => ({ ...a, customConst: a.constName !== a.id.toUpperCase() }))); }, [attributes]);
  useEffect(() => { onEditingChange && onEditingChange(true); }, [onEditingChange]);

  const saveAttrList = useCallback(async (list) => { const mapped = list.map(a => ({ id: a.id, constName: a.customConst ? a.constName : a.id.toUpperCase(), titleText: a.titleText, min: parseFloat(a.min) || 0, base: parseFloat(a.base) || 0, max: parseFloat(a.max) || 100, syncToClient: !!a.syncToClient })); await api("/attributes/save", { attributes: mapped }); setDirty(false); }, []);
  const upd = (idx, field, val) => { setLocal(l => { const n = [...l]; n[idx] = { ...n[idx], [field]: val }; if (field === "id" && !n[idx].customConst) n[idx].constName = val.toUpperCase(); return n; }); setDirty(true); };
  const addAttr = () => { setLocal(l => { const n = [...l, { id: "", constName: "", titleText: "", min: 0, base: 0, max: 100, syncToClient: true, customConst: false }]; saveAttrList(n); return n; }); };
  const del = (idx) => { setLocal(l => { const n = l.filter((_, i) => i !== idx); saveAttrList(n); return n; }); };
  const saveRef = useRef(null);
  useEffect(() => { if (!dirty) return; clearTimeout(saveRef.current); saveRef.current = setTimeout(async () => { await saveAttrList(local); }, 800); return () => clearTimeout(saveRef.current); }, [dirty, local]);

  const RS = { background: C.card, border: `1px solid ${C.inpB}`, borderRadius: 4, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", height: 40, position: "relative" };
  const IS = { ...SI.inp, padding: "4px 8px", fontSize: 12 };
  const [hov, setHov] = useState(null);

  return <div style={{ flex: 1, background: C.panel, borderRadius: C.r, overflow: "hidden", padding: "20px 20px 90px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
    <Btn sm v="g" onClick={addAttr} style={{ alignSelf: "flex-start" }}>+ Attribute</Btn>
    {!local.length && <div style={{ color: C.faint, fontSize: 12, padding: "8px 2px" }}>No attributes yet.</div>}
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {local.map((a, idx) => <div key={idx} style={RS} onMouseEnter={() => setHov(idx)} onMouseLeave={() => setHov(null)}>
        {hov === idx && <div onClick={() => del(idx)} style={{ position: "absolute", top: -5, right: -5, width: 13, height: 13, borderRadius: "50%", background: "#ff5f57", cursor: "pointer", zIndex: 5 }} />}
        <Lbl c={C.faint}>Name</Lbl>
        <input value={a.titleText || ""} onChange={e => upd(idx, "titleText", e.target.value)} style={{ ...IS, flex: 2, minWidth: 80 }} />
        <Lbl c={C.faint}>ID</Lbl>
        <input value={a.id} onChange={e => upd(idx, "id", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} style={{ ...IS, flex: 2, minWidth: 80 }} />
        <Chk label="Const" checked={!!a.customConst} onChange={v => upd(idx, "customConst", v)} />
        {a.customConst && <input value={a.constName} onChange={e => upd(idx, "constName", e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))} style={{ ...IS, width: 100 }} />}
        <Lbl c={C.faint}>Min</Lbl>
        <input type="number" value={a.min} onChange={e => upd(idx, "min", e.target.value)} style={{ ...IS, width: 60 }} />
        <Lbl c={C.faint}>Base</Lbl>
        <input type="number" value={a.base} onChange={e => upd(idx, "base", e.target.value)} style={{ ...IS, width: 60 }} />
        <Lbl c={C.faint}>Max</Lbl>
        <input type="number" value={a.max} onChange={e => upd(idx, "max", e.target.value)} style={{ ...IS, width: 60 }} />
        <Chk label="Sync" checked={!!a.syncToClient} onChange={v => upd(idx, "syncToClient", v)} />
      </div>)}
    </div>
  </div>;
}
