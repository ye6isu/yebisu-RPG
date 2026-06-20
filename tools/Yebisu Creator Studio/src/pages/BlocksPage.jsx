import React, { useState, useCallback, useContext, useMemo } from "react";
import { C, SI } from "../theme.js";
import { FormCtx } from "../context.js";
import { Lbl, Btn, Inp, Sel, Chk, Sbar, AImg, ConstField, FormActions, SearchSel, valId } from "../components/ui.jsx";
import EditRow from "../components/EditRow.jsx";
import { MODID, SOUND_TYPES, SMELT_TYPES } from "../constants.js";
import { api, useVanillaItems, useCreativeTabs } from "../api.js";
import { gBlockEntries } from "../codegen/blocks.js";
import { gRecipe, gTTKeys } from "../codegen/items.js";
import RightPaneShell from "../panels/RightPaneShell.jsx";
import { ITEM_DEF } from "./ItemsPage.jsx";

export const BLOCK_DEF={...ITEM_DEF,orientationType:"simple",dropType:"Self",dropItem:"",dropXp:"1-3",dropFortune:false,textureTopId:"",textureBottomId:"",textureSideId:"",textureFrontId:"",textureBackId:"",textureLeftId:"",textureRightId:"",textureDoorTopId:"",textureDoorBottomId:"",textureDoorItemId:"",textureTrapdoorId:"",strength:"2.0",soundType:"WOOD",createSlab:false,createStairs:false,createFence:false,createFenceGate:false,createWall:false,createPressurePlate:false,createButton:false,createDoor:false,createTrapdoor:false,showVariants:false};

export function BlockProv({initial,formOverride,onFormChange,children}){const[form,setForm]=useState(formOverride||(initial?{...BLOCK_DEF,...initial}:BLOCK_DEF));const F=useCallback((k,v)=>setForm(f=>{const nf={...f,[k]:v};onFormChange&&onFormChange(nf);return nf;}),[onFormChange]);return<FormCtx.Provider value={{form,F}}>{children}</FormCtx.Provider>;}

