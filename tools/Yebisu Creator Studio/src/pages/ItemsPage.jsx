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

function extractFrames(dataUrl,frameCount){
  return new Promise(resolve=>{
    const img=new Image();img.onload=()=>{
      const fw=img.width,fh=img.height/frameCount;
      const urls=[];
      for(let i=0;i<frameCount;i++){
        const c=document.createElement("canvas");c.width=fw;c.height=fh;
        c.getContext("2d").drawImage(img,0,i*fh,fw,fh,0,0,fw,fh);
        urls.push(c.toDataURL("image/png"));
      }
      resolve(urls);
    };img.src=dataUrl;
  });
}

export const ITEM_DEF={id:"",constName:"",customConstName:false,displayName:"",textureId:"",isTool:false,isFood:false,isFuel:false,hasDurability:false,durability:"100",hasUseDuration:false,useDuration:"72000",customItemClass:"",toolType:"Sword",tier:"Iron",damage:"3",speed:"-2.4",burnTime:"1600",holdingMode:"none",maxStackSize:"64",foodNutrition:"3",foodSaturation:"0.3",foodAlwaysEdible:false,foodEffects:[],creativeTab:"",tags:[],hasRecipe:false,recipe:{type:"shaped",pattern:["   ","   ","   "],keys:{},result:1},hasTooltip:false,tooltipNormal:"",hasHiddenTooltip:false,useDefaultShiftHint:true,tooltipShiftHint:"",tooltipHidden:"",enabledMethods:[],methodBlocks:{},dataComponents:[],geoModelJson:null,geoModelFileName:null,itemModelJson:null,itemModelFileName:null,modelTextureInvId:"",modelTexture3dId:"",hasCustomInvTexture:false,stateCount:1,states:[]};

export function ItemProv({initial,formOverride,onFormChange,children}){const[form,setForm]=useState(formOverride||(initial?{...ITEM_DEF,...initial}:ITEM_DEF));const F=useCallback((k,v)=>setForm(f=>{const m=k.match(/^_stateField_(\d+)_(.+)$/);if(m){const si=parseInt(m[1]),fk=m[2],ns=[...(f.states||[])];ns[si]={...ns[si],[fk]:v};const nf={...f,states:ns};onFormChange&&onFormChange(nf);return nf;}const nf={...f,[k]:v};onFormChange&&onFormChange(nf);return nf;}),[onFormChange]);return<FormCtx.Provider value={{form,F}}>{children}</FormCtx.Provider>;}

