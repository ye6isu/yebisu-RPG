import React, { useState, useRef, useCallback, useEffect, useMemo, createContext, useContext } from "react";

class ErrorBoundary extends React.Component {
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


const MODID="yebisurpg", BASE="http://localhost:3001/api";
const FONT_URL=`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@200;400;500;700;800&display=swap');`;
const G_CSS=`*{box-sizing:border-box;margin:0;padding:0;}html,body,#root{height:100%;overflow:hidden;}body{background:#161616;color:#f0f0ec;font-family:'JetBrains Mono',monospace;font-size:13px;}::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-track{background:#1a1a1a;}::-webkit-scrollbar-thumb{background:#3a3a3c;border-radius:3px;}input[type=number]::-webkit-inner-spin-button{opacity:1;}button:focus{outline:none;}select{appearance:none;-webkit-appearance:none;}select option{background:#212121;color:#f0f0ec;}*{-webkit-user-select:none;user-select:none;}input,textarea,select{-webkit-user-select:text!important;user-select:text!important;}`;
const TAB_W=116,TAB_H=28;
const TIERS=["Wood","Stone","Iron","Diamond","Netherite","YE6ISU"];
const TIER_MAP={Wood:"Tiers.WOOD",Stone:"Tiers.STONE",Iron:"Tiers.IRON",Diamond:"Tiers.DIAMOND",Netherite:"Tiers.NETHERITE",YE6ISU:"ModToolTiers.YE6ISU"};
const TOOL_TYPES=["Sword","Pickaxe","Axe","Shovel","Hoe"];
const SOUND_TYPES=["STONE","WOOD","METAL","GRASS","SAND","GRAVEL","GLASS","CLOTH","SNOW","LANTERN","CHAIN","COPPER","DEEPSLATE","TUFF","CALCITE"];
const CREATIVE_TABS=[{value:"",label:"(none)"},{value:"ModCreativeModeTabs.YEBISURPG_ITEMS_TAB",label:"yebisu RPG Items"},{value:"ModCreativeModeTabs.YEBISURPG_BLOCK_TAB",label:"yebisu RPG Blocks"},{value:"vanilla:combat",label:"Combat"},{value:"vanilla:tools_and_utilities",label:"Tools & Utilities"},{value:"vanilla:food_and_drinks",label:"Food & Drinks"},{value:"vanilla:ingredients",label:"Ingredients"},{value:"vanilla:building_blocks",label:"Building Blocks"},{value:"vanilla:redstone",label:"Redstone"},{value:"vanilla:natural_blocks",label:"Natural Blocks"}];
const COMMON_TAGS=["minecraft:axes","minecraft:hoes","minecraft:pickaxes","minecraft:shovels","minecraft:swords","minecraft:tools","minecraft:logs","minecraft:planks","minecraft:slabs","minecraft:stairs","minecraft:fences","minecraft:doors","minecraft:trapdoors","minecraft:walls","minecraft:buttons","minecraft:pressure_plates","minecraft:flowers","minecraft:saplings","minecraft:coals","minecraft:diamonds","neoforge:foods","neoforge:tools","neoforge:gems","neoforge:ingots","neoforge:nuggets","neoforge:ores","neoforge:storage_blocks","minecraft:mineable/pickaxe","minecraft:mineable/axe","minecraft:mineable/shovel","minecraft:mineable/hoe","minecraft:needs_stone_tool","minecraft:needs_iron_tool","minecraft:needs_diamond_tool"];
const VANILLA_INGR=["minecraft:air","minecraft:iron_ingot","minecraft:gold_ingot","minecraft:diamond","minecraft:emerald","minecraft:netherite_ingot","minecraft:oak_planks","minecraft:birch_planks","minecraft:stick","minecraft:cobblestone","minecraft:stone","minecraft:obsidian","minecraft:iron_block","minecraft:gold_block","minecraft:diamond_block","minecraft:coal","minecraft:charcoal","minecraft:flint","minecraft:leather","minecraft:string","minecraft:feather","minecraft:bone","minecraft:blaze_rod","minecraft:ender_pearl","minecraft:glass","minecraft:sand","minecraft:gravel","minecraft:redstone","minecraft:lapis_lazuli","minecraft:quartz","minecraft:copper_ingot","minecraft:amethyst_shard","minecraft:oak_log"];
const VANILLA_EFFECTS=["MobEffects.MOVEMENT_SPEED","MobEffects.MOVEMENT_SLOWDOWN","MobEffects.DIG_SPEED","MobEffects.DIG_SLOWDOWN","MobEffects.DAMAGE_BOOST","MobEffects.HEAL","MobEffects.HARM","MobEffects.DAMAGE_RESISTANCE","MobEffects.JUMP","MobEffects.CONFUSION","MobEffects.REGENERATION","MobEffects.FIRE_RESISTANCE","MobEffects.WATER_BREATHING","MobEffects.INVISIBILITY","MobEffects.BLINDNESS","MobEffects.NIGHT_VISION","MobEffects.HUNGER","MobEffects.WEAKNESS","MobEffects.POISON","MobEffects.WITHER","MobEffects.HEALTH_BOOST","MobEffects.ABSORPTION","MobEffects.SATURATION","MobEffects.GLOWING","MobEffects.LEVITATION","MobEffects.LUCK","MobEffects.UNLUCK","MobEffects.SLOW_FALLING","MobEffects.CONDUIT_POWER","MobEffects.DOLPHINS_GRACE","MobEffects.BAD_OMEN","MobEffects.HERO_OF_THE_VILLAGE","MobEffects.DARKNESS","MobEffects.TRIAL_OMEN","MobEffects.RAID_OMEN","MobEffects.WIND_CHARGED","MobEffects.WEAVING","MobEffects.OOZING","MobEffects.INFESTED"];
const TAG_GROUPS=[{label:"Any Wood Planks",tag:"minecraft:planks"},{label:"Any Wood Log",tag:"minecraft:logs"},{label:"Any Stone",tag:"minecraft:stone_crafting_materials"},{label:"Any Iron Ingot",tag:"neoforge:ingots/iron"},{label:"Any Gold Ingot",tag:"neoforge:ingots/gold"},{label:"Any Copper Ingot",tag:"neoforge:ingots/copper"},{label:"Any Diamond",tag:"neoforge:gems/diamond"},{label:"Any Emerald",tag:"neoforge:gems/emerald"},{label:"Any Coal",tag:"minecraft:coals"},{label:"Any Wool",tag:"minecraft:wool"},{label:"Any Glass",tag:"neoforge:glass_blocks"},{label:"Any Stick",tag:"neoforge:rods/wooden"}];
const C={bg:"#161616",panel:"#141414",pb:"#3a3a3c",tabBar:"#212121",card:"#1e1e1e",prev:"#0e0e0e",text:"#f0f0ec",dim:"#787872",faint:"#343430",accent:"#5a9fd4",inp:"#181818",inpB:"#252528",r:6.5};
const SI={lbl:{fontSize:11,color:C.dim,textTransform:"uppercase",letterSpacing:.8,fontWeight:400},inp:{background:C.inp,border:`1px solid ${C.inpB}`,borderRadius:4,padding:"7px 10px",color:C.text,fontSize:13,fontFamily:"'JetBrains Mono',monospace",outline:"none",width:"100%"}};
const FormCtx=createContext(null);

function useLS(k,i){const[v,sv]=useState(()=>{try{const s=localStorage.getItem(k);return s?JSON.parse(s):i;}catch{return i;}});const set=useCallback(nv=>{const n=typeof nv==="function"?nv(v):nv;sv(n);try{localStorage.setItem(k,JSON.stringify(n));}catch{}},[k,v]);return[v,set];}
async function api(ep,body){try{const r=await fetch(`${BASE}${ep}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});return await r.json();}catch{return{ok:false,reason:"offline"};}}

const Lbl=({children,c})=><span style={{...SI.lbl,color:c||C.dim}}>{children}</span>;
function Btn({children,onClick,v="d",sm,dis,style:extStyle={}}){const vs={d:{bg:"#222226",c:C.text},p:{bg:C.accent,c:"#06080e"},dan:{bg:"#200e0e",c:"#ff7777"},g:{bg:"transparent",c:C.dim,b:`1px solid ${C.inpB}`}};const vv=vs[v]||vs.d;return<button disabled={dis} onClick={onClick} style={{display:"inline-flex",alignItems:"center",gap:5,padding:sm?"3px 10px":"7px 16px",fontSize:sm?11:13,border:vv.b||"none",borderRadius:4,cursor:dis?"not-allowed":"pointer",fontFamily:"'JetBrains Mono',monospace",fontWeight:500,opacity:dis?0.35:1,background:vv.bg,color:vv.c,whiteSpace:"nowrap",...extStyle}}>{children}</button>;}
function Inp({label,value,onChange,placeholder,type="text",style={}}){return<div style={{display:"flex",flexDirection:"column",gap:4}}>{label&&<Lbl>{label}</Lbl>}<input type={type} value={value??""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{...SI.inp,...style}}/></div>;}
function Sel({label,value,onChange,options}){return<div style={{display:"flex",flexDirection:"column",gap:4}}>{label&&<Lbl>{label}</Lbl>}<div style={{position:"relative"}}><select value={value} onChange={e=>onChange(e.target.value)} style={{...SI.inp,paddingRight:28,cursor:"pointer"}}>{options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select><span style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:C.dim,fontSize:10}}>▾</span></div></div>;}
function Chk({label,checked,onChange}){return<label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}><div onClick={()=>onChange(!checked)} style={{width:14,height:14,border:`1px solid ${checked?C.accent:C.inpB}`,borderRadius:3,background:checked?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{checked&&<svg width="8" height="7" viewBox="0 0 8 7"><path d="M1 3.5l2 2 4-4" stroke="#04060c" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}</div><span style={{fontSize:13,color:"#b0b0aa"}}>{label}</span></label>;}
function Txta({label,value,onChange,placeholder,rows=3}){return<div style={{display:"flex",flexDirection:"column",gap:4}}>{label&&<Lbl>{label}</Lbl>}<textarea value={value??""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...SI.inp,resize:"vertical"}}/></div>;}
function Sect({title,children,open:init=true,accent}){const[o,setO]=useState(init);return<div style={{border:`1px solid ${C.inpB}`,borderRadius:C.r,overflow:"hidden"}}><div onClick={()=>setO(v=>!v)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#191919",cursor:"pointer"}}><span style={{fontSize:12,color:accent||C.accent,fontWeight:500}}>{title}</span><span style={{color:C.faint,fontSize:10}}>{o?"▲":"▼"}</span></div>{o&&<div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:9,background:"#141414"}}>{children}</div>}</div>;}
function Sbar({messages}){if(!messages?.length)return null;return<div style={{display:"flex",flexDirection:"column",gap:3}}>{messages.map((m,i)=><div key={i} style={{padding:"4px 9px",borderRadius:3,fontSize:11,fontFamily:"monospace",background:m.ok?"#091a09":"#1a0909",color:m.ok?"#5acc5a":"#cc5a5a",borderLeft:`2px solid ${m.ok?"#2a6a2a":"#6a2a2a"}`}}>{m.ok?"✓":"✗"} {m.label}: {m.msg}</div>)}</div>;}
function CopyB({code,title}){const[c,setC]=useState(false);return<div style={{background:"#0a0a0c",border:`1px solid ${C.inpB}`,borderRadius:4,overflow:"hidden"}}><div style={{display:"flex",justifyContent:"space-between",padding:"4px 9px",borderBottom:`1px solid ${C.inpB}`,background:"#141416"}}><span style={{fontSize:10,color:C.dim}}>{title}</span><Btn sm v="g" onClick={()=>{navigator.clipboard.writeText(code);setC(true);setTimeout(()=>setC(false),1200);}}>{c?"✓":"copy"}</Btn></div><pre style={{padding:"9px 11px",overflowX:"auto",fontSize:11,lineHeight:1.7,color:"#a8a8a0",whiteSpace:"pre"}}>{code}</pre></div>;}
function Pill({children,onClick,color="#1a2438"}){return<span onClick={onClick} style={{display:"inline-flex",alignItems:"center",gap:4,background:color,borderRadius:3,padding:"2px 7px",fontSize:11,fontFamily:"monospace",cursor:onClick?"pointer":"default",whiteSpace:"nowrap"}}>{children}</span>;}
function Dot({color,title,onClick,disabled}){return<div title={title} onClick={disabled?undefined:onClick} style={{width:13,height:13,borderRadius:"50%",background:color,cursor:disabled?"default":"pointer",flexShrink:0,opacity:disabled?0.3:1}} onMouseEnter={e=>{if(!disabled)e.currentTarget.style.opacity="0.6";}} onMouseLeave={e=>{e.currentTarget.style.opacity=disabled?"0.3":"1";}}/>;}
function valId(id){if(!id)return"required";if(!/^[a-z0-9_]+$/.test(id))return"a-z 0-9 _ only";return null;}
function IdField({label,value,onChange,disabled=false}){const err=valId(value);return<div style={{display:"flex",flexDirection:"column",gap:4}}><Lbl>{label||"ID"}</Lbl><input value={value} onChange={e=>onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,""))} disabled={disabled} style={{...SI.inp,border:`1px solid ${value&&err?"#6a2a2a":C.inpB}`,opacity:disabled?0.5:1}}/>{value&&err&&<span style={{fontSize:10,color:"#cc6a6a"}}>{err}</span>}</div>;}
function ConstField({form,F}){return<div style={{display:"flex",flexDirection:"column",gap:4}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><Lbl>Const name</Lbl><Chk label="custom" checked={!!form.customConstName} onChange={v=>F("customConstName",v)}/></div><input value={form.customConstName?form.constName:(form.id||"").toUpperCase()} onChange={e=>F("constName",e.target.value)} disabled={!form.customConstName} style={{...SI.inp,color:form.customConstName?C.text:C.faint,opacity:form.customConstName?1:0.6}}/></div>;}

function AImg({url,size=52,anim=false,frames=1,ticks=4}){
  const[f,setF]=useState(0);
  useEffect(()=>{if(!anim||frames<=1)return;const id=setInterval(()=>setF(p=>(p+1)%frames),ticks*50);return()=>clearInterval(id);},[anim,frames,ticks]);
  if(!url)return<div style={{width:size,height:size,background:C.prev,border:`1px dashed ${C.inpB}`,borderRadius:4,flexShrink:0}}/>;
  if(anim&&frames>1){const pct=(f/frames)*100;return<div style={{width:size,height:size,overflow:"hidden",borderRadius:4,border:`1px solid ${C.inpB}`,background:C.prev,flexShrink:0}}><img src={url} alt="" style={{width:size,height:size*frames,imageRendering:"pixelated",transform:`translateY(-${pct}%)`,display:"block"}}/></div>;}
  return<img src={url} alt="" style={{width:size,height:size,imageRendering:"pixelated",borderRadius:4,border:`1px solid ${C.inpB}`,background:C.prev,flexShrink:0,objectFit:"contain"}}/>;
}

function TexSel({label,textures,value,onChange}){
  const[srch,setSrch]=useState("");const[open,setOpen]=useState(false);const fRef=useRef();
  const sel=textures.find(t=>t.id===value);
  const filt=useMemo(()=>{const q=srch.toLowerCase();return textures.filter(t=>!q||t.label.toLowerCase().includes(q)||t.id.toLowerCase().includes(q));},[textures,srch]);
  const dUrl=(value||"").startsWith("__direct__")?value.split("__name__")[0].replace("__direct__",""):null;
  const onFile=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>onChange("__direct__"+ev.target.result+"__name__"+f.name);r.readAsDataURL(f);};
  return<div style={{display:"flex",flexDirection:"column",gap:4}}>
    {label&&<Lbl>{label}</Lbl>}
    <div style={{display:"flex",alignItems:"center",gap:7}}>
      <AImg url={sel?.dataUrl||dUrl} size={30} anim={sel?.isAnimated} frames={sel?.frames||1} ticks={sel?.ticksPerFrame||4}/>
      <div style={{flex:1,position:"relative"}}>
        <div onClick={()=>setOpen(v=>!v)} style={{...SI.inp,display:"flex",justifyContent:"space-between",cursor:"pointer",padding:"6px 9px"}}>
          <span style={{color:sel?C.text:C.faint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sel?sel.label:dUrl?"(direct)":"(none)"}</span>
          <span style={{color:C.dim,flexShrink:0}}>▾</span>
        </div>
        {open&&<div style={{position:"absolute",top:"calc(100% + 2px)",left:0,right:0,zIndex:400,background:"#1c1c1c",border:`1px solid ${C.pb}`,borderRadius:4,boxShadow:"0 8px 30px rgba(0,0,0,.8)",maxHeight:240,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"4px 6px",borderBottom:`1px solid ${C.inpB}`}}><input autoFocus value={srch} onChange={e=>setSrch(e.target.value)} placeholder="search…" style={{...SI.inp,padding:"3px 7px",fontSize:12}}/></div>
          <div style={{overflowY:"auto",flex:1}}>
            <div onClick={()=>{onChange("");setOpen(false);}} style={{padding:"6px 9px",cursor:"pointer",color:C.faint,fontSize:12,borderBottom:"1px solid #181818"}}>(none)</div>
            {filt.map(t=><div key={t.id} onClick={()=>{onChange(t.id);setOpen(false);setSrch("");}} style={{padding:"4px 7px",cursor:"pointer",display:"flex",alignItems:"center",gap:7,background:value===t.id?"#1a2438":"transparent",borderBottom:"1px solid #181818"}}>
              <AImg url={t.dataUrl} size={20} anim={t.isAnimated} frames={t.frames||1} ticks={t.ticksPerFrame||4}/>
              <div><div style={{fontSize:12,color:C.text}}>{t.label}{t.isAnimated&&<span style={{color:C.accent,marginLeft:4,fontSize:10}}>[{t.frames}f]</span>}</div><div style={{fontSize:10,color:C.dim}}>{t.id}</div></div>
            </div>)}
            {!filt.length&&<div style={{padding:"9px",color:C.faint,fontSize:12}}>no results</div>}
          </div>
          <div onClick={()=>{setOpen(false);fRef.current.click();}} style={{padding:"6px 9px",borderTop:`1px solid ${C.inpB}`,cursor:"pointer",color:C.dim,fontSize:12}}>from PC…</div>
        </div>}
      </div>
      <input ref={fRef} type="file" accept="image/png" style={{display:"none"}} onChange={onFile}/>
    </div>
  </div>;
}

function EffectSel({ value, onChange, label }) {
  const [srch, setSrch] = useState(value || "");
  const [open, setOpen] = useState(false);
  useEffect(() => { setSrch(value || "") }, [value]);
  const filt = useMemo(() => {
    const q = srch.toLowerCase();
    return VANILLA_EFFECTS.filter(e => e.toLowerCase().includes(q));
  }, [srch]);
  return <div style={{display:"flex", flexDirection:"column", gap:4}}>
    {label && <Lbl>{label}</Lbl>}
    <div style={{position:"relative", flex: 1}}>
      <input 
        value={srch} 
        onChange={e => { setSrch(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="e.g. MobEffects.REGENERATION"
        style={{...SI.inp, width:"100%"}}
      />
      {open && <div style={{position:"absolute", top:"calc(100% + 2px)", left:0, right:0, zIndex:400, background:"#1c1c1c", border:`1px solid ${C.pb}`, borderRadius:4, maxHeight:200, overflowY:"auto"}}>
        {filt.map(e => <div key={e} onMouseDown={() => { onChange(e); setSrch(e); setOpen(false); }} style={{padding:"6px 10px", cursor:"pointer", borderBottom:"1px solid #181818", fontSize:12, color:C.text}}>{e}</div>)}
        {!filt.length && <div style={{padding:"6px 10px", color:C.faint, fontSize:12}}>Custom effect</div>}
      </div>}
    </div>
  </div>;
}

function useRun(){
  const[rs,setRs]=useState({dirty:false,state:"idle",log:[]});const[running,setRunning]=useState(false);
  useEffect(()=>{const id=setInterval(()=>fetch(`${BASE}/run/state`).then(r=>r.json()).then(setRs).catch(()=>{}),2000);return()=>clearInterval(id);},[]);
  const run=async ep=>{setRunning(true);try{await fetch(`${BASE}${ep}`,{method:"POST"});}catch{}setRunning(false);};
  return{rs,running,run};
}

function gTTKeys(id,f){const ks=[];if(f.hasTooltip&&f.tooltipNormal)ks.push({key:`tooltip.${MODID}.${id}.normal`,value:f.tooltipNormal});if(f.hasTooltip&&f.hasHiddenTooltip){if(!f.useDefaultShiftHint&&f.tooltipShiftHint)ks.push({key:`tooltip.${MODID}.${id}.shift_hint`,value:f.tooltipShiftHint});if(f.tooltipHidden)ks.push({key:`tooltip.${MODID}.${id}.hidden`,value:f.tooltipHidden});}return ks;}
function gRecipe(id,form,isBlock=false){
  if(!form.hasRecipe||!form.recipe)return null;
  const r=form.recipe,CN=form.customConstName?form.constName:(form.id||"").toUpperCase();
  const ref=isBlock?`ModBlocks.${CN}.get()`:`ModItems.${CN}.get()`;
  const getIng=(item)=>item.startsWith("#")?`net.minecraft.tags.ItemTags.create(ResourceLocation.parse("${item.slice(1)}"))`:`net.minecraft.core.registries.BuiltInRegistries.ITEM.get(ResourceLocation.parse("${item}"))`;
  const firstItem=Object.values(r.keys||{})[0]||"minecraft:air";
  const itemPath=firstItem.split(":")[1]||firstItem.replace("#","");
  const unlockName=`has_${itemPath.replace(/[^a-z0-9_]/g,"")}`;
  if(r.type==="shaped"){
    const pl=r.pattern.map(row=>`        .pattern("${row}")`).join("\n");
    const dl=Object.entries(r.keys||{}).map(([ch,item])=>`        .define('${ch}', ${getIng(item)})`).join("\n");
    return`ShapedRecipeBuilder.shaped(RecipeCategory.MISC, ${ref}, ${r.result||1})\n${pl}\n${dl}\n        .unlockedBy("${unlockName}", has(${getIng(firstItem)}))\n        .save(recipeOutput);`;
  }
  const il=Object.values(r.keys||{}).map(item=>`        .requires(${getIng(item)})`).join("\n");
  return`ShapelessRecipeBuilder.shapeless(RecipeCategory.MISC, ${ref}, ${r.result||1})\n${il}\n        .unlockedBy("${unlockName}", has(${getIng(firstItem)}))\n        .save(recipeOutput);`;
}
function gTagCode(id,form,isBlock=false){if(!form.tags?.length)return[];const CN=form.customConstName?form.constName:(form.id||"").toUpperCase();const ref=isBlock?`ModBlocks.${CN}.get()`:`ModItems.${CN}.get()`;return form.tags.map(tag=>{const[ns,path]=tag.includes(":")?tag.split(":"):[MODID,tag];return`tag(TagKey.create(Registries.${isBlock?"BLOCK":"ITEM"}, ResourceLocation.fromNamespaceAndPath("${ns}", "${path}"))).add(${ref});`;});}
function idToClassName(id){return id.split("_").map(w=>w?w[0].toUpperCase()+w.slice(1):"").join("")+"Item";}
function gItemCode(item,textures){
  const texId=(item.textureId||"").startsWith("__direct__")?null:item.textureId;const tex=textures.find(t=>t.id===texId);
  const id=item.id||"my_item",CN=item.customConstName?item.constName:id.toUpperCase(),dn=item.displayName||id;
  const cls2=item.customItemClass||null;
  const isTool=!!item.isTool;
  const isFood=!!item.isFood;
  const isFuel=!!item.isFuel;
  const hasDur=!!item.hasDurability&&!isTool; // tools handle durability via tier

  // ── Properties string ──────────────────────────────────────────────────────
  let props="new Item.Properties()";
  if(hasDur) props+=`.durability(${parseInt(item.durability)||100})`;
  else if(!isTool&&item.maxStackSize&&parseInt(item.maxStackSize)!==64) props+=`.stacksTo(${parseInt(item.maxStackSize)})`;

  // ── Inline food/fuel/tooltip only when NO custom class ────────────────────
  let fpReg=null;
  const addTooltipInline=(baseInst)=>{
    if(cls2||!item.hasTooltip)return baseInst;
    const n=item.tooltipNormal?`"tooltip.${MODID}.${id}.normal"`:"null";
    const h=item.hasHiddenTooltip&&item.tooltipHidden?`"tooltip.${MODID}.${id}.hidden"`:"null";
    const s=item.hasHiddenTooltip?(item.useDefaultShiftHint?`"tooltip.${MODID}.shift_to_see"`:(item.tooltipShiftHint?`"tooltip.${MODID}.${id}.shift_hint"`:"null")):"null";
    if(n==="null"&&h==="null")return baseInst;
    let stmts=[];
    if(n!=="null")stmts.push(`                    tooltipComponents.add(Component.translatable(${n}));`);
    if(h!=="null"){stmts.push(`                    if (net.minecraft.client.gui.screens.Screen.hasShiftDown()) {`);stmts.push(`                        tooltipComponents.add(Component.translatable(${h}));`);stmts.push(`                    } else {`);stmts.push(`                        tooltipComponents.add(Component.translatable(${s}).withStyle(net.minecraft.ChatFormatting.YELLOW));`);stmts.push(`                    }`);}
    return`${baseInst} {\n                @Override\n                public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltipComponents, TooltipFlag tooltipFlag) {\n${stmts.join('\n')}\n                    super.appendHoverText(stack, context, tooltipComponents, tooltipFlag);\n                }\n            }`;
  };

  // Inline food: only when no custom class
  if(isFood&&!cls2){
    const al=item.foodAlwaysEdible?".alwaysEdible()":"",n=item.foodNutrition||2,s=parseFloat(item.foodSaturation)||0.3;
    let fx="";if(item.foodEffects?.length){fx=item.foodEffects.map(e=>`.effect(new MobEffectInstance(${e.effect}, ${e.duration}, ${Math.max(0,parseInt(e.level)-1)}), ${parseFloat(e.probability)||1.0}f)`).join("");}
    fpReg=`public static final FoodProperties ${CN}_FOOD = new FoodProperties.Builder().nutrition(${n}).saturationModifier(${s}f)${al}${fx}.build();`;
    props+=`.food(${CN}_FOOD)`;
  }

  let reg="";
  if(isTool){
    const tier=TIER_MAP[item.tier]||"Tiers.IRON",dmg=parseFloat(item.damage)||3,spd=parseFloat(item.speed)||-2.4,tc=`${item.toolType||"Sword"}Item`;
    const toolProps=`new Item.Properties()\n                .attributes(${tc}.createAttributes(${tier}, ${dmg}f, ${spd}f))`;
    if(cls2){
      reg=`public static final DeferredItem<Item> ${CN} = ITEMS.register("${id}",\n        () -> ${addTooltipInline(`new ${cls2}(${toolProps})`)});`;
    } else {
      reg=`public static final DeferredItem<${tc}> ${CN} = ITEMS.register("${id}",\n        () -> ${addTooltipInline(`new ${tc}(${tier}, ${toolProps})`)});`;
    }
  } else if(cls2){
    // Custom class — food/fuel/tooltip are handled inside the .java file via YCS sentinels.
    // For food: we must still pass a base .food() on Properties so the game registers this
    // as an edible item (sets the FOOD data component). The getFoodProperties override in
    // the class then replaces the actual values at runtime.
    let clsProps = props;
    if(isFood) {
      // Minimal placeholder food so the FOOD component is set and eating can begin.
      // The class's getFoodProperties override supplies the real values.
      const al = item.foodAlwaysEdible ? ".alwaysEdible()" : "";
      const n = item.foodNutrition || 2;
      const s = parseFloat(item.foodSaturation) || 0.3;
      clsProps += `.food(new net.minecraft.world.food.FoodProperties.Builder().nutrition(${n}).saturationModifier(${s}f)${al}.build())`;
    }
    reg=`public static final DeferredItem<Item> ${CN} = ITEMS.register("${id}",\n        () -> new ${cls2}(${clsProps}));`;
  } else if(isFuel&&!cls2){
    // Inline fuel: new Item with getBurnTime via anonymous override
    reg=`public static final DeferredItem<Item> ${CN} = ITEMS.register("${id}",\n        () -> ${addTooltipInline(`new Item(${props}) {\n            @Override\n            public int getBurnTime(ItemStack itemStack, @org.jetbrains.annotations.Nullable net.minecraft.world.item.crafting.RecipeType<?> recipeType) {\n                return ${item.burnTime||1600};\n            }\n        }`)});`;
  } else {
    reg=`public static final DeferredItem<Item> ${CN} = ITEMS.register("${id}",\n        () -> ${addTooltipInline(`new Item(${props})`)});`;
  }

  const isHandheld=item.holdingMode==="handheld";
  const modelLine=isHandheld?`handheldItem(ModItems.${CN});`:(tex?.isAnimated?`existingFileHelper.trackGenerated(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID,"item/${id}"),TEXTURE);\n        getBuilder(ModItems.${CN}.getId().getPath()).parent(new ModelFile.UncheckedModelFile("minecraft:item/generated")).texture("layer0","${MODID}:item/${id}");`:`basicItem(ModItems.${CN}.get());`);
  return{reg,langKey:`item.${MODID}.${id}`,langVal:dn,modelLine,tex,CN,fpReg};
}
function gBlockEntries(block,textures=[]){
  const id=block.id||"my_block",CN=block.customConstName?block.constName:id.toUpperCase(),dn=block.displayName||id;
  const str=parseFloat(block.strength)||2.0,snd=block.soundType||"WOOD",tf="";
  const props=`BlockBehaviour.Properties.of()\n                    .strength(${str}f)\n                    .sound(SoundType.${snd})${tf}`;
  const orient=block.orientationType||"simple";
  const dropType=orient==="simple"?(block.dropType||"Self"):"Self";
  let lt=`dropSelf(ModBlocks.${CN}.get());`;
  if(dropType==="Ore"||dropType==="Custom"){
    const itemRef=block.dropItem?`net.minecraft.core.registries.BuiltInRegistries.ITEM.get(ResourceLocation.parse("${block.dropItem}"))`:`net.minecraft.world.item.Items.COAL`;
    if(dropType==="Ore"){
      lt=`add(ModBlocks.${CN}.get(), block -> createOreDrop(ModBlocks.${CN}.get(), ${itemRef}));`;
    } else {
      lt=`add(ModBlocks.${CN}.get(), block -> createSingleItemTableWithSilkTouch(ModBlocks.${CN}.get(), ${itemRef}));`;
    }
  }
  let bp=props;
  let cls="Block";
  if(dropType==="Ore"){
    cls="DropExperienceBlock";
    const xp=block.dropXp||"1";
    const [minXp,maxXp]=xp.includes("-")?xp.split("-"):[xp,xp];
    bp=`net.minecraft.util.valueproviders.UniformInt.of(${parseInt(minXp)||1}, ${parseInt(maxXp)||1}), ${props}`;
  }
  const entries=[];
  let ml="",bsp="",loot=lt,mdl="";
  if(orient==="pillar"){
    ml=`public static final DeferredBlock<RotatedPillarBlock> ${CN} = registerBlock("${id}",\n        () -> new RotatedPillarBlock(${bp}));`;
    bsp=`ModelFile ${id}Model = models().cubeBottomTop("${id}", modLoc("block/${id}_side"), modLoc("block/${id}_bottom"), modLoc("block/${id}_top"));\n        axisBlock((RotatedPillarBlock)ModBlocks.${CN}.get(), ${id}Model, ${id}Model);\n        simpleBlockItem(ModBlocks.${CN}.get(), ${id}Model);`;
    mdl=`getBuilder(ModBlocks.${CN}.getId().getPath()).parent(new ModelFile.UncheckedModelFile("${MODID}:block/${id}"));`;
  }
  else if(orient==="directional"){
    ml=`public static final DeferredBlock<Block> ${CN} = registerBlock("${id}",\n        () -> new Block(${bp}) {\n            {\n                this.registerDefaultState(this.stateDefinition.any().setValue(net.minecraft.world.level.block.state.properties.BlockStateProperties.HORIZONTAL_FACING, net.minecraft.core.Direction.NORTH));\n            }\n            @Override\n            protected void createBlockStateDefinition(net.minecraft.world.level.block.state.StateDefinition.Builder<Block, net.minecraft.world.level.block.state.BlockState> builder) {\n                builder.add(net.minecraft.world.level.block.state.properties.BlockStateProperties.HORIZONTAL_FACING);\n            }\n            @Override\n            public net.minecraft.world.level.block.state.BlockState getStateForPlacement(net.minecraft.world.item.context.BlockPlaceContext context) {\n                return this.defaultBlockState().setValue(net.minecraft.world.level.block.state.properties.BlockStateProperties.HORIZONTAL_FACING, context.getHorizontalDirection().getOpposite());\n            }\n        });`;
    bsp=`ModelFile ${id}Model = models().withExistingParent("${id}", "minecraft:block/cube")\n            .texture("particle", modLoc("block/${id}_front"))\n            .texture("down", modLoc("block/${id}_bottom"))\n            .texture("up", modLoc("block/${id}_top"))\n            .texture("north", modLoc("block/${id}_front"))\n            .texture("south", modLoc("block/${id}_back"))\n            .texture("east", modLoc("block/${id}_right"))\n            .texture("west", modLoc("block/${id}_left"));\n        horizontalBlock(ModBlocks.${CN}.get(), ${id}Model);\n        simpleBlockItem(ModBlocks.${CN}.get(), ${id}Model);`;
    mdl=`getBuilder(ModBlocks.${CN}.getId().getPath()).parent(new ModelFile.UncheckedModelFile("${MODID}:block/${id}"));`;
  }
  else{
    ml=`public static final DeferredBlock<${cls}> ${CN} = registerBlock("${id}",\n        () -> new ${cls}(${bp}));`;
    bsp=`blockWithItem(ModBlocks.${CN});`;
    mdl=`getBuilder(ModBlocks.${CN}.getId().getPath()).parent(new ModelFile.UncheckedModelFile("${MODID}:block/${id}"));`;
  }
  entries.push({line:ml,constName:CN,bspLines:bsp,lootLine:loot,modelLine:mdl,langKey:`block.${MODID}.${id}`,langVal:dn,blockId:id});
  const bt=`blockTexture(ModBlocks.${CN}.get())`;
  const bId=id.endsWith("_block")?id.slice(0,-6):id,bCN=CN.endsWith("_BLOCK")?CN.slice(0,-6):CN;
  const sbp=`BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${snd})${tf}`;
  const mk=(sfx,scls,extra,bs,slt,mod,lv)=>{const nId=`${bId}${sfx}`,nCN=`${bCN}${sfx.toUpperCase()}`;entries.push({line:`public static final DeferredBlock<${scls}> ${nCN} = registerBlock("${nId}",\n        () -> new ${scls}(${extra}));`,constName:nCN,bspLines:bs,lootLine:slt,modelLine:mod,langKey:`block.${MODID}.${nId}`,langVal:`${dn} ${lv}`,blockId:nId});};
  if(block.createSlab)mk("_slab","SlabBlock",sbp,`slabBlock(ModBlocks.${bCN}_SLAB.get(),${bt},${bt});\n        blockItem(ModBlocks.${bCN}_SLAB);`,`add(ModBlocks.${bCN}_SLAB.get(),b->createSlabItemTable(ModBlocks.${bCN}_SLAB.get()));`,"/*slab*/","Slab");
  if(block.createStairs)mk("_stairs","StairBlock",`ModBlocks.${CN}.get().defaultBlockState(),${sbp}`,`stairsBlock(ModBlocks.${bCN}_STAIRS.get(),${bt});\n        blockItem(ModBlocks.${bCN}_STAIRS);`,`dropSelf(ModBlocks.${bCN}_STAIRS.get());`,"/*stairs*/","Stairs");
  if(block.createFence)mk("_fence","FenceBlock",sbp,`fenceBlock(ModBlocks.${bCN}_FENCE.get(),${bt});`,`dropSelf(ModBlocks.${bCN}_FENCE.get());`,`fenceItem(ModBlocks.${bCN}_FENCE,ModBlocks.${CN});`,"Fence");
  if(block.createFenceGate)mk("_fence_gate","FenceGateBlock",`WoodType.OAK,${sbp}`,`fenceGateBlock(ModBlocks.${bCN}_FENCE_GATE.get(),${bt});\n        blockItem(ModBlocks.${bCN}_FENCE_GATE);`,`dropSelf(ModBlocks.${bCN}_FENCE_GATE.get());`,"/*fgate*/","Fence Gate");
  if(block.createWall)mk("_wall","WallBlock",sbp,`wallBlock(ModBlocks.${bCN}_WALL.get(),${bt});`,`dropSelf(ModBlocks.${bCN}_WALL.get());`,`wallItem(ModBlocks.${bCN}_WALL,ModBlocks.${CN});`,"Wall");
  if(block.createPressurePlate)mk("_pressure_plate","PressurePlateBlock",`BlockSetType.IRON,${sbp}`,`pressurePlateBlock(ModBlocks.${bCN}_PRESSURE_PLATE.get(),${bt});\n        blockItem(ModBlocks.${bCN}_PRESSURE_PLATE);`,`dropSelf(ModBlocks.${bCN}_PRESSURE_PLATE.get());`,"/*pp*/","Pressure Plate");
  if(block.createButton)mk("_button","ButtonBlock",`BlockSetType.IRON,20,BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${snd}).noCollission()${tf}`,`buttonBlock(ModBlocks.${bCN}_BUTTON.get(),${bt});`,`dropSelf(ModBlocks.${bCN}_BUTTON.get());`,`buttonItem(ModBlocks.${bCN}_BUTTON,ModBlocks.${CN});`,"Button");
  if(block.createDoor)mk("_door","DoorBlock",`BlockSetType.IRON,BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${snd}).noOcclusion()${tf}`,`doorBlockWithRenderType(ModBlocks.${bCN}_DOOR.get(),modLoc("block/${bId}_door_bottom"),modLoc("block/${bId}_door_top"),"cutout");`,`add(ModBlocks.${bCN}_DOOR.get(),b->createDoorTable(ModBlocks.${bCN}_DOOR.get()));`,`basicItem(ModBlocks.${bCN}_DOOR.asItem());`,"Door");
  if(block.createTrapdoor)mk("_trapdoor","TrapDoorBlock",`BlockSetType.IRON,BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${snd}).noOcclusion()${tf}`,`trapdoorBlockWithRenderType(ModBlocks.${bCN}_TRAPDOOR.get(),modLoc("block/${bId}_trapdoor"),true,"cutout");\n        blockItem(ModBlocks.${bCN}_TRAPDOOR,'_bottom');`,`dropSelf(ModBlocks.${bCN}_TRAPDOOR.get());`,"/*trapdoor*/","Trapdoor");
  return entries;
}

// ─── Visual Scripting: Method Definitions ─────────────────────────────────────
// Base imports always needed in every custom class
const YCS_BASE_IMPORTS=[
  "net.minecraft.world.item.Item",
  "net.minecraft.world.item.ItemStack",
  "net.minecraft.world.level.Level",
  "net.minecraft.world.entity.player.Player",
];

const ITEM_METHODS=[
  {key:"useOn",label:"Block Interaction",sig:"useOn(UseOnContext context)",
   params:[{name:"context",type:"UseOnContext"}],
   returnType:"InteractionResult",
   imports:[
     "net.minecraft.world.item.context.UseOnContext",
     "net.minecraft.world.InteractionResult",
     "net.minecraft.world.item.ItemStack",
     "net.minecraft.world.level.Level",
     "net.minecraft.world.entity.player.Player",
     "net.minecraft.world.effect.MobEffectInstance",
     "net.minecraft.world.effect.MobEffects",
   ],
   stub:`    @Override\n    public InteractionResult useOn(UseOnContext context) {\n        //YCS:useOn:body\n        return super.useOn(context);\n    }`},
  {key:"use",label:"Air Interaction",sig:"use(Level level, Player player, InteractionHand usedHand)",
   params:[{name:"level",type:"Level"},{name:"player",type:"Player"},{name:"usedHand",type:"InteractionHand"}],
   returnType:"InteractionResultHolder<ItemStack>",
   imports:[
     "net.minecraft.world.InteractionResultHolder",
     "net.minecraft.world.InteractionHand",
     "net.minecraft.world.item.ItemStack",
     "net.minecraft.world.level.Level",
     "net.minecraft.world.entity.player.Player",
     "net.minecraft.world.effect.MobEffectInstance",
     "net.minecraft.world.effect.MobEffects",
   ],
   stub:`    @Override\n    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {\n        player.startUsingItem(usedHand);\n        //YCS:use:body\n        return net.minecraft.world.InteractionResultHolder.consume(player.getItemInHand(usedHand));\n    }`},
  {key:"continuousUse",label:"Continuous Use",sig:"onUseTick(Level, LivingEntity, ItemStack, int) + releaseUsing(ItemStack, Level, LivingEntity, int)",
   params:[{name:"stack",type:"ItemStack"},{name:"level",type:"Level"},{name:"livingEntity",type:"LivingEntity"},{name:"remainingUseDuration",type:"int"}],
   returnType:"void",
   imports:[
     "net.minecraft.world.entity.LivingEntity",
     "net.minecraft.world.item.ItemStack",
     "net.minecraft.world.level.Level",
     "net.minecraft.world.effect.MobEffectInstance",
     "net.minecraft.world.effect.MobEffects",
   ],
   stub:`    @Override\n    public void onUseTick(Level level, LivingEntity livingEntity, ItemStack stack, int remainingUseDuration) {\n        //YCS:continuousUse:body\n    }`},
  {key:"releaseUsing",label:"Release Using",sig:"releaseUsing(ItemStack stack, Level level, LivingEntity livingEntity, int timeCharged)", hidden:true,
   params:[{name:"stack",type:"ItemStack"},{name:"level",type:"Level"},{name:"livingEntity",type:"LivingEntity"},{name:"timeCharged",type:"int"}],
   returnType:"void",
   imports:[
     "net.minecraft.world.entity.LivingEntity",
     "net.minecraft.world.item.ItemStack",
     "net.minecraft.world.level.Level",
     "net.minecraft.world.effect.MobEffectInstance",
     "net.minecraft.world.effect.MobEffects",
   ],
   stub:`    @Override\n    public void releaseUsing(ItemStack stack, Level level, LivingEntity livingEntity, int timeCharged) {\n        //YCS:releaseUsing:body\n    }`},
  {key:"finishUsingItem",label:"Finished Using",sig:"finishUsingItem(ItemStack stack, Level level, LivingEntity livingEntity)",
   params:[{name:"stack",type:"ItemStack"},{name:"level",type:"Level"},{name:"livingEntity",type:"LivingEntity"}],
   returnType:"ItemStack",
   imports:[
     "net.minecraft.world.entity.LivingEntity",
     "net.minecraft.world.item.ItemStack",
     "net.minecraft.world.level.Level",
     "net.minecraft.world.effect.MobEffectInstance",
     "net.minecraft.world.effect.MobEffects",
   ],
   stub:`    @Override\n    public ItemStack finishUsingItem(ItemStack stack, Level level, LivingEntity livingEntity) {\n        //YCS:finishUsingItem:body\n        return super.finishUsingItem(stack, level, livingEntity);\n    }`},
  {key:"inventoryTick",label:"Inventory Tick",sig:"inventoryTick(ItemStack stack, Level level, Entity entity, int slotId, boolean isSelected)",
   params:[{name:"stack",type:"ItemStack"},{name:"level",type:"Level"},{name:"entity",type:"Entity"},{name:"slotId",type:"int"},{name:"isSelected",type:"boolean"}],
   returnType:"void",
   imports:[
     "net.minecraft.world.entity.Entity",
     "net.minecraft.world.item.ItemStack",
     "net.minecraft.world.level.Level",
     "net.minecraft.world.effect.MobEffectInstance",
     "net.minecraft.world.effect.MobEffects",
   ],
   stub:`    @Override\n    public void inventoryTick(ItemStack stack, Level level, Entity entity, int slotId, boolean isSelected) {\n        //YCS:inventoryTick:body\n    }`},
  {key:"hurtEnemy",label:"Combat / Hurt Entity",sig:"hurtEnemy(ItemStack stack, LivingEntity target, LivingEntity attacker)",
   params:[{name:"stack",type:"ItemStack"},{name:"target",type:"LivingEntity"},{name:"attacker",type:"LivingEntity"}],
   returnType:"boolean",
   imports:[
     "net.minecraft.world.entity.LivingEntity",
     "net.minecraft.world.item.ItemStack",
     "net.minecraft.world.effect.MobEffectInstance",
     "net.minecraft.world.effect.MobEffects",
   ],
   stub:`    @Override\n    public boolean hurtEnemy(ItemStack stack, LivingEntity target, LivingEntity attacker) {\n        //YCS:hurtEnemy:body\n        return super.hurtEnemy(stack, target, attacker);\n    }`},
  {key:"interactLivingEntity",label:"Entity Interaction",sig:"interactLivingEntity(ItemStack stack, Player player, LivingEntity interactionTarget, InteractionHand usedHand)",
   params:[{name:"stack",type:"ItemStack"},{name:"player",type:"Player"},{name:"interactionTarget",type:"LivingEntity"},{name:"usedHand",type:"InteractionHand"}],
   returnType:"InteractionResult",
   imports:[
     "net.minecraft.world.InteractionResult",
     "net.minecraft.world.InteractionHand",
     "net.minecraft.world.entity.LivingEntity",
     "net.minecraft.world.entity.player.Player",
     "net.minecraft.world.item.ItemStack",
     "net.minecraft.world.effect.MobEffectInstance",
     "net.minecraft.world.effect.MobEffects",
   ],
   stub:`    @Override\n    public InteractionResult interactLivingEntity(ItemStack stack, Player player, LivingEntity interactionTarget, InteractionHand usedHand) {\n        //YCS:interactLivingEntity:body\n        return super.interactLivingEntity(stack, player, interactionTarget, usedHand);\n    }`},
];

