import React, { useState, useCallback, useContext, useMemo } from "react";
import { C, SI } from "../theme.js";
import { FormCtx } from "../context.js";
import { Lbl, Btn, Inp, Sel, Chk, Sbar, AImg, ConstField, FormActions, SearchSel, valId } from "../components/ui.jsx";
import EditRow from "../components/EditRow.jsx";
import { MODID, TIERS, TOOL_TYPES, VANILLA_EFFECTS, SMELT_TYPES } from "../constants.js";
import { api, useCreativeTabs } from "../api.js";
import { gItemCode, gRecipe, gTTKeys, idToClassName } from "../codegen/items.js";
import { ycsInjectFeature, ycsRemoveFeature } from "../codegen/ycs.js";
import { VisualEditorPanel } from "../components/VisualEditor.jsx";
import RightPaneShell from "../panels/RightPaneShell.jsx";

export const ITEM_DEF={id:"",constName:"",customConstName:false,displayName:"",textureId:"",isTool:false,isFood:false,isFuel:false,hasDurability:false,durability:"100",hasUseDuration:false,useDuration:"72000",customItemClass:"",toolType:"Sword",tier:"Iron",damage:"3",speed:"-2.4",burnTime:"1600",holdingMode:"none",maxStackSize:"64",foodNutrition:"3",foodSaturation:"0.3",foodAlwaysEdible:false,foodEffects:[],creativeTab:"",tags:[],hasRecipe:false,recipe:{type:"shaped",pattern:["   ","   ","   "],keys:{},result:1},hasTooltip:false,tooltipNormal:"",hasHiddenTooltip:false,useDefaultShiftHint:true,tooltipShiftHint:"",tooltipHidden:"",enabledMethods:[],methodBlocks:{}};

export function ItemProv({initial,formOverride,onFormChange,children}){const[form,setForm]=useState(formOverride||(initial?{...ITEM_DEF,...initial}:ITEM_DEF));const F=useCallback((k,v)=>setForm(f=>{const nf={...f,[k]:v};onFormChange&&onFormChange(nf);return nf;}),[onFormChange]);return<FormCtx.Provider value={{form,F}}>{children}</FormCtx.Provider>;}

