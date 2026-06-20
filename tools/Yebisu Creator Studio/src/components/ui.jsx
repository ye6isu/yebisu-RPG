import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { C, SI } from "../theme.js";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{padding: 20, color: 'red', background: '#222', zIndex: 9999, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
        <h1>Fatal Error in Visual Editor</h1>
        <pre>{this.state.error?.toString()}</pre>
        <pre>{this.state.error?.stack}</pre>
      </div>;
    }
    return this.props.children;
  }
}

export const Lbl=({children,c})=><span style={{...SI.lbl,color:c||C.dim}}>{children}</span>;

export function Btn({children,onClick,v="d",sm,dis,style:extStyle={}}){const vs={d:{bg:"#222226",c:C.text,b:"1px solid #222226"},p:{bg:C.accent,c:"#06080e",b:`1px solid ${C.accent}`},dan:{bg:"#200e0e",c:"#ff7777",b:"1px solid #200e0e"},g:{bg:"transparent",c:C.dim,b:`1px solid ${C.inpB}`}};const vv=vs[v]||vs.d;return<button disabled={dis} onClick={onClick} style={{display:"inline-flex",alignItems:"center",gap:5,padding:sm?"3px 10px":"7px 16px",fontSize:sm?11:13,border:vv.b||"none",borderRadius:4,cursor:dis?"not-allowed":"pointer",fontFamily:"'JetBrains Mono',monospace",fontWeight:500,opacity:dis?0.35:1,background:vv.bg,color:vv.c,whiteSpace:"nowrap",...extStyle}}>{children}</button>;}

export function Inp({label,value,onChange,type="text",style={}}){return<div style={{display:"flex",flexDirection:"column",gap:4}}>{label&&<Lbl>{label}</Lbl>}<input type={type} value={value??""} onChange={e=>onChange(e.target.value)} style={{...SI.inp,...style}}/></div>;}

export function Sel({label,value,onChange,options,disabled=false}){return<div style={{display:"flex",flexDirection:"column",gap:4}}>{label&&<Lbl>{label}</Lbl>}<div style={{position:"relative"}}><select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled} style={{...SI.inp,paddingRight:28,cursor:disabled?"default":"pointer",opacity:disabled?0.5:1}}>{options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select><span style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:C.dim,fontSize:10}}>▾</span></div></div>;}

