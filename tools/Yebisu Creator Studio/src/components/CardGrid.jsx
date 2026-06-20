import { useState } from "react";
import { AImg } from "./ui.jsx";
import { C } from "../theme.js";

export default function CardGrid({ entries, onDelete, onOpen, emptyLabel, renderCard }) {
  const [hov, setHov] = useState(null);
  return <div style={{ flex: 1, padding: "20px 20px 90px", overflowY: "auto", position: "relative" }}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
      {entries.map(e => { const isH = hov === e.id; return <div key={e.id} onClick={() => onOpen(e)} onMouseEnter={() => setHov(e.id)} onMouseLeave={() => setHov(null)}
        style={{ width: 200, height: 267, background: C.card, border: `1px solid ${isH ? "#3a3a3a" : "#1e1e1e"}`, borderRadius: C.r, cursor: "pointer", display: "flex", flexDirection: "column", flexShrink: 0, position: "relative" }}>
        {isH && <div onClick={ev => { ev.stopPropagation(); onDelete(e.id); }} style={{ position: "absolute", top: -5, right: -5, width: 13, height: 13, borderRadius: "50%", background: "#ff5f57", cursor: "pointer", zIndex: 5 }} />}
        {renderCard ? renderCard(e) : <>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {e.previewDataUrl ? <AImg url={e.previewDataUrl} size={180} anim={e.isAnimated} frames={e.frames || 1} ticks={e.ticksPerFrame || 4} /> : <div />}
          </div>
          <div style={{ padding: "6px 10px 8px", background: C.card }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.displayName || e.id}</div>
            <div style={{ fontWeight: 200, fontSize: 11, color: C.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{e.id}</div>
          </div>
        </>}
      </div>; })}
    </div>
    {!entries.length && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: C.faint, fontSize: 12 }}>{emptyLabel}</div>}
  </div>;
}
