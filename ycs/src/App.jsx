import { useState, useRef, useCallback, useEffect } from "react";

const MODID = "yebisurpg";
const BASE  = "http://localhost:3001/api";
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap');`;
const css = `*{box-sizing:border-box;margin:0;padding:0;}body{background:#0e0e10;color:#e8e8e0;font-family:'IBM Plex Sans',sans-serif;font-size:13px;}::-webkit-scrollbar{width:6px;height:6px;}::-webkit-scrollbar-track{background:#1a1a1c;}::-webkit-scrollbar-thumb{background:#3a3a3c;border-radius:3px;}input[type=number]::-webkit-inner-spin-button{opacity:1;}`;

const TOOL_TYPES  = ["Sword","Pickaxe","Axe","Shovel","Hoe"];
const TIERS       = ["Wood","Stone","Iron","Diamond","Netherite","YE6ISU"];
const TIER_MAP    = {Wood:"Tiers.WOOD",Stone:"Tiers.STONE",Iron:"Tiers.IRON",Diamond:"Tiers.DIAMOND",Netherite:"Tiers.NETHERITE",YE6ISU:"ModToolTiers.YE6ISU"};
const SOUND_TYPES = ["STONE","WOOD","METAL","GRASS","SAND","GRAVEL","GLASS","CLOTH","SNOW","NETHER_WART","LANTERN","CHAIN","COPPER","DEEPSLATE","TUFF","CALCITE"];
const BLOCK_SHAPES = [
  {value:"simple",     label:"Simple (all faces same)"},
  {value:"pillar",     label:"Pillar / Log (top/bottom vs side)"},
  {value:"directional",label:"Directional (e.g. furnace — front face)"},
  {value:"slab",       label:"Slab"},
  {value:"stairs",     label:"Stairs"},
  {value:"fence",      label:"Fence"},
  {value:"fence_gate", label:"Fence Gate"},
  {value:"wall",       label:"Wall"},
  {value:"door",       label:"Door (2 textures: top/bottom + item)"},
  {value:"trapdoor",   label:"Trapdoor"},
  {value:"pressure_plate", label:"Pressure Plate"},
  {value:"button",     label:"Button"},
];
const CREATIVE_TABS = [
  {value:"",label:"(none)"},
  {value:"ModCreativeModeTabs.YEBISURPG_ITEMS_TAB",label:"yebisu RPG Items (mod)"},
  {value:"ModCreativeModeTabs.YEBISURPG_BLOCK_TAB",label:"yebisu RPG Blocks (mod)"},
  {value:"vanilla:combat",label:"Combat (vanilla)"},
  {value:"vanilla:tools_and_utilities",label:"Tools & Utilities (vanilla)"},
  {value:"vanilla:food_and_drinks",label:"Food & Drinks (vanilla)"},
  {value:"vanilla:ingredients",label:"Ingredients (vanilla)"},
  {value:"vanilla:building_blocks",label:"Building Blocks (vanilla)"},
  {value:"vanilla:redstone",label:"Redstone (vanilla)"},
  {value:"vanilla:natural_blocks",label:"Natural Blocks (vanilla)"},
];

function useLocalStorage(key, init) {
  const [val, setVal] = useState(() => { try { const s=localStorage.getItem(key); return s?JSON.parse(s):init; } catch { return init; } });
  const set = useCallback(v => { const next=typeof v==="function"?v(val):v; setVal(next); try{localStorage.setItem(key,JSON.stringify(next));}catch{} }, [key,val]);
  return [val, set];
}

