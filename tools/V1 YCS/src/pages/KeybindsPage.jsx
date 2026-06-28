import React, { useState, useRef, useCallback, useEffect } from "react";
import { Inp, Lbl, Sel, Btn, Pill, FormActions } from "../components/ui.jsx";
import { api } from "../api.js";
import { C, SI } from "../theme.js";
import { BASE } from "../constants.js";

const CODE_TO_GLFW_KEY = { Backquote: "GRAVE_ACCENT", Minus: "MINUS", Equal: "EQUAL", BracketLeft: "LEFT_BRACKET", BracketRight: "RIGHT_BRACKET", Semicolon: "SEMICOLON", Quote: "APOSTROPHE", Comma: "COMMA", Period: "PERIOD", Slash: "SLASH", Backslash: "BACKSLASH", Space: "SPACE", Tab: "TAB", Enter: "ENTER", Backspace: "BACKSPACE", CapsLock: "CAPS_LOCK", ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT", Insert: "INSERT", Delete: "DELETE", Home: "HOME", End: "END", PageUp: "PAGE_UP", PageDown: "PAGE_DOWN" };
const MODIFIER_CODES = new Set(["ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight"]);
const KEY_OPTIONS = (() => {
  const opts = [];
  for (let i = 0; i < 26; i++) opts.push({ value: "KEY_" + String.fromCharCode(65 + i), label: String.fromCharCode(65 + i) });
  for (let i = 0; i <= 9; i++) opts.push({ value: "KEY_" + i, label: String(i) });
  for (let i = 1; i <= 25; i++) opts.push({ value: "KEY_F" + i, label: "F" + i });
  Object.values(CODE_TO_GLFW_KEY).forEach(name => { if (!opts.some(o => o.value === "KEY_" + name)) opts.push({ value: "KEY_" + name, label: name.replace(/_/g, " ") }); });
  opts.push({ value: "MOUSE_0", label: "Mouse 1" }, { value: "MOUSE_1", label: "Mouse 2" }, { value: "MOUSE_2", label: "Mouse 3" }, { value: "MOUSE_3", label: "Mouse 4" }, { value: "MOUSE_4", label: "Mouse 5" });
  return opts;
})();

function splitBindCode(code) {
  if (!code || code === "NONE") return { base: "NONE", mod: "NONE" };
  const [base, mod] = code.split("+");
  return { base, mod: mod || "NONE" };
}
function joinBindCode(base, mod) {
  if (!base || base === "NONE") return "NONE";
  return mod && mod !== "NONE" ? `${base}+${mod}` : base;
}
function domEventToBindCode(e) {
  let base = null;
  if (e.code?.startsWith("Key")) base = "KEY_" + e.code.slice(3).toUpperCase();
  else if (e.code?.startsWith("Digit")) base = "KEY_" + e.code.slice(5);
  else if (e.code?.startsWith("F") && /^F\d+$/.test(e.code)) base = "KEY_" + e.code;
  else if (CODE_TO_GLFW_KEY[e.code]) base = "KEY_" + CODE_TO_GLFW_KEY[e.code];
  if (!base) return null;
  const mod = e.ctrlKey ? "CTRL" : e.altKey ? "ALT" : e.shiftKey ? "SHIFT" : "NONE";
  return joinBindCode(base, mod);
}
export function bindCodeLabel(code) {
  const { base, mod } = splitBindCode(code);
  if (base === "NONE") return "(none)";
  const baseLabel = base.startsWith("MOUSE_") ? "Mouse " + (parseInt(base.slice(6)) + 1) : base.slice(4).replace(/_/g, " ");
  const modLabel = mod === "CTRL" ? "Ctrl" : mod === "ALT" ? "Alt" : mod === "SHIFT" ? "Shift" : null;
  return modLabel ? `${modLabel} + ${baseLabel}` : baseLabel;
}

function RecordKeyButton({ value, onChange }) {
  const [recording, setRecording] = useState(false);
  const { base, mod } = splitBindCode(value);
  useEffect(() => {
    if (!recording) return;
    const onKey = e => {
      if (MODIFIER_CODES.has(e.code)) return;
      e.preventDefault(); const code = domEventToBindCode(e); if (code) { onChange(code); setRecording(false); }
    };
    const MOUSE_REMAP = { 0: 0, 1: 2, 2: 1 };
    const onMouse = e => { e.preventDefault(); const m = e.ctrlKey ? "CTRL" : e.altKey ? "ALT" : e.shiftKey ? "SHIFT" : "NONE"; onChange(joinBindCode("MOUSE_" + (MOUSE_REMAP[e.button] ?? e.button), m)); setRecording(false); };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("mousedown", onMouse, true);
    return () => { window.removeEventListener("keydown", onKey, true); window.removeEventListener("mousedown", onMouse, true); };
  }, [recording, onChange]);
  return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Btn v={recording ? "p" : "d"} onClick={() => setRecording(v => !v)}>{recording ? "Press a key or mouse button…" : "Record"}</Btn>
      <div style={{ width: 180 }}><Sel value={base} onChange={v => onChange(joinBindCode(v, mod))} options={[{ value: "NONE", label: "(none)" }, ...KEY_OPTIONS]} /></div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 120 }}><Sel value={mod} onChange={v => onChange(joinBindCode(base, v))} options={[{ value: "NONE", label: "No modifier" }, { value: "CTRL", label: "Ctrl" }, { value: "ALT", label: "Alt" }, { value: "SHIFT", label: "Shift" }]} /></div>
      <Pill color="#1a2438">{bindCodeLabel(value)}</Pill>
      {base !== "NONE" && !recording && <Btn sm v="g" onClick={() => onChange("NONE")}>Clear</Btn>}
    </div>
  </div>;
}

