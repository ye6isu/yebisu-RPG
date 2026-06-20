import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { ErrorBoundary, Lbl, Btn, Inp, Sel, Chk, Pill, Dot, AImg, Sbar } from './ui.jsx';
import { C, SI } from '../theme.js';
import { MODID, BASE, VANILLA_EFFECTS } from '../constants.js';
import { api } from '../api.js';
import { compileChain, varTypeToLink, LINK_ENTITY, LINK_NUMBER, LINK_LOGIC, LINK_TEXT, LINK_ITERATOR } from '../codegen/visual/compiler.js';
import { PALETTE_BLOCKS, buildPalette, VANILLA_ATTRIBUTES, PEHKUI_SCALES } from '../codegen/visual/palette.js';
import { ITEM_METHODS, EFFECT_METHODS } from '../codegen/visual/methods.js';
import { ycsInjectCompiledBody, ycsToggleMethod, ycsToggleEffectMethod, ycsSyncImports, ycsEffectSyncImports, ycsGetEnabledMethods, ycsInjectMethod, ycsRemoveMethod } from '../codegen/ycs.js';
import { useVariables } from '../pages/VariablesPage.jsx';
import { useAttributes } from '../pages/AttributesPage.jsx';
import { useEffects } from '../pages/EffectsPage.jsx';

let __modAttributesCache = [];
let __modEffectsCache = [];
let __variablesCache = [];

