import React, { useState, useRef, useContext, useMemo } from "react";
import { FormCtx } from "../context.js";
import { AImg, Lbl } from "../components/ui.jsx";
import { C, SI } from "../theme.js";

export default function TexturePickerPanel({textures,fkey="textureId",label="Texture"}){
  const{form,F}=useContext(FormCtx);
  const[srch,setSrch]=useState("");const fRef=useRef();
  const filt=useMemo(()=>{const q=srch.toLowerCase();return textures.filter(t=>!q||t.label.toLowerCase().includes(q)||t.id.toLowerCase().includes(q));},[textures,srch]);
  const sel=form[fkey];
  const onFile=e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{
      F(fkey,"__direct__"+ev.target.result+"__name__"+f.name);
      if(fkey==="textureId" || fkey==="frontUrl" || fkey==="sideUrl" || fkey==="topUrl" || fkey==="bottomUrl"){
        let base=f.name.replace(/\.[^/.]+$/,"").toLowerCase().replace(/[^a-z0-9_]/g,"_");
        if(base)F("id",base);
      }
    };
    r.readAsDataURL(f);
  };
  return<div style={{flex:1,padding:"12px 14px",overflowY:"auto",display:"flex",flexDirection:"column",gap:9}}>
    <Lbl>{label}</Lbl>
    <input value={srch} onChange={e=>setSrch(e.target.value)} style={{...SI.inp,fontSize:11}}/>
    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
      <div onClick={()=>fRef.current.click()} style={{width:90,height:100,background:C.card,border:`1px dashed ${C.inpB}`,borderRadius:C.r,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:4,flexShrink:0}}>
        <span style={{fontSize:20,color:C.dim}}>+</span>
        <span style={{fontSize:10,color:C.dim}}>from PC</span>
      </div>
      <input ref={fRef} type="file" accept="image/png" style={{display:"none"}} onChange={onFile}/>
      {sel&&<div onClick={()=>F(fkey,"")} style={{width:90,height:100,background:C.card,border:`1px solid #3a1a1a`,borderRadius:C.r,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:4,flexShrink:0}}>
        <span style={{fontSize:16,color:"#cc6a6a"}}>✕</span>
        <span style={{fontSize:10,color:"#cc6a6a"}}>clear</span>
      </div>}
      {filt.map(t=><div key={t.id} onClick={()=>F(fkey,t.id)} style={{width:90,height:100,background:sel===t.id?"#1a2438":C.card,border:`1px solid ${sel===t.id?C.accent:"#252525"}`,borderRadius:C.r,display:"flex",flexDirection:"column",cursor:"pointer",overflow:"hidden",flexShrink:0}}>
        <div style={{flex:1,background:C.prev,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}><AImg url={t.dataUrl} size={64} anim={t.isAnimated} frames={t.frames||1} ticks={t.ticksPerFrame||4}/></div>
        <div style={{padding:"0 4px 4px",fontSize:10,color:sel===t.id?C.accent:C.dim,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.label}</div>
      </div>)}
    </div>
  </div>;
}
