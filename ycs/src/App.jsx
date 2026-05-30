import { useState, useRef, useCallback, useEffect, useMemo, createContext, useContext } from "react";

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

function useRun(){
  const[rs,setRs]=useState({dirty:false,state:"idle",log:[]});const[running,setRunning]=useState(false);
  useEffect(()=>{const id=setInterval(()=>fetch(`${BASE}/run/state`).then(r=>r.json()).then(setRs).catch(()=>{}),2000);return()=>clearInterval(id);},[]);
  const run=async ep=>{setRunning(true);try{await fetch(`${BASE}${ep}`,{method:"POST"});}catch{}setRunning(false);};
  return{rs,running,run};
}

function gTTKeys(id,f){const ks=[];if(f.hasTooltip&&f.tooltipNormal)ks.push({key:`tooltip.${MODID}.${id}.normal`,value:f.tooltipNormal});if(f.hasTooltip&&f.hasHiddenTooltip){if(!f.useDefaultShiftHint&&f.tooltipShiftHint)ks.push({key:`tooltip.${MODID}.${id}.shift_hint`,value:f.tooltipShiftHint});if(f.tooltipHidden)ks.push({key:`tooltip.${MODID}.${id}.hidden`,value:f.tooltipHidden});}return ks;}
function gRecipe(id,form){if(!form.hasRecipe||!form.recipe)return null;const r=form.recipe,CN=form.constName||(form.id||"").toUpperCase();if(r.type==="shaped"){const pl=r.pattern.map(row=>`        "${row}"`).join(",\n");const dl=Object.entries(r.keys||{}).map(([ch,item])=>`        .define('${ch}', ForgeRegistries.ITEMS.getValue(ResourceLocation.parse("${item}")))`).join("\n");return`ShapedRecipeBuilder.shaped(RecipeCategory.MISC, ModItems.${CN}, ${r.result||1})\n        .pattern(\n${pl})\n${dl}\n        .unlockedBy("has_item", has(Items.IRON_INGOT))\n        .save(output);`;}const il=Object.values(r.keys||{}).map(item=>`        .requires(ForgeRegistries.ITEMS.getValue(ResourceLocation.parse("${item}")))`).join("\n");return`ShapelessRecipeBuilder.shapeless(RecipeCategory.MISC, ModItems.${CN}, ${r.result||1})\n${il}\n        .unlockedBy("has_item", has(Items.IRON_INGOT))\n        .save(output);`;}
function gTagCode(id,form,isBlock=false){if(!form.tags?.length)return[];const CN=form.constName||(form.id||"").toUpperCase();const ref=isBlock?`ModBlocks.${CN}.get()`:`ModItems.${CN}.get()`;return form.tags.map(tag=>{const[ns,path]=tag.includes(":")?tag.split(":"):[MODID,tag];return`tag(TagKey.create(Registries.${isBlock?"BLOCK":"ITEM"}, ResourceLocation.fromNamespaceAndPath("${ns}", "${path}"))).add(${ref});`;});}
function gItemCode(item,textures){
  const texId=(item.textureId||"").startsWith("__direct__")?null:item.textureId;const tex=textures.find(t=>t.id===texId);
  const id=item.id||"my_item",CN=item.customConstName?item.constName:id.toUpperCase(),dn=item.displayName||id;
  const tt=()=>{if(!item.hasTooltip)return null;const n=item.tooltipNormal?`"tooltip.${MODID}.${id}.normal"`:"null";const h=item.hasHiddenTooltip&&item.tooltipHidden?`"tooltip.${MODID}.${id}.hidden"`:"null";const s=item.hasHiddenTooltip?(item.useDefaultShiftHint?`"tooltip.${MODID}.shift_to_see"`:(item.tooltipShiftHint?`"tooltip.${MODID}.${id}.shift_hint"`:"null")):"null";return{n,h,s};};
  const cls=props=>{const t=tt();if(!t||(t.n==="null"&&t.h==="null"))return`new Item(${props})`;return`new TooltipItem(${props},\n                ${t.n},\n                ${t.h},\n                ${t.s})`;};
  let reg="",ml2;
  if(item.itemType==="Tool"){const tier=TIER_MAP[item.tier]||"Tiers.IRON",dmg=parseFloat(item.damage)||3,spd=parseFloat(item.speed)||-2.4,c=`${item.toolType}Item`;reg=`public static final DeferredItem<${c}> ${CN} = ITEMS.register("${id}",\n        () -> new ${c}(${tier}, new Item.Properties()\n                .attributes(${c}.createAttributes(${tier}, ${dmg}f, ${spd}f))));`;}
  else if(item.itemType==="Food"){const al=item.foodAlwaysEdible?".alwaysEat()":"",n=item.foodNutrition||2,s=parseFloat(item.foodSaturation)||0.3;reg=`public static final DeferredItem<Item> ${CN} = ITEMS.register("${id}",\n        () -> ${cls(`new Item.Properties().food(new FoodProperties.Builder().nutrition(${n}).saturationModifier(${s}f)${al}.build())`)});`;}
  else if(item.itemType==="Fuel"){const t=tt();if(t&&(t.n!=="null"||t.h!=="null"))reg=`public static final DeferredItem<Item> ${CN} = ITEMS.register("${id}",\n        () -> new TooltipItem(new Item.Properties(), ${t.n}, ${t.h}, ${t.s}));`;else reg=`public static final DeferredItem<Item> ${CN} = ITEMS.register("${id}",\n        () -> new FuelItem(new Item.Properties(), ${item.burnTime||1600}));`;}
  else{if((item.holdingMode||"none")==="handheld")ml2=`handheldItem(ModItems.${CN});`;reg=`public static final DeferredItem<Item> ${CN} = ITEMS.register("${id}",\n        () -> ${cls("new Item.Properties()")});`;}
  const modelLine=ml2||(item.itemType==="Tool"?`handheldItem(ModItems.${CN});`:tex?.isAnimated?`existingFileHelper.trackGenerated(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID,"item/${id}"),TEXTURE);\n        getBuilder(ModItems.${CN}.getId().getPath()).parent(new ModelFile.UncheckedModelFile("minecraft:item/generated")).texture("layer0","${MODID}:item/${id}");`:`basicItem(ModItems.${CN}.get());`);
  return{reg,langKey:`item.${MODID}.${id}`,langVal:dn,modelLine,tex,CN};
}
function gBlockEntries(block,textures=[]){
  const id=block.id||"my_block",CN=block.customConstName?block.constName:id.toUpperCase(),dn=block.displayName||id;
  const str=parseFloat(block.strength)||2.0,snd=block.soundType||"WOOD",tf=block.requiresTool?"\n                    .requiresCorrectToolForDrops()":"";
  const props=`BlockBehaviour.Properties.of()\n                    .strength(${str}f)\n                    .sound(SoundType.${snd})${tf}`;
  const orient=block.orientationType||"simple";const entries=[];
  let ml="",bsp="",loot="",mdl="";
  if(orient==="pillar"){ml=`public static final DeferredBlock<RotatedPillarBlock> ${CN} = registerBlock("${id}",\n        () -> new RotatedPillarBlock(${props}));`;bsp=`logBlock((RotatedPillarBlock)ModBlocks.${CN}.get());\n        simpleBlockItem(ModBlocks.${CN}.get(), new ModelFile.UncheckedModelFile("${MODID}:block/${id}"));`;loot=`dropSelf(ModBlocks.${CN}.get());`;mdl=`getBuilder(ModBlocks.${CN}.getId().getPath()).parent(new ModelFile.UncheckedModelFile("${MODID}:block/${id}"));`;}
  else if(orient==="directional"){ml=`public static final DeferredBlock<Block> ${CN} = registerBlock("${id}",\n        () -> new HorizontalDirectionalBlock(${props}));`;bsp=`horizontalBlock(ModBlocks.${CN}.get(),modLoc("block/${id}_front"),modLoc("block/${id}_side"),modLoc("block/${id}_top"));\n        simpleBlockItem(ModBlocks.${CN}.get(), new ModelFile.UncheckedModelFile("${MODID}:block/${id}"));`;loot=`dropSelf(ModBlocks.${CN}.get());`;mdl=`getBuilder(ModBlocks.${CN}.getId().getPath()).parent(new ModelFile.UncheckedModelFile("${MODID}:block/${id}"));`;}
  else{ml=`public static final DeferredBlock<Block> ${CN} = registerBlock("${id}",\n        () -> new Block(${props}));`;bsp=`blockWithItem(ModBlocks.${CN});`;loot=`dropSelf(ModBlocks.${CN}.get());`;mdl=`getBuilder(ModBlocks.${CN}.getId().getPath()).parent(new ModelFile.UncheckedModelFile("${MODID}:block/${id}"));`;}
  entries.push({line:ml,constName:CN,bspLines:bsp,lootLine:loot,modelLine:mdl,langKey:`block.${MODID}.${id}`,langVal:dn,blockId:id});
  const bt=`blockTexture(ModBlocks.${CN}.get())`;
  const bId=id.endsWith("_block")?id.slice(0,-6):id,bCN=CN.endsWith("_BLOCK")?CN.slice(0,-6):CN;
  const bp=`BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${snd})${tf}`;
  const mk=(sfx,cls,extra,bs,lt,mod,lv)=>{const nId=`${bId}${sfx}`,nCN=`${bCN}${sfx.toUpperCase()}`;entries.push({line:`public static final DeferredBlock<${cls}> ${nCN} = registerBlock("${nId}",\n        () -> new ${cls}(${extra}));`,constName:nCN,bspLines:bs,lootLine:lt,modelLine:mod,langKey:`block.${MODID}.${nId}`,langVal:`${dn} ${lv}`,blockId:nId});};
  if(block.createSlab)mk("_slab","SlabBlock",bp,`slabBlock(ModBlocks.${bCN}_SLAB.get(),${bt},${bt});\n        blockItem(ModBlocks.${bCN}_SLAB);`,`add(ModBlocks.${bCN}_SLAB.get(),b->createSlabItemTable(ModBlocks.${bCN}_SLAB.get()));`,"/*slab*/","Slab");
  if(block.createStairs)mk("_stairs","StairBlock",`ModBlocks.${CN}.get().defaultBlockState(),${bp}`,`stairsBlock(ModBlocks.${bCN}_STAIRS.get(),${bt});\n        blockItem(ModBlocks.${bCN}_STAIRS);`,`dropSelf(ModBlocks.${bCN}_STAIRS.get());`,"/*stairs*/","Stairs");
  if(block.createFence)mk("_fence","FenceBlock",bp,`fenceBlock(ModBlocks.${bCN}_FENCE.get(),${bt});`,`dropSelf(ModBlocks.${bCN}_FENCE.get());`,`fenceItem(ModBlocks.${bCN}_FENCE,ModBlocks.${CN});`,"Fence");
  if(block.createFenceGate)mk("_fence_gate","FenceGateBlock",`WoodType.OAK,${bp}`,`fenceGateBlock(ModBlocks.${bCN}_FENCE_GATE.get(),${bt});\n        blockItem(ModBlocks.${bCN}_FENCE_GATE);`,`dropSelf(ModBlocks.${bCN}_FENCE_GATE.get());`,"/*fgate*/","Fence Gate");
  if(block.createWall)mk("_wall","WallBlock",bp,`wallBlock(ModBlocks.${bCN}_WALL.get(),${bt});`,`dropSelf(ModBlocks.${bCN}_WALL.get());`,`wallItem(ModBlocks.${bCN}_WALL,ModBlocks.${CN});`,"Wall");
  if(block.createPressurePlate)mk("_pressure_plate","PressurePlateBlock",`BlockSetType.IRON,${bp}`,`pressurePlateBlock(ModBlocks.${bCN}_PRESSURE_PLATE.get(),${bt});\n        blockItem(ModBlocks.${bCN}_PRESSURE_PLATE);`,`dropSelf(ModBlocks.${bCN}_PRESSURE_PLATE.get());`,"/*pp*/","Pressure Plate");
  if(block.createButton)mk("_button","ButtonBlock",`BlockSetType.IRON,20,BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${snd}).noCollission()${tf}`,`buttonBlock(ModBlocks.${bCN}_BUTTON.get(),${bt});`,`dropSelf(ModBlocks.${bCN}_BUTTON.get());`,`buttonItem(ModBlocks.${bCN}_BUTTON,ModBlocks.${CN});`,"Button");
  if(block.createDoor)mk("_door","DoorBlock",`BlockSetType.IRON,BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${snd}).noOcclusion()${tf}`,`doorBlockWithRenderType(ModBlocks.${bCN}_DOOR.get(),modLoc("block/${bId}_door_bottom"),modLoc("block/${bId}_door_top"),"cutout");`,`add(ModBlocks.${bCN}_DOOR.get(),b->createDoorTable(ModBlocks.${bCN}_DOOR.get()));`,`basicItem(ModBlocks.${bCN}_DOOR.asItem());`,"Door");
  if(block.createTrapdoor)mk("_trapdoor","TrapDoorBlock",`BlockSetType.IRON,BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${snd}).noOcclusion()${tf}`,`trapdoorBlockWithRenderType(ModBlocks.${bCN}_TRAPDOOR.get(),modLoc("block/${bId}_trapdoor"),true,"cutout");\n        blockItem(ModBlocks.${bCN}_TRAPDOOR,'_bottom');`,`dropSelf(ModBlocks.${bCN}_TRAPDOOR.get());`,"/*trapdoor*/","Trapdoor");
  return entries;
}

