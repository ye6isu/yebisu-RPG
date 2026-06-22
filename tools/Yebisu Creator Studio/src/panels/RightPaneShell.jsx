import React, { useState, useRef, useContext } from "react";
import { C, SI } from "../theme.js";
import { Lbl, Btn, Sel, Pill, AImg } from "../components/ui.jsx";
import { ITEM_METHODS } from "../codegen/visual/methods.js";
import { ycsToggleMethod } from "../codegen/ycs.js";
import { idToClassName } from "../codegen/items.js";
import { api } from "../api.js";
import { VisualEditorPanel } from "../components/VisualEditor.jsx";
import TexturePickerPanel from "./TexturePickerPanel.jsx";
import TagsPanel from "./TagsPanel.jsx";
import TooltipPanel from "./TooltipPanel.jsx";
import RecipePanelWrapper from "./RecipePanel.jsx";
import VariantsPanel from "./VariantsPanel.jsx";
import DataComponentsPanel from "./DataComponentsPanel.jsx";

export function MethodListPanel({form,F,onEnterEditor,className}){
  const[busyKey,setBusyKey]=useState(null);
  const enabled=form.enabledMethods||[];

  const toggle=async(key,checked)=>{
    setBusyKey(key);
    await api("/items/custom-class",{className});
    const j=await api("/items/custom-class/read",{className});
    if(j.ok){
      const updated=ycsToggleMethod(j.code,key,checked);
      await api("/items/custom-class/write",{className,code:updated});
    }
    const next=checked?[...enabled,key]:enabled.filter(k=>k!==key);
    F("enabledMethods",next);
    if(!checked){const mb={...(form.methodBlocks||{})};delete mb[key];F("methodBlocks",mb);}
    if(key==="continuousUse"&&!checked){F("hasUseAnimation",false);F("useAnimation","NONE");}
    setBusyKey(null);
  };

  return<div style={{padding:"14px",display:"flex",flexDirection:"column",gap:7}}>
    <Lbl>Methods</Lbl>
    {ITEM_METHODS.filter(m=>!m.hidden).map(m=>{
      const isOn=enabled.includes(m.key);
      const busy=busyKey===m.key;
      const hasBlocks=((form.methodBlocks||{})[m.key]||[]).length>0;
      const isCont=m.key==="continuousUse";
      const useOn=enabled.includes("use");
      const disabled=isCont&&!useOn;
      const visuallyOn=isOn&&!disabled;
      return<div key={m.key} style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"9px 11px",borderRadius:5,
        background:C.inp,
        border:`1px solid ${C.inpB}`,
        borderRadius:4,
        opacity:busy||disabled?0.6:1,transition:"all .15s",filter:disabled?"grayscale(1)":""}}>
        <div style={{display:"flex",alignItems:"center",gap:9,minWidth:0}}>
          <div onClick={()=>!busy&&!disabled&&toggle(m.key,!isOn)} style={{
            width:14,height:14,border:`1px solid ${visuallyOn?C.accent:C.inpB}`,borderRadius:3,
            background:visuallyOn?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",
            cursor:busy||disabled?"not-allowed":"pointer",flexShrink:0}}>
            {visuallyOn&&<svg width="8" height="7" viewBox="0 0 8 7"><path d="M1 3.5l2 2 4-4" stroke="#04060c" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
          </div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:13,color:C.text,fontWeight:500,display:"flex",alignItems:"center",gap:5}}>
              {m.label}
              {disabled&&<span style={{fontSize:10,color:"#e8a868",background:"#3a2010",padding:"1px 5px",borderRadius:3}}>requires Interaction</span>}
            </div>
            <div style={{fontSize:11,color:C.faint,fontFamily:"monospace",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:210}}>{m.sig}</div>
          </div>
        </div>
        {visuallyOn&&m.key!=="continuousUse"&&<Btn sm v="p" onClick={()=>onEnterEditor(m.key)} style={{marginLeft:8,flexShrink:0}}>Edit</Btn>}
        {visuallyOn&&m.key==="continuousUse"&&<div style={{display:"flex",gap:4,marginLeft:8,flexShrink:0,alignItems:"center"}}>
          <div style={{fontSize:10,color:C.faint,marginRight:4}}>Anim:</div>
          <Sel value={form.useAnimation||"NONE"} onChange={v=>{F("useAnimation",v);if(v!=="NONE"){F("hasUseAnimation",true);}else{F("hasUseAnimation",false);}}} options={[{value:"NONE",label:"None"},{value:"EAT",label:"Eat"},{value:"DRINK",label:"Drink"},{value:"BLOCK",label:"Block"},{value:"BOW",label:"Bow"},{value:"SPEAR",label:"Spear"},{value:"CROSSBOW",label:"Crossbow"},{value:"SPYGLASS",label:"Spyglass"},{value:"TOOT_HORN",label:"Horn"},{value:"BRUSH",label:"Brush"}]} style={{height:24,fontSize:11,marginRight:4,padding:"0 6px"}}/>
          <label style={{fontSize:10,color:C.faint,display:"flex",alignItems:"center",gap:4,cursor:"pointer",marginRight:4}}>
            <input type="checkbox" checked={form.tags?.includes("yebisurpg:no_use_slowdown")||false} onChange={e=>{
              const v = e.target.checked;
              const next = v ? [...(form.tags||[]), "yebisurpg:no_use_slowdown"] : (form.tags||[]).filter(t=>t!=="yebisurpg:no_use_slowdown");
              F("tags", next);
            }} style={{margin:0,cursor:"pointer"}}/> No Slowdown
          </label>
          <Btn sm v="p" onClick={()=>onEnterEditor("continuousUse")}>onUseTick</Btn>
          <Btn sm v="p" onClick={()=>onEnterEditor("releaseUsing")}>releaseUsing</Btn>
        </div>}
      </div>;
    })}
  </div>;
}

