export const MODID="yebisurpg", BASE="http://localhost:3001/api";
export const TAB_W=116,TAB_H=28;
export const TIERS=["Wood","Stone","Iron","Diamond","Netherite","YE6ISU"];
export const TIER_MAP={Wood:"Tiers.WOOD",Stone:"Tiers.STONE",Iron:"Tiers.IRON",Diamond:"Tiers.DIAMOND",Netherite:"Tiers.NETHERITE",YE6ISU:"ModToolTiers.YE6ISU"};
export const TOOL_TYPES=["Sword","Pickaxe","Axe","Shovel","Hoe"];
export const SOUND_TYPES=["STONE","WOOD","METAL","GRASS","SAND","GRAVEL","GLASS","CLOTH","SNOW","LANTERN","CHAIN","COPPER","DEEPSLATE","TUFF","CALCITE"];
export const BUILTIN_CREATIVE_TABS=[{value:"",label:"(none)",vanilla:false},{value:"vanilla:combat",label:"Combat",vanilla:true},{value:"vanilla:tools_and_utilities",label:"Tools & Utilities",vanilla:true},{value:"vanilla:food_and_drinks",label:"Food & Drinks",vanilla:true},{value:"vanilla:ingredients",label:"Ingredients",vanilla:true},{value:"vanilla:building_blocks",label:"Building Blocks",vanilla:true},{value:"vanilla:redstone",label:"Redstone",vanilla:true},{value:"vanilla:natural_blocks",label:"Natural Blocks",vanilla:true}];
export const COMMON_TAGS=[
  "minecraft:axes","minecraft:hoes","minecraft:pickaxes","minecraft:shovels","minecraft:swords","minecraft:tools",
  "minecraft:trim_templates","minecraft:trim_materials","minecraft:foot_armor","minecraft:leg_armor","minecraft:chest_armor","minecraft:head_armor","minecraft:armor_enchantable",
  "minecraft:logs","minecraft:logs_that_burn","minecraft:planks","minecraft:slabs","minecraft:stairs","minecraft:fences","minecraft:fence_gates","minecraft:doors","minecraft:trapdoors","minecraft:walls","minecraft:buttons","minecraft:pressure_plates","minecraft:wooden_buttons","minecraft:wooden_pressure_plates","minecraft:wooden_doors","minecraft:wooden_trapdoors","minecraft:wooden_fences","minecraft:wooden_stairs","minecraft:wooden_slabs","minecraft:saplings","minecraft:leaves","minecraft:wool","minecraft:wool_carpets","minecraft:beds","minecraft:banners","minecraft:candles","minecraft:rails","minecraft:boats","minecraft:chest_boats",
  "minecraft:flowers","minecraft:small_flowers","minecraft:tall_flowers","minecraft:crops","minecraft:saplings","minecraft:dirt","minecraft:sand","minecraft:stone_bricks","minecraft:terracotta","minecraft:climbable","minecraft:fishes","minecraft:bee_food","minecraft:flower_pots",
  "minecraft:coals","minecraft:diamonds","minecraft:emeralds","minecraft:gold_ores","minecraft:iron_ores","minecraft:diamond_ores","minecraft:emerald_ores","minecraft:lapis_ores","minecraft:redstone_ores","minecraft:copper_ores","minecraft:coal_ores",
  "minecraft:mineable/pickaxe","minecraft:mineable/axe","minecraft:mineable/shovel","minecraft:mineable/hoe","minecraft:needs_wooden_tool","minecraft:needs_stone_tool","minecraft:needs_iron_tool","minecraft:needs_diamond_tool","minecraft:needs_netherite_tool",
  "minecraft:durability_enchantable","minecraft:enchantable/sword","minecraft:enchantable/bow","minecraft:enchantable/armor","minecraft:enchantable/mining","minecraft:enchantable/mining_loot","minecraft:enchantable/fishing_trident_durability","minecraft:enchantable/fire_aspect",
  "neoforge:foods","neoforge:tools","neoforge:tools/swords","neoforge:tools/pickaxes","neoforge:tools/axes","neoforge:tools/shovels","neoforge:tools/hoes","neoforge:tools/shears","neoforge:tools/bows","neoforge:tools/crossbows","neoforge:tools/fishing_rods","neoforge:tools/shields","neoforge:tools/tridents",
  "neoforge:armors","neoforge:armors/helmets","neoforge:armors/chestplates","neoforge:armors/leggings","neoforge:armors/boots",
  "neoforge:gems","neoforge:gems/diamond","neoforge:gems/emerald","neoforge:gems/amethyst","neoforge:gems/quartz","neoforge:gems/prismarine",
  "neoforge:ingots","neoforge:ingots/iron","neoforge:ingots/gold","neoforge:ingots/copper","neoforge:ingots/netherite",
  "neoforge:nuggets","neoforge:nuggets/iron","neoforge:nuggets/gold",
  "neoforge:ores","neoforge:ores/iron","neoforge:ores/gold","neoforge:ores/copper","neoforge:ores/diamond","neoforge:ores/emerald","neoforge:ores/lapis","neoforge:ores/redstone","neoforge:ores/coal",
  "neoforge:raw_materials","neoforge:raw_materials/iron","neoforge:raw_materials/gold","neoforge:raw_materials/copper",
  "neoforge:storage_blocks","neoforge:storage_blocks/iron","neoforge:storage_blocks/gold","neoforge:storage_blocks/copper","neoforge:storage_blocks/diamond","neoforge:storage_blocks/emerald","neoforge:storage_blocks/lapis","neoforge:storage_blocks/redstone","neoforge:storage_blocks/coal","neoforge:storage_blocks/raw_iron","neoforge:storage_blocks/raw_gold","neoforge:storage_blocks/raw_copper",
  "neoforge:rods/wooden","neoforge:dusts","neoforge:dusts/redstone","neoforge:dusts/glowstone","neoforge:dyes","neoforge:string","neoforge:glass_blocks","neoforge:glass_panes","neoforge:fences","neoforge:fence_gates","neoforge:concretes","neoforge:enchanting_fuels","neoforge:furnace_fuels","neoforge:salads","neoforge:pies","neoforge:stripped_logs","neoforge:stripped_wood","neoforge:barrels","neoforge:bookshelves","neoforge:chests","neoforge:cobblestones","neoforge:crops","neoforge:crops/wheat","neoforge:crops/carrot","neoforge:crops/potato","neoforge:crops/beetroot","neoforge:crops/nether_wart","neoforge:villager_plantable_seeds",
];
export const VANILLA_EFFECTS=["MobEffects.MOVEMENT_SPEED","MobEffects.MOVEMENT_SLOWDOWN","MobEffects.DIG_SPEED","MobEffects.DIG_SLOWDOWN","MobEffects.DAMAGE_BOOST","MobEffects.HEAL","MobEffects.HARM","MobEffects.DAMAGE_RESISTANCE","MobEffects.JUMP","MobEffects.CONFUSION","MobEffects.REGENERATION","MobEffects.FIRE_RESISTANCE","MobEffects.WATER_BREATHING","MobEffects.INVISIBILITY","MobEffects.BLINDNESS","MobEffects.NIGHT_VISION","MobEffects.HUNGER","MobEffects.WEAKNESS","MobEffects.POISON","MobEffects.WITHER","MobEffects.HEALTH_BOOST","MobEffects.ABSORPTION","MobEffects.SATURATION","MobEffects.GLOWING","MobEffects.LEVITATION","MobEffects.LUCK","MobEffects.UNLUCK","MobEffects.SLOW_FALLING","MobEffects.CONDUIT_POWER","MobEffects.DOLPHINS_GRACE","MobEffects.BAD_OMEN","MobEffects.HERO_OF_THE_VILLAGE","MobEffects.DARKNESS","MobEffects.TRIAL_OMEN","MobEffects.RAID_OMEN","MobEffects.WIND_CHARGED","MobEffects.WEAVING","MobEffects.OOZING","MobEffects.INFESTED"];
const TAG_LABEL_OVERRIDES={
  "minecraft:planks":"Any Wood Planks","minecraft:logs":"Any Wood Log","minecraft:coals":"Any Coal","minecraft:wool":"Any Wool",
  "neoforge:ingots/iron":"Any Iron Ingot","neoforge:ingots/gold":"Any Gold Ingot","neoforge:ingots/copper":"Any Copper Ingot",
  "neoforge:gems/diamond":"Any Diamond","neoforge:gems/emerald":"Any Emerald","neoforge:glass_blocks":"Any Glass","neoforge:rods/wooden":"Any Stick",
};
export function tagLabel(tag){
  if(TAG_LABEL_OVERRIDES[tag])return TAG_LABEL_OVERRIDES[tag];
  const path=tag.split(":")[1]||tag;
  return"Any "+path.split("/").pop().split("_").map(w=>w?w[0].toUpperCase()+w.slice(1):"").join(" ");
}
export const TAG_GROUPS=COMMON_TAGS.map(tag=>({tag,label:tagLabel(tag)}));
export const SMELTING_DEFAULTS={smelting:{method:"smelting",time:200},smoking:{method:"smoking",time:100},blasting:{method:"blasting",time:100},campfire:{method:"campfireCooking",time:600}};
export const SMELT_TYPES=[{key:"smelting",label:"Smelting",defTime:200},{key:"smoking",label:"Smoking",defTime:100},{key:"blasting",label:"Blasting",defTime:100},{key:"campfire",label:"Campfire",defTime:600}];
export const VAR_TYPES=[{value:"double",label:"Number"},{value:"bool",label:"Bool"},{value:"string",label:"String"},{value:"item",label:"Item Stack"}];
export function defaultForType(type){return type==="bool"?false:type==="string"?"":type==="item"?{itemId:null,count:1}:0;}