const ITEM_DEF={id:"",constName:"",customConstName:false,displayName:"",textureId:"",itemType:"None",toolType:"Sword",tier:"Iron",damage:"3",speed:"-2.4",burnTime:"1600",holdingMode:"none",foodNutrition:"3",foodSaturation:"0.3",foodAlwaysEdible:false,creativeTab:"",tags:[],hasRecipe:false,recipe:{type:"shaped",pattern:["   ","   ","   "],keys:{},result:1},hasTooltip:false,tooltipNormal:"",hasHiddenTooltip:false,useDefaultShiftHint:true,tooltipShiftHint:"",tooltipHidden:""};
const BLOCK_DEF={...ITEM_DEF,orientationType:"simple",textureTopId:"",textureBottomId:"",textureSideId:"",textureFrontId:"",textureBackId:"",textureDoorTopId:"",textureDoorBottomId:"",textureDoorItemId:"",textureTrapdoorId:"",strength:"2.0",soundType:"WOOD",requiresTool:false,createSlab:false,createStairs:false,createFence:false,createFenceGate:false,createWall:false,createPressurePlate:false,createButton:false,createDoor:false,createTrapdoor:false};
const TEX_DEF={label:"",dataUrl:null,shapeUrl:null,emissiveUrl:null,isAnimated:false,frames:4,ticksPerFrame:4};

