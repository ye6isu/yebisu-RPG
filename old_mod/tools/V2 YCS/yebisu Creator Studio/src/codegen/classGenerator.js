import { ITEM_METHODS } from './visual/methods.js';
import { compileChain } from './visual/compiler.js';
import { blockDefRegistry } from './visual/blockDefs.js';

const MODID = 'yebisurpg';
const JAVA_BASE = 'java/net/ye6isu/yebisuRPG';
const BLOCKY_PREFIX = 'ycs-blocky::';

const BASE_IMPORTS = [
  'net.minecraft.world.item.Item',
  'net.minecraft.world.item.ItemStack',
  'net.minecraft.world.level.Level',
  'net.minecraft.world.entity.player.Player',
];

const FEATURE_OVERRIDES = {
  useDuration: {
    imports: ['net.minecraft.world.entity.LivingEntity'],
    build: (form) => {
      const dur = parseInt(form.useDuration) || 72000;
      return `    @Override\n    public int getUseDuration(ItemStack stack, LivingEntity entity) {\n        return ${dur};\n    }`;
    },
  },
  useAnimation: {
    imports: ['net.minecraft.world.item.UseAnim'],
    build: (form) => {
      const anim = form.useAnimation || 'NONE';
      return `    @Override\n    public UseAnim getUseAnimation(ItemStack stack) {\n        return UseAnim.${anim};\n    }`;
    },
  },
};

function idToClassName(id) {
  return id.split('_').map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join('') + 'Item';
}

function collectImports(enabledMethods, features = []) {
  const imports = new Set(BASE_IMPORTS);
  for (const key of enabledMethods) {
    const m = ITEM_METHODS.find(x => x.key === key);
    if (m?.imports) m.imports.forEach(i => imports.add(i));
  }
  for (const fk of features) {
    const f = FEATURE_OVERRIDES[fk];
    if (f?.imports) f.imports.forEach(i => imports.add(i));
  }
  return [...imports].sort();
}

function buildClassSource(className, enabledMethods, form = {}, blockImports = new Set()) {
  const features = [];
  if (form.hasUseDuration) features.push('useDuration');
  if (form.useAnimation && form.useAnimation !== 'NONE') features.push('useAnimation');

  const imports = collectImports(enabledMethods, features);
  blockImports.forEach(i => { if (!imports.includes(i)) imports.push(i); });
  imports.sort();
  const importLines = imports.map(i => `import ${i};`).join('\n');

  const methodStubs = enabledMethods
    .map(key => ITEM_METHODS.find(m => m.key === key))
    .filter(Boolean)
    .map(m => '\n' + m.stub)
    .join('\n');

  const featureStubs = features
    .map(fk => FEATURE_OVERRIDES[fk]?.build(form))
    .filter(Boolean)
    .map(s => '\n' + s)
    .join('\n');

  return `package net.ye6isu.yebisuRPG.item.custom;

${importLines}

public class ${className} extends Item {
    public ${className}(Properties properties) {
        super(properties);
    }
${methodStubs}${featureStubs}
}
`;
}

function collectBlockImports(nodes) {
  const imports = new Set();
  if (!nodes) return imports;
  for (const node of nodes) {
    const bdef = blockDefRegistry.get(node.opcode);
    if (!bdef) continue;
    if (bdef.imports) bdef.imports.forEach(i => imports.add(i));
    if (bdef.codegen?.imports) bdef.codegen.imports.forEach(i => imports.add(i));
    if (bdef.codegen?.conditionalImports) {
      for (const [cond, imps] of Object.entries(bdef.codegen.conditionalImports)) {
        const match = cond.match(/^(\w+)\s+contains\s+'([^']+)'$/);
        if (match) {
          const fieldVal = String(node.fields?.[match[1]] || '');
          if (fieldVal.includes(match[2])) imps.forEach(i => imports.add(i));
        }
      }
    }
  }
  return imports;
}

function loadBlockNodes(blockEditorPrefix, methodKey) {
  try {
    const id = `${blockEditorPrefix}::${methodKey}`;
    const raw = localStorage.getItem(BLOCKY_PREFIX + id);
    if (!raw) return null;
    const nodes = JSON.parse(raw);
    if (!nodes || nodes.length <= 1) return null;
    return nodes;
  } catch { return null; }
}

function compileMethodBody(nodes, methodKey) {
  const startNode = nodes.find(n => n.id === 'start');
  if (!startNode || !startNode.nextId) return null;
  const lines = compileChain(startNode.nextId, nodes, methodKey);
  return lines.map(l => '        ' + l).join('\n');
}

export async function generateCustomClass(itemId, enabledMethods, blockEditorPrefix, form = {}) {
  const fe = window.electronAPI?.fileEngine;
  if (!fe) throw new Error('File engine not available');

  const className = idToClassName(itemId);
  const classPath = `${JAVA_BASE}/item/custom/${className}.java`;
  const injections = [];

  const allBlockImports = new Set();
  const methodBodies = [];
  for (const methodKey of enabledMethods) {
    const nodes = loadBlockNodes(blockEditorPrefix, methodKey);
    if (!nodes) continue;
    collectBlockImports(nodes).forEach(i => allBlockImports.add(i));
    const body = compileMethodBody(nodes, methodKey);
    if (body) methodBodies.push({ methodKey, body });
  }

  const source = buildClassSource(className, enabledMethods, form, allBlockImports);
  await fe.files.write(classPath, source);
  injections.push({ file: classPath, type: 'created-file' });

  for (const { methodKey, body } of methodBodies) {
    await fe.markers.write(classPath, `YCS:${methodKey}:body`, body);
    injections.push({
      file: classPath,
      marker: `YCS:${methodKey}:body`,
      type: 'java-marker',
      content: body,
    });
  }

  return { className, classPath, injections };
}

export { idToClassName };
