import React, { useContext } from "react";
import { FormCtx } from "../context.js";
import { Chk, Lbl } from "../components/ui.jsx";
import { VariantTexRow } from "../components/TexSel.jsx";
import { C } from "../theme.js";

export default function VariantsPanel({textures}){
  const{form,F}=useContext(FormCtx);
  const VARIANTS=[["createSlab","Slab"],["createStairs","Stairs"],["createFence","Fence"],["createFenceGate","Fence Gate"],["createWall","Wall"],["createPressurePlate","Pressure Plate"],["createButton","Button"],["createDoor","Door"],["createTrapdoor","Trapdoor"]];
  return<div style={{padding:"14px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:10}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>{VARIANTS.map(([k,l])=><Chk key={k} label={l} checked={!!form[k]} onChange={v=>F(k,v)}/>)}</div>
    {form.createDoor&&<div style={{paddingLeft:10,borderLeft:`2px solid ${C.inpB}`,display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
      <Lbl>Door Textures</Lbl>
      <VariantTexRow textures={textures} value={form.textureDoorTopId||""} onChange={v=>F("textureDoorTopId",v)} label="Top"/>
      <VariantTexRow textures={textures} value={form.textureDoorBottomId||""} onChange={v=>F("textureDoorBottomId",v)} label="Bottom"/>
      <VariantTexRow textures={textures} value={form.textureDoorItemId||""} onChange={v=>F("textureDoorItemId",v)} label="Item"/>
    </div>}
    {form.createTrapdoor&&<div style={{paddingLeft:10,borderLeft:`2px solid ${C.inpB}`,display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
      <Lbl>Trapdoor Texture</Lbl>
      <VariantTexRow textures={textures} value={form.textureTrapdoorId||""} onChange={v=>F("textureTrapdoorId",v)} label="Texture"/>
    </div>}
  </div>;
}
