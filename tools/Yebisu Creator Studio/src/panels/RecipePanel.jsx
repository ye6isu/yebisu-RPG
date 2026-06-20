import React, { useState, useContext, useMemo } from "react";
import { FormCtx } from "../context.js";
import { Chk, Inp, Sel, Lbl, AImg } from "../components/ui.jsx";
import { MODID, SMELT_TYPES, TAG_GROUPS } from "../constants.js";
import { useVanillaItems } from "../api.js";
import IngredientPicker from "../components/IngredientPicker.jsx";
import { C, SI } from "../theme.js";

export function CraftingPanel({modItems=[],modBlocks=[],textures=[]}){
  const{form,F}=useContext(FormCtx);
  const[sel,setSel]=useState("");
  const[srch,setSrch]=useState("");
  const vanillaItems=useVanillaItems();
  const recipe=form.recipe||{type:"shaped",pattern:["   ","   ","   "],keys:{},result:1};
  const setR=upd=>F("recipe",{...recipe,...upd});
  const cells=Array.from({length:9},(_,i)=>{const row=Math.floor(i/3),col=i%3,ch=recipe.pattern[row][col];return ch===" "?null:recipe.keys[ch]||null;});
  const setCell=(i,item)=>{const row=Math.floor(i/3),col=i%3;const pat=recipe.pattern.map(r=>[...r]);const keys={...recipe.keys};if(!item||item==="minecraft:air"){pat[row][col]=" ";const used=new Set(pat.flat().filter(c=>c!==" "));for(const k of Object.keys(keys))if(!used.has(k))delete keys[k];}else{const ex=Object.entries(keys).find(([,v])=>v===item)?.[0];const used=new Set(pat.flat().filter(c=>c!==" "));let ch=ex;if(!ch){ch="ABCDEFGHIJKLMNOPQRSTUVWXYZ#@$%&".split("").find(c=>!used.has(c))||"?";keys[ch]=item;}pat[row][col]=ch;}setR({pattern:pat.map(r=>r.join("")),keys});};
  const itemFor=ref=>{if(!ref||ref.startsWith("#"))return null;if(ref.startsWith(`${MODID}:`)){const id=ref.slice(MODID.length+1);return modItems.find(x=>x.id===id)||modBlocks.find(x=>x.id===id)||null;}return vanillaItems.find(x=>x.id===ref)||null;};
  const dN=item=>{if(!item)return"";if(item.startsWith("#"))return TAG_GROUPS.find(g=>`#${g.tag}`===item)?.label||item;const it=itemFor(item);return it?.displayName||item.split(":")[1]||item;};
  const dis=!form.hasRecipe;
  return<div style={{display:"flex",flexDirection:"column",gap:10,opacity:dis?0.35:1,pointerEvents:dis?"none":"auto"}}>
    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:4}}>
        <input value={srch} onChange={e=>setSrch(e.target.value)} style={{...SI.inp,fontSize:11}}/>
        <IngredientPicker value={sel} onChange={setSel} modItems={modItems} modBlocks={modBlocks} vanillaItems={vanillaItems} textures={textures} filter={srch}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,52px)",gap:3}}>
          {cells.map((item,i)=>{
            const e=!item||item==="minecraft:air";const iT=item&&item.startsWith("#");
            const it=itemFor(item);const u=it?(textures.find(tx=>tx.id===it.textureId)?.dataUrl||it.textureDataUrl):null;
            return<div key={i} title={item?dN(item):""} onClick={()=>{if(sel)setCell(i,sel);}} onDragOver={ev=>ev.preventDefault()} onDrop={ev=>{ev.preventDefault();setCell(i,ev.dataTransfer.getData("item"));}} style={{width:52,height:52,background:e?"#141414":iT?"#1a1a2e":"#192a19",border:`1px solid ${e?C.inpB:iT?"#2a2a5a":"#2a5a2a"}`,borderRadius:3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:sel?"crosshair":"default",position:"relative",overflow:"hidden",gap:2}}>
              {!e&&<>
                {iT?<span style={{fontSize:14,color:"#8888ff"}}>#</span>:<AImg url={u} size={28}/>}
                <div style={{fontSize:8,color:iT?"#8888ff":"#aaa",textAlign:"center",padding:"0 2px",lineHeight:1.1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>{dN(item)}</div>
                <span onClick={ev=>{ev.stopPropagation();setCell(i,null);}} style={{position:"absolute",top:1,right:2,fontSize:8,cursor:"pointer",color:"#cc6a6a"}}>✕</span>
              </>}
              {e&&<span style={{color:"#222",fontSize:18}}>+</span>}
            </div>;})}
        </div>
        {sel&&<div style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:"#5acc5a"}}><span>placing →</span>{itemFor(sel)&&<AImg url={textures.find(tx=>tx.id===itemFor(sel).textureId)?.dataUrl||itemFor(sel).textureDataUrl} size={14}/>}<span>{dN(sel)}</span></div>}
        <div style={{display:"flex",gap:4,alignItems:"center"}}><Sel label="" value={recipe.type||"shaped"} onChange={v=>setR({type:v})} options={["shaped","shapeless"]}/><Inp label="" value={recipe.result||1} onChange={v=>setR({result:parseInt(v)||1})} type="number" style={{width:56}}/></div>
      </div>
    </div>
  </div>;
}

