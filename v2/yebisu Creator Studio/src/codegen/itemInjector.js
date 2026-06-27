import { generateCustomClass, idToClassName } from './classGenerator.js';

const MODID = 'yebisurpg';

const TIER_MAP = {
  Wood: 'Tiers.WOOD', Stone: 'Tiers.STONE', Iron: 'Tiers.IRON',
  Gold: 'Tiers.GOLD', Diamond: 'Tiers.DIAMOND', Netherite: 'Tiers.NETHERITE',
};

const JAVA_BASE = 'java/net/ye6isu/yebisuRPG';
const RES_BASE = 'resources/assets/yebisurpg';

const SMELTING_MAP = {
  smelting: { method: 'smelting', time: 200 },
  blasting: { method: 'blasting', time: 100 },
  smoking: { method: 'smoking', time: 100 },
  campfire: { method: 'campfireCooking', time: 600 },
};

function getIngredientRef(item) {
  if (item.startsWith('#'))
    return `net.minecraft.tags.ItemTags.create(ResourceLocation.parse("${item.slice(1)}"))`;
  return `net.minecraft.core.registries.BuiltInRegistries.ITEM.get(ResourceLocation.parse("${item}"))`;
}

function buildRecipeCode(id, CN, recipe) {
  const parts = [];
  const ref = `ModItems.${CN}.get()`;

  if (recipe.craftingEnabled && recipe.slots?.some(s => s)) {
    const keys = {};
    const pattern = ['   ', '   ', '   '].map(r => [...r]);
    let nextChar = 0;
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#@$%&';
    const itemToChar = {};

    for (let i = 0; i < 9; i++) {
      const item = recipe.slots[i];
      if (!item) continue;
      if (!itemToChar[item]) {
        itemToChar[item] = CHARS[nextChar++];
        keys[itemToChar[item]] = item;
      }
      pattern[Math.floor(i / 3)][i % 3] = itemToChar[item];
    }

    const patternStrs = pattern.map(r => r.join(''));
    const firstItem = Object.values(keys)[0] || 'minecraft:air';
    const unlockName = `has_${(firstItem.split(':')[1] || firstItem).replace(/[^a-z0-9_]/g, '')}`;
    const count = recipe.craftingCount || 1;

    if (recipe.craftingShape === 'shapeless') {
      const requires = recipe.slots.filter(Boolean).map(item =>
        `                .requires(${getIngredientRef(item)})`
      ).join('\n');
      parts.push(`        ShapelessRecipeBuilder.shapeless(RecipeCategory.MISC, ${ref}, ${count})\n${requires}\n                .unlockedBy("${unlockName}", has(${getIngredientRef(firstItem)}))\n                .save(recipeOutput);`);
    } else {
      const pl = patternStrs.map(row => `                .pattern("${row}")`).join('\n');
      const dl = Object.entries(keys).map(([ch, item]) =>
        `                .define('${ch}', ${getIngredientRef(item)})`
      ).join('\n');
      parts.push(`        ShapedRecipeBuilder.shaped(RecipeCategory.MISC, ${ref}, ${count})\n${pl}\n${dl}\n                .unlockedBy("${unlockName}", has(${getIngredientRef(firstItem)}))\n                .save(recipeOutput);`);
    }
  }

  for (const [key, def] of Object.entries(SMELTING_MAP)) {
    if (!recipe[`${key}Enabled`]) continue;
    const input = recipe[`${key}Input`];
    if (!input) continue;
    const xp = parseFloat(recipe[`${key}XP`]) || 0.1;
    const time = parseInt(recipe[`${key}Time`]) || def.time;
    const ing = getIngredientRef(input);
    const ingPath = (input.startsWith('#') ? input.slice(1) : input).split(':').pop() || 'item';
    const unlock = `has_${ingPath.replace(/[^a-z0-9_]/g, '')}`;
    const suffix = key === 'campfire' ? 'campfire_cooking' : key;
    parts.push(`        SimpleCookingRecipeBuilder.${def.method}(Ingredient.of(${ing}), RecipeCategory.MISC, ${ref}, ${xp}f, ${time})\n                .unlockedBy("${unlock}", has(${ing}))\n                .save(recipeOutput, ResourceLocation.fromNamespaceAndPath("${MODID}", "${id}_from_${suffix}"));`);
  }

  if (recipe.stonecuttingEnabled && recipe.stonecuttingInput) {
    const ing = getIngredientRef(recipe.stonecuttingInput);
    const ingPath = (recipe.stonecuttingInput.startsWith('#') ? recipe.stonecuttingInput.slice(1) : recipe.stonecuttingInput).split(':').pop() || 'item';
    const unlock = `has_${ingPath.replace(/[^a-z0-9_]/g, '')}`;
    const count = recipe.stonecuttingCount || 1;
    parts.push(`        SingleItemRecipeBuilder.stonecutting(Ingredient.of(${ing}), RecipeCategory.MISC, ${ref}, ${count})\n                .unlockedBy("${unlock}", has(${ing}))\n                .save(recipeOutput, ResourceLocation.fromNamespaceAndPath("${MODID}", "${id}_from_stonecutting"));`);
  }

  return parts.length ? parts.join('\n\n') : null;
}

