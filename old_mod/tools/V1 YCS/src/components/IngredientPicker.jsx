import { useState, useMemo } from "react";
import { AImg } from "./ui.jsx";
import { C, SI } from "../theme.js";
import { TAG_GROUPS, MODID } from "../constants.js";

export default function IngredientPicker({ value, onChange, modItems, modBlocks, vanillaItems, textures, filter }) {
  const [srch, setSrch] = useState("");
  const q_ext = typeof filter === "string";
  const entries = useMemo(() => {
    const tagE = TAG_GROUPS.map(g => ({ ref: `#${g.tag}`, label: g.label, sub: g.tag, isTag: true }));
    const modE = [...modItems.map(x => ({ ...x, kind: "item" })), ...modBlocks.map(x => ({ ...x, kind: "block" }))]
      .map(x => ({ ref: `${MODID}:${x.id}`, label: x.displayName || x.id, sub: `${MODID}:${x.id}`, tex: x, isTag: false }));
    const vanE = vanillaItems.map(x => ({ ref: x.id, label: x.displayName || x.id, sub: x.id, tex: x, isTag: false }));
    return [...tagE, ...modE, ...vanE];
  }, [modItems, modBlocks, vanillaItems]);
  const filt = useMemo(() => {
    const q = (q_ext ? filter : srch).toLowerCase().trim();
    if (!q) return entries;
    return entries.filter(e => e.label.toLowerCase().includes(q) || e.sub.toLowerCase().includes(q));
  }, [entries, srch, filter, q_ext]);
  return <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 0 }}>
    {!q_ext && <input value={srch} onChange={e => setSrch(e.target.value)} style={{ ...SI.inp, fontSize: 12 }} />}
    <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1, border: `1px solid ${C.inpB}`, borderRadius: 4, padding: 3 }}>
      {filt.slice(0, 200).map(e => {
        const u = e.tex ? (textures.find(tx => tx.id === e.tex.textureId)?.dataUrl || e.tex.textureDataUrl) : null;
        const isSel = value === e.ref;
        return <div key={e.ref} draggable onDragStart={ev => ev.dataTransfer.setData("item", e.ref)} onClick={() => onChange(isSel ? "" : e.ref)}
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "4px 6px", cursor: "pointer", borderRadius: 3,
            background: isSel ? (e.isTag ? "#1a1a2e" : "#192a19") : "transparent",
            border: `1px solid ${isSel ? (e.isTag ? "#2a2a5a" : "#2a5a2a") : "transparent"}`
          }}>
          {e.isTag ? <span style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#8888ff", flexShrink: 0 }}>#</span> : <AImg url={u} size={18} />}
          <span style={{ fontSize: 11, fontFamily: "monospace", color: isSel ? (e.isTag ? "#8888ff" : "#5acc5a") : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{e.label}</span>
          <span style={{ fontSize: 9, color: C.faint, whiteSpace: "nowrap" }}>{e.sub}</span>
        </div>;
      })}
      {!filt.length && <div style={{ padding: "9px", color: C.faint, fontSize: 11 }}>no results</div>}
    </div>
  </div>;
}