function TexField({label,textures,texKey,form,F,activePanel,setActivePanel,panelKey}){
  const tid=(form[texKey]||"").startsWith("__direct__")?null:form[texKey];
  const st=textures.find(t=>t.id===tid);
  const du=(form[texKey]||"").startsWith("__direct__")?form[texKey].split("__name__")[0].replace("__direct__",""):null;
  return<div style={{display:"flex",flexDirection:"column",gap:4}}>
    <Lbl>{label}</Lbl>
    <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
        {(st||du)
          ?<AImg url={st?.dataUrl||du} size={20} anim={st?.isAnimated} frames={st?.frames||1} ticks={st?.ticksPerFrame||4}/>
          :<div style={{width:20,height:20,background:C.prev,borderRadius:3,border:`1px dashed ${C.inpB}`,flexShrink:0}}/>}
        <span style={{fontSize:13,color:st||du?C.text:C.faint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{st?st.label:du?"(direct)":"none selected"}</span>
      </div>
      <Btn sm v={activePanel===panelKey?"p":"g"} onClick={()=>setActivePanel(p=>p===panelKey?null:panelKey)} style={{marginLeft:8,flexShrink:0}}>{(st||du)?"edit":"set"}</Btn>
    </div>
  </div>;
}

export function ItemLeft({textures,initial,isEdit,onSave,onCancel,onDelete,modItems=[],showCons,consoleH,activePanel,setActivePanel,rightView,setRightView}){
  const{form,F}=useContext(FormCtx);
  const{options:creativeTabOptions}=useCreativeTabs();
  const[saving,setSaving]=useState(false);const[status,setStatus]=useState([]);
  const activeTexId=form.holdingMode==="3d"?(form.modelTexture3dId||""):(form.textureId||"");
  const texId=activeTexId.startsWith("__direct__")?null:activeTexId;
  const selTex=textures.find(t=>t.id===texId);
  const dUrl=activeTexId.startsWith("__direct__")?activeTexId.split("__name__")[0].replace("__direct__",""):null;
  const dName=activeTexId.startsWith("__direct__")?activeTexId.split("__name__")[1]:null;
  const tags=form.tags||[];
  const save=async()=>{
    if(!form.id.trim())return;setSaving(true);setStatus([]);
    const CN=form.customConstName?form.constName:form.id.toUpperCase();
    const item={...form,constName:CN,savedAt:Date.now()};const code=gItemCode(item,textures);const msgs=[];
    const wtItem=async()=>{
      const jm=await api("/texture/setup-mode",{
        id:form.id,texMode:code.texMode,isHandheld:code.isHandheld,
        frames:code.spritesheet?.frames||1,defaultFrame:code.spritesheet?.defaultFrame||0,
        frametime:selTex?.ticksPerFrame||4
      });
      msgs.push({ok:jm.ok,label:"tex-mode",msg:jm.ok?"ok":jm.reason});
      if(dUrl){
        const j=await api("/texture",{filename:`${form.id}.png`,dataUrl:dUrl,folder:"item"});
        msgs.push({ok:j.ok,label:"texture",msg:j.ok?"ok":j.reason});
      }else if(selTex?.dataUrl){
        if(code.texMode==="multistate"){
          const frameUrls=await extractFrames(selTex.dataUrl,selTex.frames||1);
          const defFrame=selTex.defaultFrame||0;
          const j=await api("/texture",{filename:`${form.id}.png`,dataUrl:frameUrls[defFrame],folder:"item"});
          msgs.push({ok:j.ok,label:"texture",msg:j.ok?"ok":j.reason});
          for(let i=0;i<frameUrls.length;i++){
            const jf=await api("/texture",{filename:`${form.id}_frame_${i}.png`,dataUrl:frameUrls[i],folder:"item"});
            msgs.push({ok:jf.ok,label:`frame_${i}`,msg:jf.ok?"ok":jf.reason});
          }
        }else{
          const j=await api("/texture",{filename:`${form.id}.png`,dataUrl:selTex.dataUrl,folder:"item"});
          msgs.push({ok:j.ok,label:"texture",msg:j.ok?"ok":j.reason});
        }
      }
    };
    const wtGeo=async()=>{
      if(form.holdingMode!=="3d")return;
      const tex3dId=(form.modelTexture3dId||"").startsWith("__direct__")?null:form.modelTexture3dId;
      const tex3d=textures.find(t=>t.id===tex3dId);
      const texMeta=tex3d&&tex3d.isSpritesheet&&(tex3d.frames||1)>1?{isSpritesheet:true,isAnimated:!!tex3d.isAnimated,frames:tex3d.frames,ticksPerFrame:tex3d.ticksPerFrame||4}:null;
      if(form.geoModelJson||form.itemModelJson||texMeta){
        const jg=await api("/geo/save",{id:form.id,type:"item",geoJson:form.geoModelJson||null,itemModelJson:form.itemModelJson||null,constName:CN,texMeta});
        msgs.push({ok:jg.ok,label:"3d-model",msg:jg.ok?"ok":jg.reason});
      }
      const d3dUrl=(form.modelTexture3dId||"").startsWith("__direct__")?(form.modelTexture3dId).split("__name__")[0].replace("__direct__",""):null;
      const tex3dData=d3dUrl||tex3d?.dataUrl;
      if(tex3dData){
        const j3d=await api("/texture",{filename:`${form.id}.png`,dataUrl:tex3dData,folder:"geo/item"});
        msgs.push({ok:j3d.ok,label:"3d-texture",msg:j3d.ok?"ok":j3d.reason});
      }
    };
    const wtStates=async()=>{
      if((form.stateCount||1)<=1)return;
      const states=form.states||[];
      const stateInfos=[];
      // First pass: collect state info and save flat textures
      for(let si=0;si<states.length;si++){
        const st=states[si];
        const suffix=`_state_${si}`;
        if(st.holdingMode==="3d"){
          const raw3d=form[`state3dTexId_${si}`]||(si===0?form.modelTexture3dId:"")||"";
          const t3id=raw3d.startsWith("__direct__")?null:raw3d;
          const t3=textures.find(t=>t.id===t3id);
          const texMeta3d=t3&&t3.isSpritesheet&&(t3.frames||1)>1?{frames:t3.frames,animated:!!t3.isAnimated,ticksPerFrame:t3.ticksPerFrame||4}:null;
          stateInfos.push({mode:"3d",geoId:form.id+suffix,texMeta:texMeta3d});
        }else{
          const rawTex=form[`stateTexId_${si}`]||(si===0?form.textureId:"")||"";
          const tid=rawTex.startsWith("__direct__")?null:rawTex;
          const tex=textures.find(t=>t.id===tid);
          const durl=rawTex.startsWith("__direct__")?rawTex.split("__name__")[0].replace("__direct__",""):null;
          let texData=durl||tex?.dataUrl;
          const isMultistate=tex?.isSpritesheet&&!tex?.isAnimated&&(tex?.frames||1)>1;
          const isAnim=tex?.isSpritesheet&&tex?.isAnimated;
          const frames=isMultistate?(tex.frames||1):1;
          if(texData){
            if(isMultistate){
              const frameUrls=await extractFrames(texData,frames);
              const defFrame=tex.defaultFrame||0;
              // Save default frame as the state texture and base
              const defData=frameUrls[defFrame];
              await api("/texture",{filename:`${form.id}${suffix}.png`,dataUrl:defData,folder:"item"});
              if(si===0) await api("/texture",{filename:`${form.id}.png`,dataUrl:defData,folder:"item"});
              // Save all per-frame textures for "Set Item Texture Frame"
              for(let fi=0;fi<frameUrls.length;fi++){
                await api("/texture",{filename:`${form.id}${suffix}_frame_${fi}.png`,dataUrl:frameUrls[fi],folder:"item"});
              }
              msgs.push({ok:true,label:`s${si}-tex`,msg:`${frames} frames`});
            }else{
              await api("/texture",{filename:`${form.id}${suffix}.png`,dataUrl:texData,folder:"item"});
              if(si===0) await api("/texture",{filename:`${form.id}.png`,dataUrl:texData,folder:"item"});
              msgs.push({ok:true,label:`s${si}-tex`,msg:"ok"});
            }
            if(isAnim){
              await api("/texture/mcmeta",{filename:`${form.id}${suffix}.png`,frametime:tex.ticksPerFrame||4,folder:"item"});
              if(si===0) await api("/texture/mcmeta",{filename:`${form.id}.png`,frametime:tex.ticksPerFrame||4,folder:"item"});
            }
          }
          stateInfos.push({mode:st.holdingMode||"none",frames,isHandheld:st.holdingMode==="handheld"});
        }
      }
      // Generate model overrides (writes fallback models for all states)
      const state0ItemModel=states[0]?.holdingMode==="3d"?states[0].itemModelJson:null;
      const js=await api("/items/states-model",{id:form.id,states:stateInfos,constName:CN,state0ItemModel});
      msgs.push({ok:js.ok,label:"states-model",msg:js.ok?"ok":js.reason});
      // Second pass: save 3D geo models + textures (overwrites fallback model JSONs with full display transforms)
      for(let si=0;si<states.length;si++){
        const st=states[si];
        const suffix=`_state_${si}`;
        if(st.holdingMode!=="3d")continue;
        const raw3d=form[`state3dTexId_${si}`]||(si===0?form.modelTexture3dId:"")||"";
        const t3id=raw3d.startsWith("__direct__")?null:raw3d;
        const tex=textures.find(t=>t.id===t3id);
        const durl=raw3d.startsWith("__direct__")?raw3d.split("__name__")[0].replace("__direct__",""):null;
        const texData=durl||tex?.dataUrl;
        if(st.geoModelJson||st.itemModelJson){
          const jg=await api("/geo/save",{id:form.id+suffix,type:"item",geoJson:st.geoModelJson||null,itemModelJson:st.itemModelJson||null,constName:null});
          msgs.push({ok:jg.ok,label:`s${si}-3d-model`,msg:jg.ok?"ok":jg.reason});
        }
        if(texData){
          const j=await api("/texture",{filename:`${form.id}${suffix}.png`,dataUrl:texData,folder:"geo/item"});
          msgs.push({ok:j.ok,label:`s${si}-3d-tex`,msg:j.ok?"ok":j.reason});
          if(si===0){
            await api("/texture",{filename:`${form.id}.png`,dataUrl:texData,folder:"geo/item"});
          }
        }
      }
    };
    const hasStates=(form.stateCount||1)>1;
    if(!isEdit){
      if(!hasStates){await wtItem();await wtGeo();}await wtStates();
      const j2=await api("/items/register",{line:code.reg,constName:CN,fpReg:code.fpReg});msgs.push({ok:j2.ok,label:"ModItems",msg:j2.ok?"ok":j2.reason});
      const j3=await api("/lang/set",{key:code.langKey,value:code.langVal});msgs.push({ok:j3.ok,label:"lang",msg:j3.ok?"ok":j3.reason});
      const j4=await api("/items/model",{line:code.modelLine,constName:code.CN,id:form.id});msgs.push({ok:j4.ok,label:"model",msg:j4.ok?"ok":j4.reason});
      for(const tk of gTTKeys(form.id,form)){const jt=await api("/lang/set",{key:tk.key,value:tk.value});msgs.push({ok:jt.ok,label:tk.key,msg:jt.ok?"ok":jt.reason});}
      if(form.tags?.length){const jt=await api("/tags/set",{id:form.id,constName:CN,tags:form.tags,isBlock:false});msgs.push({ok:jt.ok,label:"tags",msg:jt.ok?`${jt.added||0} ok`:jt.reason});}
      if(gRecipe(form.id,form)){const jr=await api("/recipes/set",{id:form.id,constName:CN,recipeCode:gRecipe(form.id,form)});msgs.push({ok:jr.ok,label:"recipe",msg:jr.ok?"ok":jr.reason});}
    }else{
      const j=await api("/items/update",{oldConstName:initial.constName||initial.id?.toUpperCase(),oldId:initial.id,newLine:code.reg,newConstName:CN,newId:form.id,langKey:code.langKey,langVal:code.langVal,newModelLine:code.modelLine,fpReg:code.fpReg,isAnimated:code.tex?.isAnimated||false});msgs.push({ok:j.ok,label:"update",msg:j.ok?"ok":j.reason});
      if(initial.creativeTab&&initial.creativeTab!==form.creativeTab)await api("/creativetab/remove",{ref:`ModItems.${initial.constName||initial.id?.toUpperCase()}`});
      if(!hasStates){await wtItem();await wtGeo();}await wtStates();
      if(form.hasTooltip){for(const tk of gTTKeys(form.id,form)){const jt=await api("/lang/set",{key:tk.key,value:tk.value,update:true});msgs.push({ok:jt.ok,label:tk.key,msg:jt.ok?"ok":jt.reason});}}
      else{await api("/lang/delete",{keys:[`tooltip.${MODID}.${form.id}.normal`,`tooltip.${MODID}.${form.id}.shift_hint`,`tooltip.${MODID}.${form.id}.hidden`]});}
      if(gRecipe(form.id,form)){const jr=await api("/recipes/set",{id:form.id,constName:CN,recipeCode:gRecipe(form.id,form)});msgs.push({ok:jr.ok,label:"recipe",msg:jr.ok?"ok":jr.reason});}
      else{const jr=await api("/recipes/delete",{constName:initial.constName||initial.id?.toUpperCase()});msgs.push({ok:jr.ok,label:"recipe del",msg:jr.ok?"ok":jr.reason});}
      if(form.tags?.length){const jt=await api("/tags/set",{id:form.id,constName:CN,tags:form.tags,isBlock:false});msgs.push({ok:jt.ok,label:"tags",msg:jt.ok?`${jt.added||0} ok`:jt.reason});}else{await api("/tags/delete",{constName:CN,isBlock:false});}
    }
    if(form.customItemClass) {
      const clsName = form.customItemClass;
      const needsClass=(form.enabledMethods||[]).length>0||form.isFood||form.isFuel||form.hasTooltip||form.hasUseDuration||form.hasUseAnimation;
      if(needsClass){
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
      } else {
        await api("/items/custom-class/delete",{className:clsName});
        F("customItemClass","");
        msgs.push({ok:true,label:"class",msg:"removed (no features)"});
      }
    }
    if(form.creativeTab){const jt=await api("/creativetab",{ref:`ModItems.${CN}`,itemId:form.id,tabConst:form.creativeTab});msgs.push({ok:jt.ok,label:"tab",msg:jt.ok?"ok":jt.reason});}
    const allDC=[...(form.dataComponents||[])];
    const allBlocks=Object.values(form.methodBlocks||{}).flat();
    for(const bn of allBlocks){
      if((bn.opcode==="datacomp.get"||bn.opcode==="datacomp.set")&&bn.fields?.compName){
        const name=bn.fields.compName;
        const type=bn.fields.compType||"double";
        if(!allDC.some(d=>d.name===name))allDC.push({name,type});
      }
    }
    if(allDC.length){await api("/datacomponents/save",{components:allDC});}
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
    <Chk label="Has States" checked={(form.stateCount||1)>1} onChange={v=>{if(v){F("stateCount",2);const st=[...(form.states||[])];while(st.length<2)st.push({holdingMode:"none",textureId:"",modelTexture3dId:"",geoModelJson:null,itemModelJson:null});if(!st[0].holdingMode||st[0].holdingMode==="none")st[0].holdingMode=form.holdingMode||"none";F("states",st.slice(0,2));if(!form.stateTexId_0&&form.textureId)F("stateTexId_0",form.textureId);if(!form.state3dTexId_0&&form.modelTexture3dId)F("state3dTexId_0",form.modelTexture3dId);if(!st[0].geoModelJson&&form.geoModelJson){st[0].geoModelJson=form.geoModelJson;st[0].itemModelJson=form.itemModelJson;st[0].geoModelFileName=form.geoModelFileName;st[0].itemModelFileName=form.itemModelFileName;F("states",[...st.slice(0,2)]);}}else{F("stateCount",1);F("states",[]);}}}/>
    {(form.stateCount||1)>1&&<div style={{paddingLeft:10,borderLeft:`2px solid ${C.inpB}`}}><Inp label="Count" type="number" value={form.stateCount} onChange={v=>{const n=Math.max(2,Math.min(16,parseInt(v)||2));F("stateCount",n);const st=[...(form.states||[])];while(st.length<n)st.push({holdingMode:"none",textureId:"",modelTexture3dId:"",geoModelJson:null,itemModelJson:null});F("states",st.slice(0,n));}} style={{width:"100%"}}/></div>}
    {(form.stateCount||1)<=1?<>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <Lbl>Model</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",padding:0,overflow:"hidden"}}>
        <select value={form.holdingMode||"none"} onChange={e=>F("holdingMode",e.target.value)} style={{flex:1,background:"transparent",border:"none",color:C.text,fontSize:13,fontFamily:"'JetBrains Mono',monospace",padding:"7px 10px",outline:"none",cursor:"pointer"}}>
          {[{value:"none",label:"Default"},{value:"handheld",label:"Handheld"},{value:"3d",label:"3D Model"}].map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {form.holdingMode==="3d"&&<Btn sm v={activePanel==="3dmodel"?"p":"g"} onClick={()=>setActivePanel(p=>p==="3dmodel"?null:"3dmodel")} style={{flexShrink:0,marginRight:10}}>{(form.geoModelJson||form.itemModelJson)?"edit":"set"}</Btn>}
      </div>
    </div>
    {form.holdingMode==="3d"
      ?<TexField label="Texture" textures={textures} texKey="modelTexture3dId" form={form} F={F} activePanel={activePanel} setActivePanel={setActivePanel} panelKey="texture-3d"/>
    :<div style={{display:"flex",flexDirection:"column",gap:4}}>
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
    </div>}
    </>
    :(form.states||[]).map((st,si)=>{
      const texFk=`stateTexId_${si}`;
      const tex3dFk=`state3dTexId_${si}`;
      const stTexVal=form[texFk]||"";
      const stTexId=stTexVal.startsWith("__direct__")?null:stTexVal;
      const stTex=textures.find(t=>t.id===stTexId);
      const stDUrl=stTexVal.startsWith("__direct__")?stTexVal.split("__name__")[0].replace("__direct__",""):null;
      const stF=(k,v)=>{const ns=[...(form.states||[])];ns[si]={...ns[si],[k]:v};F("states",ns);};
      const geoFk=`stateGeo_${si}`;
      return<div key={si} style={{display:"flex",flexDirection:"column",gap:8,paddingLeft:10,borderLeft:`2px solid ${C.inpB}`}}>
        <Lbl>{`State ${si+1}${si===0?" (default)":""}`}</Lbl>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <Lbl>Model</Lbl>
          <div style={{...SI.inp,display:"flex",alignItems:"center",padding:0,overflow:"hidden"}}>
            <select value={st.holdingMode||"none"} onChange={e=>stF("holdingMode",e.target.value)} style={{flex:1,background:"transparent",border:"none",color:C.text,fontSize:13,fontFamily:"'JetBrains Mono',monospace",padding:"7px 10px",outline:"none",cursor:"pointer"}}>
              {[{value:"none",label:"Default"},{value:"handheld",label:"Handheld"},{value:"3d",label:"3D Model"}].map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {st.holdingMode==="3d"&&<Btn sm v={activePanel===("3dmodel_s"+si)?"p":"g"} onClick={()=>setActivePanel(p=>p===("3dmodel_s"+si)?null:"3dmodel_s"+si)} style={{flexShrink:0,marginRight:10}}>{(st.geoModelJson||st.itemModelJson)?"edit":"set"}</Btn>}
          </div>
        </div>
        {st.holdingMode==="3d"
          ?<TexField label="Texture" textures={textures} texKey={tex3dFk} form={form} F={F} activePanel={activePanel} setActivePanel={setActivePanel} panelKey={"texture-3d_s"+si}/>
          :<div style={{display:"flex",flexDirection:"column",gap:4}}>
            <Lbl>Texture</Lbl>
            <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
                {(stTex||stDUrl)
                  ?<AImg url={stTex?.dataUrl||stDUrl} size={20}/>
                  :<div style={{width:20,height:20,background:C.prev,borderRadius:3,border:`1px dashed ${C.inpB}`,flexShrink:0}}/>}
                <span style={{fontSize:13,color:stTex||stDUrl?C.text:C.faint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{stTex?stTex.label:stDUrl?"(direct)":"none selected"}</span>
              </div>
              <Btn sm v={activePanel===("texture_s"+si)?"p":"g"} onClick={()=>setActivePanel(p=>p===("texture_s"+si)?null:"texture_s"+si)} style={{marginLeft:8,flexShrink:0}}>{(stTex||stDUrl)?"edit":"set"}</Btn>
            </div>
          </div>}
      </div>;
    })}
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
        {form.isTool&&<div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8,paddingLeft:10,borderLeft:`2px solid ${C.inpB}`}}>
          <Sel label="Tool Type" value={form.toolType||"Sword"} onChange={v=>F("toolType",v)} options={TOOL_TYPES}/>
          <Sel label="Tier" value={form.tier||"Iron"} onChange={v=>F("tier",v)} options={TIERS}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Inp label="Damage" value={form.damage} onChange={v=>F("damage",v)} type="number"/><Inp label="Speed" value={form.speed} onChange={v=>F("speed",v)} type="number"/></div>
        </div>}
        {!form.isTool&&form.isFuel&&<div style={{marginTop:8,paddingLeft:10,borderLeft:`2px solid ${C.inpB}`}}>
          <Inp label="Burn Time (ticks)" value={form.burnTime} onChange={v=>F("burnTime",v)} type="number"/>
        </div>}
        {!form.isTool&&form.isFood&&<div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8,paddingLeft:10,borderLeft:`2px solid ${C.inpB}`}}>
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
      <Lbl>Data Components</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
        <span style={{fontSize:13,color:(form.dataComponents||[]).length?C.text:C.faint}}>{(form.dataComponents||[]).length?(form.dataComponents||[]).map(d=>d.name).join(", "):"none added"}</span>
        <Btn sm v={activePanel==="datacomponents"?"p":"g"} onClick={()=>setActivePanel(p=>p==="datacomponents"?null:"datacomponents")} style={{marginLeft:8,flexShrink:0}}>{(form.dataComponents||[]).length?"edit":"set"}</Btn>
      </div>
    </div>
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
