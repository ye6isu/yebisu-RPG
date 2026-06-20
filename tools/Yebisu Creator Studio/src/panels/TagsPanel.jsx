import React, { useState, useContext } from "react";
import { FormCtx } from "../context.js";
import { Lbl, Pill, Btn } from "../components/ui.jsx";
import { COMMON_TAGS } from "../constants.js";
import { C, SI } from "../theme.js";

export default function TagsPanel(){
  const{form,F}=useContext(FormCtx);
  const[srch,setSrch]=useState("");
  const tags=form.tags||[];
  const toggle=t=>{
    if(tags.includes(t)) F("tags",tags.filter(x=>x!==t));
    else F("tags",[...tags,t]);
  };
  const q=srch.toLowerCase().trim();
  const allTags=Array.from(new Set([...COMMON_TAGS,...tags]));
  const visTags=allTags.filter(t=>!q||t.toLowerCase().includes(q));
  const isCustom=q&&!allTags.some(t=>t.toLowerCase()===q);
  const addCustom=()=>{if(q&&isCustom){toggle(q);setSrch("");}};
  return<div style={{padding:"14px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:8}}>
    <div style={{border:`1px solid ${C.inpB}`,borderRadius:4,padding:"8px 10px",background:"#141414",minHeight:32,display:"flex",flexWrap:"wrap",gap:3,alignItems:"center"}}>
      {tags.length?tags.map(t=><Pill key={t} onClick={()=>toggle(t)} color="#192a19"><span style={{color:"#5acc5a",fontSize:10,fontFamily:"monospace"}}>{t} ✕</span></Pill>):<span style={{color:C.faint,fontSize:11}}>no tags enabled</span>}
    </div>
    <div style={{display:"flex",gap:6}}>
      <input value={srch} onChange={e=>setSrch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addCustom();}} style={{...SI.inp,fontSize:11,flex:1}}/>
      {isCustom&&<Btn sm v="p" onClick={addCustom}>add</Btn>}
    </div>
    <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:4}}>{visTags.map(t=><div key={t} onClick={()=>toggle(t)} style={{fontSize:10,fontFamily:"monospace",padding:"2px 5px",borderRadius:3,cursor:"pointer",background:tags.includes(t)?"#192a19":"#141414",color:tags.includes(t)?"#5acc5a":C.dim,border:`1px solid ${tags.includes(t)?"#2a5a2a":"#1a1a1a"}`}}>{t}{tags.includes(t)&&<span style={{marginLeft:3,opacity:.6}}>✕</span>}</div>)}</div>
  </div>;
}
