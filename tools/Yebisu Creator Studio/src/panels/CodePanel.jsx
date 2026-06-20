import React, { useContext } from "react";
import { FormCtx } from "../context.js";
import { CopyB } from "../components/ui.jsx";
import { gItemCode, gRecipe, gTagCode } from "../codegen/items.js";
import { gBlockEntries } from "../codegen/blocks.js";

export default function CodePanel({textures,isBlock=false}){
  const{form}=useContext(FormCtx);
  if(isBlock){const entries=gBlockEntries(form,textures);return<div style={{padding:"14px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:8}}>{entries.map((e,i)=><CopyB key={i} title={e.constName} code={e.line}/>)}{gTagCode(form.id,form,true).map((t,i)=><CopyB key={"t"+i} title="tag" code={t}/>)}{gRecipe(form.id,form,true)&&<CopyB title="recipe" code={gRecipe(form.id,form,true)}/>}</div>;}
  const c=gItemCode(form,textures);
  return<div style={{padding:"14px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:8}}><CopyB title="ModItems" code={c.reg}/>{c.fpReg&&<CopyB title="ModFoodProperties" code={c.fpReg}/>}<CopyB title="lang" code={`  "${c.langKey}": "${c.langVal}",`}/><CopyB title="model" code={`        ${c.modelLine}`}/>{gTagCode(form.id,form).map((t,i)=><CopyB key={i} title="tag" code={t}/>)}{gRecipe(form.id,form)&&<CopyB title="recipe" code={gRecipe(form.id,form)}/>}</div>;
}