function JsonFileField({label,jsonKey,nameKey,form,F,accept}){
  const ref=useRef();
  const hasFile=!!form[jsonKey];
  const fileName=form[nameKey]||null;
  const load=()=>{
    const f=ref.current.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=e=>{
      try{const parsed=JSON.parse(e.target.result);F(jsonKey,parsed);F(nameKey,f.name);}
      catch(err){F(jsonKey,null);F(nameKey,null);}
    };
    r.readAsText(f);
    ref.current.value="";
  };
  return<div style={{display:"flex",flexDirection:"column",gap:6}}>
    <Lbl>{label}</Lbl>
    <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default",minHeight:38}}>
      <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
        <div style={{width:20,height:20,background:hasFile?"#1a2a1a":C.prev,borderRadius:3,border:`1px ${hasFile?"solid":"dashed"} ${C.inpB}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:hasFile?"#6a8":"#555"}}>{hasFile?"{ }":""}</div>
        <span style={{fontSize:13,color:hasFile?C.text:C.faint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fileName||"none selected"}</span>
      </div>
      <div style={{display:"flex",gap:4,flexShrink:0,marginLeft:8}}>
        {hasFile&&<Btn sm v="g" onClick={()=>ref.current.click()}>replace</Btn>}
        {hasFile
          ?<Btn sm v="g" onClick={()=>{F(jsonKey,null);F(nameKey,null);}}>remove</Btn>
          :<Btn sm v="g" onClick={()=>ref.current.click()}>set</Btn>}
      </div>
    </div>
    <input ref={ref} type="file" accept={accept||".json"} style={{display:"none"}} onChange={load}/>
  </div>;
}

function GeoModelPanel({form,F,stateIndex}){
  const si=stateIndex!=null?stateIndex:null;
  const stForm=si!=null&&form.states?form.states[si]||{}:form;
  const stF=si!=null?(k,v)=>{
    F(`_stateField_${si}_${k}`,v);
  }:F;
  return<div style={{padding:"14px",display:"flex",flexDirection:"column",gap:14}}>
    <Lbl>{si!=null?`State ${si+1} — 3D Model Files`:"3D Model Files"}</Lbl>
    <JsonFileField label="Geometry File (.geo.json)" jsonKey="geoModelJson" nameKey="geoModelFileName" form={stForm} F={stF} accept=".json,.geo.json"/>
    <JsonFileField label="Item Model File (.item.json)" jsonKey="itemModelJson" nameKey="itemModelFileName" form={stForm} F={stF} accept=".json,.item.json"/>
  </div>;
}

export default function RightPaneShell({modItems=[],modBlocks=[],textures=[],isBlock=false,activePanel,setActivePanel,highlightFaceKey,rightView,setRightView,itemForm,itemF}){
  const faceLabel=highlightFaceKey?highlightFaceKey.replace(/^texture/,"").replace(/Id$/,"")+" face":"Texture";
  if(!activePanel){
    return<div style={{display:"flex",height:"100%",alignItems:"center",justifyContent:"center",color:C.faint,fontSize:12,flexDirection:"column",gap:8}}>
      <span style={{fontSize:28,color:"#252525"}}>→</span>
      <span>use edit or set on the left</span>
    </div>;
  }
  return<div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
    <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      {activePanel==="customclass"&&(
        rightView?.mode==="visualEditor"
          ?<VisualEditorPanel
              methodKey={rightView.editingMethod}
              form={itemForm}
              F={itemF}
              className={itemForm?.customItemClass||idToClassName(itemForm?.id||"item")}
              onBack={()=>setRightView({mode:"methodList",editingMethod:null})}/>
          :<MethodListPanel
              form={itemForm}
              F={itemF}
              className={itemForm?.customItemClass||idToClassName(itemForm?.id||"item")}
              onEnterEditor={key=>setRightView({mode:"visualEditor",editingMethod:key})}/>
      )}
      {activePanel==="texture"&&<TexturePickerPanel textures={textures} fkey={highlightFaceKey||"textureId"} label={faceLabel}/>}
      {activePanel==="texture-inv"&&<TexturePickerPanel textures={textures} fkey="modelTextureInvId" label="Inventory Texture"/>}
      {activePanel==="texture-3d"&&<TexturePickerPanel textures={textures} fkey="modelTexture3dId" label="3D Model Texture"/>}
      {activePanel==="3dmodel"&&<GeoModelPanel form={itemForm} F={itemF}/>}
      {activePanel?.startsWith("texture_s")&&<TexturePickerPanel textures={textures} fkey={`stateTexId_${activePanel.replace("texture_s","")}`} label={`State ${parseInt(activePanel.replace("texture_s",""))+1} Texture`}/>}
      {activePanel?.startsWith("texture-3d_s")&&<TexturePickerPanel textures={textures} fkey={`state3dTexId_${activePanel.replace("texture-3d_s","")}`} label={`State ${parseInt(activePanel.replace("texture-3d_s",""))+1} 3D Texture`}/>}
      {activePanel?.startsWith("3dmodel_s")&&<GeoModelPanel form={itemForm} F={itemF} stateIndex={parseInt(activePanel.replace("3dmodel_s",""))}/>}
      {activePanel==="tags"&&<TagsPanel/>}
      {activePanel==="tooltip"&&<TooltipPanel/>}
      {activePanel==="recipe"&&<RecipePanelWrapper modItems={modItems} modBlocks={modBlocks} textures={textures}/>}
      {activePanel==="variants"&&<VariantsPanel textures={textures}/>}
      {activePanel==="datacomponents"&&<DataComponentsPanel/>}
    </div>
  </div>;
}
