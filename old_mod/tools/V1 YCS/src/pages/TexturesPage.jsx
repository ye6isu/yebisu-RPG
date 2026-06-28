import React, { useState, useRef, useCallback, useContext } from "react";
import { FormCtx } from "../context.js";
import { Inp, Lbl, Chk, AImg, Btn, FormActions } from "../components/ui.jsx";
import { C, SI } from "../theme.js";

export const TEX_DEF = { label: "", dataUrl: null, dataFileName: null, shapeUrl: null, shapeFileName: null, emissiveUrl: null, emissiveFileName: null, isSpritesheet: false, isAnimated: false, frames: 4, defaultFrame: 0, ticksPerFrame: 4 };

export function TexProv({ initial, children }) {
  const [form, setForm] = useState(initial ? { ...TEX_DEF, ...initial } : TEX_DEF);
  const F = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);
  return <FormCtx.Provider value={{ form, F }}>{children}</FormCtx.Provider>;
}

function FileField({ label, urlKey, nameKey, form, F, fileRef, loadFn, anim }) {
  const hasFile = !!form[urlKey];
  const fileName = form[nameKey] || null;
  return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <Lbl>{label}</Lbl>
    <div style={{ ...SI.inp, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", cursor: "default", minHeight: 38 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {hasFile
          ? <AImg url={form[urlKey]} size={20} anim={anim && form.isAnimated} frames={anim && form.isSpritesheet ? (form.frames || 1) : 1} ticks={anim ? (form.ticksPerFrame || 4) : 4} defaultFrame={form.defaultFrame ?? 0} />
          : <div style={{ width: 20, height: 20, background: C.prev, borderRadius: 3, border: `1px dashed ${C.inpB}`, flexShrink: 0 }} />}
        <span style={{ fontSize: 13, color: hasFile ? C.text : C.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName || "none selected"}</span>
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 8 }}>
        {hasFile && <Btn sm v="g" onClick={() => fileRef.current.click()}>replace</Btn>}
        {hasFile
          ? <Btn sm v="g" onClick={() => { F(urlKey, null); F(nameKey, null); }}>remove</Btn>
          : <Btn sm v="g" onClick={() => fileRef.current.click()}>set</Btn>}
      </div>
    </div>
    <input ref={fileRef} type="file" accept="image/png" style={{ display: "none" }} onChange={() => loadFn(fileRef, urlKey, nameKey)} />
  </div>;
}

export function TexLeft({ initial, onSave, onCancel }) {
  const { form, F } = useContext(FormCtx);
  const mRef = useRef(), sRef = useRef(), eRef = useRef();
  const load = (ref, key, nameKey) => {
    const f = ref.current.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => {
      F(key, e.target.result);
      F(nameKey, f.name);
      if (key === "dataUrl") {
        let base = f.name.replace(/\.[^/.]+$/, "").toLowerCase().replace(/[^a-z0-9_]/g, "_");
        if (base) F("label", base);
      }
    };
    r.readAsDataURL(f);
  };
  return <div style={{ padding: "20px 20px 100px", display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{initial ? "Edit Texture" : "Add Texture"}</div>
    <Inp label="Texture Name" value={form.label} onChange={v => F("label", v)} />
    <FileField label="Texture File" urlKey="dataUrl" nameKey="dataFileName" form={form} F={F} fileRef={mRef} loadFn={load} anim />
    <FileField label="Shape Texture File" urlKey="shapeUrl" nameKey="shapeFileName" form={form} F={F} fileRef={sRef} loadFn={load} />
    <FileField label="Emissive Texture File" urlKey="emissiveUrl" nameKey="emissiveFileName" form={form} F={F} fileRef={eRef} loadFn={load} />
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Chk label="Spritesheet" checked={!!form.isSpritesheet} onChange={v => { F("isSpritesheet", v); if (!v) F("isAnimated", false); }} />
      {form.isSpritesheet && <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 10, borderLeft: `2px solid ${C.inpB}` }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Inp label="Frames" type="number" value={form.frames} onChange={v => F("frames", parseInt(v) || 1)} style={{ width: 80 }} />
          <Inp label="Default Frame" type="number" value={form.defaultFrame ?? 0} onChange={v => { const n = Math.max(0, Math.min((form.frames || 1) - 1, parseInt(v) || 0)); F("defaultFrame", n); }} style={{ width: 80 }} />
        </div>
        <Chk label="Animated" checked={!!form.isAnimated} onChange={v => F("isAnimated", v)} />
        {form.isAnimated && <div style={{ paddingLeft: 10, borderLeft: `2px solid ${C.inpB}` }}>
          <Inp label="Ticks/frame" type="number" value={form.ticksPerFrame} onChange={v => F("ticksPerFrame", parseInt(v) || 1)} style={{ width: 80 }} />
        </div>}
      </div>}
    </div>
    <FormActions onCancel={onCancel} onSave={() => onSave(form)} saving={false} canSave={!!(form.label.trim() && form.dataUrl)} />
  </div>;
}

export function TexRight() {
  const { form } = useContext(FormCtx);
  return <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 20 }}>
    {form.dataUrl ? <div style={{ width: 220, height: 220, background: C.prev, borderRadius: C.r, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}><AImg url={form.dataUrl} size={180} anim={form.isAnimated} frames={form.isSpritesheet ? (form.frames || 1) : 1} ticks={form.ticksPerFrame || 4} defaultFrame={form.defaultFrame ?? 0} /></div> : <div style={{ width: 200, height: 200, background: C.prev, borderRadius: C.r, display: "flex", alignItems: "center", justifyContent: "center", color: C.faint, fontSize: 12 }}>preview</div>}
    {form.label && <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{form.label}</div>}
    {form.isSpritesheet && form.frames > 1 && <div style={{ fontSize: 11, color: C.dim }}>{form.frames} frames{form.isAnimated ? ` · ${form.ticksPerFrame} ticks/f` : ""}</div>}
  </div>;
}
