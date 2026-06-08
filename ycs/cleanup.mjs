// Block editor rewrite
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const appPath = join(__dirname, 'src/App.jsx');
let code = readFileSync(appPath, 'utf8');
const before = code.length;

// 1. BLOCK_PALETTE already replaced — skip
console.log('BLOCK_PALETTE already clean, skipping step 1');

// 2. Replace VisualEditorPanel+CanvasBlock through MethodListPanel
const vp = code.indexOf('\nfunction VisualEditorPanel(');
const mlp = code.indexOf('\nfunction MethodListPanel(');
if (vp < 0 || mlp < 0) { console.error('VP/MLP not found',{vp,mlp}); process.exit(1); }

const NEW_VP = `
function VisualEditorPanel({methodKey,form,F,onBack,className}){
  const def=ITEM_METHODS.find(m=>m.key===methodKey);
  const init=()=>{const s=(form.methodBlocks||{})[methodKey];return s?.some(n=>n.id==="start")?s:[{id:"start",opcode:"start",x:60,y:60,fields:{},slots:{},nextId:null}];};
  const[nodes,setNodes]=useState(init);
  const[saving,setSaving]=useState(false);
  const[saveStatus,setSaveStatus]=useState(null);
  const[pan,setPan]=useState({x:0,y:0});
  const[cf,setCf]=useState(null);
  const canvasRef=useRef();
  const ip=useRef(false),ps=useRef(null),dn=useRef(null);
  useEffect(()=>{F("methodBlocks",{...(form.methodBlocks||{}),[methodKey]:nodes});},[nodes]);
  const upd=fn=>setNodes(fn);
  const add=(bd,x,y)=>{
    const id=bd.opcode+"_"+Date.now();
    upd(ns=>[...ns,{id,opcode:bd.opcode,x,y,nextId:null,linkType:bd.linkType||null,isAction:bd.isAction||false,slotDefs:bd.slotDefs||[],
      fields:bd.opcode==="effect.apply"?{effect:"MobEffects.REGENERATION",duration:"200",level:"1"}:bd.opcode==="number.literal"?{value:"1"}:{},slots:{}}]);
  };
  const del=id=>{
    if(id==="start")return;
    upd(ns=>{
      const td=new Set([id]);
      const node=ns.find(n=>n.id===id);
      if(node?.isAction){let c=node.nextId;while(c){td.add(c);c=ns.find(n=>n.id===c)?.nextId||null;}}
      return ns.filter(n=>!td.has(n.id)).map(n=>({...n,nextId:td.has(n.nextId)?null:n.nextId,slots:Object.fromEntries(Object.entries(n.slots||{}).map(([k,v])=>[k,td.has(v)?null:v]))}));
    });
  };
  const onMD=e=>{if(e.target===canvasRef.current||e.target.classList.contains("canvas-bg")){ip.current=true;ps.current={mx:e.clientX,my:e.clientY,px:pan.x,py:pan.y};}};
  const onMM=e=>{
    if(ip.current&&ps.current)setPan({x:ps.current.px+(e.clientX-ps.current.mx),y:ps.current.py+(e.clientY-ps.current.my)});
    if(dn.current){
      const{id,ox,oy}=dn.current;const r=canvasRef.current?.getBoundingClientRect();if(!r)return;
      const nx=e.clientX-r.left-pan.x-ox,ny=e.clientY-r.top-pan.y-oy;
      upd(ns=>{const node=ns.find(n=>n.id===id);if(!node)return ns;const dx=nx-node.x,dy=ny-node.y;
        const ch=new Set([id]);if(id!=="start"){let c=node.nextId;while(c){ch.add(c);c=ns.find(n=>n.id===c)?.nextId||null;}}
        return ns.map(n=>ch.has(n.id)?{...n,x:n.x+dx,y:n.y+dy}:n);});
    }
  };
  const onMU=()=>{ip.current=false;dn.current=null;ps.current=null;if(cf)setCf(null);};
  const onDrop=e=>{
    e.preventDefault();const data=e.dataTransfer.getData("block");if(!data)return;
    const bd=JSON.parse(data);const r=canvasRef.current.getBoundingClientRect();
    add(bd,e.clientX-r.left-pan.x-100,e.clientY-r.top-pan.y-20);
  };
  const save=async()=>{
    setSaving(true);setSaveStatus(null);
    const j=await api("/items/custom-class/read",{className});
    if(!j.ok){setSaving(false);setSaveStatus({ok:false,msg:j.reason});return;}
    let c2=j.code;
    const bm="//YCS:"+methodKey+":body",st="//YCS:"+methodKey+":start";
    if(!c2.includes(bm)&&c2.includes(st)){const d2=ITEM_METHODS.find(m=>m.key===methodKey);if(d2){c2=ycsRemoveMethod(c2,methodKey);c2=ycsInjectMethod(c2,methodKey);c2=ycsSyncImports(c2,ycsGetEnabledMethods(c2));}}
    const sn=nodes.find(n=>n.id==="start");
    const bl=sn?.nextId?compileChain(sn.nextId,nodes,methodKey):[];
    const j2=await api("/items/custom-class/write",{className,code:ycsInjectCompiledBody(c2,methodKey,bl)});
    setSaving(false);setSaveStatus({ok:j2.ok,msg:j2.ok?"saved":"error: "+(j2.reason||"?")});
    if(j2.ok)setTimeout(()=>{setSaveStatus(null);onBack();},700);
  };
  const sn=nodes.find(n=>n.id==="start");
  const ch=new Set(["start"]);if(sn){let c=sn.nextId;while(c){ch.add(c);c=nodes.find(n=>n.id===c)?.nextId||null;}}
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
      <div style={{width:190,borderRight:"1px solid "+C.inpB,overflowY:"auto",flexShrink:0,background:"#111113",userSelect:"none"}}>
        {PALETTE_BLOCKS.map(cat=><div key={cat.category}>
          <div style={{padding:"6px 10px 4px",background:"#141416",borderBottom:"1px solid "+C.inpB}}><Lbl>{cat.category}</Lbl></div>
          {cat.blocks.map(b=><div key={b.opcode} draggable onDragStart={e=>e.dataTransfer.setData("block",JSON.stringify(b))} title={b.hint}
            style={{display:"flex",alignItems:"center",gap:7,padding:"8px 10px",cursor:"grab",borderBottom:"1px solid #181818",userSelect:"none",
              background:b.linkType===LINK_ENTITY?"#18282f":b.linkType===LINK_NUMBER?"#18222a":b.isAction?"#1a2a20":"transparent"}}>
            <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:b.linkType===LINK_ENTITY?"#638999":b.linkType===LINK_NUMBER?"#6a8fa8":"#5a9a6a"}}/>
            <span style={{fontSize:12,color:C.text,fontFamily:"monospace"}}>{b.label}</span>
          </div>)}
        </div>)}
      </div>
      <div ref={canvasRef} className="canvas-bg"
        style={{flex:1,position:"relative",overflow:"hidden",background:"#0d0d0f",backgroundImage:"radial-gradient(circle,#1a1a1e 1px,transparent 1px)",backgroundSize:"24px 24px"}}
        onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onDragOver={e=>e.preventDefault()} onDrop={onDrop}>
        {nodes.length===1&&!nodes[0].nextId&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none",textAlign:"center",color:C.faint}}>
          <div style={{fontSize:28,marginBottom:8,opacity:.3}}>{"</>"}</div>
          <div style={{fontSize:12,marginBottom:4}}>drag blocks here</div>
          <div style={{fontSize:10,color:"#2a4050"}}>connect to Start to run</div>
        </div>}
        <div style={{position:"absolute",left:0,top:0,transform:"translate("+pan.x+"px,"+pan.y+"px)"}}>
          {nodes.map(node=><CanvasNode key={node.id} node={node} nodes={nodes} methodKey={methodKey} inChain={ch.has(node.id)}
            onDragStart={(ox,oy)=>{dn.current={id:node.id,ox,oy};}}
            onDelete={()=>del(node.id)}
            onFieldChange={(f,v)=>upd(ns=>ns.map(n=>n.id===node.id?{...n,fields:{...n.fields,[f]:v}}:n))}
            onConnectChain={tid=>upd(ns=>ns.map(n=>n.id===node.id?{...n,nextId:tid}:n))}
            onDisconnectChain={()=>upd(ns=>ns.map(n=>n.id===node.id?{...n,nextId:null}:n))}
            onConnectSlot={(sk,vid)=>upd(ns=>ns.map(n=>n.id===node.id?{...n,slots:{...n.slots,[sk]:vid}}:n))}
            onDisconnectSlot={sk=>upd(ns=>ns.map(n=>n.id===node.id?{...n,slots:{...n.slots,[sk]:null}}:n))}
            cf={cf} onStartCf={(sk,a)=>setCf({nodeId:node.id,slotKey:sk,accepts:a})}
            onCompleteCf={(fid,fs,a)=>{if(node.linkType===a){upd(ns=>ns.map(n=>n.id===fid?{...n,slots:{...n.slots,[fs]:node.id}}:n));setCf(null);}}}
          />)}
        </div>
      </div>
    </div>
  </div>;
}

function CanvasNode({node,nodes,methodKey,inChain,onDragStart,onDelete,onFieldChange,onConnectChain,onDisconnectChain,onConnectSlot,onDisconnectSlot,cf,onStartCf,onCompleteCf}){
  const isSt=node.id==="start",isAct=node.isAction||isSt,isVal=!!node.linkType;
  const cc=node.linkType===LINK_ENTITY?"#638999":node.linkType===LINK_NUMBER?"#6a8fa8":"#5a9a6a";
  return <div
    style={{position:"absolute",left:node.x,top:node.y,minWidth:isVal?90:230,
      background:isSt?"#0e1e30":(!inChain&&isAct)?"#1a1a1a":isAct?"#1a2a20":node.linkType===LINK_ENTITY?"#162028":"#16202a",
      border:"1.5px solid "+(isSt?C.accent:(!inChain&&isAct)?"#2a2a2a":inChain?"#2a4a30":"#222830"),
      borderRadius:6,boxShadow:"0 3px 14px rgba(0,0,0,.55)",userSelect:"none",zIndex:1,opacity:(!inChain&&isAct&&!isSt)?0.6:1}}
    onMouseDown={e=>{e.stopPropagation();if(cf&&isVal){onCompleteCf(cf.nodeId,cf.slotKey,cf.accepts);return;}const r=e.currentTarget.getBoundingClientRect();onDragStart(e.clientX-r.left,e.clientY-r.top);}}
    draggable={!isSt} onDragStart={e=>{e.stopPropagation();e.dataTransfer.setData("chain",node.id);const r=e.currentTarget.getBoundingClientRect();onDragStart(e.clientX-r.left,e.clientY-r.top);}}>
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",borderBottom:"1px solid rgba(255,255,255,.05)",cursor:"grab",background:isSt?"#0a1828":"transparent"}}>
      {isVal&&<div style={{width:8,height:8,borderRadius:"50%",background:cc,flexShrink:0}}/>}
      <span style={{fontFamily:"monospace",fontSize:11,color:isSt?C.accent:C.text,fontWeight:500,flex:1}}>
        {isSt?"Start: "+(ITEM_METHODS.find(m=>m.key===methodKey)?.label||methodKey)
         :node.opcode==="entity.event"?"Event Entity -> "+resolveEntityVar("entity.event",methodKey)
         :node.opcode==="entity.target"?"Target Entity -> "+resolveEntityVar("entity.target",methodKey)
         :node.opcode==="number.literal"?"Number"
         :node.opcode==="effect.apply"?"Add Effect"
         :node.opcode}
      </span>
      {!inChain&&isAct&&!isSt&&<span style={{fontSize:9,color:"#666"}} title="Not connected to Start">!</span>}
      {!isSt&&<span onClick={e=>{e.stopPropagation();onDelete();}} style={{color:"#553333",fontSize:11,cursor:"pointer",padding:"0 3px"}}>x</span>}
    </div>
    <div style={{padding:"6px 8px",display:"flex",flexDirection:"column",gap:5}}>
      {node.opcode==="number.literal"&&<input value={node.fields?.value??"0"} onChange={e=>{e.stopPropagation();onFieldChange("value",e.target.value);}} onMouseDown={e=>e.stopPropagation()}
        style={{width:70,background:"#0e161e",border:"1px solid #2a3a4a",borderRadius:3,padding:"3px 6px",color:C.text,fontSize:12,fontFamily:"monospace",outline:"none"}}/>}
      {node.opcode==="effect.apply"&&<div style={{display:"flex",flexDirection:"column",gap:5}}>
        <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
          <span style={{fontSize:10,color:C.dim,fontFamily:"monospace"}}>to</span>
          <SlotConn sk="entity" accepts={LINK_ENTITY} sc="#638999" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDis={()=>onDisconnectSlot("entity")} onSt={onStartCf}/>
          <input value={node.fields?.effect??"MobEffects.REGENERATION"} onChange={e=>{e.stopPropagation();onFieldChange("effect",e.target.value);}} onMouseDown={e=>e.stopPropagation()} placeholder="effect"
            style={{flex:1,minWidth:100,background:"#0e161e",border:"1px solid #2a3a4a",borderRadius:3,padding:"3px 6px",color:C.text,fontSize:11,fontFamily:"monospace",outline:"none"}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <span style={{fontSize:10,color:C.dim,fontFamily:"monospace"}}>dur</span>
          <SlotConn sk="duration" accepts={LINK_NUMBER} sc="#6a8fa8" connId={node.slots?.duration} nodes={nodes} mk={methodKey} onDis={()=>onDisconnectSlot("duration")} onSt={onStartCf}/>
          <span style={{fontSize:10,color:C.dim,fontFamily:"monospace"}}>lvl</span>
          <SlotConn sk="level" accepts={LINK_NUMBER} sc="#6a8fa8" connId={node.slots?.level} nodes={nodes} mk={methodKey} onDis={()=>onDisconnectSlot("level")} onSt={onStartCf}/>
        </div>
      </div>}
    </div>
    {isAct&&<div style={{display:"flex",justifyContent:"center",paddingBottom:5}}>
      <div onMouseDown={e=>{e.stopPropagation();if(node.nextId)onDisconnectChain();}}
        onDrop={e=>{e.stopPropagation();const d=e.dataTransfer.getData("chain");if(d&&d!==node.id)onConnectChain(d);}} onDragOver={e=>e.preventDefault()}
        title={node.nextId?"click to disconnect":"drag action here to chain"}
        style={{width:12,height:12,borderRadius:"50%",cursor:"pointer",background:node.nextId?C.accent:"#2a2a30",border:"2px solid "+(node.nextId?C.accent:"#3a3a44"),boxShadow:node.nextId?"0 0 6px "+C.accent+"44":""}}/>
    </div>}
  </div>;
}

function SlotConn({sk,accepts,sc,connId,nodes,mk,onDis,onSt}){
  const[hov,setHov]=useState(false);
  const cn=connId?nodes.find(n=>n.id===connId):null;
  const lbl=cn?(cn.opcode==="entity.event"?resolveEntityVar("entity.event",mk):cn.opcode==="entity.target"?resolveEntityVar("entity.target",mk):cn.opcode==="number.literal"?(cn.fields?.value??"?"):cn.opcode):null;
  return <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    onMouseDown={e=>{e.stopPropagation();if(connId){onDis();return;}onSt(sk,accepts);}}
    title={connId?"click to disconnect":"connect "+accepts}
    style={{display:"flex",alignItems:"center",gap:4,padding:lbl?"2px 6px":"0",
      background:connId?sc+"22":hov?"#1a2a38":"transparent",border:"1.5px solid "+(connId?sc:hov?sc+"88":"#2a3a44"),
      borderRadius:10,cursor:"pointer",minWidth:16,height:16,transition:"all .15s"}}>
    <div style={{width:7,height:7,borderRadius:"50%",background:connId?sc:"#2a3a44",flexShrink:0}}/>
    {lbl&&<span style={{fontSize:9,color:sc,fontFamily:"monospace",whiteSpace:"nowrap"}}>{lbl}</span>}
  </div>;
}

`;
code = code.slice(0, vp) + NEW_VP + code.slice(mlp);
console.log('+ Replaced VP/CanvasNode/SlotConn');

// 3. Remove old compileBlock etc
for (const fn of ['resolveSlot','compileBlock','compileInlineExpr','compileMethodBlocks']) {
  const s = code.indexOf('\nfunction ' + fn + '(');
  if (s < 0) { console.log('  ' + fn + ' gone'); continue; }
  const e = code.indexOf('\nfunction ', s + 1);
  if (e < 0) { console.log('  ' + fn + ' no end'); continue; }
  code = code.slice(0, s) + code.slice(e);
  console.log('- Removed ' + fn);
}

code = code.replace(/\n{3,}/g, '\n\n');
writeFileSync(appPath, code, 'utf8');
console.log('Done ' + before + ' -> ' + code.length);





