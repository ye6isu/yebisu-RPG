import { useState, useMemo } from "react";
import { useVanillaItems } from "../api.js";
import { AImg, Lbl } from "./ui.jsx";
import { C, SI } from "../theme.js";

export default function ItemPicker({ label, value, onChange, allItems, textures, showCount = true, allowEmpty = false }) {
  const [open, setOpen] = useState(false); const [srch, setSrch] = useState("");
  const vanillaItems = useVanillaItems();
  const pool = useMemo(() => [...allItems, ...vanillaItems], [allItems, vanillaItems]);
  const filt = useMemo(() => { const q = srch.toLowerCase(); return pool.filter(x => !q || x.id.includes(q) || (x.displayName || "").toLowerCase().includes(q)); }, [pool, srch]);
  const sel = pool.find(x => x.id === value?.itemId);
  const prevUrl = sel ? (textures.find(tx => tx.id === sel.textureId)?.dataUrl || sel.textureDataUrl) : null;

  if (!showCount && !label) {
    // Compact mode (used by variables)
    return <div style={{ position: "relative" }}>
      <div onClick={() => setOpen(v => !v)} style={{ ...SI.inp, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "4px 8px", fontSize: 12, height: 33 }}>
        {sel && <AImg url={prevUrl} size={18} />}
        <span style={{ flex: 1, color: sel ? C.text : C.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sel ? (sel.displayName || sel.id) : "(empty)"}</span>
        <span style={{ color: C.dim }}>▾</span>
      </div>
      {open && <div style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, zIndex: 400, background: "#1c1c1c", border: `1px solid ${C.pb}`, borderRadius: 4, boxShadow: "0 8px 30px rgba(0,0,0,.8)", maxHeight: 220, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "4px 6px", borderBottom: `1px solid ${C.inpB}` }}><input autoFocus value={srch} onChange={e => setSrch(e.target.value)} style={{ ...SI.inp, padding: "3px 7px", fontSize: 12 }} /></div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {allowEmpty && <div onClick={() => { onChange({ ...value, itemId: null }); setOpen(false); }} style={{ padding: "6px 9px", cursor: "pointer", color: C.faint, fontSize: 12, borderBottom: "1px solid #181818" }}>(empty)</div>}
          {filt.slice(0, 200).map(x => { const u = textures.find(tx => tx.id === x.textureId)?.dataUrl || x.textureDataUrl; return <div key={x.id} onClick={() => { onChange({ ...value, itemId: x.id }); setOpen(false); setSrch(""); }} style={{ padding: "4px 7px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, background: value?.itemId === x.id ? "#1a2438" : "transparent", borderBottom: "1px solid #181818" }}>
            <AImg url={u} size={18} />
            <div><div style={{ fontSize: 12, color: C.text }}>{x.displayName || x.id}</div><div style={{ fontSize: 10, color: C.dim }}>{x.id}</div></div>
          </div>; })}
          {!filt.length && <div style={{ padding: "9px", color: C.faint, fontSize: 12 }}>no results</div>}
        </div>
      </div>}
    </div>;
  }

  return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {label && <Lbl>{label}</Lbl>}
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <div style={{ position: "relative", flex: 1 }}>
        <div onClick={() => setOpen(v => !v)} style={{ ...SI.inp, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 9px", boxSizing: "border-box", height: 33 }}>
          <AImg url={prevUrl} size={22} />
          <span style={{ flex: 1, color: sel ? C.text : C.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sel ? (sel.displayName || sel.id) : allowEmpty ? "(empty)" : "(choose item)"}</span>
          <span style={{ color: C.dim }}>▾</span>
        </div>
        {open && <div style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, zIndex: 400, background: "#1c1c1c", border: `1px solid ${C.pb}`, borderRadius: 4, boxShadow: "0 8px 30px rgba(0,0,0,.8)", maxHeight: 260, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "4px 6px", borderBottom: `1px solid ${C.inpB}` }}><input autoFocus value={srch} onChange={e => setSrch(e.target.value)} style={{ ...SI.inp, padding: "3px 7px", fontSize: 12 }} /></div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {allowEmpty && <div onClick={() => { onChange({ ...value, itemId: null }); setOpen(false); }} style={{ padding: "6px 9px", cursor: "pointer", color: C.faint, fontSize: 12, borderBottom: "1px solid #181818" }}>(empty)</div>}
            {filt.slice(0, 200).map(x => { const u = textures.find(tx => tx.id === x.textureId)?.dataUrl || x.textureDataUrl; return <div key={x.id} onClick={() => { onChange({ ...value, itemId: x.id }); setOpen(false); setSrch(""); }} style={{ padding: "4px 7px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, background: value?.itemId === x.id ? "#1a2438" : "transparent", borderBottom: "1px solid #181818" }}>
              <AImg url={u} size={20} />
              <div><div style={{ fontSize: 12, color: C.text }}>{x.displayName || x.id}</div><div style={{ fontSize: 10, color: C.dim }}>{x.id}</div></div>
            </div>; })}
            {!filt.length && <div style={{ padding: "9px", color: C.faint, fontSize: 12 }}>no results</div>}
          </div>
        </div>}
      </div>
      {showCount && <input value={value?.count ?? 1} onChange={e => onChange({ ...value, count: Math.max(1, parseInt(e.target.value) || 1) })} type="number" style={{ ...SI.inp, width: 70, boxSizing: "border-box", height: 33 }} />}
    </div>
  </div>;
}