function AttrDropdown({nodeId,value,onChange}){
  const allAttrs=[...VANILLA_ATTRIBUTES,...PEHKUI_SCALES,...__modAttributesCache.map(a=>({id:a.id,label:(a.titleText||a.id)+" (mod)"}))];
  const[open,setOpen]=useState(false);
  const[query,setQuery]=useState("");
  const[rect,setRect]=useState(null);
  const anchorRef=useRef(null);
  const inputRef=useRef(null);
  const selected=allAttrs.find(a=>a.id===(value||""))||allAttrs[0];
  const filtered=query.trim()===""?allAttrs:allAttrs.filter(a=>a.label.toLowerCase().includes(query.toLowerCase())||a.id.toLowerCase().includes(query.toLowerCase()));
  const pick=(id)=>{onChange(id);setOpen(false);setQuery("");};
  const openDropdown=(e)=>{
    e.stopPropagation();
    if(!open){
      const r=anchorRef.current?.getBoundingClientRect();
      if(r)setRect(r);
      setTimeout(()=>inputRef.current&&inputRef.current.focus(),0);
    }
    setOpen(o=>!o);
  };
  useEffect(()=>{
    if(!open)return;
    const close=()=>setOpen(false);
    document.addEventListener("mousedown",close);
    return()=>document.removeEventListener("mousedown",close);
  },[open]);
  const list=open&&rect?ReactDOM.createPortal(
    <div onWheel={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()}
      style={{position:"fixed",top:rect.bottom+2,left:rect.left,zIndex:99999,background:"#1e1e1e",border:"1px solid #3a3a3c",borderRadius:4,minWidth:Math.max(200,rect.width),maxHeight:220,display:"flex",flexDirection:"column",boxShadow:"0 4px 16px rgba(0,0,0,0.8)"}}>
      <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
        style={{background:"#111",border:"none",borderBottom:"1px solid #333",color:"#fff",fontSize:12,fontFamily:"monospace",padding:"5px 8px",outline:"none"}}/>
      <div style={{overflowY:"auto",maxHeight:180}}>
        {filtered.map(a=><div key={a.id} onMouseDown={e=>{e.stopPropagation();pick(a.id);}}
          style={{padding:"5px 10px",fontSize:12,color:a.id===(value||"")?C.accent:"#ddd",cursor:"pointer",whiteSpace:"nowrap",background:a.id===(value||"")?"#2a2a2a":"transparent"}}
          onMouseEnter={e=>e.currentTarget.style.background="#2a2a2a"} onMouseLeave={e=>e.currentTarget.style.background=a.id===(value||"")?"#2a2a2a":"transparent"}>
          {a.label}
        </div>)}
        {filtered.length===0&&<div style={{padding:"5px 10px",color:"#666",fontSize:12}}>No results</div>}
      </div>
    </div>,
    document.body
  ):null;
  return<div ref={anchorRef} style={{position:"relative",display:"inline-block"}} onMouseDown={e=>e.stopPropagation()}>
    <div onClick={openDropdown}
      style={{height:30,background:"rgba(0,0,0,0.3)",border:"none",color:"#fff",fontSize:12,fontFamily:"sans-serif",fontWeight:700,cursor:"pointer",padding:"0 22px 0 6px",display:"flex",alignItems:"center",minWidth:100,maxWidth:160,overflow:"hidden",whiteSpace:"nowrap",userSelect:"none",position:"relative"}}>
      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selected?.label||"—"}</span>
      <span style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",fontSize:9,color:"#aaa"}}>▾</span>
    </div>
    {list}
  </div>;
}
const VANILLA_EFFECT_LABELS={"MobEffects.MOVEMENT_SPEED":"Speed","MobEffects.MOVEMENT_SLOWDOWN":"Slowness","MobEffects.DIG_SPEED":"Haste","MobEffects.DIG_SLOWDOWN":"Mining Fatigue","MobEffects.DAMAGE_BOOST":"Strength","MobEffects.HEAL":"Instant Health","MobEffects.HARM":"Instant Damage","MobEffects.DAMAGE_RESISTANCE":"Resistance","MobEffects.JUMP":"Jump Boost","MobEffects.CONFUSION":"Nausea","MobEffects.REGENERATION":"Regeneration","MobEffects.FIRE_RESISTANCE":"Fire Resistance","MobEffects.WATER_BREATHING":"Water Breathing","MobEffects.INVISIBILITY":"Invisibility","MobEffects.BLINDNESS":"Blindness","MobEffects.NIGHT_VISION":"Night Vision","MobEffects.HUNGER":"Hunger","MobEffects.WEAKNESS":"Weakness","MobEffects.POISON":"Poison","MobEffects.WITHER":"Wither","MobEffects.HEALTH_BOOST":"Health Boost","MobEffects.ABSORPTION":"Absorption","MobEffects.SATURATION":"Saturation","MobEffects.GLOWING":"Glowing","MobEffects.LEVITATION":"Levitation","MobEffects.LUCK":"Luck","MobEffects.UNLUCK":"Bad Luck","MobEffects.SLOW_FALLING":"Slow Falling","MobEffects.CONDUIT_POWER":"Conduit Power","MobEffects.DOLPHINS_GRACE":"Dolphin's Grace","MobEffects.BAD_OMEN":"Bad Omen","MobEffects.HERO_OF_THE_VILLAGE":"Hero of the Village","MobEffects.DARKNESS":"Darkness","MobEffects.TRIAL_OMEN":"Trial Omen","MobEffects.RAID_OMEN":"Raid Omen","MobEffects.WIND_CHARGED":"Wind Charged","MobEffects.WEAVING":"Weaving","MobEffects.OOZING":"Oozing","MobEffects.INFESTED":"Infested"};
function EffectDropdown({nodeId,value,onChange}){
  const allEffects=[...VANILLA_EFFECTS.map(e=>({id:e,label:VANILLA_EFFECT_LABELS[e]||e})),...__modEffectsCache.map(e=>({id:`ModEffects.${e.constName}`,label:(e.titleText||e.id)+" (mod)"}))];
  const[open,setOpen]=useState(false);
  const[query,setQuery]=useState("");
  const[rect,setRect]=useState(null);
  const anchorRef=useRef(null);
  const inputRef=useRef(null);
  const selected=allEffects.find(a=>a.id===(value||""))||allEffects[0];
  const filtered=query.trim()===""?allEffects:allEffects.filter(a=>a.label.toLowerCase().includes(query.toLowerCase())||a.id.toLowerCase().includes(query.toLowerCase()));
  const pick=(id)=>{onChange(id);setOpen(false);setQuery("");};
  const openDropdown=(e)=>{
    e.stopPropagation();
    if(!open){
      const r=anchorRef.current?.getBoundingClientRect();
      if(r)setRect(r);
      setTimeout(()=>inputRef.current&&inputRef.current.focus(),0);
    }
    setOpen(o=>!o);
  };
  useEffect(()=>{
    if(!open)return;
    const close=()=>setOpen(false);
    document.addEventListener("mousedown",close);
    return()=>document.removeEventListener("mousedown",close);
  },[open]);
  const list=open&&rect?ReactDOM.createPortal(
    <div onWheel={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()}
      style={{position:"fixed",top:rect.bottom+2,left:rect.left,zIndex:99999,background:"#1e1e1e",border:"1px solid #3a3a3c",borderRadius:4,minWidth:Math.max(200,rect.width),maxHeight:220,display:"flex",flexDirection:"column",boxShadow:"0 4px 16px rgba(0,0,0,0.8)"}}>
      <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
        style={{background:"#111",border:"none",borderBottom:"1px solid #333",color:"#fff",fontSize:12,fontFamily:"monospace",padding:"5px 8px",outline:"none"}}/>
      <div style={{overflowY:"auto",maxHeight:180}} onWheel={e=>e.stopPropagation()}>
        {filtered.map(a=><div key={a.id} onMouseDown={e=>{e.stopPropagation();pick(a.id);}}
          style={{padding:"5px 10px",fontSize:12,color:a.id===(value||"")?C.accent:"#ddd",cursor:"pointer",whiteSpace:"nowrap",background:a.id===(value||"")?"#2a2a2a":"transparent"}}
          onMouseEnter={e=>e.currentTarget.style.background="#2a2a2a"} onMouseLeave={e=>e.currentTarget.style.background=a.id===(value||"")?"#2a2a2a":"transparent"}>
          {a.label}
        </div>)}
        {filtered.length===0&&<div style={{padding:"5px 10px",color:"#666",fontSize:12}}>No results</div>}
      </div>
    </div>,
    document.body
  ):null;
  return<div ref={anchorRef} style={{position:"relative",display:"inline-block"}} onMouseDown={e=>e.stopPropagation()}>
    <div onClick={openDropdown}
      style={{height:30,background:"rgba(0,0,0,0.3)",border:"none",color:"#fff",fontSize:12,fontFamily:"sans-serif",fontWeight:700,cursor:"pointer",padding:"0 22px 0 6px",display:"flex",alignItems:"center",minWidth:100,maxWidth:200,overflow:"hidden",whiteSpace:"nowrap",userSelect:"none",position:"relative"}}>
      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selected?.label||"—"}</span>
      <span style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",fontSize:9,color:"#aaa"}}>▾</span>
    </div>
    {list}
  </div>;
}
function VarDropdown({nodeId,varName,varType,onChange}){
  const usable=(__variablesCache||[]).filter(v=>v.type!=="item");
  const[open,setOpen]=useState(false);
  const[query,setQuery]=useState("");
  const[rect,setRect]=useState(null);
  const anchorRef=useRef(null);
  const inputRef=useRef(null);
  const selected=usable.find(v=>v.name===(varName||""));
  const filtered=query.trim()===""?usable:usable.filter(v=>(v.titleText||v.name).toLowerCase().includes(query.toLowerCase())||v.name.toLowerCase().includes(query.toLowerCase()));
  const pick=(v)=>{onChange(v.name,v.type,v.default);setOpen(false);setQuery("");};
  const openDropdown=(e)=>{
    e.stopPropagation();
    if(!open){const r=anchorRef.current?.getBoundingClientRect();if(r)setRect(r);setTimeout(()=>inputRef.current&&inputRef.current.focus(),0);}
    setOpen(o=>!o);
  };
  useEffect(()=>{
    if(!open)return;
    const close=()=>setOpen(false);
    document.addEventListener("mousedown",close);
    return()=>document.removeEventListener("mousedown",close);
  },[open]);
  const list=open&&rect?ReactDOM.createPortal(
    <div onWheel={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()}
      style={{position:"fixed",top:rect.bottom+2,left:rect.left,zIndex:99999,background:"#1e1e1e",border:"1px solid #3a3a3c",borderRadius:4,minWidth:Math.max(160,rect.width),maxHeight:220,display:"flex",flexDirection:"column",boxShadow:"0 4px 16px rgba(0,0,0,0.8)"}}>
      <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
        style={{background:"#111",border:"none",borderBottom:"1px solid #333",color:"#fff",fontSize:12,fontFamily:"monospace",padding:"5px 8px",outline:"none"}}/>
      <div style={{overflowY:"auto",maxHeight:180}}>
        {filtered.map(v=><div key={v.name} onMouseDown={e=>{e.stopPropagation();pick(v);}}
          style={{padding:"5px 10px",fontSize:12,color:v.name===(varName||"")?C.accent:"#ddd",cursor:"pointer",whiteSpace:"nowrap",background:v.name===(varName||"")?"#2a2a2a":"transparent"}}
          onMouseEnter={e=>e.currentTarget.style.background="#2a2a2a"} onMouseLeave={e=>e.currentTarget.style.background=v.name===(varName||"")?"#2a2a2a":"transparent"}>
          <span style={{color:"#aaa",fontSize:10,marginRight:5}}>[{v.type}]</span>{v.titleText||v.name}
        </div>)}
        {filtered.length===0&&<div style={{padding:"5px 10px",color:"#666",fontSize:12}}>{usable.length===0?"No variables defined":"No results"}</div>}
      </div>
    </div>,
    document.body
  ):null;
  const label=selected?(selected.titleText||selected.name):"pick variable…";
  return<div ref={anchorRef} style={{position:"relative",display:"inline-block"}} onMouseDown={e=>e.stopPropagation()}>
    <div onClick={openDropdown}
      style={{height:30,background:"rgba(0,0,0,0.3)",border:"none",color:selected?"#fff":"#888",fontSize:12,fontFamily:"sans-serif",fontWeight:700,cursor:"pointer",padding:"0 22px 0 6px",display:"flex",alignItems:"center",minWidth:100,maxWidth:160,overflow:"hidden",whiteSpace:"nowrap",userSelect:"none",position:"relative"}}>
      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</span>
      <span style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",fontSize:9,color:"#aaa"}}>▾</span>
    </div>
    {list}
  </div>;
}
function PaletteBlock({b}){
  const bg=b.linkType===LINK_ENTITY?"#18282f":b.linkType===LINK_NUMBER?"#18222a":b.linkType===LINK_TEXT?"#182a1e":b.isAction?"#1a2a20":"transparent";
  const dot=b.linkType===LINK_ENTITY?"#638999":b.linkType===LINK_NUMBER?"#6a8fa8":b.linkType===LINK_TEXT?"#5ba558":"#5a9a6a";
  return<div draggable onDragStart={e=>e.dataTransfer.setData("block",JSON.stringify(b))} title={b.hint}
    style={{display:"flex",alignItems:"center",gap:7,padding:"7px 10px",cursor:"grab",borderBottom:"1px solid #181818",userSelect:"none",background:bg}}>
    <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:dot}}/>
    <span style={{fontSize:12,color:C.text,fontFamily:"monospace"}}>{b.label}</span>
  </div>;
}
function PaletteSidebar({palette}){
  const[collapsed,setCollapsed]=useState({});
  const[subCollapsed,setSubCollapsed]=useState({});
  const toggle=(key)=>setCollapsed(s=>({...s,[key]:!s[key]}));
  const toggleSub=(key)=>setSubCollapsed(s=>({...s,[key]:!s[key]}));
  return<div style={{width:190,borderRight:"1px solid "+C.inpB,overflowY:"auto",flexShrink:0,background:"#111113",userSelect:"none",zIndex:10}}>
    {palette.map(cat=>{
      const isOpen=!collapsed[cat.category];
      const data=cat.data||[];
      const actions=cat.actions||[];
      const dataKey=cat.category+"_data";
      const actKey=cat.category+"_actions";
      const dataOpen=!subCollapsed[dataKey];
      const actOpen=!subCollapsed[actKey];
      return<div key={cat.category}>
        <div onClick={()=>toggle(cat.category)} style={{padding:"6px 10px 4px",background:"#141416",borderBottom:"1px solid "+C.inpB,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <Lbl>{cat.category}</Lbl>
          <span style={{fontSize:10,color:C.faint,fontFamily:"monospace"}}>{isOpen?"▾":"▸"}</span>
        </div>
        {isOpen&&<>
          {data.length>0&&<>
            <div onClick={()=>toggleSub(dataKey)} style={{padding:"4px 14px 4px 28px",background:"#131315",borderBottom:"1px solid #181818",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:10,color:C.dim,fontFamily:"monospace",letterSpacing:0.5}}>DATA</span>
              <span style={{fontSize:9,color:C.faint,fontFamily:"monospace"}}>{dataOpen?"▾":"▸"}</span>
            </div>
            {dataOpen&&data.map(b=><PaletteBlock key={b.opcode} b={b}/>)}
          </>}
          {actions.length>0&&<>
            <div onClick={()=>toggleSub(actKey)} style={{padding:"4px 14px 4px 28px",background:"#131315",borderBottom:"1px solid #181818",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:10,color:C.dim,fontFamily:"monospace",letterSpacing:0.5}}>ACTIONS</span>
              <span style={{fontSize:9,color:C.faint,fontFamily:"monospace"}}>{actOpen?"▾":"▸"}</span>
            </div>
            {actOpen&&actions.map(b=><PaletteBlock key={b.opcode} b={b}/>)}
          </>}
        </>}
      </div>;
    })}
  </div>;
}

function VisualEditorPanel({methodKey,form,F,onBack,className,isEffect}){
  return <ErrorBoundary><VisualEditorPanelInner methodKey={methodKey} form={form} F={F} onBack={onBack} className={className} isEffect={isEffect}/></ErrorBoundary>;
}
function VisualEditorPanelInner({methodKey,form,F,onBack,className,isEffect}){
  const def=ITEM_METHODS.find(m=>m.key===methodKey)||EFFECT_METHODS.find(m=>m.key===methodKey);
  const{variables}=useVariables();
  const{attributes:modAttributes}=useAttributes();
  const{effects:modEffects}=useEffects();
  __modAttributesCache = modAttributes || [];
  __modEffectsCache = modEffects || [];
  __variablesCache = variables || [];
  const palette=useMemo(()=>buildPalette(variables,modAttributes),[variables,modAttributes]);
  const init=()=>{const s=(form.methodBlocks||{})[methodKey];return s?.some(n=>n.id==="start")?s:[
    {id:"start",opcode:"start",x:60,y:60,fields:{},slots:{},nextId:null},
  ];};
  const[nodes,setNodes]=useState(init);
  const[selected,setSelected]=useState(null);
  const selRef=useRef(null);
  useEffect(()=>{selRef.current=selected;},[selected]);
  useEffect(()=>{
    const handleKeyDown = (e) => {
       if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
       if ((e.key === 'Delete' || e.key === 'Backspace') && selected && selected !== "start") {
           del(selected);
           setSelected(null);
       }
       if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selected && selected !== "start") {
           window.__clipboardNodeId = selected;
       }
       if ((e.ctrlKey || e.metaKey) && e.key === 'v' && window.__clipboardNodeId) {
           if (typeof duplicateNode !== "undefined") duplicateNode(window.__clipboardNodeId);
       }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selected, nodes]);
  const[saving,setSaving]=useState(false);
  const[saveStatus,setSaveStatus]=useState(null);
  const[pan,setPan]=useState({x:0,y:0});
  const [zoom,setZoom]=useState(1);
  const canvasRef=useRef();
  const ip=useRef(false),ps=useRef(null),dn=useRef(null);
  useEffect(()=>{F("methodBlocks",{...(form.methodBlocks||{}),[methodKey]:nodes});},[nodes]);
  const recalcLayout = (nodes) => {
    let nextNs = nodes.map(n => ({...n}));
    const roots = nextNs.filter(n => n.id === "start" || (!nextNs.some(p => p.nextId === n.id || (p.slots && Object.values(p.slots).includes(n.id)))));
    function getH(id) {
      if (!id) return 0;
      let cur = id; let h = 0; let loops=0;
      while(cur) {
        if(loops++ > 500) break;
        const n = nextNs.find(x=>x.id===cur);
        if(!n) break;
        if (n.opcode === "control.if") {
           const f = n.fields || {elseIfCount:0, hasElse:false};
           let d0h = Math.max(0, getH(n.slots?.do0));
           let ih = 50 + d0h;
           n.gapHeights = { do0: d0h };
           for (let i=1; i<=f.elseIfCount; i++) {
              let dH = Math.max(0, getH(n.slots?.["do"+i]));
              ih += 50 + dH;
              n.gapHeights['do'+i] = dH;
           }
           if (f.hasElse) {
              let dH = Math.max(0, getH(n.slots?.doElse));
              ih += 50 + dH;
              n.gapHeights.doElse = dH;
           }
           h += ih;
           n.height = ih;
        } else if (n.opcode === "control.delay" || n.opcode.startsWith("aoe.each.")) {
           let d0h = Math.max(0, getH(n.slots?.do0));
           let ih = 50 + d0h;
           n.gapHeights = { do0: d0h };
           h += ih;
           n.height = ih;
        } else {
           h += 50;
        }
        cur = n.nextId;
      }
      return h;
    }
    function layoutChain(startId, sx, sy, depth) {
      let cur = startId;
      let cy = sy;
      while(cur) {
        const n = nextNs.find(x=>x.id===cur);
        if(!n) break;
        n.x = sx; n.y = cy; n.depth = depth;
        if (n.opcode === "control.if") {
           const f = n.fields || {elseIfCount:0, hasElse:false};
           let innerY = cy + 50;
           if (n.slots?.do0) layoutChain(n.slots.do0, sx + 30, innerY, depth + 1);
           innerY += Math.max(0, getH(n.slots?.do0));
           for (let i=1; i<=f.elseIfCount; i++) {
             innerY += 50;
             if (n.slots?.['do'+i]) layoutChain(n.slots['do'+i], sx + 30, innerY, depth + 1);
             innerY += Math.max(0, getH(n.slots?.["do"+i]));
           }
           if (f.hasElse) {
             innerY += 50;
             if (n.slots?.doElse) layoutChain(n.slots.doElse, sx + 30, innerY, depth + 1);
             innerY += Math.max(0, getH(n.slots?.doElse));
           }
           cy = innerY;
        } else if (n.opcode === "control.delay" || n.opcode.startsWith("aoe.each.")) {
           let innerY = cy + 50;
           if (n.slots?.do0) layoutChain(n.slots.do0, sx + 30, innerY, depth + 1);
           innerY += Math.max(0, getH(n.slots?.do0));
           cy = innerY;
        } else {
           cy += 50;
        }
        cur = n.nextId;
      }
    }
    for (const r of roots) if (r.id === "start" || r.isAction) {
        getH(r.id);
        layoutChain(r.id, r.x, r.y, 1);
    }
    return nextNs;
  };
  const upd=fn=>setNodes(prev => recalcLayout(fn(prev)));
  const SLOT_DEFAULTS={entity:{opcode:"entity.event",linkType:LINK_ENTITY,fields:{}},number:{opcode:"number.literal",linkType:LINK_NUMBER,fields:{value:"1"}},text:{opcode:"text.literal",linkType:LINK_TEXT,fields:{value:""}}};
  const add=(bd,x,y)=>{
    const id=bd.opcode+"_"+Date.now();
    const slotDefs=bd.slotDefs||[];
    const slots={};
    const extraNodes=[];
    slotDefs.forEach((sd,i)=>{
      const defKey=sd.accepts===LINK_ENTITY?"entity":sd.accepts===LINK_NUMBER?"number":sd.accepts===LINK_TEXT?"text":null;
      if(defKey&&SLOT_DEFAULTS[defKey]){
        const def=SLOT_DEFAULTS[defKey];
        const childId=def.opcode+"_"+Date.now()+"_"+i;
        slots[sd.key]=childId;
        extraNodes.push({id:childId,opcode:def.opcode,x:x+220,y:y+i*60,nextId:null,linkType:def.linkType,isAction:false,slotDefs:[],fields:{...def.fields},slots:{}});
      }
    });
    const newNode={id,opcode:bd.opcode,x,y,nextId:null,linkType:bd.linkType||null,isAction:bd.isAction||false,slotDefs,
      fields:bd.opcode==="effect.apply"?{effect:"MobEffects.REGENERATION",duration:"200",level:"1"}:bd.opcode==="entity.apply_motion"?{x:"0",y:"0",z:"0",mode:"add"}:bd.opcode==="number.literal"?{value:"1"}:bd.opcode==="number.math"?{op:"+"}:bd.opcode==="text.literal"?{value:""}:bd.opcode==="control.if"?{elseIfCount:0,hasElse:false}:bd.opcode==="control.delay"?{delayTicks:"20",elseIfCount:0,hasElse:false}:bd.opcode.startsWith("aoe.each.")?{elseIfCount:0,hasElse:false,los:true,losOrigin:"caller",showParticles:true}:bd.opcode==="anim.firstperson.play"?{animName:"",filePath:""}:bd.opcode==="anim.handpose.set"?{animName:"",filePath:""}:bd.opcode==="anim.tppose.set"?{animName:"",filePath:""}:{},slots};
    upd(ns=>[...ns,newNode,...extraNodes]);
  };
  const del=id=>{
    if(id==="start")return;
    upd(ns=>{
      const ch=new Set([id, ...getDescendants(id, ns)]);
      return ns.filter(n=>!ch.has(n.id)).map(n=>{
          const nextSlots = {...n.slots};
          for(const k in nextSlots) { if(ch.has(nextSlots[k])) nextSlots[k] = null; }
          return {...n,nextId:ch.has(n.nextId)?null:n.nextId, slots: nextSlots};
      });
    });
  };

  const duplicateNode = (id) => {
      if(id==="start")return;
      upd(ns => {
         const toCopy = new Set([id, ...getDescendants(id, ns)]);
         const oldNodes = ns.filter(n => toCopy.has(n.id));
         const idMap = {};
         oldNodes.forEach(n => {
             idMap[n.id] = n.opcode + "_" + Math.random().toString(36).substr(2,9);
         });
         const newNodes = oldNodes.map(n => {
            const copy = {...n, id: idMap[n.id], x: n.x + (n.id===id ? 20 : 0), y: n.y + (n.id===id ? 20 : 0)};
            if (copy.nextId && idMap[copy.nextId]) copy.nextId = idMap[copy.nextId];
            else copy.nextId = null;
            if (copy.slots) {
                copy.slots = {...copy.slots};
                for(const k in copy.slots) {
                    if (copy.slots[k] && idMap[copy.slots[k]]) copy.slots[k] = idMap[copy.slots[k]];
                    else copy.slots[k] = null;
                }
            }
            return copy;
         });
         return [...ns, ...newNodes];
      });
  };

  const getDescendants = (nId, curNs) => {
    const res = [];
    const cur = curNs.find(x=>x.id===nId);
    if(!cur) return res;
    if(cur.nextId){ res.push(cur.nextId); res.push(...getDescendants(cur.nextId, curNs)); }
    if(cur.slots){ Object.values(cur.slots).forEach(vid=>{ if(vid){ res.push(vid); res.push(...getDescendants(vid, curNs)); } }); }
    return res;
  };

  const handleDragStart = (id, ox, oy, cx, cy) => {
    const r=canvasRef.current?.getBoundingClientRect();
    const stX = (cx - (r?.left||0))/zoom - pan.x - ox/zoom;
    const stY = (cy - (r?.top||0))/zoom - pan.y - oy/zoom;
    dn.current = {id, ox, oy};
    upd(ns => {
      let nextNs = [...ns];
      nextNs = nextNs.map(n=> n.id===id ? {...n, x:stX, y:stY} : n);
      nextNs = nextNs.map(n=> n.nextId===id ? {...n, nextId:null} : n);
      nextNs = nextNs.map(n=>{
        if(!n.slots) return n;
        const newSlots = {...n.slots};
        let changed = false;
        for(const k in newSlots){ if(newSlots[k]===id){ newSlots[k]=null; changed=true; } }
        return changed ? {...n, slots:newSlots} : n;
      });
      const desc = new Set([id, ...getDescendants(id, nextNs)]);
      const topNodes = nextNs.filter(n=>desc.has(n.id));
      const baseNodes = nextNs.filter(n=>!desc.has(n.id));
      return [...baseNodes, ...topNodes];
    });
  };

  const onMD=e=>{if(e.target===canvasRef.current||e.target.classList.contains("canvas-bg")){ip.current=true;ps.current={mx:e.clientX,my:e.clientY,px:pan.x,py:pan.y}; setSelected(null); }};
  const onMM=e=>{
    if(ip.current&&ps.current)setPan({x:ps.current.px+(e.clientX-ps.current.mx)/zoom,y:ps.current.py+(e.clientY-ps.current.my)/zoom});
    if(dn.current){
      const{id,ox,oy}=dn.current;const r=canvasRef.current?.getBoundingClientRect();if(!r)return;
      const nx=(e.clientX-r.left)/zoom-pan.x-ox/zoom,ny=(e.clientY-r.top)/zoom-pan.y-oy/zoom;
      upd(ns=>{
        const node=ns.find(n=>n.id===id);if(!node)return ns;const dx=nx-node.x,dy=ny-node.y;
        const ch=new Set([id, ...getDescendants(id, ns)]);
        return ns.map(n=>ch.has(n.id)?{...n,x:n.x+dx,y:n.y+dy}:n);
      });
    }
  };
  const onMU=e=>{
    ip.current=false;
    if(dn.current){
      const id=dn.current.id;
      dn.current=null;
      upd(ns=>{
        let nextNs=[...ns];
        const dragged=nextNs.find(n=>n.id===id);
        if(!dragged)return nextNs;

        const r=canvasRef.current?.getBoundingClientRect();
        if(!r) return nextNs;

        const mx = (e.clientX - r.left)/zoom - pan.x;
        const my = (e.clientY - r.top)/zoom - pan.y;

        if(dragged.isAction||dragged.opcode==="start"){
          if(dragged.id!=="start"){
             let cst=null,csk=null,md=60;
             for(const n of nextNs){
                 if(n.id===dragged.id || getDescendants(dragged.id, nextNs).includes(n.id)) continue;
                 if(n.isAction||n.id==="start"){
                     let h = 50;
                     if (n.opcode==="control.if" || n.opcode==="control.delay" || n.opcode.startsWith("aoe.each.")) h = n.height || 50;
                     if(n.opcode!=="control.if" && n.opcode!=="control.delay" && !n.opcode.startsWith("aoe.each.")){
                       let snb={x:n.x+20,y:n.y+h};
                       let d=Math.hypot(mx-snb.x,my-snb.y);
                       if(d<md&&!n.nextId){md=d;cst=n.id;csk="nextId";}
                     } else {
                       let curY = 50;
                       const f = n.fields || {elseIfCount:0, hasElse:false};
                       for (let i=0; i<=f.elseIfCount + (f.hasElse?1:0); i++) {
                           let sk = i===0 ? "do0" : i<=f.elseIfCount ? "do"+i : "doElse";
                           let snb = {x: n.x + 45, y: n.y + curY};
                           let d = Math.hypot(mx - snb.x, my - snb.y);
                           if (d < md && !n.slots?.[sk]) { md = d; cst = n.id; csk = sk; }
                           curY += (n.gapHeights?.[sk] || 0) + 50;
                       }
                       let bottomSnb = {x: n.x + 20, y: n.y + n.height};
                       let db = Math.hypot(mx - bottomSnb.x, my - bottomSnb.y);
                       if (db < md && !n.nextId) { md = db; cst = n.id; csk = "nextId"; }
                     }
                 }
             }
             if(cst){
               const parent=nextNs.find(x=>x.id===cst);
               if (csk === "nextId") {
                 const oldChild=parent.nextId;
                 nextNs=nextNs.map(x=>x.id===parent.id?{...x,nextId:dragged.id}:x.id===dragged.id&&oldChild?{...x,nextId:oldChild}:x);
               } else {
                 const oldChild=parent.slots?.[csk];
                 nextNs=nextNs.map(x=>x.id===parent.id?{...x,slots:{...(x.slots||{}), [csk]:dragged.id}}:x.id===dragged.id&&oldChild?{...x,nextId:oldChild}:x);
               }
             }
          }
        }else if(dragged.linkType){
           let best = null;
           let md = 50;
           const smx = e.clientX, smy = e.clientY;
           
           document.querySelectorAll('.slot-conn').forEach(el => {
              if (el.dataset.nodeid === id) return; // skip own slots
              const rect = el.getBoundingClientRect();
              const sx = rect.left + rect.width/2;
              const sy = rect.top + rect.height/2;
              const d = Math.hypot(smx - sx, smy - sy);
              if (d < md) { md = d; best = { nodeId: el.dataset.nodeid, sk: el.dataset.sk }; }
           });
           
           if (best) {
               const { nodeId, sk } = best;
               const parent = nextNs.find(x => x.id === nodeId);
               const isLogicSlot = parent.opcode === "control.if" && sk.startsWith("condition");
               let def = parent?.slotDefs?.find(d => d.key === sk);
               if (!def) {
                   const paletteDef = PALETTE_BLOCKS.flatMap(c => [...(c.data||[]), ...(c.actions||[])]).find(b => b.opcode === parent?.opcode);
                   def = paletteDef?.slotDefs?.find(d => d.key === sk);
               }
               const varSetValueAccepts = (parent?.opcode === "variable.set" && sk === "value") ? varTypeToLink(parent?.fields?.varType || "int") : null;
               if ((varSetValueAccepts && varSetValueAccepts === dragged.linkType) || (def && def.accepts === dragged.linkType) || (isLogicSlot && dragged.linkType === "logic")) {
                   nextNs = nextNs.map(x => x.id === parent.id ? {...x, slots: {...(x.slots||{}), [sk]: dragged.id}} : x);
               }
           }
        }
        return nextNs;
      });
    }
    ps.current=null;
  };
  const onDrop=e=>{
    e.preventDefault();const data=e.dataTransfer.getData("block");if(!data)return;
    const bd=JSON.parse(data);const r=canvasRef.current.getBoundingClientRect();
    add(bd,(e.clientX-r.left)/zoom-pan.x-100,(e.clientY-r.top)/zoom-pan.y-20);
  };
  const save=async()=>{
    setSaving(true);setSaveStatus(null);
    const readEndpoint=isEffect?"/effects/custom-class/read":"/items/custom-class/read";
    const writeEndpoint=isEffect?"/effects/custom-class/write":"/items/custom-class/write";
    const j=await api(readEndpoint,{className});
    if(!j.ok){setSaving(false);setSaveStatus({ok:false,msg:j.reason});return;}
    let c2=j.code;
    const bm="//YCS:"+methodKey+":body",st="//YCS:"+methodKey+":start";
    const methodList=isEffect?EFFECT_METHODS:ITEM_METHODS;
    const syncFn=isEffect?ycsEffectSyncImports:ycsSyncImports;
    const getEnabled=(c)=>ycsGetEnabledMethods(c,methodList);
    if(!c2.includes(bm)&&c2.includes(st)){const d2=methodList.find(m=>m.key===methodKey);if(d2){c2=ycsRemoveMethod(c2,methodKey);c2=ycsInjectMethod(c2,methodKey,methodList);c2=syncFn(c2,getEnabled(c2));}}
    const sn=nodes.find(n=>n.id==="start");
    const bl=sn?.nextId?compileChain(sn.nextId,nodes,methodKey):[];
    const injected=ycsInjectCompiledBody(c2,methodKey,bl);
    const j2=await api(writeEndpoint,{className,code:syncFn(injected,getEnabled(injected))});
    setSaving(false);setSaveStatus({ok:j2.ok,msg:j2.ok?"saved":"error: "+(j2.reason||"?")});
    if(j2.ok)setTimeout(()=>{setSaveStatus(null);onBack();},700);
  };
  const sn=nodes.find(n=>n.id==="start");
  const ch=new Set(sn ? ["start", ...getDescendants("start", nodes)] : []);
  return <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderBottom:"1px solid "+C.inpB,background:C.panel,flexShrink:0}}>
      <Btn sm v="g" onClick={onBack}>Back</Btn>
      <span style={{color:C.accent,fontWeight:500,fontFamily:"monospace",fontSize:13}}>{def?.label}</span>
      <span style={{color:C.faint,fontSize:11,fontFamily:"monospace"}}>{def?.sig}</span>
      <div style={{flex:1}}/>
      {saveStatus&&<span style={{fontSize:11,color:saveStatus.ok?"#5acc5a":"#cc5a5a"}}>{saveStatus.msg}</span>}
      <Btn sm v="p" onClick={save} dis={saving}>{saving?"...":"Save"}</Btn>
    </div>
    <div style={{display:"flex",flex:1,overflow:"hidden"}}>
      <PaletteSidebar palette={palette}/>
      <div ref={canvasRef} className="canvas-bg"
        style={{flex:1,position:"relative",overflow:"hidden",background:"#0d0d0f"}}
        onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
        onDragOver={e=>e.preventDefault()} onDrop={onDrop}
        onWheel={e=>{
            if(!e.ctrlKey){
                const delta = e.deltaY < 0 ? 0.1 : -0.1;
                const r = canvasRef.current.getBoundingClientRect();
                const sx = e.clientX - r.left;
                const sy = e.clientY - r.top;
                const nz = Math.min(Math.max(0.4, zoom + delta), 2);
                if (nz !== zoom) {
                    setZoom(nz);
                    setPan(p => ({
                        x: p.x + sx * (1/nz - 1/zoom),
                        y: p.y + sy * (1/nz - 1/zoom)
                    }));
                }
            }
        }}>
        <div style={{position:"absolute",left:0,top:0,right:0,bottom:0,pointerEvents:"none",
            backgroundImage:"radial-gradient(circle,#1a1a1e 1px,transparent 1px)",
            backgroundSize:`${24*zoom}px ${24*zoom}px`,
            backgroundPosition:`${pan.x*zoom}px ${pan.y*zoom}px`}} className="canvas-bg"/>
        <div className="canvas-bg" style={{transform:`scale(${zoom})`, transformOrigin:"0 0", width:"100%", height:"100%"}}>
        
        <div style={{position:"absolute",left:pan.x,top:pan.y}}>
          
          {nodes.map(node=>{
             let isSlottedVal = false;
             if (node.linkType) {
                 for(const p of nodes){if(p.slots){for(const sk in p.slots){if(p.slots[sk]===node.id)isSlottedVal=true;}}}
             }
             if (isSlottedVal) return null;
             return <CanvasNode key={node.id} node={node} nodes={nodes} methodKey={methodKey} inChain={ch.has(node.id)} selected={selected} onSelect={(id)=>setSelected(id)} onDragStart={handleDragStart}
               onDelete={(nid)=>del(nid)}
               onCopy={typeof duplicateNode!=="undefined"?duplicateNode:null}
               onFieldChange={(nid,f,v)=>upd(ns=>ns.map(n=>n.id===nid?f==="__linkType"?{...n,linkType:v}:{...n,fields:{...n.fields,[f]:v}}:n))}
               onDisconnectChain={(nid)=>upd(ns=>ns.map(n=>n.id===nid?{...n,nextId:null}:n))}
             />;
          })}
        </div>
        </div>
      </div>
    </div>
  </div>;
}