function buildDataComponentLine(dc) {
  const constName = 'YCS_' + dc.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const regId = 'ycs_' + dc.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

  if (dc.type === 'logic') {
    return `    public static final DeferredHolder<DataComponentType<?>, DataComponentType<Boolean>>\n` +
           `        ${constName} = COMPONENTS.register("${regId}", () ->\n` +
           `            DataComponentType.<Boolean>builder()\n` +
           `                .persistent(Codec.BOOL)\n` +
           `                .networkSynchronized(ByteBufCodecs.BOOL)\n` +
           `                .build());`;
  }
  if (dc.type === 'text') {
    return `    public static final DeferredHolder<DataComponentType<?>, DataComponentType<String>>\n` +
           `        ${constName} = COMPONENTS.register("${regId}", () ->\n` +
           `            DataComponentType.<String>builder()\n` +
           `                .persistent(Codec.STRING)\n` +
           `                .networkSynchronized(ByteBufCodecs.stringUtf8(256))\n` +
           `                .build());`;
  }
  return `    public static final DeferredHolder<DataComponentType<?>, DataComponentType<Double>>\n` +
         `        ${constName} = COMPONENTS.register("${regId}", () ->\n` +
         `            DataComponentType.<Double>builder()\n` +
         `                .persistent(Codec.DOUBLE)\n` +
         `                .networkSynchronized(ByteBufCodecs.DOUBLE)\n` +
         `                .build());`;
}

function buildItemProperties(form) {
  const isTool = !!form.isTool;
  const hasDur = !!form.hasDurability && !isTool;
  let props = 'new Item.Properties()';
  if (hasDur) props += `.durability(${parseInt(form.durability) || 100})`;
  else if (!isTool && form.stackSize && parseInt(form.stackSize) !== 64) props += `.stacksTo(${parseInt(form.stackSize)})`;
  if (form.isFood && !form.isTool) {
    const n = parseInt(form.foodNutrition) || 2;
    const s = parseFloat(form.foodSaturation) || 0.3;
    const al = form.foodAlwaysEdible ? '.alwaysEdible()' : '';
    props += `.food(new net.minecraft.world.food.FoodProperties.Builder().nutrition(${n}).saturationModifier(${s}f)${al}.build())`;
  }
  return props;
}