// ─── YCS feature stubs injected/removed as sentinels ─────────────────────────
// These are non-method features (food, fuel, tooltip) managed identically to methods
const YCS_FEATURES={
  useDuration:{
    key:"useDuration",
    imports:["net.minecraft.world.item.ItemStack", "net.minecraft.world.entity.LivingEntity"],
  },
  useAnimation:{
    key:"useAnimation",
    imports:["net.minecraft.world.item.ItemStack", "net.minecraft.world.item.UseAnim"],
  },
  food:{
    key:"food",
    imports:["net.minecraft.world.food.FoodProperties","net.minecraft.world.entity.LivingEntity","net.minecraft.world.item.ItemStack"],
    buildStub:(form)=>{
      const n=form.foodNutrition||2,s=parseFloat(form.foodSaturation)||0.3;
      const al=form.foodAlwaysEdible?".alwaysEdible()":"";
      let fx="";
      if(form.foodEffects?.length){
        fx=form.foodEffects.map(e=>
          `\n            .effect(new net.minecraft.world.effect.MobEffectInstance(${e.effect}, ${e.duration}, ${Math.max(0,parseInt(e.level)-1)}), ${parseFloat(e.probability)||1.0}f)`
        ).join("");
      }
      return `    //YCS:food:start\n    @Override\n    public net.minecraft.world.food.FoodProperties getFoodProperties(ItemStack stack, LivingEntity entity) {\n        return new FoodProperties.Builder()\n            .nutrition(${n})\n            .saturationModifier(${s}f)${al}${fx}\n            .build();\n    }\n    //YCS:food:end`;
    },
    // Simpler: we build the stub inline in ycsSyncFeature
  },
  fuel:{
    key:"fuel",
    imports:["net.minecraft.world.item.ItemStack","org.jetbrains.annotations.Nullable","net.minecraft.world.item.crafting.RecipeType"],
    buildStub:(form)=>{
      const bt=form.burnTime||1600;
      return `    //YCS:fuel:start\n    @Override\n    public int getBurnTime(ItemStack itemStack, @Nullable RecipeType<?> recipeType) {\n        return ${bt};\n    }\n    //YCS:fuel:end`;
    },
  },
  tooltip:{
    key:"tooltip",
    imports:[
      "net.minecraft.network.chat.Component",
      "net.minecraft.world.item.ItemStack",
      "net.minecraft.world.item.TooltipFlag",
      "net.minecraft.world.item.Item",
      "java.util.List",
    ],
    buildStub:(form,id)=>{
      const MODID_="yebisurpg";
      const n=form.tooltipNormal?`"tooltip.${MODID_}.${id}.normal"`:"null";
      const h=form.hasHiddenTooltip&&form.tooltipHidden?`"tooltip.${MODID_}.${id}.hidden"`:"null";
      const s=form.hasHiddenTooltip
        ?(form.useDefaultShiftHint?`"tooltip.${MODID_}.shift_to_see"`:(form.tooltipShiftHint?`"tooltip.${MODID_}.${id}.shift_hint"`:"null"))
        :"null";
      let lines=[];
      if(n!=="null") lines.push(`        tooltipComponents.add(Component.translatable(${n}));`);
      if(h!=="null"){
        lines.push(`        if (net.minecraft.client.gui.screens.Screen.hasShiftDown()) {`);
        lines.push(`            tooltipComponents.add(Component.translatable(${h}));`);
        lines.push(`        } else {`);
        lines.push(`            tooltipComponents.add(Component.translatable(${s}).withStyle(net.minecraft.ChatFormatting.YELLOW));`);
        lines.push(`        }`);
      }
      lines.push(`        super.appendHoverText(stack, context, tooltipComponents, tooltipFlag);`);
      return `    //YCS:tooltip:start\n    @Override\n    public void appendHoverText(ItemStack stack, Item.TooltipContext context, List<Component> tooltipComponents, TooltipFlag tooltipFlag) {\n${lines.join('\n')}\n    }\n    //YCS:tooltip:end`;
    },
  },
};