async function api(ep, body) {
  try { const r=await fetch(`${BASE}${ep}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}); return await r.json(); }
  catch { return {ok:false,reason:"backend not reachable — run node server.js"}; }
}
async function apiGet(ep) {
  try { const r=await fetch(`${BASE}${ep}`); return await r.json(); }
  catch { return {ok:false}; }
}

// ── Primitives ─────────────────────────────────────────────────────────────────
function Tag({children,color="#3a3a3c"}){ return <span style={{background:color,color:"#e8e8e0",fontSize:11,padding:"2px 7px",borderRadius:3,fontFamily:"'IBM Plex Mono',monospace",whiteSpace:"nowrap"}}>{children}</span>; }
function Btn({children,onClick,variant="default",small,disabled,style={}}){
  const base={display:"inline-flex",alignItems:"center",gap:6,padding:small?"4px 10px":"7px 14px",fontSize:small?11:13,border:"none",borderRadius:4,cursor:disabled?"not-allowed":"pointer",fontFamily:"'IBM Plex Mono',monospace",fontWeight:500,transition:"opacity .15s",opacity:disabled?0.45:1,...style};
  const v={default:{background:"#2a2a2e",color:"#e8e8e0"},primary:{background:"#d4a843",color:"#0e0e10"},danger:{background:"#7a1a1a",color:"#ffb3b3"},ghost:{background:"transparent",color:"#888880",border:"1px solid #2a2a2e"},success:{background:"#1a3a1a",color:"#88cc88"},warn:{background:"#3a2a0a",color:"#d4a843",border:"1px solid #5a4a1a"}};
  return <button disabled={disabled} style={{...base,...(v[variant]||v.default)}} onClick={onClick}>{children}</button>;
}
function Input({label,value,onChange,placeholder,mono,type="text",style={}}){
  return <div style={{display:"flex",flexDirection:"column",gap:4}}>{label&&<span style={{fontSize:11,color:"#888880",textTransform:"uppercase",letterSpacing:1}}>{label}</span>}<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{background:"#1a1a1c",border:"1px solid #2a2a2e",borderRadius:4,padding:"7px 10px",color:"#e8e8e0",fontSize:13,fontFamily:mono?"'IBM Plex Mono',monospace":"inherit",outline:"none",...style}} /></div>;
}
function Select({label,value,onChange,options}){
  return <div style={{display:"flex",flexDirection:"column",gap:4}}>{label&&<span style={{fontSize:11,color:"#888880",textTransform:"uppercase",letterSpacing:1}}>{label}</span>}<select value={value} onChange={e=>onChange(e.target.value)} style={{background:"#1a1a1c",border:"1px solid #2a2a2e",borderRadius:4,padding:"7px 10px",color:"#e8e8e0",fontSize:13,outline:"none"}}>{options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select></div>;
}
function CheckBox({label,checked,onChange}){
  return <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none"}}><div onClick={()=>onChange(!checked)} style={{width:16,height:16,border:`1px solid ${checked?"#d4a843":"#3a3a3c"}`,borderRadius:3,background:checked?"#d4a843":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{checked&&<svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="#0e0e10" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}</div><span style={{fontSize:13,color:"#c8c8c0"}}>{label}</span></label>;
}
function Textarea({label,value,onChange,placeholder,rows=3}){
  return <div style={{display:"flex",flexDirection:"column",gap:4}}>{label&&<span style={{fontSize:11,color:"#888880",textTransform:"uppercase",letterSpacing:1}}>{label}</span>}<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{background:"#1a1a1c",border:"1px solid #2a2a2e",borderRadius:4,padding:"7px 10px",color:"#e8e8e0",fontSize:13,fontFamily:"inherit",outline:"none",resize:"vertical"}} /></div>;
}
function CodeBlock({code,title}){
  const [c,setC]=useState(false);
  return <div style={{background:"#141416",border:"1px solid #2a2a2e",borderRadius:6,overflow:"hidden"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 12px",borderBottom:"1px solid #2a2a2e",background:"#1a1a1c"}}><span style={{fontSize:11,color:"#888880",fontFamily:"'IBM Plex Mono',monospace"}}>{title}</span><Btn small variant="ghost" onClick={()=>{navigator.clipboard.writeText(code);setC(true);setTimeout(()=>setC(false),1500);}}>{c?"✓ copied":"copy"}</Btn></div><pre style={{padding:"12px 14px",overflowX:"auto",fontSize:12,lineHeight:1.7,fontFamily:"'IBM Plex Mono',monospace",color:"#c8c8c0",whiteSpace:"pre"}}>{code}</pre></div>;
}
function ImagePreview({dataUrl,size=64}){
  if(!dataUrl) return <div style={{width:size,height:size,background:"#1a1a1c",border:"1px dashed #3a3a3c",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:11,color:"#555550"}}>no img</span></div>;
  return <img src={dataUrl} alt="" style={{width:size,height:size,imageRendering:"pixelated",borderRadius:4,border:"1px solid #2a2a2e",background:"#1a1a1c",flexShrink:0}} />;
}
function StatusBar({messages}){
  if(!messages.length) return null;
  return <div style={{display:"flex",flexDirection:"column",gap:4,margin:"8px 0"}}>{messages.map((m,i)=><div key={i} style={{padding:"6px 12px",borderRadius:4,fontSize:12,fontFamily:"'IBM Plex Mono',monospace",background:m.ok?"#1a3a1a":"#3a1a1a",color:m.ok?"#88cc88":"#cc8888",borderLeft:`3px solid ${m.ok?"#44aa44":"#aa4444"}`}}>{m.ok?"✓":"✗"} {m.label}: {m.msg}</div>)}</div>;
}
function ConfirmModal({message,onConfirm,onCancel}){
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}><div style={{background:"#1a1a1c",border:"1px solid #3a3a3c",borderRadius:8,padding:"24px 28px",maxWidth:380,width:"100%",display:"flex",flexDirection:"column",gap:16}}><div style={{fontSize:14,color:"#e8e8e0"}}>{message}</div><div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><Btn variant="ghost" onClick={onCancel}>cancel</Btn><Btn variant="danger" onClick={onConfirm}>delete</Btn></div></div></div>;
}

// ── Tooltip section (shared between item and block) ────────────────────────────
function TooltipSection({form, F}){
  return <div style={{display:"flex",flexDirection:"column",gap:12,padding:"14px 16px",background:"#1a1a1c",border:"1px solid #2a2a2e",borderRadius:6}}>
    <span style={{fontSize:12,color:"#d4a843",fontWeight:500}}>Tooltip</span>
    <CheckBox label="Add tooltip?" checked={!!form.hasTooltip} onChange={v=>F("hasTooltip",v)} />
    {form.hasTooltip && <>
      <Textarea label="Normal tooltip text" value={form.tooltipNormal||""} onChange={v=>F("tooltipNormal",v)} placeholder="Right-click to use" rows={2} />
      <CheckBox label="Add shift-to-reveal hidden tooltip?" checked={!!form.hasHiddenTooltip} onChange={v=>F("hasHiddenTooltip",v)} />
      {form.hasHiddenTooltip && <>
        <CheckBox label="Use default 'Shift for info' hint (unchecked = custom hint text)" checked={!!form.useDefaultShiftHint} onChange={v=>F("useDefaultShiftHint",v)} />
        {!form.useDefaultShiftHint && <Input label="Custom 'hold shift' hint" value={form.tooltipShiftHint||""} onChange={v=>F("tooltipShiftHint",v)} placeholder="Hold SHIFT for details" />}
        <Textarea label="Hidden tooltip (shown when shift held)" value={form.tooltipHidden||""} onChange={v=>F("tooltipHidden",v)} placeholder="Ancient artifact from..." rows={3} />
      </>}
    </>}
  </div>;
}

// ── Code generators ────────────────────────────────────────────────────────────
function genTooltipLangKeys(id, form){
  const keys = [];
  if (form.hasTooltip && form.tooltipNormal) keys.push({ key:`tooltip.${MODID}.${id}.normal`, value: form.tooltipNormal });
  if (form.hasTooltip && form.hasHiddenTooltip) {
    if (!form.useDefaultShiftHint && form.tooltipShiftHint) keys.push({ key:`tooltip.${MODID}.${id}.shift_hint`, value: form.tooltipShiftHint });
    if (form.tooltipHidden) keys.push({ key:`tooltip.${MODID}.${id}.hidden`, value: form.tooltipHidden });
  }
  return keys;
}

function genItemCode(item, textures) {
  const tex = textures.find(t=>t.id===item.textureId);
  const id=item.id||"my_item", CN=item.constName||id.toUpperCase(), dn=item.displayName||id;

  // Tooltip args for TooltipItem — null means "no tooltip"
  function tooltipArgs() {
    if (!item.hasTooltip) return null;
    const normalKey  = item.tooltipNormal   ? `"tooltip.${MODID}.${id}.normal"`  : 'null';
    const hiddenKey  = item.hasHiddenTooltip && item.tooltipHidden ? `"tooltip.${MODID}.${id}.hidden"` : 'null';
    const shiftKey   = item.hasHiddenTooltip
      ? (item.useDefaultShiftHint ? `"tooltip.${MODID}.shift_to_see"` : (item.tooltipShiftHint ? `"tooltip.${MODID}.${id}.shift_hint"` : 'null'))
      : 'null';
    return { normalKey, hiddenKey, shiftKey };
  }

  // Choose item class — TooltipItem if tooltip needed, otherwise plain Item
  function itemClass(props) {
    const tt = tooltipArgs();
    if (!tt || (tt.normalKey==='null' && tt.hiddenKey==='null')) {
      return `new Item(${props})`;
    }
    return `new TooltipItem(${props},\n                ${tt.normalKey},\n                ${tt.hiddenKey},\n                ${tt.shiftKey})`;
  }

  let reg="";
  if (item.itemType==="Tool") {
    const tier=TIER_MAP[item.tier]||"Tiers.IRON", dmg=parseFloat(item.damage)||3, spd=parseFloat(item.speed)||-2.4;
    const cls=`${item.toolType}Item`;
    // Tools can't easily use TooltipItem since they extend a specific tool class.
    // For now generate plain tool — tooltip on tools is rare and can be done manually.
    reg=`public static final DeferredItem<${cls}> ${CN} = ITEMS.register("${id}",\n        () -> new ${cls}(${tier}, new Item.Properties()\n                .attributes(${cls}.createAttributes(${tier}, ${dmg}f, ${spd}f))));`;
  } else if (item.itemType==="Food") {
    reg=`public static final DeferredItem<Item> ${CN} = ITEMS.register("${id}",\n        () -> ${itemClass(`new Item.Properties().food(/* TODO: ModFoodProperties.${CN} */)`)});`;
  } else if (item.itemType==="Fuel") {
    // FuelItem doesn't extend Item directly in a way we can subclass easily, use TooltipItem workaround
    const tt = tooltipArgs();
    if (tt && (tt.normalKey!=='null' || tt.hiddenKey!=='null')) {
      reg=`public static final DeferredItem<Item> ${CN} = ITEMS.register("${id}",\n        () -> new TooltipItem(new Item.Properties(),\n                ${tt.normalKey},\n                ${tt.hiddenKey},\n                ${tt.shiftKey}));\n    // Note: FuelItem burn time requires registering via IItemExtension.getBurnTime() or a custom class`;
    } else {
      reg=`public static final DeferredItem<Item> ${CN} = ITEMS.register("${id}",\n        () -> new FuelItem(new Item.Properties(), ${item.burnTime||1600}));`;
    }
  } else {
    reg=`public static final DeferredItem<Item> ${CN} = ITEMS.register("${id}",\n        () -> ${itemClass('new Item.Properties()')});`;
  }

  const langKey=`item.${MODID}.${id}`;
  const modelLine=item.itemType==="Tool"?`handheldItem(ModItems.${CN});`:`basicItem(ModItems.${CN}.get());`;
  return { reg, langKey, langVal:dn, modelLine, tex };
}

