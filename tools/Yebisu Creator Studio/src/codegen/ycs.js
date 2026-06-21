import { ITEM_METHODS, EFFECT_METHODS } from './visual/methods.js';

export const YCS_BASE_IMPORTS=[
  "net.minecraft.world.item.Item",
  "net.minecraft.world.item.ItemStack",
  "net.minecraft.world.level.Level",
  "net.minecraft.world.entity.player.Player",
];

export const YCS_FEATURES={
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
          `\n            .effect(new MobEffectInstance(${e.effect}, ${e.duration}, ${Math.max(0,parseInt(e.level)-1)}), ${parseFloat(e.probability)||1.0}f)`
        ).join("");
      }
      return `    //YCS:food:start\n    @Override\n    public FoodProperties getFoodProperties(ItemStack stack, LivingEntity entity) {\n        return new FoodProperties.Builder()\n            .nutrition(${n})\n            .saturationModifier(${s}f)${al}${fx}\n            .build();\n    }\n    //YCS:food:end`;
    },
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
        lines.push(`        if (Screen.hasShiftDown()) {`);
        lines.push(`            tooltipComponents.add(Component.translatable(${h}));`);
        lines.push(`        } else {`);
        lines.push(`            tooltipComponents.add(Component.translatable(${s}).withStyle(ChatFormatting.YELLOW));`);
        lines.push(`        }`);
      }
      lines.push(`        super.appendHoverText(stack, context, tooltipComponents, tooltipFlag);`);
      return `    //YCS:tooltip:start\n    @Override\n    public void appendHoverText(ItemStack stack, Item.TooltipContext context, List<Component> tooltipComponents, TooltipFlag tooltipFlag) {\n${lines.join('\n')}\n    }\n    //YCS:tooltip:end`;
    },
  },
};

export function ycsInjectMethod(code, methodKey, methodList) {
  const def = (methodList||ITEM_METHODS).find(m => m.key === methodKey);
  if (!def) return code;
  if (code.includes(`//YCS:${methodKey}:start`)) return code;
  const block = `\n    //YCS:${methodKey}:start\n${def.stub}\n    //YCS:${methodKey}:end\n`;
  return code.replace(/\n\}\s*$/, block + '\n}');
}

export function ycsRemoveMethod(code, methodKey) {
  return code.replace(
    new RegExp(`\\n    \\/\\/YCS:${methodKey}:start[\\s\\S]*?\\/\\/YCS:${methodKey}:end\\n`, 'g'),
    '\n'
  ).replace(/\n{3,}/g, '\n\n');
}

export function ycsGetEnabledMethods(code, methodList) {
  return (methodList||ITEM_METHODS).filter(m => code.includes(`//YCS:${m.key}:start`)).map(m => m.key);
}

