import React, { useState, useRef, useCallback, useEffect, useMemo, useContext } from "react";
import { FormCtx } from "../context.js";
import { Lbl, Btn, Inp, Sel, Chk, Sbar, Pill, AImg, IdField, ConstField, FormActions } from "../components/ui.jsx";
import { C, SI } from "../theme.js";
import { MODID, BASE } from "../constants.js";
import { api } from "../api.js";
import { EFFECT_METHODS } from "../codegen/visual/methods.js";
import { ycsToggleEffectMethod } from "../codegen/ycs.js";
import { VisualEditorPanel } from "../components/VisualEditor.jsx";
import TexturePickerPanel from "../panels/TexturePickerPanel.jsx";

const EFFECT_SENTINEL="new";
const EFFECT_CATEGORIES=[{value:"BENEFICIAL",label:"Beneficial"},{value:"HARMFUL",label:"Harmful"},{value:"NEUTRAL",label:"Neutral"}];

function effectClassName(eid){
  return eid.split('_').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join('')+'Effect';
}

export const EFFECT_DEF={id:"",constName:"",customConstName:false,titleText:"",category:"BENEFICIAL",color:0,hasTexture:false,textureId:"",enabledMethods:[],methodBlocks:{}};

function autoConstName(id){return id.toUpperCase();}

export function EffectProv({initial,formOverride,onFormChange,children}){const[form,setForm]=useState(formOverride||(initial?{...EFFECT_DEF,...initial}:EFFECT_DEF));const F=useCallback((k,v)=>setForm(f=>{const nf={...f,[k]:v};onFormChange&&onFormChange(nf);return nf;}),[onFormChange]);return<FormCtx.Provider value={{form,F}}>{children}</FormCtx.Provider>;}

export function useEffects(){
  const[effects,setEffects]=useState([]);
  const reload=useCallback(()=>{fetch(`${BASE}/effects/list`).then(r=>r.json()).then(j=>{if(j.ok)setEffects(j.effects||[]);}).catch(()=>{});},[]);
  useEffect(()=>{reload();},[reload]);
  return{effects,reload};
}

