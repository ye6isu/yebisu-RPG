import React, { useContext } from "react";
import { FormCtx } from "../context.js";
import { Chk, Txta, Inp, Lbl } from "../components/ui.jsx";

export default function TooltipPanel(){
  const{form,F}=useContext(FormCtx);
  const dis=!form.hasTooltip;
  return<div style={{padding:"14px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:10}}>
    <Chk label="Add tooltip?" checked={!!form.hasTooltip} onChange={v=>F("hasTooltip",v)}/>
    <div style={{opacity:dis?0.35:1,pointerEvents:dis?"none":"auto",display:"flex",flexDirection:"column",gap:10}}>
      <Txta label="Normal text" value={form.tooltipNormal||""} onChange={v=>F("tooltipNormal",v)} rows={2}/>
      <Chk label="Shift-to-reveal?" checked={!!form.hasHiddenTooltip} onChange={v=>F("hasHiddenTooltip",v)}/>
      <div style={{opacity:form.hasHiddenTooltip?1:0.35,pointerEvents:form.hasHiddenTooltip?"auto":"none",display:"flex",flexDirection:"column",gap:10}}>
        <Chk label="Use default shift hint" checked={!!form.useDefaultShiftHint} onChange={v=>F("useDefaultShiftHint",v)}/>
        <Inp label="Custom hint" value={form.tooltipShiftHint||""} onChange={v=>F("tooltipShiftHint",v)} style={{opacity:form.useDefaultShiftHint?0.35:1}}/>
        <Txta label="Hidden text" value={form.tooltipHidden||""} onChange={v=>F("tooltipHidden",v)} rows={3}/>
      </div>
    </div>
  </div>;
}
