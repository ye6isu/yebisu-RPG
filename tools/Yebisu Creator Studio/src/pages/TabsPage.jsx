import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Inp, Lbl, Chk, Btn, AImg, Sel, Pill, FormActions } from "../components/ui.jsx";
import TexSel from "../components/TexSel.jsx";
import { api, useVanillaItems, useCreativeTabs } from "../api.js";
import { C, SI } from "../theme.js";

function TAB_VALUE_TO_KEY_CLIENT(value) {
  if (value.startsWith("vanilla:")) return value.replace("vanilla:", "");
  const m = /^ModCreativeModeTabs\.(\w+)$/.exec(value);
  return m ? m[1].toLowerCase() : value;
}

export function tabIconPreview(tab, allItems, allBlocks, textures) {
  if (!tab.iconRef) return null;
  if (tab.iconRef.startsWith("cycle:")) return "cycle";
  const [kind, ...rest] = tab.iconRef.split(":");
  const id = rest.join(":");
  if (kind === "vanilla") return null;
  const pool = kind === "block" ? allBlocks : allItems;
  const e = pool.find(x => x.id === id);
  if (!e) return null;
  const t = textures.find(tx => tx.id === e.textureId);
  return t?.dataUrl || e.textureDataUrl || null;
}

function IconPicker({ label, value, onChange, allItems, allBlocks, textures }) {
  const [mode, setMode] = useState(value && value.startsWith("tex:") ? "texture" : "item");
  const [open, setOpen] = useState(false); const [srch, setSrch] = useState("");
  const vanillaItems = useVanillaItems();
  const pool = useMemo(() => [...allItems.map(x => ({ ...x, kind: "item" })), ...allBlocks.map(x => ({ ...x, kind: "block" })), ...vanillaItems.map(x => ({ ...x, kind: "vanilla" }))], [allItems, allBlocks, vanillaItems]);
  const filt = useMemo(() => { const q = srch.toLowerCase(); return pool.filter(x => !q || x.id.includes(q) || (x.displayName || "").toLowerCase().includes(q)); }, [pool, srch]);
  const sel = pool.find(x => `${x.kind}:${x.id}` === value);
  const prevUrl = sel ? (textures.find(tx => tx.id === sel.textureId)?.dataUrl || sel.textureDataUrl) : null;
  const texVal = value && value.startsWith("tex:") ? value.slice(4) : "";
  const selTex = texVal ? textures.find(t => t.id === texVal) : null;
  return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      {label ? <Lbl>{label}</Lbl> : <span />}
      <div style={{ display: "flex", gap: 4 }}>
        <span onClick={() => setMode("item")} style={{ fontSize: 10, color: mode === "item" ? C.accent : C.faint, cursor: "pointer", fontWeight: mode === "item" ? 600 : 400 }}>Item</span>
        <span style={{ fontSize: 10, color: C.dim }}>|</span>
        <span onClick={() => setMode("texture")} style={{ fontSize: 10, color: mode === "texture" ? C.accent : C.faint, cursor: "pointer", fontWeight: mode === "texture" ? 600 : 400 }}>Texture</span>
      </div>
    </div>
    {mode === "texture"
      ? <TexSel textures={textures} value={texVal} onChange={v => onChange(v ? `tex:${v}` : "")} />
      : <div style={{ position: "relative" }}>
        <div onClick={() => setOpen(v => !v)} style={{ ...SI.inp, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 9px" }}>
          <AImg url={prevUrl} size={22} />
          <span style={{ flex: 1, color: sel ? C.text : C.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sel ? (sel.displayName || sel.id) : "(choose item)"}</span>
          <span style={{ color: C.dim }}>▾</span>
        </div>
        {open && <div style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, zIndex: 400, background: "#1c1c1c", border: `1px solid ${C.pb}`, borderRadius: 4, boxShadow: "0 8px 30px rgba(0,0,0,.8)", maxHeight: 260, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "4px 6px", borderBottom: `1px solid ${C.inpB}` }}><input autoFocus value={srch} onChange={e => setSrch(e.target.value)} style={{ ...SI.inp, padding: "3px 7px", fontSize: 12 }} /></div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filt.slice(0, 200).map(x => { const u = textures.find(tx => tx.id === x.textureId)?.dataUrl || x.textureDataUrl; return <div key={`${x.kind}:${x.id}`} onClick={() => { onChange(`${x.kind}:${x.id}`); setOpen(false); setSrch(""); }} style={{ padding: "4px 7px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, background: value === `${x.kind}:${x.id}` ? "#1a2438" : "transparent", borderBottom: "1px solid #181818" }}>
              <AImg url={u} size={20} />
              <div><div style={{ fontSize: 12, color: C.text }}>{x.displayName || x.id}</div><div style={{ fontSize: 10, color: C.dim }}>{x.kind}:{x.id}</div></div>
            </div>; })}
            {!filt.length && <div style={{ padding: "9px", color: C.faint, fontSize: 12 }}>no results</div>}
          </div>
        </div>}
      </div>}
  </div>;
}

function TabIconPanel({ value, onChange, allItems, allBlocks, textures }) {
  const isCycle = value && value.startsWith("cycle:");
  const [mode, setMode] = useState(isCycle ? "cycle" : "item");
  const [interval, setInterval_] = useState(isCycle ? parseInt(value.split(":")[1]) || 2000 : 2000);
  const [open, setOpen] = useState(false); const [srch, setSrch] = useState("");
  const vanillaItems = useVanillaItems();
  const pool = useMemo(() => [...allItems.map(x => ({ ...x, kind: "item" })), ...allBlocks.map(x => ({ ...x, kind: "block" })), ...vanillaItems.map(x => ({ ...x, kind: "vanilla" }))], [allItems, allBlocks, vanillaItems]);
  const filt = useMemo(() => { const q = srch.toLowerCase(); return pool.filter(x => !q || x.id.includes(q) || (x.displayName || "").toLowerCase().includes(q)); }, [pool, srch]);
  const sel = !isCycle ? pool.find(x => `${x.kind}:${x.id}` === value) : null;
  const prevUrl = sel ? (textures.find(tx => tx.id === sel.textureId)?.dataUrl || sel.textureDataUrl) : null;
  return <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontSize: 14, fontWeight: 500 }}>Choose Icon</div>
      <div style={{ display: "flex", gap: 4 }}>
        <span onClick={() => { setMode("item"); if (value?.startsWith("cycle:")) onChange(""); }} style={{ fontSize: 10, color: mode === "item" ? C.accent : C.faint, cursor: "pointer", fontWeight: mode === "item" ? 600 : 400 }}>Item</span>
        <span style={{ fontSize: 10, color: C.dim }}>|</span>
        <span onClick={() => { setMode("cycle"); onChange(`cycle:${interval}`); }} style={{ fontSize: 10, color: mode === "cycle" ? C.accent : C.faint, cursor: "pointer", fontWeight: mode === "cycle" ? 600 : 400 }}>Cycle</span>
      </div>
    </div>
    {mode === "cycle"
      ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 12, color: C.dim }}>Cycles through all items in this tab as the icon, in random order.</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Lbl>Interval (ms)</Lbl>
          <input type="number" value={interval} onChange={e => { const v = Math.max(500, parseInt(e.target.value) || 2000); setInterval_(v); onChange(`cycle:${v}`); }} style={{ ...SI.inp, width: 80, padding: "4px 8px", fontSize: 12 }} />
        </div>
      </div>
      : <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minHeight: 0 }}>
        {sel && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "#192a19", border: "1px solid #2a5a2a", borderRadius: 4 }}>
          <AImg url={prevUrl} size={20} />
          <span style={{ fontSize: 12, color: C.text }}>{sel.displayName || sel.id}</span>
          <span onClick={() => onChange("")} style={{ marginLeft: "auto", fontSize: 10, color: "#cc6a6a", cursor: "pointer" }}>✕</span>
        </div>}
        <input value={srch} onChange={e => setSrch(e.target.value)} style={{ ...SI.inp, fontSize: 11 }} />
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1, border: `1px solid ${C.inpB}`, borderRadius: 4, padding: 3 }}>
          {filt.slice(0, 200).map(x => { const u = textures.find(tx => tx.id === x.textureId)?.dataUrl || x.textureDataUrl; const isSel = value === `${x.kind}:${x.id}`;
            return <div key={`${x.kind}:${x.id}`} onClick={() => { onChange(`${x.kind}:${x.id}`); }}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 6px", cursor: "pointer", borderRadius: 3, background: isSel ? "#192a19" : "transparent", border: `1px solid ${isSel ? "#2a5a2a" : "transparent"}` }}>
              <AImg url={u} size={18} />
              <span style={{ fontSize: 11, fontFamily: "monospace", color: isSel ? "#5acc5a" : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{x.displayName || x.id}</span>
              <span style={{ fontSize: 9, color: C.faint, whiteSpace: "nowrap" }}>{x.kind}</span>
            </div>; })}
          {!filt.length && <div style={{ padding: "9px", color: C.faint, fontSize: 11 }}>no results</div>}
        </div>
      </div>}
  </div>;
}