// --- Block editor type system & palette ---
const LINK_ENTITY = "entity";
const LINK_NUMBER = "number";
const LINK_LOGIC = "logic";
const LINK_TEXT = "text";

function resolveEntityVar(opcode, methodKey) {
  if (opcode === "entity.event") {
    if (methodKey === "useOn") return "context.getPlayer()";
    if (methodKey === "use") return "player";
    if (methodKey === "interactLivingEntity") return "player";
    if (methodKey === "continuousUse" || methodKey === "finishUsingItem" || methodKey === "releaseUsing") return "livingEntity";
    if (methodKey === "inventoryTick") return "entity";
    if (methodKey === "hurtEnemy") return "attacker";
    return "player";
  }
  if (opcode === "entity.target") {
    if (methodKey === "hurtEnemy") return "target";
    if (methodKey === "interactLivingEntity") return "interactionTarget";
    return "target";
  }
  return "entity";
}
function resolveSlotValue(slotNodeId, nodes, methodKey) {
  if (!slotNodeId) return null;
  const node = nodes.find(n => n.id === slotNodeId);
  if (!node) return null;
  if (node.opcode === "entity.event" || node.opcode === "entity.target") return resolveEntityVar(node.opcode, methodKey);
  if (node.opcode === "number.literal") return node.fields?.value ?? "0";
  if (node.opcode === "text.literal") return node.fields?.value ?? "";
  if (node.opcode === "logic.true") return "true";
  if (node.opcode === "logic.false") return "false";
  if (node.opcode === "entity.is_crouching") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    return `(${ent}.isCrouching())`;
  }
  if (node.opcode.startsWith("entity.look_")) {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    if (node.opcode === "entity.look_x") return `(${ent}.getLookAngle().x)`;
    if (node.opcode === "entity.look_y") return `(${ent}.getLookAngle().y)`;
    if (node.opcode === "entity.look_z") return `(${ent}.getLookAngle().z)`;
    if (node.opcode === "entity.look_client_x") return `(${ent}.getViewVector(1.0F).x)`;
    if (node.opcode === "entity.look_client_y") return `(${ent}.getViewVector(1.0F).y)`;
    if (node.opcode === "entity.look_client_z") return `(${ent}.getViewVector(1.0F).z)`;
  }
  return null;
}
function getChain(startNextId, nodes) {
  const chain = [], seen = new Set();
  let cur = startNextId;
  while (cur) { if (seen.has(cur)) break; seen.add(cur); const n = nodes.find(x => x.id === cur); if (!n) break; chain.push(n); cur = n.nextId || null; }
  return chain;
}
function compileChain(startNextId, nodes, methodKey) {
  return getChain(startNextId, nodes).flatMap(n => compileActionNode(n, nodes, methodKey));
}
function compileActionNode(node, nodes, methodKey) {
  if (node.opcode === "control.if") {
    const fields = node.fields || {elseIfCount:0, hasElse:false};
    let code = "";
    const cond = resolveSlotValue(node.slots?.condition, nodes, methodKey) || "false";
    code += `if (${cond}) {\n`;
    if (node.slots?.do0) code += compileChain(node.slots.do0, nodes, methodKey).map(l=>"  "+l).join("\n") + "\n";
    code += "}";
    for (let i = 1; i <= fields.elseIfCount; i++) {
        const cnd = resolveSlotValue(node.slots?.["condition" + i], nodes, methodKey) || "false";
        code += ` else if (${cnd}) {\n`;
        if (node.slots?.["do" + i]) code += compileChain(node.slots["do" + i], nodes, methodKey).map(l=>"  "+l).join("\n") + "\n";
        code += "}";
    }
    if (fields.hasElse) {
        code += ` else {\n`;
        if (node.slots?.doElse) code += compileChain(node.slots.doElse, nodes, methodKey).map(l=>"  "+l).join("\n") + "\n";
        code += "}";
    }
    return code.split("\n");
  }
  if (node.opcode === "effect.apply") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || "player";
    const eff = node.fields?.effect || "MobEffects.REGENERATION";
    const dur = resolveSlotValue(node.slots?.duration, nodes, methodKey) ?? (node.fields?.duration ?? "200");
    const lvl = resolveSlotValue(node.slots?.level, nodes, methodKey) ?? (node.fields?.level ?? "1");
    return ["if (" + ent + " instanceof net.minecraft.world.entity.LivingEntity _et) { _et.addEffect(new net.minecraft.world.effect.MobEffectInstance(" + eff + ", (int)(" + dur + "), Math.max(0,(int)(" + lvl + ")-1))); }"];
  }
  if (node.opcode === "anim.firstperson.play") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || "player";
    const animName = resolveSlotValue(node.slots?.animName, nodes, methodKey) ?? (node.fields?.animName ?? "");
    const filePath = resolveSlotValue(node.slots?.filePath, nodes, methodKey) ?? (node.fields?.filePath ?? "");
    const loopMode = node.fields?.loopMode ?? "PLAY_ONCE";
    const loopArg = loopMode === "PLAY_ONCE"
      ? "null"
      : `net.ye6isu.yebisuRPG.animation.AnimationLoopMode.${loopMode}`;
    return [
      "if (" + ent + " instanceof net.minecraft.world.entity.Entity _ae && !level.isClientSide()) {",
      "    net.ye6isu.yebisuRPG.animation.AnimationAPI.triggerAnimation(_ae,",
      "        net.ye6isu.yebisuRPG.animation.AnimationCategory.ENTITY,",
      "        \"" + animName.replace(/"/g, '\\"') + "\",",
      "        \"" + filePath.replace(/"/g, '\\"') + "\",",
      "        " + loopArg + ");",
      "}",
    ];
  }
  if (node.opcode === "anim.firstperson.stop") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || "player";
    return [
      "if (" + ent + " instanceof net.minecraft.world.entity.Entity _se && !level.isClientSide()) {",
      "    net.ye6isu.yebisuRPG.animation.AnimationAPI.stopFirstPersonAnimation(_se);",
      "}",
    ];
  }
  return ["// unknown: " + node.opcode];
}
const PALETTE_BLOCKS = [
  { category:"Entity", blocks:[
    { opcode:"entity.event",  label:"Event Entity",  linkType:LINK_ENTITY, hint:"Entity that triggered this method" },
    { opcode:"entity.target", label:"Target Entity", linkType:LINK_ENTITY, hint:"Target entity (hurtEnemy/interactLivingEntity)" },
  ]},
  { category:"Text", blocks:[
    { opcode:"text.literal", label:"Text Link", linkType:LINK_TEXT, hint:"A literal text/string value" },
  ]},
  { category:"Numbers", blocks:[
    { opcode:"number.literal", label:"Number", linkType:LINK_NUMBER, hint:"A literal number" },
    { opcode:"entity.look_x", label:"Look Dir X of", linkType:LINK_NUMBER, slotDefs:[{key:"entity",accepts:LINK_ENTITY}] },
    { opcode:"entity.look_y", label:"Look Dir Y of", linkType:LINK_NUMBER, slotDefs:[{key:"entity",accepts:LINK_ENTITY}] },
    { opcode:"entity.look_z", label:"Look Dir Z of", linkType:LINK_NUMBER, slotDefs:[{key:"entity",accepts:LINK_ENTITY}] },
    { opcode:"entity.look_client_x", label:"Look Dir X (Client) of", linkType:LINK_NUMBER, slotDefs:[{key:"entity",accepts:LINK_ENTITY}] },
    { opcode:"entity.look_client_y", label:"Look Dir Y (Client) of", linkType:LINK_NUMBER, slotDefs:[{key:"entity",accepts:LINK_ENTITY}] },
    { opcode:"entity.look_client_z", label:"Look Dir Z (Client) of", linkType:LINK_NUMBER, slotDefs:[{key:"entity",accepts:LINK_ENTITY}] },
  ]},
  { category:"Logic", blocks:[
    { opcode:"logic.true", label:"True", linkType:LINK_LOGIC, hint:"True value" },
    { opcode:"logic.false", label:"False", linkType:LINK_LOGIC, hint:"False value" },
    { opcode:"entity.is_crouching", label:"Is Crouching?", linkType:LINK_LOGIC, hint:"True if the entity is crouching/sneaking", slotDefs:[{key:"entity", accepts:LINK_ENTITY}] },
  ]},
  { category:"Control", blocks:[
    { opcode:"control.if", label:"If", isAction:true, hint:"If statement", slotDefs:[{key:"condition",accepts:LINK_LOGIC}] },
  ]},
  { category:"Effects", blocks:[
    { opcode:"effect.apply", label:"Add Effect", isAction:true, hint:"Apply a potion effect",
      slotDefs:[{key:"entity",accepts:LINK_ENTITY},{key:"duration",accepts:LINK_NUMBER},{key:"level",accepts:LINK_NUMBER}] },
  ]},
  { category:"Animations", blocks:[
    { opcode:"anim.firstperson.play", label:"Play First-Person Anim", isAction:true,
      hint:"Play firstperson animation [text link] for [Entity Link] from file [text link2]",
      slotDefs:[
        {key:"animName", accepts:LINK_TEXT,   label:"anim name"},
        {key:"entity",   accepts:LINK_ENTITY, label:"entity"},
        {key:"filePath", accepts:LINK_TEXT,   label:"from file"},
      ] },
    { opcode:"anim.firstperson.stop", label:"Stop First-Person Anim", isAction:true,
      hint:"Stop any playing first-person animation on an entity",
      slotDefs:[
        {key:"entity", accepts:LINK_ENTITY, label:"entity"},
      ] },
  ]},
];