export function ycsSyncImports(code, enabledMethodKeys) {
  const needed = new Set(YCS_BASE_IMPORTS);
  for (const key of enabledMethodKeys) {
    const def = ITEM_METHODS.find(m => m.key === key);
    if (def) def.imports.forEach(i => needed.add(i));
  }
  for (const feat of Object.values(YCS_FEATURES)) {
    if (code.includes(`//YCS:${feat.key}:start`)) {
      feat.imports.forEach(i => needed.add(i));
    }
  }

  if (code.includes('instanceof LivingEntity') || code.includes('LivingEntity ')) {
    needed.add('net.minecraft.world.entity.LivingEntity');
  }
  if (code.includes('instanceof Entity') || code.includes('Entity ')) {
    needed.add('net.minecraft.world.entity.Entity');
  }
  if (code.includes('MobEffectInstance') || code.includes('.addEffect(')) {
    needed.add('net.minecraft.world.effect.MobEffectInstance');
    needed.add('net.minecraft.world.effect.MobEffects');
  }
  if (code.includes('ModEffects.')) {
    needed.add('net.ye6isu.yebisuRPG.effect.ModEffects');
  }
  if (code.includes('AnimationAPI') || code.includes('AnimationCategory')) {
    needed.add('net.ye6isu.yebisuRPG.animation.AnimationAPI');
    needed.add('net.ye6isu.yebisuRPG.animation.AnimationCategory');
  }
  if (code.includes('TickScheduler')) {
    needed.add('net.ye6isu.yebisuRPG.util.TickScheduler');
  }
  if (code.includes('AoeShapes')) {
    needed.add('net.ye6isu.yebisuRPG.util.AoeShapes');
  }
  if (code.includes('EntityVarCapability') || code.includes('EntityVar.')) {
    needed.add('net.ye6isu.yebisuRPG.data.EntityVarCapability');
    needed.add('net.ye6isu.yebisuRPG.data.EntityVar');
  }
  if (code.includes('AttributeModifier') || code.includes('getAttributeValue') || code.includes('getAttributeBaseValue')) {
    needed.add('net.minecraft.world.entity.ai.attributes.Attributes');
    needed.add('net.minecraft.world.entity.ai.attributes.AttributeModifier');
    needed.add('net.minecraft.resources.ResourceLocation');
  }
  if (code.includes('ModAttributes.')) {
    needed.add('net.ye6isu.yebisuRPG.attribute.ModAttributes');
  }
  if (code.includes('InteractionResultHolder')) {
    needed.add('net.minecraft.world.InteractionResultHolder');
  }
  if (code.includes('UseAnim')) {
    needed.add('net.minecraft.world.item.UseAnim');
  }
  if (code.includes('FoodProperties')) {
    needed.add('net.minecraft.world.food.FoodProperties');
  }
  if (code.includes('Screen.hasShiftDown')) {
    needed.add('net.minecraft.client.gui.screens.Screen');
  }
  if (code.includes('ChatFormatting')) {
    needed.add('net.minecraft.ChatFormatting');
  }
  if (code.includes('ResourceLocation')) {
    needed.add('net.minecraft.resources.ResourceLocation');
  }
  if (code.includes('Component.literal')) {
    needed.add('net.minecraft.network.chat.Component');
  }
  if (code.includes('ModDataComponents.')) {
    needed.add('net.ye6isu.yebisuRPG.component.ModDataComponents');
  }
  if (code.includes('TextureServerEvents.')) {
    needed.add('net.ye6isu.yebisuRPG.texture.TextureServerEvents');
  }
  if (code.includes('CustomModelData')) {
    needed.add('net.minecraft.core.component.DataComponents');
    needed.add('net.minecraft.world.item.component.CustomModelData');
  }
  if (code.includes('ItemStack.isSameItem')) {
    needed.add('net.minecraft.world.item.ItemStack');
  }

  let result = code.replace(/\/\/YCS_Import_START\n[\s\S]*?\/\/YCS_Import_END\n?/g, '');
  result = result.replace(/\/\/YCS:import:[^\n]+\n?import [^;]+;\n?/g, '');
  for (const imp of needed) {
    const escaped = imp.replace(/\./g, '\\.');
    result = result.replace(new RegExp(`^import ${escaped};\\n?`, 'm'), '');
  }
  result = result.replace(/\n{3,}/g, '\n\n');
  if (!needed.size) return result;
  const importBlock =
    `//YCS_Import_START\n` +
    [...needed].map(imp => `import ${imp};`).join('\n') +
    `\n//YCS_Import_END`;
  return result.replace(/(^package [^;]+;)/m, `$1\n\n${importBlock}`);
}

export function ycsInjectFeature(code, featureKey, form, itemId) {
  if (code.includes(`//YCS:${featureKey}:start`)) {
    return ycsUpdateFeature(code, featureKey, form, itemId);
  }
  const stub = buildFeatureStub(featureKey, form, itemId);
  if (!stub) return code;
  const sentinel = `\n    //YCS:${featureKey}:start\n${stub}\n    //YCS:${featureKey}:end\n`;
  let result = code.replace(/\n\}\s*$/, sentinel + '\n}');
  const enabledKeys = ycsGetEnabledMethods(result);
  return ycsSyncImports(result, enabledKeys);
}