function TabEditor({ tab, allItems, allBlocks, textures, onSave, onCancel, onDelete, iconRef, setIconRef, showIconPanel, setShowIconPanel }) {
  const [name, setName] = useState(tab?.titleText || "");
  const [key, setKey] = useState(tab?.key || "");
  const isNew = !tab;
  const keyErr = isNew ? (key && !/^[a-z][a-z0-9_]*$/.test(key) ? "a-z 0-9 _ only, must start with a letter" : null) : null;
  const canSave = name.trim() && (!isNew || key.trim() && !keyErr);
  const iconUrl = tabIconPreview({ iconRef }, allItems, allBlocks, textures);
  return <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.pb}`, borderRadius: C.r, display: "flex", flexDirection: "column", padding: "16px 16px 100px", gap: 12, overflowY: "auto" }}>
    <div style={{ fontSize: 14, fontWeight: 500 }}>{isNew ? "New Creative Tab" : "Edit Creative Tab"}</div>
    <Inp label="Display Name" value={name} onChange={setName} />
    {isNew && <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Lbl>Key</Lbl>
      <input value={key} onChange={e => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} style={{ ...SI.inp, border: `1px solid ${key && keyErr ? "#6a2a2a" : C.inpB}` }} />
      {key && keyErr && <span style={{ fontSize: 10, color: "#cc6a6a" }}>{keyErr}</span>}
    </div>}
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Lbl>Icon</Lbl>
      <div style={{ ...SI.inp, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", cursor: "default" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {iconUrl === "cycle" ? <span style={{ fontSize: 16, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>↻</span> : iconUrl ? <AImg url={iconUrl} size={20} /> : <div style={{ width: 20, height: 20, background: C.prev, borderRadius: 3, border: `1px dashed ${C.inpB}`, flexShrink: 0 }} />}
          <span style={{ fontSize: 13, color: iconRef ? C.text : C.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{iconRef?.startsWith("cycle:") ? "cycle items" : iconRef || "none"}</span>
        </div>
        <Btn sm v={showIconPanel ? "p" : "g"} onClick={() => setShowIconPanel(v => !v)} style={{ marginLeft: 8, flexShrink: 0 }}>set</Btn>
      </div>
    </div>
    <FormActions onCancel={onCancel} onSave={() => onSave({ key: isNew ? key : tab.key, titleText: name.trim(), iconRef })} canSave={!!canSave} onDelete={!isNew ? () => onDelete(tab.key) : undefined} />
  </div>;
}

function TabItemReorder({ tabValue, allItems, allBlocks, textures, onReordered }) {
  const entryKey = x => x.kind === "block" ? `block:${x.id}` : x.id;
  const assigned = useMemo(() => [...allItems.map(x => ({ ...x, kind: "item" })), ...allBlocks.map(x => ({ ...x, kind: "block" }))].filter(x => x.creativeTab === tabValue), [allItems, allBlocks, tabValue]);
  const [order, setOrder] = useState(assigned.map(entryKey));
  useEffect(() => { setOrder(assigned.map(entryKey)); }, [assigned.map(entryKey).join(",")]);
  const [dragIdx, setDragIdx] = useState(null);
  const items = order.map(k => assigned.find(x => entryKey(x) === k)).filter(Boolean);
  const move = async (to) => {
    if (dragIdx === null || dragIdx === to) return;
    const next = [...order]; const [m] = next.splice(dragIdx, 1); next.splice(to, 0, m);
    setOrder(next); setDragIdx(null);
    await api("/creativetabs/reorder-items", { tabKey: TAB_VALUE_TO_KEY_CLIENT(tabValue), order: next });
    onReordered && onReordered();
  };
  if (!items.length) return <div style={{ color: C.faint, fontSize: 12, padding: "8px 2px" }}>No mod items assigned to this tab yet.</div>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {items.map((x, i) => { const u = textures.find(tx => tx.id === x.textureId)?.dataUrl || x.textureDataUrl;
      return <div key={entryKey(x)} draggable
        onDragStart={() => setDragIdx(i)}
        onDragOver={e => e.preventDefault()}
        onDrop={() => move(i)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", background: dragIdx === i ? "#1a2438" : "#1a1a1a", border: `1px solid ${C.inpB}`, borderRadius: 4, cursor: "grab" }}>
        <span style={{ color: C.faint, fontSize: 11 }}>⠿</span>
        <AImg url={u} size={20} />
        <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{x.displayName || x.id}</span>
        <span style={{ fontSize: 10, color: C.dim }}>{x.kind}</span>
      </div>; })}
  </div>;
}

export default function TabsPage({ allItems, allBlocks, textures, reloadMod, onEditingChange, newTrigger, editing, setEditing }) {
  const { customTabs, options, reload } = useCreativeTabs();
  useEffect(() => { onEditingChange && onEditingChange(!!editing); }, [editing, onEditingChange]);
  const prevTrigger = useRef(newTrigger);
  useEffect(() => { if (newTrigger !== prevTrigger.current) { prevTrigger.current = newTrigger; setEditing("new"); } }, [newTrigger]);
  const customList = options.filter(o => o.custom);
  const saveTab = async (t) => {
    const ordered = customTabs.some(c => c.key === t.key) ? customTabs.map(c => c.key === t.key ? { key: t.key, iconRef: t.iconRef } : c) : [...customTabs, { key: t.key, iconRef: t.iconRef }];
    await api("/creativetabs/save", { tabs: ordered.map(c => ({ key: c.key, iconRef: c.iconRef, titleText: c.key === t.key ? t.titleText : (options.find(o => o.key === c.key)?.label || c.key) })) });
    setEditing(null); reload(); reloadMod();
  };
  const deleteTab = async (key) => {
    const next = customTabs.filter(c => c.key !== key);
    await api("/creativetabs/save", { tabs: next.map(c => ({ key: c.key, iconRef: c.iconRef, titleText: options.find(o => o.key === c.key)?.label || c.key })) });
    setEditing(null); reload(); reloadMod();
  };
  const moveCustomTab = async (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    const arr = [...customTabs]; const [m] = arr.splice(fromIdx, 1); arr.splice(toIdx, 0, m);
    await api("/creativetabs/save", { tabs: arr.map(c => ({ key: c.key, iconRef: c.iconRef, titleText: options.find(o => o.key === c.key)?.label || c.key })) });
    reload();
  };
  const [dragTabIdx, setDragTabIdx] = useState(null);

  const [iconRef, setIconRef] = useState("");
  const [showIconPanel, setShowIconPanel] = useState(false);
  useEffect(() => { if (editing && editing !== "new") setIconRef(editing.iconRef || ""); else setIconRef(""); setShowIconPanel(false); }, [editing]);

  if (editing) {
    const target = editing === "new" ? null : editing;
    return <div style={{ display: "flex", gap: 5, flex: 1, overflow: "hidden", minHeight: 0 }}>
      <TabEditor tab={target} allItems={allItems} allBlocks={allBlocks} textures={textures} onSave={saveTab} onCancel={() => setEditing(null)} onDelete={deleteTab} iconRef={iconRef} setIconRef={setIconRef} showIconPanel={showIconPanel} setShowIconPanel={setShowIconPanel} />
      <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.pb}`, borderRadius: C.r, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {showIconPanel
          ? <TabIconPanel value={iconRef} onChange={setIconRef} allItems={allItems} allBlocks={allBlocks} textures={textures} />
          : target
            ? <>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>Item order in this tab</div>
              <TabItemReorder tabValue={`ModCreativeModeTabs.${target.key.toUpperCase()}`} allItems={allItems} allBlocks={allBlocks} textures={textures} onReordered={reloadMod} />
            </>
            : <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.faint, fontSize: 12 }}>use set on the left to pick an icon</div>}
      </div>
    </div>;
  }

  return <div style={{ flex: 1, background: C.panel, borderRadius: C.r, overflow: "hidden", padding: "20px 20px 90px", overflowY: "auto" }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {customList.map((o, i) => {
        const tabObj = customTabs.find(c => c.key === o.key);
        const icon = tabObj ? tabIconPreview(tabObj, allItems, allBlocks, textures) : null;
        return <div key={o.value}
          draggable
          onDragStart={() => setDragTabIdx(i)}
          onDragOver={e => e.preventDefault()}
          onDrop={() => moveCustomTab(dragTabIdx, i)}
          onClick={() => setEditing(tabObj ? { ...tabObj, titleText: o.label } : null)}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", height: 40, background: C.card, border: `1px solid ${C.inpB}`, borderRadius: 6, cursor: "pointer", position: "relative" }}
          onMouseEnter={ev => { const d = ev.currentTarget.querySelector("[data-del]"); if (d) d.style.display = "flex"; }}
          onMouseLeave={ev => { const d = ev.currentTarget.querySelector("[data-del]"); if (d) d.style.display = "none"; }}>
          <div data-del onClick={ev => { ev.stopPropagation(); deleteTab(o.key); }} style={{ display: "none", position: "absolute", top: -5, right: -5, width: 13, height: 13, borderRadius: "50%", background: "#ff5f57", cursor: "pointer", zIndex: 5, alignItems: "center", justifyContent: "center" }} />
          {icon === "cycle" ? <span style={{ fontSize: 14, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>↻</span> : icon ? <AImg url={icon} size={24} /> : <div style={{ width: 24, height: 24 }} />}
          <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{o.label}</span>
        </div>;
      })}
      {!customList.length && <div style={{ color: C.faint, fontSize: 12, padding: 8 }}>No custom tabs yet</div>}
    </div>
  </div>;
}
