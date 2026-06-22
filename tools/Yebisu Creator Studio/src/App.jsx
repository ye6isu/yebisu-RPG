import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { C, SI } from './theme.js';
import { FONT_URL, G_CSS } from './theme.js';
import { MODID, BASE, TAB_W, TAB_H } from './constants.js';
import { api, useLS, useRun } from './api.js';
import { Dot, Btn, Lbl } from './components/ui.jsx';
import CardGrid from './components/CardGrid.jsx';
import { TexProv, TexLeft, TexRight } from './pages/TexturesPage.jsx';
import { ItemProv, ItemLeft, ItemRight, ItemFullEditor } from './pages/ItemsPage.jsx';
import { BlockProv, BlockLeft, BlockRight } from './pages/BlocksPage.jsx';
import TabsPage from './pages/TabsPage.jsx';
import KeybindsPage from './pages/KeybindsPage.jsx';
import InterfacesPage from './pages/InterfacesPage.jsx';
import VariablesPage from './pages/VariablesPage.jsx';
import AttributesPage from './pages/AttributesPage.jsx';
import EffectsPage from './pages/EffectsPage.jsx';

export default function App(){
  const[tab,setTab]=useLS("ycs_active_tab","textures");
  const[textures,setTextures]=useLS("ycs_textures",[]);
  const[items,setItems]=useLS("ycs_items",[]);
  const[blocks,setBlocks]=useLS("ycs_blocks",[]);
  const[texEd,setTexEd]=useState(null);
  const[itemEd,setItemEd]=useState(null);
  const[blockEd,setBlockEd]=useState(null);
  const savedEdState=useRef({textures:null,items:null,blocks:null,activePanel:{textures:null,items:null,blocks:null},highlightFaceKey:{textures:"textureId",items:"textureId",blocks:"textureId"}});
  const[modItems,setModItems]=useState([]);const[modBlocks,setModBlocks]=useState([]);
  const[backOk,setBackOk]=useState(null);
  const[showCons,setShowCons]=useState(false);const[consH,setConsH]=useState(200);
  const[activePanel,setActivePanel]=useState(null);
  const[rightView,setRightView]=useState({mode:"methodList",editingMethod:null});
  const[highlightFaceKey,setHighlightFaceKey]=useState("textureId");
  const[tabsPageEditing,setTabsPageEditing]=useState(false);
  const[tabsPageNewTrigger,setTabsPageNewTrigger]=useState(0);
  const[tabsEditingTarget,setTabsEditingTarget]=useState(null);
  const[keybindsPageEditing,setKeybindsPageEditing]=useState(false);
  const[keybindsPageNewTrigger,setKeybindsPageNewTrigger]=useState(0);
  const[keybindsEditingTarget,setKeybindsEditingTarget]=useState(null);
  const[interfacesPageEditing,setInterfacesPageEditing]=useState(false);
  const[interfacesPageNewTrigger,setInterfacesPageNewTrigger]=useState(0);
  const[interfacesEditingTarget,setInterfacesEditingTarget]=useState(null);
  const[variablesPageEditing,setVariablesPageEditing]=useState(false);
  const[variablesPageNewTrigger,setVariablesPageNewTrigger]=useState(0);
  const[attributesPageEditing,setAttributesPageEditing]=useState(false);
  const[attributesPageNewTrigger,setAttributesPageNewTrigger]=useState(0);
  const[attributesEditingTarget,setAttributesEditingTarget]=useState(null);
  const[effectsPageEditing,setEffectsPageEditing]=useState(false);
  const[effectsPageNewTrigger,setEffectsPageNewTrigger]=useState(0);
  const[effectsEditingTarget,setEffectsEditingTarget]=useState(null);
  const[variablesEditingTarget,setVariablesEditingTarget]=useState(null);
  const{rs,running,run}=useRun();
  const isElectron=typeof window!=="undefined"&&window.ycsNative?.isElectron;
  const native=typeof window!=="undefined"?window.ycsNative:null;
  const isRunning=rs.state.startsWith("running");

  useEffect(()=>{fetch(`${BASE}/health`).then(r=>r.json()).then(()=>setBackOk(true)).catch(()=>setBackOk(false));},[]);
  useEffect(()=>{setActivePanel(null);setHighlightFaceKey("textureId");},[!!texEd,!!itemEd,!!blockEd,texEd?.target?.id,itemEd?.target?.id,blockEd?.target?.id]);
  const reloadMod=()=>{fetch(`${BASE}/items/read`).then(r=>r.json()).then(j=>{if(j.ok)setModItems(j.items||[]);}).catch(()=>{});fetch(`${BASE}/blocks/read`).then(r=>r.json()).then(j=>{if(j.ok)setModBlocks(j.blocks||[]);}).catch(()=>{});};
  useEffect(()=>{ reloadMod(); },[]);
  const onConsDrag=e=>{e.preventDefault();const sy=e.clientY,sh=consH;const mv=ev=>setConsH(Math.max(80,Math.min(480,sh-(ev.clientY-sy))));const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);};
  const allItems=useMemo(()=>{const m=new Map();modItems.forEach(x=>m.set(x.id,{...x,source:"mod"}));items.forEach(x=>m.set(x.id,{...x,source:"local"}));return[...m.values()];},[items,modItems]);
  const allBlocks=useMemo(()=>{const m=new Map();modBlocks.forEach(x=>m.set(x.id,{...x,source:"mod"}));blocks.forEach(x=>m.set(x.id,{...x,source:"local"}));return[...m.values()];},[blocks,modBlocks]);

  useEffect(()=>{
    if(!modItems.length)return;
    const modIds=new Set(modItems.map(x=>x.id));
    setItems(arr=>{
      const filtered=arr.filter(x=>modIds.has(x.id)||!x.id);
      return filtered.length!==arr.length?filtered:arr;
    });
  },[modItems]);
  useEffect(()=>{
    if(!modBlocks.length)return;
    const modIds=new Set(modBlocks.map(x=>x.id));
    setBlocks(arr=>{
      const filtered=arr.filter(x=>modIds.has(x.id)||!x.id);
      return filtered.length!==arr.length?filtered:arr;
    });
  },[modBlocks]);
  const texEntries=useMemo(()=>textures.map(t=>({...t,displayName:t.label,previewDataUrl:t.dataUrl})),[textures]);
  const itemEntries=useMemo(()=>allItems.map(x=>{const t=textures.find(tx=>tx.id===x.textureId);return{...x,previewDataUrl:t?.dataUrl||x.textureDataUrl,isSpritesheet:t?.isSpritesheet,isAnimated:t?.isAnimated,frames:t?.frames,ticksPerFrame:t?.ticksPerFrame,defaultFrame:t?.defaultFrame};}), [allItems,textures]);
  const blockEntries=useMemo(()=>allBlocks.map(x=>{const t=textures.find(tx=>tx.id===x.textureId);return{...x,previewDataUrl:t?.dataUrl||x.textureDataUrl,isSpritesheet:t?.isSpritesheet,isAnimated:t?.isAnimated,frames:t?.frames,ticksPerFrame:t?.ticksPerFrame,defaultFrame:t?.defaultFrame};}), [allBlocks,textures]);
  const delTex=id=>setTextures(arr=>arr.filter(x=>x.id!==id));
  const delItem=async id=>{const item=allItems.find(x=>x.id===id);if(!item)return;const CN=item.constName||id.toUpperCase();await api("/items/delete",{id,constName:CN});if(item.customItemClass)await api("/items/custom-class/delete",{className:item.customItemClass});await api("/texture/delete",{filename:`${id}.png`,folder:"item"});if(item.holdingMode==="3d")await api("/geo/delete",{id,type:"item",constName:CN});setItems(arr=>arr.filter(x=>x.id!==id));reloadMod();};
  const delBlock=async id=>{const b=allBlocks.find(x=>x.id===id);if(!b)return;await api("/blocks/delete",{id,constName:b.constName||id.toUpperCase()});await api("/texture/delete",{filename:`${id}.png`,folder:"block"});setBlocks(arr=>arr.filter(x=>x.id!==id));reloadMod();};
  const saveItem=(item,oldId)=>{setItems(arr=>{const searchId=oldId||item.id;const i=arr.findIndex(x=>x.id===searchId);return i>=0?arr.map((x,j)=>j===i?item:x):[...arr,item];});reloadMod();setItemEd(null);savedEdState.current.items=null;};
  const saveBlock=(block,oldId)=>{setBlocks(arr=>{const searchId=oldId||block.id;const i=arr.findIndex(x=>x.id===searchId);return i>=0?arr.map((x,j)=>j===i?block:x):[...arr,block];});reloadMod();setBlockEd(null);savedEdState.current.blocks=null;};
  const saveTex=tex=>{const id=tex.label.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");if(texEd?.mode==="edit"){setTextures(arr=>arr.map(x=>x.id===texEd.target?.id?{...tex,id,savedAt:Date.now()}:x));}else setTextures(arr=>[...arr,{...tex,id,savedAt:Date.now()}]);setTexEd(null);savedEdState.current.textures=null;};
  const switchTab=t=>{
    const cur=tab;
    savedEdState.current[cur]=cur==="textures"?texEd:cur==="items"?itemEd:blockEd;
    savedEdState.current.activePanel[cur]=activePanel;
    savedEdState.current.highlightFaceKey[cur]=highlightFaceKey;
    const saved=savedEdState.current[t];
    const savedPanel=savedEdState.current.activePanel[t];
    const savedFaceKey=savedEdState.current.highlightFaceKey[t]||"textureId";
    setTab(t);
    if(t==="textures")setTexEd(saved||null);
    else if(t==="items")setItemEd(saved||null);
    else setBlockEd(saved||null);
    setActivePanel(savedPanel||null);
    setHighlightFaceKey(savedFaceKey);
  };
  const inEd=(tab==="textures"&&texEd!=null)||(tab==="items"&&itemEd!=null)||(tab==="blocks"&&blockEd!=null);
  const fabBottom=showCons?consH+5+30:30;
  const ALL_TABS=[{id:"textures",l:"Textures"},{id:"items",l:"Items"},{id:"blocks",l:"Blocks"},{id:"tabs",l:"Tabs"},{id:"keybinds",l:"Keybinds"},{id:"interfaces",l:"Interfaces"},{id:"variables",l:"Variables"},{id:"attributes",l:"Attributes"},{id:"effects",l:"Effects"}];
  const[tabOrder,setTabOrder]=useLS("ycs_tab_order",ALL_TABS.map(t=>t.id));
  const TABS=useMemo(()=>{
    const byId=new Map(ALL_TABS.map(t=>[t.id,t]));
    const known=tabOrder.filter(id=>byId.has(id));
    const missing=ALL_TABS.filter(t=>!known.includes(t.id)).map(t=>t.id);
    return[...known,...missing].map(id=>byId.get(id));
  },[tabOrder]);
  const[tabDragIdx,setTabDragIdx]=useState(null);
  const moveTab=(from,to)=>{if(from==null||to==null||from===to)return;const ids=TABS.map(t=>t.id);const[m]=ids.splice(from,1);ids.splice(to,0,m);setTabOrder(ids);};
  const tabStripRef=useRef(null);
  const onTabStripWheel=e=>{if(!tabStripRef.current)return;if(e.deltaY===0)return;e.preventDefault();tabStripRef.current.scrollLeft+=e.deltaY;};

  const renderPane=()=>{
    if(tab==="textures"){
      if(texEd){const init=texEd.target||null;return<TexProv initial={init}><div style={{display:"flex",gap:5,flex:1,overflow:"hidden",minHeight:0}}><div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}><div style={{flex:1,overflowY:"auto"}}><TexLeft initial={init} onSave={saveTex} onCancel={()=>setTexEd(null)}/></div></div><div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}><TexRight/></div></div></TexProv>;}
      return<div style={{flex:1,background:C.panel,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:0}}><CardGrid entries={texEntries} emptyLabel="No textures yet." onDelete={delTex} onOpen={e=>setTexEd({mode:"edit",target:e})}/></div>;
    }
    if(tab==="items"){
      if(itemEd){const init=itemEd.target||null;
      const cancelItem=async()=>{
        if(!init){
          const lf=itemEd.liveForm;
          if(lf?.id){
            const CN=lf.customConstName?lf.constName:(lf.id||"").toUpperCase();
            await api("/items/delete",{id:lf.id,constName:CN});
          }
          if(lf?.customItemClass){
            await api("/items/custom-class/delete",{className:lf.customItemClass});
          }
        }
        setItemEd(null);savedEdState.current.items=null;
        setActivePanel(null);setRightView({mode:"methodList",editingMethod:null});
      };
      const deleteItemFromEditor=init?async()=>{await delItem(init.id);setItemEd(null);savedEdState.current.items=null;setActivePanel(null);setRightView({mode:"methodList",editingMethod:null});}:undefined;
      const inItemVisualEditor=activePanel==="customclass"&&rightView?.mode==="visualEditor";
      return<ItemProv initial={init} formOverride={itemEd.liveForm||null} onFormChange={f=>setItemEd(e=>({...e,liveForm:f}))}>
        {inItemVisualEditor
          ?<ItemFullEditor rightView={rightView} setRightView={setRightView} setActivePanel={setActivePanel}/>
          :<div style={{display:"flex",gap:5,flex:1,overflow:"hidden",minHeight:0}}><div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}><div style={{flex:1,overflowY:"auto"}}><ItemLeft textures={textures} initial={init} isEdit={!!init} onSave={saveItem} onCancel={cancelItem} onDelete={deleteItemFromEditor} modItems={allItems} showCons={showCons} consoleH={consH} activePanel={activePanel} setActivePanel={setActivePanel} rightView={rightView} setRightView={setRightView}/></div></div><div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}><ItemRight textures={textures} modItems={allItems} activePanel={activePanel} setActivePanel={setActivePanel} rightView={rightView} setRightView={setRightView}/></div></div>}
      </ItemProv>;}
      return<div style={{flex:1,background:C.panel,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:0}}><CardGrid entries={itemEntries} emptyLabel="No items yet." onDelete={delItem} onOpen={e=>setItemEd({target:e})}/></div>;
    }
    if(tab==="blocks"){
      if(blockEd){const init=blockEd.target||null;
      const cancelBlock=async()=>{
        if(!init){
          const lf=blockEd.liveForm;
          if(lf?.id){
            const CN=lf.customConstName?lf.constName:(lf.id||"").toUpperCase();
            await api("/blocks/delete",{id:lf.id,constName:CN});
          }
        }
        setBlockEd(null);savedEdState.current.blocks=null;
        setActivePanel(null);
      };
      const deleteBlockFromEditor=init?async()=>{await delBlock(init.id);setBlockEd(null);savedEdState.current.blocks=null;setActivePanel(null);}:undefined;
      return<BlockProv initial={init} formOverride={blockEd.liveForm||null} onFormChange={f=>setBlockEd(e=>({...e,liveForm:f}))}><div style={{display:"flex",gap:5,flex:1,overflow:"hidden",minHeight:0}}><div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}><div style={{flex:1,overflowY:"auto"}}><BlockLeft textures={textures} initial={init} isEdit={!!init} onSave={saveBlock} onCancel={cancelBlock} onDelete={deleteBlockFromEditor} modItems={allItems} modBlocks={allBlocks} showCons={showCons} consoleH={consH} activePanel={activePanel} setActivePanel={setActivePanel} setHighlightFaceKey={setHighlightFaceKey}/></div></div><div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}><BlockRight textures={textures} modItems={allItems} modBlocks={allBlocks} activePanel={activePanel} setActivePanel={setActivePanel} highlightFaceKey={highlightFaceKey}/></div></div></BlockProv>;}
      return<div style={{flex:1,background:C.panel,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:0}}><CardGrid entries={blockEntries} emptyLabel="No blocks yet." onDelete={delBlock} onOpen={e=>setBlockEd({target:e})}/></div>;
    }
    if(tab==="tabs"){
      return<TabsPage allItems={allItems} allBlocks={allBlocks} textures={textures} reloadMod={reloadMod} onEditingChange={setTabsPageEditing} newTrigger={tabsPageNewTrigger} editing={tabsEditingTarget} setEditing={setTabsEditingTarget}/>;
    }
    if(tab==="keybinds"){
      return<KeybindsPage reloadMod={reloadMod} onEditingChange={setKeybindsPageEditing} newTrigger={keybindsPageNewTrigger} editing={keybindsEditingTarget} setEditing={setKeybindsEditingTarget}/>;
    }
    if(tab==="interfaces"){
      return<InterfacesPage onEditingChange={setInterfacesPageEditing} newTrigger={interfacesPageNewTrigger} editing={interfacesEditingTarget} setEditing={setInterfacesEditingTarget}/>;
    }
    if(tab==="variables"){
      return<VariablesPage onEditingChange={setVariablesPageEditing} newTrigger={variablesPageNewTrigger} editing={variablesEditingTarget} setEditing={setVariablesEditingTarget} allItems={allItems} textures={textures}/>;
    }
    if(tab==="attributes"){
      return<AttributesPage onEditingChange={setAttributesPageEditing} newTrigger={attributesPageNewTrigger} editing={attributesEditingTarget} setEditing={setAttributesEditingTarget}/>;
    }
    if(tab==="effects"){
      return<EffectsPage onEditingChange={setEffectsPageEditing} newTrigger={effectsPageNewTrigger} editing={effectsEditingTarget} setEditing={setEffectsEditingTarget} textures={textures} showCons={showCons} consoleH={consH}/>;
    }
    return null;
  };

  return<>
    <style>{FONT_URL}{G_CSS}</style>
    <div style={{height:"100vh",background:C.bg,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{height:36,background:"#1c1c1c",display:"flex",alignItems:"center",flexShrink:0,WebkitAppRegion:"drag",zIndex:30}}>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,pointerEvents:"none"}}>
          {isRunning&&<span style={{fontSize:10,color:"#5a9fd4",fontFamily:"monospace"}}>⟳ {rs.state}…</span>}
          {rs.state==="error"&&<span style={{fontSize:10,color:"#cc6a6a",fontFamily:"monospace"}}>✗ failed</span>}
          {rs.dirty&&!isRunning&&<span style={{fontSize:10,color:C.accent,fontFamily:"monospace"}}>datagen dirty</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,paddingRight:13,WebkitAppRegion:"no-drag"}}>
          {isElectron&&<><Dot color="#febb2e" title="Minimize" onClick={()=>native.minimize()}/><Dot color="#29c840" title="Maximize" onClick={()=>native.maximize()}/><Dot color="#ff5f57" title="Close" onClick={()=>native.close()}/></>}
          {!isElectron&&<span style={{fontSize:10,color:backOk===false?"#cc6a6a":backOk===true?"#5acc5a":"#555",fontFamily:"monospace"}}>{backOk===false?"⚠ offline":backOk===true?"● live":"…"}</span>}
        </div>
      </div>

      <div style={{height:36,background:C.tabBar,display:"flex",alignItems:"center",paddingLeft:8,flexShrink:0,zIndex:20}}>
        <div ref={tabStripRef} onWheel={onTabStripWheel} style={{display:"flex",alignItems:"flex-end",alignSelf:"stretch",flex:1,overflowX:"auto",scrollbarWidth:"none"}}>
          {TABS.map((t,i)=>{const a=tab===t.id;return<button key={t.id}
            draggable
            onDragStart={()=>setTabDragIdx(i)}
            onDragOver={e=>e.preventDefault()}
            onDrop={()=>{moveTab(tabDragIdx,i);setTabDragIdx(null);}}
            onDragEnd={()=>setTabDragIdx(null)}
            onClick={()=>switchTab(t.id)}
            style={{width:TAB_W,height:TAB_H,background:a?C.bg:"#2e2e2e",border:"none",borderRadius:"6.5px 6.5px 0 0",color:C.text,fontSize:12,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,cursor:"grab",flexShrink:0,marginRight:3,opacity:tabDragIdx===i?0.4:a?1:0.65}}>{t.l}</button>;})}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,paddingRight:13,WebkitAppRegion:"no-drag",flexShrink:0}}>
          <Dot color={showCons?"#e4e5e9":"#3a3a3c"} title={showCons?"Hide console":"Show console"} onClick={()=>setShowCons(v=>!v)}/>
          <Dot color={isRunning||running?"#555":"#e4e5e9"} title="RunData" disabled={isRunning||running} onClick={()=>run("/run/data")}/>
          <Dot color={isRunning||running?"#555":"#e4e5e9"} title={rs.dirty?"RunData then RunClient":"RunClient"} disabled={isRunning||running} onClick={()=>run("/run/client")}/>
        </div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0,padding:`5px 5px ${showCons?0:5}px 5px`,gap:5}}>
        {renderPane()}
      </div>
      {!inEd&&!(tab==="tabs"&&tabsPageEditing)&&!(tab==="keybinds"&&keybindsPageEditing)&&!(tab==="interfaces"&&interfacesPageEditing)&&!(tab==="variables"&&variablesPageEditing)&&!(tab==="attributes"&&attributesPageEditing)&&!(tab==="effects"&&effectsPageEditing)&&<div onClick={()=>{if(tab==="textures")setTexEd({mode:"new"});else if(tab==="items")setItemEd({});else if(tab==="blocks")setBlockEd({});else if(tab==="tabs")setTabsPageNewTrigger(t=>t+1);else if(tab==="keybinds")setKeybindsPageNewTrigger(t=>t+1);else if(tab==="interfaces")setInterfacesPageNewTrigger(t=>t+1);else if(tab==="variables")setVariablesPageNewTrigger(t=>t+1);else if(tab==="attributes")setAttributesPageNewTrigger(t=>t+1);else if(tab==="effects")setEffectsPageNewTrigger(t=>t+1);}} style={{position:"fixed",right:30,bottom:fabBottom,width:52,height:52,background:"#3a3a3c",borderRadius:C.r,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:28,color:C.text,boxShadow:"0 4px 20px rgba(0,0,0,.6)",zIndex:100,transition:"bottom .15s"}} onMouseEnter={e=>e.currentTarget.style.background="#4a4a4c"} onMouseLeave={e=>e.currentTarget.style.background="#3a3a3c"}>+</div>}
      {showCons&&<div style={{flexShrink:0,padding:"0 5px 5px"}}>
        <div onMouseDown={onConsDrag} style={{height:7,cursor:"ns-resize",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:36,height:3,borderRadius:2,background:"#2e2e2e"}}/></div>
        <div style={{height:consH,background:"#0a0a0a",border:`1px solid ${C.pb}`,borderRadius:C.r,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",padding:"3px 10px",borderBottom:"1px solid #181818",background:"#141414",flexShrink:0,gap:6}}>
            {rs.state==="error"&&<span style={{fontSize:10,background:"#200e0e",color:"#ff7777",padding:"1px 6px",borderRadius:3}}>error</span>}
            {rs.dirty&&<span style={{fontSize:10,background:"#181408",color:C.accent,padding:"1px 6px",borderRadius:3}}>dirty</span>}
            {!rs.dirty&&rs.state==="idle"&&<span style={{fontSize:10,background:"#091409",color:"#5acc5a",padding:"1px 6px",borderRadius:3}}>clean</span>}
            {isRunning&&<span style={{fontSize:10,color:C.dim,fontFamily:"monospace"}}>⟳ {rs.state}…</span>}
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"6px 12px",fontFamily:"monospace",fontSize:11,lineHeight:1.7}}>
            {!rs.log.length&&<div style={{color:"#1e1e1e"}}>No output yet.</div>}
            {rs.log.slice(-300).map((l,i)=><div key={i} style={{color:l.includes("[err]")||l.includes("FAILED")?"#cc6a6a":l.includes("BUILD SUCCESS")?"#5acc5a":"#3a3a3a",whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{l}</div>)}
          </div>
        </div>
      </div>}
    </div>
  </>;
}