export function ycsRemoveFeature(code, featureKey) {
  let result = code.replace(
    new RegExp(`\\n    \\/\\/YCS:${featureKey}:start[\\s\\S]*?\\/\\/YCS:${featureKey}:end\\n`, 'g'),
    '\n'
  ).replace(/\n{3,}/g, '\n\n');
  const enabledKeys = ycsGetEnabledMethods(result);
  return ycsSyncImports(result, enabledKeys);
}

export function ycsUpdateFeature(code, featureKey, form, itemId) {
  const stub = buildFeatureStub(featureKey, form, itemId);
  if (!stub) return code;
  return code.replace(
    new RegExp(`(\\/\\/YCS:${featureKey}:start)[\\s\\S]*?(\\/\\/YCS:${featureKey}:end)`),
    `//YCS:${featureKey}:start\n${stub}\n    //YCS:${featureKey}:end`
  );
}

export function buildFeatureStub(featureKey, form, itemId) {
  const MODID_ = "yebisurpg";
  if (featureKey === 'useDuration') {
    const dur = form.useDuration || "72000";
    return `    @Override\n    public int getUseDuration(ItemStack stack, LivingEntity entity) {\n        return ${dur};\n    }`;
  }
  if (featureKey === 'useAnimation') {
    const anim = form.useAnimation || "NONE";
    return `    @Override\n    public UseAnim getUseAnimation(ItemStack stack) {\n        return UseAnim.${anim};\n    }`;
  }
  if (featureKey === 'food') {
    const n = form.foodNutrition || 2;
    const s = parseFloat(form.foodSaturation) || 0.3;
    const al = form.foodAlwaysEdible ? "\n            .alwaysEdible()" : "";
    let fx = "";
    if (form.foodEffects?.length) {
      fx = form.foodEffects.map(e =>
        `\n            .effect(new MobEffectInstance(${e.effect}, ${e.duration}, ${Math.max(0, parseInt(e.level) - 1)}), ${parseFloat(e.probability) || 1.0}f)`
      ).join("");
    }
    return `    @Override\n    public FoodProperties getFoodProperties(ItemStack stack, LivingEntity entity) {\n        return new FoodProperties.Builder()\n            .nutrition(${n})\n            .saturationModifier(${s}f)${al}${fx}\n            .build();\n    }`;
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
      lines.push(`        if (Screen.hasShiftDown()) {`);
      lines.push(`            tooltipComponents.add(Component.translatable(${h}));`);
      lines.push(`        } else {`);
      lines.push(`            tooltipComponents.add(Component.translatable(${s}).withStyle(ChatFormatting.YELLOW));`);
      lines.push(`        }`);
    }
    lines.push(`        super.appendHoverText(stack, context, tooltipComponents, tooltipFlag);`);
    return `    @Override\n    public void appendHoverText(ItemStack stack, Item.TooltipContext context, List<Component> tooltipComponents, TooltipFlag tooltipFlag) {\n${lines.join('\n')}\n    }`;
  }
  return null;
}

export function ycsToggleMethod(code, methodKey, enable) {
  let result = enable ? ycsInjectMethod(code, methodKey) : ycsRemoveMethod(code, methodKey);
  if (methodKey === "continuousUse") {
    result = enable ? ycsInjectMethod(result, "releaseUsing") : ycsRemoveMethod(result, "releaseUsing");
    if (!enable) result = ycsRemoveFeature(result, "useAnimation");
  }
  const enabledKeys = ycsGetEnabledMethods(result);
  return ycsSyncImports(result, enabledKeys);
}

export function ycsToggleEffectMethod(code, methodKey, enable) {
  let result = enable ? ycsInjectMethod(code, methodKey, EFFECT_METHODS) : ycsRemoveMethod(code, methodKey);
  const enabledKeys = ycsGetEnabledMethods(result, EFFECT_METHODS);
  return ycsEffectSyncImports(result, enabledKeys);
}

