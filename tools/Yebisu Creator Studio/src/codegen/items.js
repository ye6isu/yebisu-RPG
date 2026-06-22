import { MODID, TIER_MAP, SMELTING_DEFAULTS } from '../constants.js';

export function gTTKeys(id,f){const ks=[];if(f.hasTooltip&&f.tooltipNormal)ks.push({key:`tooltip.${MODID}.${id}.normal`,value:f.tooltipNormal});if(f.hasTooltip&&f.hasHiddenTooltip){if(!f.useDefaultShiftHint&&f.tooltipShiftHint)ks.push({key:`tooltip.${MODID}.${id}.shift_hint`,value:f.tooltipShiftHint});if(f.tooltipHidden)ks.push({key:`tooltip.${MODID}.${id}.hidden`,value:f.tooltipHidden});}return ks;}

export function gRecipe(id,form,isBlock=false){
  const parts=[];
  const CN=form.customConstName?form.constName:(form.id||"").toUpperCase();
  const ref=isBlock?`ModBlocks.${CN}.get()`:`ModItems.${CN}.get()`;
  const getIng=(item)=>item.startsWith("#")?`net.minecraft.tags.ItemTags.create(ResourceLocation.parse("${item.slice(1)}"))`:`net.minecraft.core.registries.BuiltInRegistries.ITEM.get(ResourceLocation.parse("${item}"))`;
  if(form.hasRecipe&&form.recipe){
    const r=form.recipe;
    const firstItem=Object.values(r.keys||{})[0]||"minecraft:air";
    const itemPath=firstItem.split(":")[1]||firstItem.replace("#","");
    const unlockName=`has_${itemPath.replace(/[^a-z0-9_]/g,"")}`;
    if(r.type==="shaped"){
      const pl=r.pattern.map(row=>`        .pattern("${row}")`).join("\n");
      const dl=Object.entries(r.keys||{}).map(([ch,item])=>`        .define('${ch}', ${getIng(item)})`).join("\n");
      parts.push(`ShapedRecipeBuilder.shaped(RecipeCategory.MISC, ${ref}, ${r.result||1})\n${pl}\n${dl}\n        .unlockedBy("${unlockName}", has(${getIng(firstItem)}))\n        .save(recipeOutput);`);
    }else{
      const il=(r.pattern||[]).join("").split("").filter(c=>c!==" ").map(ch=>`        .requires(${getIng((r.keys||{})[ch]||"minecraft:air")})`).join("\n");
      parts.push(`ShapelessRecipeBuilder.shapeless(RecipeCategory.MISC, ${ref}, ${r.result||1})\n${il}\n        .unlockedBy("${unlockName}", has(${getIng(firstItem)}))\n        .save(recipeOutput);`);
    }
  }
  if(form.smeltingRecipes?.length){
    for(const sr of form.smeltingRecipes){
      const def=SMELTING_DEFAULTS[sr.type];if(!def||!sr.ingredient)continue;
      const ing=getIng(sr.ingredient);
      const ingPath=(sr.ingredient.startsWith("#")?sr.ingredient.slice(1):sr.ingredient).split(":").pop()||"item";
      const unlock=`has_${ingPath.replace(/[^a-z0-9_]/g,"")}`;
      const exp=parseFloat(sr.experience)||0.1;
      const time=parseInt(sr.cookingTime)||def.time;
      const suffix=sr.type==="campfire"?"campfire_cooking":sr.type;
      parts.push(`SimpleCookingRecipeBuilder.${def.method}(Ingredient.of(${ing}), RecipeCategory.MISC, ${ref}, ${exp}f, ${time})\n        .unlockedBy("${unlock}", has(${ing}))\n        .save(recipeOutput, ResourceLocation.fromNamespaceAndPath("yebisurpg", "${id}_from_${suffix}"));`);
    }
  }
  return parts.length?parts.join("\n\n"):null;
}