function buildRegistrationLine(form) {
  const id = form.id;
  const CN = form.customConstName ? form.constName : id.toUpperCase();
  const isTool = !!form.isTool;

  if (isTool) {
    const tier = TIER_MAP[form.tier] || 'Tiers.IRON';
    const dmg = parseFloat(form.damage) || 3;
    const spd = parseFloat(form.speed) || -2.4;
    const tc = `${form.toolType || 'Sword'}Item`;
    const toolProps = `new Item.Properties()\n                .attributes(${tc}.createAttributes(${tier}, ${dmg}f, ${spd}f))`;
    const needsClass = form.hasCustomClass || form.hasUseDuration || (form.useAnimation && form.useAnimation !== 'NONE');
    if (needsClass) {
      const className = idToClassName(id);
      return `    public static final DeferredItem<${className}> ${CN} = ITEMS.register("${id}",\n            () -> new ${className}(${toolProps}));`;
    }
    return `    public static final DeferredItem<${tc}> ${CN} = ITEMS.register("${id}",\n            () -> new ${tc}(${tier}, ${toolProps}));`;
  }

  const props = buildItemProperties(form);

  if (form.isFuel) {
    const bt = parseInt(form.burnTime) || 1600;
    return `    public static final DeferredItem<Item> ${CN} = ITEMS.register("${id}",\n            () -> new Item(${props}) {\n                @Override\n                public int getBurnTime(ItemStack itemStack, @org.jetbrains.annotations.Nullable net.minecraft.world.item.crafting.RecipeType<?> recipeType) {\n                    return ${bt};\n                }\n            });`;
  }

  const needsClass = form.hasCustomClass || form.hasUseDuration || (form.useAnimation && form.useAnimation !== 'NONE');
  if (needsClass) {
    const className = idToClassName(id);
    return `    public static final DeferredItem<${className}> ${CN} = ITEMS.register("${id}",\n            () -> new ${className}(${props}));`;
  }

  return `    public static final DeferredItem<Item> ${CN} = ITEMS.register("${id}",\n            () -> new Item(${props}));`;
}

function buildModelLine(form) {
  const id = form.id;
  const CN = form.customConstName ? form.constName : id.toUpperCase();
  const is3d = form.holdingMode === '3d';
  const isHandheld = form.holdingMode === 'handheld';
  const hasStates = form.multipleStates && (form.stateCount || 1) > 1;

  if (is3d || hasStates) {
    return `        existingFileHelper.trackGenerated(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID,"item/${id}"),TEXTURE);`;
  }
  if (isHandheld) {
    return `        handheldItem(ModItems.${CN});`;
  }
  return `        basicItem(ModItems.${CN}.get());`;
}

function buildItemModelJson(form) {
  const id = form.id;
  const isHandheld = form.holdingMode === 'handheld';
  const is3d = form.holdingMode === '3d';

  if (is3d) {
    return {
      parent: 'builtin/entity',
      textures: { particle: `${MODID}:geo/item/${id}` },
      display: {
        thirdperson_righthand: { rotation: [0, 0, 0], translation: [0, 3, 1], scale: [0.55, 0.55, 0.55] },
        firstperson_righthand: { rotation: [0, -90, 25], translation: [1.13, 3.2, 1.13], scale: [0.68, 0.68, 0.68] },
      },
    };
  }

  return {
    parent: isHandheld ? 'minecraft:item/handheld' : 'minecraft:item/generated',
    textures: { layer0: `${MODID}:item/${id}` },
  };
}

function buildStateModelJsons(form) {
  const models = {};
  const count = form.stateCount || 2;
  for (let i = 0; i < count; i++) {
    const st = form.states?.[i] || {};
    const isHandheld = st.holdingMode === 'handheld';
    const is3d = st.holdingMode === '3d';
    const stateId = `${form.id}_state_${i}`;

    if (is3d) {
      models[stateId] = {
        parent: 'builtin/entity',
        textures: { particle: `${MODID}:geo/item/${stateId}` },
        display: {
          thirdperson_righthand: { rotation: [0, 0, 0], translation: [0, 3, 1], scale: [0.55, 0.55, 0.55] },
          firstperson_righthand: { rotation: [0, -90, 25], translation: [1.13, 3.2, 1.13], scale: [0.68, 0.68, 0.68] },
        },
      };
    } else {
      models[stateId] = {
        parent: isHandheld ? 'minecraft:item/handheld' : 'minecraft:item/generated',
        textures: { layer0: `${MODID}:item/${stateId}` },
      };
    }
  }

  // Main model with overrides
  const mainModel = {
    parent: 'minecraft:item/generated',
    textures: { layer0: `${MODID}:item/${form.id}` },
    overrides: [],
  };
  for (let i = 0; i < count; i++) {
    mainModel.overrides.push({
      predicate: { custom_model_data: i + 1 },
      model: `${MODID}:item/${form.id}_state_${i}`,
    });
  }
  models[form.id] = mainModel;
  return models;
}