function useKeybinds() {
  const [keybinds, setKeybinds] = useState([]);
  const [categories, setCategories] = useState({ own: "CATEGORY", ownLabel: "yebisu RPG", vanilla: [], custom: [] });
  const reload = useCallback(() => { fetch(`${BASE}/keybinds/list`).then(r => r.json()).then(j => { if (j.ok) { setKeybinds(j.keybinds || []); if (j.categories) setCategories(j.categories); } }).catch(() => { }); }, []);
  useEffect(() => { reload(); }, [reload]);
  return { keybinds, categories, reload };
}

function categoryLabel(cat) {
  if (!cat || cat === "CATEGORY") return "yebisu RPG";
  return cat.startsWith("key.categories.") ? cat.slice("key.categories.".length).replace(/^./, c => c.toUpperCase()) : cat;
}

function CategoryPicker({ value, categories, onChange }) {
  const known = ["CATEGORY", ...categories.vanilla, ...categories.custom];
  const isCustom = value && !known.includes(value);
  const [customMode, setCustomMode] = useState(isCustom);
  const options = [{ value: "CATEGORY", label: "yebisu RPG" }, ...categories.vanilla.map(c => ({ value: c, label: categoryLabel(c) })), ...categories.custom.map(c => ({ value: c, label: c })), { value: "__custom__", label: "+ New custom category…" }];
  if (customMode) return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <Lbl>Category</Lbl>
    <div style={{ display: "flex", gap: 8 }}>
      <input value={value} onChange={e => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} style={SI.inp} />
      <Btn sm v="g" onClick={() => { setCustomMode(false); onChange("CATEGORY"); }}>Cancel</Btn>
    </div>
  </div>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <Lbl>Category</Lbl>
    <Sel value={known.includes(value) ? value : "CATEGORY"} onChange={v => { if (v === "__custom__") { setCustomMode(true); onChange(""); } else onChange(v); }} options={options} />
  </div>;
}

function KeybindEditor({ bind, name, setName, keyId, setKeyId, bindCode, setBindCode, category, setCategory, categories, onSave, onCancel, onDelete }) {
  const isNew = !bind;
  const keyErr = isNew ? (keyId && !/^[a-z][a-z0-9_]*$/.test(keyId) ? "a-z 0-9 _ only, must start with a letter" : null) : null;
  const canSave = name.trim() && (!isNew || keyId.trim() && !keyErr);
  return <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 16px 100px", gap: 12, overflowY: "auto" }}>
    <div style={{ fontSize: 14, fontWeight: 500 }}>{isNew ? "New Keybind" : "Edit Keybind"}</div>
    <Inp label="Display Name" value={name} onChange={setName} />
    {isNew && <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Lbl>Key</Lbl>
      <input value={keyId} onChange={e => setKeyId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} style={{ ...SI.inp, border: `1px solid ${keyId && keyErr ? "#6a2a2a" : C.inpB}` }} />
      {keyId && keyErr && <span style={{ fontSize: 10, color: "#cc6a6a" }}>{keyErr}</span>}
    </div>}
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Lbl>Default binding</Lbl>
      <RecordKeyButton value={bindCode} onChange={setBindCode} />
    </div>
    <CategoryPicker value={category} categories={categories} onChange={setCategory} />
    <FormActions onCancel={onCancel} onSave={() => onSave({ key: isNew ? keyId : bind.key, titleText: name.trim(), bindCode, category: category || "CATEGORY" })} canSave={!!canSave} onDelete={!isNew ? () => onDelete(bind.key) : undefined} />
  </div>;
}