function ItemProv({initial,children}){const[form,setForm]=useState(initial?{...ITEM_DEF,...initial}:ITEM_DEF);const F=useCallback((k,v)=>setForm(f=>({...f,[k]:v})),[]);return<FormCtx.Provider value={{form,F}}>{children}</FormCtx.Provider>;}
function BlockProv({initial,children}){const[form,setForm]=useState(initial?{...BLOCK_DEF,...initial}:BLOCK_DEF);const F=useCallback((k,v)=>setForm(f=>({...f,[k]:v})),[]);return<FormCtx.Provider value={{form,F}}>{children}</FormCtx.Provider>;}
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
  const load=(ref,key)=>{const f=ref.current.files[0];if(!f)return;const r=new FileReader();r.onload=e=>F(key,e.target.result);r.readAsDataURL(f);};
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
  const tags=form.tags||[];
  const add=t=>{if(!t||tags.includes(t))return;F("tags",[...tags,t]);};
  return<div style={{padding:"14px",overflowY:"auto",flex:1}}>
    <Lbl>Tags — click to add</Lbl>
    <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:8}}>{COMMON_TAGS.map(t=><div key={t} onClick={()=>add(t)} style={{fontSize:10,fontFamily:"monospace",padding:"2px 5px",borderRadius:3,cursor:"pointer",background:tags.includes(t)?"#192a19":"#141414",color:tags.includes(t)?"#5acc5a":C.dim,border:`1px solid ${tags.includes(t)?"#2a5a2a":"#1a1a1a"}`}}>{t}</div>)}</div>
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
  if(isBlock){const entries=gBlockEntries(form,textures);return<div style={{padding:"14px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:8}}>{entries.map((e,i)=><CopyB key={i} title={e.constName} code={e.line}/>)}{gTagCode(form.id,form,true).map((t,i)=><CopyB key={"t"+i} title="tag" code={t}/>)}{gRecipe(form.id,form)&&<CopyB title="recipe" code={gRecipe(form.id,form)}/>}</div>;}
  const c=gItemCode(form,textures);
  return<div style={{padding:"14px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:8}}><CopyB title="ModItems" code={c.reg}/><CopyB title="lang" code={`  "${c.langKey}": "${c.langVal}",`}/><CopyB title="model" code={`        ${c.modelLine}`}/>{gTagCode(form.id,form).map((t,i)=><CopyB key={i} title="tag" code={t}/>)}{gRecipe(form.id,form)&&<CopyB title="recipe" code={gRecipe(form.id,form)}/>}</div>;
}

function TexturePickerPanel({textures,fkey="textureId",label="Texture"}){
  const{form,F}=useContext(FormCtx);
  const[srch,setSrch]=useState("");const fRef=useRef();
  const filt=useMemo(()=>{const q=srch.toLowerCase();return textures.filter(t=>!q||t.label.toLowerCase().includes(q)||t.id.toLowerCase().includes(q));},[textures,srch]);
  const sel=form[fkey];
  const onFile=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>F(fkey,"__direct__"+ev.target.result+"__name__"+f.name);r.readAsDataURL(f);};
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

function RightPaneShell({modItems=[],modBlocks=[],textures=[],isBlock=false,activePanel,setActivePanel,highlightFaceKey}){
  const faceLabel=highlightFaceKey?highlightFaceKey.replace(/^texture/,"").replace(/Id$/,"")+" face":"Texture";
  if(!activePanel){
    return<div style={{display:"flex",height:"100%",alignItems:"center",justifyContent:"center",color:C.faint,fontSize:12,flexDirection:"column",gap:8}}>
      <span style={{fontSize:20,color:"#2a2a2a"}}>⊹</span>
      <span>click edit or set on the left</span>
    </div>;
  }
  return<div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
    <div style={{display:"flex",borderBottom:"1px solid #1a1a1a",flexShrink:0}}>
      {["texture","tags","tooltip","recipe","code"].map(id=>(
        <button key={id} onClick={()=>setActivePanel(p=>p===id?null:id)} style={{flex:1,padding:"6px 2px",fontSize:10,background:activePanel===id?"#1a2438":"transparent",color:activePanel===id?C.accent:C.dim,border:"none",borderRight:"1px solid #1a1a1a",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontWeight:activePanel===id?700:400,textTransform:"capitalize"}}>{id}</button>
      ))}
    </div>
    <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      {activePanel==="texture"&&<TexturePickerPanel textures={textures} fkey={highlightFaceKey||"textureId"} label={faceLabel}/>}
      {activePanel==="tags"&&<TagsPanel/>}
      {activePanel==="tooltip"&&<TooltipPanel/>}
      {activePanel==="recipe"&&<RecipePanelWrapper modItems={modItems} modBlocks={modBlocks}/>}
      {activePanel==="code"&&<CodePanel textures={textures} isBlock={isBlock}/>}
    </div>
  </div>;
}

function ItemLeft({textures,initial,isEdit,onSave,onCancel,modItems=[],showCons,consoleH,activePanel,setActivePanel}){
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
    if(!isEdit){
      if(dUrl&&dName){const j=await api("/texture",{filename:dName,dataUrl:dUrl,folder:"item"});msgs.push({ok:j.ok,label:"texture",msg:j.ok?"ok":j.reason});}
      else if(selTex?.dataUrl){const j=await api("/texture",{filename:`${form.id}.png`,dataUrl:selTex.dataUrl,folder:"item"});msgs.push({ok:j.ok,label:"texture",msg:j.ok?"ok":j.reason});if(selTex.isAnimated){const jm=await api("/texture/mcmeta",{filename:`${form.id}.png`,frametime:selTex.ticksPerFrame||4,folder:"item"});msgs.push({ok:jm.ok,label:"mcmeta",msg:jm.ok?"ok":jm.reason});}}
      const j2=await api("/items/register",{line:code.reg,constName:CN});msgs.push({ok:j2.ok,label:"ModItems",msg:j2.ok?"ok":j2.reason});
      const j3=await api("/lang/set",{key:code.langKey,value:code.langVal});msgs.push({ok:j3.ok,label:"lang",msg:j3.ok?"ok":j3.reason});
      const j4=await api("/items/model",{line:code.modelLine});msgs.push({ok:j4.ok,label:"model",msg:j4.ok?"ok":j4.reason});
      for(const tk of gTTKeys(form.id,form)){const jt=await api("/lang/set",{key:tk.key,value:tk.value});msgs.push({ok:jt.ok,label:tk.key,msg:jt.ok?"ok":jt.reason});}
      if(form.tags?.length){const jt=await api("/tags/set",{id:form.id,constName:CN,tags:form.tags,isBlock:false});msgs.push({ok:jt.ok,label:"tags",msg:jt.ok?`${jt.added||0} ok`:jt.reason});}
    }else{
      const j=await api("/items/update",{oldConstName:initial.constName||initial.id?.toUpperCase(),oldId:initial.id,newLine:code.reg,newConstName:CN,newId:form.id,langKey:code.langKey,langVal:code.langVal});msgs.push({ok:j.ok,label:"update",msg:j.ok?"ok":j.reason});
      if(initial.creativeTab&&initial.creativeTab!==form.creativeTab)await api("/creativetab/remove",{ref:`ModItems.${initial.constName||initial.id?.toUpperCase()}`});
      if(selTex?.dataUrl){const jt=await api("/texture",{filename:`${form.id}.png`,dataUrl:selTex.dataUrl,folder:"item"});msgs.push({ok:jt.ok,label:"texture",msg:jt.ok?"ok":jt.reason});}
      for(const tk of gTTKeys(form.id,form)){const jt=await api("/lang/set",{key:tk.key,value:tk.value,update:true});msgs.push({ok:jt.ok,label:tk.key,msg:jt.ok?"ok":jt.reason});}
    }
    if(form.creativeTab){const jt=await api("/creativetab",{ref:`ModItems.${CN}`,itemId:form.id,tabConst:form.creativeTab});msgs.push({ok:jt.ok,label:"tab",msg:jt.ok?"ok":jt.reason});}
    setStatus(msgs);setSaving(false);onSave({...form,constName:CN,savedAt:Date.now()});
  };
  const ER=({label,panel,badge,count})=><EditRow label={label} panel={panel} badge={badge} count={count} activePanel={activePanel} setActivePanel={setActivePanel}/>;
  return<div style={{padding:"20px 20px 100px",display:"flex",flexDirection:"column",gap:13}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:14,fontWeight:500}}>{isEdit?"Edit Item":"New Item"}</span>{isEdit&&<Pill color="#1a2438">editing</Pill>}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <IdField label="Item ID" value={form.id} onChange={v=>{F("id",v);if(!isEdit){F("constName",v.toUpperCase());F("displayName",v.split("_").map(w=>w?w[0].toUpperCase()+w.slice(1):"").join(" "));}}}/>
      <ConstField form={form} F={F}/>
    </div>
    <Inp label="Display Name" value={form.displayName} onChange={v=>F("displayName",v)} placeholder="Mother Flame"/>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <Lbl>Texture</Lbl>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.inp,border:`1px solid ${C.inpB}`,borderRadius:4,padding:"7px 10px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {(selTex||dUrl)&&<AImg url={selTex?.dataUrl||dUrl} size={22} anim={selTex?.isAnimated} frames={selTex?.frames||1} ticks={selTex?.ticksPerFrame||4}/>}
          <span style={{fontSize:13,color:selTex||dUrl?C.text:C.faint}}>{selTex?selTex.label:dUrl?"(direct)":"none selected"}</span>
        </div>
        <Btn sm v="g" onClick={()=>setActivePanel(p=>p==="texture"?null:"texture")}>set</Btn>
      </div>
      {selTex?.isAnimated&&<span style={{fontSize:10,color:C.accent}}>animated — mcmeta auto-written</span>}
    </div>
    <Sel label="Creative Tab" value={form.creativeTab} onChange={v=>F("creativeTab",v)} options={CREATIVE_TABS}/>
    <Sel label="Item Type" value={form.itemType} onChange={v=>F("itemType",v)} options={["None","Tool","Food","Fuel"]}/>
    <Sel label="Holding Mode" value={form.holdingMode||"none"} onChange={v=>F("holdingMode",v)} options={[{value:"none",label:"Default (flat)"},{value:"handheld",label:"Tool / handheld"}]}/>
    {form.itemType==="Tool"&&<Sect title="Tool Properties"><Sel label="Type" value={form.toolType} onChange={v=>F("toolType",v)} options={TOOL_TYPES}/><Sel label="Tier" value={form.tier} onChange={v=>F("tier",v)} options={TIERS}/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Inp label="Damage" value={form.damage} onChange={v=>F("damage",v)} type="number"/><Inp label="Speed" value={form.speed} onChange={v=>F("speed",v)} type="number"/></div></Sect>}
    {form.itemType==="Food"&&<Sect title="Food Properties"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Inp label="Nutrition" value={form.foodNutrition} onChange={v=>F("foodNutrition",v)} type="number"/><Inp label="Saturation" value={form.foodSaturation} onChange={v=>F("foodSaturation",v)} type="number"/></div><Chk label="Always edible" checked={!!form.foodAlwaysEdible} onChange={v=>F("foodAlwaysEdible",v)}/></Sect>}
    {form.itemType==="Fuel"&&<Inp label="Burn time (ticks)" value={form.burnTime} onChange={v=>F("burnTime",v)} type="number"/>}
    <div style={{display:"flex",flexDirection:"column",gap:0,border:`1px solid #1e1e1e`,borderRadius:C.r,overflow:"hidden",marginTop:4}}>
      <ER label="Tags" panel="tags" count={tags.length}/>
      <ER label="Tooltip" panel="tooltip" badge={form.hasTooltip?"on":null}/>
      <ER label="Recipe" panel="recipe" badge={form.hasRecipe?"on":null}/>
    </div>
    {tags.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3}}>{tags.map(t=><Pill key={t} onClick={()=>F("tags",tags.filter(x=>x!==t))}>{t} ✕</Pill>)}</div>}
    <Sbar messages={status}/>
    <FormActions onCancel={onCancel} onSave={save} saving={saving} canSave={!!form.id.trim()&&!valId(form.id)} showCons={showCons} consoleH={consoleH} onCode={()=>setActivePanel(p=>p==="code"?null:"code")}/>
  </div>;
}