export function ycsEffectSyncImports(code, enabledMethodKeys) {
  const needed = new Set([
    'net.minecraft.world.effect.MobEffectCategory',
    'net.minecraft.world.entity.LivingEntity',
  ]);
  if (code.includes('MobEffectInstance') || code.includes('.addEffect(')) {
    needed.add('net.minecraft.world.effect.MobEffectInstance');
    needed.add('net.minecraft.world.effect.MobEffects');
  }
  if (code.includes('ModEffects.')) {
    needed.add('net.ye6isu.yebisuRPG.effect.ModEffects');
  }
  if (code.includes('AnimationAPI') || code.includes('AnimationCategory')) {
    needed.add('net.ye6isu.yebisuRPG.animation.AnimationAPI');
    needed.add('net.ye6isu.yebisuRPG.animation.AnimationCategory');
  }
  if (code.includes('TickScheduler')) {
    needed.add('net.ye6isu.yebisuRPG.util.TickScheduler');
  }
  if (code.includes('AoeShapes')) {
    needed.add('net.ye6isu.yebisuRPG.util.AoeShapes');
  }
  if (code.includes('EntityVarCapability') || code.includes('EntityVar.')) {
    needed.add('net.ye6isu.yebisuRPG.data.EntityVarCapability');
    needed.add('net.ye6isu.yebisuRPG.data.EntityVar');
  }
  if (code.includes('AttributeModifier') || code.includes('getAttributeValue') || code.includes('getAttributeBaseValue')) {
    needed.add('net.minecraft.world.entity.ai.attributes.Attributes');
    needed.add('net.minecraft.world.entity.ai.attributes.AttributeModifier');
    needed.add('net.minecraft.resources.ResourceLocation');
  }
  if (code.includes('ModAttributes.')) {
    needed.add('net.ye6isu.yebisuRPG.attribute.ModAttributes');
  }
  if (code.includes('ResourceLocation')) {
    needed.add('net.minecraft.resources.ResourceLocation');
  }
  if (code.includes('Component.literal')) {
    needed.add('net.minecraft.network.chat.Component');
  }
  if (code.includes('ModDataComponents.')) {
    needed.add('net.ye6isu.yebisuRPG.component.ModDataComponents');
  }
  if (code.includes('TextureServerEvents.')) {
    needed.add('net.ye6isu.yebisuRPG.texture.TextureServerEvents');
  }
  if (code.includes('CustomModelData')) {
    needed.add('net.minecraft.core.component.DataComponents');
    needed.add('net.minecraft.world.item.component.CustomModelData');
  }
  if (code.includes('ItemStack.isSameItem')) {
    needed.add('net.minecraft.world.item.ItemStack');
  }

  let result = code.replace(/\/\/YCS_Import_START\n[\s\S]*?\/\/YCS_Import_END\n?/g, '');
  for (const imp of needed) {
    const escaped = imp.replace(/\./g, '\\.');
    result = result.replace(new RegExp(`^import ${escaped};\\n?`, 'm'), '');
  }
  result = result.replace(/\n{3,}/g, '\n\n');
  if (!needed.size) return result;
  const importBlock =
    `//YCS_Import_START\n` +
    [...needed].map(imp => `import ${imp};`).join('\n') +
    `\n//YCS_Import_END`;
  return result.replace(/(^package [^;]+;)/m, `$1\n\n${importBlock}`);
}

export function ycsInjectCompiledBody(code, methodKey, bodyLines) {
  const bodyMarker = `//YCS:${methodKey}:body`;
  if (!code.includes(bodyMarker)) return code;

  const finalBodyLines = [...bodyLines];

  const compiled = finalBodyLines.length
    ? finalBodyLines.map(l => '        ' + l).join('\n')
    : '        // (empty)';
  return code.replace(bodyMarker, compiled);
}