// ─── Visual Scripting: Code Engine ────────────────────────────────────────────
function ycsInjectMethod(code, methodKey) {
  const def = ITEM_METHODS.find(m => m.key === methodKey);
  if (!def) return code;
  if (code.includes(`//YCS:${methodKey}:start`)) return code; // already present
  const block = `\n    //YCS:${methodKey}:start\n${def.stub}\n    //YCS:${methodKey}:end\n`;
  return code.replace(/\n\}\s*$/, block + '\n}');
}

function ycsRemoveMethod(code, methodKey) {
  return code.replace(
    new RegExp(`\\n    \\/\\/YCS:${methodKey}:start[\\s\\S]*?\\/\\/YCS:${methodKey}:end\\n`, 'g'),
    '\n'
  ).replace(/\n{3,}/g, '\n\n');
}

function ycsGetEnabledMethods(code) {
  return ITEM_METHODS.filter(m => code.includes(`//YCS:${m.key}:start`)).map(m => m.key);
}

function ycsSyncImports(code, enabledMethodKeys) {
  const needed = new Set(YCS_BASE_IMPORTS);
  for (const key of enabledMethodKeys) {
    const def = ITEM_METHODS.find(m => m.key === key);
    if (def) def.imports.forEach(i => needed.add(i));
  }
  // Also add imports for any YCS features present in the file
  for (const feat of Object.values(YCS_FEATURES)) {
    if (code.includes(`//YCS:${feat.key}:start`)) {
      feat.imports.forEach(i => needed.add(i));
    }
  }

  // 1. Remove the entire YCS import block if it exists
  let result = code.replace(/\/\/YCS_Import_START\n[\s\S]*?\/\/YCS_Import_END\n?/g, '');

  // 2. Also strip any loose per-line sentinel imports from the old format
  result = result.replace(/\/\/YCS:import:[^\n]+\n?import [^;]+;\n?/g, '');

  // 3. Strip bare duplicates of anything we're about to inject
  for (const imp of needed) {
    const escaped = imp.replace(/\./g, '\\.');
    result = result.replace(new RegExp(`^import ${escaped};\\n?`, 'm'), '');
  }

  // 4. Collapse excess blank lines
  result = result.replace(/\n{3,}/g, '\n\n');

  if (!needed.size) return result;

  // 5. Build a clean single block
  const importBlock =
    `//YCS_Import_START\n` +
    [...needed].map(imp => `import ${imp};`).join('\n') +
    `\n//YCS_Import_END`;

  return result.replace(/(^package [^;]+;)/m, `$1\n\n${importBlock}`);
}

// ─── YCS Feature (food/fuel/tooltip) inject/remove ───────────────────────────
function ycsInjectFeature(code, featureKey, form, itemId) {
  if (code.includes(`//YCS:${featureKey}:start`)) {
    return ycsUpdateFeature(code, featureKey, form, itemId);
  }
  const stub = buildFeatureStub(featureKey, form, itemId);
  if (!stub) return code;
  const sentinel = `\n    //YCS:${featureKey}:start\n${stub}\n    //YCS:${featureKey}:end\n`;
  let result = code.replace(/\n\}\s*$/, sentinel + '\n}');
  // Always re-sync imports after injecting a feature so its imports are included
  const enabledKeys = ycsGetEnabledMethods(result);
  return ycsSyncImports(result, enabledKeys);
}

function ycsRemoveFeature(code, featureKey) {
  let result = code.replace(
    new RegExp(`\\n    \\/\\/YCS:${featureKey}:start[\\s\\S]*?\\/\\/YCS:${featureKey}:end\\n`, 'g'),
    '\n'
  ).replace(/\n{3,}/g, '\n\n');
  // Re-sync imports after removal so orphaned feature imports are cleaned up
  const enabledKeys = ycsGetEnabledMethods(result);
  return ycsSyncImports(result, enabledKeys);
}

function ycsUpdateFeature(code, featureKey, form, itemId) {
  const stub = buildFeatureStub(featureKey, form, itemId);
  if (!stub) return code;
  return code.replace(
    new RegExp(`(\\/\\/YCS:${featureKey}:start)[\\s\\S]*?(\\/\\/YCS:${featureKey}:end)`),
    `//YCS:${featureKey}:start\n${stub}\n    //YCS:${featureKey}:end`
  );
}

function buildFeatureStub(featureKey, form, itemId) {
  const MODID_ = "yebisurpg";
  if (featureKey === 'useDuration') {
    const dur = form.useDuration || "72000";
    return `    @Override\n    public int getUseDuration(ItemStack stack, net.minecraft.world.entity.LivingEntity entity) {\n        return ${dur};\n    }`;
  }
  if (featureKey === 'useAnimation') {
    const anim = form.useAnimation || "NONE";
    return `    @Override\n    public net.minecraft.world.item.UseAnim getUseAnimation(ItemStack stack) {\n        return net.minecraft.world.item.UseAnim.${anim};\n    }`;
  }
  if (featureKey === 'food') {
    const n = form.foodNutrition || 2;
    const s = parseFloat(form.foodSaturation) || 0.3;
    const al = form.foodAlwaysEdible ? "\n            .alwaysEdible()" : "";
    let fx = "";
    if (form.foodEffects?.length) {
      fx = form.foodEffects.map(e =>
        `\n            .effect(new net.minecraft.world.effect.MobEffectInstance(${e.effect}, ${e.duration}, ${Math.max(0, parseInt(e.level) - 1)}), ${parseFloat(e.probability) || 1.0}f)`
      ).join("");
    }
    // NOTE: Item.Properties must also have .food() set for the game to start the eating process.
    // gItemCode() handles this by mirroring these values onto Properties when cls2 is set + isFood.
    return `    @Override\n    public net.minecraft.world.food.FoodProperties getFoodProperties(ItemStack stack, net.minecraft.world.entity.LivingEntity entity) {\n        return new net.minecraft.world.food.FoodProperties.Builder()\n            .nutrition(${n})\n            .saturationModifier(${s}f)${al}${fx}\n            .build();\n    }`;
  }
  if (featureKey === 'fuel') {
    const bt = form.burnTime || 1600;
    return `    @Override\n    public int getBurnTime(ItemStack itemStack, @Nullable RecipeType<?> recipeType) {\n        return ${bt};\n    }`;
  }
  if (featureKey === 'tooltip') {
    if (!form.hasTooltip) return null;
    const n = form.tooltipNormal ? `"tooltip.${MODID_}.${itemId}.normal"` : "null";
    const h = form.hasHiddenTooltip && form.tooltipHidden ? `"tooltip.${MODID_}.${itemId}.hidden"` : "null";
    const s = form.hasHiddenTooltip
      ? (form.useDefaultShiftHint ? `"tooltip.${MODID_}.shift_to_see"` : (form.tooltipShiftHint ? `"tooltip.${MODID_}.${itemId}.shift_hint"` : "null"))
      : "null";
    let lines = [];
    if (n !== "null") lines.push(`        tooltipComponents.add(Component.translatable(${n}));`);
    if (h !== "null") {
      lines.push(`        if (net.minecraft.client.gui.screens.Screen.hasShiftDown()) {`);
      lines.push(`            tooltipComponents.add(Component.translatable(${h}));`);
      lines.push(`        } else {`);
      lines.push(`            tooltipComponents.add(Component.translatable(${s}).withStyle(net.minecraft.ChatFormatting.YELLOW));`);
      lines.push(`        }`);
    }
    lines.push(`        super.appendHoverText(stack, context, tooltipComponents, tooltipFlag);`);
    return `    @Override\n    public void appendHoverText(ItemStack stack, Item.TooltipContext context, List<Component> tooltipComponents, TooltipFlag tooltipFlag) {\n${lines.join('\n')}\n    }`;
  }
  return null;
}

function ycsToggleMethod(code, methodKey, enable) {
  let result = enable ? ycsInjectMethod(code, methodKey) : ycsRemoveMethod(code, methodKey);
  if (methodKey === "continuousUse") {
    result = enable ? ycsInjectMethod(result, "releaseUsing") : ycsRemoveMethod(result, "releaseUsing");
  }
  const enabledKeys = ycsGetEnabledMethods(result);
  return ycsSyncImports(result, enabledKeys);
}

function ycsInjectCompiledBody(code, methodKey, bodyLines) {
  const bodyMarker = `//YCS:${methodKey}:body`;
  if (!code.includes(bodyMarker)) return code;
  
  const finalBodyLines = [...bodyLines];

  const compiled = finalBodyLines.length
    ? finalBodyLines.map(l => '        ' + l).join('\n')
    : '        // (empty)';
  return code.replace(bodyMarker, compiled);
}

