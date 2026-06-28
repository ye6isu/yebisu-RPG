import { useState, useRef, useMemo } from "react";
import { AImg, Lbl, Btn } from "./ui.jsx";
import { C, SI } from "../theme.js";

function TexDropdown({ textures, value, srch, setSrch, filt, onSelect, onClose, fRef }) {
  const onFile = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => onSelect("__direct__" + ev.target.result + "__name__" + f.name); r.readAsDataURL(f); };
  return <>
    <div style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, zIndex: 400, background: "#1c1c1c", border: `1px solid ${C.pb}`, borderRadius: 4, boxShadow: "0 8px 30px rgba(0,0,0,.8)", maxHeight: 240, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "4px 6px", borderBottom: `1px solid ${C.inpB}` }}><input autoFocus value={srch} onChange={e => setSrch(e.target.value)} style={{ ...SI.inp, padding: "3px 7px", fontSize: 12 }} /></div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        <div onClick={() => { onSelect(""); onClose(); }} style={{ padding: "6px 9px", cursor: "pointer", color: C.faint, fontSize: 12, borderBottom: "1px solid #181818" }}>(none)</div>
        {filt.map(t => <div key={t.id} onClick={() => { onSelect(t.id); onClose(); setSrch(""); }} style={{ padding: "4px 7px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, background: value === t.id ? "#1a2438" : "transparent", borderBottom: "1px solid #181818" }}>
          <AImg url={t.dataUrl} size={20} anim={t.isAnimated} frames={t.frames || 1} ticks={t.ticksPerFrame || 4} />
          <div><div style={{ fontSize: 12, color: C.text }}>{t.label}{t.isAnimated && <span style={{ color: C.accent, marginLeft: 4, fontSize: 10 }}>[{t.frames}f]</span>}</div><div style={{ fontSize: 10, color: C.dim }}>{t.id}</div></div>
        </div>)}
        {!filt.length && <div style={{ padding: "9px", color: C.faint, fontSize: 12 }}>no results</div>}
      </div>
      <div onClick={() => { onClose(); fRef.current.click(); }} style={{ padding: "6px 9px", borderTop: `1px solid ${C.inpB}`, cursor: "pointer", color: C.dim, fontSize: 12 }}>from PC…</div>
    </div>
    <input ref={fRef} type="file" accept="image/png" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => onSelect("__direct__" + ev.target.result + "__name__" + f.name); r.readAsDataURL(f); }} />
  </>;
}

export default function TexSel({ label, textures, value, onChange }) {
  const [srch, setSrch] = useState(""); const [open, setOpen] = useState(false); const fRef = useRef();
  const sel = textures.find(t => t.id === value);
  const filt = useMemo(() => { const q = srch.toLowerCase(); return textures.filter(t => !q || t.label.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)); }, [textures, srch]);
  const dUrl = (value || "").startsWith("__direct__") ? value.split("__name__")[0].replace("__direct__", "") : null;
  const onFile = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => onChange("__direct__" + ev.target.result + "__name__" + f.name); r.readAsDataURL(f); };
  return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {label && <Lbl>{label}</Lbl>}
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <AImg url={sel?.dataUrl || dUrl} size={30} anim={sel?.isAnimated} frames={sel?.frames || 1} ticks={sel?.ticksPerFrame || 4} />
      <div style={{ flex: 1, position: "relative" }}>
        <div onClick={() => setOpen(v => !v)} style={{ ...SI.inp, display: "flex", justifyContent: "space-between", cursor: "pointer", padding: "6px 9px" }}>
          <span style={{ color: sel ? C.text : C.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sel ? sel.label : dUrl ? "(direct)" : "(none)"}</span>
          <span style={{ color: C.dim, flexShrink: 0 }}>▾</span>
        </div>
        {open && <div style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, zIndex: 400, background: "#1c1c1c", border: `1px solid ${C.pb}`, borderRadius: 4, boxShadow: "0 8px 30px rgba(0,0,0,.8)", maxHeight: 240, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "4px 6px", borderBottom: `1px solid ${C.inpB}` }}><input autoFocus value={srch} onChange={e => setSrch(e.target.value)} style={{ ...SI.inp, padding: "3px 7px", fontSize: 12 }} /></div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            <div onClick={() => { onChange(""); setOpen(false); }} style={{ padding: "6px 9px", cursor: "pointer", color: C.faint, fontSize: 12, borderBottom: "1px solid #181818" }}>(none)</div>
            {filt.map(t => <div key={t.id} onClick={() => { onChange(t.id); setOpen(false); setSrch(""); }} style={{ padding: "4px 7px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, background: value === t.id ? "#1a2438" : "transparent", borderBottom: "1px solid #181818" }}>
              <AImg url={t.dataUrl} size={20} anim={t.isAnimated} frames={t.frames || 1} ticks={t.ticksPerFrame || 4} />
              <div><div style={{ fontSize: 12, color: C.text }}>{t.label}{t.isAnimated && <span style={{ color: C.accent, marginLeft: 4, fontSize: 10 }}>[{t.frames}f]</span>}</div><div style={{ fontSize: 10, color: C.dim }}>{t.id}</div></div>
            </div>)}
            {!filt.length && <div style={{ padding: "9px", color: C.faint, fontSize: 12 }}>no results</div>}
          </div>
          <div onClick={() => { setOpen(false); fRef.current.click(); }} style={{ padding: "6px 9px", borderTop: `1px solid ${C.inpB}`, cursor: "pointer", color: C.dim, fontSize: 12 }}>from PC…</div>
        </div>}
      </div>
      <input ref={fRef} type="file" accept="image/png" style={{ display: "none" }} onChange={onFile} />
    </div>
  </div>;
}