export function BlockLeft({textures,initial,isEdit,onSave,onCancel,onDelete,modItems=[],modBlocks=[],showCons,consoleH,activePanel,setActivePanel,setHighlightFaceKey}){
  const{form,F}=useContext(FormCtx);
  const{options:creativeTabOptions}=useCreativeTabs();
  const vanillaItems=useVanillaItems();
  const dropItemOptions=useMemo(()=>[...modItems.map(i=>({value:`${MODID}:${i.id}`,label:i.displayName||i.id})),...modBlocks.map(b=>({value:`${MODID}:${b.id}`,label:b.displayName||b.id})),...vanillaItems.map(v=>({value:v.id,label:v.displayName||v.id}))],[modItems,modBlocks,vanillaItems]);
  const[saving,setSaving]=useState(false);const[status,setStatus]=useState([]);
  const orient=form.orientationType||"simple",isAdv=orient==="pillar"||orient==="directional";
  const tags=form.tags||[];
  const selTex=textures.find(t=>t.id===form.textureId);
  const save=async()=>{
    if(!form.id.trim())return;setSaving(true);setStatus([]);
    const CN=form.customConstName?form.constName:form.id.toUpperCase();
    const block={...form,constName:CN,savedAt:Date.now()};
    const entries=gBlockEntries(block,textures);const msgs=[];
    const wt=async(texId,fname,folder)=>{
      if(!texId)return;
      let dataUrl;
      if(texId.startsWith("__direct__")){
        dataUrl = texId.split("__name__")[0].replace("__direct__","");
      }else{
        const t=textures.find(x=>x.id===texId);
        if(t) dataUrl = t.dataUrl;
      }
      if(!dataUrl)return;
      const j=await api("/texture",{filename:fname,dataUrl,folder:folder||"block"});
      msgs.push({ok:j.ok,label:`tex:${fname}`,msg:j.ok?"ok":j.reason});
    };

    await wt(form.textureId,`${form.id}.png`,"block");
    if(orient==="pillar"){await wt(form.textureTopId,`${form.id}_top.png`,"block");await wt(form.textureBottomId,`${form.id}_bottom.png`,"block");await wt(form.textureSideId,`${form.id}_side.png`,"block");}
    if(orient==="directional"){await wt(form.textureTopId,`${form.id}_top.png`,"block");await wt(form.textureBottomId,`${form.id}_bottom.png`,"block");await wt(form.textureFrontId,`${form.id}_front.png`,"block");await wt(form.textureBackId,`${form.id}_back.png`,"block");await wt(form.textureLeftId,`${form.id}_left.png`,"block");await wt(form.textureRightId,`${form.id}_right.png`,"block");}
    if(form.createDoor){await wt(form.textureDoorTopId,`${form.id}_door_top.png`,"block");await wt(form.textureDoorBottomId||form.textureId,`${form.id}_door_bottom.png`,"block");await wt(form.textureDoorItemId,`${form.id}_door.png`,"item");}
    if(form.createTrapdoor)await wt(form.textureTrapdoorId||form.textureId,`${form.id}_trapdoor.png`,"block");

    if(!isEdit){
      const j2=await api("/blocks/register",{entries,creativeTab:form.creativeTab});
      msgs.push({ok:j2.ok,label:`ModBlocks(${entries.length})`,msg:j2.ok?"ok":j2.reason});
      if(j2.results)j2.results.forEach(r=>msgs.push({ok:r.ok,label:r.constName,msg:r.ok?"ok":r.reason}));
      if(form.tags?.length){const jt=await api("/tags/set",{id:form.id,constName:CN,tags:form.tags,isBlock:true});msgs.push({ok:jt.ok,label:"tags",msg:jt.ok?`${jt.added||0} ok`:jt.reason});}else{await api("/tags/delete",{constName:CN,isBlock:true});}
      if(gRecipe(form.id,form,true)){const jr=await api("/recipes/set",{id:form.id,constName:CN,recipeCode:gRecipe(form.id,form,true)});msgs.push({ok:jr.ok,label:"recipe",msg:jr.ok?"ok":jr.reason});}
      else{const jr=await api("/recipes/delete",{constName:CN});msgs.push({ok:jr.ok,label:"recipe del",msg:jr.ok?"ok":jr.reason});}
    }else{
      const j=await api("/blocks/update",{oldConstName:initial.constName||initial.id?.toUpperCase(),oldId:initial.id,entries,newConstName:CN,newId:form.id,langKey:entries[0].langKey,langVal:entries[0].langVal,creativeTab:form.creativeTab});
      msgs.push({ok:j.ok,label:`ModBlocks(${entries.length}) update`,msg:j.ok?"ok":j.reason});
      if(j.results)j.results.forEach(r=>msgs.push({ok:r.ok,label:r.constName,msg:r.ok?"ok":r.reason}));
      if(form.tags?.length){const jt=await api("/tags/set",{id:form.id,constName:CN,tags:form.tags,isBlock:true});msgs.push({ok:jt.ok,label:"tags",msg:jt.ok?`${jt.added||0} ok`:jt.reason});}else{await api("/tags/delete",{constName:CN,isBlock:true});}
      if(gRecipe(form.id,form,true)){const jr=await api("/recipes/set",{id:form.id,constName:CN,recipeCode:gRecipe(form.id,form,true)});msgs.push({ok:jr.ok,label:"recipe",msg:jr.ok?"ok":jr.reason});}
      else{const jr=await api("/recipes/delete",{constName:CN});msgs.push({ok:jr.ok,label:"recipe del",msg:jr.ok?"ok":jr.reason});}
    }
    if(form.creativeTab){const jt=await api("/creativetab",{ref:`ModBlocks.${CN}`,blockId:form.id,tabConst:form.creativeTab});msgs.push({ok:jt.ok,label:"tab",msg:jt.ok?"ok":jt.reason});}
    if(form.hasTooltip){for(const tk of gTTKeys(form.id,form)){const jt=await api("/lang/set",{key:tk.key,value:tk.value,update:isEdit});msgs.push({ok:jt.ok,label:tk.key,msg:jt.ok?"ok":jt.reason});}}
    else if(isEdit){await api("/lang/delete",{keys:[`tooltip.${MODID}.${form.id}.normal`,`tooltip.${MODID}.${form.id}.shift_hint`,`tooltip.${MODID}.${form.id}.hidden`]});}
    await api("/models/sync",{});
    setStatus(msgs);setSaving(false);onSave(block,initial?.id);
  };
  const ER=({label,panel,badge,count})=><EditRow label={label} panel={panel} badge={badge} count={count} activePanel={activePanel} setActivePanel={setActivePanel}/>;
  const setFace=(fkey)=>{setHighlightFaceKey(fkey);setActivePanel("texture");};
  const TexRow=({label,fkey})=>{
    const t=textures.find(x=>x.id===form[fkey]);
    const dUrl=(form[fkey]||"").startsWith("__direct__")?form[fkey].split("__name__")[0].replace("__direct__",""):null;
    const hasVal=!!(t||dUrl);
    return<div style={{display:"flex",flexDirection:"column",gap:4,marginTop:6}}>
      <Lbl>{label}</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
          {hasVal
            ?<AImg url={t?.dataUrl||dUrl} size={20}/>
            :<div style={{width:20,height:20,background:C.prev,borderRadius:3,border:`1px dashed ${C.inpB}`,flexShrink:0}}/>
          }
          <span style={{fontSize:13,color:hasVal?C.text:C.faint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t?t.label:dUrl?"(direct)":"none selected"}</span>
        </div>
        <Btn sm v={activePanel==="texture"?"p":"g"} onClick={()=>setFace(fkey)} style={{marginLeft:8,flexShrink:0}}>{hasVal?"edit":"set"}</Btn>
      </div>
    </div>;
  };
  const dropType=orient==="simple"?(form.dropType||"Self"):"Self";
  return<div style={{padding:"20px 20px 100px",display:"flex",flexDirection:"column",gap:13}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:14,fontWeight:500}}>{isEdit?"Edit Block":"New Block"}</span></div>
    <Inp label="Display Name" value={form.displayName} onChange={v=>F("displayName",v)}/>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:4}}><Lbl>ID</Lbl>{valId(form.id)&&form.id&&<span style={{fontSize:11,color:"#ff7777"}}>{valId(form.id)}</span>}</div><Chk label="Custom const" checked={!!form.customConstName} onChange={v=>F("customConstName",v)}/></div>
      <input value={form.id} onChange={e=>{const v=e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"");F("id",v);if(!form.customConstName)F("constName",v.toUpperCase());}} style={{...SI.inp}}/>
    </div>
    <ConstField form={form} F={F}/>
    <Sel label="Block Orientation" value={orient} onChange={v=>F("orientationType",v)} options={[{value:"simple",label:"Simple"},{value:"pillar",label:"Pillar"},{value:"directional",label:"Directional"}]}/>
    {orient==="simple"&&<TexRow label="Texture" fkey="textureId"/>}
    {orient==="pillar"&&<div style={{display:"flex",flexDirection:"column",gap:2}}>
      <div style={{borderTop:`1px solid ${C.inpB}`,paddingTop:8}}><TexRow label="Top" fkey="textureTopId"/></div>
      <TexRow label="Side" fkey="textureSideId"/>
      <TexRow label="Bottom" fkey="textureBottomId"/>
    </div>}
    {orient==="directional"&&<div style={{display:"flex",flexDirection:"column",gap:2}}>
      <div style={{borderTop:`1px solid ${C.inpB}`,paddingTop:8}}><TexRow label="Top" fkey="textureTopId"/></div>
      <TexRow label="Bottom" fkey="textureBottomId"/>
      <TexRow label="Front" fkey="textureFrontId"/>
      <TexRow label="Back" fkey="textureBackId"/>
      <TexRow label="Left" fkey="textureLeftId"/>
      <TexRow label="Right" fkey="textureRightId"/>
    </div>}
    <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:6}}>
      <Lbl>Drop</Lbl>
      <Sel value={dropType==="Ore"?"Custom":dropType} onChange={v=>F("dropType",v)} options={["Self","Custom"]} disabled={orient!=="simple"}/>
      {(dropType==="Custom"||dropType==="Ore")&&<div style={{display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
        <SearchSel label="Drop Item/Block" value={form.dropItem} onChange={v=>F("dropItem",v)} options={dropItemOptions} freeform/>
        <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
          <Chk label="Fortune" checked={!!form.dropFortune} onChange={v=>F("dropFortune",v)}/>
        </div>
        {form.dropFortune&&<Inp label="XP" value={form.dropXp} onChange={v=>F("dropXp",v)}/>}
      </div>}
    </div>
    <Sel label="Creative Tab" value={form.creativeTab} onChange={v=>F("creativeTab",v)} options={creativeTabOptions}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Inp label="Hardness" value={form.strength} onChange={v=>F("strength",v)} type="number"/><SearchSel label="Sound" value={form.soundType||"WOOD"} onChange={v=>F("soundType",v)} options={SOUND_TYPES.map(s=>({value:s,label:s}))}/></div>
    {orient==="simple"&&<div style={{display:"flex",flexDirection:"column",gap:4}}>
      <Lbl>Variants{(()=>{const vc=[["createSlab","Slab"],["createStairs","Stairs"],["createFence","Fence"],["createFenceGate","Fence Gate"],["createWall","Wall"],["createPressurePlate","Pressure Plate"],["createButton","Button"],["createDoor","Door"],["createTrapdoor","Trapdoor"]].filter(([k])=>form[k]).length;return vc>0?<span style={{color:C.accent,marginLeft:5}}>{vc}</span>:null;})()}</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
        <span style={{fontSize:13,color:(()=>{const v=[["createSlab","Slab"],["createStairs","Stairs"],["createFence","Fence"],["createFenceGate","Fence Gate"],["createWall","Wall"],["createPressurePlate","Pressure Plate"],["createButton","Button"],["createDoor","Door"],["createTrapdoor","Trapdoor"]].filter(([k])=>form[k]);return v.length?C.text:C.faint;})()}}>{(()=>{const v=[["createSlab","Slab"],["createStairs","Stairs"],["createFence","Fence"],["createFenceGate","Fence Gate"],["createWall","Wall"],["createPressurePlate","Pressure Plate"],["createButton","Button"],["createDoor","Door"],["createTrapdoor","Trapdoor"]].filter(([k])=>form[k]).map(([,l])=>l);return v.length?v.join(", "):"none";})()}</span>
        <Btn sm v={activePanel==="variants"?"p":"g"} onClick={()=>setActivePanel(p=>p==="variants"?null:"variants")} style={{marginLeft:8,flexShrink:0}}>{(()=>{const vc=[["createSlab"],["createStairs"],["createFence"],["createFenceGate"],["createWall"],["createPressurePlate"],["createButton"],["createDoor"],["createTrapdoor"]].filter(([k])=>form[k]).length;return vc?"edit":"set";})()}</Btn>
      </div>
    </div>}
    <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:4}}>
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

export function BlockRight({textures,modItems=[],modBlocks=[],activePanel,setActivePanel,highlightFaceKey}){
  return<RightPaneShell modItems={modItems} modBlocks={modBlocks} textures={textures} isBlock={true} activePanel={activePanel} setActivePanel={setActivePanel} highlightFaceKey={highlightFaceKey}/>;
}
