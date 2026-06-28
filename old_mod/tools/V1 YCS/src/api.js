import { useState, useCallback, useEffect, useMemo } from "react";
import { BASE, BUILTIN_CREATIVE_TABS } from "./constants.js";

export function useLS(k,i){const[v,sv]=useState(()=>{try{const s=localStorage.getItem(k);return s?JSON.parse(s):i;}catch{return i;}});const set=useCallback(nv=>{const n=typeof nv==="function"?nv(v):nv;sv(n);try{localStorage.setItem(k,JSON.stringify(n));}catch{}},[k,v]);return[v,set];}

export async function api(ep,body){try{const r=await fetch(`${BASE}${ep}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});return await r.json();}catch{return{ok:false,reason:"offline"};}}

export function useVanillaItems(){
  const[vanillaItems,setVanillaItems]=useState([]);
  useEffect(()=>{fetch(`${BASE}/items/vanilla`).then(r=>r.json()).then(j=>{if(j.ok)setVanillaItems(j.items||[]);}).catch(()=>{});},[]);
  return vanillaItems;
}

export function useCreativeTabs(){
  const[customTabs,setCustomTabs]=useState([]);
  const reload=useCallback(()=>{fetch(`${BASE}/creativetabs/list`).then(r=>r.json()).then(j=>{if(j.ok)setCustomTabs(j.tabs||[]);}).catch(()=>{});},[]);
  useEffect(()=>{reload();},[reload]);
  const options=useMemo(()=>[...BUILTIN_CREATIVE_TABS,...customTabs.map(t=>({value:`ModCreativeModeTabs.${t.key.toUpperCase()}`,label:t.titleText||t.key,vanilla:false,custom:true,key:t.key}))],[customTabs]);
  return{customTabs,options,reload};
}

export function useRun(){
  const[rs,setRs]=useState({dirty:false,state:"idle",log:[]});const[running,setRunning]=useState(false);
  useEffect(()=>{const id=setInterval(()=>fetch(`${BASE}/run/state`).then(r=>r.json()).then(setRs).catch(()=>{}),2000);return()=>clearInterval(id);},[]);
  const run=async ep=>{setRunning(true);try{await fetch(`${BASE}${ep}`,{method:"POST"});}catch{}setRunning(false);};
  return{rs,running,run};
}