function EffectLeft({textures,initial,isEdit,onSave,onCancel,onDelete,effects,reload,activePanel,setActivePanel,showCons,consoleH,hideActions}){
  const{form,F}=useContext(FormCtx);
  const[saving,setSaving]=useState(false);const[status,setStatus]=useState([]);
  const idErr=form.id&&!/^[a-z][a-z0-9_]*$/.test(form.id)?"lowercase letters, digits, underscores only":null;
  const cnErr=form.constName&&!/^[A-Z][A-Z0-9_]*$/.test(form.constName)?"UPPER_SNAKE_CASE only":null;
  const CN=form.customConstName?form.constName:autoConstName(form.id);
  const canSave=form.id&&CN&&!idErr&&!cnErr&&form.category;
  const texId=(form.textureId||"").startsWith("__direct__")?null:form.textureId;
  const selTex=texId?(textures||[]).find(t=>t.id===texId):null;
  const dUrl=(form.textureId||"").startsWith("__direct__")?form.textureId.split("__name__")[0].replace("__direct__",""):null;
  const enabled=form.enabledMethods||[];

  const save=async()=>{
    if(!canSave)return;setSaving(true);setStatus([]);const msgs=[];
    if(form.hasTexture||form.textureId){
      if(dUrl){
        const j=await api("/texture",{filename:`${form.id}.png`,dataUrl:dUrl,folder:"mob_effect"});
        msgs.push({ok:j.ok,label:"texture",msg:j.ok?"ok":j.reason});
      } else if(selTex?.dataUrl){
        const j=await api("/texture",{filename:`${form.id}.png`,dataUrl:selTex.dataUrl,folder:"mob_effect"});
        msgs.push({ok:j.ok,label:"texture",msg:j.ok?"ok":j.reason});
        if(selTex.isAnimated){
          const jm=await api("/texture/mcmeta",{filename:`${form.id}.png`,frametime:selTex.ticksPerFrame||4,folder:"mob_effect"});
          msgs.push({ok:jm.ok,label:"mcmeta",msg:jm.ok?"ok":jm.reason});
        }
      }
    }
    const v={id:form.id,constName:CN,titleText:form.titleText,category:form.category,color:parseInt(form.color)||0,
      hasTexture:!!(form.textureId),textureId:form.textureId||undefined,
      textureAnimated:!!selTex?.isAnimated,textureFrametime:selTex?.ticksPerFrame||4,
      enabledMethods:form.enabledMethods||[],methodBlocks:form.methodBlocks||{}};
    const exists=effects.some(x=>x.id===v.id);
    const next=exists?effects.map(x=>x.id===v.id?v:x):[...effects,v];
    const r=await api("/effects/save",{effects:next});
    msgs.push({ok:r.ok,label:"effects",msg:r.ok?"ok":r.reason});
    if(r.ok)reload();
    setStatus(msgs);setSaving(false);
    if(msgs.every(m=>m.ok))onSave({...v,savedAt:Date.now()},initial?.id);
  };

  return<div style={{padding:"20px 20px 100px",display:"flex",flexDirection:"column",gap:13}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:14,fontWeight:500}}>{isEdit?"Edit Effect":"New Effect"}</span></div>
    <Inp label="Display Name" value={form.titleText} onChange={v=>{F("titleText",v);if(!isEdit&&!form.id){const auto=v.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");F("id",auto);F("constName",auto.toUpperCase());}}}/>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:4}}><Lbl>ID</Lbl>{idErr&&<span style={{fontSize:11,color:"#ff7777"}}>{idErr}</span>}</div><Chk label="Custom const" checked={!!form.customConstName} onChange={v=>F("customConstName",v)}/></div>
      <input value={form.id} onChange={e=>{const v=e.target.value;F("id",v);if(!form.customConstName)F("constName",autoConstName(v));}} style={{...SI.inp}}/>
    </div>
    {form.customConstName&&<div style={{display:"flex",flexDirection:"column",gap:4}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><Lbl>Const Name</Lbl>{cnErr&&<span style={{fontSize:11,color:"#ff7777"}}>{cnErr}</span>}</div>
      <input value={form.constName} onChange={e=>F("constName",e.target.value)} style={{...SI.inp}}/>
    </div>}
    <Sel label="Category" value={form.category} onChange={v=>F("category",v)} options={EFFECT_CATEGORIES}/>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <Lbl>Color</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
          <div style={{width:20,height:20,borderRadius:3,border:"1px solid #333",background:`#${(parseInt(form.color)||0).toString(16).padStart(6,"0")}`,flexShrink:0}}/>
          <span style={{fontSize:13,color:C.text,fontFamily:"monospace"}}>#{(parseInt(form.color)||0).toString(16).padStart(6,"0")}</span>
        </div>
        <Btn sm v={activePanel==="color"?"p":"g"} onClick={()=>setActivePanel(p=>p==="color"?null:"color")} style={{marginLeft:8,flexShrink:0}}>set</Btn>
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <Lbl>Texture</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
          {(selTex||dUrl)
            ?<AImg url={selTex?.dataUrl||dUrl} size={20} anim={selTex?.isAnimated} frames={selTex?.frames||1} ticks={selTex?.ticksPerFrame||4}/>
            :<div style={{width:20,height:20,background:C.prev,borderRadius:3,border:`1px dashed ${C.inpB}`,flexShrink:0}}/>}
          <span style={{fontSize:13,color:selTex||dUrl?C.text:C.faint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selTex?selTex.label:dUrl?"(direct)":"none selected"}</span>
        </div>
        <Btn sm v={activePanel==="texture"?"p":"g"} onClick={()=>setActivePanel(p=>p==="texture"?null:"texture")} style={{marginLeft:8,flexShrink:0}}>{(selTex||dUrl)?"edit":"set"}</Btn>
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <Lbl>Methods{enabled.length>0&&<span style={{color:C.accent,marginLeft:5}}>{enabled.length}</span>}</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
        <span style={{fontSize:13,color:enabled.length?C.text:C.faint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{enabled.length?enabled.map(k=>EFFECT_METHODS.find(m=>m.key===k)?.label||k).join(", "):"none added"}</span>
        <Btn sm v={activePanel==="methods"?"p":"g"} onClick={()=>setActivePanel(p=>p==="methods"?null:"methods")} dis={!form.id} style={{marginLeft:8,flexShrink:0}}>{enabled.length?"edit":"set"}</Btn>
      </div>
    </div>
    <Sbar messages={status}/>
    {!hideActions&&<FormActions onCancel={onCancel} onSave={save} saving={saving} canSave={!!canSave} showCons={showCons} consoleH={consoleH} onDelete={isEdit?()=>onDelete(initial.id):undefined}/>}
  </div>;
}

function EffectColorPanel(){
  const{form,F}=useContext(FormCtx);
  const hex=(parseInt(form.color)||0).toString(16).padStart(6,"0");
  const rv=parseInt(hex.slice(0,2),16),gv=parseInt(hex.slice(2,4),16),bv=parseInt(hex.slice(4,6),16);
  const canvasRef=useRef(null);
  const hueRef=useRef(null);
  const[hue,setHue]=useState(()=>{const[h]=rgbToHsl(rv,gv,bv);return h;});
  const dragging=useRef(false);
  const hueDragging=useRef(false);
  function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;if(mx===mn)return[0,0,l];const d=mx-mn,s=l>0.5?d/(2-mx-mn):d/(mx+mn);let h=0;if(mx===r)h=((g-b)/d+(g<b?6:0))/6;else if(mx===g)h=((b-r)/d+2)/6;else h=((r-g)/d+4)/6;return[h,s,l];}
  function hslToRgb(h,s,l){if(s===0)return[Math.round(l*255),Math.round(l*255),Math.round(l*255)];const hue2rgb=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};const q=l<0.5?l*(1+s):l+s-l*s,p=2*l-q;return[Math.round(hue2rgb(p,q,h+1/3)*255),Math.round(hue2rgb(p,q,h)*255),Math.round(hue2rgb(p,q,h-1/3)*255)];}
  const drawSV=useCallback(()=>{const cv=canvasRef.current;if(!cv)return;const ctx=cv.getContext("2d"),w=cv.width,h=cv.height;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const s=x/w,v=1-y/h;const[r,g,b]=hslToRgb(hue,s,v*0.5+s*v*0.5);ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fillRect(x,y,1,1);}
  },[hue]);
  useEffect(()=>{drawSV();},[drawSV]);
  const pickFromCanvas=(e)=>{const cv=canvasRef.current;if(!cv)return;const rect=cv.getBoundingClientRect();const x=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));const y=Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height));const s=x,v=1-y;const[r,g,b]=hslToRgb(hue,s,v*0.5+s*v*0.5);F("color",(r<<16)|(g<<8)|b);};
  const pickHue=(e)=>{const el=hueRef.current;if(!el)return;const rect=el.getBoundingClientRect();const h=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));setHue(h);const[r,g,b]=hslToRgb(h,1,0.5);F("color",(r<<16)|(g<<8)|b);};
  useEffect(()=>{
    const mu=()=>{dragging.current=false;hueDragging.current=false;};
    const mm=(e)=>{if(dragging.current)pickFromCanvas(e);if(hueDragging.current)pickHue(e);};
    window.addEventListener("mouseup",mu);window.addEventListener("mousemove",mm);
    return()=>{window.removeEventListener("mouseup",mu);window.removeEventListener("mousemove",mm);};
  });
  return<div style={{padding:"20px",display:"flex",flexDirection:"column",gap:14,flex:1}}>
    <Lbl>Effect Color</Lbl>
    <canvas ref={canvasRef} width={200} height={150} style={{width:"100%",height:150,borderRadius:6,border:`1px solid ${C.inpB}`,cursor:"crosshair",imageRendering:"pixelated"}} onMouseDown={e=>{dragging.current=true;pickFromCanvas(e);}}/>
    <div ref={hueRef} style={{width:"100%",height:18,borderRadius:4,border:`1px solid ${C.inpB}`,cursor:"crosshair",background:"linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)"}} onMouseDown={e=>{hueDragging.current=true;pickHue(e);}}/>
    <div style={{width:"100%",height:32,borderRadius:6,border:`1px solid ${C.inpB}`,background:`#${hex}`,boxShadow:`0 0 16px rgba(${rv},${gv},${bv},0.25)`}}/>
    <div style={{display:"flex",alignItems:"center",gap:4}}>
      <input value={hex} onChange={e=>{const v=e.target.value.replace(/[^0-9a-fA-F]/g,"").slice(0,6);F("color",parseInt(v||"0",16));const[h]=rgbToHsl(...[0,2,4].map(i=>parseInt(v.slice(i,i+2)||"0",16)));setHue(h);}} style={{...SI.inp,flex:1,fontFamily:"monospace",fontSize:13,textAlign:"center",letterSpacing:1}} maxLength={6}/>
      <input type="number" min={0} max={255} value={rv} onChange={e=>{const nr=Math.max(0,Math.min(255,parseInt(e.target.value)||0));F("color",(nr<<16)|(gv<<8)|bv);const[h]=rgbToHsl(nr,gv,bv);setHue(h);}} style={{...SI.inp,width:46,fontFamily:"monospace",fontSize:12,textAlign:"center",flexShrink:0}}/>
      <input type="number" min={0} max={255} value={gv} onChange={e=>{const ng=Math.max(0,Math.min(255,parseInt(e.target.value)||0));F("color",(rv<<16)|(ng<<8)|bv);const[h]=rgbToHsl(rv,ng,bv);setHue(h);}} style={{...SI.inp,width:46,fontFamily:"monospace",fontSize:12,textAlign:"center",flexShrink:0}}/>
      <input type="number" min={0} max={255} value={bv} onChange={e=>{const nb=Math.max(0,Math.min(255,parseInt(e.target.value)||0));F("color",(rv<<16)|(gv<<8)|nb);const[h]=rgbToHsl(rv,gv,nb);setHue(h);}} style={{...SI.inp,width:46,fontFamily:"monospace",fontSize:12,textAlign:"center",flexShrink:0}}/>
    </div>
  </div>;
}

