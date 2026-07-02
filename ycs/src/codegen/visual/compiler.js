import { blockDefRegistry } from './blockDefs.js';

function quoteIfNeeded(v) { if (!v) return '""'; if (v.startsWith('"')) return v; return `"${v.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"`; }
function floatSuffix(v) { return String(v).endsWith('f') ? v : v + 'f'; }

export const LINK_ENTITY = "entity";
export const LINK_NUMBER = "number";
export const LINK_LOGIC = "logic";
export const LINK_TEXT = "text";
export const LINK_ITERATOR = "iterator";
export const LINK_ITEMSTACK = "itemstack";

export function resolveStackExpr(methodKey) {
  if (methodKey === "useOn") return "context.getItemInHand()";
  if (methodKey === "use") return "player.getItemInHand(usedHand)";
  if (methodKey === "onEffectStarted" || methodKey === "onEffectTick" || methodKey === "onEffectEnd") return null;
  return "stack";
}

export function resolveEntityVar(opcode, methodKey) {
  if (opcode === "entity.event") {
    if (methodKey === "useOn") return "context.getPlayer()";
    if (methodKey === "use") return "player";
    if (methodKey === "interactLivingEntity") return "player";
    if (methodKey === "continuousUse" || methodKey === "finishUsingItem" || methodKey === "releaseUsing") return "livingEntity";
    if (methodKey === "inventoryTick") return "entity";
    if (methodKey === "hurtEnemy") return "attacker";
    if (methodKey === "onEffectStarted" || methodKey === "onEffectTick" || methodKey === "onEffectEnd") return "livingEntity";
    return "player";
  }
  if (opcode === "entity.target") {
    if (methodKey === "hurtEnemy") return "target";
    if (methodKey === "interactLivingEntity") return "interactionTarget";
    return "target";
  }
  return "entity";
}

export function varTypeToLink(type) {
  if (type === "bool") return LINK_LOGIC;
  if (type === "string") return LINK_TEXT;
  return LINK_NUMBER;
}
export function varGetterMethod(type) {
  if (type === "bool") return "getBool";
  if (type === "string") return "getString";
  if (type === "float") return "getFloat";
  if (type === "double") return "getDouble";
  return "getInt";
}
export function varSetterMethod(type) {
  if (type === "bool") return "setBool";
  if (type === "string") return "setString";
  if (type === "float") return "setFloat";
  if (type === "double") return "setDouble";
  return "setInt";
}
export function varDefaultLiteral(type, def) {
  if (type === "bool") return def ? "true" : "false";
  if (type === "string") return `"${(def ?? "").toString().replace(/"/g, '\\"')}"`;
  if (type === "float") return `${parseFloat(def) || 0}f`;
  if (type === "double") return `${parseFloat(def) || 0}d`;
  return `${parseInt(def) || 0}`;
}
export function varOfFactory(type) {
  if (type === "bool") return "ofBool";
  if (type === "string") return "ofString";
  if (type === "float") return "ofFloat";
  if (type === "double") return "ofDouble";
  return "ofInt";
}
export function varsExpr(ent) { return `EntityVarCapability.get(${ent})`; }
export function varDefinedExpr(varName, type, def, ent) {
  return `${varsExpr(ent)}.define("${varName}", EntityVar.${varOfFactory(type)}(${varDefaultLiteral(type, def)}))`;
}
export function varGetExpr(varName, type, def, ent) {
  type = type || "int";
  return `(${varDefinedExpr(varName, type, def, ent)}.${varGetterMethod(type)}("${varName}"))`;
}
export function varSetStmt(varName, type, def, ent, valueExpr) {
  type = type || "int";
  return `${varDefinedExpr(varName, type, def, ent)}.${varSetterMethod(type)}("${varName}", ${valueExpr});`;
}

export const VANILLA_ATTR_CONST = {
  "generic.max_health": "Attributes.MAX_HEALTH",
  "generic.max_absorption": "Attributes.MAX_ABSORPTION",
  "generic.attack_damage": "Attributes.ATTACK_DAMAGE",
  "generic.attack_speed": "Attributes.ATTACK_SPEED",
  "generic.attack_knockback": "Attributes.ATTACK_KNOCKBACK",
  "generic.armor": "Attributes.ARMOR",
  "generic.armor_toughness": "Attributes.ARMOR_TOUGHNESS",
  "generic.knockback_resistance": "Attributes.KNOCKBACK_RESISTANCE",
  "generic.movement_speed": "Attributes.MOVEMENT_SPEED",
  "generic.flying_speed": "Attributes.FLYING_SPEED",
  "generic.follow_range": "Attributes.FOLLOW_RANGE",
  "generic.luck": "Attributes.LUCK",
  "generic.gravity": "Attributes.GRAVITY",
  "generic.jump_strength": "Attributes.JUMP_STRENGTH",
  "generic.scale": "Attributes.SCALE",
  "generic.step_height": "Attributes.STEP_HEIGHT",
  "generic.safe_fall_distance": "Attributes.SAFE_FALL_DISTANCE",
  "generic.fall_damage_multiplier": "Attributes.FALL_DAMAGE_MULTIPLIER",
  "generic.burning_time": "Attributes.BURNING_TIME",
  "generic.explosion_knockback_resistance": "Attributes.EXPLOSION_KNOCKBACK_RESISTANCE",
  "generic.movement_efficiency": "Attributes.MOVEMENT_EFFICIENCY",
  "generic.oxygen_bonus": "Attributes.OXYGEN_BONUS",
  "generic.water_movement_efficiency": "Attributes.WATER_MOVEMENT_EFFICIENCY",
  "player.block_break_speed": "Attributes.BLOCK_BREAK_SPEED",
  "player.block_interaction_range": "Attributes.BLOCK_INTERACTION_RANGE",
  "player.entity_interaction_range": "Attributes.ENTITY_INTERACTION_RANGE",
  "player.mining_efficiency": "Attributes.MINING_EFFICIENCY",
  "player.sneaking_speed": "Attributes.SNEAKING_SPEED",
  "player.submerged_mining_speed": "Attributes.SUBMERGED_MINING_SPEED",
  "player.sweeping_damage_ratio": "Attributes.SWEEPING_DAMAGE_RATIO",
  "zombie.spawn_reinforcements": "Attributes.SPAWN_REINFORCEMENTS_CHANCE",
};