export function gTagCode(id,form,isBlock=false){if(!form.tags?.length)return[];const CN=form.customConstName?form.constName:(form.id||"").toUpperCase();const ref=isBlock?`ModBlocks.${CN}.get()`:`ModItems.${CN}.get()`;return form.tags.map(tag=>{const[ns,path]=tag.includes(":")?tag.split(":"):[MODID,tag];return`tag(TagKey.create(Registries.${isBlock?"BLOCK":"ITEM"}, ResourceLocation.fromNamespaceAndPath("${ns}", "${path}"))).add(${ref});`;});}

export function idToClassName(id){return id.split("_").map(w=>w?w[0].toUpperCase()+w.slice(1):"").join("")+"Item";}

export function gItemCode(item,textures){
  const rawTexId=item.holdingMode==="3d"?(item.modelTexture3dId||""):(item.textureId||"");
  const texId=rawTexId.startsWith("__direct__")?null:rawTexId;const tex=textures.find(t=>t.id===texId);
  const id=item.id||"my_item",CN=item.customConstName?item.constName:id.toUpperCase(),dn=item.displayName||id;
  const hasClassFeatures=(item.enabledMethods||[]).length>0||item.isFood||item.isFuel||item.hasTooltip||item.hasUseDuration||item.hasUseAnimation;
  const cls2=(item.customItemClass&&hasClassFeatures)?item.customItemClass:null;
  const isTool=!!item.isTool;
  const isFood=!!item.isFood;
  const isFuel=!!item.isFuel;
  const hasDur=!!item.hasDurability&&!isTool;

  let props="new Item.Properties()";
  if(hasDur) props+=`.durability(${parseInt(item.durability)||100})`;
  else if(!isTool&&item.maxStackSize&&parseInt(item.maxStackSize)!==64) props+=`.stacksTo(${parseInt(item.maxStackSize)})`;

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
    let clsProps = props;
    if(isFood) {
      const al = item.foodAlwaysEdible ? ".alwaysEdible()" : "";
      const n = item.foodNutrition || 2;
      const s = parseFloat(item.foodSaturation) || 0.3;
      clsProps += `.food(new net.minecraft.world.food.FoodProperties.Builder().nutrition(${n}).saturationModifier(${s}f)${al}.build())`;
    }
    reg=`public static final DeferredItem<Item> ${CN} = ITEMS.register("${id}",\n        () -> new ${cls2}(${clsProps}));`;
  } else if(isFuel&&!cls2){
    reg=`public static final DeferredItem<Item> ${CN} = ITEMS.register("${id}",\n        () -> ${addTooltipInline(`new Item(${props}) {\n            @Override\n            public int getBurnTime(ItemStack itemStack, @org.jetbrains.annotations.Nullable net.minecraft.world.item.crafting.RecipeType<?> recipeType) {\n                return ${item.burnTime||1600};\n            }\n        }`)});`;
  } else {
    reg=`public static final DeferredItem<Item> ${CN} = ITEMS.register("${id}",\n        () -> ${addTooltipInline(`new Item(${props})`)});`;
  }

  const hasStates=(item.stateCount||1)>1;
  const is3d=item.holdingMode==="3d";
  const isHandheld=item.holdingMode==="handheld";
  const isSpritesheet=!!tex?.isSpritesheet;
  const isAnimated=isSpritesheet&&!!tex?.isAnimated;
  const isMultistate=isSpritesheet&&!isAnimated&&(tex?.frames||1)>1;
  const needsManualModel=isAnimated||isMultistate||is3d||hasStates;
  const modelLine=is3d
    ?`existingFileHelper.trackGenerated(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID,"item/${id}"),TEXTURE);`
    :needsManualModel
    ?`existingFileHelper.trackGenerated(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID,"item/${id}"),TEXTURE);`
    :(isHandheld?`handheldItem(ModItems.${CN});`:`basicItem(ModItems.${CN}.get());`);
  const spritesheet=isMultistate?{frames:tex.frames,defaultFrame:tex.defaultFrame||0}:null;
  const texMode=isMultistate?"multistate":isAnimated?"animated":"normal";
  return{reg,langKey:`item.${MODID}.${id}`,langVal:dn,modelLine,tex,CN,fpReg,spritesheet,texMode,isHandheld};
}