function genBlockEntries(block) {
  const id=block.id||"my_block", CN=block.constName||id.toUpperCase(), dn=block.displayName||id;
  const str=parseFloat(block.strength)||2.0, sound=block.soundType||"WOOD";
  const toolFlag=block.requiresTool?"\n                    .requiresCorrectToolForDrops()":"";
  const entries = [];

  // Main block
  let mainLine="";
  if (block.blockShape==="simple") {
    mainLine=`public static final DeferredBlock<Block> ${CN} = registerBlock("${id}",\n        () -> new Block(BlockBehaviour.Properties.of()\n                    .strength(${str}f)\n                    .sound(SoundType.${sound})${toolFlag}));`;
  } else if (block.blockShape==="pillar") {
    mainLine=`public static final DeferredBlock<RotatedPillarBlock> ${CN} = registerBlock("${id}",\n        () -> new RotatedPillarBlock(BlockBehaviour.Properties.of()\n                    .strength(${str}f)\n                    .sound(SoundType.${sound})${toolFlag}));`;
  } else if (block.blockShape==="directional") {
    mainLine=`public static final DeferredBlock<Block> ${CN} = registerBlock("${id}",\n        () -> new HorizontalDirectionalBlock(BlockBehaviour.Properties.of()\n                    .strength(${str}f)\n                    .sound(SoundType.${sound})${toolFlag}));`;
  } else if (block.blockShape==="door") {
    mainLine=`public static final DeferredBlock<DoorBlock> ${CN} = registerBlock("${id}",\n        () -> new DoorBlock(BlockSetType.IRON, BlockBehaviour.Properties.of()\n                    .strength(${str}f)\n                    .sound(SoundType.${sound}).noOcclusion()${toolFlag}));`;
  } else if (block.blockShape==="trapdoor") {
    mainLine=`public static final DeferredBlock<TrapDoorBlock> ${CN} = registerBlock("${id}",\n        () -> new TrapDoorBlock(BlockSetType.IRON, BlockBehaviour.Properties.of()\n                    .strength(${str}f)\n                    .sound(SoundType.${sound}).noOcclusion()${toolFlag}));`;
  } else if (block.blockShape==="pressure_plate") {
    mainLine=`public static final DeferredBlock<PressurePlateBlock> ${CN} = registerBlock("${id}",\n        () -> new PressurePlateBlock(BlockSetType.IRON, BlockBehaviour.Properties.of()\n                    .strength(${str}f)\n                    .sound(SoundType.${sound})${toolFlag}));`;
  } else if (block.blockShape==="button") {
    mainLine=`public static final DeferredBlock<ButtonBlock> ${CN} = registerBlock("${id}",\n        () -> new ButtonBlock(BlockSetType.IRON, 20, BlockBehaviour.Properties.of()\n                    .strength(${str}f)\n                    .sound(SoundType.${sound}).noCollission()${toolFlag}));`;
  } else {
    // slab/stairs/fence/fence_gate/wall — these reference a parent block
    const parent = block.parentBlock ? `ModBlocks.${block.parentBlock.toUpperCase()}.get().defaultBlockState()` : `/* parent block state */`;
    const baseTex = block.parentBlock ? `blockTexture(ModBlocks.${block.parentBlock.toUpperCase()}.get())` : `modLoc("block/${id}")`;
    if (block.blockShape==="slab") {
      mainLine=`public static final DeferredBlock<SlabBlock> ${CN} = registerBlock("${id}",\n        () -> new SlabBlock(BlockBehaviour.Properties.of()\n                    .strength(${str}f)\n                    .sound(SoundType.${sound})${toolFlag}));`;
    } else if (block.blockShape==="stairs") {
      mainLine=`public static final DeferredBlock<StairBlock> ${CN} = registerBlock("${id}",\n        () -> new StairBlock(${parent},\n                    BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${sound})${toolFlag}));`;
    } else if (block.blockShape==="fence") {
      mainLine=`public static final DeferredBlock<FenceBlock> ${CN} = registerBlock("${id}",\n        () -> new FenceBlock(BlockBehaviour.Properties.of()\n                    .strength(${str}f)\n                    .sound(SoundType.${sound})${toolFlag}));`;
    } else if (block.blockShape==="fence_gate") {
      mainLine=`public static final DeferredBlock<FenceGateBlock> ${CN} = registerBlock("${id}",\n        () -> new FenceGateBlock(WoodType.OAK, BlockBehaviour.Properties.of()\n                    .strength(${str}f)\n                    .sound(SoundType.${sound})${toolFlag}));`;
    } else if (block.blockShape==="wall") {
      mainLine=`public static final DeferredBlock<WallBlock> ${CN} = registerBlock("${id}",\n        () -> new WallBlock(BlockBehaviour.Properties.of()\n                    .strength(${str}f)\n                    .sound(SoundType.${sound})${toolFlag}));`;
    }
  }

  let bspLine="", lootLine="", modelLine="";
  const baseTex2 = block.parentBlock ? `blockTexture(ModBlocks.${block.parentBlock.toUpperCase()}.get())` : `blockTexture(ModBlocks.${CN}.get())`;

  if (block.blockShape==="simple") {
    bspLine=`blockWithItem(ModBlocks.${CN});`; lootLine=`dropSelf(ModBlocks.${CN}.get());`; modelLine=`basicItem(ModBlocks.${CN}.asItem());`;
  } else if (block.blockShape==="pillar") {
    bspLine=`logBlock((RotatedPillarBlock) ModBlocks.${CN}.get());\n        simpleBlockItem(ModBlocks.${CN}.get(), new ModelFile.UncheckedModelFile("${MODID}:block/${id}"));`;
    lootLine=`dropSelf(ModBlocks.${CN}.get());`; modelLine=`basicItem(ModBlocks.${CN}.asItem());`;
  } else if (block.blockShape==="directional") {
    bspLine=`horizontalBlock(ModBlocks.${CN}.get(), modLoc("block/${id}_front"), modLoc("block/${id}_side"), modLoc("block/${id}_top"));\n        simpleBlockItem(ModBlocks.${CN}.get(), new ModelFile.UncheckedModelFile("${MODID}:block/${id}"));`;
    lootLine=`dropSelf(ModBlocks.${CN}.get());`; modelLine=`basicItem(ModBlocks.${CN}.asItem());`;
  } else if (block.blockShape==="slab") {
    bspLine=`slabBlock(ModBlocks.${CN}.get(), ${baseTex2}, ${baseTex2});\n        blockItem(ModBlocks.${CN});`;
    lootLine=`add(ModBlocks.${CN}.get(), block -> createSlabItemTable(ModBlocks.${CN}.get()));`; modelLine=`/* slab item registered via blockItem */`;
  } else if (block.blockShape==="stairs") {
    bspLine=`stairsBlock(ModBlocks.${CN}.get(), ${baseTex2});\n        blockItem(ModBlocks.${CN});`;
    lootLine=`dropSelf(ModBlocks.${CN}.get());`; modelLine=`/* stairs item registered via blockItem */`;
  } else if (block.blockShape==="fence") {
    bspLine=`fenceBlock(ModBlocks.${CN}.get(), ${baseTex2});`;
    lootLine=`dropSelf(ModBlocks.${CN}.get());`; modelLine=`fenceItem(ModBlocks.${CN}, ${block.parentBlock?`ModBlocks.${block.parentBlock.toUpperCase()}`:"/* base block */"});`;
  } else if (block.blockShape==="fence_gate") {
    bspLine=`fenceGateBlock(ModBlocks.${CN}.get(), ${baseTex2});\n        blockItem(ModBlocks.${CN});`;
    lootLine=`dropSelf(ModBlocks.${CN}.get());`; modelLine=`/* gate item registered via blockItem */`;
  } else if (block.blockShape==="wall") {
    bspLine=`wallBlock(ModBlocks.${CN}.get(), ${baseTex2});`;
    lootLine=`dropSelf(ModBlocks.${CN}.get());`; modelLine=`wallItem(ModBlocks.${CN}, ${block.parentBlock?`ModBlocks.${block.parentBlock.toUpperCase()}`:"/* base block */"});`;
  } else if (block.blockShape==="door") {
    bspLine=`doorBlockWithRenderType(ModBlocks.${CN}.get(), modLoc("block/${id}_bottom"), modLoc("block/${id}_top"), "cutout");`;
    lootLine=`add(ModBlocks.${CN}.get(), block -> createDoorTable(ModBlocks.${CN}.get()));`; modelLine=`basicItem(ModBlocks.${CN}.asItem());`;
  } else if (block.blockShape==="trapdoor") {
    bspLine=`trapdoorBlockWithRenderType(ModBlocks.${CN}.get(), modLoc("block/${id}"), true, "cutout");\n        blockItem(ModBlocks.${CN}, "_bottom");`;
    lootLine=`dropSelf(ModBlocks.${CN}.get());`; modelLine=`/* trapdoor item registered via blockItem */`;
  } else if (block.blockShape==="pressure_plate") {
    bspLine=`pressurePlateBlock(ModBlocks.${CN}.get(), ${baseTex2});\n        blockItem(ModBlocks.${CN});`;
    lootLine=`dropSelf(ModBlocks.${CN}.get());`; modelLine=`/* pressure plate item via blockItem */`;
  } else if (block.blockShape==="button") {
    bspLine=`buttonBlock(ModBlocks.${CN}.get(), ${baseTex2});`;
    lootLine=`dropSelf(ModBlocks.${CN}.get());`; modelLine=`buttonItem(ModBlocks.${CN}, ${block.parentBlock?`ModBlocks.${block.parentBlock.toUpperCase()}`:"/* base block */"});`;
  }

  entries.push({ line:mainLine, constName:CN, bspLines:bspLine, lootLine, modelLine, langKey:`block.${MODID}.${id}`, langVal:dn });

  // Child blocks (slab/stairs spawned from a simple block)
  if (block.blockShape==="simple" && block.createSlab) {
    const slabId=`${id}_slab`, slabCN=`${CN}_SLAB`;
    entries.push({
      line:`public static final DeferredBlock<SlabBlock> ${slabCN} = registerBlock("${slabId}",\n        () -> new SlabBlock(BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${sound})${toolFlag}));`,
      constName:slabCN,
      bspLines:`slabBlock(ModBlocks.${slabCN}.get(), blockTexture(ModBlocks.${CN}.get()), blockTexture(ModBlocks.${CN}.get()));\n        blockItem(ModBlocks.${slabCN});`,
      lootLine:`add(ModBlocks.${slabCN}.get(), block -> createSlabItemTable(ModBlocks.${slabCN}.get()));`,
      modelLine:`/* ${slabId} item registered via blockItem */`,
      langKey:`block.${MODID}.${slabId}`, langVal:`${dn} Slab`
    });
  }
  if (block.blockShape==="simple" && block.createStairs) {
    const stairId=`${id}_stairs`, stairCN=`${CN}_STAIRS`;
    entries.push({
      line:`public static final DeferredBlock<StairBlock> ${stairCN} = registerBlock("${stairId}",\n        () -> new StairBlock(ModBlocks.${CN}.get().defaultBlockState(),\n                    BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${sound})${toolFlag}));`,
      constName:stairCN,
      bspLines:`stairsBlock(ModBlocks.${stairCN}.get(), blockTexture(ModBlocks.${CN}.get()));\n        blockItem(ModBlocks.${stairCN});`,
      lootLine:`dropSelf(ModBlocks.${stairCN}.get());`,
      modelLine:`/* ${stairId} item registered via blockItem */`,
      langKey:`block.${MODID}.${stairId}`, langVal:`${dn} Stairs`
    });
  }

  if (block.blockShape==="simple" && block.createFence) {
    const fId=`${id}_fence`, fCN=`${CN}_FENCE`;
    entries.push({
      line:`public static final DeferredBlock<FenceBlock> ${fCN} = registerBlock("${fId}",\n        () -> new FenceBlock(BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${sound})${toolFlag}));`,
      constName:fCN, bspLines:`fenceBlock(ModBlocks.${fCN}.get(), blockTexture(ModBlocks.${CN}.get()));`,
      lootLine:`dropSelf(ModBlocks.${fCN}.get());`, modelLine:`fenceItem(ModBlocks.${fCN}, ModBlocks.${CN});`,
      langKey:`block.${MODID}.${fId}`, langVal:`${dn} Fence`
    });
  }
  if (block.blockShape==="simple" && block.createFenceGate) {
    const fgId=`${id}_fence_gate`, fgCN=`${CN}_FENCE_GATE`;
    entries.push({
      line:`public static final DeferredBlock<FenceGateBlock> ${fgCN} = registerBlock("${fgId}",\n        () -> new FenceGateBlock(WoodType.OAK, BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${sound})${toolFlag}));`,
      constName:fgCN, bspLines:`fenceGateBlock(ModBlocks.${fgCN}.get(), blockTexture(ModBlocks.${CN}.get()));\n        blockItem(ModBlocks.${fgCN});`,
      lootLine:`dropSelf(ModBlocks.${fgCN}.get());`, modelLine:`/* fence gate item via blockItem */`,
      langKey:`block.${MODID}.${fgId}`, langVal:`${dn} Fence Gate`
    });
  }
  if (block.blockShape==="simple" && block.createWall) {
    const wId=`${id}_wall`, wCN=`${CN}_WALL`;
    entries.push({
      line:`public static final DeferredBlock<WallBlock> ${wCN} = registerBlock("${wId}",\n        () -> new WallBlock(BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${sound})${toolFlag}));`,
      constName:wCN, bspLines:`wallBlock(ModBlocks.${wCN}.get(), blockTexture(ModBlocks.${CN}.get()));`,
      lootLine:`dropSelf(ModBlocks.${wCN}.get());`, modelLine:`wallItem(ModBlocks.${wCN}, ModBlocks.${CN});`,
      langKey:`block.${MODID}.${wId}`, langVal:`${dn} Wall`
    });
  }
  if (block.blockShape==="simple" && block.createPressurePlate) {
    const ppId=`${id}_pressure_plate`, ppCN=`${CN}_PRESSURE_PLATE`;
    entries.push({
      line:`public static final DeferredBlock<PressurePlateBlock> ${ppCN} = registerBlock("${ppId}",\n        () -> new PressurePlateBlock(BlockSetType.IRON, BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${sound})${toolFlag}));`,
      constName:ppCN, bspLines:`pressurePlateBlock(ModBlocks.${ppCN}.get(), blockTexture(ModBlocks.${CN}.get()));\n        blockItem(ModBlocks.${ppCN});`,
      lootLine:`dropSelf(ModBlocks.${ppCN}.get());`, modelLine:`/* pressure plate item via blockItem */`,
      langKey:`block.${MODID}.${ppId}`, langVal:`${dn} Pressure Plate`
    });
  }
  if (block.blockShape==="simple" && block.createButton) {
    const btId=`${id}_button`, btCN=`${CN}_BUTTON`;
    entries.push({
      line:`public static final DeferredBlock<ButtonBlock> ${btCN} = registerBlock("${btId}",\n        () -> new ButtonBlock(BlockSetType.IRON, 20, BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${sound}).noCollission()${toolFlag}));`,
      constName:btCN, bspLines:`buttonBlock(ModBlocks.${btCN}.get(), blockTexture(ModBlocks.${CN}.get()));`,
      lootLine:`dropSelf(ModBlocks.${btCN}.get());`, modelLine:`buttonItem(ModBlocks.${btCN}, ModBlocks.${CN});`,
      langKey:`block.${MODID}.${btId}`, langVal:`${dn} Button`
    });
  }

  return entries;
}