function EffectMethodListPanel({onEnterEditor}){
  const{form,F}=useContext(FormCtx);
  const[busyKey,setBusyKey]=useState(null);
  const enabled=form.enabledMethods||[];
  const toggle=async(key,checked)=>{
    if(!form.id)return;
    setBusyKey(key);
    const cls=effectClassName(form.id);
    await api("/effects/custom-class",{className:cls});
    const j=await api("/effects/custom-class/read",{className:cls});
    if(j.ok){
      const updated=ycsToggleEffectMethod(j.code,key,checked);
      await api("/effects/custom-class/write",{className:cls,code:updated});
    }
    const next=checked?[...enabled,key]:enabled.filter(k=>k!==key);
    F("enabledMethods",next);
    if(!checked){const mb={...(form.methodBlocks||{})};delete mb[key];F("methodBlocks",mb);}
    setBusyKey(null);
  };
  return<div style={{padding:"14px",display:"flex",flexDirection:"column",gap:7}}>
    <Lbl>Effect Methods</Lbl>
    {EFFECT_METHODS.map(m=>{
      const isOn=enabled.includes(m.key);
      const busy=busyKey===m.key;
      const hasBlocks=((form.methodBlocks||{})[m.key]||[]).length>0;
      return<div key={m.key} style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"9px 11px",borderRadius:5,
        background:isOn?"#1a2438":C.card,
        border:`1px solid ${isOn?"#2a3f5a":C.inpB}`,
        opacity:busy?0.6:1,transition:"all .15s"}}>
        <div style={{display:"flex",alignItems:"center",gap:9,minWidth:0}}>
          <div onClick={()=>!busy&&form.id&&toggle(m.key,!isOn)} style={{
            width:14,height:14,border:`1px solid ${isOn?C.accent:C.inpB}`,borderRadius:3,
            background:isOn?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",
            cursor:busy||!form.id?"not-allowed":"pointer",flexShrink:0}}>
            {isOn&&<svg width="8" height="7" viewBox="0 0 8 7"><path d="M1 3.5l2 2 4-4" stroke="#04060c" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
          </div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:13,color:isOn?C.text:C.dim,fontWeight:500,display:"flex",alignItems:"center",gap:5}}>
              {m.label}
              {hasBlocks&&<span style={{fontSize:10,color:C.accent,background:"#0e2030",padding:"1px 5px",borderRadius:3}}>● compiled</span>}
            </div>
            <div style={{fontSize:11,color:C.faint,fontFamily:"monospace",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:210}}>{m.sig}</div>
          </div>
        </div>
        {isOn&&<Btn sm v="p" onClick={()=>onEnterEditor(m.key)} style={{marginLeft:8,flexShrink:0}}>Edit</Btn>}
      </div>;
    })}
  </div>;
}