export async function injectItem(form) {
  const fe = window.electronAPI?.fileEngine;
  if (!fe) throw new Error('File engine not available');

  const id = form.id;
  if (!id) throw new Error('Item ID is required');

  const CN = form.customConstName ? form.constName : id.toUpperCase();
  const displayName = form.displayName || id;
  const injections = [];
  const results = [];

  // 1. Register in ModItems.java
  const regLine = buildRegistrationLine(form);
  const regResult = await fe.markers.append(
    `${JAVA_BASE}/item/ModItems.java`,
    'YCS_Mod_Items',
    regLine
  );
  if (!regResult.ok) throw new Error(`ModItems injection failed: ${regResult.error}`);
  injections.push({
    file: `${JAVA_BASE}/item/ModItems.java`,
    marker: 'YCS_Mod_Items',
    type: 'java-marker',
    content: regLine,
  });
  results.push({ label: 'ModItems.java', ok: true });

  // 2. Add lang key
  const langKey = `item.${MODID}.${id}`;
  const langResult = await fe.json.setKey(
    `${RES_BASE}/lang/en_us.json`,
    langKey,
    displayName,
    { sortKeys: true }
  );
  if (!langResult.ok) throw new Error(`Lang injection failed: ${langResult.error}`);
  injections.push({
    file: `${RES_BASE}/lang/en_us.json`,
    key: langKey,
    type: 'json-key',
  });
  results.push({ label: 'en_us.json', ok: true });

  // 3. Add tooltip lang keys
  if (form.hasTooltip) {
    if (form.tooltipNormal) {
      const tk = `tooltip.${MODID}.${id}.normal`;
      await fe.json.setKey(`${RES_BASE}/lang/en_us.json`, tk, form.tooltipNormal, { sortKeys: true });
      injections.push({ file: `${RES_BASE}/lang/en_us.json`, key: tk, type: 'json-key' });
    }
    if (form.hasHiddenTooltip && form.tooltipHidden) {
      const tk = `tooltip.${MODID}.${id}.hidden`;
      await fe.json.setKey(`${RES_BASE}/lang/en_us.json`, tk, form.tooltipHidden, { sortKeys: true });
      injections.push({ file: `${RES_BASE}/lang/en_us.json`, key: tk, type: 'json-key' });
    }
    if (form.hasHiddenTooltip && !form.useDefaultShiftHint && form.tooltipShiftHint) {
      const tk = `tooltip.${MODID}.${id}.shift_hint`;
      await fe.json.setKey(`${RES_BASE}/lang/en_us.json`, tk, form.tooltipShiftHint, { sortKeys: true });
      injections.push({ file: `${RES_BASE}/lang/en_us.json`, key: tk, type: 'json-key' });
    }
  }

  // 4. Create item model JSON(s)
  const hasStates = form.multipleStates && (form.stateCount || 1) > 1;
  if (hasStates) {
    const models = buildStateModelJsons(form);
    for (const [modelId, modelJson] of Object.entries(models)) {
      const modelPath = `${RES_BASE}/models/item/${modelId}.json`;
      await fe.json.write(modelPath, modelJson);
      injections.push({ file: modelPath, type: 'created-file' });
    }
    results.push({ label: 'item models (states)', ok: true });
  } else {
    const modelPath = `${RES_BASE}/models/item/${id}.json`;
    const modelJson = buildItemModelJson(form);
    await fe.json.write(modelPath, modelJson);
    injections.push({ file: modelPath, type: 'created-file' });
    results.push({ label: 'item model', ok: true });
  }

  // 4b. Copy texture PNG(s) to resources
  const texList = JSON.parse(localStorage.getItem('ycs-textures-list') || '[]');
  const copyTexture = async (texName, destName) => {
    const tex = texList.find(t => t.label === texName);
    if (!tex?.dataUrl) return;
    const base64 = tex.dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const destPath = `${RES_BASE}/textures/item/${destName}.png`;
    await fe.files.writeBase64(destPath, base64);
    injections.push({ file: destPath, type: 'created-file' });
    if (tex.hasEmissive && tex.emissiveUrl) {
      const emBase64 = tex.emissiveUrl.replace(/^data:image\/\w+;base64,/, '');
      const emPath = `${RES_BASE}/textures/item/${destName}_e.png`;
      await fe.files.writeBase64(emPath, emBase64);
      injections.push({ file: emPath, type: 'created-file' });
    }
  };
  if (hasStates) {
    if (form.textureName) await copyTexture(form.textureName, id);
    for (let i = 0; i < (form.stateCount || 2); i++) {
      const st = form.states?.[i];
      if (st?.textureName) await copyTexture(st.textureName, `${id}_state_${i}`);
    }
    results.push({ label: 'textures (states)', ok: true });
  } else if (form.textureName) {
    await copyTexture(form.textureName, id);
    results.push({ label: 'texture', ok: true });
  }

  // 4b2. Copy 3D textures to geo/item/ folder
  const copyGeoTexture = async (texName, destName) => {
    const tex = texList.find(t => t.label === texName);
    if (!tex?.dataUrl) return;
    const base64 = tex.dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const destPath = `${RES_BASE}/textures/geo/item/${destName}.png`;
    await fe.files.writeBase64(destPath, base64);
    injections.push({ file: destPath, type: 'created-file' });
  };
  if (hasStates) {
    for (let i = 0; i < (form.stateCount || 2); i++) {
      const st = form.states?.[i];
      if (st?.holdingMode === '3d' && st?.textureName) await copyGeoTexture(st.textureName, `${id}_state_${i}`);
    }
    if (form.holdingMode === '3d' && form.textureName) await copyGeoTexture(form.textureName, id);
  } else if (form.holdingMode === '3d' && form.textureName) {
    await copyGeoTexture(form.textureName, id);
  }

  // 4c. Write animated texture .mcmeta files for spritesheet textures
  const writeMcmeta = async (texName, destName) => {
    const tex = texList.find(t => t.label === texName);
    if (!tex?.isSpritesheet || !tex.isAnimated) return;
    const mcmeta = { animation: { frametime: tex.ticksPerFrame || 4 } };
    const mcmetaPath = `${RES_BASE}/textures/item/${destName}.png.mcmeta`;
    await fe.json.write(mcmetaPath, mcmeta);
    injections.push({ file: mcmetaPath, type: 'created-file' });
  };
  if (hasStates) {
    if (form.textureName) await writeMcmeta(form.textureName, id);
    for (let i = 0; i < (form.stateCount || 2); i++) {
      const st = form.states?.[i];
      if (st?.textureName) await writeMcmeta(st.textureName, `${id}_state_${i}`);
    }
  } else if (form.textureName) {
    await writeMcmeta(form.textureName, id);
  }

  // 4d. Copy shape textures (_s.png)
  const copyShape = async (texName, destName) => {
    const tex = texList.find(t => t.label === texName);
    if (!tex?.hasShape || !tex.shapeUrl) return;
    const base64 = tex.shapeUrl.replace(/^data:image\/\w+;base64,/, '');
    const destPath = `${RES_BASE}/textures/item/${destName}_s.png`;
    await fe.files.writeBase64(destPath, base64);
    injections.push({ file: destPath, type: 'created-file' });
  };
  if (hasStates) {
    if (form.textureName) await copyShape(form.textureName, id);
    for (let i = 0; i < (form.stateCount || 2); i++) {
      const st = form.states?.[i];
      if (st?.textureName) await copyShape(st.textureName, `${id}_state_${i}`);
    }
  } else if (form.textureName) {
    await copyShape(form.textureName, id);
  }

  // 4e. Write 3D geo model files and register in GeoItemRegistry
  const writeGeoModels = async (modelJsonStr, modelId, cn) => {
    if (!modelJsonStr) return;
    let parsed;
    try { parsed = JSON.parse(modelJsonStr); } catch { return; }
    if (parsed.geoModelJson) {
      const geoPath = `${RES_BASE}/geo/item/${modelId}.geo.json`;
      await fe.json.write(geoPath, parsed.geoModelJson);
      injections.push({ file: geoPath, type: 'created-file' });
    }
    if (parsed.itemModelJson) {
      const modelPath = `${RES_BASE}/models/item/${modelId}.json`;
      await fe.json.write(modelPath, parsed.itemModelJson);
      injections.push({ file: modelPath, type: 'created-file' });
    }
    if (cn) {
      const tex = form.textureName ? texList.find(t => t.label === form.textureName) : null;
      let geoLine;
      if (tex?.isSpritesheet && (tex.frames || 1) > 1) {
        geoLine = `        tryRegister(items, ModItems.${cn}, "${modelId}", ${tex.frames}, ${!!tex.isAnimated}, ${tex.ticksPerFrame || 4});`;
      } else {
        geoLine = `        tryRegister(items, ModItems.${cn}, "${modelId}");`;
      }
      const geoResult = await fe.markers.append(
        `${JAVA_BASE}/client/renderer/GeoItemRegistry.java`,
        'YCS_Geo_Collect',
        geoLine
      );
      if (geoResult.ok) {
        injections.push({
          file: `${JAVA_BASE}/client/renderer/GeoItemRegistry.java`,
          marker: 'YCS_Geo_Collect',
          type: 'java-marker',
          content: geoLine,
        });
      }
    }
  };
  const is3d = form.holdingMode === '3d';
  if (hasStates) {
    for (let i = 0; i < (form.stateCount || 2); i++) {
      const st = form.states?.[i];
      if (st?.holdingMode === '3d' && st.modelJson) {
        await writeGeoModels(st.modelJson, `${id}_state_${i}`, null);
      }
    }
    if (is3d && form.modelJson) {
      await writeGeoModels(form.modelJson, id, CN);
    }
    results.push({ label: '3D models', ok: true });
  } else if (is3d && form.modelJson) {
    await writeGeoModels(form.modelJson, id, CN);
    results.push({ label: '3D model', ok: true });
  }

  // 5. Register in ModItemModelProvider.java
  const modelLine = buildModelLine(form);
  const modelResult = await fe.markers.append(
    `${JAVA_BASE}/datagen/ModItemModelProvider.java`,
    'YCS_Mod_Item_Model',
    modelLine
  );
  if (!modelResult.ok) throw new Error(`ModelProvider injection failed: ${modelResult.error}`);
  injections.push({
    file: `${JAVA_BASE}/datagen/ModItemModelProvider.java`,
    marker: 'YCS_Mod_Item_Model',
    type: 'java-marker',
    content: modelLine,
  });
  results.push({ label: 'ModItemModelProvider.java', ok: true });

  // 6. Creative tab (JSON-based via YCSTabRegistry)
  if (form.creativeTab) {
    const tabsFile = `${RES_BASE}/ycs/ycs_tabs.json`;
    await fe.json.setKey(tabsFile, id, form.creativeTab.toLowerCase());
    injections.push({
      file: tabsFile,
      key: id,
      type: 'json-key',
    });
    results.push({ label: 'Creative Tab', ok: true });
  }

  // 7. Tags
  if (form.tags) {
    const tagLines = form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => {
      const [ns, path] = tag.includes(':') ? tag.split(':') : [MODID, tag];
      return `        tag(TagKey.create(Registries.ITEM, ResourceLocation.fromNamespaceAndPath("${ns}", "${path}"))).add(ModItems.${CN}.get());`;
    }).join('\n');
    if (tagLines) {
      const tagResult = await fe.markers.append(
        `${JAVA_BASE}/datagen/ModItemTagProvider.java`,
        'YCS_Mod_Item_Tags',
        tagLines
      );
      if (!tagResult.ok) throw new Error(`Tags injection failed: ${tagResult.error}`);
      injections.push({
        file: `${JAVA_BASE}/datagen/ModItemTagProvider.java`,
        marker: 'YCS_Mod_Item_Tags',
        type: 'java-marker',
        content: tagLines,
      });
      results.push({ label: 'Item Tags', ok: true });
    }
  }

  // 7b. Recipe codegen
  if (form.recipeData) {
    const recipeCode = buildRecipeCode(id, CN, form.recipeData);
    if (recipeCode) {
      const recipeResult = await fe.markers.append(
        `${JAVA_BASE}/datagen/ModRecipeProvider.java`,
        'YCS_Mod_Recipe_Provider',
        recipeCode
      );
      if (recipeResult.ok) {
        injections.push({
          file: `${JAVA_BASE}/datagen/ModRecipeProvider.java`,
          marker: 'YCS_Mod_Recipe_Provider',
          type: 'java-marker',
          content: recipeCode,
        });
        results.push({ label: 'Recipe', ok: true });
      }
    }
  }

  // 7c. Data components
  if (form.dataComponents?.length > 0) {
    const validDCs = form.dataComponents.filter(dc => dc.name);
    if (validDCs.length > 0) {
      const dcLines = validDCs.map(dc => buildDataComponentLine(dc)).join('\n\n');
      const dcResult = await fe.markers.append(
        `${JAVA_BASE}/component/ModDataComponents.java`,
        'YCS_DataComponents',
        dcLines
      );
      if (dcResult.ok) {
        injections.push({
          file: `${JAVA_BASE}/component/ModDataComponents.java`,
          marker: 'YCS_DataComponents',
          type: 'java-marker',
          content: dcLines,
        });
        results.push({ label: 'Data Components', ok: true });
      }
    }
  }

  // 8. Custom class generation (also forced when hasUseDuration or useAnimation need overrides)
  const needsCustomClass = (form.hasCustomClass && form.enabledMethods?.length > 0) || form.hasUseDuration || (form.useAnimation && form.useAnimation !== 'NONE');
  if (needsCustomClass) {
    try {
      const enabledMethods = form.enabledMethods || [];
      const blockEditorPrefix = form.blockEditorPrefix || `Block Editor::Methods::${form.methodsTileId}`;
      const classResult = await generateCustomClass(id, enabledMethods, blockEditorPrefix, form);
      injections.push(...classResult.injections);
      results.push({ label: 'Custom Class', ok: true });
    } catch (err) {
      results.push({ label: 'Custom Class', ok: false, error: err.message });
    }
  }

  // 9. Record in manifest
  const manifestResult = await fe.manifest.addEntry(id, {
    type: 'item',
    displayName,
    injections,
    assets: [],
    properties: {
      constName: CN,
      isTool: !!form.isTool,
      toolType: form.toolType,
      tier: form.tier,
      holdingMode: form.holdingMode,
      multipleStates: !!form.multipleStates,
      stateCount: form.stateCount,
    },
  });
  if (!manifestResult.ok) throw new Error(`Manifest update failed: ${manifestResult.error}`);
  results.push({ label: 'Manifest', ok: true });

  return results;
}