export function attrRegistryRef(attrId) {
  if (!attrId) return "Attributes.MAX_HEALTH";
  if (VANILLA_ATTR_CONST[attrId]) return VANILLA_ATTR_CONST[attrId];
  const path = attrId.includes(":") ? attrId.split(":")[1] : attrId;
  return `ModAttributes.${path.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
}

// ── blockCompiler inline ──────────────────────────────────────────────────

function resolveKey(key, node, nodes, methodKey, def) {
  if (node.slots && key in node.slots) {
    const resolved = resolveSlotValue(node.slots[key], nodes, methodKey);
    if (resolved !== null) return resolved;
  }
  if (node.fields && key in node.fields) return node.fields[key];
  if (def.fields?.[key]?.default !== undefined) return def.fields[key].default;
  if (def.settings?.[key]?.default !== undefined) return def.settings[key].default;
  if (def.codegen?.slotDefaults?.[key]) return "0";
  return "";
}

function interpolate(template, node, nodes, methodKey, def) {
  return template.replace(/\{\{(\w+(?::\w+)?)\}\}/g, (_, token) => {
    if (token.startsWith("quote:")) return quoteIfNeeded(resolveKey(token.slice(6), node, nodes, methodKey, def));
    if (token.startsWith("float:")) { const v = resolveKey(token.slice(6), node, nodes, methodKey, def); return floatSuffix(v); }
    if (token.startsWith("attr:")) return attrRegistryRef(resolveKey(token.slice(5), node, nodes, methodKey, def));
    if (token === "stack" || token.startsWith("stack:")) return resolveStackExpr(methodKey) || "stack";
    if (token.startsWith("varGet:")) return varGetExpr(node.fields?.varName, node.fields?.varType, node.fields?.varDefault, resolveKey("entity", node, nodes, methodKey, def) || "player");
    if (token.startsWith("varSet:")) {
      const valueExpr = resolveKey("value", node, nodes, methodKey, def) || varDefaultLiteral(node.fields?.varType || "int", node.fields?.varDefault);
      return varSetStmt(node.fields?.varName, node.fields?.varType, node.fields?.varDefault, resolveKey("entity", node, nodes, methodKey, def) || "player", valueExpr);
    }
    if (token.startsWith("modName:")) return (resolveKey(token.slice(8), node, nodes, methodKey, def) || "ycs_modifier").toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (token.startsWith("dcConst:")) return "YCS_" + (resolveKey(token.slice(8), node, nodes, methodKey, def) || "my_value").toUpperCase().replace(/[^A-Z0-9]/g, "_");
    return resolveKey(token, node, nodes, methodKey, def);
  });
}

function pickVariant(variants, node) {
  if (!variants) return null;
  for (const [cond, body] of Object.entries(variants)) {
    const m = cond.match(/^(\w+)\s*==\s*'([^']*)'$/);
    if (m && (node.fields?.[m[1]] ?? "") === m[2]) return body;
  }
  return null;
}

export function evalCondition(cond, fields) {
  const eqMatch = cond.match(/^(\w+)\s*==\s*'([^']*)'$/);
  if (eqMatch) return (fields?.[eqMatch[1]] ?? "") === eqMatch[2];
  const neqMatch = cond.match(/^(\w+)\s*!=\s*'([^']*)'$/);
  if (neqMatch) return (fields?.[neqMatch[1]] ?? "") !== neqMatch[2];
  const containsMatch = cond.match(/^(\w+)\s+contains\s+'([^']*)'$/);
  if (containsMatch) return ((fields?.[containsMatch[1]] ?? "") + "").includes(containsMatch[2]);
  const bareMatch = cond.match(/^(\w+)$/);
  if (bareMatch) return !!(fields?.[bareMatch[1]]);
  return true;
}

function resolveFromDef(def, node, nodes, methodKey) {
  if (!def.codegen || def.codegen.type !== "value" || def.codegen.handler) return null;
  if (def.codegen.methodVariants) return def.codegen.methodVariants[methodKey] ?? def.codegen.methodVariants["*"] ?? null;
  let expr = def.codegen.expr;
  if (def.codegen.variants) { const v = pickVariant(def.codegen.variants, node); if (v) expr = v.expr ?? expr; }
  if (!expr) return null;
  return interpolate(expr, node, nodes, methodKey, def);
}

function compileFromDef(def, node, nodes, methodKey) {
  if (!def.codegen || def.codegen.handler) return null;
  if (def.codegen.type !== "action" && def.codegen.type !== "compound") return null;
  if (def.codegen.type === "compound" && def.body && def.codegen.compoundTemplate) {
    const tmpl = def.codegen.compoundTemplate;
    let code = interpolate(tmpl.before || "", node, nodes, methodKey, def) + "\n";
    if (node.slots?.do0) code += compileChain(node.slots.do0, nodes, methodKey).map(l => "  " + l).join("\n") + "\n";
    code += interpolate(tmpl.after || "", node, nodes, methodKey, def);
    return code.split("\n");
  }
  let template = def.codegen.template;
  if (def.codegen.variants) { const v = pickVariant(def.codegen.variants, node); if (v) template = v.template ?? template; }
  if (!template) return null;
  return interpolate(template, node, nodes, methodKey, def).split("\n");
}

// ── Chain walking ────────────────────────────────────────────────────────

export function getChain(startNextId, nodes) {
  const chain = [], seen = new Set();
  let cur = startNextId;
  while (cur) {
    if (seen.has(cur)) break;
    seen.add(cur);
    const n = nodes.find(x => x.id === cur);
    if (!n) break;
    chain.push(n);
    cur = n.nextId || null;
  }
  return chain;
}

// ── Smart if-grouping ────────────────────────────────────────────────────

function extractGuard(lines) {
  if (lines.length < 3) return null;
  const first = lines[0];
  const last = lines[lines.length - 1];
  if (!first.match(/^if\s*\(/) || last.trim() !== '}') return null;
  const body = lines.slice(1, -1).map(l => l.startsWith('    ') ? l.slice(4) : l);
  return { condition: first, body };
}

function mergeGuardedBlocks(rawBlocks) {
  const merged = [];
  for (const lines of rawBlocks) {
    const guard = extractGuard(lines);
    if (!guard) {
      merged.push(lines);
      continue;
    }
    const prev = merged.length > 0 ? merged[merged.length - 1] : null;
    if (prev && prev._guard === guard.condition) {
      prev.push(...guard.body.map(l => '    ' + l));
      continue;
    }
    const block = [guard.condition, ...guard.body.map(l => '    ' + l), '}'];
    block._guard = guard.condition;
    merged.push(block);
  }
  return merged;
}

export function compileChain(startNextId, nodes, methodKey) {
  const chain = getChain(startNextId, nodes);
  const rawBlocks = chain.map(n => compileActionNode(n, nodes, methodKey));
  const grouped = mergeGuardedBlocks(rawBlocks);
  return grouped.flatMap(lines => {
    const clean = [...lines];
    delete clean._guard;
    return clean;
  });
}

// ── Action node compilation ──────────────────────────────────────────────

export function compileActionNode(node, nodes, methodKey) {
  const _bdef = blockDefRegistry.get(node.opcode);
  if (_bdef && !_bdef.codegen?.handler) {
    const result = compileFromDef(_bdef, node, nodes, methodKey);
    if (result !== null) return result;
  }

  if (node.opcode === "control.if") {
    const fields = node.fields || { elseIfCount: 0, hasElse: false };
    let code = "";
    const cond = resolveSlotValue(node.slots?.condition, nodes, methodKey) || "false";
    code += `if (${cond}) {\n`;
    if (node.slots?.do0) code += compileChain(node.slots.do0, nodes, methodKey).map(l => "  " + l).join("\n") + "\n";
    code += "}";
    for (let i = 1; i <= fields.elseIfCount; i++) {
      const cnd = resolveSlotValue(node.slots?.["condition" + i], nodes, methodKey) || "false";
      code += ` else if (${cnd}) {\n`;
      if (node.slots?.["do" + i]) code += compileChain(node.slots["do" + i], nodes, methodKey).map(l => "  " + l).join("\n") + "\n";
      code += "}";
    }
    if (fields.hasElse) {
      code += ` else {\n`;
      if (node.slots?.doElse) code += compileChain(node.slots.doElse, nodes, methodKey).map(l => "  " + l).join("\n") + "\n";
      code += "}";
    }
    return code.split("\n");
  }

  if (node.opcode === "control.delay") {
    const ticks = resolveSlotValue(node.slots?.delayTicks, nodes, methodKey) ?? (node.fields?.delayTicks ?? "1");
    let code = "TickScheduler.INSTANCE.schedule((int)(" + ticks + "), () -> {\n";
    if (node.slots?.do0) code += compileChain(node.slots.do0, nodes, methodKey).map(l => "  " + l).join("\n") + "\n";
    code += "});";
    return code.split("\n");
  }

  if (node.opcode === "effect.apply") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || "player";
    const eff = node.fields?.effect || "MobEffects.REGENERATION";
    const dur = resolveSlotValue(node.slots?.duration, nodes, methodKey) ?? (node.fields?.duration ?? "200");
    const lvl = resolveSlotValue(node.slots?.level, nodes, methodKey) ?? (node.fields?.level ?? "1");
    const particles = node.fields?.showParticles !== false;
    return [`if (${ent} instanceof LivingEntity livingTarget) { livingTarget.addEffect(new MobEffectInstance(${eff}, (int)(${dur}), Math.max(0,(int)(${lvl})-1), false, ${particles})); }`];
  }

  if (node.opcode === "entity.apply_motion") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    const x = resolveSlotValue(node.slots?.x, nodes, methodKey) ?? node.fields?.x ?? "0";
    const y = resolveSlotValue(node.slots?.y, nodes, methodKey) ?? node.fields?.y ?? "0";
    const z = resolveSlotValue(node.slots?.z, nodes, methodKey) ?? node.fields?.z ?? "0";
    const mode = node.fields?.mode || "add";
    if (mode === "set") return [`${ent}.setDeltaMovement((double)(${x}), (double)(${y}), (double)(${z}));`];
    return [`${ent}.push((double)(${x}), (double)(${y}), (double)(${z}));`];
  }

  if (node.opcode === "aoe.each" || node.opcode?.startsWith("aoe.each.")) {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    const ox = resolveSlotValue(node.slots?.offX, nodes, methodKey) ?? "0";
    const oy = resolveSlotValue(node.slots?.offY, nodes, methodKey) ?? "0";
    const oz = resolveSlotValue(node.slots?.offZ, nodes, methodKey) ?? "0";
    const hasOff = ox !== "0" || oy !== "0" || oz !== "0";
    const los = node.fields?.los !== false;
    const showP = !!node.fields?.showParticles;
    const shape = node.opcode === "aoe.each" ? (node.fields?.shape || "sphere") : node.opcode.replace("aoe.each.", "");
    let lines = [
      `if (${ent}.level() instanceof net.minecraft.server.level.ServerLevel _sl) {`,
      `    net.minecraft.world.phys.Vec3[] _f = AoeShapes.frameFromEntity(${ent});`,
      `    net.minecraft.world.phys.Vec3 _c = ${ent}.getEyePosition();`,
    ];
    if (hasOff) lines.push(`    _c = _c.add(_f[0].scale((double)(${ox}))).add(_f[1].scale((double)(${oy}))).add(_f[2].scale((double)(${oz})));`);
    const losOrigin = node.fields?.losOrigin || "caller";
    let queryExpr, visExpr;
    if (shape === "sphere") {
      const radius = resolveSlotValue(node.slots?.radius, nodes, methodKey) ?? "5";
      const lo = losOrigin === "caller" ? `${ent}.getEyePosition()` : "_c";
      queryExpr = `AoeShapes.querySphere(_sl, _c, (double)(${radius}), ${ent}, ${los}, ${lo})`;
      visExpr = showP ? `    AoeShapes.visualizeSphere(_sl, _c, (double)(${radius}));` : null;
    } else if (shape === "box") {
      const w = resolveSlotValue(node.slots?.width, nodes, methodKey) ?? "4";
      const h = resolveSlotValue(node.slots?.height, nodes, methodKey) ?? "4";
      const d = resolveSlotValue(node.slots?.depth, nodes, methodKey) ?? "4";
      const lo = losOrigin === "caller" ? `${ent}.getEyePosition()` : "_c";
      queryExpr = `AoeShapes.queryBox(_sl, _c, (double)(${w}), (double)(${h}), (double)(${d}), _f[2], _f[0], _f[1], ${ent}, ${los}, ${lo})`;
      visExpr = showP ? `    AoeShapes.visualizeBox(_sl, _c, (double)(${w}), (double)(${h}), (double)(${d}), _f[2], _f[0], _f[1]);` : null;
    } else if (shape === "cone") {
      const dist = resolveSlotValue(node.slots?.distance, nodes, methodKey) ?? "8";
      const angle = resolveSlotValue(node.slots?.angle, nodes, methodKey) ?? "60";
      if (!hasOff) {
        queryExpr = `AoeShapes.queryCone(_sl, ${ent}, (double)(${dist}), (double)(${angle}), true, ${los})`;
        visExpr = showP ? `    AoeShapes.visualizeCone(_sl, ${ent}, (double)(${dist}), (double)(${angle}));` : null;
      } else {
        queryExpr = `AoeShapes.queryConeOffset(_sl, ${ent}, _c.subtract(${ent}.getEyePosition()), (double)(${dist}), (double)(${angle}), true, ${los})`;
        visExpr = showP ? `    AoeShapes.visualizeConeOffset(_sl, ${ent}, _c.subtract(${ent}.getEyePosition()), (double)(${dist}), (double)(${angle}));` : null;
      }
    } else if (shape === "line") {
      const dist = resolveSlotValue(node.slots?.distance, nodes, methodKey) ?? "10";
      const w = resolveSlotValue(node.slots?.width, nodes, methodKey) ?? "1";
      if (!hasOff) {
        queryExpr = `AoeShapes.queryLine(_sl, ${ent}, (double)(${dist}), (double)(${w}), true, ${los})`;
        visExpr = showP ? `    AoeShapes.visualizeLine(_sl, ${ent}, (double)(${dist}), (double)(${w}));` : null;
      } else {
        queryExpr = `AoeShapes.queryLineOffset(_sl, ${ent}, _c.subtract(${ent}.getEyePosition()), (double)(${dist}), (double)(${w}), true, ${los})`;
        visExpr = showP ? `    AoeShapes.visualizeLineOffset(_sl, ${ent}, _c.subtract(${ent}.getEyePosition()), (double)(${dist}), (double)(${w}));` : null;
      }
    }
    if (visExpr) lines.push(visExpr);
    lines.push(`    for (net.minecraft.world.entity.LivingEntity hitEntity : ${queryExpr}) {`);
    lines.push(`      hitEntity.setYRot(${ent}.getYRot());`);
    if (node.fields?.copyPitch) lines.push(`      hitEntity.setXRot(${ent}.getXRot());`);
    if (node.slots?.do0) lines.push(...compileChain(node.slots.do0, nodes, methodKey).map(l => "      " + l));
    lines.push("    }");
    lines.push("}");
    return lines;
  }

  const animGuardOpcodes = [
    "anim.firstperson.play", "anim.firstperson.stop", "anim.firstperson.pause", "anim.firstperson.resume",
    "anim.thirdperson.play", "anim.thirdperson.stop", "anim.thirdperson.pause", "anim.thirdperson.resume",
    "anim.handpose.set", "anim.handpose.reset", "anim.tppose.set", "anim.tppose.reset",
  ];
  if (animGuardOpcodes.includes(node.opcode)) {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || "player";
    const guard = `if (${ent} instanceof Entity animEntity && !level.isClientSide()) {`;
    const body = compileAnimBody(node, nodes, methodKey);
    return [guard, ...body.map(l => "    " + l), "}"];
  }

  if (node.opcode?.startsWith("anim.item.")) {
    const stackNodeId = node.slots?.stack;
    const stackNode = stackNodeId ? nodes.find(n => n.id === stackNodeId) : null;
    const isMainHand = !stackNode || stackNode.opcode !== "itemstack.offhand";
    const entitySlotId = stackNode?.slots?.entity;
    const entityExpr = entitySlotId ? resolveSlotValue(entitySlotId, nodes, methodKey) : resolveEntityVar("entity.event", methodKey);
    const guard = `if (${entityExpr} instanceof Entity animEntity && !level.isClientSide()) {`;
    const body = compileItemAnimBody(node, nodes, methodKey, isMainHand);
    return [guard, ...body.map(l => "    " + l), "}"];
  }

  if (node.opcode === "attribute.modifier.add") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    const attrRef = attrRegistryRef(node.fields?.attrId);
    const valueExpr = resolveSlotValue(node.slots?.value, nodes, methodKey) ?? (node.fields?.value ?? "0");
    const op = node.fields?.operation || "flat";
    if (op === "base_set") return [`if (${ent} instanceof LivingEntity livingTarget) {`, `    var attrInstance = livingTarget.getAttribute(${attrRef});`, `    if (attrInstance != null) attrInstance.setBaseValue((double)(${valueExpr}));`, `}`];
    if (op === "base_add") return [`if (${ent} instanceof LivingEntity livingTarget) {`, `    var attrInstance = livingTarget.getAttribute(${attrRef});`, `    if (attrInstance != null) attrInstance.setBaseValue(attrInstance.getBaseValue() + (double)(${valueExpr}));`, `}`];
    if (op === "base_multiply") return [`if (${ent} instanceof LivingEntity livingTarget) {`, `    var attrInstance = livingTarget.getAttribute(${attrRef});`, `    if (attrInstance != null) attrInstance.setBaseValue(attrInstance.getBaseValue() * (double)(${valueExpr}));`, `}`];
    const modName = (node.fields?.modifierName || "ycs_modifier").toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const javaOp = op === "multiply" ? "ADD_MULTIPLIED_TOTAL" : "ADD_VALUE";
    return [`if (${ent} instanceof LivingEntity livingTarget) {`, `    var attrInstance = livingTarget.getAttribute(${attrRef});`, `    if (attrInstance != null) {`, `        var modifierId = ResourceLocation.parse("yebisurpg:${modName}");`, `        attrInstance.removeModifier(modifierId);`, `        attrInstance.addOrUpdateTransientModifier(new AttributeModifier(`, `            modifierId, (double)(${valueExpr}), AttributeModifier.Operation.${javaOp}));`, `    }`, `}`];
  }

  if (node.opcode === "attribute.modifier.remove") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    const attrRef = attrRegistryRef(node.fields?.attrId);
    const modName = (node.fields?.modifierName || "ycs_modifier").toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return [`if (${ent} instanceof LivingEntity livingTarget) {`, `    var attrInstance = livingTarget.getAttribute(${attrRef});`, `    if (attrInstance != null) attrInstance.removeModifier(ResourceLocation.parse("yebisurpg:${modName}"));`, `}`];
  }

  if (node.opcode === "attribute.base.reset") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    const attrRef = attrRegistryRef(node.fields?.attrId);
    return [`if (${ent} instanceof LivingEntity livingTarget) {`, `    var attrInstance = livingTarget.getAttribute(${attrRef});`, `    if (attrInstance != null) attrInstance.setBaseValue(attrInstance.getAttribute().value().getDefaultValue());`, `}`];
  }

  if (node.opcode === "chat.send") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    const textParts = [];
    const textCount = node.fields?.textCount || 1;
    for (let i = 0; i < textCount; i++) {
      const val = resolveSlotValue(node.slots?.["text" + i], nodes, methodKey);
      if (val !== null) textParts.push(val);
    }
    const wrapText = (t) => (t.startsWith('"') || t.startsWith("String.valueOf") || t.startsWith("(")) ? t : quoteIfNeeded(t);
    const combined = textParts.length > 0 ? textParts.map(t => `Component.literal(${wrapText(t)})`).join(".append(") + ")".repeat(Math.max(0, textParts.length - 1)) : `Component.literal("")`;
    return [`if (${ent} instanceof Player chatPlayer) {`, `    chatPlayer.sendSystemMessage(${combined});`, `}`];
  }

  if (node.opcode === "datacomp.set") {
    const stackExpr = resolveStackExpr(methodKey);
    if (!stackExpr) return ["// datacomp.set not available in this method"];
    const compName = node.fields?.compName || "my_value";
    const compType = node.fields?.compType || "double";
    const valueExpr = resolveSlotValue(node.slots?.value, nodes, methodKey) ?? "0";
    const constName = "YCS_" + compName.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    const ref = `ModDataComponents.${constName}.get()`;
    if (compType === "bool" || compType === "string") return [`${stackExpr}.set(${ref}, ${valueExpr});`];
    return [`${stackExpr}.set(${ref}, (double)(${valueExpr}));`];
  }

  if (node.opcode === "variable.set") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    const type = node.fields?.varType || "int";
    const valueExpr = resolveSlotValue(node.slots?.value, nodes, methodKey) ?? varDefaultLiteral(type, node.fields?.varDefault);
    return [varSetStmt(node.fields?.varName, type, node.fields?.varDefault, ent, valueExpr)];
  }

  if (node.opcode === "itemstack.set_cooldown") {
    const ent = resolveEntityVar("entity.event", methodKey);
    const stack = resolveSlotValue(node.slots?.stack, nodes, methodKey) || "stack";
    const ticks = resolveSlotValue(node.slots?.ticks, nodes, methodKey) || "20";
    return [`if (${ent} instanceof net.minecraft.world.entity.player.Player cooldownPlayer) { cooldownPlayer.getCooldowns().addCooldown(${stack}.getItem(), (int)((double)(${ticks}))); }`];
  }

  if (node.opcode === "entity.dash") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    const x = resolveSlotValue(node.slots?.x, nodes, methodKey) || "0";
    const y = resolveSlotValue(node.slots?.y, nodes, methodKey) || "0";
    const z = resolveSlotValue(node.slots?.z, nodes, methodKey) || "0";
    const distance = resolveSlotValue(node.slots?.distance, nodes, methodKey) || "10";
    const ticks = resolveSlotValue(node.slots?.ticks, nodes, methodKey) || "5";
    const easing = node.fields?.easing || "LINEAR";
    const hasCollision = !!node.fields?.hasCollision;
    const hasThen = !!node.fields?.hasThen;
    const shape = node.fields?.collisionShape || "sphere";
    const particles = !!node.fields?.showParticles;
    const colRadius = resolveSlotValue(node.slots?.colRadius, nodes, methodKey) || "1.5";
    const colWidth = resolveSlotValue(node.slots?.colWidth, nodes, methodKey) || "3";
    const colHeight = resolveSlotValue(node.slots?.colHeight, nodes, methodKey) || "3";
    const colDepth = resolveSlotValue(node.slots?.colDepth, nodes, methodKey) || "3";
    const colA = shape === "box" ? colWidth : colRadius;
    const colB = shape === "box" ? colHeight : "0";
    const colC = shape === "box" ? colDepth : "0";
    const collisionBody = hasCollision ? compileChain(node.slots?.do0, nodes, methodKey).map(l => "    " + l) : [];
    const thenBody = hasThen ? compileChain(node.slots?.[hasCollision ? "do1" : "do0"], nodes, methodKey).map(l => "    " + l) : [];
    const collisionParam = hasCollision ? `(_dashSrc, hitEntity) -> {\n${collisionBody.length ? collisionBody.join("\n") : "    // collision"}\n}` : "null";
    const thenParam = hasThen ? `() -> {\n${thenBody.length ? thenBody.join("\n") : "    // then"}\n}` : "null";
    return [`DashUtil.start(${ent}, (double)(${x}), (double)(${y}), (double)(${z}), (double)(${distance}), (int)((double)(${ticks})), DashUtil.Easing.${easing}, ${collisionParam}, ${thenParam}, "${shape}", (double)(${colA}), (double)(${colB}), (double)(${colC}), ${particles});`];
  }

  return ["// unknown: " + node.opcode];
}

// ── Animation body helpers ───────────────────────────────────────────────

function compileAnimBody(node, nodes, methodKey) {
  if (node.opcode === "anim.firstperson.play") {
    const animName = resolveSlotValue(node.slots?.animName, nodes, methodKey) ?? (node.fields?.animName ?? "");
    const filePath = resolveSlotValue(node.slots?.filePath, nodes, methodKey) ?? (node.fields?.filePath ?? "");
    const speed = floatSuffix(resolveSlotValue(node.slots?.playbackSpeed, nodes, methodKey) ?? "1.0f");
    return [`AnimationAPI.triggerAnimation(animEntity,`, `    AnimationCategory.ENTITY,`, `    ${quoteIfNeeded(animName)},`, `    ${quoteIfNeeded(filePath)},`, `    ${speed});`];
  }
  if (node.opcode === "anim.firstperson.stop") return ["AnimationAPI.stopFirstPersonAnimation(animEntity);"];
  if (node.opcode === "anim.firstperson.pause") return ["AnimationAPI.pauseAnimation(animEntity,", "    AnimationCategory.ENTITY);"];
  if (node.opcode === "anim.firstperson.resume") return ["AnimationAPI.resumeAnimation(animEntity,", "    AnimationCategory.ENTITY);"];
  if (node.opcode === "anim.thirdperson.play") {
    const animName = resolveSlotValue(node.slots?.animName, nodes, methodKey) ?? (node.fields?.animName ?? "");
    const filePath = resolveSlotValue(node.slots?.filePath, nodes, methodKey) ?? (node.fields?.filePath ?? "");
    const speed = floatSuffix(resolveSlotValue(node.slots?.playbackSpeed, nodes, methodKey) ?? "1.0f");
    const lm = node.fields?.lookAtMask || 0;
    const vm = node.fields?.vanillaMask || 0;
    const vmm = node.fields?.vanillaMoveMask || 0;
    const fpm = node.fields?.fpViewMask || 0;
    return [`AnimationAPI.triggerAnimation(animEntity,`, `    AnimationCategory.ENTITY_THIRD_PERSON,`, `    ${quoteIfNeeded(animName)},`, `    ${quoteIfNeeded(filePath)},`, `    ${speed}, ${lm}, ${vm}, ${vmm}, ${fpm});`];
  }
  if (node.opcode === "anim.thirdperson.stop") return ["AnimationAPI.stopThirdPersonAnimation(animEntity);"];
  if (node.opcode === "anim.thirdperson.pause") return ["AnimationAPI.pauseThirdPersonAnimation(animEntity);"];
  if (node.opcode === "anim.thirdperson.resume") return ["AnimationAPI.resumeThirdPersonAnimation(animEntity);"];
  if (node.opcode === "anim.handpose.set") {
    const animName = resolveSlotValue(node.slots?.animName, nodes, methodKey) ?? (node.fields?.animName ?? "");
    const filePath = resolveSlotValue(node.slots?.filePath, nodes, methodKey) ?? (node.fields?.filePath ?? "");
    const aa = !!node.fields?.allowVanillaActions;
    const kps = !!node.fields?.keepPosScale;
    return [`AnimationAPI.setFirstPersonHandPose(animEntity,`, `    ${quoteIfNeeded(animName)},`, `    ${quoteIfNeeded(filePath)}, ${aa}, ${kps});`];
  }
  if (node.opcode === "anim.handpose.reset") return ["AnimationAPI.resetFirstPersonHandPose(animEntity);"];
  if (node.opcode === "anim.tppose.set") {
    const animName = resolveSlotValue(node.slots?.animName, nodes, methodKey) ?? (node.fields?.animName ?? "");
    const filePath = resolveSlotValue(node.slots?.filePath, nodes, methodKey) ?? (node.fields?.filePath ?? "");
    const lm = node.fields?.lookAtMask || 0; const vm = node.fields?.vanillaMask || 0; const vmm = node.fields?.vanillaMoveMask || 0;
    const aam = node.fields?.allowActionsMask || 0; const kpsm = node.fields?.keepPosScaleMask || 0; const fpm = node.fields?.fpViewMask || 0;
    return [`AnimationAPI.setThirdPersonPose(animEntity,`, `    ${quoteIfNeeded(animName)},`, `    ${quoteIfNeeded(filePath)},`, `    ${lm}, ${vm}, ${vmm}, ${aam}, ${kpsm}, ${fpm});`];
  }
  if (node.opcode === "anim.tppose.reset") return ["AnimationAPI.resetThirdPersonPose(animEntity);"];
  return ["// unknown anim: " + node.opcode];
}

function compileItemAnimBody(node, nodes, methodKey, isMainHand) {
  if (node.opcode === "anim.item.play") {
    const animName = resolveSlotValue(node.slots?.animName, nodes, methodKey) || '""';
    const filePath = resolveSlotValue(node.slots?.filePath, nodes, methodKey) || '""';
    const speed = resolveSlotValue(node.slots?.playbackSpeed, nodes, methodKey) || "1";
    return [`AnimationAPI.triggerItemAnimation(animEntity,`, `    ${quoteIfNeeded(animName)},`, `    ${quoteIfNeeded(filePath)},`, `    ${floatSuffix(speed)}, ${isMainHand});`];
  }
  if (node.opcode === "anim.item.stop") return [`AnimationAPI.stopItemAnimation(animEntity, ${isMainHand});`];
  if (node.opcode === "anim.item.pause") return [`AnimationAPI.pauseItemAnimation(animEntity, ${isMainHand});`];
  if (node.opcode === "anim.item.resume") return [`AnimationAPI.resumeItemAnimation(animEntity, ${isMainHand});`];
  if (node.opcode === "anim.item.pose.set") {
    const animName = resolveSlotValue(node.slots?.animName, nodes, methodKey) || '""';
    const filePath = resolveSlotValue(node.slots?.filePath, nodes, methodKey) || '""';
    const speed = resolveSlotValue(node.slots?.playbackSpeed, nodes, methodKey) || "1";
    return [`AnimationAPI.setItemAnimPose(animEntity,`, `    ${quoteIfNeeded(animName)},`, `    ${quoteIfNeeded(filePath)},`, `    ${floatSuffix(speed)}, ${isMainHand});`];
  }
  if (node.opcode === "anim.item.pose.reset") return [`AnimationAPI.resetItemAnimPose(animEntity, ${isMainHand});`];
  return ["// unknown item anim: " + node.opcode];
}

// ── Value resolution ─────────────────────────────────────────────────────

export function resolveSlotValue(slotNodeId, nodes, methodKey) {
  if (!slotNodeId) return null;
  const node = nodes.find(n => n.id === slotNodeId);
  if (!node) return null;
  const _bdef = blockDefRegistry.get(node.opcode);
  if (_bdef && !_bdef.codegen?.handler) {
    const result = resolveFromDef(_bdef, node, nodes, methodKey);
    if (result !== null) return result;
  }
  if (node.opcode === "entity.event" || node.opcode === "entity.target") return resolveEntityVar(node.opcode, methodKey);
  if (node.opcode === "number.literal") return node.fields?.value ?? "0";
  if (node.opcode === "number.math") {
    const a = resolveSlotValue(node.slots?.a, nodes, methodKey) ?? "0";
    const b = resolveSlotValue(node.slots?.b, nodes, methodKey) ?? "0";
    const op = node.fields?.op || "+";
    if (op === "min") return `(Math.min((double)(${a}),(double)(${b})))`;
    if (op === "max") return `(Math.max((double)(${a}),(double)(${b})))`;
    if (op === "pow") return `(Math.pow((double)(${a}),(double)(${b})))`;
    return `((${a})${op}(${b}))`;
  }
  if (node.opcode === "text.literal") return node.fields?.value ?? "";
  if (node.opcode === "logic.true") return "true";
  if (node.opcode === "logic.false") return "false";
  if (node.opcode === "logic.compare") {
    const a = resolveSlotValue(node.slots?.a, nodes, methodKey) ?? "0";
    const b = resolveSlotValue(node.slots?.b, nodes, methodKey) ?? "0";
    return `((double)(${a})${node.fields?.op || "=="}(double)(${b}))`;
  }
  if (node.opcode === "entity.is_crouching") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    return `(${ent}.isCrouching())`;
  }
  if (node.opcode === "aoe.iterator.entity") return "hitEntity";
  if (node.opcode === "entity.position") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    const axis = node.fields?.axis || "x";
    return `(${ent}.get${axis.toUpperCase()}())`;
  }
  if (node.opcode.startsWith("entity.pos_")) {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    const axis = node.opcode.replace("entity.pos_", "").toUpperCase();
    return `(${ent}.get${axis}())`;
  }
  if (node.opcode === "entity.position_offset") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    const dist = resolveSlotValue(node.slots?.distance, nodes, methodKey) ?? "5";
    const axis = node.fields?.axis || "x";
    if (axis === "y") return `(${ent}.getY() + ${ent}.getEyeHeight() + ${ent}.getLookAngle().normalize().y * (double)(${dist}))`;
    return `(${ent}.get${axis.toUpperCase()}() + ${ent}.getLookAngle().normalize().${axis} * (double)(${dist}))`;
  }
  if (node.opcode.startsWith("entity.cam_")) {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    const dist = resolveSlotValue(node.slots?.distance, nodes, methodKey) ?? "5";
    const axis = node.opcode.replace("entity.cam_", "");
    if (axis === "y") return `(${ent}.getY() + ${ent}.getEyeHeight() + ${ent}.getLookAngle().normalize().y * (double)(${dist}))`;
    return `(${ent}.get${axis.toUpperCase()}() + ${ent}.getLookAngle().normalize().${axis} * (double)(${dist}))`;
  }
  if (node.opcode === "vector.normalize" || node.opcode.startsWith("vector.normalize_")) {
    const x1 = resolveSlotValue(node.slots?.x1, nodes, methodKey) ?? "0";
    const y1 = resolveSlotValue(node.slots?.y1, nodes, methodKey) ?? "0";
    const z1 = resolveSlotValue(node.slots?.z1, nodes, methodKey) ?? "0";
    const x2 = resolveSlotValue(node.slots?.x2, nodes, methodKey) ?? "0";
    const y2 = resolveSlotValue(node.slots?.y2, nodes, methodKey) ?? "0";
    const z2 = resolveSlotValue(node.slots?.z2, nodes, methodKey) ?? "0";
    const dx = `((double)(${x2})-(double)(${x1}))`;
    const dy = `((double)(${y2})-(double)(${y1}))`;
    const dz = `((double)(${z2})-(double)(${z1}))`;
    const len = `Math.sqrt(${dx}*${dx}+${dy}*${dy}+${dz}*${dz})`;
    const safe = `(${len} > 0.001 ? ${len} : 1.0)`;
    const axis = node.opcode === "vector.normalize" ? (node.fields?.axis || "x") : node.opcode.replace("vector.normalize_", "");
    const comp = { x: dx, y: dy, z: dz }[axis] || dx;
    return `(${comp} / ${safe})`;
  }
  if (node.opcode === "entity.look_dir") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    return `(${ent}.getLookAngle().${node.fields?.axis || "x"})`;
  }
  if (node.opcode === "entity.look_dir_client") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    return `(${ent}.getViewVector(1.0F).${node.fields?.axis || "x"})`;
  }
  if (node.opcode.startsWith("entity.look_")) {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    if (node.opcode.includes("client")) return `(${ent}.getViewVector(1.0F).${node.opcode.slice(-1)})`;
    return `(${ent}.getLookAngle().${node.opcode.slice(-1)})`;
  }
  if (node.opcode === "variable.get") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    return varGetExpr(node.fields?.varName, node.fields?.varType, node.fields?.varDefault, ent);
  }
  if (node.opcode === "convert.to_text") {
    const val = resolveSlotValue(node.slots?.value, nodes, methodKey) ?? "0";
    return `String.valueOf((double)(${val}))`;
  }
  if (node.opcode === "datacomp.get") {
    const stackExpr = resolveStackExpr(methodKey);
    if (!stackExpr) return "0";
    const compName = node.fields?.compName || "my_value";
    const compType = node.fields?.compType || "double";
    const constName = "YCS_" + compName.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    const ref = `ModDataComponents.${constName}.get()`;
    if (compType === "bool") return `(${stackExpr}.getOrDefault(${ref}, false))`;
    if (compType === "string") return `(${stackExpr}.getOrDefault(${ref}, ""))`;
    return `(${stackExpr}.getOrDefault(${ref}, 0.0))`;
  }
  if (node.opcode === "itemstack.is_on_cooldown") {
    const ent = resolveEntityVar("entity.event", methodKey);
    const stack = resolveSlotValue(node.slots?.stack, nodes, methodKey) || "stack";
    return `(${ent} instanceof net.minecraft.world.entity.player.Player cooldownPlayer && cooldownPlayer.getCooldowns().isOnCooldown(${stack}.getItem()))`;
  }
  if (node.opcode === "attribute.get") {
    const ent = resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey);
    const attrRef = attrRegistryRef(node.fields?.attrId);
    const layer = node.fields?.layer || "total";
    if (layer === "base") return `(${ent} instanceof LivingEntity livingTarget ? livingTarget.getAttributeBaseValue(${attrRef}) : 0.0)`;
    if (layer === "bonus") return `(${ent} instanceof LivingEntity livingTarget ? (livingTarget.getAttributeValue(${attrRef}) - livingTarget.getAttributeBaseValue(${attrRef})) : 0.0)`;
    return `(${ent} instanceof LivingEntity livingTarget ? livingTarget.getAttributeValue(${attrRef}) : 0.0)`;
  }
  return null;
}

// ── Import collection ─────────────────────────────────────────────────────

export function collectBlockImports(nodes) {
  const imports = new Set();
  for (const node of nodes) {
    const def = blockDefRegistry.get(node.opcode);
    if (!def?.codegen) continue;
    if (def.codegen.imports) {
      for (const imp of def.codegen.imports) imports.add(imp);
    }
    if (def.codegen.conditionalImports) {
      for (const [cond, condImports] of Object.entries(def.codegen.conditionalImports)) {
        if (evalCondition(cond, node.fields)) {
          for (const imp of condImports) imports.add(imp);
        }
      }
    }
  }
  return imports;
}