function CanvasNode({node,nodes,methodKey,inChain,onDragStart,onDelete,onFieldChange,onCopy,inline,selected,onSelect}){
  

  const [showSettings, setShowSettings] = useState(false);
  const isSt=node.id==="start",isAct=node.isAction||isSt,isVal=!!node.linkType;
  const isIf=node.opcode==="control.if";
  const isDelay=node.opcode==="control.delay";
  const isAoeEach=node.opcode.startsWith("aoe.each.");
  
  const cc=node.linkType==="entity"?"#30e1b9":node.linkType==="number"?"#4d65b4":node.linkType==="logic"?"#6494a4":node.linkType==="text"?"#5ba558":"#5a9a6a";
  const isAnimBlock = node.opcode.startsWith("anim.") || (node.opcode.startsWith("aoe.") && node.opcode !== "aoe.iterator.entity");
  const isLogicBlock = node.opcode.startsWith("logic.") || node.opcode==="entity.is_crouching" || isIf || isDelay || isAoeEach;
  const bg=isSt?"#1e293b":(!inChain&&isAct)?"#4a4a5a":node.opcode==="effect.apply"?"#c46c94":isAnimBlock?"#3a5c3a":isLogicBlock?"#6494a4":node.linkType==="entity"?"#30e1b9":node.linkType==="number"?"#4d65b4":node.linkType==="text"?"#5ba558":"#5a9a6a";

  const isAnimPlay = node.opcode === "anim.firstperson.play";
  const isAnimStop = node.opcode === "anim.firstperson.stop";
  const isAnimPause = node.opcode === "anim.firstperson.pause";
  const isAnimResume = node.opcode === "anim.firstperson.resume";
  const isAnimTPPlay = node.opcode === "anim.thirdperson.play";
  const isAnimTPStop = node.opcode === "anim.thirdperson.stop";
  const isAnimTPPause = node.opcode === "anim.thirdperson.pause";
  const isAnimTPResume = node.opcode === "anim.thirdperson.resume";
  const isHandPoseSet = node.opcode === "anim.handpose.set";
  const isHandPoseReset = node.opcode === "anim.handpose.reset";
  const isTPPoseSet = node.opcode === "anim.tppose.set";
  const isTPPoseReset = node.opcode === "anim.tppose.reset";
  const isAttrGet = node.opcode === "attribute.get";
  const isAttrModAdd = node.opcode === "attribute.modifier.add";
  const isAttrModRemove = node.opcode === "attribute.modifier.remove";
  const lblStr = node.opcode==="entity.event"?"Event Entity"
       :node.opcode==="entity.target"?"Target Entity"
       :node.opcode==="aoe.iterator.entity"?"Iterator Entity"
       :node.opcode==="number.literal"?null
       :node.opcode==="number.math"?null
       :node.opcode==="text.literal"?null
       :node.opcode==="entity.pos_x"?"Pos X of"
       :node.opcode==="entity.pos_y"?"Pos Y of"
       :node.opcode==="entity.pos_z"?"Pos Z of"
       :node.opcode==="entity.cam_x"?"X at"
       :node.opcode==="entity.cam_y"?"Y at"
       :node.opcode==="entity.cam_z"?"Z at"
       :node.opcode==="vector.normalize_x"?"Normalize X"
       :node.opcode==="vector.normalize_y"?"Normalize Y"
       :node.opcode==="vector.normalize_z"?"Normalize Z"
       :node.opcode==="entity.look_x"?"Get Look Direction X of"
       :node.opcode==="entity.look_y"?"Get Look Direction Y of"
       :node.opcode==="entity.look_z"?"Get Look Direction Z of"
       :node.opcode==="entity.look_client_x"?"Get Look Direction X (Client) of"
       :node.opcode==="entity.look_client_y"?"Get Look Direction Y (Client) of"
       :node.opcode==="entity.look_client_z"?"Get Look Direction Z (Client) of"
       :node.opcode==="entity.is_crouching"?"Is Crouching?"
       :node.opcode==="logic.true"?"True"
       :node.opcode==="logic.false"?"False"
       :node.opcode==="variable.get"?null
       :node.opcode==="attribute.get"?null
       :node.opcode==="attribute.modifier.add"?null
       :node.opcode==="attribute.modifier.remove"?null
       :node.opcode==="attribute.base.reset"?null
       :node.opcode;

  const valContent = (
    <>
      {lblStr && <span style={{fontSize:16,fontFamily:"sans-serif",color:"#fff",fontWeight:700,whiteSpace:"nowrap",lineHeight:"20px"}}>
        {lblStr}
      </span>}
      {node.opcode==="number.literal"&&<input value={node.fields?.value??"0"} onChange={e=>{e.stopPropagation();if(onFieldChange)onFieldChange(node.id,"value",e.target.value);}} onMouseDown={e=>e.stopPropagation()}
        style={{width:Math.max(50, ((node.fields?.value||"").length*10)+20),height:30,background:inline?"transparent":"rgba(0,0,0,0.3)",border:"none",borderRadius:0,padding:"5px 10px",color:"#fff",fontSize:16,fontFamily:"sans-serif",fontWeight:700,outline:"none",textAlign:"center",boxSizing:"border-box"}}/>}
      {node.opcode==="text.literal"&&<input value={node.fields?.value??""} onChange={e=>{e.stopPropagation();if(onFieldChange)onFieldChange(node.id,"value",e.target.value);}} onMouseDown={e=>e.stopPropagation()}
        style={{width:Math.max(80, ((node.fields?.value||"").length*8)+24),height:30,background:inline?"transparent":"rgba(0,0,0,0.3)",border:"none",borderRadius:0,padding:"5px 10px",color:"#fff",fontSize:14,fontFamily:"sans-serif",fontWeight:700,outline:"none",textAlign:"center",boxSizing:"border-box"}}/>}
      {node.opcode==="number.math"&&<>
          <SlotConn sk="a" sc="rgba(0,0,0,0.3)" connId={node.slots?.a} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <select value={node.fields?.op||"+"} onChange={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"op",e.target.value);}} onMouseDown={e=>e.stopPropagation()}
            style={{height:30,background:"rgba(0,0,0,0.2)",border:"none",color:"#fff",fontSize:16,fontFamily:"sans-serif",fontWeight:700,outline:"none",cursor:"pointer",padding:"0 6px",minWidth:48,textAlign:"center"}}>
            <option value="+">+</option>
            <option value="-">−</option>
            <option value="*">×</option>
            <option value="/">÷</option>
            <option value="%">%</option>
            <option value="min">min</option>
            <option value="max">max</option>
            <option value="pow">pow</option>
          </select>
          <SlotConn sk="b" sc="rgba(0,0,0,0.3)" connId={node.slots?.b} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}

      {isAttrGet&&<>
          <AttrDropdown nodeId={node.id} value={node.fields?.attrId} onChange={v=>onFieldChange&&onFieldChange(node.id,"attrId",v)}/>
          <select value={node.fields?.layer||"total"} onChange={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"layer",e.target.value);}} onMouseDown={e=>e.stopPropagation()}
            style={{height:30,background:"rgba(0,0,0,0.3)",border:"none",color:"#fff",fontSize:13,fontFamily:"sans-serif",fontWeight:700,outline:"none",cursor:"pointer",padding:"0 6px"}}>
            <option value="total">Total</option>
            <option value="base">Base</option>
            <option value="bonus">Bonus (Total − Base)</option>
          </select>
          <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>of</span>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {node.opcode==="variable.get"&&<>
          <VarDropdown nodeId={node.id} varName={node.fields?.varName} varType={node.fields?.varType} onChange={(n,t,d)=>{if(onFieldChange){onFieldChange(node.id,"varName",n);onFieldChange(node.id,"varType",t);onFieldChange(node.id,"varDefault",d);onFieldChange(node.id,"__linkType",varTypeToLink(t));}}}/>
          <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>for</span>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {!isAttrGet&&node.opcode!=="variable.get"&&node.opcode!=="number.math"&&node.slotDefs?.map(def => (
          <React.Fragment key={def.key}>
            {def.label&&<span style={{fontSize:11,fontFamily:"sans-serif",color:"rgba(255,255,255,0.6)",fontWeight:700}}>{def.label}</span>}
            <SlotConn sk={def.key} sc="rgba(0,0,0,0.3)" connId={node.slots?.[def.key]} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          </React.Fragment>
      ))}
    </>
  );

  if(inline){
     return <div id={"node-"+node.id} onMouseDown={e=>{if(e.button===2){e.stopPropagation();if(window.__showYcsCtx)window.__showYcsCtx(node.id,e.clientX,e.clientY);return;}if(e.button!==0)return;e.stopPropagation(); e.currentTarget.parentElement?.parentElement?.focus(); if(onSelect)onSelect(node.id);const r=e.currentTarget.getBoundingClientRect();if(onDragStart)onDragStart(node.id, e.clientX-r.left,e.clientY-r.top, e.clientX, e.clientY);}} onContextMenu={e=>{e.preventDefault();e.stopPropagation();}}
       style={{display:"flex",alignItems:"center",background:bg,borderRadius:0,padding:"0 10px",height:30,minWidth:50,cursor:"grab",boxShadow:"0 2px 6px rgba(0,0,0,.3)",gap:10, border:selected===node.id?"2px solid #fff":"2px solid transparent", boxSizing:"border-box"}}>
        {valContent}
     </div>;
  }

  const commonHeader = (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 10px",cursor:"grab",background:isSt?"#0f172a":"transparent",flex:1,height:"100%",boxSizing:"border-box"}}>
      <span style={{fontFamily:"sans-serif",fontSize:16,lineHeight:"20px",color:isSt?"#38bdf8":"#fff",fontWeight:700,whiteSpace:"nowrap"}}>
        {isSt?"Start: "+(ITEM_METHODS.find(m=>m.key===methodKey)?.label||methodKey)
         :node.opcode==="effect.apply"?"Add Effect to"
         :node.opcode==="control.if"?"If"
         :node.opcode==="control.delay"?"Delay"
         :node.opcode==="aoe.each.sphere"?"For Each in Sphere"
         :node.opcode==="aoe.each.box"?"For Each in Box"
         :node.opcode==="aoe.each.cone"?"For Each in Cone"
         :node.opcode==="aoe.each.line"?"For Each in Line"
         :node.opcode==="aoe.iterator.entity"?"Iterator Entity"
         :node.opcode==="anim.firstperson.play"?"Play FP Anim"
         :node.opcode==="anim.firstperson.stop"?"Stop FP Anim on"
         :node.opcode==="anim.firstperson.pause"?"Pause FP Anim on"
         :node.opcode==="anim.firstperson.resume"?"Resume FP Anim on"
         :node.opcode==="anim.thirdperson.play"?"Play TP Anim"
         :node.opcode==="anim.thirdperson.stop"?"Stop TP Anim on"
         :node.opcode==="anim.thirdperson.pause"?"Pause TP Anim on"
         :node.opcode==="anim.thirdperson.resume"?"Resume TP Anim on"
         :node.opcode==="anim.handpose.set"?"Set FP Hand Pose"
         :node.opcode==="anim.handpose.reset"?"Reset FP Hand Pose on"
         :node.opcode==="anim.tppose.set"?"Set TP Pose"
         :node.opcode==="anim.tppose.reset"?"Reset TP Pose on"
         :node.opcode==="variable.set"?"Set Variable"
         :node.opcode==="entity.apply_motion"?"Apply Motion to"
         :node.opcode==="attribute.modifier.add"?"Add Attr Modifier"
         :node.opcode==="attribute.modifier.remove"?"Remove Attr Modifier"
         :node.opcode==="attribute.base.reset"?"Reset Attr Base"
         :node.opcode}
      </span>
      {isIf&&<>
        <span style={{cursor:"pointer",opacity:0.6,fontSize:14}} onClick={(e)=>{e.stopPropagation();setShowSettings(s=>!s)}}>⚙</span>
        <SlotConn sk="condition" sc="rgba(0,0,0,0.3)" connId={node.slots?.condition} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {isDelay&&<>
        <SlotConn sk="delayTicks" sc="rgba(0,0,0,0.3)" connId={node.slots?.delayTicks} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
        <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>ticks</span>
      </>}
      {node.opcode==="effect.apply"&&<>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <EffectDropdown nodeId={node.id} value={node.fields?.effect} onChange={v=>onFieldChange&&onFieldChange(node.id,"effect",v)}/>
          <span style={{fontSize:16,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>Duration</span>
          <SlotConn sk="duration" sc="rgba(0,0,0,0.3)" connId={node.slots?.duration} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:16,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>Level</span>
          <SlotConn sk="level" sc="rgba(0,0,0,0.3)" connId={node.slots?.level} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {node.opcode==="entity.apply_motion"&&<>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:13,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>X</span>
          <SlotConn sk="x" sc="rgba(0,0,0,0.3)" connId={node.slots?.x} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:13,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>Y</span>
          <SlotConn sk="y" sc="rgba(0,0,0,0.3)" connId={node.slots?.y} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:13,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>Z</span>
          <SlotConn sk="z" sc="rgba(0,0,0,0.3)" connId={node.slots?.z} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <select value={node.fields?.mode||"add"} onChange={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"mode",e.target.value);}} onMouseDown={e=>e.stopPropagation()}
            style={{height:30,background:"rgba(0,0,0,0.3)",border:"none",color:"#fff",fontSize:12,fontFamily:"sans-serif",fontWeight:700,outline:"none",cursor:"pointer",padding:"0 6px"}}>
            <option value="add">Add (impulse)</option>
            <option value="set">Set (override)</option>
          </select>
      </>}
      {isAnimPlay&&<>
          <SlotConn sk="animName" sc="rgba(0,0,0,0.3)" connId={node.slots?.animName} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>for</span>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>speed</span>
          <SlotConn sk="playbackSpeed" sc="rgba(0,0,0,0.3)" connId={node.slots?.playbackSpeed} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>from file</span>
          <SlotConn sk="filePath" sc="rgba(0,0,0,0.3)" connId={node.slots?.filePath} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {isAnimStop&&<>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {isAnimPause&&<>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {isAnimResume&&<>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {isAnimTPPlay&&<>
          <span style={{cursor:"pointer",opacity:0.6,fontSize:14,position:"relative"}} onClick={(e)=>{e.stopPropagation();setShowSettings(s=>!s)}}>⚙</span>
          <SlotConn sk="animName" sc="rgba(0,0,0,0.3)" connId={node.slots?.animName} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>for</span>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>speed</span>
          <SlotConn sk="playbackSpeed" sc="rgba(0,0,0,0.3)" connId={node.slots?.playbackSpeed} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>from file</span>
          <SlotConn sk="filePath" sc="rgba(0,0,0,0.3)" connId={node.slots?.filePath} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {isAnimTPStop&&<>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {isAnimTPPause&&<>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {isAnimTPResume&&<>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {isHandPoseSet&&<>
          <span style={{cursor:"pointer",opacity:0.6,fontSize:14,position:"relative"}} onClick={(e)=>{e.stopPropagation();setShowSettings(s=>!s)}}>⚙</span>
          <SlotConn sk="animName" sc="rgba(0,0,0,0.3)" connId={node.slots?.animName} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>for</span>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>from</span>
          <SlotConn sk="filePath" sc="rgba(0,0,0,0.3)" connId={node.slots?.filePath} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {isHandPoseReset&&<>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {isTPPoseSet&&<>
          <span style={{cursor:"pointer",opacity:0.6,fontSize:14,position:"relative"}} onClick={(e)=>{e.stopPropagation();setShowSettings(s=>!s)}}>⚙</span>
          <SlotConn sk="animName" sc="rgba(0,0,0,0.3)" connId={node.slots?.animName} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>for</span>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>from</span>
          <SlotConn sk="filePath" sc="rgba(0,0,0,0.3)" connId={node.slots?.filePath} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {isTPPoseReset&&<>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {node.opcode==="aoe.each.sphere"&&<>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:13,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>r</span>
          <SlotConn sk="radius" sc="rgba(0,0,0,0.3)" connId={node.slots?.radius} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <label style={{display:"flex",alignItems:"center",gap:3,color:"#fff",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"los",!(node.fields?.los!==false));}}><input type="checkbox" checked={node.fields?.los!==false} onChange={()=>{}} style={{cursor:"pointer",margin:0}}/>LoS</label>
          {node.fields?.los!==false&&<select value={node.fields?.losOrigin||"caller"} onChange={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"losOrigin",e.target.value);}} onMouseDown={e=>e.stopPropagation()} style={{height:30,background:"rgba(0,0,0,0.3)",border:"none",color:"#fff",fontSize:10,fontFamily:"sans-serif",fontWeight:700,outline:"none",cursor:"pointer",padding:"0 4px"}}><option value="center">from Center</option><option value="caller">from Caller</option></select>}
          <label style={{display:"flex",alignItems:"center",gap:3,color:"#fff",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"showParticles",!node.fields?.showParticles);}}><input type="checkbox" checked={!!node.fields?.showParticles} onChange={()=>{}} style={{cursor:"pointer",margin:0}}/>Vis</label>
          <span style={{fontSize:10,color:"#888"}}>X</span><SlotConn sk="offX" sc="rgba(0,0,0,0.3)" connId={node.slots?.offX} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:10,color:"#888"}}>Y</span><SlotConn sk="offY" sc="rgba(0,0,0,0.3)" connId={node.slots?.offY} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:10,color:"#888"}}>Z</span><SlotConn sk="offZ" sc="rgba(0,0,0,0.3)" connId={node.slots?.offZ} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {node.opcode==="aoe.each.box"&&<>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:13,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>W</span><SlotConn sk="width" sc="rgba(0,0,0,0.3)" connId={node.slots?.width} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:13,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>H</span><SlotConn sk="height" sc="rgba(0,0,0,0.3)" connId={node.slots?.height} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:13,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>D</span><SlotConn sk="depth" sc="rgba(0,0,0,0.3)" connId={node.slots?.depth} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <label style={{display:"flex",alignItems:"center",gap:3,color:"#fff",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"los",!(node.fields?.los!==false));}}><input type="checkbox" checked={node.fields?.los!==false} onChange={()=>{}} style={{cursor:"pointer",margin:0}}/>LoS</label>
          {node.fields?.los!==false&&<select value={node.fields?.losOrigin||"caller"} onChange={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"losOrigin",e.target.value);}} onMouseDown={e=>e.stopPropagation()} style={{height:30,background:"rgba(0,0,0,0.3)",border:"none",color:"#fff",fontSize:10,fontFamily:"sans-serif",fontWeight:700,outline:"none",cursor:"pointer",padding:"0 4px"}}><option value="center">from Center</option><option value="caller">from Caller</option></select>}
          <label style={{display:"flex",alignItems:"center",gap:3,color:"#fff",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"showParticles",!node.fields?.showParticles);}}><input type="checkbox" checked={!!node.fields?.showParticles} onChange={()=>{}} style={{cursor:"pointer",margin:0}}/>Vis</label>
          <span style={{fontSize:10,color:"#888"}}>X</span><SlotConn sk="offX" sc="rgba(0,0,0,0.3)" connId={node.slots?.offX} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:10,color:"#888"}}>Y</span><SlotConn sk="offY" sc="rgba(0,0,0,0.3)" connId={node.slots?.offY} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:10,color:"#888"}}>Z</span><SlotConn sk="offZ" sc="rgba(0,0,0,0.3)" connId={node.slots?.offZ} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {node.opcode==="aoe.each.cone"&&<>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:13,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>dist</span><SlotConn sk="distance" sc="rgba(0,0,0,0.3)" connId={node.slots?.distance} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:13,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>angle°</span><SlotConn sk="angle" sc="rgba(0,0,0,0.3)" connId={node.slots?.angle} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <label style={{display:"flex",alignItems:"center",gap:3,color:"#fff",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"los",!(node.fields?.los!==false));}}><input type="checkbox" checked={node.fields?.los!==false} onChange={()=>{}} style={{cursor:"pointer",margin:0}}/>LoS</label>
          <label style={{display:"flex",alignItems:"center",gap:3,color:"#fff",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"showParticles",!node.fields?.showParticles);}}><input type="checkbox" checked={!!node.fields?.showParticles} onChange={()=>{}} style={{cursor:"pointer",margin:0}}/>Vis</label>
          <span style={{fontSize:10,color:"#888"}}>X</span><SlotConn sk="offX" sc="rgba(0,0,0,0.3)" connId={node.slots?.offX} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:10,color:"#888"}}>Y</span><SlotConn sk="offY" sc="rgba(0,0,0,0.3)" connId={node.slots?.offY} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:10,color:"#888"}}>Z</span><SlotConn sk="offZ" sc="rgba(0,0,0,0.3)" connId={node.slots?.offZ} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {node.opcode==="aoe.each.line"&&<>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:13,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>dist</span><SlotConn sk="distance" sc="rgba(0,0,0,0.3)" connId={node.slots?.distance} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:13,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>width</span><SlotConn sk="width" sc="rgba(0,0,0,0.3)" connId={node.slots?.width} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <label style={{display:"flex",alignItems:"center",gap:3,color:"#fff",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"los",!(node.fields?.los!==false));}}><input type="checkbox" checked={node.fields?.los!==false} onChange={()=>{}} style={{cursor:"pointer",margin:0}}/>LoS</label>
          <label style={{display:"flex",alignItems:"center",gap:3,color:"#fff",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"showParticles",!node.fields?.showParticles);}}><input type="checkbox" checked={!!node.fields?.showParticles} onChange={()=>{}} style={{cursor:"pointer",margin:0}}/>Vis</label>
          <span style={{fontSize:10,color:"#888"}}>X</span><SlotConn sk="offX" sc="rgba(0,0,0,0.3)" connId={node.slots?.offX} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:10,color:"#888"}}>Y</span><SlotConn sk="offY" sc="rgba(0,0,0,0.3)" connId={node.slots?.offY} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:10,color:"#888"}}>Z</span><SlotConn sk="offZ" sc="rgba(0,0,0,0.3)" connId={node.slots?.offZ} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {node.opcode==="variable.set"&&<>
          <VarDropdown nodeId={node.id} varName={node.fields?.varName} varType={node.fields?.varType} onChange={(n,t,d)=>{if(onFieldChange){onFieldChange(node.id,"varName",n);onFieldChange(node.id,"varType",t);onFieldChange(node.id,"varDefault",d);}}}/>
          <SlotConn sk="value" sc="rgba(0,0,0,0.3)" connId={node.slots?.value} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>for</span>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {isAttrModAdd&&<>
          <AttrDropdown nodeId={node.id} value={node.fields?.attrId} onChange={v=>onFieldChange&&onFieldChange(node.id,"attrId",v)}/>
          <select value={node.fields?.operation||"flat"} onChange={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"operation",e.target.value);}} onMouseDown={e=>e.stopPropagation()}
            style={{height:30,background:"rgba(0,0,0,0.3)",border:"none",color:"#fff",fontSize:13,fontFamily:"sans-serif",fontWeight:700,outline:"none",cursor:"pointer",padding:"0 6px"}}>
            <option value="flat">Flat bonus (ADD_VALUE)</option>
            <option value="multiply">% Multiplier (ADD_MULTIPLIED_TOTAL)</option>
            <option value="base_set">Set Base</option>
            <option value="base_add">Add to Base</option>
            <option value="base_multiply">Multiply Base</option>
          </select>
          {!["base_set","base_add","base_multiply"].includes(node.fields?.operation)&&<input value={node.fields?.modifierName||""} onChange={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"modifierName",e.target.value);}} onMouseDown={e=>e.stopPropagation()}            style={{height:30,width:130,background:"rgba(0,0,0,0.3)",border:"none",color:"#fff",fontSize:13,fontFamily:"sans-serif",fontWeight:700,outline:"none",padding:"0 8px",boxSizing:"border-box"}}/>}
          <SlotConn sk="value" sc="rgba(0,0,0,0.3)" connId={node.slots?.value} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>on</span>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {isAttrModRemove&&<>
          <AttrDropdown nodeId={node.id} value={node.fields?.attrId} onChange={v=>onFieldChange&&onFieldChange(node.id,"attrId",v)}/>
          <input value={node.fields?.modifierName||""} onChange={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"modifierName",e.target.value);}} onMouseDown={e=>e.stopPropagation()}            style={{height:30,width:130,background:"rgba(0,0,0,0.3)",border:"none",color:"#fff",fontSize:13,fontFamily:"sans-serif",fontWeight:700,outline:"none",padding:"0 8px",boxSizing:"border-box"}}/>
          <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>from</span>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {node.opcode==="attribute.base.reset"&&<>
          <AttrDropdown nodeId={node.id} value={node.fields?.attrId} onChange={v=>onFieldChange&&onFieldChange(node.id,"attrId",v)}/>
          <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>on</span>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {!inChain&&isAct&&!isSt&&<span style={{fontSize:14,color:"#fff",background:"#e11d48",padding:"2px 8px",borderRadius:6,fontWeight:700}} title="Not connected to Start">!</span>}
    </div>
  );

  if (isIf) {
      return (
        <div id={"node-"+node.id} onMouseDown={e=>{if(e.button===2){e.stopPropagation();if(window.__showYcsCtx)window.__showYcsCtx(node.id,e.clientX,e.clientY);return;}if(e.button!==0)return;e.stopPropagation(); e.currentTarget.parentElement?.parentElement?.focus(); if(onSelect)onSelect(node.id);const r=e.currentTarget.getBoundingClientRect();if(onDragStart)onDragStart(node.id, e.clientX-r.left,e.clientY-r.top, e.clientX, e.clientY);}} style={{position:"absolute",left:node.x,top:node.y,minWidth:50,width:"fit-content",display:"flex",flexDirection:"column",alignItems:"stretch",zIndex:(!inChain?50:(node.depth||1)),opacity:(!inChain&&isAct&&!isSt)?0.6:1,userSelect:"none",filter:"drop-shadow(0 6px 16px rgba(0,0,0,.4))"}} onContextMenu={e=>{e.preventDefault();e.stopPropagation();}}>
            {showSettings&&<div style={{position:"absolute",left:0,top:-90,background:"#222",border:"2px solid #444",padding:"8px 12px",borderRadius:10,zIndex:100,display:"flex",flexDirection:"column",gap:6,pointerEvents:"auto"}} onMouseDown={e=>e.stopPropagation()}>
               <div style={{color:"#aaa",fontSize:12,fontWeight:700,marginBottom:2}}>If Block Settings</div>
               <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                 <div style={{color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",background:"#444",padding:"4px 10px",borderRadius:6}} onClick={(e)=>{e.stopPropagation();setShowSettings(false)}}>✕</div>
                 <div style={{color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",background:"#3a5c3a",padding:"4px 10px",borderRadius:6}} onClick={()=>onFieldChange&&onFieldChange(node.id,"elseIfCount",(node.fields?.elseIfCount||0)+1)}>+ Else If</div>
                 <div style={{color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",background:"#5a3a3a",padding:"4px 10px",borderRadius:6}} onClick={()=>onFieldChange&&onFieldChange(node.id,"elseIfCount",Math.max(0,(node.fields?.elseIfCount||0)-1))}>− Else If</div>
                 <div style={{color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",background:"#444",padding:"4px 10px",borderRadius:6}} onClick={()=>onFieldChange&&onFieldChange(node.id,"hasElse",!node.fields?.hasElse)}>{node.fields?.hasElse?"− Else":"+ Else"}</div>
               </div>
            </div>}
            
            <div style={{height:50,background:bg,borderRadius:"10px",display:"flex",border:selected===node.id?"2px solid #fff":"2px solid transparent",boxSizing:"border-box",pointerEvents:"auto"}}>{commonHeader}</div>
            <div style={{height:node.gapHeights?.do0||0,background:"transparent"}}/>

            {Array.from({length: node.fields?.elseIfCount || 0}).map((_, i) => (
              <div style={{display:"contents"}} key={i}>
                  <div style={{height:50,background:bg,borderRadius:"10px",display:"flex",alignItems:"center",paddingLeft:15,borderRight:selected===node.id?"2px solid #fff":"2px solid transparent",boxSizing:"border-box",pointerEvents:"auto"}}>
                      <span style={{fontFamily:"sans-serif",fontSize:16,color:"#fff",fontWeight:700,marginRight:15,whiteSpace:"nowrap"}}>Else If</span>
                      <SlotConn sk={"condition"+(i+1)} sc="rgba(0,0,0,0.3)" connId={node.slots?.["condition"+(i+1)]} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
                  </div>
                  <div style={{height:node.gapHeights?.["do"+(i+1)]||0,background:"transparent"}}/>
              </div>
            ))}

            {node.fields?.hasElse && (
              <div style={{display:"contents"}}>
                  <div style={{height:50,background:bg,borderRadius:"10px",display:"flex",alignItems:"center",paddingLeft:15,borderRight:selected===node.id?"2px solid #fff":"2px solid transparent",boxSizing:"border-box",pointerEvents:"auto"}}>
                      <span style={{fontFamily:"sans-serif",fontSize:16,color:"#fff",fontWeight:700,whiteSpace:"nowrap"}}>Else</span>
                  </div>
                  <div style={{height:node.gapHeights?.doElse||0,background:"transparent"}}/>
              </div>
            )}
        </div>
      );
  }

  if (isAoeEach) {
      return (
        <div id={"node-"+node.id} onMouseDown={e=>{if(e.button===2){e.stopPropagation();if(window.__showYcsCtx)window.__showYcsCtx(node.id,e.clientX,e.clientY);return;}if(e.button!==0)return;e.stopPropagation(); e.currentTarget.parentElement?.parentElement?.focus(); if(onSelect)onSelect(node.id);const r=e.currentTarget.getBoundingClientRect();if(onDragStart)onDragStart(node.id, e.clientX-r.left,e.clientY-r.top, e.clientX, e.clientY);}} style={{position:"absolute",left:node.x,top:node.y,minWidth:50,width:"fit-content",display:"flex",flexDirection:"column",alignItems:"stretch",zIndex:(!inChain?50:(node.depth||1)),opacity:(!inChain&&isAct&&!isSt)?0.6:1,userSelect:"none",filter:"drop-shadow(0 6px 16px rgba(0,0,0,.4))"}} onContextMenu={e=>{e.preventDefault();e.stopPropagation();}}>
            <div style={{height:50,background:bg,borderRadius:"10px",display:"flex",border:selected===node.id?"2px solid #fff":"2px solid transparent",boxSizing:"border-box",pointerEvents:"auto"}}>{commonHeader}</div>
            <div style={{height:node.gapHeights?.do0||0,background:"transparent"}}/>
        </div>
      );
  }

  if (isDelay) {
      return (
        <div id={"node-"+node.id} onMouseDown={e=>{if(e.button===2){e.stopPropagation();if(window.__showYcsCtx)window.__showYcsCtx(node.id,e.clientX,e.clientY);return;}if(e.button!==0)return;e.stopPropagation(); e.currentTarget.parentElement?.parentElement?.focus(); if(onSelect)onSelect(node.id);const r=e.currentTarget.getBoundingClientRect();if(onDragStart)onDragStart(node.id, e.clientX-r.left,e.clientY-r.top, e.clientX, e.clientY);}} style={{position:"absolute",left:node.x,top:node.y,minWidth:50,width:"fit-content",display:"flex",flexDirection:"column",alignItems:"stretch",zIndex:(!inChain?50:(node.depth||1)),opacity:(!inChain&&isAct&&!isSt)?0.6:1,userSelect:"none",filter:"drop-shadow(0 6px 16px rgba(0,0,0,.4))"}} onContextMenu={e=>{e.preventDefault();e.stopPropagation();}}>
            <div style={{height:50,background:bg,borderRadius:"10px",display:"flex",border:selected===node.id?"2px solid #fff":"2px solid transparent",boxSizing:"border-box",pointerEvents:"auto"}}>{commonHeader}</div>
            <div style={{height:node.gapHeights?.do0||0,background:"transparent"}}/>
        </div>
      );
  }

  return (
    <div id={"node-"+node.id} onContextMenu={e=>{e.preventDefault(); e.stopPropagation(); if(window.__showYcsCtx) window.__showYcsCtx(node.id, e.clientX, e.clientY);}}
      style={{position:"absolute",left:node.x,top:node.y,minWidth:isVal?50:50,width:isVal?undefined:"fit-content",minHeight:50,height:node.height||(isVal?"auto":50),
        display:isVal?"flex":"block", alignItems:isVal?"center":"stretch", padding:isVal?"8px 10px":"0", gap:isVal?10:0, boxSizing:"border-box", border:selected===node.id?"2px solid #fff":"2px solid transparent",
        zIndex:isVal?100:(!inChain?50:(node.depth||1)),opacity:(!inChain&&isAct&&!isSt)?0.6:1,
        background:bg, borderRadius:10}}
      onMouseDown={e=>{if(e.button!==0)return;e.stopPropagation(); e.currentTarget.parentElement?.parentElement?.focus(); if(onSelect)onSelect(node.id);const r=e.currentTarget.getBoundingClientRect();if(onDragStart)onDragStart(node.id, e.clientX-r.left,e.clientY-r.top, e.clientX, e.clientY);}}>
      {isVal && <div style={{position:"absolute",left:-10,top:"50%",transform:"translateY(-50%)",width:10,height:20,borderRadius:"10px 0 0 10px",background:bg}}/>}

      
      {isVal ? valContent : commonHeader}
      {showSettings&&isHandPoseSet&&(()=>{
        return <div style={{position:"absolute",left:0,bottom:"100%",marginBottom:8,background:"#222",border:"2px solid #444",padding:"10px 14px",borderRadius:10,zIndex:100,display:"flex",flexDirection:"column",gap:8,pointerEvents:"auto"}} onMouseDown={e=>e.stopPropagation()}>
          <label style={{display:"flex",alignItems:"center",gap:6,color:"#ccc",fontSize:12,cursor:"pointer"}} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"allowVanillaActions",!node.fields?.allowVanillaActions);}}>
            <input type="checkbox" checked={!!node.fields?.allowVanillaActions} onChange={()=>{}} style={{cursor:"pointer",margin:0}}/>
            Allow Vanilla Actions
          </label>
        </div>;
      })()}
      {showSettings&&(isAnimTPPlay||isTPPoseSet)&&(()=>{
        const lookMask = node.fields?.lookAtMask||0;
        const vanMask  = node.fields?.vanillaMask||0;
        const actMask  = node.fields?.allowActionsMask||0;
        const keepMask = node.fields?.keepPosScaleMask||0;
        const LookCB = ({bit})=>(
          <label style={{display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"lookAtMask",(lookMask^bit));}}>
            <input type="checkbox" checked={!!(lookMask&bit)} onChange={()=>{}} style={{cursor:"pointer",margin:0}}/>
          </label>
        );
        const AnimCB = ({bit})=>(
          <label style={{display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"vanillaMask",(vanMask^bit));}}>
            <input type="checkbox" checked={!!(vanMask&bit)} onChange={()=>{}} style={{cursor:"pointer",margin:0}}/>
          </label>
        );
        const VanCB = ({bit})=>(
          <label style={{display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"vanillaMask",(vanMask^bit));}}>
            <input type="checkbox" checked={!!(vanMask&bit)} onChange={()=>{}} style={{cursor:"pointer",margin:0}}/>
          </label>
        );
        const ActCB = ({bit})=>{
          const enabled = isTPPoseSet;
          return <label style={{display:"flex",alignItems:"center",justifyContent:"center",cursor:enabled?"pointer":"default"}} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();if(enabled)onFieldChange&&onFieldChange(node.id,"allowActionsMask",(actMask^bit));}}>
            <input type="checkbox" checked={!!(actMask&bit)} disabled={!enabled} onChange={()=>{}} style={{cursor:enabled?"pointer":"default",margin:0}}/>
          </label>;
        };
        const KeepCB = ({bit})=>{
          const actOn = !!(actMask&bit);
          const enabled = isTPPoseSet && actOn;
          return <label style={{display:"flex",alignItems:"center",justifyContent:"center",cursor:enabled?"pointer":"default",opacity:enabled?1:0.35}} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();if(enabled)onFieldChange&&onFieldChange(node.id,"keepPosScaleMask",(keepMask^bit));}}>
            <input type="checkbox" checked={!!(keepMask&bit)} disabled={!enabled} onChange={()=>{}} style={{cursor:enabled?"pointer":"default",margin:0}}/>
          </label>;
        };
        // lookAtMask: Root Yaw=bit12, Root Pitch=bit13, RArm Yaw=bit4, RArm Pitch=bit5, etc.
        // vanillaMask: Head=1,Torso=2,RArm=4,LArm=8,RLeg=16,LLeg=32,Crouch=64,Prone=128,Sitting=256
        const rootYawOn = !!(lookMask & (1<<12));
        const rootPitchOn = !!(lookMask & (1<<13));
        const rootActive = rootYawOn || rootPitchOn;
        const parts = [
          {label:"Right Arm", lookBase:4,  vanBit:4},
          {label:"Left Arm",  lookBase:6,  vanBit:8},
          {label:"Right Leg", lookBase:8,  vanBit:16},
          {label:"Left Leg",  lookBase:10, vanBit:32},
        ];
        const tdC = {textAlign:"center",padding:"1px 6px"};
        const hdC = {color:"#888",fontSize:11,padding:"0 6px",textAlign:"center"};
        return <div style={{position:"absolute",left:0,bottom:"100%",marginBottom:8,background:"#222",border:"2px solid #444",padding:"10px 14px",borderRadius:10,zIndex:100,display:"flex",flexDirection:"column",gap:8,pointerEvents:"auto"}} onMouseDown={e=>e.stopPropagation()}>
          <table style={{borderCollapse:"collapse",fontSize:12,color:"#ccc"}}>
            <thead><tr>
              <td style={{paddingRight:8,color:"#888",fontSize:11}}></td>
              <td style={hdC}>Yaw</td>
              <td style={hdC}>Pitch</td>
              <td style={{...hdC,borderLeft:"1px solid #444"}}>Animation</td>
              {isTPPoseSet&&<td style={{...hdC,borderLeft:"1px solid #444"}}>Allow Act</td>}
              {isTPPoseSet&&<td style={{...hdC,borderLeft:"1px solid #444"}}>Keep Pos</td>}
            </tr></thead>
            <tbody>
              <tr style={{borderBottom:"1px solid #333"}}>
                <td style={{paddingRight:8,color:"#aaa",fontSize:12,fontWeight:700}}>Root (Face Cam)</td>
                <td style={tdC}><LookCB bit={1<<12}/></td>
                <td style={tdC}><LookCB bit={1<<13}/></td>
                <td style={{...tdC,borderLeft:"1px solid #444"}}></td>
                {isTPPoseSet&&<td style={{...tdC,borderLeft:"1px solid #444"}}></td>}
                {isTPPoseSet&&<td style={{...tdC,borderLeft:"1px solid #444"}}></td>}
              </tr>
              {parts.map(({label,lookBase,vanBit})=>(
                <tr key={label}>
                  <td style={{paddingRight:8,color:"#ddd",fontSize:12}}>{label}</td>
                  <td style={{...tdC,opacity:rootActive?0.35:1}}><LookCB bit={1<<lookBase}/></td>
                  <td style={{...tdC,opacity:rootActive?0.35:1}}><LookCB bit={1<<(lookBase+1)}/></td>
                  <td style={{...tdC,borderLeft:"1px solid #444"}}><AnimCB bit={vanBit}/></td>
                  {isTPPoseSet&&<td style={{...tdC,borderLeft:"1px solid #444"}}><ActCB bit={vanBit}/></td>}
                  {isTPPoseSet&&<td style={{...tdC,borderLeft:"1px solid #444"}}><KeepCB bit={vanBit}/></td>}
                </tr>
              ))}
              <tr style={{borderTop:"1px solid #333"}}>
                <td style={{paddingRight:8,color:"#ddd",fontSize:12}}>Head</td>
                <td style={tdC}></td><td style={tdC}></td>
                <td style={{...tdC,borderLeft:"1px solid #444"}}><AnimCB bit={1}/></td>
                {isTPPoseSet&&<td style={{...tdC,borderLeft:"1px solid #444"}}><ActCB bit={1}/></td>}
                {isTPPoseSet&&<td style={{...tdC,borderLeft:"1px solid #444"}}><KeepCB bit={1}/></td>}
              </tr>
              <tr>
                <td style={{paddingRight:8,color:"#ddd",fontSize:12}}>Torso</td>
                <td style={tdC}></td><td style={tdC}></td>
                <td style={{...tdC,borderLeft:"1px solid #444"}}><AnimCB bit={2}/></td>
                {isTPPoseSet&&<td style={{...tdC,borderLeft:"1px solid #444"}}><ActCB bit={2}/></td>}
                {isTPPoseSet&&<td style={{...tdC,borderLeft:"1px solid #444"}}><KeepCB bit={2}/></td>}
              </tr>
              <tr style={{borderTop:"1px solid #333"}}>
                <td style={{paddingRight:8,color:"#ddd",fontSize:12}}>Disable Crouch</td>
                <td style={tdC}></td><td style={tdC}></td>
                <td style={{...tdC,borderLeft:"1px solid #444"}}><VanCB bit={64}/></td>
                {isTPPoseSet&&<td style={{...tdC,borderLeft:"1px solid #444"}}></td>}
                {isTPPoseSet&&<td style={{...tdC,borderLeft:"1px solid #444"}}></td>}
              </tr>
              <tr>
                <td style={{paddingRight:8,color:"#ddd",fontSize:12}}>Disable Sitting</td>
                <td style={tdC}></td><td style={tdC}></td>
                <td style={{...tdC,borderLeft:"1px solid #444"}}><VanCB bit={256}/></td>
                {isTPPoseSet&&<td style={{...tdC,borderLeft:"1px solid #444"}}></td>}
                {isTPPoseSet&&<td style={{...tdC,borderLeft:"1px solid #444"}}></td>}
              </tr>
              <tr>
                <td style={{paddingRight:8,color:"#ddd",fontSize:12}}>Disable Prone</td>
                <td style={tdC}></td><td style={tdC}></td>
                <td style={{...tdC,borderLeft:"1px solid #444"}}><VanCB bit={128}/></td>
                {isTPPoseSet&&<td style={{...tdC,borderLeft:"1px solid #444"}}></td>}
                {isTPPoseSet&&<td style={{...tdC,borderLeft:"1px solid #444"}}></td>}
              </tr>
            </tbody>
          </table>
          {(()=>{
            const fpMask = node.fields?.fpViewMask||0;
            const FpCB = ({bit,label})=>(
              <label style={{display:"flex",alignItems:"center",gap:5,color:"#ccc",fontSize:12,cursor:"pointer"}} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onFieldChange&&onFieldChange(node.id,"fpViewMask",(fpMask^bit));}}>
                <input type="checkbox" checked={!!(fpMask&bit)} onChange={()=>{}} style={{cursor:"pointer",margin:0}}/>
                {label}
              </label>
            );
            return <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:4,borderTop:"1px solid #333",paddingTop:6}}>
              <div style={{color:"#888",fontSize:11,fontWeight:600}}>Show in First Person</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                <FpCB bit={4} label="R.Arm"/>
                <FpCB bit={8} label="L.Arm"/>
                <FpCB bit={16} label="R.Leg"/>
                <FpCB bit={32} label="L.Leg"/>
                <FpCB bit={1} label="Head"/>
                <FpCB bit={2} label="Torso"/>
              </div>
            </div>;
          })()}
        </div>;
      })()}
    </div>
  );
}

