import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Lbl, Btn, Chk, AImg } from "../components/ui.jsx";
import { api, useVanillaItems } from "../api.js";
import { C, SI } from "../theme.js";
import { BASE, VAR_TYPES, defaultForType } from "../constants.js";

export function useVariables() {
  const [variables, setVariables] = useState([]);
  const reload = useCallback(() => { fetch(`${BASE}/variables/list`).then(r => r.json()).then(j => { if (j.ok) setVariables(j.variables || []); }).catch(() => { }); }, []);
  useEffect(() => { reload(); }, [reload]);
  return { variables, reload };
}

function VarItemPicker({ value, onChange, allItems, textures }) {
  const [open, setOpen] = useState(false); const [srch, setSrch] = useState("");
  const vanillaItems = useVanillaItems();
  const pool = useMemo(() => [...allItems, ...vanillaItems], [allItems, vanillaItems]);
  const filt = useMemo(() => { const q = srch.toLowerCase(); return pool.filter(x => !q || x.id.includes(q) || (x.displayName || "").toLowerCase().includes(q)); }, [pool, srch]);
  const sel = pool.find(x => x.id === value?.itemId);
  const prevUrl = sel ? (textures.find(tx => tx.id === sel.textureId)?.dataUrl || sel.textureDataUrl) : null;
  return <div style={{ position: "relative" }}>
    <div onClick={() => setOpen(v => !v)} style={{ ...SI.inp, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "4px 8px", fontSize: 12, height: 33 }}>
      {sel && <AImg url={prevUrl} size={18} />}
      <span style={{ flex: 1, color: sel ? C.text : C.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sel ? (sel.displayName || sel.id) : "(empty)"}</span>
      <span style={{ color: C.dim }}>▾</span>
    </div>
    {open && <div style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, zIndex: 400, background: "#1c1c1c", border: `1px solid ${C.pb}`, borderRadius: 4, boxShadow: "0 8px 30px rgba(0,0,0,.8)", maxHeight: 220, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "4px 6px", borderBottom: `1px solid ${C.inpB}` }}><input autoFocus value={srch} onChange={e => setSrch(e.target.value)} style={{ ...SI.inp, padding: "3px 7px", fontSize: 12 }} /></div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        <div onClick={() => { onChange({ ...value, itemId: null }); setOpen(false); }} style={{ padding: "6px 9px", cursor: "pointer", color: C.faint, fontSize: 12, borderBottom: "1px solid #181818" }}>(empty)</div>
        {filt.slice(0, 200).map(x => { const u = textures.find(tx => tx.id === x.textureId)?.dataUrl || x.textureDataUrl; return <div key={x.id} onClick={() => { onChange({ ...value, itemId: x.id }); setOpen(false); setSrch(""); }} style={{ padding: "4px 7px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, background: value?.itemId === x.id ? "#1a2438" : "transparent", borderBottom: "1px solid #181818" }}>
          <AImg url={u} size={18} />
          <div><div style={{ fontSize: 12, color: C.text }}>{x.displayName || x.id}</div><div style={{ fontSize: 10, color: C.dim }}>{x.id}</div></div>
        </div>; })}
        {!filt.length && <div style={{ padding: "9px", color: C.faint, fontSize: 12 }}>no results</div>}
      </div>
    </div>}
  </div>;
}

export default function VariablesPage({ onEditingChange, newTrigger, editing, setEditing, allItems, textures }) {
  const { variables, reload } = useVariables();
  const [local, setLocal] = useState([]);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  useEffect(() => { if (!dirtyRef.current) setLocal(variables.map(v => ({ ...v }))); }, [variables]);
  useEffect(() => { onEditingChange && onEditingChange(true); }, [onEditingChange]);

  const migrateType = (t) => (t === "float" || t === "int") ? "double" : t;
  const saveNow = useCallback(async (list) => { await api("/variables/save", { variables: list.map(v => ({...v, type: migrateType(v.type)})) }); setDirty(false); }, []);
  const upd = (idx, field, val) => { setLocal(l => { const n = [...l]; n[idx] = { ...n[idx], [field]: val }; return n; }); setDirty(true); };
  const addVar = (type) => { setLocal(l => { const n = [...l, { name: "", titleText: "", type, default: defaultForType(type), dropOnDeath: false }]; saveNow(n); return n; }); };
  const del = (idx) => { setLocal(l => { const n = l.filter((_, i) => i !== idx); saveNow(n); return n; }); };
  const saveRef = useRef(null);
  useEffect(() => { if (!dirty) return; clearTimeout(saveRef.current); saveRef.current = setTimeout(async () => { await api("/variables/save", { variables: local.map(v => ({...v, type: migrateType(v.type)})) }); setDirty(false); }, 800); return () => clearTimeout(saveRef.current); }, [dirty, local]);

  const RS = { background: C.card, border: `1px solid ${C.inpB}`, borderRadius: 4, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, height: 40, position: "relative" };
  const IS = { ...SI.inp, padding: "4px 8px", fontSize: 12 };
  const [hov, setHov] = useState(null);

  return <div style={{ flex: 1, background: C.panel, borderRadius: C.r, overflow: "hidden", padding: "20px 20px 90px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {VAR_TYPES.map(vt => (
        <Btn key={vt.value} sm v="g" onClick={() => addVar(vt.value)}>+ {vt.label}</Btn>
      ))}
    </div>
    {local.length === 0 && <div style={{ color: C.faint, fontSize: 12, padding: "12px 0" }}>No variables defined</div>}
    {VAR_TYPES.map(vt => {
      const vars = local.map((v, i) => ({ ...v, _idx: i })).filter(v => v.type === vt.value || (vt.value === "double" && v.type === "float") || (vt.value === "double" && v.type === "int"));
      if (!vars.length) return null;
      return <div key={vt.value} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 11, color: C.dim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 6 }}>{vt.label}</div>
        {vars.map(v => <div key={v._idx} style={RS} onMouseEnter={() => setHov(v._idx)} onMouseLeave={() => setHov(null)}>
          {hov === v._idx && <div onClick={() => del(v._idx)} style={{ position: "absolute", top: -5, right: -5, width: 13, height: 13, borderRadius: "50%", background: "#ff5f57", cursor: "pointer", zIndex: 5 }} />}
          <Lbl c={C.faint}>Name</Lbl>
          <input value={v.titleText || ""} onChange={e => upd(v._idx, "titleText", e.target.value)} style={{ ...IS, flex: 1 }} />
          <Lbl c={C.faint}>ID</Lbl>
          <input value={v.name} onChange={e => upd(v._idx, "name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} style={{ ...IS, flex: 1 }} />
          <Lbl c={C.faint}>Default</Lbl>
          {vt.value === "bool"
            ? <select value={v.default ? "true" : "false"} onChange={e => upd(v._idx, "default", e.target.value === "true")} style={{ ...IS, width: 70 }}><option value="true">true</option><option value="false">false</option></select>
            : vt.value === "string"
              ? <input value={v.default ?? ""} onChange={e => upd(v._idx, "default", e.target.value)} style={{ ...IS, flex: 1 }} />
              : vt.value === "item"
                ? <div style={{ flex: 1 }}><VarItemPicker value={v.default} onChange={val => upd(v._idx, "default", val)} allItems={allItems} textures={textures} /></div>
                : <input type="number" value={v.default ?? 0} onChange={e => upd(v._idx, "default", vt.value === "float" ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0)} style={{ ...IS, width: 80 }} />}
        </div>)}
      </div>;
    })}
  </div>;
}