function EffectFullEditor({rightView,setRightView}){
  const{form,F}=useContext(FormCtx);
  return<div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <VisualEditorPanel
      methodKey={rightView.editingMethod}
      form={form}
      F={F}
      className={effectClassName(form.id||"effect")}
      onBack={()=>setRightView({mode:"methodList",editingMethod:null})}
      isEffect/>
  </div>;
}

function EffectRight({textures,activePanel,setActivePanel,rightView,setRightView}){
  const{form,F}=useContext(FormCtx);
  if(!activePanel){
    return<div style={{display:"flex",height:"100%",alignItems:"center",justifyContent:"center",color:C.faint,fontSize:12,flexDirection:"column",gap:8}}>
      <span style={{fontSize:28,color:"#252525"}}>→</span>
      <span>use edit or set on the left</span>
    </div>;
  }
  return<div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
    <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      {activePanel==="methods"&&<EffectMethodListPanel
              onEnterEditor={key=>setRightView({mode:"visualEditor",editingMethod:key})}/>}
      {activePanel==="texture"&&<TexturePickerPanel textures={textures} fkey="textureId" label="Effect Texture"/>}
      {activePanel==="color"&&<EffectColorPanel/>}
    </div>
  </div>;
}

export default function EffectsPage({onEditingChange,newTrigger,editing,setEditing,textures,showCons,consoleH}){
  const{effects,reload}=useEffects();
  const[dragIdx,setDragIdx]=useState(null);
  const[activePanel,setActivePanel]=useState(null);
  const[rightView,setRightView]=useState({mode:"methodList",editingMethod:null});
  useEffect(()=>{onEditingChange&&onEditingChange(!!editing);},[editing,onEditingChange]);
  const prevTrigger=useRef(newTrigger);
  useEffect(()=>{if(newTrigger!==prevTrigger.current){prevTrigger.current=newTrigger;setEditing(EFFECT_SENTINEL);}},[newTrigger]);
  useEffect(()=>{setActivePanel(null);setRightView({mode:"methodList",editingMethod:null});},[editing]);
  const persist=async(list)=>{const r=await api("/effects/save",{effects:list});if(r.ok)reload();return r;};
  const deleteEffect=async(eid)=>{await persist(effects.filter(x=>x.id!==eid));setEditing(null);};
  const moveEffect=async(from,to)=>{if(from===to)return;const arr=[...effects];const[m]=arr.splice(from,1);arr.splice(to,0,m);await persist(arr);};
  const catColor=c=>c==="BENEFICIAL"?"#1e3020":c==="HARMFUL"?"#301e1e":"#1e1e30";
  if(editing){
    const target=editing===EFFECT_SENTINEL?null:editing;
    const inVisualEditor=activePanel==="methods"&&rightView?.mode==="visualEditor";
    return<EffectProv initial={target} onFormChange={()=>{}}>
      {inVisualEditor
        ?<EffectFullEditor rightView={rightView} setRightView={setRightView}/>
        :<div style={{display:"flex",gap:5,flex:1,overflow:"hidden",minHeight:0}}>
          <div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}>
            <div style={{flex:1,overflowY:"auto"}}>
              <EffectLeft textures={textures} initial={target} isEdit={!!target} onSave={()=>setEditing(null)} onCancel={()=>{setEditing(null);setActivePanel(null);setRightView({mode:"methodList",editingMethod:null});}} onDelete={deleteEffect} effects={effects} reload={reload} activePanel={activePanel} setActivePanel={setActivePanel} showCons={showCons} consoleH={consoleH}/>
            </div>
          </div>
          <div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}>
            <EffectRight textures={textures} activePanel={activePanel} setActivePanel={setActivePanel} rightView={rightView} setRightView={setRightView}/>
          </div>
        </div>}
    </EffectProv>;
  }
  return<div style={{flex:1,background:C.panel,borderRadius:C.r,overflow:"hidden",padding:"20px 20px 90px",overflowY:"auto"}}>
    <div style={{display:"flex",flexWrap:"wrap",gap:16}}>
      {effects.map((e,idx)=>{const tx=e.hasTexture&&e.textureId&&textures?.find(t=>t.id===e.textureId);const prevUrl=tx?tx.dataUrl:`${BASE}/textures/mob_effect/${e.id}.png`;return<div key={e.id}
        onClick={()=>setEditing(e)}
        style={{width:200,height:267,background:C.card,border:`1px solid ${C.inpB}`,borderRadius:C.r,cursor:"pointer",display:"flex",flexDirection:"column",flexShrink:0,position:"relative"}}
        onMouseEnter={ev=>{const d=ev.currentTarget.querySelector("[data-del]");if(d)d.style.display="flex";ev.currentTarget.style.borderColor="#3a3a3a";}}
        onMouseLeave={ev=>{const d=ev.currentTarget.querySelector("[data-del]");if(d)d.style.display="none";ev.currentTarget.style.borderColor=C.inpB;}}>
        <div data-del onClick={ev=>{ev.stopPropagation();deleteEffect(e.id);}} style={{display:"none",position:"absolute",top:-5,right:-5,width:13,height:13,borderRadius:"50%",background:"#ff5f57",cursor:"pointer",zIndex:5,alignItems:"center",justifyContent:"center"}}/>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
          {e.hasTexture?<AImg url={prevUrl} size={180} anim={tx?.isAnimated} frames={tx?.frames||1} ticks={tx?.ticksPerFrame||4}/>:<div/>}
        </div>
        <div style={{padding:"6px 10px 8px",background:C.card}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontWeight:500,fontSize:13,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1,minWidth:0}}>{e.titleText||e.id}</span>
            <div style={{width:14,height:14,borderRadius:3,border:"1px solid #333",background:`#${(e.color||0).toString(16).padStart(6,"0")}`,flexShrink:0,marginLeft:6}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:4}}>
            <span style={{fontWeight:200,fontSize:11,color:C.dim,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1,minWidth:0}}>{e.id}</span>
            <Pill color={catColor(e.category)}>{(e.category||"NEUTRAL").toLowerCase()}</Pill>
          </div>
        </div>
      </div>;})}
    </div>
    {!effects.length&&<div style={{color:C.faint,fontSize:12,padding:"8px 2px"}}>No effects yet.</div>}
  </div>;
}