export async function removeItem(entryId) {
  const fe = window.electronAPI?.fileEngine;
  if (!fe) throw new Error('File engine not available');

  // Load the manifest entry to get all injections
  const traceResult = await fe.manifest.trace(entryId);
  if (!traceResult.ok) throw new Error(`Trace failed: ${traceResult.error}`);

  const { injections } = traceResult.data;
  const results = [];

  // Remove in reverse order
  for (let i = injections.length - 1; i >= 0; i--) {
    const inj = injections[i];
    try {
      if (inj.type === 'java-marker') {
        await fe.markers.remove(inj.file, inj.marker, inj.content);
        results.push({ label: `${inj.marker} (${inj.file.split('/').pop()})`, ok: true });
      } else if (inj.type === 'json-key') {
        await fe.json.deleteKey(inj.file, inj.key);
        results.push({ label: `${inj.key}`, ok: true });
      } else if (inj.type === 'created-file') {
        await fe.files.delete(inj.file);
        results.push({ label: `delete ${inj.file.split('/').pop()}`, ok: true });
      }
    } catch (err) {
      results.push({ label: `${inj.type}: ${inj.file}`, ok: false, error: err.message });
    }
  }

  // Remove from manifest
  const removeResult = await fe.manifest.removeEntry(entryId);
  if (!removeResult.ok) throw new Error(`Manifest removal failed: ${removeResult.error}`);
  results.push({ label: 'Manifest cleanup', ok: true });

  return results;
}

export async function isItemInjected(itemId) {
  const fe = window.electronAPI?.fileEngine;
  if (!fe) return false;
  try {
    const m = await fe.manifest.load();
    return m.ok && !!m.data?.entries?.[itemId];
  } catch { return false; }
}