function SlotConn({sk,sc,connId,nodes,mk,onDragStart,onFieldChange,nodeId,onSelect,selectedNodeId}){
  const cn=connId?nodes?.find(n=>n.id===connId):null;
  if(cn) return <CanvasNode node={cn} nodes={nodes} methodKey={mk} onDragStart={onDragStart} onFieldChange={onFieldChange} onSelect={onSelect} selected={selectedNodeId} inline/>;
  return <div title="drop value here" className="slot-conn" data-nodeid={nodeId} data-sk={sk}
    onMouseEnter={() => { window.__hoveredSlot = { nodeId, sk }; }}
    onMouseLeave={() => { if (window.__hoveredSlot?.sk === sk) window.__hoveredSlot = null; }}
    style={{display:"flex",alignItems:"center",justifyContent:"center",
      background:sc, position:"relative",
      borderRadius:0,minWidth:50,height:30,marginLeft:10
    }}>
      <div style={{position:"absolute",left:-8,top:"50%",transform:"translateY(-50%)",width:8,height:16,borderRadius:"8px 0 0 8px",background:sc}}/>
  </div>;
}function MethodListPanel({form,F,onEnterEditor,className}){
  const[busyKey,setBusyKey]=useState(null);
  const enabled=form.enabledMethods||[];

  const toggle=async(key,checked)=>{
    setBusyKey(key);
    // Ensure the class file exists before trying to patch it
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
        background:visuallyOn?"#1a2438":C.card,
        border:`1px solid ${visuallyOn?"#2a3f5a":C.inpB}`,
        opacity:busy||disabled?0.6:1,transition:"all .15s",filter:disabled?"grayscale(1)":""}}>
        <div style={{display:"flex",alignItems:"center",gap:9,minWidth:0}}>
          <div onClick={()=>!busy&&!disabled&&toggle(m.key,!isOn)} style={{
            width:14,height:14,border:`1px solid ${visuallyOn?C.accent:C.inpB}`,borderRadius:3,
            background:visuallyOn?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",
            cursor:busy||disabled?"not-allowed":"pointer",flexShrink:0}}>
            {visuallyOn&&<svg width="8" height="7" viewBox="0 0 8 7"><path d="M1 3.5l2 2 4-4" stroke="#04060c" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
          </div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:13,color:visuallyOn?C.text:C.dim,fontWeight:500,display:"flex",alignItems:"center",gap:5}}>
              {m.label}
              {hasBlocks&&<span style={{fontSize:10,color:C.accent,background:"#0e2030",padding:"1px 5px",borderRadius:3}}>● compiled</span>}
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


export { VisualEditorPanel, VisualEditorPanelInner, CanvasNode, SlotConn, AttrDropdown, EffectDropdown, VarDropdown, PaletteBlock, PaletteSidebar, MethodListPanel };