// ─── Block AST compiler: BlockNode[] → Java string[] ─────────────────────────
const ITEM_DEF={id:"",constName:"",customConstName:false,displayName:"",textureId:"",isTool:false,isFood:false,isFuel:false,hasDurability:false,durability:"100",hasUseDuration:false,useDuration:"72000",customItemClass:"",toolType:"Sword",tier:"Iron",damage:"3",speed:"-2.4",burnTime:"1600",holdingMode:"none",maxStackSize:"64",foodNutrition:"3",foodSaturation:"0.3",foodAlwaysEdible:false,foodEffects:[],creativeTab:"",tags:[],hasRecipe:false,recipe:{type:"shaped",pattern:["   ","   ","   "],keys:{},result:1},hasTooltip:false,tooltipNormal:"",hasHiddenTooltip:false,useDefaultShiftHint:true,tooltipShiftHint:"",tooltipHidden:"",enabledMethods:[],methodBlocks:{}};
const BLOCK_DEF={...ITEM_DEF,orientationType:"simple",dropType:"Self",dropItem:"",dropXp:"1-3",textureTopId:"",textureBottomId:"",textureSideId:"",textureFrontId:"",textureBackId:"",textureLeftId:"",textureRightId:"",textureDoorTopId:"",textureDoorBottomId:"",textureDoorItemId:"",textureTrapdoorId:"",strength:"2.0",soundType:"WOOD",createSlab:false,createStairs:false,createFence:false,createFenceGate:false,createWall:false,createPressurePlate:false,createButton:false,createDoor:false,createTrapdoor:false,showVariants:false};
const TEX_DEF={label:"",dataUrl:null,shapeUrl:null,emissiveUrl:null,isAnimated:false,frames:4,ticksPerFrame:4};

function ItemProv({initial,formOverride,onFormChange,children}){const[form,setForm]=useState(formOverride||(initial?{...ITEM_DEF,...initial}:ITEM_DEF));const F=useCallback((k,v)=>setForm(f=>{const nf={...f,[k]:v};onFormChange&&onFormChange(nf);return nf;}),[onFormChange]);return<FormCtx.Provider value={{form,F}}>{children}</FormCtx.Provider>;}
function BlockProv({initial,formOverride,onFormChange,children}){const[form,setForm]=useState(formOverride||(initial?{...BLOCK_DEF,...initial}:BLOCK_DEF));const F=useCallback((k,v)=>setForm(f=>{const nf={...f,[k]:v};onFormChange&&onFormChange(nf);return nf;}),[onFormChange]);return<FormCtx.Provider value={{form,F}}>{children}</FormCtx.Provider>;}
function TexProv({initial,children}){const[form,setForm]=useState(initial?{...TEX_DEF,...initial}:TEX_DEF);const F=useCallback((k,v)=>setForm(f=>({...f,[k]:v})),[]);return<FormCtx.Provider value={{form,F}}>{children}</FormCtx.Provider>;}

function CardGrid({entries,onDelete,onOpen,emptyLabel}){
  const[hov,setHov]=useState(null);
  return<div style={{flex:1,padding:"20px 20px 90px",overflowY:"auto",position:"relative"}}>
    <div style={{display:"flex",flexWrap:"wrap",gap:16}}>
      {entries.map(e=>{const isH=hov===e.id;return<div key={e.id} onClick={()=>onOpen(e)} onMouseEnter={()=>setHov(e.id)} onMouseLeave={()=>setHov(null)}
        style={{width:200,height:267,background:C.card,border:`1px solid ${isH?"#3a3a3a":"#1e1e1e"}`,borderRadius:C.r,cursor:"pointer",display:"flex",flexDirection:"column",flexShrink:0,position:"relative"}}>
        {isH&&<div onClick={ev=>{ev.stopPropagation();onDelete(e.id);}} style={{position:"absolute",top:-5,right:-5,width:13,height:13,borderRadius:"50%",background:"#ff5f57",cursor:"pointer",zIndex:5}}/>}
        <div style={{margin:10,flex:1,background:C.prev,borderRadius:4,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {e.previewDataUrl?<AImg url={e.previewDataUrl} size={160} anim={e.isAnimated} frames={e.frames||1} ticks={e.ticksPerFrame||4}/>:<div/>}
        </div>
        <div style={{padding:"0 10px 10px"}}>
          <div style={{fontWeight:500,fontSize:13,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.displayName||e.id}</div>
          <div style={{fontWeight:200,fontSize:11,color:C.dim,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:2}}>{e.id}</div>
        </div>
      </div>;})}
    </div>
    {!entries.length&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",color:C.faint,fontSize:12}}>{emptyLabel}</div>}
  </div>;
}

function FormActions({onCancel,onSave,saving,canSave,consoleH=0,showCons=false,onCode}){
  const bottom=showCons?consoleH+5+30:30;
  const SQ={width:52,height:52,borderRadius:C.r,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer",flexShrink:0,fontFamily:"'JetBrains Mono',monospace"};
  return<div style={{position:"fixed",bottom,right:30,display:"flex",gap:10,zIndex:200,transition:"bottom .15s"}}>
    {onCode&&<button onClick={onCode} style={{...SQ,background:"#2a2a2e",border:`1px solid ${C.inpB}`,color:C.dim}}>⌨</button>}
    <button onClick={onCancel} style={{...SQ,background:"#2a2a2e",border:`1px solid ${C.inpB}`,color:C.dim}}>✕</button>
    <button onClick={onSave} disabled={saving||!canSave} style={{...SQ,background:saving||!canSave?"#2a2a2e":C.accent,border:"none",color:saving||!canSave?C.faint:"#06080e",opacity:saving||!canSave?0.35:1,cursor:saving||!canSave?"not-allowed":"pointer"}}>↓</button>
  </div>;
}

function EditRow({label,panel,badge,count,activePanel,setActivePanel}){
  const isActive=activePanel===panel;
  return<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderBottom:`1px solid #1e1e1e`,background:isActive?"#1a2438":"transparent"}}>
    <div style={{display:"flex",alignItems:"center",gap:7}}>
      <span style={{fontSize:13,color:C.text}}>{label}</span>
      {badge&&<Pill color="#1e3020">{badge}</Pill>}
      {(count>0)&&<Pill color="#1a2438">{count}</Pill>}
    </div>
    <Btn sm v={isActive?"p":"g"} onClick={()=>setActivePanel(p=>p===panel?null:panel)}>edit</Btn>
  </div>;
}

function TexLeft({initial,onSave,onCancel}){
  const{form,F}=useContext(FormCtx);
  const mRef=useRef(),sRef=useRef(),eRef=useRef();
  const load=(ref,key)=>{
    const f=ref.current.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=e=>{
      F(key,e.target.result);
      if(key==="dataUrl"){
        let base=f.name.replace(/\.[^/.]+$/,"").toLowerCase().replace(/[^a-z0-9_]/g,"_");
        if(base)F("label",base);
      }
    };
    r.readAsDataURL(f);
  };
  return<div style={{padding:"20px 20px 100px",display:"flex",flexDirection:"column",gap:16}}>
    <div style={{fontSize:14,fontWeight:500,color:C.text}}>{initial?"Edit Texture":"Add Texture"}</div>
    <Inp label="Texture Name" value={form.label} onChange={v=>F("label",v)} placeholder="Enter name…"/>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <Lbl>Texture File</Lbl>
      <div onClick={()=>mRef.current.click()} style={{height:42,background:C.inp,border:`1px solid ${C.inpB}`,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:form.dataUrl?"#5acc5a":C.dim,fontSize:12,gap:8}}>
        {form.dataUrl&&<AImg url={form.dataUrl} size={26} anim={form.isAnimated} frames={form.frames||1} ticks={form.ticksPerFrame||4}/>}
        {form.dataUrl?"✓ selected — click to replace":"+"}
      </div>
      <input ref={mRef} type="file" accept="image/png" style={{display:"none"}} onChange={()=>load(mRef,"dataUrl")}/>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <Lbl>Shape Texture File</Lbl>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {form.shapeUrl&&<AImg url={form.shapeUrl} size={26}/>}
        <div onClick={()=>sRef.current.click()} style={{flex:1,height:42,background:C.inp,border:`1px solid ${C.inpB}`,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:form.shapeUrl?"#5acc5a":C.dim,fontSize:12}}>{form.shapeUrl?"✓ shape set":"+"}</div>
        {form.shapeUrl&&<Btn sm v="g" onClick={()=>F("shapeUrl",null)}>✕</Btn>}
      </div>
      <input ref={sRef} type="file" accept="image/png" style={{display:"none"}} onChange={()=>load(sRef,"shapeUrl")}/>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <Lbl>Emissive Texture File</Lbl>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {form.emissiveUrl&&<AImg url={form.emissiveUrl} size={26}/>}
        <div onClick={()=>eRef.current.click()} style={{flex:1,height:42,background:C.inp,border:`1px solid ${C.inpB}`,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:form.emissiveUrl?"#5acc5a":C.dim,fontSize:12}}>{form.emissiveUrl?"✓ emissive set":"+"}</div>
        {form.emissiveUrl&&<Btn sm v="g" onClick={()=>F("emissiveUrl",null)}>✕</Btn>}
      </div>
      <input ref={eRef} type="file" accept="image/png" style={{display:"none"}} onChange={()=>load(eRef,"emissiveUrl")}/>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:10}}><Lbl>Animation Properties</Lbl><Chk label="" checked={form.isAnimated} onChange={v=>F("isAnimated",v)}/></div>
    {form.isAnimated&&<div style={{display:"flex",gap:12}}><Inp label="Frames" type="number" value={form.frames} onChange={v=>F("frames",parseInt(v)||1)} style={{width:80}}/><Inp label="Ticks/frame" type="number" value={form.ticksPerFrame} onChange={v=>F("ticksPerFrame",parseInt(v)||1)} style={{width:80}}/></div>}
    <FormActions onCancel={onCancel} onSave={()=>onSave(form)} saving={false} canSave={!!(form.label.trim()&&form.dataUrl)}/>
  </div>;
}

function TexRight(){
  const{form}=useContext(FormCtx);
  return<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:20}}>
    {form.dataUrl?<div style={{width:220,height:220,background:C.prev,borderRadius:C.r,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}><AImg url={form.dataUrl} size={180} anim={form.isAnimated} frames={form.frames||1} ticks={form.ticksPerFrame||4}/></div>:<div style={{width:200,height:200,background:C.prev,borderRadius:C.r,display:"flex",alignItems:"center",justifyContent:"center",color:C.faint,fontSize:12}}>preview</div>}
    {form.label&&<div style={{fontSize:14,fontWeight:500,color:C.text}}>{form.label}</div>}
    {form.isAnimated&&form.frames>1&&<div style={{fontSize:11,color:C.dim}}>{form.frames} frames · {form.ticksPerFrame} ticks/f</div>}
  </div>;
}