// ── Texture Bank ───────────────────────────────────────────────────────────────
function TextureBankTab({textures,setTextures}){
  const [adding,setAdding]=useState(false);
  const empty=()=>({label:"",dataUrl:null,hasShape:false,hasEmissive:false,isAnimated:false,shapeUrl:null,emissiveUrl:null,frames:4,ticksPerFrame:4});
  const [form,setForm]=useState(empty());
  const mainRef=useRef(),shapeRef=useRef(),emissiveRef=useRef();
  const loadFile=(ref,key)=>{const file=ref.current.files[0];if(!file)return;const r=new FileReader();r.onload=e=>setForm(f=>({...f,[key]:e.target.result}));r.readAsDataURL(file);};
  const save=()=>{if(!form.label.trim()||!form.dataUrl)return;const id=form.label.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");setTextures(t=>[...t,{...form,id,savedAt:Date.now()}]);setAdding(false);setForm(empty());};

  if(adding) return(
    <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:20,maxWidth:560}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}><Btn variant="ghost" small onClick={()=>{setAdding(false);setForm(empty());}}>← back</Btn><span style={{fontSize:16,fontWeight:500}}>add texture</span></div>
      <Input label="Label" value={form.label} onChange={v=>setForm(f=>({...f,label:v}))} placeholder="Flame Overlay" />
      <div style={{display:"flex",flexDirection:"column",gap:6}}><span style={{fontSize:11,color:"#888880",textTransform:"uppercase",letterSpacing:1}}>Main texture *</span><div style={{display:"flex",alignItems:"center",gap:12}}><ImagePreview dataUrl={form.dataUrl} size={56} /><input ref={mainRef} type="file" accept="image/png" style={{display:"none"}} onChange={()=>loadFile(mainRef,"dataUrl")} /><Btn variant="ghost" small onClick={()=>mainRef.current.click()}>select PNG</Btn></div></div>
      <div style={{display:"flex",flexDirection:"column",gap:14,padding:"14px 16px",background:"#1a1a1c",borderRadius:6,border:"1px solid #2a2a2e"}}>
        <CheckBox label="Has shape mask?" checked={form.hasShape} onChange={v=>setForm(f=>({...f,hasShape:v}))} />
        {form.hasShape&&<div style={{display:"flex",alignItems:"center",gap:12,paddingLeft:24}}><ImagePreview dataUrl={form.shapeUrl} size={48} /><input ref={shapeRef} type="file" accept="image/png" style={{display:"none"}} onChange={()=>loadFile(shapeRef,"shapeUrl")} /><Btn variant="ghost" small onClick={()=>shapeRef.current.click()}>select shape PNG</Btn></div>}
        <CheckBox label="Has emissive texture?" checked={form.hasEmissive} onChange={v=>setForm(f=>({...f,hasEmissive:v}))} />
        {form.hasEmissive&&<div style={{display:"flex",alignItems:"center",gap:12,paddingLeft:24}}><ImagePreview dataUrl={form.emissiveUrl} size={48} /><input ref={emissiveRef} type="file" accept="image/png" style={{display:"none"}} onChange={()=>loadFile(emissiveRef,"emissiveUrl")} /><Btn variant="ghost" small onClick={()=>emissiveRef.current.click()}>select emissive PNG</Btn></div>}
        <CheckBox label="Is animated (vertical spritesheet — frames stacked top to bottom)?" checked={form.isAnimated} onChange={v=>setForm(f=>({...f,isAnimated:v}))} />
        {form.isAnimated&&<div style={{display:"flex",flexDirection:"column",gap:8,paddingLeft:24}}>
          <div style={{fontSize:11,color:"#888880",lineHeight:1.6}}>Stack frames vertically (e.g. 16×64 PNG = 4 frames of 16×16). Minecraft uses .mcmeta to animate — backend writes it automatically.</div>
          <div style={{display:"flex",gap:16}}><Input label="Frames" type="number" value={form.frames} onChange={v=>setForm(f=>({...f,frames:parseInt(v)||1}))} style={{width:80}} /><Input label="Ticks/frame" type="number" value={form.ticksPerFrame} onChange={v=>setForm(f=>({...f,ticksPerFrame:parseInt(v)||1}))} style={{width:80}} /></div>
        </div>}
      </div>
      <Btn variant="primary" onClick={save} style={{alignSelf:"flex-start"}}>save to bank</Btn>
    </div>
  );

  return(
    <div style={{padding:"20px 24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><div style={{fontSize:16,fontWeight:500}}>Texture Bank</div><div style={{fontSize:12,color:"#888880",marginTop:2}}>{textures.length} stored</div></div>
        <Btn variant="primary" onClick={()=>setAdding(true)}>+ add texture</Btn>
      </div>
      {textures.length===0&&<div style={{textAlign:"center",padding:"60px 0",color:"#555550"}}><div style={{fontSize:14,marginBottom:6}}>No textures yet</div><div style={{fontSize:12}}>Add textures to use in items and blocks</div></div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12}}>
        {textures.map(t=>(
          <div key={t.id} style={{background:"#1a1a1c",border:"1px solid #2a2a2e",borderRadius:8,padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><ImagePreview dataUrl={t.dataUrl} size={52} /><Btn variant="danger" small onClick={()=>setTextures(tx=>tx.filter(x=>x.id!==t.id))} style={{padding:"3px 7px",fontSize:11}}>✕</Btn></div>
            <div><div style={{fontWeight:500,fontSize:13}}>{t.label}</div><div style={{fontSize:11,color:"#888880",fontFamily:"'IBM Plex Mono',monospace",marginTop:2}}>{t.id}</div></div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{t.hasShape&&<Tag color="#2a3a2a">shape</Tag>}{t.hasEmissive&&<Tag color="#3a2a1a">emissive</Tag>}{t.isAnimated&&<Tag color="#1a2a3a">{t.frames}f {t.ticksPerFrame}t/f</Tag>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Item form ──────────────────────────────────────────────────────────────────
function ItemForm({textures,initial,isEdit,onSave,onCancel}){
  const empty=()=>({id:"",constName:"",displayName:"",textureId:"",itemType:"None",toolType:"Sword",tier:"Iron",damage:"3",speed:"-2.4",burnTime:"1600",creativeTab:"",hasTooltip:false,tooltipNormal:"",hasHiddenTooltip:false,useDefaultShiftHint:true,tooltipShiftHint:"",tooltipHidden:""});
  const [form,setForm]=useState(initial?{...empty(),...initial}:empty());
  const [saving,setSaving]=useState(false);
  const [status,setStatus]=useState([]);
  const [preview,setPreview]=useState(null);
  const F=(k,v)=>setForm(f=>({...f,[k]:v}));

  const autoFill=id=>setForm(f=>({...f,constName:f.constName||id.toUpperCase(),displayName:f.displayName||id.split("_").map(w=>w?w[0].toUpperCase()+w.slice(1):"").join(" ")}));

  const save=async()=>{
    if(!form.id.trim()) return;
    setSaving(true); setStatus([]);
    const item={...form,savedAt:Date.now()};
    const code=genItemCode(item,textures);
    const msgs=[];

    if(!isEdit){
      if(code.tex?.dataUrl){
        const j=await api('/texture',{filename:`${form.id}.png`,dataUrl:code.tex.dataUrl,folder:'item'});
        msgs.push({ok:j.ok,label:"texture",msg:j.ok?`written → textures/item/${form.id}.png`:j.reason});
        if(code.tex.isAnimated){
          const jm=await api('/texture/mcmeta',{filename:`${form.id}.png`,frametime:code.tex.ticksPerFrame||4,folder:'item'});
          msgs.push({ok:jm.ok,label:"mcmeta",msg:jm.ok?"animation mcmeta written":jm.reason});
        }
      }
      const j2=await api('/items/register',{line:code.reg,constName:form.constName||form.id.toUpperCase()});
      msgs.push({ok:j2.ok,label:"ModItems.java",msg:j2.ok?"registration added":j2.reason});
      const j3=await api('/lang/set',{key:code.langKey,value:code.langVal});
      msgs.push({ok:j3.ok,label:"en_us.json",msg:j3.ok?`"${code.langKey}" added`:j3.reason});
      const j4=await api('/items/model',{line:code.modelLine});
      msgs.push({ok:j4.ok,label:"ModItemModelProvider.java",msg:j4.ok?"model line added":j4.reason});
      // Tooltips
      for(const tk of genTooltipLangKeys(form.id,form)){
        const jt=await api('/lang/set',{key:tk.key,value:tk.value});
        msgs.push({ok:jt.ok,label:`lang:${tk.key}`,msg:jt.ok?"added":jt.reason});
      }
    } else {
      // Full update — replace registration line, update lang, handle tab change
      const j=await api('/items/update',{oldConstName:initial.constName||initial.id?.toUpperCase(),oldId:initial.id,newLine:code.reg,newConstName:form.constName,newId:form.id,langKey:code.langKey,langVal:code.langVal});
      msgs.push({ok:j.ok,label:"ModItems.java + lang",msg:j.ok?"updated":j.reason});
      // Remove from old creative tab if tab changed (use initial constName, works for both mod and vanilla tabs)
      if (initial.creativeTab && initial.creativeTab !== form.creativeTab) {
        const oldRef = `ModItems.${initial.constName||initial.id?.toUpperCase()}`;
        const jrm = await api('/creativetab/remove', {ref:oldRef});
        msgs.push({ok:jrm.ok||true, label:"CreativeTab (remove old)", msg:jrm.ok?"removed from old tab":jrm.reason||"not found"});
      }
      if(code.tex?.dataUrl){
        const jt=await api('/texture',{filename:`${form.id}.png`,dataUrl:code.tex.dataUrl,folder:'item'});
        msgs.push({ok:jt.ok,label:"texture",msg:jt.ok?"replaced":jt.reason});
      }
      for(const tk of genTooltipLangKeys(form.id,form)){
        const jt=await api('/lang/set',{key:tk.key,value:tk.value,update:true});
        msgs.push({ok:jt.ok,label:`lang:${tk.key}`,msg:jt.ok?"updated":jt.reason});
      }
    }

    if(form.creativeTab){
      const jt=await api('/creativetab',{ref:`ModItems.${form.constName||form.id.toUpperCase()}`,tabConst:form.creativeTab});
      msgs.push({ok:jt.ok,label:"CreativeTab",msg:jt.ok?(jt.skipped?jt.reason:"added to tab"):jt.reason});
    }

    setStatus(msgs); setSaving(false); onSave(item);
  };

  const texOpts=[{value:"",label:"(none)"},...textures.map(t=>({value:t.id,label:t.label+(t.isAnimated?` [${t.frames}f]`:"")}))];
  const selTex=textures.find(t=>t.id===form.textureId);

  return(
    <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:18,maxWidth:600}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}><Btn variant="ghost" small onClick={onCancel}>← back</Btn><span style={{fontSize:16,fontWeight:500}}>{isEdit?"edit item":"new item"}</span>{isEdit&&<Tag color="#2a2a3a">editing</Tag>}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Input label="Item ID" value={form.id} mono onChange={v=>{F("id",v);if(!isEdit)autoFill(v);}} placeholder="mother_flame" />
        <Input label="Const name" value={form.constName||form.id.toUpperCase()} mono onChange={v=>F("constName",v)} placeholder="MOTHER_FLAME" />
      </div>
      <Input label="Display name" value={form.displayName} onChange={v=>F("displayName",v)} placeholder="Mother Flame" />
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        <span style={{fontSize:11,color:"#888880",textTransform:"uppercase",letterSpacing:1}}>Texture</span>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <ImagePreview dataUrl={selTex?.dataUrl} size={52} />
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <Select value={form.textureId} onChange={v=>F("textureId",v)} options={texOpts} />
            {selTex?.isAnimated&&<span style={{fontSize:11,color:"#d4a843"}}>⚡ animated — mcmeta written automatically</span>}
          </div>
        </div>
      </div>
      <Select label="Creative tab" value={form.creativeTab} onChange={v=>F("creativeTab",v)} options={CREATIVE_TABS} />
      <Select label="Item type" value={form.itemType} onChange={v=>F("itemType",v)} options={["None","Tool","Food","Fuel"]} />
      {form.itemType==="Tool"&&<div style={{background:"#1a1a1c",border:"1px solid #2a2a2e",borderRadius:6,padding:"14px 16px",display:"flex",flexDirection:"column",gap:14}}>
        <Select label="Tool type" value={form.toolType} onChange={v=>F("toolType",v)} options={TOOL_TYPES} />
        <Select label="Tier" value={form.tier} onChange={v=>F("tier",v)} options={TIERS} />
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Input label="Damage bonus" type="number" value={form.damage} onChange={v=>F("damage",v)} />
          <Input label="Attack speed" type="number" value={form.speed} onChange={v=>F("speed",v)} />
        </div>
      </div>}
      {form.itemType==="Fuel"&&<Input label="Burn time ticks (200 = 1 coal)" type="number" value={form.burnTime} onChange={v=>F("burnTime",v)} />}
      <TooltipSection form={form} F={F} />
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <Btn variant="primary" onClick={save} disabled={saving||!form.id.trim()}>{saving?"saving...":isEdit?"save changes":"save & write to mod"}</Btn>
        <Btn variant="ghost" onClick={()=>setPreview(genItemCode(form,textures))}>preview code</Btn>
      </div>
      <StatusBar messages={status} />
      {preview&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,fontWeight:500,color:"#d4a843"}}>Generated code</span><Btn variant="ghost" small onClick={()=>setPreview(null)}>hide</Btn></div>
        <CodeBlock title="ModItems.java" code={preview.reg} />
        <CodeBlock title="en_us.json" code={`  "${preview.langKey}": "${preview.langVal}",`} />
        <CodeBlock title="ModItemModelProvider.java" code={`        ${preview.modelLine}`} />
      </div>}
    </div>
  );
}

// ── Item Creator tab ───────────────────────────────────────────────────────────
function ItemCreatorTab({textures,items,setItems}){
  const [view,setView]=useState("list");
  const [editTarget,setEditTarget]=useState(null);
  const [editIdx,setEditIdx]=useState(null);
  const [modItems,setModItems]=useState([]);
  const [loading,setLoading]=useState(false);
  const [preview,setPreview]=useState(null);
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [delStatus,setDelStatus]=useState([]);

  const load=()=>{
    setLoading(true);
    fetch(`${BASE}/items/read`)
      .then(r=>r.json())
      .then(j=>{ if(j.ok) setModItems(j.items||[]); else setModItems([]); })
      .catch(()=>setModItems([]))
      .finally(()=>setLoading(false));
  };
  useEffect(load,[]);

  const allItems=(()=>{const map=new Map();modItems.forEach(x=>map.set(x.id,{...x,source:"mod"}));items.forEach(x=>map.set(x.id,{...x,source:"local"}));return[...map.values()];})();

  const handleSave=item=>{if(editIdx!==null)setItems(arr=>arr.map((x,i)=>i===editIdx?item:x));else setItems(arr=>[...arr,item]);load();setView("list");setEditTarget(null);setEditIdx(null);};
  const startEdit=(item,idx)=>{setEditTarget(item);setEditIdx(typeof idx==="number"?idx:null);setView("edit");};
  const handleDelete=async item=>{
    setConfirmDelete(null); const msgs=[];
    const CN=item.constName||item.id.toUpperCase();
    const j=await api('/items/delete',{id:item.id,constName:CN});
    msgs.push({ok:j.ok,label:"mod files",msg:j.ok?"removed from all files":j.reason});
    const jt=await api('/texture/delete',{filename:`${item.id}.png`,folder:'item'});
    msgs.push({ok:true,label:"texture",msg:jt.ok?"deleted":"not found (ok)"});
    setItems(arr=>arr.filter(x=>x.id!==item.id)); setDelStatus(msgs); load();
  };

  if(view==="new") return <ItemForm textures={textures} isEdit={false} onSave={handleSave} onCancel={()=>setView("list")} />;
  if(view==="edit") return <ItemForm textures={textures} initial={editTarget} isEdit={true} onSave={handleSave} onCancel={()=>{setView("list");setEditTarget(null);setEditIdx(null);}} />;

  return(
    <div style={{padding:"20px 24px"}}>
      {confirmDelete&&<ConfirmModal message={`Delete "${confirmDelete.displayName||confirmDelete.id}"? Removes from ModItems.java, en_us.json, model provider, creative tab, and deletes the texture file.`} onConfirm={()=>handleDelete(confirmDelete)} onCancel={()=>setConfirmDelete(null)} />}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><div style={{fontSize:16,fontWeight:500}}>Item Creator</div><div style={{fontSize:12,color:"#888880",marginTop:2}}>{loading?"loading...":`${allItems.length} items`}</div></div>
        <div style={{display:"flex",gap:8}}><Btn variant="ghost" small onClick={load}>↻ refresh</Btn><Btn variant="primary" onClick={()=>setView("new")}>+ new item</Btn></div>
      </div>
      <StatusBar messages={delStatus} />
      {preview&&<div style={{marginBottom:20,display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,fontWeight:500,color:"#d4a843"}}>Code preview</span><Btn variant="ghost" small onClick={()=>setPreview(null)}>✕</Btn></div>
        <CodeBlock title="ModItems.java" code={preview.reg} />
        <CodeBlock title="en_us.json" code={`  "${preview.langKey}": "${preview.langVal}",`} />
        <CodeBlock title="ModItemModelProvider.java" code={`        ${preview.modelLine}`} />
      </div>}
      {allItems.length===0&&!loading&&<div style={{textAlign:"center",padding:"60px 0",color:"#555550"}}><div style={{fontSize:14}}>No items yet</div></div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {allItems.map((item,i)=>{
          const tex=textures.find(t=>t.id===item.textureId);
          const localIdx=items.findIndex(x=>x.id===item.id);
          return(
            <div key={item.id} style={{background:"#1a1a1c",border:"1px solid #2a2a2e",borderRadius:8,padding:"12px 16px",display:"flex",alignItems:"center",gap:16}}>
              <ImagePreview dataUrl={tex?.dataUrl} size={44} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontWeight:500}}>{item.displayName||item.id}</span>
                  <Tag color="#2a2a3a">{item.itemType!=="None"?item.itemType:"item"}</Tag>
                  {item.itemType==="Tool"&&<Tag color="#3a2a1a">{item.toolType} · {item.tier}</Tag>}
                  {item.source==="mod"&&<Tag color="#1a2a3a">in mod</Tag>}
                  {item.hasTexture&&<Tag color="#2a3a1a">texture ✓</Tag>}
                </div>
                <div style={{fontSize:11,color:"#888880",fontFamily:"'IBM Plex Mono',monospace",marginTop:3}}>{MODID}:{item.id}</div>
              </div>
              <div style={{display:"flex",gap:8,flexShrink:0}}>
                <Btn variant="ghost" small onClick={()=>setPreview(genItemCode(item,textures))}>code</Btn>
                <Btn variant="ghost" small onClick={()=>startEdit(item,localIdx>=0?localIdx:null)}>edit</Btn>
                <Btn variant="danger" small onClick={()=>setConfirmDelete(item)}>delete</Btn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Block form ─────────────────────────────────────────────────────────────────
function BlockForm({textures,initial,isEdit,onSave,onCancel}){
  const empty=()=>({id:"",constName:"",customConstName:false,displayName:"",textureId:"",textureTopId:"",textureItemId:"",textureSideId:"",textureFrontId:"",textureBottomId:"",blockShape:"simple",strength:"2.0",soundType:"WOOD",requiresTool:false,creativeTab:"",parentBlock:"",createSlab:false,createStairs:false,createFence:false,createFenceGate:false,createWall:false,createPressurePlate:false,createButton:false,hasTooltip:false,tooltipNormal:"",hasHiddenTooltip:false,useDefaultShiftHint:true,tooltipShiftHint:"",tooltipHidden:""});
  const [form,setForm]=useState(initial?{...empty(),...initial}:empty());
  const [saving,setSaving]=useState(false);
  const [status,setStatus]=useState([]);
  const [preview,setPreview]=useState(null);
  const F=(k,v)=>setForm(f=>({...f,[k]:v}));
  const autoFill=id=>setForm(f=>({...f,
    constName: f.customConstName ? f.constName : id.toUpperCase(),
    displayName: f.displayName||id.split("_").map(w=>w?w[0].toUpperCase()+w.slice(1):"").join(" ")
  }));
  const texOpts=[{value:"",label:"(none)"},...textures.map(t=>({value:t.id,label:t.label}))];
  const selTex=textures.find(t=>t.id===form.textureId);
  const needsTopTex=["pillar","directional"].includes(form.blockShape);
  const needsSideTex=["directional"].includes(form.blockShape);
  const needsFrontTex=["directional"].includes(form.blockShape);
  const needsDoorTex=form.blockShape==="door";
  const isChildBlock=["slab","stairs","fence","fence_gate","wall","pressure_plate","button"].includes(form.blockShape);

  const save=async()=>{
    if(!form.id.trim()) return;
    setSaving(true); setStatus([]);
    const block={...form,savedAt:Date.now()};
    const entries=genBlockEntries(block);
    const msgs=[];

    if(!isEdit){
      // Write textures
      if(selTex?.dataUrl){
        const j=await api('/texture',{filename:`${form.id}.png`,dataUrl:selTex.dataUrl,folder:'block'});
        msgs.push({ok:j.ok,label:"texture (main)",msg:j.ok?"written":j.reason});
      }
      if(needsDoorTex){
        const topTex=textures.find(t=>t.id===form.textureTopId);
        const itemTex=textures.find(t=>t.id===form.textureItemId);
        if(topTex?.dataUrl){ const j=await api('/texture',{filename:`${form.id}_top.png`,dataUrl:topTex.dataUrl,folder:'block'}); msgs.push({ok:j.ok,label:"texture (door top)",msg:j.ok?"written":j.reason}); }
        if(itemTex?.dataUrl){ const j=await api('/texture',{filename:`${form.id}.png`,dataUrl:itemTex.dataUrl,folder:'item'}); msgs.push({ok:j.ok,label:"texture (door item)",msg:j.ok?"written":j.reason}); }
        if(selTex?.dataUrl){ const j=await api('/texture',{filename:`${form.id}_bottom.png`,dataUrl:selTex.dataUrl,folder:'block'}); msgs.push({ok:j.ok,label:"texture (door bottom)",msg:j.ok?"written":j.reason}); }
      }
      // Register all entries (base + slab/stairs if checked)
      const j2=await api('/blocks/register',{entries});
      msgs.push({ok:j2.ok,label:"ModBlocks.java + datagen",msg:j2.ok?`${entries.length} block(s) registered`:j2.reason});
    } else {
      const code=entries[0]; // edit only touches base block
      const j=await api('/blocks/update',{oldConstName:initial.constName||initial.id?.toUpperCase(),oldId:initial.id,newLine:code.line,newConstName:form.constName,newId:form.id,langKey:code.langKey,langVal:code.langVal});
      msgs.push({ok:j.ok,label:"ModBlocks.java + lang",msg:j.ok?"updated":j.reason});
      if(selTex?.dataUrl){ const jt=await api('/texture',{filename:`${form.id}.png`,dataUrl:selTex.dataUrl,folder:'block'}); msgs.push({ok:jt.ok,label:"texture",msg:jt.ok?"replaced":jt.reason}); }
    }

    if(form.creativeTab){
      const jt=await api('/creativetab',{ref:`ModBlocks.${form.constName||form.id.toUpperCase()}`,tabConst:form.creativeTab});
      msgs.push({ok:jt.ok,label:"CreativeTab",msg:jt.ok?(jt.skipped?jt.reason:"added to tab"):jt.reason});
    }

    if(form.hasTooltip){
      for(const tk of genTooltipLangKeys(form.id,form)){
        const jt=await api('/lang/set',{key:tk.key,value:tk.value,update:isEdit});
        msgs.push({ok:jt.ok,label:`lang:${tk.key}`,msg:jt.ok?"ok":jt.reason});
      }
    }

    setStatus(msgs); setSaving(false); onSave(block);
  };

  return(
    <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:18,maxWidth:640}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}><Btn variant="ghost" small onClick={onCancel}>← back</Btn><span style={{fontSize:16,fontWeight:500}}>{isEdit?"edit block":"new block"}</span>{isEdit&&<Tag color="#2a2a3a">editing</Tag>}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Input label="Block ID" value={form.id} mono onChange={v=>{F("id",v);if(!isEdit)autoFill(v);}} placeholder="obsidian_bricks" />
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:11,color:"#888880",textTransform:"uppercase",letterSpacing:1}}>Const name</span>
            <CheckBox label="custom" checked={!!form.customConstName} onChange={v=>F("customConstName",v)} />
          </div>
          <input value={form.customConstName?form.constName:form.id.toUpperCase()} onChange={e=>F("constName",e.target.value)} disabled={!form.customConstName} placeholder="OBSIDIAN_BRICKS"
            style={{background:"#1a1a1c",border:"1px solid #2a2a2e",borderRadius:4,padding:"7px 10px",color:form.customConstName?"#e8e8e0":"#555550",fontSize:13,fontFamily:"'IBM Plex Mono',monospace",outline:"none",opacity:form.customConstName?1:0.6}} />
        </div>
      </div>
      <Input label="Display name" value={form.displayName} onChange={v=>F("displayName",v)} placeholder="Obsidian Bricks" />

      <Select label="Block shape" value={form.blockShape} onChange={v=>F("blockShape",v)} options={BLOCK_SHAPES} />

      {isChildBlock&&<Input label="Parent block ID (e.g. crate_block)" value={form.parentBlock} mono onChange={v=>F("parentBlock",v)} placeholder="crate_block" />}

      {/* Texture slots */}
      <div style={{display:"flex",flexDirection:"column",gap:10,padding:"14px 16px",background:"#1a1a1c",border:"1px solid #2a2a2e",borderRadius:6}}>
        <span style={{fontSize:12,color:"#d4a843",fontWeight:500}}>Textures</span>
        {form.blockShape==="door"?<>
          <div style={{display:"flex",gap:16,alignItems:"center"}}>
            <div><div style={{fontSize:11,color:"#888880",marginBottom:4}}>Door bottom / front face</div><div style={{display:"flex",alignItems:"center",gap:10}}><ImagePreview dataUrl={selTex?.dataUrl} size={40} /><Select value={form.textureId} onChange={v=>F("textureId",v)} options={texOpts} /></div></div>
          </div>
          <div style={{display:"flex",gap:16,alignItems:"center"}}>
            <div><div style={{fontSize:11,color:"#888880",marginBottom:4}}>Door top</div><div style={{display:"flex",alignItems:"center",gap:10}}><ImagePreview dataUrl={textures.find(t=>t.id===form.textureTopId)?.dataUrl} size={40} /><Select value={form.textureTopId} onChange={v=>F("textureTopId",v)} options={texOpts} /></div></div>
          </div>
          <div style={{display:"flex",gap:16,alignItems:"center"}}>
            <div><div style={{fontSize:11,color:"#888880",marginBottom:4}}>Item texture</div><div style={{display:"flex",alignItems:"center",gap:10}}><ImagePreview dataUrl={textures.find(t=>t.id===form.textureItemId)?.dataUrl} size={40} /><Select value={form.textureItemId} onChange={v=>F("textureItemId",v)} options={texOpts} /></div></div>
          </div>
        </>:needsSideTex?<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><div style={{fontSize:11,color:"#888880",marginBottom:4}}>Side / default</div><div style={{display:"flex",alignItems:"center",gap:8}}><ImagePreview dataUrl={selTex?.dataUrl} size={36} /><Select value={form.textureId} onChange={v=>F("textureId",v)} options={texOpts} /></div></div>
            <div><div style={{fontSize:11,color:"#888880",marginBottom:4}}>Top / bottom</div><div style={{display:"flex",alignItems:"center",gap:8}}><ImagePreview dataUrl={textures.find(t=>t.id===form.textureTopId)?.dataUrl} size={36} /><Select value={form.textureTopId} onChange={v=>F("textureTopId",v)} options={texOpts} /></div></div>
            <div><div style={{fontSize:11,color:"#888880",marginBottom:4}}>Front face</div><div style={{display:"flex",alignItems:"center",gap:8}}><ImagePreview dataUrl={textures.find(t=>t.id===form.textureFrontId)?.dataUrl} size={36} /><Select value={form.textureFrontId} onChange={v=>F("textureFrontId",v)} options={texOpts} /></div></div>
          </div>
        </>:needsTopTex?<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><div style={{fontSize:11,color:"#888880",marginBottom:4}}>Side</div><div style={{display:"flex",alignItems:"center",gap:8}}><ImagePreview dataUrl={selTex?.dataUrl} size={36} /><Select value={form.textureId} onChange={v=>F("textureId",v)} options={texOpts} /></div></div>
            <div><div style={{fontSize:11,color:"#888880",marginBottom:4}}>Top / bottom</div><div style={{display:"flex",alignItems:"center",gap:8}}><ImagePreview dataUrl={textures.find(t=>t.id===form.textureTopId)?.dataUrl} size={36} /><Select value={form.textureTopId} onChange={v=>F("textureTopId",v)} options={texOpts} /></div></div>
          </div>
        </>:<div style={{display:"flex",alignItems:"center",gap:12}}>
          <ImagePreview dataUrl={selTex?.dataUrl} size={48} />
          <Select value={form.textureId} onChange={v=>F("textureId",v)} options={texOpts} />
        </div>}
      </div>

      <Select label="Creative tab" value={form.creativeTab} onChange={v=>F("creativeTab",v)} options={CREATIVE_TABS} />
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Input label="Hardness / blast resistance" type="number" value={form.strength} onChange={v=>F("strength",v)} />
        <Select label="Sound type" value={form.soundType} onChange={v=>F("soundType",v)} options={SOUND_TYPES} />
      </div>
      <CheckBox label="Requires correct tool for drops?" checked={form.requiresTool} onChange={v=>F("requiresTool",v)} />

      {form.blockShape==="simple"&&<div style={{display:"flex",flexDirection:"column",gap:8,padding:"12px 16px",background:"#1a1a1c",border:"1px solid #2a2a2e",borderRadius:6}}>
        <span style={{fontSize:12,color:"#d4a843",fontWeight:500}}>Also create variants from this block</span>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <CheckBox label="Slab" checked={form.createSlab} onChange={v=>F("createSlab",v)} />
          <CheckBox label="Stairs" checked={form.createStairs} onChange={v=>F("createStairs",v)} />
          <CheckBox label="Fence" checked={form.createFence} onChange={v=>F("createFence",v)} />
          <CheckBox label="Fence Gate" checked={form.createFenceGate} onChange={v=>F("createFenceGate",v)} />
          <CheckBox label="Wall" checked={form.createWall} onChange={v=>F("createWall",v)} />
          <CheckBox label="Pressure Plate" checked={form.createPressurePlate} onChange={v=>F("createPressurePlate",v)} />
          <CheckBox label="Button" checked={form.createButton} onChange={v=>F("createButton",v)} />
        </div>
      </div>}

      <TooltipSection form={form} F={F} />

      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <Btn variant="primary" onClick={save} disabled={saving||!form.id.trim()}>{saving?"saving...":isEdit?"save changes":"save & write to mod"}</Btn>
        <Btn variant="ghost" onClick={()=>setPreview(genBlockEntries(form))}>preview code</Btn>
      </div>
      <StatusBar messages={status} />
      {preview&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,fontWeight:500,color:"#d4a843"}}>Generated code ({preview.length} block{preview.length!==1?"s":""})</span><Btn variant="ghost" small onClick={()=>setPreview(null)}>hide</Btn></div>
        {preview.map((e,i)=><CodeBlock key={i} title={`ModBlocks.java — ${e.constName}`} code={e.line} />)}
      </div>}
    </div>
  );
}

// ── Block Creator tab ──────────────────────────────────────────────────────────
function BlockCreatorTab({textures,blocks,setBlocks}){
  const [view,setView]=useState("list");
  const [editTarget,setEditTarget]=useState(null);
  const [editIdx,setEditIdx]=useState(null);
  const [modBlocks,setModBlocks]=useState([]);
  const [loading,setLoading]=useState(false);
  const [preview,setPreview]=useState(null);
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [delStatus,setDelStatus]=useState([]);

  const load=()=>{
    setLoading(true);
    fetch(`${BASE}/blocks/read`)
      .then(r=>r.json())
      .then(j=>{ if(j.ok) setModBlocks(j.blocks||[]); else setModBlocks([]); })
      .catch(()=>setModBlocks([]))
      .finally(()=>setLoading(false));
  };
  useEffect(load,[]);

  const allBlocks=(()=>{const map=new Map();modBlocks.forEach(x=>map.set(x.id,{...x,source:"mod"}));blocks.forEach(x=>map.set(x.id,{...x,source:"local"}));return[...map.values()];})();

  const handleSave=block=>{if(editIdx!==null)setBlocks(arr=>arr.map((x,i)=>i===editIdx?block:x));else setBlocks(arr=>[...arr,block]);load();setView("list");setEditTarget(null);setEditIdx(null);};
  const startEdit=(block,idx)=>{setEditTarget(block);setEditIdx(typeof idx==="number"?idx:null);setView("edit");};
  const handleDelete=async block=>{
    setConfirmDelete(null); const msgs=[];
    const CN=block.constName||block.id.toUpperCase();
    const j=await api('/blocks/delete',{id:block.id,constName:CN});
    msgs.push({ok:j.ok,label:"mod files",msg:j.ok?"removed":j.reason});
    const jt=await api('/texture/delete',{filename:`${block.id}.png`,folder:'block'});
    msgs.push({ok:true,label:"texture",msg:jt.ok?"deleted":"not found (ok)"});
    setBlocks(arr=>arr.filter(x=>x.id!==block.id)); setDelStatus(msgs); load();
  };

  if(view==="new") return <BlockForm textures={textures} isEdit={false} onSave={handleSave} onCancel={()=>setView("list")} />;
  if(view==="edit") return <BlockForm textures={textures} initial={editTarget} isEdit={true} onSave={handleSave} onCancel={()=>{setView("list");setEditTarget(null);setEditIdx(null);}} />;

  return(
    <div style={{padding:"20px 24px"}}>
      {confirmDelete&&<ConfirmModal message={`Delete block "${confirmDelete.displayName||confirmDelete.id}"? Removes from ModBlocks.java, blockstate, loot table, model provider, creative tab, and deletes the texture.`} onConfirm={()=>handleDelete(confirmDelete)} onCancel={()=>setConfirmDelete(null)} />}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><div style={{fontSize:16,fontWeight:500}}>Block Creator</div><div style={{fontSize:12,color:"#888880",marginTop:2}}>{loading?"loading...":`${allBlocks.length} blocks`}</div></div>
        <div style={{display:"flex",gap:8}}><Btn variant="ghost" small onClick={load}>↻ refresh</Btn><Btn variant="primary" onClick={()=>setView("new")}>+ new block</Btn></div>
      </div>
      <StatusBar messages={delStatus} />
      {allBlocks.length===0&&!loading&&<div style={{textAlign:"center",padding:"60px 0",color:"#555550"}}><div style={{fontSize:14}}>No blocks yet</div></div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {allBlocks.map((block,i)=>{
          const tex=textures.find(t=>t.id===block.textureId);
          const localIdx=blocks.findIndex(x=>x.id===block.id);
          return(
            <div key={block.id} style={{background:"#1a1a1c",border:"1px solid #2a2a2e",borderRadius:8,padding:"12px 16px",display:"flex",alignItems:"center",gap:16}}>
              <ImagePreview dataUrl={tex?.dataUrl} size={44} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontWeight:500}}>{block.displayName||block.id}</span>
                  <Tag color="#1a2a3a">{block.blockShape||block.blockType||"simple"}</Tag>
                  {block.source==="mod"&&<Tag color="#2a1a3a">in mod</Tag>}
                  {block.hasTexture&&<Tag color="#2a3a1a">texture ✓</Tag>}
                </div>
                <div style={{fontSize:11,color:"#888880",fontFamily:"'IBM Plex Mono',monospace",marginTop:3}}>{MODID}:{block.id}</div>
              </div>
              <div style={{display:"flex",gap:8,flexShrink:0}}>
                <Btn variant="ghost" small onClick={()=>setPreview(genBlockEntries(block))}>code</Btn>
                <Btn variant="ghost" small onClick={()=>startEdit(block,localIdx>=0?localIdx:null)}>edit</Btn>
                <Btn variant="danger" small onClick={()=>setConfirmDelete(block)}>delete</Btn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Run panel ──────────────────────────────────────────────────────────────────
function RunPanel(){
  const [state,setState]=useState({dirty:false,state:'idle',log:[]});
  const [running,setRunning]=useState(false);
  const [showLog,setShowLog]=useState(false);
  const pollRef=useRef();

  useEffect(()=>{
    const poll=()=>fetch(`${BASE}/run/state`).then(r=>r.json()).then(j=>setState(j)).catch(()=>{});
    poll();
    pollRef.current=setInterval(poll,1500);
    return()=>clearInterval(pollRef.current);
  },[]);

  const run=async endpoint=>{
    setRunning(true); setShowLog(true);
    await api(endpoint,{});
    setRunning(false);
  };

  const isRunning=state.state!=='idle';
  const hasError=state.state==='error';

  return(
    <div style={{borderTop:"1px solid #1e1e20",background:"#141416",padding:"10px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:12,color:"#888880"}}>Gradle:</span>
        {state.dirty&&<Tag color="#3a2a0a">⚡ datagen changes pending</Tag>}
        {hasError&&<Tag color="#3a1a1a">✗ last run failed</Tag>}
        {!state.dirty&&!hasError&&state.state==='idle'&&<Tag color="#1a3a1a">✓ up to date</Tag>}
        {isRunning&&<Tag color="#1a2a3a">⟳ {state.state}...</Tag>}
        <div style={{display:"flex",gap:8,marginLeft:"auto"}}>
          <Btn variant="ghost" small disabled={isRunning||running} onClick={()=>run('/run/data')}>runData</Btn>
          <Btn variant={state.dirty?"warn":"primary"} small disabled={isRunning||running} onClick={()=>run('/run/client')}>
            {state.dirty?"runData → runClient":"runClient"}
          </Btn>
          <Btn variant="ghost" small onClick={()=>setShowLog(v=>!v)}>{showLog?"hide log":"show log"}</Btn>
        </div>
      </div>
      {showLog&&state.log.length>0&&<div style={{marginTop:8,background:"#0e0e10",border:"1px solid #2a2a2e",borderRadius:4,padding:"8px 10px",maxHeight:160,overflowY:"auto",fontSize:11,fontFamily:"'IBM Plex Mono',monospace",color:"#888880",lineHeight:1.6}}>
        {state.log.slice(-40).map((l,i)=><div key={i} style={{color:l.includes('[err]')?"#cc8888":l.includes('BUILD SUCCESSFUL')?"#88cc88":"#888880"}}>{l}</div>)}
      </div>}
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("textures");
  const [textures,setTextures]=useLocalStorage("ycs_textures",[]);
  const [items,setItems]=useLocalStorage("ycs_items",[]);
  const [blocks,setBlocks]=useLocalStorage("ycs_blocks",[]);
  const [backendOk,setBackendOk]=useState(null);

  useEffect(()=>{ fetch(`${BASE}/health`).then(r=>r.json()).then(()=>setBackendOk(true)).catch(()=>setBackendOk(false)); },[]);

  const tabs=[{id:"textures",label:"Texture Bank"},{id:"items",label:"Item Creator"},{id:"blocks",label:"Block Creator"}];

  return(
    <>
      <style>{FONTS}{css}</style>
      <div style={{minHeight:"100vh",background:"#0e0e10",display:"flex",flexDirection:"column"}}>
        <div style={{background:"#141416",borderBottom:"1px solid #1e1e20",padding:"10px 24px",display:"flex",alignItems:"center",gap:24}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:22,height:22,background:"#d4a843",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#0e0e10"}}>Y</div>
            <span style={{fontWeight:500,fontSize:14,letterSpacing:0.5}}>yebisu Content Studio</span>
            <Tag color="#2a2a2e">v0.3</Tag>
          </div>
          <div style={{display:"flex",gap:2}}>
            {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?"#1e1e22":"transparent",border:"none",borderRadius:4,padding:"5px 14px",color:tab===t.id?"#e8e8e0":"#888880",fontSize:13,fontFamily:"'IBM Plex Sans',sans-serif",cursor:"pointer",fontWeight:tab===t.id?500:400,borderBottom:tab===t.id?"2px solid #d4a843":"2px solid transparent"}}>{t.label}</button>)}
          </div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
            {backendOk===false&&<span style={{fontSize:11,color:"#cc8888",fontFamily:"'IBM Plex Mono',monospace"}}>⚠ backend offline</span>}
            {backendOk===true&&<span style={{fontSize:11,color:"#88cc88",fontFamily:"'IBM Plex Mono',monospace"}}>● connected</span>}
            <span style={{fontSize:11,color:"#555550",fontFamily:"'IBM Plex Mono',monospace"}}>{MODID} · NeoForge 21.1.228</span>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {tab==="textures"&&<TextureBankTab textures={textures} setTextures={setTextures} />}
          {tab==="items"&&<ItemCreatorTab textures={textures} items={items} setItems={setItems} />}
          {tab==="blocks"&&<BlockCreatorTab textures={textures} blocks={blocks} setBlocks={setBlocks} />}
        </div>
        {backendOk===true&&<RunPanel />}
      </div>
    </>
  );
}