export function Chk({label,checked,onChange}){return<label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}><div onClick={()=>onChange(!checked)} style={{width:14,height:14,border:`1px solid ${checked?C.accent:C.inpB}`,borderRadius:3,background:checked?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{checked&&<svg width="8" height="7" viewBox="0 0 8 7"><path d="M1 3.5l2 2 4-4" stroke="#04060c" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}</div><span style={{fontSize:13,color:"#b0b0aa"}}>{label}</span></label>;}

export function SearchSel({label,value,onChange,options,freeform=false}){
  const[open,setOpen]=useState(false);const[srch,setSrch]=useState(freeform?(value||""):"");
  const sel=options.find(o=>(o.value??o)===value);
  useEffect(()=>{if(freeform)setSrch(value||"");},[value,freeform]);
  const filt=useMemo(()=>{const q=(freeform?srch:srch).toLowerCase();return options.filter(o=>{const l=(o.label??o).toLowerCase(),v=(o.value??o).toLowerCase();return!q||l.includes(q)||v.includes(q);});},[options,srch,freeform]);
  if(freeform)return<div style={{display:"flex",flexDirection:"column",gap:4}}>
    {label&&<Lbl>{label}</Lbl>}
    <div style={{position:"relative",flex:1}}>
      <input value={srch} onChange={e=>{setSrch(e.target.value);onChange(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),200)} style={{...SI.inp,width:"100%"}}/>
      {open&&<div style={{position:"absolute",top:"calc(100% + 2px)",left:0,right:0,zIndex:400,background:"#1c1c1c",border:`1px solid ${C.pb}`,borderRadius:4,maxHeight:200,overflowY:"auto"}}>
        {filt.map(o=>{const v=o.value??o,l=o.label??o;return<div key={v} onMouseDown={()=>{onChange(v);setSrch(v);setOpen(false);}} style={{padding:"6px 10px",cursor:"pointer",borderBottom:"1px solid #181818",fontSize:12,color:C.text}}>{l}</div>;})}
        {!filt.length&&<div style={{padding:"6px 10px",color:C.faint,fontSize:12}}>Custom value</div>}
      </div>}
    </div>
  </div>;
  return<div style={{display:"flex",flexDirection:"column",gap:4}}>
    {label&&<Lbl>{label}</Lbl>}
    <div style={{position:"relative"}}>
      <div onClick={()=>setOpen(v=>!v)} style={{...SI.inp,display:"flex",justifyContent:"space-between",cursor:"pointer",padding:"7px 10px"}}>
        <span style={{color:sel?C.text:C.faint}}>{sel?(sel.label??sel):"(none)"}</span>
        <span style={{color:C.dim,fontSize:10}}>▾</span>
      </div>
      {open&&<div style={{position:"absolute",top:"calc(100% + 2px)",left:0,right:0,zIndex:400,background:"#1c1c1c",border:`1px solid ${C.pb}`,borderRadius:4,boxShadow:"0 8px 30px rgba(0,0,0,.8)",maxHeight:240,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"4px 6px",borderBottom:`1px solid ${C.inpB}`}}><input autoFocus value={srch} onChange={e=>setSrch(e.target.value)} style={{...SI.inp,padding:"3px 7px",fontSize:12}}/></div>
        <div style={{overflowY:"auto",flex:1}}>
          {filt.map(o=>{const v=o.value??o,l=o.label??o;return<div key={v} onClick={()=>{onChange(v);setOpen(false);setSrch("");}} style={{padding:"6px 9px",cursor:"pointer",fontSize:12,color:C.text,background:value===v?"#1a2438":"transparent",borderBottom:"1px solid #181818"}}>{l}</div>;})}
          {!filt.length&&<div style={{padding:"9px",color:C.faint,fontSize:12}}>no results</div>}
        </div>
      </div>}
    </div>
  </div>;
}

export function Txta({label,value,onChange,rows=3}){return<div style={{display:"flex",flexDirection:"column",gap:4}}>{label&&<Lbl>{label}</Lbl>}<textarea value={value??""} onChange={e=>onChange(e.target.value)} rows={rows} style={{...SI.inp,resize:"vertical"}}/></div>;}

export function Sect({title,children,open:init=true,accent}){const[o,setO]=useState(init);return<div style={{border:`1px solid ${C.inpB}`,borderRadius:C.r,overflow:"hidden"}}><div onClick={()=>setO(v=>!v)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#191919",cursor:"pointer"}}><span style={{fontSize:12,color:accent||C.accent,fontWeight:500}}>{title}</span><span style={{color:C.faint,fontSize:10}}>{o?"▲":"▼"}</span></div>{o&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:9,background:"#141414"}}>{children}</div>}</div>;}

export function Sbar({messages}){if(!messages?.length)return null;return<div style={{display:"flex",flexDirection:"column",gap:3}}>{messages.map((m,i)=><div key={i} style={{padding:"4px 9px",borderRadius:3,fontSize:11,fontFamily:"monospace",background:m.ok?"#091a09":"#1a0909",color:m.ok?"#5acc5a":"#cc5a5a",borderLeft:`2px solid ${m.ok?"#2a6a2a":"#6a2a2a"}`}}>{m.ok?"✓":"✗"} {m.label}: {m.msg}</div>)}</div>;}

export function CopyB({code,title}){const[c,setC]=useState(false);return<div style={{background:"#0a0a0c",border:`1px solid ${C.inpB}`,borderRadius:4,overflow:"hidden"}}><div style={{display:"flex",justifyContent:"space-between",padding:"4px 9px",borderBottom:`1px solid ${C.inpB}`,background:"#141416"}}><span style={{fontSize:10,color:C.dim}}>{title}</span><Btn sm v="g" onClick={()=>{navigator.clipboard.writeText(code);setC(true);setTimeout(()=>setC(false),1200);}}>{c?"✓":"copy"}</Btn></div><pre style={{padding:"9px 11px",overflowX:"auto",fontSize:11,lineHeight:1.7,color:"#a8a8a0",whiteSpace:"pre"}}>{code}</pre></div>;}

export function Pill({children,onClick,color="#1a2438"}){return<span onClick={onClick} style={{display:"inline-flex",alignItems:"center",gap:4,background:color,borderRadius:3,padding:"2px 7px",fontSize:11,fontFamily:"monospace",cursor:onClick?"pointer":"default",whiteSpace:"nowrap"}}>{children}</span>;}

export function Dot({color,title,onClick,disabled}){return<div title={title} onClick={disabled?undefined:onClick} style={{width:13,height:13,borderRadius:"50%",background:color,cursor:disabled?"default":"pointer",flexShrink:0,opacity:disabled?0.3:1}} onMouseEnter={e=>{if(!disabled)e.currentTarget.style.opacity="0.6";}} onMouseLeave={e=>{e.currentTarget.style.opacity=disabled?"0.3":"1";}}/>;}

export function valId(id){if(!id)return"required";if(!/^[a-z0-9_]+$/.test(id))return"a-z 0-9 _ only";return null;}

export function IdField({label,value,onChange,disabled=false}){const err=valId(value);return<div style={{display:"flex",flexDirection:"column",gap:4}}><Lbl>{label||"ID"}</Lbl><input value={value} onChange={e=>onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,""))} disabled={disabled} style={{...SI.inp,border:`1px solid ${value&&err?"#6a2a2a":C.inpB}`,opacity:disabled?0.5:1}}/>{value&&err&&<span style={{fontSize:10,color:"#cc6a6a"}}>{err}</span>}</div>;}

export function ConstField({form,F}){if(!form.customConstName)return null;return<div style={{display:"flex",flexDirection:"column",gap:4}}><Lbl>Const name</Lbl><input value={form.constName} onChange={e=>F("constName",e.target.value)} style={{...SI.inp}}/></div>;}

export function AImg({url,size=52,anim=false,frames=1,ticks=4}){
  const[f,setF]=useState(0);
  useEffect(()=>{if(!anim||frames<=1)return;const id=setInterval(()=>setF(p=>(p+1)%frames),ticks*50);return()=>clearInterval(id);},[anim,frames,ticks]);
  if(!url)return<div style={{width:size,height:size,background:C.prev,border:`1px dashed ${C.inpB}`,borderRadius:4,flexShrink:0}}/>;
  if(anim&&frames>1){const pct=(f/frames)*100;return<div style={{width:size,height:size,overflow:"hidden",borderRadius:4,border:`1px solid ${C.inpB}`,background:C.prev,flexShrink:0}}><img src={url} alt="" style={{width:size,height:size*frames,imageRendering:"pixelated",transform:`translateY(-${pct}%)`,display:"block"}}/></div>;}
  return<img src={url} alt="" style={{width:size,height:size,imageRendering:"pixelated",borderRadius:4,border:`1px solid ${C.inpB}`,background:C.prev,flexShrink:0,objectFit:"contain"}}/>;
}

export function FormActions({onCancel,onSave,saving,canSave,consoleH=0,showCons=false,onDelete}){
  const bottom=showCons?consoleH+5+30:30;
  const SQ={width:52,height:52,borderRadius:C.r,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer",flexShrink:0,fontFamily:"'JetBrains Mono',monospace"};
  return<div style={{position:"fixed",bottom,right:30,display:"flex",gap:10,zIndex:200,transition:"bottom .15s"}}>
    {onDelete&&<button onClick={onDelete} style={{...SQ,background:"#3a1a1a",border:"1px solid #5a2a2a",color:"#cc5a5a"}}>🗑</button>}
    <button onClick={onCancel} style={{...SQ,background:"#2a2a2e",border:`1px solid ${C.inpB}`,color:C.dim}}>✕</button>
    <button onClick={onSave} disabled={saving||!canSave} style={{...SQ,background:saving||!canSave?"#2a2a2e":C.accent,border:"none",color:saving||!canSave?C.faint:"#06080e",opacity:saving||!canSave?0.35:1,cursor:saving||!canSave?"not-allowed":"pointer"}}>↓</button>
  </div>;
}
