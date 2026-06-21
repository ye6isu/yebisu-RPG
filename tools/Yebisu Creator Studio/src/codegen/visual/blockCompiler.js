import { resolveSlotValue, resolveEntityVar, resolveStackExpr, compileChain, varGetExpr, varSetStmt, varDefaultLiteral, attrRegistryRef } from './compiler.js';

function resolveKey(key, node, nodes, methodKey, def) {
  if (node.slots && key in node.slots) {
    const resolved = resolveSlotValue(node.slots[key], nodes, methodKey);
    if (resolved !== null) return resolved;
  }
  if (node.fields && key in node.fields) return node.fields[key];
  if (def.fields?.[key]?.default !== undefined) return def.fields[key].default;
  if (def.codegen?.slotDefaults?.[key]) return "0";
  return "";
}

function interpolate(template, node, nodes, methodKey, def) {
  return template.replace(/\{\{(\w+(?::\w+)?)\}\}/g, (_, token) => {
    if (token.startsWith("quote:")) {
      const key = token.slice(6);
      const val = resolveKey(key, node, nodes, methodKey, def);
      return `"${(val ?? "").toString().replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    if (token.startsWith("float:")) {
      const key = token.slice(6);
      const val = resolveKey(key, node, nodes, methodKey, def);
      return (typeof val === "string" && !val.endsWith("f")) ? val + "f" : val;
    }
    if (token.startsWith("attr:")) {
      const key = token.slice(5);
      const val = resolveKey(key, node, nodes, methodKey, def);
      return attrRegistryRef(val);
    }
    if (token.startsWith("stack:")) {
      return resolveStackExpr(methodKey) || "stack";
    }
    if (token === "stack") {
      return resolveStackExpr(methodKey) || "stack";
    }
    if (token.startsWith("varGet:")) {
      const parts = token.slice(7);
      return varGetExpr(node.fields?.varName, node.fields?.varType, node.fields?.varDefault,
        resolveKey("entity", node, nodes, methodKey, def) || "player");
    }
    if (token.startsWith("varSet:")) {
      const valueExpr = resolveKey("value", node, nodes, methodKey, def) ||
        varDefaultLiteral(node.fields?.varType || "int", node.fields?.varDefault);
      return varSetStmt(node.fields?.varName, node.fields?.varType, node.fields?.varDefault,
        resolveKey("entity", node, nodes, methodKey, def) || "player", valueExpr);
    }
    if (token.startsWith("modName:")) {
      const key = token.slice(8);
      const val = resolveKey(key, node, nodes, methodKey, def) || "ycs_modifier";
      return val.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    }
    if (token.startsWith("dcConst:")) {
      const key = token.slice(8);
      const val = resolveKey(key, node, nodes, methodKey, def) || "my_value";
      return "YCS_" + val.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    }
    return resolveKey(token, node, nodes, methodKey, def);
  });
}

function pickVariant(variants, node) {
  if (!variants) return null;
  for (const [cond, body] of Object.entries(variants)) {
    const m = cond.match(/^(\w+)\s*==\s*'([^']*)'$/);
    if (m) {
      const [, field, val] = m;
      if ((node.fields?.[field] ?? "") === val) return body;
    }
  }
  const entries = Object.entries(variants);
  return entries.length > 0 ? entries[entries.length - 1][1] : null;
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

export function resolveFromDef(def, node, nodes, methodKey) {
  if (!def.codegen || def.codegen.type !== "value") return null;
  if (def.codegen.handler) return null;

  if (def.codegen.methodVariants) {
    return def.codegen.methodVariants[methodKey] ?? def.codegen.methodVariants["*"] ?? null;
  }

  let expr = def.codegen.expr;
  if (def.codegen.variants) {
    const variant = pickVariant(def.codegen.variants, node);
    if (variant) expr = variant.expr ?? expr;
  }
  if (!expr) return null;
  return interpolate(expr, node, nodes, methodKey, def);
}

export function compileFromDef(def, node, nodes, methodKey) {
  if (!def.codegen) return null;
  if (def.codegen.handler) return null;
  if (def.codegen.type !== "action" && def.codegen.type !== "compound") return null;

  if (def.codegen.type === "compound" && def.body && def.codegen.compoundTemplate) {
    return compileCompoundFromDef(def, node, nodes, methodKey);
  }

  let template = def.codegen.template;
  if (def.codegen.variants) {
    const variant = pickVariant(def.codegen.variants, node);
    if (variant) template = variant.template ?? template;
  }
  if (!template) return null;
  const result = interpolate(template, node, nodes, methodKey, def);
  return result.split("\n");
}

function compileCompoundFromDef(def, node, nodes, methodKey) {
  if (!def.codegen.compoundTemplate) return null;
  const tmpl = def.codegen.compoundTemplate;
  let code = interpolate(tmpl.before || "", node, nodes, methodKey, def);
  code += "\n";
  if (node.slots?.do0) {
    code += compileChain(node.slots.do0, nodes, methodKey).map(l => "  " + l).join("\n") + "\n";
  }
  code += interpolate(tmpl.after || "", node, nodes, methodKey, def);
  return code.split("\n");
}