export function ItemLeft({textures,initial,isEdit,onSave,onCancel,onDelete,modItems=[],showCons,consoleH,activePanel,setActivePanel,rightView,setRightView}){
  const{form,F}=useContext(FormCtx);
  const{options:creativeTabOptions}=useCreativeTabs();
  const[saving,setSaving]=useState(false);const[status,setStatus]=useState([]);
  const texId=(form.textureId||"").startsWith("__direct__")?null:form.textureId;
  const selTex=textures.find(t=>t.id===texId);
  const dUrl=(form.textureId||"").startsWith("__direct__")?form.textureId.split("__name__")[0].replace("__direct__",""):null;
  const dName=(form.textureId||"").startsWith("__direct__")?form.textureId.split("__name__")[1]:null;
  const tags=form.tags||[];
  const save=async()=>{
    if(!form.id.trim())return;setSaving(true);setStatus([]);
    const CN=form.customConstName?form.constName:form.id.toUpperCase();
    const item={...form,constName:CN,savedAt:Date.now()};const code=gItemCode(item,textures);const msgs=[];
    const wtItem=async()=>{
      if(dUrl){
        const j=await api("/texture",{filename:`${form.id}.png`,dataUrl:dUrl,folder:"item"});
        msgs.push({ok:j.ok,label:"texture",msg:j.ok?"ok":j.reason});
      }else if(selTex?.dataUrl){
        const j=await api("/texture",{filename:`${form.id}.png`,dataUrl:selTex.dataUrl,folder:"item"});
        msgs.push({ok:j.ok,label:"texture",msg:j.ok?"ok":j.reason});
        if(selTex.isAnimated){
          const jm=await api("/texture/mcmeta",{filename:`${form.id}.png`,frametime:selTex.ticksPerFrame||4,folder:"item"});
          msgs.push({ok:jm.ok,label:"mcmeta",msg:jm.ok?"ok":jm.reason});
        }
      }
    };
    if(!isEdit){
      await wtItem();
      const j2=await api("/items/register",{line:code.reg,constName:CN,fpReg:code.fpReg});msgs.push({ok:j2.ok,label:"ModItems",msg:j2.ok?"ok":j2.reason});
      const j3=await api("/lang/set",{key:code.langKey,value:code.langVal});msgs.push({ok:j3.ok,label:"lang",msg:j3.ok?"ok":j3.reason});
      const j4=await api("/items/model",{line:code.modelLine,constName:code.CN,id:form.id});msgs.push({ok:j4.ok,label:"model",msg:j4.ok?"ok":j4.reason});
      for(const tk of gTTKeys(form.id,form)){const jt=await api("/lang/set",{key:tk.key,value:tk.value});msgs.push({ok:jt.ok,label:tk.key,msg:jt.ok?"ok":jt.reason});}
      if(form.tags?.length){const jt=await api("/tags/set",{id:form.id,constName:CN,tags:form.tags,isBlock:false});msgs.push({ok:jt.ok,label:"tags",msg:jt.ok?`${jt.added||0} ok`:jt.reason});}
      if(gRecipe(form.id,form)){const jr=await api("/recipes/set",{id:form.id,constName:CN,recipeCode:gRecipe(form.id,form)});msgs.push({ok:jr.ok,label:"recipe",msg:jr.ok?"ok":jr.reason});}
    }else{
      const j=await api("/items/update",{oldConstName:initial.constName||initial.id?.toUpperCase(),oldId:initial.id,newLine:code.reg,newConstName:CN,newId:form.id,langKey:code.langKey,langVal:code.langVal,newModelLine:code.modelLine,fpReg:code.fpReg,isAnimated:code.tex?.isAnimated||false});msgs.push({ok:j.ok,label:"update",msg:j.ok?"ok":j.reason});
      if(initial.creativeTab&&initial.creativeTab!==form.creativeTab)await api("/creativetab/remove",{ref:`ModItems.${initial.constName||initial.id?.toUpperCase()}`});
      await wtItem();
      if(form.hasTooltip){for(const tk of gTTKeys(form.id,form)){const jt=await api("/lang/set",{key:tk.key,value:tk.value,update:true});msgs.push({ok:jt.ok,label:tk.key,msg:jt.ok?"ok":jt.reason});}}
      else{await api("/lang/delete",{keys:[`tooltip.${MODID}.${form.id}.normal`,`tooltip.${MODID}.${form.id}.shift_hint`,`tooltip.${MODID}.${form.id}.hidden`]});}
      if(gRecipe(form.id,form)){const jr=await api("/recipes/set",{id:form.id,constName:CN,recipeCode:gRecipe(form.id,form)});msgs.push({ok:jr.ok,label:"recipe",msg:jr.ok?"ok":jr.reason});}
      else{const jr=await api("/recipes/delete",{constName:initial.constName||initial.id?.toUpperCase()});msgs.push({ok:jr.ok,label:"recipe del",msg:jr.ok?"ok":jr.reason});}
      if(form.tags?.length){const jt=await api("/tags/set",{id:form.id,constName:CN,tags:form.tags,isBlock:false});msgs.push({ok:jt.ok,label:"tags",msg:jt.ok?`${jt.added||0} ok`:jt.reason});}else{await api("/tags/delete",{constName:CN,isBlock:false});}
    }
    if(form.customItemClass) {
      const clsName = form.customItemClass;
      const cc = await api("/items/custom-class/read",{className:clsName});
      if(cc.ok) {
        let nCode = cc.code;
        nCode = form.isFood ? ycsInjectFeature(nCode, "food", form, form.id) : ycsRemoveFeature(nCode, "food");
        nCode = form.isFuel ? ycsInjectFeature(nCode, "fuel", form, form.id) : ycsRemoveFeature(nCode, "fuel");
        nCode = form.hasTooltip ? ycsInjectFeature(nCode, "tooltip", form, form.id) : ycsRemoveFeature(nCode, "tooltip");
        const needsDuration = form.hasUseDuration || form.hasUseAnimation;
        nCode = needsDuration ? ycsInjectFeature(nCode, "useDuration", form, form.id) : ycsRemoveFeature(nCode, "useDuration");
        nCode = form.hasUseAnimation ? ycsInjectFeature(nCode, "useAnimation", form, form.id) : ycsRemoveFeature(nCode, "useAnimation");
        if (nCode !== cc.code) {
          const cw = await api("/items/custom-class/write",{className:clsName,code:nCode});
          msgs.push({ok:cw.ok,label:"class",msg:cw.ok?"ok":cw.reason});
        }
      }
    }
    if(form.creativeTab){const jt=await api("/creativetab",{ref:`ModItems.${CN}`,itemId:form.id,tabConst:form.creativeTab});msgs.push({ok:jt.ok,label:"tab",msg:jt.ok?"ok":jt.reason});}
    await api("/models/sync",{});
    setStatus(msgs);setSaving(false);onSave({...form,constName:CN,savedAt:Date.now()},initial?.id);
  };
  const ER=({label,panel,badge,count})=><EditRow label={label} panel={panel} badge={badge} count={count} activePanel={activePanel} setActivePanel={setActivePanel}/>;
  const effs=form.foodEffects||[];
  const addEff=()=>F("foodEffects",[...effs,{effect:"MobEffects.REGENERATION",duration:600,level:1,probability:1.0}]);
  const rmEff=i=>F("foodEffects",effs.filter((_,idx)=>idx!==i));
  const updEff=(i,k,v)=>F("foodEffects",effs.map((e,idx)=>idx===i?{...e,[k]:v}:e));

  return<div style={{padding:"20px 20px 100px",display:"flex",flexDirection:"column",gap:13}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:14,fontWeight:500}}>{isEdit?"Edit Item":"New Item"}</span></div>
    <Inp label="Display Name" value={form.displayName} onChange={v=>F("displayName",v)}/>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:4}}><Lbl>ID</Lbl>{valId(form.id)&&form.id&&<span style={{fontSize:11,color:"#ff7777"}}>{valId(form.id)}</span>}</div><Chk label="Custom const" checked={!!form.customConstName} onChange={v=>F("customConstName",v)}/></div>
      <input value={form.id} onChange={e=>{const v=e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"");F("id",v);if(!form.customConstName)F("constName",v.toUpperCase());}} style={{...SI.inp}}/>
    </div>
    <ConstField form={form} F={F}/>
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
    <Sel label="Creative Tab" value={form.creativeTab} onChange={v=>F("creativeTab",v)} options={creativeTabOptions}/>
    <div style={{display:"flex",alignItems:"flex-end",gap:8}}>
      <div style={{flex:1}}>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <Lbl>Properties</Lbl>
          <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
            <Chk label="Tool" checked={!!form.isTool} onChange={v=>{F("isTool",v);if(v&&form.holdingMode==="none")F("holdingMode","handheld");}}/>
            {!form.isTool&&<Chk label="Food" checked={!!form.isFood} onChange={v=>F("isFood",v)}/>}
            {!form.isTool&&<Chk label="Fuel" checked={!!form.isFuel} onChange={v=>F("isFuel",v)}/>}
          </div>
        </div>
        {form.isTool&&<div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8,paddingLeft:10,borderLeft:"2px solid #1a3040"}}>
          <Sel label="Tool Type" value={form.toolType||"Sword"} onChange={v=>F("toolType",v)} options={TOOL_TYPES}/>
          <Sel label="Tier" value={form.tier||"Iron"} onChange={v=>F("tier",v)} options={TIERS}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Inp label="Damage" value={form.damage} onChange={v=>F("damage",v)} type="number"/><Inp label="Speed" value={form.speed} onChange={v=>F("speed",v)} type="number"/></div>
        </div>}
        {form.isFuel&&<div style={{marginTop:8,paddingLeft:10,borderLeft:"2px solid #3a2a10"}}>
          <Inp label="Burn Time (ticks)" value={form.burnTime} onChange={v=>F("burnTime",v)} type="number"/>
        </div>}
        {form.isFood&&<div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8,paddingLeft:10,borderLeft:"2px solid #1a3020"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Inp label="Nutrition" value={form.foodNutrition} onChange={v=>F("foodNutrition",v)} type="number"/><Inp label="Saturation" value={form.foodSaturation} onChange={v=>F("foodSaturation",v)} type="number"/></div>
          <Chk label="Always edible" checked={!!form.foodAlwaysEdible} onChange={v=>F("foodAlwaysEdible",v)}/>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><Lbl>Status Effects</Lbl><Btn sm v="g" onClick={addEff}>+ add</Btn></div>
            {effs.map((e,i)=><div key={i} style={{background:C.inp,padding:10,borderRadius:C.r,display:"flex",flexDirection:"column",gap:8,position:"relative",border:`1px solid ${C.inpB}`}}>
              <Btn sm v="dan" onClick={()=>rmEff(i)} style={{position:"absolute",top:6,right:6,padding:"2px 5px"}}>✕</Btn>
              <SearchSel label="Effect" value={e.effect} onChange={v=>updEff(i,"effect",v)} options={VANILLA_EFFECTS.map(e=>({value:e,label:e}))} freeform/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                <Inp label="Duration (ticks)" value={e.duration} type="number" onChange={v=>updEff(i,"duration",v)}/>
                <Inp label="Level (1=I, 2=II)" value={e.level} type="number" onChange={v=>updEff(i,"level",v)}/>
                <Inp label="Probability (0.0-1.0)" value={e.probability} type="number" onChange={v=>updEff(i,"probability",v)}/>
              </div>
            </div>)}
          </div>
        </div>}

    <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:12}}>
      <Lbl>Methods</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
        <span style={{fontSize:13,color:form.customItemClass?C.text:C.faint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{form.customItemClass ? `${form.customItemClass}.java` : "none added"}</span>
        <Btn sm v={activePanel==="customclass"?"p":"g"} onClick={async()=>{
            if(activePanel==="customclass"){setActivePanel(null);setRightView({mode:"methodList",editingMethod:null});return;}
            const cls2=form.customItemClass||(form.id?idToClassName(form.id):null);
            if(!cls2)return;
            if(!form.customItemClass){F("customItemClass",cls2);await api("/items/custom-class",{className:cls2});}
            setRightView({mode:"methodList",editingMethod:null});
            setActivePanel("customclass");
          }} dis={!form.id} style={{marginLeft:8,flexShrink:0}}>{(form.enabledMethods||[]).length?"edit":"set"}</Btn>
      </div>
    </div>
      </div>
    </div>
    <Sel label="Holding Mode" value={form.holdingMode||"none"} onChange={v=>F("holdingMode",v)} options={[{value:"none",label:"Default"},{value:"handheld",label:"Handheld"}]}/>
    {!form.isTool&&<Inp label="Max Stack Size" type="number" value={form.maxStackSize??64} onChange={v=>{const n=Math.max(1,Math.min(99,parseInt(v)||64));F("maxStackSize",String(n));}} style={{width:"100%"}}/>}
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <Chk label="Set Use Duration" checked={!!form.hasUseDuration} onChange={v=>F("hasUseDuration",v)}/>
      {form.hasUseDuration&&<Inp label="Duration (ticks)" value={form.useDuration||"72000"} onChange={v=>F("useDuration",v)} type="number"/>}
    </div>
    {!form.isTool&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
      <Chk label="Has Durability" checked={!!form.hasDurability} onChange={v=>F("hasDurability",v)}/>
      {form.hasDurability&&<Inp label="Durability" value={form.durability||"100"} onChange={v=>F("durability",v)} type="number"/>}
    </div>}

    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <Lbl>Tags{tags.length>0&&<span style={{color:C.accent,marginLeft:5}}>{tags.length}</span>}</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
        <span style={{fontSize:13,color:tags.length?C.text:C.faint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tags.length?tags.slice(0,3).join(", ")+(tags.length>3?` +${tags.length-3}`:""):"none added"}</span>
        <Btn sm v={activePanel==="tags"?"p":"g"} onClick={()=>setActivePanel(p=>p==="tags"?null:"tags")} style={{marginLeft:8,flexShrink:0}}>{tags.length?"edit":"set"}</Btn>
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <Lbl>Tooltip</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
        <span style={{fontSize:13,color:form.hasTooltip?C.text:C.faint}}>{form.hasTooltip?form.tooltipNormal||"(set)":"disabled"}</span>
        <Btn sm v={activePanel==="tooltip"?"p":"g"} onClick={()=>setActivePanel(p=>p==="tooltip"?null:"tooltip")} style={{marginLeft:8,flexShrink:0}}>{form.hasTooltip?"edit":"set"}</Btn>
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <Lbl>Recipe</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
        <span style={{fontSize:13,color:(form.hasRecipe||form.smeltingRecipes?.length)?C.text:C.faint}}>{(()=>{const p=[];if(form.hasRecipe)p.push("Crafting");(form.smeltingRecipes||[]).forEach(r=>{const t=SMELT_TYPES.find(s=>s.key===r.type);if(t)p.push(t.label);});return p.length?p.join(", "):"disabled";})()}</span>
        <Btn sm v={activePanel==="recipe"?"p":"g"} onClick={()=>setActivePanel(p=>p==="recipe"?null:"recipe")} style={{marginLeft:8,flexShrink:0}}>{(form.hasRecipe||form.smeltingRecipes?.length)?"edit":"set"}</Btn>
      </div>
    </div>
    <Sbar messages={status}/>
    <FormActions onCancel={onCancel} onSave={save} saving={saving} canSave={!!form.id.trim()&&!valId(form.id)} showCons={showCons} consoleH={consoleH} onDelete={onDelete}/>
  </div>;
}

export function ItemFullEditor({rightView,setRightView,setActivePanel}){
  const{form,F}=useContext(FormCtx);
  return<div style={{flex:1,background:C.panel,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <VisualEditorPanel
      methodKey={rightView.editingMethod}
      form={form}
      F={F}
      className={form.customItemClass||idToClassName(form.id||"item")}
      onBack={()=>{setRightView({mode:"methodList",editingMethod:null});setActivePanel("customclass");}}/>
  </div>;
}

export function ItemRight({textures,modItems=[],activePanel,setActivePanel,rightView,setRightView}){
  const{form,F}=useContext(FormCtx);
  return<RightPaneShell modItems={modItems} textures={textures} isBlock={false} activePanel={activePanel} setActivePanel={setActivePanel} rightView={rightView} setRightView={setRightView} itemForm={form} itemF={F}/>;
}