function KeybindPreviewPanel({ name, keyId, bindCode, category }) {
  return <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, gap: 12, overflowY: "auto" }}>
    <Lbl>Preview</Lbl>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 11px", borderRadius: 5, background: C.card, border: `1px solid ${C.inpB}` }}>
      <span style={{ fontSize: 13, color: C.text }}>{name || keyId || "(unnamed)"}</span>
      <Pill color={C.inp}>{bindCodeLabel(bindCode)}</Pill>
    </div>
    <div style={{ fontSize: 11, color: C.faint, fontFamily: "monospace" }}>key.yebisurpg.{keyId || "…"}</div>
    <div style={{ fontSize: 11, color: C.faint, marginTop: 8 }}>This is how the binding will appear in the vanilla Controls screen, under the <b>{categoryLabel(category)}</b> category.</div>
  </div>;
}

export default function KeybindsPage({ reloadMod, onEditingChange, newTrigger, editing, setEditing }) {
  const { keybinds, categories, reload } = useKeybinds();
  const [dragIdx, setDragIdx] = useState(null);
  const [name, setName] = useState("");
  const [keyId, setKeyId] = useState("");
  const [bindCode, setBindCode] = useState("NONE");
  const [category, setCategory] = useState("CATEGORY");
  useEffect(() => { onEditingChange && onEditingChange(!!editing); }, [editing, onEditingChange]);
  const prevTrigger = useRef(newTrigger);
  useEffect(() => { if (newTrigger !== prevTrigger.current) { prevTrigger.current = newTrigger; setEditing("new"); } }, [newTrigger]);
  useEffect(() => {
    if (!editing) return;
    const target = editing === "new" ? null : editing;
    setName(target?.titleText || ""); setKeyId(target?.key || ""); setBindCode(target?.bindCode || "NONE"); setCategory(target?.category || "CATEGORY");
  }, [editing]);

  const persist = async (list) => { await api("/keybinds/save", { keybinds: list }); reload(); reloadMod && reloadMod(); };
  const saveBind = async (b) => {
    const exists = keybinds.some(k => k.key === b.key);
    const next = exists ? keybinds.map(k => k.key === b.key ? b : k) : [...keybinds, b];
    await persist(next); setEditing(null);
  };
  const deleteBind = async (key) => { await persist(keybinds.filter(k => k.key !== key)); setEditing(null); };
  const moveBind = async (from, to) => { if (from === to) return; const arr = [...keybinds]; const [m] = arr.splice(from, 1); arr.splice(to, 0, m); await persist(arr); };

  if (editing) {
    const target = editing === "new" ? null : editing;
    return <div style={{ display: "flex", gap: 5, flex: 1, overflow: "hidden", minHeight: 0 }}>
      <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.pb}`, borderRadius: C.r, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <KeybindEditor bind={target} name={name} setName={setName} keyId={keyId} setKeyId={setKeyId} bindCode={bindCode} setBindCode={setBindCode} category={category} setCategory={setCategory} categories={categories} onSave={saveBind} onCancel={() => setEditing(null)} onDelete={deleteBind} />
      </div>
      <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.pb}`, borderRadius: C.r, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <KeybindPreviewPanel name={name} keyId={keyId} bindCode={bindCode} category={category} />
      </div>
    </div>;
  }

  return <div style={{ flex: 1, background: C.panel, borderRadius: C.r, overflow: "hidden", padding: "20px 20px 90px", overflowY: "auto" }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {keybinds.map((k, i) => <div key={k.key}
        draggable
        onDragStart={() => setDragIdx(i)}
        onDragOver={e => e.preventDefault()}
        onDrop={() => { moveBind(dragIdx, i); setDragIdx(null); }}
        onClick={() => setEditing(k)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", height: 40, background: C.card, border: `1px solid ${C.inpB}`, borderRadius: 6, cursor: "pointer", position: "relative" }}
        onMouseEnter={ev => { const d = ev.currentTarget.querySelector("[data-del]"); if (d) d.style.display = "flex"; }}
        onMouseLeave={ev => { const d = ev.currentTarget.querySelector("[data-del]"); if (d) d.style.display = "none"; }}>
        <div data-del onClick={ev => { ev.stopPropagation(); deleteBind(k.key); }} style={{ display: "none", position: "absolute", top: -5, right: -5, width: 13, height: 13, borderRadius: "50%", background: "#ff5f57", cursor: "pointer", zIndex: 5, alignItems: "center", justifyContent: "center" }} />
        <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{k.titleText || k.key}</span>
        <Pill color="#1a2438">{bindCodeLabel(k.bindCode)}</Pill>
      </div>)}
      {!keybinds.length && <div style={{ color: C.faint, fontSize: 12, padding: "8px 2px" }}>No keybinds yet.</div>}
    </div>
  </div>;
}