export function SmeltingSection({modItems=[],modBlocks=[],textures=[]}){
  const{form,F}=useContext(FormCtx);
  const vanillaItems=useVanillaItems();
  const recipes=form.smeltingRecipes||[];
  const isFood=!!form.isFood;
  const available=isFood?SMELT_TYPES.filter(t=>t.key!=="blasting"):SMELT_TYPES;
  const has=key=>recipes.some(r=>r.type===key);
  const get=key=>recipes.find(r=>r.type===key)||{type:key,ingredient:"",experience:isFood?0.1:0.7,cookingTime:SMELT_TYPES.find(t=>t.key===key)?.defTime||200};
  const toggle=key=>{if(has(key))F("smeltingRecipes",recipes.filter(r=>r.type!==key));else F("smeltingRecipes",[...recipes,get(key)]);};
  const upd=(key,field,val)=>{F("smeltingRecipes",recipes.map(r=>r.type===key?{...r,[field]:val}:r));};
  const[pickFor,setPickFor]=useState(null);
  const[sel,setSel]=useState("");
  return<div style={{display:"flex",flexDirection:"column",gap:6}}>
    {available.map(t=>{const on=has(t.key),sr=get(t.key);
      return<div key={t.key} style={{display:"flex",flexDirection:"column",gap:4}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Chk label={t.label} checked={on} onChange={()=>toggle(t.key)}/>
          {on&&<>
            <div style={{display:"flex",alignItems:"center",gap:4,flex:1,minWidth:0}}>
              <div onClick={()=>{if(pickFor===t.key){setPickFor(null);setSel("");}else{setPickFor(t.key);setSel(sr.ingredient||"");}}} style={{...SI.inp,padding:"4px 8px",fontSize:11,cursor:"pointer",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:sr.ingredient?C.text:C.faint,border:`1px solid ${pickFor===t.key?C.accent:C.inpB}`}}>{sr.ingredient||"input"}</div>
              <input type="number" value={sr.cookingTime} onChange={e=>upd(t.key,"cookingTime",e.target.value)} style={{...SI.inp,width:56,padding:"4px 6px",fontSize:11,textAlign:"center"}}/>
              <input type="number" value={sr.experience} onChange={e=>upd(t.key,"experience",e.target.value)} style={{...SI.inp,width:56,padding:"4px 6px",fontSize:11,textAlign:"center"}}/>
            </div>
          </>}
        </div>
        {on&&pickFor===t.key&&<div style={{maxHeight:180,overflow:"hidden",marginLeft:20}}>
          <IngredientPicker value={sel} onChange={v=>{setSel(v);upd(t.key,"ingredient",v);}} modItems={modItems} modBlocks={modBlocks} vanillaItems={vanillaItems} textures={textures}/>
        </div>}
      </div>;})}
  </div>;
}

export default function RecipePanelWrapper({modItems,modBlocks,textures}){
  const{form,F}=useContext(FormCtx);
  return<div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
    <div style={{flex:1,padding:"14px",overflowY:"auto",display:"flex",flexDirection:"column",gap:12}}>
      <Chk label="Crafting" checked={!!form.hasRecipe} onChange={v=>F("hasRecipe",v)}/>
      {form.hasRecipe&&<CraftingPanel modItems={modItems} modBlocks={modBlocks} textures={textures}/>}
      <div style={{borderTop:`1px solid ${C.inpB}`,paddingTop:10}}>
        <SmeltingSection modItems={modItems} modBlocks={modBlocks} textures={textures}/>
      </div>
    </div>
  </div>;
}