export function VariantTexRow({ textures, value, onChange, label }) {
  const t = textures.find(x => x.id === value);
  const dUrl = (value || "").startsWith("__direct__") ? value.split("__name__")[0].replace("__direct__", "") : null;
  const hasVal = !!(t || dUrl);
  const [open, setOpen] = useState(false); const [srch, setSrch] = useState(""); const fRef = useRef();
  const filt = useMemo(() => { const q = srch.toLowerCase(); return textures.filter(x => !q || x.label.toLowerCase().includes(q) || x.id.toLowerCase().includes(q)); }, [textures, srch]);
  const onFile = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => onChange("__direct__" + ev.target.result + "__name__" + f.name); r.readAsDataURL(f); };
  return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {label && <Lbl>{label}</Lbl>}
    <div style={{ position: "relative" }}>
      <div style={{ ...SI.inp, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", cursor: "default" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {hasVal ? <AImg url={t?.dataUrl || dUrl} size={20} /> : <div style={{ width: 20, height: 20, background: C.prev, borderRadius: 3, border: `1px dashed ${C.inpB}`, flexShrink: 0 }} />}
          <span style={{ fontSize: 13, color: hasVal ? C.text : C.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t ? t.label : dUrl ? "(direct)" : "none selected"}</span>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 8 }}>
          {hasVal && <Btn sm v="g" onClick={() => onChange("")}>remove</Btn>}
          <Btn sm v="g" onClick={() => setOpen(v => !v)}>{hasVal ? "replace" : "set"}</Btn>
        </div>
      </div>
      {open && <div style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, zIndex: 400, background: "#1c1c1c", border: `1px solid ${C.pb}`, borderRadius: 4, boxShadow: "0 8px 30px rgba(0,0,0,.8)", maxHeight: 240, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "4px 6px", borderBottom: `1px solid ${C.inpB}` }}><input autoFocus value={srch} onChange={e => setSrch(e.target.value)} style={{ ...SI.inp, padding: "3px 7px", fontSize: 12 }} /></div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          <div onClick={() => { onChange(""); setOpen(false); }} style={{ padding: "6px 9px", cursor: "pointer", color: C.faint, fontSize: 12, borderBottom: "1px solid #181818" }}>(none)</div>
          {filt.map(x => <div key={x.id} onClick={() => { onChange(x.id); setOpen(false); setSrch(""); }} style={{ padding: "4px 7px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, background: value === x.id ? "#1a2438" : "transparent", borderBottom: "1px solid #181818" }}>
            <AImg url={x.dataUrl} size={20} />
            <div><div style={{ fontSize: 12, color: C.text }}>{x.label}</div><div style={{ fontSize: 10, color: C.dim }}>{x.id}</div></div>
          </div>)}
          {!filt.length && <div style={{ padding: "9px", color: C.faint, fontSize: 12 }}>no results</div>}
        </div>
        <div onClick={() => { setOpen(false); fRef.current.click(); }} style={{ padding: "6px 9px", borderTop: `1px solid ${C.inpB}`, cursor: "pointer", color: C.dim, fontSize: 12 }}>from PC…</div>
      </div>}
    </div>
    <input ref={fRef} type="file" accept="image/png" style={{ display: "none" }} onChange={onFile} />
  </div>;
}