function ItemRight({textures,modItems=[],activePanel,setActivePanel}){
  return<RightPaneShell modItems={modItems} textures={textures} isBlock={false} activePanel={activePanel} setActivePanel={setActivePanel}/>;
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
    const wt=async(texId,fname,folder)=>{const t=textures.find(x=>x.id===texId);if(!t?.dataUrl)return;const j=await api("/texture",{filename:fname,dataUrl:t.dataUrl,folder:folder||"block"});msgs.push({ok:j.ok,label:`tex:${fname}`,msg:j.ok?"ok":j.reason});};
    if(!isEdit){
      await wt(form.textureId,`${form.id}.png`,"block");
      if(isAdv){await wt(form.textureTopId,`${form.id}_top.png`,"block");await wt(form.textureBottomId,`${form.id}_bottom.png`,"block");await wt(form.textureSideId,`${form.id}_side.png`,"block");await wt(form.textureFrontId,`${form.id}_front.png`,"block");await wt(form.textureBackId,`${form.id}_back.png`,"block");}
      if(form.createDoor){await wt(form.textureDoorTopId,`${form.id}_door_top.png`,"block");await wt(form.textureDoorBottomId||form.textureId,`${form.id}_door_bottom.png`,"block");await wt(form.textureDoorItemId,`${form.id}_door.png`,"item");}
      if(form.createTrapdoor)await wt(form.textureTrapdoorId||form.textureId,`${form.id}_trapdoor.png`,"block");
      const j2=await api("/blocks/register",{entries,creativeTab:form.creativeTab});
      msgs.push({ok:j2.ok,label:`ModBlocks(${entries.length})`,msg:j2.ok?"ok":j2.reason});
      if(j2.results)j2.results.forEach(r=>msgs.push({ok:r.ok,label:r.constName,msg:r.ok?"ok":r.reason}));
      if(form.tags?.length){const jt=await api("/tags/set",{id:form.id,constName:CN,tags:form.tags,isBlock:true});msgs.push({ok:jt.ok,label:"tags",msg:jt.ok?`${jt.added||0} ok`:jt.reason});}
    }else{
      const code=entries[0];const j=await api("/blocks/update",{oldConstName:initial.constName||initial.id?.toUpperCase(),oldId:initial.id,newLine:code.line,newConstName:CN,newId:form.id,langKey:code.langKey,langVal:code.langVal});msgs.push({ok:j.ok,label:"update",msg:j.ok?"ok":j.reason});
      const t=textures.find(x=>x.id===form.textureId);if(t?.dataUrl){const jt=await api("/texture",{filename:`${form.id}.png`,dataUrl:t.dataUrl,folder:"block"});msgs.push({ok:jt.ok,label:"texture",msg:jt.ok?"ok":jt.reason});}
    }
    if(form.creativeTab){const jt=await api("/creativetab",{ref:`ModBlocks.${CN}`,blockId:form.id,tabConst:form.creativeTab});msgs.push({ok:jt.ok,label:"tab",msg:jt.ok?"ok":jt.reason});}
    if(form.hasTooltip)for(const tk of gTTKeys(form.id,form)){const jt=await api("/lang/set",{key:tk.key,value:tk.value,update:isEdit});msgs.push({ok:jt.ok,label:tk.key,msg:jt.ok?"ok":jt.reason});}
    setStatus(msgs);setSaving(false);onSave(block);
  };
  const ER=({label,panel,badge,count})=><EditRow label={label} panel={panel} badge={badge} count={count} activePanel={activePanel} setActivePanel={setActivePanel}/>;
  const setFace=(fkey)=>{setHighlightFaceKey(fkey);setActivePanel("texture");};
  const FRow=({label,fkey})=>{const t=textures.find(x=>x.id===form[fkey]);return<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 0"}}><div style={{display:"flex",alignItems:"center",gap:7}}>{t?.dataUrl?<AImg url={t.dataUrl} size={22}/>:<div style={{width:22,height:22,background:C.prev,borderRadius:3,border:`1px dashed ${C.inpB}`}}/>}<span style={{fontSize:12,color:C.dim,textTransform:"uppercase",letterSpacing:.5}}>{label}</span></div><Btn sm v="g" onClick={()=>setFace(fkey)}>set</Btn></div>;};
  return<div style={{padding:"20px 20px 100px",display:"flex",flexDirection:"column",gap:13}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:14,fontWeight:500}}>{isEdit?"Edit Block":"New Block"}</span>{isEdit&&<Pill color="#1a2438">editing</Pill>}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <IdField label="Block ID" value={form.id} onChange={v=>{F("id",v);if(!isEdit){F("constName",v.toUpperCase());F("displayName",v.split("_").map(w=>w?w[0].toUpperCase()+w.slice(1):"").join(" "));}}}/>
      <ConstField form={form} F={F}/>
    </div>
    <Inp label="Display Name" value={form.displayName} onChange={v=>F("displayName",v)} placeholder="Obsidian Bricks"/>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <Lbl>Block Orientation</Lbl>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>{[{v:"simple",l:"Simple"},{v:"pillar",l:"Log/Pillar"},{v:"directional",l:"Directional"}].map(o=><label key={o.v} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}><div onClick={()=>F("orientationType",o.v)} style={{width:13,height:13,borderRadius:"50%",border:`2px solid ${orient===o.v?C.accent:C.inpB}`,background:orient===o.v?C.accent:"transparent",flexShrink:0}}/><span style={{fontSize:12,color:"#a0a09a"}}>{o.l}</span></label>)}</div>
      {!isAdv&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13,color:C.text}}>All Faces</span>
          {selTex&&<AImg url={selTex.dataUrl} size={22}/>}
          <span style={{fontSize:11,color:C.dim}}>{selTex?.label||"none"}</span>
        </div>
        <Btn sm v="g" onClick={()=>setFace("textureId")}>set</Btn>
      </div>}
      {isAdv&&<div style={{display:"flex",flexDirection:"column",gap:2,border:`1px solid #1e1e1e`,borderRadius:C.r,padding:"4px 8px"}}>
        <FRow label="Top" fkey="textureTopId"/>
        <FRow label="Front" fkey="textureFrontId"/>
        <FRow label="Side" fkey="textureSideId"/>
        <FRow label="Back" fkey="textureBackId"/>
        <FRow label="Bottom" fkey="textureBottomId"/>
      </div>}
    </div>
    <Sel label="Creative Tab" value={form.creativeTab} onChange={v=>F("creativeTab",v)} options={CREATIVE_TABS}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Inp label="Hardness" value={form.strength} onChange={v=>F("strength",v)} type="number"/><Sel label="Sound" value={form.soundType} onChange={v=>F("soundType",v)} options={SOUND_TYPES}/></div>
    <Chk label="Requires correct tool for drops?" checked={form.requiresTool} onChange={v=>F("requiresTool",v)}/>
    <Sect title="Variants (auto-generated)">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>{[["createSlab","Slab"],["createStairs","Stairs"],["createFence","Fence"],["createFenceGate","Fence Gate"],["createWall","Wall"],["createPressurePlate","Pressure Plate"],["createButton","Button"],["createDoor","Door"],["createTrapdoor","Trapdoor"]].map(([k,l])=><Chk key={k} label={l} checked={!!form[k]} onChange={v=>F(k,v)}/>)}</div>
      {form.createDoor&&<div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.inpB}`,display:"flex",flexDirection:"column",gap:6}}>
        <Lbl>Door Textures</Lbl>
        <FRow label="Door Top" fkey="textureDoorTopId"/>
        <FRow label="Door Bottom" fkey="textureDoorBottomId"/>
        <FRow label="Door Item" fkey="textureDoorItemId"/>
      </div>}
      {form.createTrapdoor&&<div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.inpB}`}}><FRow label="Trapdoor" fkey="textureTrapdoorId"/></div>}
    </Sect>
    <div style={{display:"flex",flexDirection:"column",gap:0,border:`1px solid #1e1e1e`,borderRadius:C.r,overflow:"hidden",marginTop:4}}>
      <ER label="Tags" panel="tags" count={tags.length}/>
      <ER label="Tooltip" panel="tooltip" badge={form.hasTooltip?"on":null}/>
      <ER label="Recipe" panel="recipe" badge={form.hasRecipe?"on":null}/>
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
  const[modItems,setModItems]=useState([]);const[modBlocks,setModBlocks]=useState([]);
  const[backOk,setBackOk]=useState(null);
  const[showCons,setShowCons]=useState(false);const[consH,setConsH]=useState(200);
  const[activePanel,setActivePanel]=useState(null);
  const[highlightFaceKey,setHighlightFaceKey]=useState("textureId");
  const{rs,running,run}=useRun();
  const isElectron=typeof window!=="undefined"&&window.ycsNative?.isElectron;
  const native=typeof window!=="undefined"?window.ycsNative:null;
  const isRunning=rs.state!=="idle";

  useEffect(()=>{fetch(`${BASE}/health`).then(r=>r.json()).then(()=>setBackOk(true)).catch(()=>setBackOk(false));},[]);
  useEffect(()=>{setActivePanel(null);setHighlightFaceKey("textureId");},[texEd,itemEd,blockEd]);
  const reloadMod=()=>{fetch(`${BASE}/items/read`).then(r=>r.json()).then(j=>{if(j.ok)setModItems(j.items||[]);}).catch(()=>{});fetch(`${BASE}/blocks/read`).then(r=>r.json()).then(j=>{if(j.ok)setModBlocks(j.blocks||[]);}).catch(()=>{});};
  useEffect(()=>{ reloadMod(); },[]);
  const onConsDrag=e=>{e.preventDefault();const sy=e.clientY,sh=consH;const mv=ev=>setConsH(Math.max(80,Math.min(480,sh-(ev.clientY-sy))));const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);};
  const allItems=useMemo(()=>{const m=new Map();modItems.forEach(x=>m.set(x.id,{...x,source:"mod"}));items.forEach(x=>m.set(x.id,{...x,source:"local"}));return[...m.values()];},[items,modItems]);
  const allBlocks=useMemo(()=>{const m=new Map();modBlocks.forEach(x=>m.set(x.id,{...x,source:"mod"}));blocks.forEach(x=>m.set(x.id,{...x,source:"local"}));return[...m.values()];},[blocks,modBlocks]);
  const texEntries=useMemo(()=>textures.map(t=>({...t,displayName:t.label,previewDataUrl:t.dataUrl})),[textures]);
  const itemEntries=useMemo(()=>allItems.map(x=>{const t=textures.find(tx=>tx.id===x.textureId);return{...x,previewDataUrl:t?.dataUrl||x.textureDataUrl};}), [allItems,textures]);
  const blockEntries=useMemo(()=>allBlocks.map(x=>{const t=textures.find(tx=>tx.id===x.textureId);return{...x,previewDataUrl:t?.dataUrl||x.textureDataUrl};}), [allBlocks,textures]);
  const delTex=id=>setTextures(arr=>arr.filter(x=>x.id!==id));
  const delItem=async id=>{const item=allItems.find(x=>x.id===id);if(!item)return;await api("/items/delete",{id,constName:item.constName||id.toUpperCase()});await api("/texture/delete",{filename:`${id}.png`,folder:"item"});setItems(arr=>arr.filter(x=>x.id!==id));reloadMod();};
  const delBlock=async id=>{const b=allBlocks.find(x=>x.id===id);if(!b)return;await api("/blocks/delete",{id,constName:b.constName||id.toUpperCase()});await api("/texture/delete",{filename:`${id}.png`,folder:"block"});setBlocks(arr=>arr.filter(x=>x.id!==id));reloadMod();};
  const saveItem=item=>{setItems(arr=>{const i=arr.findIndex(x=>x.id===item.id);return i>=0?arr.map((x,j)=>j===i?item:x):[...arr,item];});reloadMod();setItemEd(null);};
  const saveBlock=block=>{setBlocks(arr=>{const i=arr.findIndex(x=>x.id===block.id);return i>=0?arr.map((x,j)=>j===i?block:x):[...arr,block];});reloadMod();setBlockEd(null);};
  const saveTex=tex=>{const id=tex.label.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");if(texEd?.mode==="edit"){setTextures(arr=>arr.map(x=>x.id===texEd.target?.id?{...tex,id,savedAt:Date.now()}:x));}else setTextures(arr=>[...arr,{...tex,id,savedAt:Date.now()}]);setTexEd(null);};
  const switchTab=t=>{setTab(t);setTexEd(null);setItemEd(null);setBlockEd(null);setActivePanel(null);};
  const inEd=(tab==="textures"&&texEd!=null)||(tab==="items"&&itemEd!=null)||(tab==="blocks"&&blockEd!=null);
  const fabBottom=showCons?consH+5+30:30;
  const TABS=[{id:"textures",l:"Textures"},{id:"items",l:"Items"},{id:"blocks",l:"Blocks"}];

  const renderPane=()=>{
    if(tab==="textures"){
      if(texEd){const init=texEd.target||null;return<TexProv initial={init}><div style={{display:"flex",gap:5,flex:1,overflow:"hidden",minHeight:0}}><div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}><div style={{flex:1,overflowY:"auto"}}><TexLeft initial={init} onSave={saveTex} onCancel={()=>setTexEd(null)}/></div></div><div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}><TexRight/></div></div></TexProv>;}
      return<div style={{flex:1,background:C.panel,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:0}}><CardGrid entries={texEntries} emptyLabel="No textures yet." onDelete={delTex} onOpen={e=>setTexEd({mode:"edit",target:e})}/></div>;
    }
    if(tab==="items"){
      if(itemEd){const init=itemEd.target||null;return<ItemProv initial={init}><div style={{display:"flex",gap:5,flex:1,overflow:"hidden",minHeight:0}}><div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}><div style={{flex:1,overflowY:"auto"}}><ItemLeft textures={textures} initial={init} isEdit={!!init} onSave={saveItem} onCancel={()=>setItemEd(null)} modItems={allItems} showCons={showCons} consoleH={consH} activePanel={activePanel} setActivePanel={setActivePanel}/></div></div><div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}><ItemRight textures={textures} modItems={allItems} activePanel={activePanel} setActivePanel={setActivePanel}/></div></div></ItemProv>;}
      return<div style={{flex:1,background:C.panel,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:0}}><CardGrid entries={itemEntries} emptyLabel="No items yet." onDelete={delItem} onOpen={e=>setItemEd({target:e})}/></div>;
    }
    if(tab==="blocks"){
      if(blockEd){const init=blockEd.target||null;return<BlockProv initial={init}><div style={{display:"flex",gap:5,flex:1,overflow:"hidden",minHeight:0}}><div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}><div style={{flex:1,overflowY:"auto"}}><BlockLeft textures={textures} initial={init} isEdit={!!init} onSave={saveBlock} onCancel={()=>setBlockEd(null)} modItems={allItems} modBlocks={allBlocks} showCons={showCons} consoleH={consH} activePanel={activePanel} setActivePanel={setActivePanel} setHighlightFaceKey={setHighlightFaceKey}/></div></div><div style={{flex:1,background:C.panel,border:`1px solid ${C.pb}`,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column"}}><BlockRight textures={textures} modItems={allItems} modBlocks={allBlocks} activePanel={activePanel} setActivePanel={setActivePanel} highlightFaceKey={highlightFaceKey}/></div></div></BlockProv>;}
      return<div style={{flex:1,background:C.panel,borderRadius:C.r,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:0}}><CardGrid entries={blockEntries} emptyLabel="No blocks yet." onDelete={delBlock} onOpen={e=>setBlockEd({target:e})}/></div>;
    }
    return null;
  };

  return<>
    <style>{FONT_URL}{G_CSS}</style>
    <div style={{height:"100vh",background:C.bg,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{height:36,background:"#1c1c1c",display:"flex",alignItems:"center",flexShrink:0,WebkitAppRegion:"drag",zIndex:30}}>
        <div style={{display:"flex",alignItems:"center",gap:8,paddingLeft:13,WebkitAppRegion:"no-drag"}}>
          <Dot color="#e4e5e9" title={rs.dirty?"RunData→RunClient":"RunClient"} disabled={isRunning||running} onClick={()=>run("/run/client")}/>
          <Dot color="#e4e5e9" title="RunData" disabled={isRunning||running} onClick={()=>run("/run/data")}/>
          <Dot color="#e4e5e9" title={showCons?"Hide console":"Show console"} onClick={()=>setShowCons(v=>!v)}/>
        </div>
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
      <div style={{height:36,background:C.tabBar,display:"flex",alignItems:"flex-end",paddingLeft:8,flexShrink:0,zIndex:20}}>
        {TABS.map(t=>{const a=tab===t.id;return<button key={t.id} onClick={()=>switchTab(t.id)} style={{width:TAB_W,height:TAB_H,background:a?C.bg:"#2e2e2e",border:"none",borderRadius:"6.5px 6.5px 0 0",color:C.text,fontSize:12,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,cursor:"pointer",flexShrink:0,marginRight:3,opacity:a?1:0.65}}>{t.l}</button>;})}
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
