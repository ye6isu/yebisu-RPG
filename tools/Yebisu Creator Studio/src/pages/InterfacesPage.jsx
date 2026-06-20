import React, { useState, useRef, useCallback, useEffect } from "react";
import { Inp, Lbl, Sel, Btn, Pill, FormActions } from "../components/ui.jsx";
import { api } from "../api.js";
import { C, SI } from "../theme.js";
import { BASE } from "../constants.js";

function useInterfaces() {
  const [interfaces, setInterfaces] = useState([]);
  const reload = useCallback(() => { fetch(`${BASE}/interfaces/list`).then(r => r.json()).then(j => { if (j.ok) setInterfaces(j.interfaces || []); }).catch(() => { }); }, []);
  useEffect(() => { reload(); }, [reload]);
  return { interfaces, reload };
}

function InterfaceEditor({ iface, name, setName, ifaceId, setIfaceId, kind, setKind, onSave, onCancel, onDelete }) {
  const isNew = !iface;
  const idErr = isNew ? (ifaceId && !/^[a-z][a-z0-9_]*$/.test(ifaceId) ? "a-z 0-9 _ only, must start with a letter" : null) : null;
  const canSave = name.trim() && (!isNew || ifaceId.trim() && !idErr);
  return <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 16px 100px", gap: 12, overflowY: "auto" }}>
    <div style={{ fontSize: 14, fontWeight: 500 }}>{isNew ? "New Interface" : "Edit Interface"}</div>
    <Inp label="Display Name" value={name} onChange={setName} />
    {isNew && <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Lbl>ID</Lbl>
      <input value={ifaceId} onChange={e => setIfaceId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} style={{ ...SI.inp, border: `1px solid ${ifaceId && idErr ? "#6a2a2a" : C.inpB}` }} />
      {ifaceId && idErr && <span style={{ fontSize: 10, color: "#cc6a6a" }}>{idErr}</span>}
    </div>}
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Lbl>Kind</Lbl>
      <Sel value={kind} onChange={setKind} options={[{ value: "gui", label: "GUI (screen)" }, { value: "hud", label: "HUD (overlay)" }]} />
    </div>
    <FormActions onCancel={onCancel} onSave={() => onSave({ id: isNew ? ifaceId : iface.id, titleText: name.trim(), kind })} canSave={!!canSave} onDelete={!isNew ? () => onDelete(iface.id) : undefined} />
  </div>;
}

function InterfacePreviewPanel({ name, ifaceId, kind }) {
  return <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, gap: 12, overflowY: "auto" }}>
    <Lbl>Preview</Lbl>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 11px", borderRadius: 5, background: C.card, border: `1px solid ${C.inpB}` }}>
      <span style={{ fontSize: 13, color: C.text }}>{name || ifaceId || "(unnamed)"}</span>
      <Pill color={C.inp}>{kind === "hud" ? "HUD" : "GUI"}</Pill>
    </div>
    <div style={{ fontSize: 11, color: C.faint, fontFamily: "monospace" }}>screen.yebisurpg.{ifaceId || "…"}</div>
    <div style={{ fontSize: 11, color: C.faint, marginTop: 8 }}>Layout/rendering for this {kind === "hud" ? "HUD overlay" : "GUI screen"} is not wired up yet — only the id/name/kind plumbing exists so far.</div>
  </div>;
}

export default function InterfacesPage({ onEditingChange, newTrigger, editing, setEditing }) {
  const { interfaces, reload } = useInterfaces();
  const [dragIdx, setDragIdx] = useState(null);
  const [name, setName] = useState("");
  const [ifaceId, setIfaceId] = useState("");
  const [kind, setKind] = useState("gui");
  useEffect(() => { onEditingChange && onEditingChange(!!editing); }, [editing, onEditingChange]);
  const prevTrigger = useRef(newTrigger);
  useEffect(() => { if (newTrigger !== prevTrigger.current) { prevTrigger.current = newTrigger; setEditing("new"); } }, [newTrigger]);
  useEffect(() => {
    if (!editing) return;
    const target = editing === "new" ? null : editing;
    setName(target?.titleText || ""); setIfaceId(target?.id || ""); setKind(target?.kind || "gui");
  }, [editing]);

  const persist = async (list) => { await api("/interfaces/save", { interfaces: list }); reload(); };
  const saveIface = async (i) => {
    const exists = interfaces.some(x => x.id === i.id);
    const next = exists ? interfaces.map(x => x.id === i.id ? i : x) : [...interfaces, i];
    await persist(next); setEditing(null);
  };
  const deleteIface = async (id) => { await persist(interfaces.filter(x => x.id !== id)); setEditing(null); };
  const moveIface = async (from, to) => { if (from === to) return; const arr = [...interfaces]; const [m] = arr.splice(from, 1); arr.splice(to, 0, m); await persist(arr); };

  if (editing) {
    const target = editing === "new" ? null : editing;
    return <div style={{ display: "flex", gap: 5, flex: 1, overflow: "hidden", minHeight: 0 }}>
      <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.pb}`, borderRadius: C.r, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <InterfaceEditor iface={target} name={name} setName={setName} ifaceId={ifaceId} setIfaceId={setIfaceId} kind={kind} setKind={setKind} onSave={saveIface} onCancel={() => setEditing(null)} onDelete={deleteIface} />
      </div>
      <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.pb}`, borderRadius: C.r, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <InterfacePreviewPanel name={name} ifaceId={ifaceId} kind={kind} />
      </div>
    </div>;
  }

  return <div style={{ flex: 1, background: C.panel, borderRadius: C.r, overflow: "hidden", padding: "20px 20px 90px", overflowY: "auto" }}>
    <div style={{ fontSize: 11, color: C.dim, fontWeight: 600, marginBottom: 8, letterSpacing: 0.5 }}>INTERFACES</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {interfaces.map((i, idx) => <div key={i.id}
        draggable
        onDragStart={() => setDragIdx(idx)}
        onDragOver={e => e.preventDefault()}
        onDrop={() => { moveIface(dragIdx, idx); setDragIdx(null); }}
        onClick={() => setEditing(i)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", height: 40, background: C.card, border: `1px solid ${C.inpB}`, borderRadius: 6, cursor: "pointer", position: "relative" }}
        onMouseEnter={ev => { const d = ev.currentTarget.querySelector("[data-del]"); if (d) d.style.display = "flex"; }}
        onMouseLeave={ev => { const d = ev.currentTarget.querySelector("[data-del]"); if (d) d.style.display = "none"; }}>
        <div data-del onClick={ev => { ev.stopPropagation(); deleteIface(i.id); }} style={{ display: "none", position: "absolute", top: -5, right: -5, width: 13, height: 13, borderRadius: "50%", background: "#ff5f57", cursor: "pointer", zIndex: 5, alignItems: "center", justifyContent: "center" }} />
        <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{i.titleText || i.id}</span>
        <Pill color="#1a2438">{i.kind === "hud" ? "HUD" : "GUI"}</Pill>
      </div>)}
      {!interfaces.length && <div style={{ color: C.faint, fontSize: 12, padding: "8px 2px" }}>No interfaces yet.</div>}
    </div>
  </div>;
}
