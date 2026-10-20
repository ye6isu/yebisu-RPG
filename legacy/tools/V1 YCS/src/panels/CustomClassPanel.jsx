import React, { useState, useEffect, useContext } from "react";
import { FormCtx } from "../context.js";
import { Lbl } from "../components/ui.jsx";
import { api } from "../api.js";
import { idToClassName } from "../codegen/items.js";
import { C } from "../theme.js";

export default function CustomClassPanel(){
  const{form}=useContext(FormCtx);
  const[code,setCode]=useState("// loading…");
  const cls=form.customItemClass||idToClassName(form.id||"item");
  useEffect(()=>{
    if(!cls)return;
    api("/items/custom-class/read",{className:cls}).then(j=>{
      if(j.ok)setCode(j.code);
      else setCode(`// ${j.reason||"not found"}`);
    }).catch(()=>setCode("// error reading file"));
  },[cls]);
  return<div style={{flex:1,padding:14,overflow:"hidden",display:"flex",flexDirection:"column",gap:8}}>
    <Lbl>{cls}.java</Lbl>
    <pre style={{flex:1,background:"#0a0a0c",border:`1px solid ${C.inpB}`,borderRadius:4,padding:"10px 12px",fontSize:11,lineHeight:1.7,color:"#a8a8a0",whiteSpace:"pre",overflowY:"auto",overflowX:"auto"}}>{code}</pre>
  </div>;
}