function RecipePanel({modItems=[],modBlocks=[]}){
  const{form,F}=useContext(FormCtx);
  const[srch,setSrch]=useState("");const[sel,setSel]=useState("");const[showTags,setShowTags]=useState(false);
  const recipe=form.recipe||{type:"shaped",pattern:["   ","   ","   "],keys:{},result:1};
  const setR=upd=>F("recipe",{...recipe,...upd});
  const allIngr=useMemo(()=>{const mod=modItems.map(x=>`${MODID}:${x.id}`).concat(modBlocks.map(x=>`${MODID}:${x.id}`));const tagE=TAG_GROUPS.map(g=>`#${g.tag}`);const all=[...tagE,...VANILLA_INGR,...mod];const q=srch.toLowerCase();return q?all.filter(x=>x.toLowerCase().includes(q)):all;},[srch,modItems,modBlocks]);
  const cells=Array.from({length:9},(_,i)=>{const row=Math.floor(i/3),col=i%3,ch=recipe.pattern[row][col];return ch===" "?null:recipe.keys[ch]||null;});
  const setCell=(i,item)=>{const row=Math.floor(i/3),col=i%3;const pat=recipe.pattern.map(r=>[...r]);const keys={...recipe.keys};if(!item||item==="minecraft:air"){pat[row][col]=" ";const used=new Set(pat.flat().filter(c=>c!==" "));for(const k of Object.keys(keys))if(!used.has(k))delete keys[k];}else{const ex=Object.entries(keys).find(([,v])=>v===item)?.[0];const used=new Set(pat.flat().filter(c=>c!==" "));let ch=ex;if(!ch){ch="ABCDEFGHIJKLMNOPQRSTUVWXYZ#@$%&".split("").find(c=>!used.has(c))||"?";keys[ch]=item;}pat[row][col]=ch;}setR({pattern:pat.map(r=>r.join("")),keys});};
  const dN=item=>item.startsWith("#")?TAG_GROUPS.find(g=>`#${g.tag}`===item)?.label||item:item.split(":")[1]||item;
  return<div style={{flex:1,padding:"14px",overflowY:"auto",display:"flex",flexDirection:"column",gap:10}}>
    <div style={{display:"flex",gap:4}}><Sel label="" value={recipe.type||"shaped"} onChange={v=>setR({type:v})} options={["shaped","shapeless"]}/><Inp label="" value={recipe.result||1} onChange={v=>setR({result:parseInt(v)||1})} type="number" style={{width:56}}/></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,52px)",gap:3}}>
      {cells.map((item,i)=>{const e=!item||item==="minecraft:air";const iT=item&&item.startsWith("#");return<div key={i} onClick={()=>{if(sel)setCell(i,sel);}} onDragOver={ev=>ev.preventDefault()} onDrop={ev=>{ev.preventDefault();setCell(i,ev.dataTransfer.getData("item"));}} style={{width:52,height:52,background:e?"#141414":iT?"#1a1a2e":"#192a19",border:`1px solid ${e?C.inpB:iT?"#2a2a5a":"#2a5a2a"}`,borderRadius:3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:sel?"crosshair":"default",position:"relative",overflow:"hidden"}}>{!e&&<><div style={{fontSize:9,color:iT?"#8888ff":"#aaa",textAlign:"center",padding:2,lineHeight:1.1}}>{dN(item)}</div><span onClick={ev=>{ev.stopPropagation();setCell(i,null);}} style={{position:"absolute",top:1,right:2,fontSize:8,cursor:"pointer",color:"#cc6a6a"}}>✕</span></>}{e&&<span style={{color:"#222",fontSize:18}}>+</span>}</div>;})}
    </div>
    {sel&&<div style={{fontSize:10,color:"#5acc5a"}}>→ {dN(sel)}</div>}
    <div style={{display:"flex",gap:6,alignItems:"center"}}><input value={srch} onChange={e=>setSrch(e.target.value)} placeholder="search…" style={{...SI.inp,fontSize:11,flex:1}}/><Btn sm v={showTags?"p":"g"} onClick={()=>setShowTags(v=>!v)}>#tags</Btn></div>
    {showTags&&<div style={{display:"flex",flexDirection:"column",gap:1}}>{TAG_GROUPS.map(g=><div key={g.tag} draggable onDragStart={e=>e.dataTransfer.setData("item",`#${g.tag}`)} onClick={()=>setSel(sel===`#${g.tag}`?"":(`#${g.tag}`))} style={{padding:"3px 8px",fontSize:11,fontFamily:"monospace",cursor:"pointer",borderRadius:2,background:sel===`#${g.tag}`?"#1a1a2e":"#141414",color:sel===`#${g.tag}`?"#8888ff":C.dim,border:`1px solid ${sel===`#${g.tag}`?"#2a2a5a":"#1a1a1a"}`}}>{g.label}</div>)}</div>}
    <div style={{maxHeight:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:1}}>
      {allIngr.filter(x=>!x.startsWith("#")).slice(0,80).map(item=><div key={item} draggable onDragStart={e=>e.dataTransfer.setData("item",item)} onClick={()=>setSel(item===sel?"":item)} style={{padding:"3px 6px",fontSize:11,fontFamily:"monospace",cursor:"pointer",borderRadius:2,background:sel===item?"#192a19":"#141414",color:sel===item?"#5acc5a":C.text,border:`1px solid ${sel===item?"#2a5a2a":"#1a1a1a"}`,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item}</div>)}
    </div>
  </div>;
}

function TagsPanel(){
  const{form,F}=useContext(FormCtx);
  const[srch,setSrch]=useState("");
  const tags=form.tags||[];
  const toggle=t=>{
    if(tags.includes(t)) F("tags",tags.filter(x=>x!==t));
    else F("tags",[...tags,t]);
  };
  const q=srch.toLowerCase().trim();
  const allTags=Array.from(new Set([...COMMON_TAGS,...tags]));
  const visTags=allTags.filter(t=>!q||t.toLowerCase().includes(q));
  const isCustom=q&&!allTags.some(t=>t.toLowerCase()===q);
  const addCustom=()=>{if(q&&isCustom){toggle(q);setSrch("");}};
  return<div style={{padding:"14px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:8}}>
    <Lbl>Tags — search or add custom</Lbl>
    <div style={{display:"flex",gap:6}}>
      <input value={srch} onChange={e=>setSrch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addCustom();}} placeholder="search or type custom tag..." style={{...SI.inp,fontSize:11,flex:1}}/>
      {isCustom&&<Btn sm v="p" onClick={addCustom}>add</Btn>}
    </div>
    <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:4}}>{visTags.map(t=><div key={t} onClick={()=>toggle(t)} style={{fontSize:10,fontFamily:"monospace",padding:"2px 5px",borderRadius:3,cursor:"pointer",background:tags.includes(t)?"#192a19":"#141414",color:tags.includes(t)?"#5acc5a":C.dim,border:`1px solid ${tags.includes(t)?"#2a5a2a":"#1a1a1a"}`}}>{t}{tags.includes(t)&&<span style={{marginLeft:3,opacity:.6}}>✕</span>}</div>)}</div>
  </div>;
}

function TooltipPanel(){
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

function RecipePanelWrapper({modItems,modBlocks}){
  const{form,F}=useContext(FormCtx);
  return<div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
    <div style={{padding:"10px 14px",borderBottom:"1px solid #1a1a1a",flexShrink:0}}>
      <Chk label="Add custom recipe?" checked={!!form.hasRecipe} onChange={v=>F("hasRecipe",v)}/>
    </div>
    {form.hasRecipe?<RecipePanel modItems={modItems} modBlocks={modBlocks}/>:<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:C.faint,fontSize:12}}>enable above to edit</div>}
  </div>;
}

function CodePanel({textures,isBlock=false}){
  const{form}=useContext(FormCtx);
  if(isBlock){const entries=gBlockEntries(form,textures);return<div style={{padding:"14px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:8}}>{entries.map((e,i)=><CopyB key={i} title={e.constName} code={e.line}/>)}{gTagCode(form.id,form,true).map((t,i)=><CopyB key={"t"+i} title="tag" code={t}/>)}{gRecipe(form.id,form,true)&&<CopyB title="recipe" code={gRecipe(form.id,form,true)}/>}</div>;}
  const c=gItemCode(form,textures);
  return<div style={{padding:"14px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:8}}><CopyB title="ModItems" code={c.reg}/>{c.fpReg&&<CopyB title="ModFoodProperties" code={c.fpReg}/>}<CopyB title="lang" code={`  "${c.langKey}": "${c.langVal}",`}/><CopyB title="model" code={`        ${c.modelLine}`}/>{gTagCode(form.id,form).map((t,i)=><CopyB key={i} title="tag" code={t}/>)}{gRecipe(form.id,form)&&<CopyB title="recipe" code={gRecipe(form.id,form)}/>}</div>;
}

function TexturePickerPanel({textures,fkey="textureId",label="Texture"}){
  const{form,F}=useContext(FormCtx);
  const[srch,setSrch]=useState("");const fRef=useRef();
  const filt=useMemo(()=>{const q=srch.toLowerCase();return textures.filter(t=>!q||t.label.toLowerCase().includes(q)||t.id.toLowerCase().includes(q));},[textures,srch]);
  const sel=form[fkey];
  const onFile=e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{
      F(fkey,"__direct__"+ev.target.result+"__name__"+f.name);
      if(fkey==="textureId" || fkey==="frontUrl" || fkey==="sideUrl" || fkey==="topUrl" || fkey==="bottomUrl"){
        let base=f.name.replace(/\.[^/.]+$/,"").toLowerCase().replace(/[^a-z0-9_]/g,"_");
        if(base)F("id",base);
      }
    };
    r.readAsDataURL(f);
  };
  return<div style={{flex:1,padding:"12px 14px",overflowY:"auto",display:"flex",flexDirection:"column",gap:9}}>
    <Lbl>{label}</Lbl>
    <input value={srch} onChange={e=>setSrch(e.target.value)} placeholder="search bank…" style={{...SI.inp,fontSize:11}}/>
    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
      <div onClick={()=>fRef.current.click()} style={{width:90,height:100,background:C.card,border:`1px dashed ${C.inpB}`,borderRadius:C.r,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:4,flexShrink:0}}>
        <span style={{fontSize:20,color:C.dim}}>+</span>
        <span style={{fontSize:10,color:C.dim}}>from PC</span>
      </div>
      <input ref={fRef} type="file" accept="image/png" style={{display:"none"}} onChange={onFile}/>
      {sel&&<div onClick={()=>F(fkey,"")} style={{width:90,height:100,background:C.card,border:`1px solid #3a1a1a`,borderRadius:C.r,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:4,flexShrink:0}}>
        <span style={{fontSize:16,color:"#cc6a6a"}}>✕</span>
        <span style={{fontSize:10,color:"#cc6a6a"}}>clear</span>
      </div>}
      {filt.map(t=><div key={t.id} onClick={()=>F(fkey,t.id)} style={{width:90,height:100,background:sel===t.id?"#1a2438":C.card,border:`1px solid ${sel===t.id?C.accent:"#252525"}`,borderRadius:C.r,display:"flex",flexDirection:"column",cursor:"pointer",overflow:"hidden",flexShrink:0}}>
        <div style={{flex:1,background:C.prev,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}><AImg url={t.dataUrl} size={64} anim={t.isAnimated} frames={t.frames||1} ticks={t.ticksPerFrame||4}/></div>
        <div style={{padding:"0 4px 4px",fontSize:10,color:sel===t.id?C.accent:C.dim,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.label}</div>
      </div>)}
    </div>
  </div>;
}

function CustomClassPanel(){
  const{form}=useContext(FormCtx);
  const[code,setCode]=useState("// loading…");
  const cls=form.customItemClass||idToClassName(form.id||"item");
  useEffect(()=>{
    if(!cls)return;
    api("/items/custom-class/read",{className:cls}).then(j=>{
      if(j.ok)setCode(j.code);
      else setCode(`// ${j.reason||"not found"}`);
    }).catch(()=>setCode("// error reading file"));
  },[cls]);
  return<div style={{flex:1,padding:14,overflow:"hidden",display:"flex",flexDirection:"column",gap:8}}>
    <Lbl>{cls}.java</Lbl>
    <pre style={{flex:1,background:"#0a0a0c",border:`1px solid ${C.inpB}`,borderRadius:4,padding:"10px 12px",fontSize:11,lineHeight:1.7,color:"#a8a8a0",whiteSpace:"pre",overflowY:"auto",overflowX:"auto"}}>{code}</pre>
  </div>;
}

// ─── Visual Scripting UI ──────────────────────────────────────────────────────

function VisualEditorPanel({methodKey,form,F,onBack,className}){
  return <ErrorBoundary><VisualEditorPanelInner methodKey={methodKey} form={form} F={F} onBack={onBack} className={className}/></ErrorBoundary>;
}
function VisualEditorPanelInner({methodKey,form,F,onBack,className}){
  const def=ITEM_METHODS.find(m=>m.key===methodKey);
  const init=()=>{const s=(form.methodBlocks||{})[methodKey];return s?.some(n=>n.id==="start")?s:[{id:"start",opcode:"start",x:60,y:60,fields:{},slots:{},nextId:null}];};
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
  const add=(bd,x,y)=>{
    const id=bd.opcode+"_"+Date.now();
    upd(ns=>[...ns,{id,opcode:bd.opcode,x,y,nextId:null,linkType:bd.linkType||null,isAction:bd.isAction||false,slotDefs:bd.slotDefs||[],
      fields:bd.opcode==="effect.apply"?{effect:"MobEffects.REGENERATION",duration:"200",level:"1"}:bd.opcode==="number.literal"?{value:"1"}:bd.opcode==="text.literal"?{value:""}:bd.opcode==="control.if"?{elseIfCount:0,hasElse:false}:bd.opcode==="anim.firstperson.play"?{animName:"",filePath:"",loopMode:"PLAY_ONCE"}:{},slots:{}}]);
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
                     if (n.opcode==="control.if") h = n.height || 50;
                     if(n.opcode!=="control.if"){
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
               const def = parent?.slotDefs?.find(d => d.key === sk);
               if ((def && def.accepts === dragged.linkType) || (isLogicSlot && dragged.linkType === "logic")) {
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
      <div style={{width:190,borderRight:"1px solid "+C.inpB,overflowY:"auto",flexShrink:0,background:"#111113",userSelect:"none",zIndex:10}}>
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
        {nodes.length===1&&!nodes[0].nextId&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none",textAlign:"center",color:C.faint}}>
          <div style={{fontSize:28,marginBottom:8,opacity:.3}}>{"</>"}</div>
          <div style={{fontSize:12,marginBottom:4}}>drag blocks here</div>
          <div style={{fontSize:10,color:"#2a4050"}}>connect to Start to run</div>
        </div>}
        
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
               onFieldChange={(nid,f,v)=>upd(ns=>ns.map(n=>n.id===nid?{...n,fields:{...n.fields,[f]:v}}:n))}
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
  
  const cc=node.linkType==="entity"?"#30e1b9":node.linkType==="number"?"#4d65b4":node.linkType==="logic"?"#6494a4":node.linkType==="text"?"#d4a027":"#5a9a6a";
  const bg=isSt?"#1e293b":(!inChain&&isAct)?"#4a4a5a":node.opcode==="effect.apply"?"#c46c94":node.opcode==="anim.firstperson.play"?"#3a5c3a":node.opcode==="anim.firstperson.stop"?"#5c3a3a":isIf?"#6494a4":node.linkType==="entity"?"#30e1b9":node.linkType==="number"?"#4d65b4":node.linkType==="text"?"#d4a027":"#5a9a6a";

  const isAnimPlay = node.opcode === "anim.firstperson.play";
  const isAnimStop = node.opcode === "anim.firstperson.stop";
  const lblStr = node.opcode==="entity.event"?"Event Entity"
       :node.opcode==="entity.target"?"Target Entity"
       :node.opcode==="number.literal"?null
       :node.opcode==="text.literal"?null
       :node.opcode==="entity.look_x"?"Get Look Direction X of"
       :node.opcode==="entity.look_y"?"Get Look Direction Y of"
       :node.opcode==="entity.look_z"?"Get Look Direction Z of"
       :node.opcode==="entity.look_client_x"?"Get Look Direction X (Client) of"
       :node.opcode==="entity.look_client_y"?"Get Look Direction Y (Client) of"
       :node.opcode==="entity.look_client_z"?"Get Look Direction Z (Client) of"
       :node.opcode==="entity.is_crouching"?"Is Crouching?"
       :node.opcode==="logic.true"?"True"
       :node.opcode==="logic.false"?"False"
       :node.opcode;

  const valContent = (
    <>
      {lblStr && <span style={{fontSize:16,fontFamily:"sans-serif",color:"#fff",fontWeight:700,whiteSpace:"nowrap",lineHeight:"20px"}}>
        {lblStr}
      </span>}
      {node.opcode==="number.literal"&&<input value={node.fields?.value??"0"} onChange={e=>{e.stopPropagation();if(onFieldChange)onFieldChange(node.id,"value",e.target.value);}} onMouseDown={e=>e.stopPropagation()}
        style={{width:Math.max(50, ((node.fields?.value||"").length*10)+20),height:30,background:inline?"transparent":"rgba(0,0,0,0.3)",border:"none",borderRadius:0,padding:"5px 10px",color:"#fff",fontSize:16,fontFamily:"sans-serif",fontWeight:700,outline:"none",textAlign:"center",boxSizing:"border-box"}}/>}
      {node.opcode==="text.literal"&&<input value={node.fields?.value??""} placeholder="text…" onChange={e=>{e.stopPropagation();if(onFieldChange)onFieldChange(node.id,"value",e.target.value);}} onMouseDown={e=>e.stopPropagation()}
        style={{width:Math.max(80, ((node.fields?.value||"").length*8)+24),height:30,background:inline?"transparent":"rgba(0,0,0,0.3)",border:"none",borderRadius:0,padding:"5px 10px",color:"#fff",fontSize:14,fontFamily:"sans-serif",fontWeight:700,outline:"none",textAlign:"center",boxSizing:"border-box"}}/>}

      {node.slotDefs?.map(def => (
          <SlotConn key={def.key} sk={def.key} sc="rgba(0,0,0,0.3)" connId={node.slots?.[def.key]} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
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
         :node.opcode==="anim.firstperson.play"?"Play FP Anim"
         :node.opcode==="anim.firstperson.stop"?"Stop FP Anim on"
         :node.opcode}
      </span>
      {isIf&&<>
        <span style={{cursor:"pointer",opacity:0.6,fontSize:14}} onClick={(e)=>{e.stopPropagation();setShowSettings(s=>!s)}}>⚙</span>
        <SlotConn sk="condition" sc="rgba(0,0,0,0.3)" connId={node.slots?.condition} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {node.opcode==="effect.apply"&&<>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <input value={node.fields?.effect??"MobEffects.REGENERATION"} onChange={e=>{e.stopPropagation();if(onFieldChange)onFieldChange(node.id,"effect",e.target.value);}} onMouseDown={e=>{e.stopPropagation();if(onSelect)onSelect(node.id);}} placeholder="effect"
            style={{height:30,width:200,background:"rgba(0,0,0,0.3)",border:"none",borderRadius:0,padding:"0 10px",color:"#fff",fontSize:16,fontFamily:"sans-serif",fontWeight:700,outline:"none",boxSizing:"border-box"}}/>
          <span style={{fontSize:16,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>Duration</span>
          <SlotConn sk="duration" sc="rgba(0,0,0,0.3)" connId={node.slots?.duration} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:16,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>Level</span>
          <SlotConn sk="level" sc="rgba(0,0,0,0.3)" connId={node.slots?.level} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {isAnimPlay&&<>
          <SlotConn sk="animName" sc="rgba(0,0,0,0.3)" connId={node.slots?.animName} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>for</span>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <span style={{fontSize:14,fontFamily:"sans-serif",color:"#fff",fontWeight:700}}>from file</span>
          <SlotConn sk="filePath" sc="rgba(0,0,0,0.3)" connId={node.slots?.filePath} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
          <select value={node.fields?.loopMode??"PLAY_ONCE"} onMouseDown={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();if(onFieldChange)onFieldChange(node.id,"loopMode",e.target.value);}}
            style={{height:26,background:"rgba(0,0,0,0.4)",border:"none",borderRadius:4,padding:"0 6px",color:"#fff",fontSize:12,fontFamily:"sans-serif",cursor:"pointer",outline:"none"}}>
            <option value="PLAY_ONCE">Play Once</option>
            <option value="HOLD_LAST">Hold Last Frame</option>
            <option value="LOOP">Loop</option>
          </select>
      </>}
      {isAnimStop&&<>
          <SlotConn sk="entity" sc="rgba(0,0,0,0.3)" connId={node.slots?.entity} nodes={nodes} mk={methodKey} onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selectedNodeId={selected}/>
      </>}
      {!inChain&&isAct&&!isSt&&<span style={{fontSize:14,color:"#fff",background:"#e11d48",padding:"2px 8px",borderRadius:6,fontWeight:700}} title="Not connected to Start">!</span>}
    </div>
  );

  if (isIf) {
      return (
        <div id={"node-"+node.id} onMouseDown={e=>{if(e.button===2){e.stopPropagation();if(window.__showYcsCtx)window.__showYcsCtx(node.id,e.clientX,e.clientY);return;}if(e.button!==0)return;e.stopPropagation(); e.currentTarget.parentElement?.parentElement?.focus(); if(onSelect)onSelect(node.id);const r=e.currentTarget.getBoundingClientRect();if(onDragStart)onDragStart(node.id, e.clientX-r.left,e.clientY-r.top, e.clientX, e.clientY);}} style={{position:"absolute",left:node.x,top:node.y,minWidth:50,width:"fit-content",display:"flex",flexDirection:"column",alignItems:"stretch",zIndex:(!inChain?50:(node.depth||1)),opacity:(!inChain&&isAct&&!isSt)?0.6:1,userSelect:"none",filter:"drop-shadow(0 6px 16px rgba(0,0,0,.4))"}} onContextMenu={e=>{e.preventDefault();e.stopPropagation();}}>
            {showSettings&&<div style={{position:"absolute",left:0,top:-45,background:"#222",border:"2px solid #444",padding:"6px 10px",borderRadius:10,zIndex:100,display:"flex",gap:8,pointerEvents:"auto"}}>
               <div style={{color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",background:"#444",padding:"4px 10px",borderRadius:6}} onClick={(e)=>{e.stopPropagation();setShowSettings(false)}}>X</div>
               <div style={{color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",background:"#444",padding:"4px 10px",borderRadius:6}} onClick={()=>onFieldChange&&onFieldChange(node.id, "elseIfCount", (node.fields?.elseIfCount||0)+1)}>+ Else If</div>
               <div style={{color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",background:"#444",padding:"4px 10px",borderRadius:6}} onClick={()=>onFieldChange&&onFieldChange(node.id, "elseIfCount", Math.max(0, (node.fields?.elseIfCount||0)-1))}>- Else If</div>
               <div style={{color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",background:"#444",padding:"4px 10px",borderRadius:6}} onClick={()=>onFieldChange&&onFieldChange(node.id, "hasElse", !node.fields?.hasElse)}>{node.fields?.hasElse?"- Else":"+ Else"}</div>
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

  return (
    <div id={"node-"+node.id} onContextMenu={e=>{e.preventDefault(); e.stopPropagation(); if(window.__showYcsCtx) window.__showYcsCtx(node.id, e.clientX, e.clientY);}}
      style={{position:"absolute",left:node.x,top:node.y,minWidth:isVal?50:300,minHeight:50,height:node.height||(isVal?"auto":50),
        display:isVal?"flex":"block", alignItems:isVal?"center":"stretch", padding:isVal?"8px 10px":"0", gap:isVal?10:0, boxSizing:"border-box", border:selected===node.id?"2px solid #fff":"2px solid transparent",
        zIndex:isVal?100:(!inChain?50:(node.depth||1)),opacity:(!inChain&&isAct&&!isSt)?0.6:1,
        background:bg, borderRadius:10}}
      onMouseDown={e=>{if(e.button!==0)return;e.stopPropagation(); e.currentTarget.parentElement?.parentElement?.focus(); if(onSelect)onSelect(node.id);const r=e.currentTarget.getBoundingClientRect();if(onDragStart)onDragStart(node.id, e.clientX-r.left,e.clientY-r.top, e.clientX, e.clientY);}}>
      {isVal && <div style={{position:"absolute",left:-10,top:"50%",transform:"translateY(-50%)",width:10,height:20,borderRadius:"10px 0 0 10px",background:bg}}/>}

      
      {isVal ? valContent : commonHeader}
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
    setBusyKey(null);
  };

  return<div style={{padding:"14px 12px",display:"flex",flexDirection:"column",gap:7}}>
    <div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:.8,marginBottom:4}}>Override Methods</div>
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
            <div style={{fontSize:12,color:visuallyOn?C.text:"#787872",fontWeight:500,display:"flex",alignItems:"center",gap:5}}>
              {m.label}
              {hasBlocks&&<span style={{fontSize:9,color:C.accent,background:"#0e2030",padding:"1px 5px",borderRadius:3}}>● compiled</span>}
              {disabled&&<span style={{fontSize:9,color:"#e8a868",background:"#3a2010",padding:"1px 5px",borderRadius:3}}>requires Air Interaction</span>}
            </div>
            <div style={{fontSize:10,color:C.faint,fontFamily:"monospace",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:210}}>{m.sig}</div>
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

function RightPaneShell({modItems=[],modBlocks=[],textures=[],isBlock=false,activePanel,setActivePanel,highlightFaceKey,rightView,setRightView,itemForm,itemF}){
  const faceLabel=highlightFaceKey?highlightFaceKey.replace(/^texture/,"").replace(/Id$/,"")+" face":"Texture";
  if(!activePanel){
    return<div style={{display:"flex",height:"100%",alignItems:"center",justifyContent:"center",color:C.faint,fontSize:12,flexDirection:"column",gap:8}}>
      <span style={{fontSize:28,color:"#252525"}}>→</span>
      <span>use edit or set on the left</span>
    </div>;
  }
  return<div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
    <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      {activePanel==="customclass"&&(
        rightView?.mode==="visualEditor"
          ?<VisualEditorPanel
              methodKey={rightView.editingMethod}
              form={itemForm}
              F={itemF}
              className={itemForm?.customItemClass||idToClassName(itemForm?.id||"item")}
              onBack={()=>setRightView({mode:"methodList",editingMethod:null})}/>
          :<MethodListPanel
              form={itemForm}
              F={itemF}
              className={itemForm?.customItemClass||idToClassName(itemForm?.id||"item")}
              onEnterEditor={key=>setRightView({mode:"visualEditor",editingMethod:key})}/>
      )}
      {activePanel==="texture"&&<TexturePickerPanel textures={textures} fkey={highlightFaceKey||"textureId"} label={faceLabel}/>}
      {activePanel==="tags"&&<TagsPanel/>}
      {activePanel==="tooltip"&&<TooltipPanel/>}
      {activePanel==="recipe"&&<RecipePanelWrapper modItems={modItems} modBlocks={modBlocks}/>}
      {activePanel==="code"&&<CodePanel textures={textures} isBlock={isBlock}/>}
    </div>
  </div>;
}

function ItemLeft({textures,initial,isEdit,onSave,onCancel,modItems=[],showCons,consoleH,activePanel,setActivePanel,rightView,setRightView}){
  const{form,F}=useContext(FormCtx);
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
      if(form.hasRecipe&&gRecipe(form.id,form)){const jr=await api("/recipes/set",{id:form.id,constName:CN,recipeCode:gRecipe(form.id,form)});msgs.push({ok:jr.ok,label:"recipe",msg:jr.ok?"ok":jr.reason});}
    }else{
      const j=await api("/items/update",{oldConstName:initial.constName||initial.id?.toUpperCase(),oldId:initial.id,newLine:code.reg,newConstName:CN,newId:form.id,langKey:code.langKey,langVal:code.langVal,newModelLine:code.modelLine,fpReg:code.fpReg,isAnimated:code.tex?.isAnimated||false});msgs.push({ok:j.ok,label:"update",msg:j.ok?"ok":j.reason});
      if(initial.creativeTab&&initial.creativeTab!==form.creativeTab)await api("/creativetab/remove",{ref:`ModItems.${initial.constName||initial.id?.toUpperCase()}`});
      await wtItem();
      for(const tk of gTTKeys(form.id,form)){const jt=await api("/lang/set",{key:tk.key,value:tk.value,update:true});msgs.push({ok:jt.ok,label:tk.key,msg:jt.ok?"ok":jt.reason});}
      if(form.hasRecipe&&gRecipe(form.id,form)){const jr=await api("/recipes/set",{id:form.id,constName:CN,recipeCode:gRecipe(form.id,form)});msgs.push({ok:jr.ok,label:"recipe",msg:jr.ok?"ok":jr.reason});}
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
        nCode = form.hasUseDuration ? ycsInjectFeature(nCode, "useDuration", form, form.id) : ycsRemoveFeature(nCode, "useDuration");
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
    <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:14,fontWeight:500}}>{isEdit?"Edit Item":"New Item"}</span>{isEdit&&<Pill color="#1a2438">editing</Pill>}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <IdField label="Item ID" value={form.id} onChange={v=>{F("id",v);if(!isEdit){F("constName",v.toUpperCase());F("displayName",v.split("_").map(w=>w?w[0].toUpperCase()+w.slice(1):"").join(" "));}}}/>
      <ConstField form={form} F={F}/>
    </div>
    <Inp label="Display Name" value={form.displayName} onChange={v=>F("displayName",v)} placeholder="Mother Flame"/>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <Lbl>Texture</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
          {(selTex||dUrl)
            ?<AImg url={selTex?.dataUrl||dUrl} size={20} anim={selTex?.isAnimated} frames={selTex?.frames||1} ticks={selTex?.ticksPerFrame||4}/>
            :<div style={{width:20,height:20,background:C.prev,borderRadius:3,border:`1px dashed ${C.inpB}`,flexShrink:0}}/>}
          <span style={{fontSize:13,color:selTex||dUrl?C.text:C.faint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selTex?selTex.label:dUrl?"(direct)":"none selected"}</span>
        </div>
        <Btn sm v="g" onClick={()=>setActivePanel(p=>p==="texture"?null:"texture")} style={{marginLeft:8,flexShrink:0}}>set</Btn>
      </div>
      {selTex?.isAnimated&&<span style={{fontSize:10,color:C.accent}}>animated — mcmeta auto-written</span>}
    </div>
    <Sel label="Creative Tab" value={form.creativeTab} onChange={v=>F("creativeTab",v)} options={CREATIVE_TABS}/>
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
              <EffectSel label="Effect" value={e.effect} onChange={v=>updEff(i,"effect",v)}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                <Inp label="Duration (ticks)" value={e.duration} type="number" onChange={v=>updEff(i,"duration",v)}/>
                <Inp label="Level (1=I, 2=II)" value={e.level} type="number" onChange={v=>updEff(i,"level",v)}/>
                <Inp label="Probability (0.0-1.0)" value={e.probability} type="number" onChange={v=>updEff(i,"probability",v)}/>
              </div>
            </div>)}
          </div>
        </div>}

    <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:12}}>
      <Lbl>Override Methods</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
        <span style={{fontSize:13,color:form.customItemClass?C.text:C.faint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{form.customItemClass ? `${form.customItemClass}.java` : "none added"}</span>
        <Btn sm v={activePanel==="customclass"?"p":"g"} onClick={async()=>{
            if(activePanel==="customclass"){setActivePanel(null);setRightView({mode:"methodList",editingMethod:null});return;}
            const cls2=form.customItemClass||(form.id?idToClassName(form.id):null);
            if(!cls2)return;
            if(!form.customItemClass){F("customItemClass",cls2);await api("/items/custom-class",{className:cls2});}
            setRightView({mode:"methodList",editingMethod:null});
            setActivePanel("customclass");
          }} dis={!form.id} style={{marginLeft:8,flexShrink:0}}>edit</Btn>
      </div>
    </div>
      </div>
    </div>
    <Sel label="Holding Mode" value={form.holdingMode||"none"} onChange={v=>F("holdingMode",v)} options={[{value:"none",label:"Default (flat)"},{value:"handheld",label:"Tool / handheld"}]}/>
    {!form.isTool&&<Inp label="Max Stack Size" type="number" value={form.maxStackSize??64} onChange={v=>{const n=Math.max(1,Math.min(99,parseInt(v)||64));F("maxStackSize",String(n));}} style={{width:"100%"}} placeholder="64"/>}
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
        <Btn sm v={activePanel==="tags"?"p":"g"} onClick={()=>setActivePanel(p=>p==="tags"?null:"tags")} style={{marginLeft:8,flexShrink:0}}>edit</Btn>
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <Lbl>Tooltip{form.hasTooltip&&<span style={{color:"#5acc5a",marginLeft:5}}>on</span>}</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
        <span style={{fontSize:13,color:form.hasTooltip?C.text:C.faint}}>{form.hasTooltip?form.tooltipNormal||"(set)":"disabled"}</span>
        <Btn sm v={activePanel==="tooltip"?"p":"g"} onClick={()=>setActivePanel(p=>p==="tooltip"?null:"tooltip")} style={{marginLeft:8,flexShrink:0}}>edit</Btn>
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <Lbl>Recipe{form.hasRecipe&&<span style={{color:"#5acc5a",marginLeft:5}}>on</span>}</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
        <span style={{fontSize:13,color:form.hasRecipe?C.text:C.faint}}>{form.hasRecipe?`${form.recipe?.type||"shaped"} · ×${form.recipe?.result||1}`:"disabled"}</span>
        <Btn sm v={activePanel==="recipe"?"p":"g"} onClick={()=>setActivePanel(p=>p==="recipe"?null:"recipe")} style={{marginLeft:8,flexShrink:0}}>edit</Btn>
      </div>
    </div>
    {tags.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3}}>{tags.map(t=><Pill key={t} onClick={()=>F("tags",tags.filter(x=>x!==t))}>{t} ✕</Pill>)}</div>}
    <Sbar messages={status}/>
    <FormActions onCancel={onCancel} onSave={save} saving={saving} canSave={!!form.id.trim()&&!valId(form.id)} showCons={showCons} consoleH={consoleH} onCode={()=>setActivePanel(p=>p==="code"?null:"code")}/>
  </div>;
}

function ItemRight({textures,modItems=[],activePanel,setActivePanel,rightView,setRightView}){
  const{form,F}=useContext(FormCtx);
  return<RightPaneShell modItems={modItems} textures={textures} isBlock={false} activePanel={activePanel} setActivePanel={setActivePanel} rightView={rightView} setRightView={setRightView} itemForm={form} itemF={F}/>;
}

function BlockLeft({textures,initial,isEdit,onSave,onCancel,modItems=[],modBlocks=[],showCons,consoleH,activePanel,setActivePanel,setHighlightFaceKey}){
  const{form,F}=useContext(FormCtx);
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
      if(form.hasRecipe&&gRecipe(form.id,form,true)){const jr=await api("/recipes/set",{id:form.id,constName:CN,recipeCode:gRecipe(form.id,form,true)});msgs.push({ok:jr.ok,label:"recipe",msg:jr.ok?"ok":jr.reason});}
      else{const jr=await api("/recipes/delete",{constName:CN});msgs.push({ok:jr.ok,label:"recipe del",msg:jr.ok?"ok":jr.reason});}
    }else{
      const j=await api("/blocks/update",{oldConstName:initial.constName||initial.id?.toUpperCase(),oldId:initial.id,entries,newConstName:CN,newId:form.id,langKey:entries[0].langKey,langVal:entries[0].langVal,creativeTab:form.creativeTab});
      msgs.push({ok:j.ok,label:`ModBlocks(${entries.length}) update`,msg:j.ok?"ok":j.reason});
      if(j.results)j.results.forEach(r=>msgs.push({ok:r.ok,label:r.constName,msg:r.ok?"ok":r.reason}));
      if(form.tags?.length){const jt=await api("/tags/set",{id:form.id,constName:CN,tags:form.tags,isBlock:true});msgs.push({ok:jt.ok,label:"tags",msg:jt.ok?`${jt.added||0} ok`:jt.reason});}else{await api("/tags/delete",{constName:CN,isBlock:true});}
      if(form.hasRecipe&&gRecipe(form.id,form,true)){const jr=await api("/recipes/set",{id:form.id,constName:CN,recipeCode:gRecipe(form.id,form,true)});msgs.push({ok:jr.ok,label:"recipe",msg:jr.ok?"ok":jr.reason});}
      else{const jr=await api("/recipes/delete",{constName:CN});msgs.push({ok:jr.ok,label:"recipe del",msg:jr.ok?"ok":jr.reason});}
    }
    if(form.creativeTab){const jt=await api("/creativetab",{ref:`ModBlocks.${CN}`,blockId:form.id,tabConst:form.creativeTab});msgs.push({ok:jt.ok,label:"tab",msg:jt.ok?"ok":jt.reason});}
    if(form.hasTooltip)for(const tk of gTTKeys(form.id,form)){const jt=await api("/lang/set",{key:tk.key,value:tk.value,update:isEdit});msgs.push({ok:jt.ok,label:tk.key,msg:jt.ok?"ok":jt.reason});}
    await api("/models/sync",{});
    setStatus(msgs);setSaving(false);onSave(block,initial?.id);
  };
  const ER=({label,panel,badge,count})=><EditRow label={label} panel={panel} badge={badge} count={count} activePanel={activePanel} setActivePanel={setActivePanel}/>;
  const setFace=(fkey)=>{setHighlightFaceKey(fkey);setActivePanel("texture");};
  const TexRow=({label,fkey})=>{
    const t=textures.find(x=>x.id===form[fkey]);
    const dUrl=(form[fkey]||"").startsWith("__direct__")?form[fkey].split("__name__")[0].replace("__direct__",""):null;
    return<div style={{display:"flex",flexDirection:"column",gap:4,marginTop:6}}>
      <Lbl>{label}</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
          {(t||dUrl)
            ?<AImg url={t?.dataUrl||dUrl} size={20}/>
            :<div style={{width:20,height:20,background:C.prev,borderRadius:3,border:`1px dashed ${C.inpB}`,flexShrink:0}}/>
          }
          <span style={{fontSize:13,color:t||dUrl?C.text:C.faint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t?t.label:dUrl?"(direct)":"none selected"}</span>
        </div>
        <Btn sm v="g" onClick={()=>setFace(fkey)} style={{marginLeft:8,flexShrink:0}}>set</Btn>
      </div>
    </div>;
  };
  const dropType=orient==="simple"?(form.dropType||"Self"):"Self";
  return<div style={{padding:"20px 20px 100px",display:"flex",flexDirection:"column",gap:13}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:14,fontWeight:500}}>{isEdit?"Edit Block":"New Block"}</span>{isEdit&&<Pill color="#1a2438">editing</Pill>}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <IdField label="Block ID" value={form.id} onChange={v=>{F("id",v);if(!isEdit){F("constName",v.toUpperCase());F("displayName",v.split("_").map(w=>w?w[0].toUpperCase()+w.slice(1):"").join(" "));}}}/>
      <ConstField form={form} F={F}/>
    </div>
    <Inp label="Display Name" value={form.displayName} onChange={v=>F("displayName",v)} placeholder="Obsidian Bricks"/>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <Lbl>Block Orientation</Lbl>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>{[{v:"simple",l:"Simple"},{v:"pillar",l:"Rotated Pillar"},{v:"directional",l:"Directional"}].map(o=><label key={o.v} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}><div onClick={()=>F("orientationType",o.v)} style={{width:13,height:13,borderRadius:"50%",border:`2px solid ${orient===o.v?C.accent:C.inpB}`,background:orient===o.v?C.accent:"transparent",flexShrink:0}}/><span style={{fontSize:12,color:"#a0a09a"}}>{o.l}</span></label>)}</div>
      <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:6}}>
        <Lbl>Drop</Lbl>
        <Sel value={dropType} onChange={v=>F("dropType",v)} options={["Self","Ore","Custom"]} disabled={orient!=="simple"}/>
        {(dropType==="Ore"||dropType==="Custom")&&<div style={{display:"grid",gridTemplateColumns:dropType==="Ore"?"1fr 100px":"1fr",gap:10,marginTop:4}}>
          <Inp label="Drop Item/Block (ResourceLocation)" value={form.dropItem} onChange={v=>F("dropItem",v)} placeholder="yebisurpg:shika"/>
          {dropType==="Ore"&&<Inp label="XP (e.g. 1-3)" value={form.dropXp} onChange={v=>F("dropXp",v)} placeholder="1-3"/>}
        </div>}
      </div>
      {orient==="simple"&&<TexRow label="All Faces" fkey="textureId"/>}
      {orient==="pillar"&&<div style={{display:"flex",flexDirection:"column",gap:2,border:`1px solid #1e1e1e`,borderRadius:C.r,padding:"4px 8px"}}>
        <TexRow label="Top" fkey="textureTopId"/>
        <TexRow label="Side" fkey="textureSideId"/>
        <TexRow label="Bottom" fkey="textureBottomId"/>
      </div>}
      {orient==="directional"&&<div style={{display:"flex",flexDirection:"column",gap:2,border:`1px solid #1e1e1e`,borderRadius:C.r,padding:"4px 8px"}}>
        <TexRow label="Top" fkey="textureTopId"/>
        <TexRow label="Bottom" fkey="textureBottomId"/>
        <TexRow label="Front" fkey="textureFrontId"/>
        <TexRow label="Back" fkey="textureBackId"/>
        <TexRow label="Left" fkey="textureLeftId"/>
        <TexRow label="Right" fkey="textureRightId"/>
      </div>}
    </div>
    <Sel label="Creative Tab" value={form.creativeTab} onChange={v=>F("creativeTab",v)} options={CREATIVE_TABS}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Inp label="Hardness" value={form.strength} onChange={v=>F("strength",v)} type="number"/><Sel label="Sound" value={form.soundType} onChange={v=>F("soundType",v)} options={SOUND_TYPES}/></div>
    {orient==="simple"&&<Sect title={<label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",margin:"-4px 0"}}><input type="checkbox" checked={!!form.showVariants} onChange={e=>F("showVariants",e.target.checked)} style={{cursor:"pointer",margin:0}}/><span style={{fontSize:13,fontWeight:500,color:C.text}}>Add Variants</span></label>}>
      {form.showVariants&&<div style={{marginTop:8}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>{[["createSlab","Slab"],["createStairs","Stairs"],["createFence","Fence"],["createFenceGate","Fence Gate"],["createWall","Wall"],["createPressurePlate","Pressure Plate"],["createButton","Button"],["createDoor","Door"],["createTrapdoor","Trapdoor"]].map(([k,l])=><Chk key={k} label={l} checked={!!form[k]} onChange={v=>F(k,v)}/>)}</div>
        {form.createDoor&&<div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.inpB}`,display:"flex",flexDirection:"column",gap:2}}>
          <TexRow label="Door Top" fkey="textureDoorTopId"/>
          <TexRow label="Door Bottom" fkey="textureDoorBottomId"/>
          <TexRow label="Door Item" fkey="textureDoorItemId"/>
        </div>}
        {form.createTrapdoor&&<div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.inpB}`}}><TexRow label="Trapdoor" fkey="textureTrapdoorId"/></div>}
      </div>}
    </Sect>}
    <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:4}}>
      <Lbl>Tags{tags.length>0&&<span style={{color:C.accent,marginLeft:5}}>{tags.length}</span>}</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
        <span style={{fontSize:13,color:tags.length?C.text:C.faint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tags.length?tags.slice(0,3).join(", ")+(tags.length>3?` +${tags.length-3}`:""):"none added"}</span>
        <Btn sm v={activePanel==="tags"?"p":"g"} onClick={()=>setActivePanel(p=>p==="tags"?null:"tags")} style={{marginLeft:8,flexShrink:0}}>edit</Btn>
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <Lbl>Tooltip{form.hasTooltip&&<span style={{color:"#5acc5a",marginLeft:5}}>on</span>}</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
        <span style={{fontSize:13,color:form.hasTooltip?C.text:C.faint}}>{form.hasTooltip?form.tooltipNormal||"(set)":"disabled"}</span>
        <Btn sm v={activePanel==="tooltip"?"p":"g"} onClick={()=>setActivePanel(p=>p==="tooltip"?null:"tooltip")} style={{marginLeft:8,flexShrink:0}}>edit</Btn>
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <Lbl>Recipe{form.hasRecipe&&<span style={{color:"#5acc5a",marginLeft:5}}>on</span>}</Lbl>
      <div style={{...SI.inp,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",cursor:"default"}}>
        <span style={{fontSize:13,color:form.hasRecipe?C.text:C.faint}}>{form.hasRecipe?`${form.recipe?.type||"shaped"} · ×${form.recipe?.result||1}`:"disabled"}</span>
        <Btn sm v={activePanel==="recipe"?"p":"g"} onClick={()=>setActivePanel(p=>p==="recipe"?null:"recipe")} style={{marginLeft:8,flexShrink:0}}>edit</Btn>
      </div>
    </div>
    {tags.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3}}>{tags.map(t=><Pill key={t} onClick={()=>F("tags",tags.filter(x=>x!==t))}>{t} ✕</Pill>)}</div>}
    <Sbar messages={status}/>
    <FormActions onCancel={onCancel} onSave={save} saving={saving} canSave={!!form.id.trim()&&!valId(form.id)} showCons={showCons} consoleH={consoleH} onCode={()=>setActivePanel(p=>p==="code"?null:"code")}/>
  </div>;
}

function BlockRight({textures,modItems=[],modBlocks=[],activePanel,setActivePanel,highlightFaceKey}){
  return<RightPaneShell modItems={modItems} modBlocks={modBlocks} textures={textures} isBlock={true} activePanel={activePanel} setActivePanel={setActivePanel} highlightFaceKey={highlightFaceKey}/>;
}

export default function App(){
  const[tab,setTab]=useState("textures");
  const[textures,setTextures]=useLS("ycs_textures",[]);
  const[items,setItems]=useLS("ycs_items",[]);
  const[blocks,setBlocks]=useLS("ycs_blocks",[]);
  const[texEd,setTexEd]=useState(null);
  const[itemEd,setItemEd]=useState(null);
  const[blockEd,setBlockEd]=useState(null);
  // Persist editor state per tab so switching away and back restores it
  const savedEdState=useRef({textures:null,items:null,blocks:null,activePanel:{textures:null,items:null,blocks:null},highlightFaceKey:{textures:"textureId",items:"textureId",blocks:"textureId"}});
  const[modItems,setModItems]=useState([]);const[modBlocks,setModBlocks]=useState([]);
  const[backOk,setBackOk]=useState(null);
  const[showCons,setShowCons]=useState(false);const[consH,setConsH]=useState(200);
  const[activePanel,setActivePanel]=useState(null);
  const[rightView,setRightView]=useState({mode:"methodList",editingMethod:null});
  const[highlightFaceKey,setHighlightFaceKey]=useState("textureId");
  const{rs,running,run}=useRun();
  const isElectron=typeof window!=="undefined"&&window.ycsNative?.isElectron;
  const native=typeof window!=="undefined"?window.ycsNative:null;
  const isRunning=rs.state!=="idle";

  useEffect(()=>{fetch(`${BASE}/health`).then(r=>r.json()).then(()=>setBackOk(true)).catch(()=>setBackOk(false));},[]);
  useEffect(()=>{setActivePanel(null);setHighlightFaceKey("textureId");},[!!texEd,!!itemEd,!!blockEd,texEd?.target?.id,itemEd?.target?.id,blockEd?.target?.id]);
  const reloadMod=()=>{fetch(`${BASE}/items/read`).then(r=>r.json()).then(j=>{if(j.ok)setModItems(j.items||[]);}).catch(()=>{});fetch(`${BASE}/blocks/read`).then(r=>r.json()).then(j=>{if(j.ok)setModBlocks(j.blocks||[]);}).catch(()=>{});};
  useEffect(()=>{ reloadMod(); },[]);
  const onConsDrag=e=>{e.preventDefault();const sy=e.clientY,sh=consH;const mv=ev=>setConsH(Math.max(80,Math.min(480,sh-(ev.clientY-sy))));const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);};
  const allItems=useMemo(()=>{const m=new Map();modItems.forEach(x=>m.set(x.id,{...x,source:"mod"}));items.forEach(x=>m.set(x.id,{...x,source:"local"}));return[...m.values()];},[items,modItems]);
  const allBlocks=useMemo(()=>{const m=new Map();modBlocks.forEach(x=>m.set(x.id,{...x,source:"mod"}));blocks.forEach(x=>m.set(x.id,{...x,source:"local"}));return[...m.values()];},[blocks,modBlocks]);

  // On startup: if localStorage has an item id that no longer exists in the mod, remove it
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
  const itemEntries=useMemo(()=>allItems.map(x=>{const t=textures.find(tx=>tx.id===x.textureId);return{...x,previewDataUrl:t?.dataUrl||x.textureDataUrl};}), [allItems,textures]);
  const blockEntries=useMemo(()=>allBlocks.map(x=>{const t=textures.find(tx=>tx.id===x.textureId);return{...x,previewDataUrl:t?.dataUrl||x.textureDataUrl};}), [allBlocks,textures]);
  const delTex=id=>setTextures(arr=>arr.filter(x=>x.id!==id));
  const delItem=async id=>{const item=allItems.find(x=>x.id===id);if(!item)return;await api("/items/delete",{id,constName:item.constName||id.toUpperCase()});if(item.customItemClass)await api("/items/custom-class/delete",{className:item.customItemClass});await api("/texture/delete",{filename:`${id}.png`,folder:"item"});setItems(arr=>arr.filter(x=>x.id!==id));reloadMod();};
  const delBlock=async id=>{const b=allBlocks.find(x=>x.id===id);if(!b)return;await api("/blocks/delete",{id,constName:b.constName||id.toUpperCase()});await api("/texture/delete",{filename:`${id}.png`,folder:"block"});setBlocks(arr=>arr.filter(x=>x.id!==id));reloadMod();};
  const saveItem=(item,oldId)=>{setItems(arr=>{const searchId=oldId||item.id;const i=arr.findIndex(x=>x.id===searchId);return i>=0?arr.map((x,j)=>j===i?item:x):[...arr,item];});reloadMod();setItemEd(null);savedEdState.current.items=null;};
  const saveBlock=(block,oldId)=>{setBlocks(arr=>{const searchId=oldId||block.id;const i=arr.findIndex(x=>x.id===searchId);return i>=0?arr.map((x,j)=>j===i?block:x):[...arr,block];});reloadMod();setBlockEd(null);savedEdState.current.blocks=null;};
  const saveTex=tex=>{const id=tex.label.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");if(texEd?.mode==="edit"){setTextures(arr=>arr.map(x=>x.id===texEd.target?.id?{...tex,id,savedAt:Date.now()}:x));}else setTextures(arr=>[...arr,{...tex,id,savedAt:Date.now()}]);setTexEd(null);savedEdState.current.textures=null;};
  const switchTab=t=>{
    // Save current tab's editor state
    const cur=tab;
    savedEdState.current[cur]=cur==="textures"?texEd:cur==="items"?itemEd:blockEd;
    savedEdState.current.activePanel[cur]=activePanel;
    savedEdState.current.highlightFaceKey[cur]=highlightFaceKey;
    // Restore target tab's state
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
  const TABS=[{id:"textures",l:"Textures"},{id:"items",l:"Items"},{id:"blocks",l:"Blocks"}];

  const renderPane=()=>{
    if(tab==="textures"){
      if(texEd){const init=texEd.target||null;return<TexProv initial={init}><div style={{display:"flex",gap:5,flex:1,overflow:"hidden",minHeight:0}}><div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}><div style={{flex:1,overflowY:"auto"}}><TexLeft initial={init} onSave={saveTex} onCancel={()=>setTexEd(null)}/></div></div><div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}><TexRight/></div></div></TexProv>;}
      return<div style={{flex:1,background:C.panel,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:0}}><CardGrid entries={texEntries} emptyLabel="No textures yet." onDelete={delTex} onOpen={e=>setTexEd({mode:"edit",target:e})}/></div>;
    }
    if(tab==="items"){
      if(itemEd){const init=itemEd.target||null;
      const cancelItem=async()=>{
        // For new items only: roll back anything written during this session
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
      return<ItemProv initial={init} formOverride={itemEd.liveForm||null} onFormChange={f=>setItemEd(e=>({...e,liveForm:f}))}><div style={{display:"flex",gap:5,flex:1,overflow:"hidden",minHeight:0}}><div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}><div style={{flex:1,overflowY:"auto"}}><ItemLeft textures={textures} initial={init} isEdit={!!init} onSave={saveItem} onCancel={cancelItem} modItems={allItems} showCons={showCons} consoleH={consH} activePanel={activePanel} setActivePanel={setActivePanel} rightView={rightView} setRightView={setRightView}/></div></div><div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}><ItemRight textures={textures} modItems={allItems} activePanel={activePanel} setActivePanel={setActivePanel} rightView={rightView} setRightView={setRightView}/></div></div></ItemProv>;}
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
      return<BlockProv initial={init} formOverride={blockEd.liveForm||null} onFormChange={f=>setBlockEd(e=>({...e,liveForm:f}))}><div style={{display:"flex",gap:5,flex:1,overflow:"hidden",minHeight:0}}><div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}><div style={{flex:1,overflowY:"auto"}}><BlockLeft textures={textures} initial={init} isEdit={!!init} onSave={saveBlock} onCancel={cancelBlock} modItems={allItems} modBlocks={allBlocks} showCons={showCons} consoleH={consH} activePanel={activePanel} setActivePanel={setActivePanel} setHighlightFaceKey={setHighlightFaceKey}/></div></div><div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}><BlockRight textures={textures} modItems={allItems} modBlocks={allBlocks} activePanel={activePanel} setActivePanel={setActivePanel} highlightFaceKey={highlightFaceKey}/></div></div></BlockProv>;}
      return<div style={{flex:1,background:C.panel,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:0}}><CardGrid entries={blockEntries} emptyLabel="No blocks yet." onDelete={delBlock} onOpen={e=>setBlockEd({target:e})}/></div>;
    }
    return null;
  };

  return<>
    <style>{FONT_URL}{G_CSS}</style>
    <div style={{height:"100vh",background:C.bg,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* ROW 1: Window drag bar */}
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

      {/* ROW 2: Tab bar — tabs on left, gradle dots on right aligned with window buttons above */}
      <div style={{height:36,background:C.tabBar,display:"flex",alignItems:"center",paddingLeft:8,flexShrink:0,zIndex:20}}>
        {/* Tabs sit at bottom of bar */}
        <div style={{display:"flex",alignItems:"flex-end",alignSelf:"stretch",flex:1}}>
          {TABS.map(t=>{const a=tab===t.id;return<button key={t.id} onClick={()=>switchTab(t.id)} style={{width:TAB_W,height:TAB_H,background:a?C.bg:"#2e2e2e",border:"none",borderRadius:"6.5px 6.5px 0 0",color:C.text,fontSize:12,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,cursor:"pointer",flexShrink:0,marginRight:3,opacity:a?1:0.65}}>{t.l}</button>;})}
        </div>
        {/* Gradle dots — vertically centered in tab bar row, right-aligned with window buttons */}
        <div style={{display:"flex",alignItems:"center",gap:8,paddingRight:13,WebkitAppRegion:"no-drag",flexShrink:0}}>
          <Dot color={showCons?"#e4e5e9":"#3a3a3c"} title={showCons?"Hide console":"Show console"} onClick={()=>setShowCons(v=>!v)}/>
          <Dot color="#3a3a3c" title="Refresh YCS" onClick={async()=>{await fetch(`${BASE}/refresh`,{method:"POST"});reloadMod();}} />
          <Dot color={isRunning||running?"#555":"#e4e5e9"} title="RunData" disabled={isRunning||running} onClick={()=>run("/run/data")}/>
          <Dot color={isRunning||running?"#555":"#e4e5e9"} title={rs.dirty?"RunData then RunClient":"RunClient"} disabled={isRunning||running} onClick={()=>run("/run/client")}/>
        </div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0,padding:`5px 5px ${showCons?0:5}px 5px`,gap:5}}>
        {renderPane()}
      </div>
      {!inEd&&<div onClick={()=>{if(tab==="textures")setTexEd({mode:"new"});else if(tab==="items")setItemEd({});else setBlockEd({});}} style={{position:"fixed",right:30,bottom:fabBottom,width:52,height:52,background:"#3a3a3c",borderRadius:C.r,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:28,color:C.text,boxShadow:"0 4px 20px rgba(0,0,0,.6)",zIndex:100,transition:"bottom .15s"}} onMouseEnter={e=>e.currentTarget.style.background="#4a4a4c"} onMouseLeave={e=>e.currentTarget.style.background="#3a3a3c"}>+</div>}
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
