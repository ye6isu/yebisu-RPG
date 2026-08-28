import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { invoke } from '@tauri-apps/api/core';
import { BLOCK_DEFS, blockDefRegistry } from '../codegen/visual/blockDefs.js';
import { parseLabel, extractSlotDefs } from '../codegen/visual/labelParser.js';

const STORAGE_PREFIX = 'ycs-blocky::';

// Populated by BlockEditor's data-component-loading effect; read by SegmentItem's
// "dataComponents" dropdown. Kept outside React state (like window.__hoveredSlot)
// since it's a cross-cutting lookup, not something SegmentItem's own render depends on
// via props drilling through CanvasBlock/BlockContent.
let dynamicDataComponentOptions = [];

// Same pattern as dynamicDataComponentOptions above, but for the global entity-variable pool — read by
// the "entityVariables" dropdown source (used by "Get/Set Entity Variable").
let dynamicEntityVariableOptions = [];

// Same pattern as dynamicDataComponentOptions above, but for custom mod attributes (ycs-data/attributes) —
// merged with the static VANILLA_ATTRIBUTES list below and read by the "attributes" dropdown source.
let dynamicModAttributeOptions = [];

export const VANILLA_ATTRIBUTES = [
  { label: 'Max Health', value: 'generic.max_health' },
  { label: 'Max Absorption', value: 'generic.max_absorption' },
  { label: 'Attack Damage', value: 'generic.attack_damage' },
  { label: 'Attack Speed', value: 'generic.attack_speed' },
  { label: 'Attack Knockback', value: 'generic.attack_knockback' },
  { label: 'Armor', value: 'generic.armor' },
  { label: 'Armor Toughness', value: 'generic.armor_toughness' },
  { label: 'Knockback Resistance', value: 'generic.knockback_resistance' },
  { label: 'Movement Speed', value: 'generic.movement_speed' },
  { label: 'Flying Speed', value: 'generic.flying_speed' },
  { label: 'Follow Range', value: 'generic.follow_range' },
  { label: 'Luck', value: 'generic.luck' },
  { label: 'Gravity', value: 'generic.gravity' },
  { label: 'Jump Strength', value: 'generic.jump_strength' },
  { label: 'Scale', value: 'generic.scale' },
  { label: 'Step Height', value: 'generic.step_height' },
  { label: 'Safe Fall Distance', value: 'generic.safe_fall_distance' },
  { label: 'Fall Damage Multiplier', value: 'generic.fall_damage_multiplier' },
  { label: 'Burning Time', value: 'generic.burning_time' },
  { label: 'Explosion Knockback Resistance', value: 'generic.explosion_knockback_resistance' },
  { label: 'Movement Efficiency', value: 'generic.movement_efficiency' },
  { label: 'Oxygen Bonus', value: 'generic.oxygen_bonus' },
  { label: 'Water Movement Efficiency', value: 'generic.water_movement_efficiency' },
  { label: 'Block Break Speed', value: 'player.block_break_speed' },
  { label: 'Block Interaction Range', value: 'player.block_interaction_range' },
  { label: 'Entity Interaction Range', value: 'player.entity_interaction_range' },
  { label: 'Mining Efficiency', value: 'player.mining_efficiency' },
  { label: 'Sneaking Speed', value: 'player.sneaking_speed' },
  { label: 'Submerged Mining Speed', value: 'player.submerged_mining_speed' },
  { label: 'Sweeping Damage Ratio', value: 'player.sweeping_damage_ratio' },
  { label: 'Spawn Reinforcements Chance', value: 'zombie.spawn_reinforcements' },
];

// Same pattern as dynamicDataComponentOptions above, but for the global texture pool — read by the
// "textures" dropdown source (used by e.g. "Set Entity Texture Overlay").
let dynamicTextureOptions = [];

// Resource Creator definitions used by the resource-access action and query blocks.
let dynamicResourceOptions = [];

// YCS-authored VFX definitions used by the Play/Remove VFX action blocks.
let dynamicVfxOptions = [];

const DROPDOWN_SOURCES = {
  projectiles: [
    { label: 'Arrow', value: 'minecraft:arrow' },
    { label: 'Spectral Arrow', value: 'minecraft:spectral_arrow' },
    { label: 'Trident', value: 'minecraft:trident' },
    { label: 'Snowball', value: 'minecraft:snowball' },
    { label: 'Egg', value: 'minecraft:egg' },
    { label: 'Ender Pearl', value: 'minecraft:ender_pearl' },
    { label: 'Experience Bottle', value: 'minecraft:experience_bottle' },
    { label: 'Potion', value: 'minecraft:potion' },
    { label: 'Fireball', value: 'minecraft:fireball' },
    { label: 'Small Fireball', value: 'minecraft:small_fireball' },
    { label: 'Dragon Fireball', value: 'minecraft:dragon_fireball' },
    { label: 'Wither Skull', value: 'minecraft:wither_skull' },
    { label: 'Wind Charge', value: 'minecraft:wind_charge' },
    { label: 'Breeze Wind Charge', value: 'minecraft:breeze_wind_charge' },
    { label: 'Shulker Bullet', value: 'minecraft:shulker_bullet' },
    { label: 'Llama Spit', value: 'minecraft:llama_spit' },
    { label: 'Firework Rocket', value: 'minecraft:firework_rocket' },
    { label: 'Fishing Bobber', value: 'minecraft:fishing_bobber' },
    { label: 'Eye of Ender', value: 'minecraft:eye_of_ender' },
  ],
  effects: [
    { label: 'Regeneration', value: 'MobEffects.REGENERATION' },
    { label: 'Speed', value: 'MobEffects.MOVEMENT_SPEED' },
    { label: 'Slowness', value: 'MobEffects.MOVEMENT_SLOWDOWN' },
    { label: 'Haste', value: 'MobEffects.DIG_SPEED' },
    { label: 'Mining Fatigue', value: 'MobEffects.DIG_SLOWDOWN' },
    { label: 'Strength', value: 'MobEffects.DAMAGE_BOOST' },
    { label: 'Instant Health', value: 'MobEffects.HEAL' },
    { label: 'Instant Damage', value: 'MobEffects.HARM' },
    { label: 'Jump Boost', value: 'MobEffects.JUMP' },
    { label: 'Nausea', value: 'MobEffects.CONFUSION' },
    { label: 'Night Vision', value: 'MobEffects.NIGHT_VISION' },
    { label: 'Hunger', value: 'MobEffects.HUNGER' },
    { label: 'Weakness', value: 'MobEffects.WEAKNESS' },
    { label: 'Poison', value: 'MobEffects.POISON' },
    { label: 'Wither', value: 'MobEffects.WITHER' },
    { label: 'Health Boost', value: 'MobEffects.HEALTH_BOOST' },
    { label: 'Absorption', value: 'MobEffects.ABSORPTION' },
    { label: 'Saturation', value: 'MobEffects.SATURATION' },
    { label: 'Fire Resistance', value: 'MobEffects.FIRE_RESISTANCE' },
    { label: 'Water Breathing', value: 'MobEffects.WATER_BREATHING' },
    { label: 'Invisibility', value: 'MobEffects.INVISIBILITY' },
    { label: 'Resistance', value: 'MobEffects.DAMAGE_RESISTANCE' },
    { label: 'Slow Falling', value: 'MobEffects.SLOW_FALLING' },
  ],
};

function evalCondition(cond, fields) {
  const eqMatch = cond.match(/^(\w+)\s*==\s*'([^']*)'$/);
  if (eqMatch) return (fields?.[eqMatch[1]] ?? '') === eqMatch[2];
  const neqMatch = cond.match(/^(\w+)\s*!=\s*'([^']*)'$/);
  if (neqMatch) return (fields?.[neqMatch[1]] ?? '') !== neqMatch[2];
  const bareMatch = cond.match(/^(\w+)$/);
  if (bareMatch) return !!(fields?.[bareMatch[1]]);
  return true;
}

function getBodyKeys(node, bdef) {
  if (!bdef) bdef = blockDefRegistry.get(node.opcode);
  const keys = bdef?.body ? [...Object.keys(bdef.body)] : [];
  if (bdef?.bodyConfig && !keys.includes('do0')) keys.push('do0');
  if (node.opcode === 'entity.dash') {
    if (node.fields?.hasCollision && !keys.includes('do0')) keys.push('do0');
    if (node.fields?.hasThen) {
      const thenKey = node.fields?.hasCollision ? 'do1' : 'do0';
      if (!keys.includes(thenKey)) keys.push(thenKey);
    }
  }
  const elseIfCount = node.fields?.elseIfCount || 0;
  for (let i = 1; i <= elseIfCount; i++) if (!keys.includes(`do${i}`)) keys.push(`do${i}`);
  if (node.fields?.hasElse && !keys.includes('doElse')) keys.push('doElse');
  return keys;
}

function isBodyBlock(node, bdef) {
  if (!bdef) bdef = blockDefRegistry.get(node.opcode);
  return !!(bdef?.body || bdef?.bodyConfig);
}

function getDynamicAccepts(bdef, node, slotKey) {
  if (!bdef?.dynamicAccepts?.[slotKey]) return null;
  const da = bdef.dynamicAccepts[slotKey];
  const fieldVal = node.fields?.[da.field];
  return da.map[fieldVal] ?? da.map['*'] ?? null;
}

const BLOCK_COLORS = {
  start: '#1e293b',
  animation: '#3a5c3a',
  logic: '#6494a4',
  effects: '#c46c94',
  text: '#5ba558',
  entity: '#30e1b9',
  number: '#4d65b4',
  itemstack: '#945d66',
  disconnected: '#4a4a5a',
  default: '#5a9a6a',
};

const BLOCK_H = 50;
const BLOCK_RADIUS = 10;
const SNAP_THRESHOLD = 60;

function makeId() { return 'n' + Math.random().toString(36).slice(2, 9); }

function stripBrackets(label) {
  return (label || '').replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
}

function resolveDynamicLinkType(bdef, node) {
  const dyn = bdef?.dynamicLinkType || bdef?.dynamicAccepts?.value;
  if (!dyn) return null;
  const fieldVal = node.fields?.[dyn.field];
  return dyn.map[fieldVal] || dyn.map['*'] || null;
}

function getBlockColor(node, bdef, inChain) {
  if (node.id === 'start') return BLOCK_COLORS.start;
  if (!inChain && (node.isAction || node.id === 'start')) return BLOCK_COLORS.disconnected;
  const dynLinkType = resolveDynamicLinkType(bdef, node);
  if (dynLinkType === 'number') return BLOCK_COLORS.number;
  if (dynLinkType === 'text') return BLOCK_COLORS.text;
  if (dynLinkType === 'logic') return BLOCK_COLORS.logic;
  if (bdef?.color) return bdef.color;
  if (node.linkType === 'entity') return BLOCK_COLORS.entity;
  if (node.linkType === 'number') return BLOCK_COLORS.number;
  if (node.linkType === 'text') return BLOCK_COLORS.text;
  if (node.linkType === 'logic') return BLOCK_COLORS.logic;
  if (node.linkType === 'itemstack') return BLOCK_COLORS.itemstack;
  return BLOCK_COLORS.default;
}

function getDescendants(nId, nodes) {
  const res = [];
  const node = nodes.find(x => x.id === nId);
  if (!node) return res;
  if (node.nextId) { res.push(node.nextId); res.push(...getDescendants(node.nextId, nodes)); }
  if (node.slots) {
    Object.values(node.slots).forEach(vid => {
      if (vid) { res.push(vid); res.push(...getDescendants(vid, nodes)); }
    });
  }
  return res;
}

function buildPaletteFromDefs() {
  const catMap = {};
  for (const def of BLOCK_DEFS) {
    const cat = def.category;
    const sub = def.sub || 'data';
    if (!catMap[cat]) catMap[cat] = {};
    const subKey = sub === 'actions' ? 'actions' : sub.startsWith('data') ? 'data' : sub;
    if (!catMap[cat][subKey]) catMap[cat][subKey] = [];
    catMap[cat][subKey].push({
      opcode: def.opcode,
      label: def.paletteLabel || stripBrackets(def.label),
      isAction: !!def.isAction,
      linkType: def.linkType || null,
      color: def.color || BLOCK_COLORS.default,
    });
  }
  return catMap;
}

// ── Portal Dropdown ─────────────────────────────────────────────────────
function PortalDropdown({ value, options, onChange, compact, transparent, minWidth: mw, searchable }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const [search, setSearch] = useState('');
  const anchorRef = useRef(null);
  const searchRef = useRef(null);
  const selected = options.find(o => o.value === value);
  const openDrop = (e) => {
    e.stopPropagation();
    if (!open) { const r = anchorRef.current?.getBoundingClientRect(); if (r) setRect(r); setSearch(''); }
    setOpen(o => !o);
  };
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  useEffect(() => {
    if (open && searchable) setTimeout(() => searchRef.current?.focus(), 0);
  }, [open, searchable]);
  const filtered = searchable && search ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase())) : options;
  const list = open && rect ? ReactDOM.createPortal(
    <div onWheel={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
      style={{ position: 'fixed', top: rect.bottom + 2, left: rect.left, zIndex: 99999,
        background: 'var(--ycs-accent-solid, #323233)', border: '1px solid var(--ycs-foreground)',
        borderRadius: 5, minWidth: Math.max(mw || 80, rect.width), maxHeight: 250,
        display: 'flex', flexDirection: 'column', boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)', overflow: 'hidden' }}>
      {searchable && (
        <div style={{ padding: '4px 6px', flexShrink: 0, borderBottom: '1px solid var(--ycs-foreground)' }}>
          <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
            onMouseDown={e => e.stopPropagation()} placeholder="Search..."
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none',
              color: '#fff', fontSize: 12, fontFamily: 'sans-serif', boxSizing: 'border-box' }} />
        </div>
      )}
      <div style={{ overflowY: 'auto', maxHeight: 200 }}>
        {filtered.map(o => (
          <div key={o.value} className="dropdown-item" onMouseDown={e => { e.stopPropagation(); onChange(o.value); setOpen(false); }}
            style={{ padding: '0 10px', fontSize: 12, color: o.value === value ? 'var(--ycs-highlight)' : 'var(--ycs-text)',
              cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {o.label}
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: '4px 10px', fontSize: 11, opacity: 0.4 }}>No results</div>}
      </div>
    </div>, document.body) : null;
  return (
    <div ref={anchorRef} style={{ position: 'relative', display: 'inline-block' }} onMouseDown={e => e.stopPropagation()}>
      <div onClick={openDrop}
        style={{ height: 30, background: transparent ? 'transparent' : 'rgba(0,0,0,0.3)', border: 'none',
          color: '#fff', fontSize: compact ? 16 : 12, fontFamily: 'sans-serif', fontWeight: 700,
          cursor: 'pointer', padding: compact ? '0 8px' : '0 22px 0 6px',
          display: 'flex', alignItems: 'center', justifyContent: compact ? 'center' : 'flex-start',
          minWidth: compact ? undefined : (mw || 60), overflow: 'hidden', whiteSpace: 'nowrap', userSelect: 'none', position: 'relative' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected?.label || '—'}</span>
        {!compact && <span style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#aaa' }}>▾</span>}
      </div>
      {list}
    </div>
  );
}

// ── SlotConn ────────────────────────────────────────────────────────────
function SlotConn({ sk, connId, nodes, onFieldChange, nodeId, onSelect, selected, onBlockMouseDown }) {
  const cn = connId ? nodes?.find(n => n.id === connId) : null;
  if (cn) {
    return <CanvasBlock node={cn} nodes={nodes} inChain={true} selected={selected}
      onSelect={onSelect} onBlockMouseDown={onBlockMouseDown} onFieldChange={onFieldChange} inline />;
  }
  return (
    <div title="drop value here" className="slot-conn" data-nodeid={nodeId} data-sk={sk}
      onMouseEnter={() => { window.__hoveredSlot = { nodeId, sk }; }}
      onMouseLeave={() => { if (window.__hoveredSlot?.sk === sk) window.__hoveredSlot = null; }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)', position: 'relative',
        borderRadius: 0, minWidth: 50, height: 30, marginLeft: 10 }}>
      <div style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)',
        width: 8, height: 16, borderRadius: '8px 0 0 8px', background: 'rgba(0,0,0,0.3)' }} />
    </div>
  );
}

// ── SegmentItem ──────────────────────────────────────────────────────────
function SegmentItem({ seg, i, bdef, node, nodes, onFieldChange, nodeId, onSelect, selected, onBlockMouseDown }) {
  const transp = bdef?.transparent;
  if (seg.type === 'text') {
    return <span key={i} style={{ fontSize: 14, fontFamily: 'sans-serif', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', lineHeight: '20px' }}>{seg.value}</span>;
  }
  if (seg.type === 'slot') {
    return <SlotConn key={i} sk={seg.key} connId={node.slots?.[seg.key]} nodes={nodes}
      onFieldChange={onFieldChange} nodeId={nodeId} onSelect={onSelect} selected={selected} onBlockMouseDown={onBlockMouseDown} />;
  }
  if (seg.type === 'input') {
    const fieldDef = bdef?.fields?.[seg.key];
    if (fieldDef?.showIf && !evalCondition(fieldDef.showIf, node.fields)) return null;
    const val = node.fields?.[seg.key] ?? fieldDef?.default ?? (seg.inputType === 'number' ? '0' : '');
    const isNum = seg.inputType === 'number';
    return (
      <input key={i} value={val}
        onChange={e => { e.stopPropagation(); onFieldChange && onFieldChange(nodeId, seg.key, e.target.value); }}
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: isNum ? Math.max(50, (String(val).length * 10) + 20) : Math.max(80, (String(val).length * 8) + 24),
          height: 30, background: transp ? 'transparent' : 'rgba(0,0,0,0.3)', border: 'none', borderRadius: 0,
          padding: '5px 10px', color: '#fff', fontSize: isNum ? 16 : 14,
          fontFamily: 'sans-serif', fontWeight: 700, outline: 'none',
          textAlign: 'center', boxSizing: 'border-box',
        }} />
    );
  }
  if (seg.type === 'dropdown') {
    const fieldDef = bdef?.fields?.[seg.key];
    if (fieldDef?.showIf && !evalCondition(fieldDef.showIf, node.fields)) return null;
    const source = fieldDef?.source || seg.source;
    const isDataComponents = source === 'dataComponents';
    const isEntityVariables = source === 'entityVariables';
    const isAttributes = source === 'attributes';
    const isTextures = source === 'textures';
    const isResources = source === 'resources';
    const isVfx = source === 'vfx';
    let options = fieldDef?.options
      || (isDataComponents ? dynamicDataComponentOptions : null)
      || (isEntityVariables ? dynamicEntityVariableOptions : null)
      || (isAttributes ? [...VANILLA_ATTRIBUTES, ...dynamicModAttributeOptions] : null)
      || (isTextures ? dynamicTextureOptions : null)
      || (isResources ? dynamicResourceOptions : null)
      || (isVfx ? dynamicVfxOptions : null)
      || (source && DROPDOWN_SOURCES[source])
      || [];
    if (isDataComponents && bdef?.dropdownExcludesCompType) {
      options = options.filter(o => o.compType !== bdef.dropdownExcludesCompType);
    }
    if (isDataComponents && bdef?.dropdownRequiresCompType) {
      options = options.filter(o => o.compType === bdef.dropdownRequiresCompType);
    }
    if (options.length > 0) {
      return <PortalDropdown key={i} value={node.fields?.[seg.key] ?? fieldDef?.default ?? ''}
        onChange={v => {
          if (onFieldChange) {
            onFieldChange(nodeId, seg.key, v);
            if (isDataComponents) {
              const opt = options.find(o => o.value === v);
              const compType = opt?.compType || 'double';
              onFieldChange(nodeId, 'compType', compType);
              onFieldChange(nodeId, 'compConstName', opt?.constName || v);
              if (bdef?.dynamicLinkType?.field === 'compType') {
                onFieldChange(nodeId, '__linkType', bdef.dynamicLinkType.map[compType] || bdef.dynamicLinkType.map['*']);
              }
            }
            if (isEntityVariables) {
              const opt = options.find(o => o.value === v);
              const varType = opt?.varType || 'double';
              onFieldChange(nodeId, 'varType', varType);
              onFieldChange(nodeId, 'varConstName', opt?.constName || v);
              if (bdef?.dynamicLinkType?.field === 'varType') {
                onFieldChange(nodeId, '__linkType', bdef.dynamicLinkType.map[varType] || bdef.dynamicLinkType.map['*']);
              }
            }
            if (isTextures) {
              const opt = options.find(o => o.value === v);
              onFieldChange(nodeId, 'textureRows', String(opt?.rows || 1));
              onFieldChange(nodeId, 'textureHasMask', opt?.hasMask ? '1' : '0');
              onFieldChange(nodeId, 'textureHasEmissive', opt?.hasEmissive ? '1' : '0');
              onFieldChange(nodeId, 'textureAnimatedOnUse', opt?.animatedOnUse ? '1' : '0');
              onFieldChange(nodeId, 'textureTicksPerFrame', String(opt?.ticksPerFrame || 4));
            }
          }
        }}
        compact={fieldDef?.compact} transparent={transp} minWidth={fieldDef?.minWidth || 60} options={options}
        searchable={options.length > 8 || !!fieldDef?.searchable} />;
    }
    if (isDataComponents) {
      const msg = bdef?.dropdownRequiresCompType ? '(no Item Slots components)' : '(no components)';
      return <span key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'sans-serif', padding: '0 6px' }}>{msg}</span>;
    }
    if (isEntityVariables) {
      return <span key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'sans-serif', padding: '0 6px' }}>(no variables)</span>;
    }
    if (isAttributes) {
      return <span key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'sans-serif', padding: '0 6px' }}>(no attributes)</span>;
    }
    const val = node.fields?.[seg.key] ?? fieldDef?.default ?? '';
    return (
      <input key={i} value={val}
        onChange={e => { e.stopPropagation(); onFieldChange && onFieldChange(nodeId, seg.key, e.target.value); }}
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: Math.max(80, (String(val).length * 8) + 24),
          height: 30, background: transp ? 'transparent' : 'rgba(0,0,0,0.3)', border: 'none', borderRadius: 0,
          padding: '5px 10px', color: '#fff', fontSize: 12,
          fontFamily: 'sans-serif', fontWeight: 700, outline: 'none',
          textAlign: 'center', boxSizing: 'border-box',
        }} />
    );
  }
  if (seg.type === 'checkbox') {
    const fieldDef = bdef?.fields?.[seg.key];
    const checked = !!(node.fields?.[seg.key] ?? fieldDef?.default ?? false);
    return (
      <div key={i} onClick={e => { e.stopPropagation(); onFieldChange && onFieldChange(nodeId, seg.key, !checked); }}
        onMouseDown={e => e.stopPropagation()}
        style={{ width: 16, height: 16, border: `1px solid ${checked ? '#5a9fd4' : 'rgba(255,255,255,0.3)'}`, borderRadius: 3,
          background: checked ? '#5a9fd4' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0 }}>
        {checked && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-5" stroke="#04060c" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>}
      </div>
    );
  }
  return null;
}

// ── BlockContent ─────────────────────────────────────────────────────────
function BlockContent({ bdef, node, nodes, onFieldChange, nodeId, onSelect, selected, onBlockMouseDown, settingsGear, inline }) {
  const segments = useMemo(() => {
    if (!bdef) return [{ type: 'text', value: node.label || node.opcode }];
    const main = parseLabel(bdef.label);
    const shapeKey = node.fields?.shape;
    const shape = (bdef.shapeSlots && shapeKey && bdef.shapeSlots[shapeKey]) ? parseLabel(bdef.shapeSlots[shapeKey]) : [];
    const suffix = bdef.suffixLabel ? parseLabel(bdef.suffixLabel) : [];
    return [...main, ...shape, ...suffix];
  }, [bdef, node.opcode, node.label, node.fields?.shape]);

  const segProps = { bdef, node, nodes, onFieldChange, nodeId, onSelect, selected, onBlockMouseDown };

  const repeatableSlots = useMemo(() => {
    if (!bdef?.repeatableSlots) return null;
    const rs = bdef.repeatableSlots;
    const count = node.fields?.[rs.countField] ?? rs.default ?? 1;
    const items = [];
    for (let i = 0; i < count; i++) {
      if (i > 0 && rs.separator) {
        items.push(<span key={`sep-${i}`} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>{rs.separator}</span>);
      }
      items.push(<SlotConn key={`rs-${i}`} sk={rs.key + i} connId={node.slots?.[rs.key + i]} nodes={nodes}
        onFieldChange={onFieldChange} nodeId={nodeId} onSelect={onSelect} selected={selected} onBlockMouseDown={onBlockMouseDown} />);
    }
    return items;
  }, [bdef, node.fields, node.slots, nodes, onFieldChange, nodeId, onSelect, selected, onBlockMouseDown]);

  const isMultiline = !inline && (node.fields?.multiline || bdef?.multiline);

  if (isMultiline) {
    const allSegs = [...segments];
    const lines = [];
    let current = [];
    for (const seg of allSegs) {
      current.push(seg);
      if (seg.type === 'slot') { lines.push(current); current = []; }
    }
    if (current.length) lines.push(current);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
        {lines.map((line, li) => (
          <div key={li} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 30, padding: '4px 0' }}>
            {li === 0 && settingsGear}
            {line.map((seg, si) => <SegmentItem key={si} seg={seg} i={si} {...segProps} />)}
            {li === lines.length - 1 && repeatableSlots}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {settingsGear}
      {segments.map((seg, i) => <SegmentItem key={i} seg={seg} i={i} {...segProps} />)}
      {repeatableSlots}
    </>
  );
}

// Shortens common mask-checkbox labels ("Right Arm" -> "RA", "While Moving" -> "Mov") so a
// group's checkboxes fit on one compact row; full label is still shown via the checkbox's title.
const MASK_LABEL_ABBREVIATIONS = {
  'Head': 'H', 'Torso': 'T',
  'Right Arm': 'RA', 'Left Arm': 'LA',
  'Right Leg': 'RL', 'Left Leg': 'LL',
  'Yaw': 'Yaw', 'Pitch': 'Pitch',
  'While Moving': 'Mov', 'While Still': 'Still',
  'Disable Custom Crouch': 'Crouch', 'Disable Prone': 'Prone', 'Disable Custom Sitting': 'Sitting',
};
function abbreviateMaskLabel(label) {
  return MASK_LABEL_ABBREVIATIONS[label] ?? label;
}

// ── SettingsPortal ───────────────────────────────────────────────────────
function SettingsPortal({ open, onClose, anchorRef, children }) {
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (anchorRef?.current && anchorRef.current.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open, onClose, anchorRef]);
  if (!open) return null;
  const r = anchorRef?.current?.getBoundingClientRect();
  if (!r) return null;
  return ReactDOM.createPortal(
    <div onWheel={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
      style={{
        position: 'fixed', left: r.left, top: r.top - 8, transform: 'translateY(-100%)',
        zIndex: 99999, background: 'var(--ycs-accent-solid, #323233)', border: '1px solid var(--ycs-foreground)',
        borderRadius: 'var(--ycs-radius, 4px)', padding: '10px 14px',
        display: 'flex', flexDirection: 'column', gap: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)', minWidth: 180,
        fontFamily: 'var(--ycs-font)',
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--ycs-text)', opacity: 0.5, fontSize: 11, fontWeight: 600 }}>Settings</span>
        <span onClick={e => { e.stopPropagation(); onClose(); }}
          style={{ color: 'var(--ycs-text)', opacity: 0.4, fontSize: 14, cursor: 'pointer', padding: '0 4px' }}>✕</span>
      </div>
      {children}
    </div>, document.body);
}

// ── BlockSettingsPopup ───────────────────────────────────────────────────
function BlockSettingsPopup({ bdef, node, onFieldChange, showSettings, setShowSettings, anchorRef }) {
  if (!bdef?.settings) return null;
  const entries = Object.entries(bdef.settings).filter(([k]) => !k.startsWith('_'));
  const actions = bdef.settings._actions || [];
  if (!entries.length && !actions.length) return null;
  return (
    <SettingsPortal open={showSettings} onClose={() => setShowSettings(false)} anchorRef={anchorRef}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries.map(([key, s]) => {
          if (s.type === 'hidden') return null;
          if (s.showIf && !evalCondition(s.showIf, node.fields)) return null;
          if (s.type === 'checkbox') {
            const checked = !!(node.fields?.[key] ?? s.default ?? false);
            return (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ycs-text)', fontSize: 12, cursor: 'pointer' }}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onFieldChange?.(node.id, key, !checked); }}>
                <input type="checkbox" className="ycs-checkbox" checked={checked} onChange={() => {}} />
                {s.label}
              </label>
            );
          }
          if (s.type === 'number') {
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--ycs-text)', fontSize: 12 }}>{s.label}</span>
                <input className="ycs-input inline" type="number" value={node.fields?.[key] ?? s.default ?? 0}
                  min={s.min} max={s.max}
                  onChange={e => { e.stopPropagation(); onFieldChange?.(node.id, key, parseInt(e.target.value) || 0); }}
                  onMouseDown={e => e.stopPropagation()}
                  style={{ width: 60 }} />
              </div>
            );
          }
          if (s.type === 'maskCheckboxGroup') {
            // Renders a set of checkboxes, each toggling one bit of a single packed integer
            // field (node.fields[key]). s.groups is an array of { label, bits: [{ label, bit }] } —
            // each group renders as ONE compact row (group label + abbreviated bit checkboxes
            // packed inline) rather than a sub-heading with wrapped rows, so a block with many
            // groups/bits stays short instead of tall.
            const packed = node.fields?.[key] ?? s.default ?? 0;
            const toggleBit = (bit) => {
              const next = (packed & bit) !== 0 ? (packed & ~bit) : (packed | bit);
              onFieldChange?.(node.id, key, next);
            };
            return (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {s.label && <span style={{ color: 'var(--ycs-text)', opacity: 0.7, fontSize: 11, fontWeight: 600 }}>{s.label}</span>}
                {(s.groups || []).map((group, gi) => (
                  <div key={gi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {group.label && (
                      <span style={{ color: 'var(--ycs-text)', opacity: 0.55, fontSize: 10, fontWeight: 600, minWidth: 60, flexShrink: 0 }}>
                        {group.label}
                      </span>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {group.bits.map(({ label, bit }) => {
                        const checked = (packed & bit) !== 0;
                        return (
                          <label key={bit} title={label}
                            style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--ycs-text)', fontSize: 10, cursor: 'pointer' }}
                            onMouseDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); toggleBit(bit); }}>
                            <input type="checkbox" className="ycs-checkbox" checked={checked} onChange={() => {}} />
                            {abbreviateMaskLabel(label)}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          }
          if (s.type === 'dropdown') {
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--ycs-text)', fontSize: 12 }}>{s.label}</span>
                <select className="ycs-string-input" value={node.fields?.[key] ?? s.default ?? ''}
                  onChange={e => { e.stopPropagation(); onFieldChange?.(node.id, key, e.target.value); }}
                  onMouseDown={e => e.stopPropagation()}
                  style={{ width: 180, flex: '0 0 180px', background: 'rgba(0,0,0,0.3)', border: 'none', color: '#fff', borderRadius: 4, padding: '2px 6px' }}>
                  {(s.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            );
          }
          return null;
        })}
        {actions.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
            {actions.map((act, i) => {
              let label = act.label;
              if (act.onClick?.action === 'toggle') {
                const cur = !!(node.fields?.[act.onClick.field]);
                label = cur ? (act.labelOn || `− ${act.onClick.field}`) : (act.labelOff || `+ ${act.onClick.field}`);
              }
              return (
                <button key={i} className="ycs-button inline"
                  onClick={e => {
                    e.stopPropagation();
                    if (!onFieldChange || !act.onClick) return;
                    const { field, action, min, max } = act.onClick;
                    const cur = node.fields?.[field] ?? 0;
                    if (action === 'increment') onFieldChange(node.id, field, max !== undefined ? Math.min(cur + 1, max) : cur + 1);
                    else if (action === 'decrement') {
                      const newVal = min !== undefined ? Math.max(cur - 1, min) : cur - 1;
                      if (bdef?.repeatableSlots && field === bdef.repeatableSlots.countField && newVal < cur) {
                        for (let ri = newVal; ri < cur; ri++) onFieldChange(node.id, '__clearSlot', bdef.repeatableSlots.key + ri);
                      }
                      onFieldChange(node.id, field, newVal);
                    }
                    else if (action === 'toggle') onFieldChange(node.id, field, !cur);
                  }}>{label}</button>
              );
            })}
          </div>
        )}
      </div>
    </SettingsPortal>
  );
}

// ── BodySlot ─────────────────────────────────────────────────────────────
function BodySlot({ slotKey, parentId, slotId, nodes, inChain, selected, onSelect, onBlockMouseDown, onFieldChange }) {
  const bodyNodes = [];
  let cur = slotId;
  while (cur) {
    const node = nodes.find(n => n.id === cur);
    if (!node) break;
    bodyNodes.push(node);
    cur = node.nextId;
  }
  return (
    <div data-bodyslotkey={slotKey} data-parentid={parentId}
      style={{ minHeight: 36, paddingLeft: 30, paddingTop: 4, paddingBottom: 4, position: 'relative' }}>
      <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 3,
        background: 'rgba(255,255,255,0.08)', borderRadius: 2 }} />
      {bodyNodes.map((bn, idx) => (
        <div key={bn.id} style={{ marginTop: idx > 0 ? 4 : 0 }}>
          <CanvasBlock node={bn} nodes={nodes} inChain={inChain} selected={selected}
            onSelect={onSelect} onBlockMouseDown={onBlockMouseDown} onFieldChange={onFieldChange}
            bodyInline />
        </div>
      ))}
    </div>
  );
}

// ── CanvasBlock ──────────────────────────────────────────────────────────
function CanvasBlock({ node, nodes, inChain, selected, onSelect, onBlockMouseDown, onFieldChange, inline, bodyInline }) {
  const bdef = blockDefRegistry.get(node.opcode);
  const isStart = node.id === 'start';
  const isAct = node.isAction || isStart;
  const isVal = !!node.linkType;
  const bg = getBlockColor(node, bdef, inChain);

  const [showSettings, setShowSettings] = useState(false);
  const settingsAnchorRef = useRef(null);

  const hasSettings = bdef?.settings && Object.keys(bdef.settings).some(k => !k.startsWith('_') ? bdef.settings[k].type !== 'hidden' : k === '_actions');
  const hasBody = isBodyBlock(node, bdef);
  const bodyToggles = (!bdef?.bodyConfig && bdef?.settings?._actions) ? bdef.settings._actions.filter(a => a.onClick?.action === 'toggle').map(a => a.onClick.field) : [];
  const showBody = hasBody && (bodyToggles.length === 0 || bodyToggles.some(f => !!(node.fields?.[f])));
  const isIf = bdef?.bodyConfig?.type === 'if';

  const startBdef = isStart ? { label: 'Start' } : bdef;
  const contentProps = { bdef: startBdef, node, nodes, onFieldChange, nodeId: node.id, onSelect, selected, onBlockMouseDown };

  if (inline) {
    return (
      <div data-blockid={node.id}
        onMouseDown={e => { if (e.button !== 0) return; e.stopPropagation(); onSelect?.(node.id); onBlockMouseDown?.(e, node.id); }}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
        style={{
          display: 'flex', flexDirection: 'row', alignItems: 'center',
          background: bg, borderRadius: 0, padding: '0 10px', minHeight: 30, minWidth: 50,
          cursor: 'grab', boxShadow: '0 2px 6px rgba(0,0,0,.3)', gap: 10,
          border: selected === node.id ? '2px solid #fff' : '2px solid transparent', boxSizing: 'border-box',
        }}>
        <BlockContent {...contentProps} inline />
      </div>
    );
  }

  const settingsGear = hasSettings ? (
    <span ref={settingsAnchorRef} style={{ cursor: 'pointer', opacity: 0.6, fontSize: 14 }}
      onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setShowSettings(s => !s); }}>⚙</span>
  ) : null;

  const settingsPopup = <BlockSettingsPopup bdef={bdef} node={node} onFieldChange={onFieldChange} showSettings={showSettings} setShowSettings={setShowSettings} anchorRef={settingsAnchorRef} />;

  if (showBody && !bodyInline) {
    const elseIfCount = node.fields?.elseIfCount || 0;
    const hasElse = !!node.fields?.hasElse;
    const isDash = node.opcode === 'entity.dash';
    const dashHasCol = isDash && !!node.fields?.hasCollision;
    const dashHasThen = isDash && !!node.fields?.hasThen;
    const dashThenSlot = dashHasCol ? 'do1' : 'do0';
    const sel2 = selected === node.id ? '2px solid #fff' : '2px solid transparent';
    const bodyWrap = { background: `${bg}33`, borderLeft: `3px solid ${bg}`, borderRight: `3px solid ${bg}` };

    return (
      <div data-blockid={node.id}
        onMouseDown={e => {
          if (e.target.closest('[data-bodyslotkey]')) return;
          if (e.button !== 0) return; e.stopPropagation(); onSelect?.(node.id); onBlockMouseDown?.(e, node.id);
        }}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
        style={{
          position: 'absolute', left: node.x, top: node.y,
          width: 'fit-content', minWidth: 160,
          display: 'flex', flexDirection: 'column', alignItems: 'stretch',
          userSelect: 'none',
          opacity: (!inChain && isAct && !isStart) ? 0.6 : 1,
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
          zIndex: !inChain ? 50 : (node.depth || 1),
        }}>
        {!inChain && isAct && !isStart && (
          <div style={{ position: 'absolute', top: -6, right: -6, width: 14, height: 14,
            borderRadius: '50%', background: '#e11d48', fontSize: '9px',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, zIndex: 10 }}>!</div>
        )}
        {settingsPopup}
        <div style={{ minHeight: BLOCK_H, background: bg, borderRadius: `${BLOCK_RADIUS}px ${BLOCK_RADIUS}px 0 0`,
          display: 'flex', alignItems: 'center', padding: '0 10px', gap: 10, cursor: 'grab',
          border: sel2, boxSizing: 'border-box' }}>
          <BlockContent {...contentProps} settingsGear={settingsGear} />
        </div>
        {isDash && dashHasCol && (() => {
          const colShape = node.fields?.collisionShape || 'sphere';
          return <>
            <div style={{ minHeight: BLOCK_H, background: bg, display: 'flex', alignItems: 'center',
              padding: '0 10px', gap: 10, borderLeft: sel2, borderRight: sel2, boxSizing: 'border-box' }}>
              <span style={{ fontSize: 14, fontFamily: 'sans-serif', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>On Collision</span>
              <PortalDropdown value={colShape} onChange={v => onFieldChange?.(node.id, 'collisionShape', v)} minWidth={80}
                options={[{ value: 'sphere', label: 'Sphere' }, { value: 'box', label: 'Box' }]} />
              {colShape === 'sphere' && <>
                <span style={{ fontSize: 13, fontFamily: 'sans-serif', color: '#fff', fontWeight: 700 }}>radius</span>
                <SlotConn sk="colRadius" connId={node.slots?.colRadius} nodes={nodes}
                  onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selected={selected} onBlockMouseDown={onBlockMouseDown} />
              </>}
              {colShape === 'box' && <>
                <span style={{ fontSize: 13, fontFamily: 'sans-serif', color: '#fff', fontWeight: 700 }}>w</span>
                <SlotConn sk="colWidth" connId={node.slots?.colWidth} nodes={nodes}
                  onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selected={selected} onBlockMouseDown={onBlockMouseDown} />
                <span style={{ fontSize: 13, fontFamily: 'sans-serif', color: '#fff', fontWeight: 700 }}>h</span>
                <SlotConn sk="colHeight" connId={node.slots?.colHeight} nodes={nodes}
                  onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selected={selected} onBlockMouseDown={onBlockMouseDown} />
                <span style={{ fontSize: 13, fontFamily: 'sans-serif', color: '#fff', fontWeight: 700 }}>d</span>
                <SlotConn sk="colDepth" connId={node.slots?.colDepth} nodes={nodes}
                  onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selected={selected} onBlockMouseDown={onBlockMouseDown} />
              </>}
            </div>
            <div style={bodyWrap}>
              <BodySlot slotKey="do0" parentId={node.id} slotId={node.slots?.do0} nodes={nodes} inChain={inChain} selected={selected}
                onSelect={onSelect} onBlockMouseDown={onBlockMouseDown} onFieldChange={onFieldChange} />
            </div>
          </>;
        })()}
        {isDash && dashHasThen && (
          <>
            <div style={{ minHeight: BLOCK_H, background: bg, display: 'flex', alignItems: 'center',
              padding: '0 10px', borderLeft: sel2, borderRight: sel2, boxSizing: 'border-box' }}>
              <span style={{ fontSize: 14, fontFamily: 'sans-serif', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>Then</span>
            </div>
            <div style={bodyWrap}>
              <BodySlot slotKey={dashThenSlot} parentId={node.id} slotId={node.slots?.[dashThenSlot]} nodes={nodes} inChain={inChain} selected={selected}
                onSelect={onSelect} onBlockMouseDown={onBlockMouseDown} onFieldChange={onFieldChange} />
            </div>
          </>
        )}
        {!isDash && (
          <div style={bodyWrap}>
            <BodySlot slotKey="do0" parentId={node.id} slotId={node.slots?.do0} nodes={nodes} inChain={inChain} selected={selected}
              onSelect={onSelect} onBlockMouseDown={onBlockMouseDown} onFieldChange={onFieldChange} />
          </div>
        )}
        {isIf && Array.from({ length: elseIfCount }).map((_, i) => (
          <React.Fragment key={`elif-${i}`}>
            <div style={{ minHeight: BLOCK_H, background: bg, display: 'flex', alignItems: 'center',
              padding: '0 10px', gap: 10, borderLeft: sel2, borderRight: sel2, boxSizing: 'border-box' }}>
              <span style={{ fontSize: 14, fontFamily: 'sans-serif', color: '#fff', fontWeight: 700 }}>Else If</span>
              <SlotConn sk={`condition${i + 1}`} connId={node.slots?.[`condition${i + 1}`]} nodes={nodes}
                onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selected={selected} onBlockMouseDown={onBlockMouseDown} />
            </div>
            <div style={bodyWrap}>
              <BodySlot slotKey={`do${i + 1}`} parentId={node.id} slotId={node.slots?.[`do${i + 1}`]} nodes={nodes} inChain={inChain} selected={selected}
                onSelect={onSelect} onBlockMouseDown={onBlockMouseDown} onFieldChange={onFieldChange} />
            </div>
          </React.Fragment>
        ))}
        {isIf && hasElse && (
          <>
            <div style={{ minHeight: BLOCK_H, background: bg, display: 'flex', alignItems: 'center',
              padding: '0 10px', borderLeft: sel2, borderRight: sel2, boxSizing: 'border-box' }}>
              <span style={{ fontSize: 14, fontFamily: 'sans-serif', color: '#fff', fontWeight: 700 }}>Else</span>
            </div>
            <div style={bodyWrap}>
              <BodySlot slotKey="doElse" parentId={node.id} slotId={node.slots?.doElse} nodes={nodes} inChain={inChain} selected={selected}
                onSelect={onSelect} onBlockMouseDown={onBlockMouseDown} onFieldChange={onFieldChange} />
            </div>
          </>
        )}
        <div style={{ height: 12, background: bg, borderRadius: `0 0 ${BLOCK_RADIUS}px ${BLOCK_RADIUS}px`,
          borderLeft: sel2, borderRight: sel2, borderBottom: sel2, boxSizing: 'border-box' }} />
      </div>
    );
  }

  if (bodyInline) {
    return (
      <div data-blockid={node.id}
        onMouseDown={e => { if (e.button !== 0) return; e.stopPropagation(); onSelect?.(node.id); onBlockMouseDown?.(e, node.id); }}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
        style={{
          width: 'fit-content', minHeight: BLOCK_H,
          display: 'flex', alignItems: 'center', padding: '0 10px', gap: 10,
          background: bg, borderRadius: BLOCK_RADIUS, cursor: 'grab', userSelect: 'none',
          border: selected === node.id ? '2px solid #fff' : '2px solid transparent', boxSizing: 'border-box',
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
        }}>
        <BlockContent {...contentProps} settingsGear={settingsGear} />
        {settingsPopup}
      </div>
    );
  }

  return (
    <div data-blockid={node.id}
      onMouseDown={e => { if (e.button !== 0) return; e.stopPropagation(); onSelect?.(node.id); onBlockMouseDown?.(e, node.id); }}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
      style={{
        position: 'absolute', left: node.x, top: node.y,
        minWidth: isVal ? 50 : undefined, width: 'fit-content',
        minHeight: isVal ? undefined : BLOCK_H, height: isVal ? 'auto' : undefined,
        display: 'flex', alignItems: 'center',
        padding: isVal ? '8px 10px' : '0 10px', gap: 10,
        background: bg, borderRadius: BLOCK_RADIUS, cursor: 'grab', userSelect: 'none',
        opacity: (!inChain && isAct && !isStart) ? 0.6 : 1,
        border: selected === node.id ? '2px solid #fff' : '2px solid transparent',
        boxSizing: 'border-box',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
        zIndex: isVal ? 100 : (!inChain ? 50 : (node.depth || 1)),
      }}>
      {isVal && (
        <div style={{ position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)',
          width: 10, height: 20, borderRadius: '10px 0 0 10px', background: bg }} />
      )}
      {!inChain && isAct && !isStart && (
        <div style={{ position: 'absolute', top: -6, right: -6, width: 14, height: 14,
          borderRadius: '50%', background: '#e11d48', fontSize: '9px',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>!</div>
      )}
      <BlockContent {...contentProps} settingsGear={settingsGear} />
      {settingsPopup}
    </div>
  );
}

// ── Block Palette Sidebar ────────────────────────────────────────────────
function BlockPalette({ onItemMouseDown }) {
  const [openCats, setOpenCats] = useState({});
  const palette = useMemo(() => buildPaletteFromDefs(), []);

  return (
    <div style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--ycs-foreground)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', flexShrink: 0, borderBottom: '1px solid var(--ycs-foreground)' }}>
        <span style={{ fontSize: '13px', fontWeight: 500 }}>Palette</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '4px 0' }}>
        {Object.entries(palette).map(([cat, subs]) => {
          const data = subs.data || [];
          const actions = subs.actions || [];
          const otherSubs = Object.entries(subs).filter(([k]) => k !== 'data' && k !== 'actions');
          return (
            <div key={cat}>
              <div onClick={() => setOpenCats(p => ({ ...p, [cat]: !p[cat] }))}
                style={{ padding: '5px 12px', fontSize: '11px', fontWeight: 600, opacity: 0.7, cursor: 'pointer', userSelect: 'none', display: 'flex', justifyContent: 'space-between' }}>
                {cat} <span style={{ fontSize: '9px' }}>{openCats[cat] ? '▾' : '▸'}</span>
              </div>
              {openCats[cat] && (
                <div style={{ padding: '0 8px 4px' }}>
                  {actions.length > 0 && <>
                    <div style={{ fontSize: '9px', opacity: 0.35, padding: '2px 4px', fontWeight: 700 }}>ACTIONS</div>
                    {actions.map(b => (
                      <div key={b.opcode} onMouseDown={e => onItemMouseDown(e, b)}
                        style={{ padding: '4px 8px', margin: '1px 0', borderRadius: 6, fontSize: '11px', fontWeight: 600, color: '#fff', cursor: 'grab', userSelect: 'none', background: b.color || BLOCK_COLORS.default, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.label}
                      </div>
                    ))}
                  </>}
                  {data.length > 0 && <>
                    <div style={{ fontSize: '9px', opacity: 0.35, padding: '2px 4px', fontWeight: 700 }}>DATA</div>
                    {data.map(b => (
                      <div key={b.opcode} onMouseDown={e => onItemMouseDown(e, b)}
                        style={{ padding: '4px 8px', margin: '1px 0', borderRadius: 6, fontSize: '11px', fontWeight: 600, color: '#fff', cursor: 'grab', userSelect: 'none', background: b.color || BLOCK_COLORS.default, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.label}
                      </div>
                    ))}
                  </>}
                  {otherSubs.map(([subName, blocks]) => (
                    <React.Fragment key={subName}>
                      <div style={{ fontSize: '9px', opacity: 0.35, padding: '2px 4px', fontWeight: 700 }}>{subName.toUpperCase()}</div>
                      {blocks.map(b => (
                        <div key={b.opcode} onMouseDown={e => onItemMouseDown(e, b)}
                          style={{ padding: '4px 8px', margin: '1px 0', borderRadius: 6, fontSize: '11px', fontWeight: 600, color: '#fff', cursor: 'grab', userSelect: 'none', background: b.color || BLOCK_COLORS.default, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {b.label}
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Block Editor (combined palette + canvas) ─────────────────────────────
const METHOD_LABELS = {
  useOn: 'Block Interaction', use: 'Interaction', continuousUse: 'Continuous Use',
  releaseUsing: 'Release Using', finishUsingItem: 'Finished Using',
  inventoryTick: 'Inventory Tick', hurtEnemy: 'Combat / Hurt Entity',
  interactLivingEntity: 'Entity Interaction',
  keybindPress: 'On Press', keybindRelease: 'On Release',
  abilityUse: 'On Use',
  entityPartHit: 'On Part Hit',
};

export default function BlockEditor({ itemId, keybindId, hudWidgetId, entityId, abilityId, methodKey, onBack }) {
  const stableId = hudWidgetId ? `hudwidget::${hudWidgetId}`
    : keybindId ? `keybind::${keybindId}::${methodKey}`
    : entityId ? `entity::${entityId}::${methodKey}`
    : abilityId ? `ability::${abilityId}::${methodKey}`
    : `item::${itemId}::${methodKey}`;
  const methodLabel = hudWidgetId ? 'HUD Value' : (METHOD_LABELS[methodKey] || methodKey);

  const canvasAreaRef = useRef(null);
  const panRef = useRef(null);
  const zoomRef = useRef(1);
  const [pan, setPan] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [nodes, setNodes] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + stableId);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [{ id: 'start', opcode: 'start', isAction: true, x: 0, y: 0, nextId: null, fields: {}, slots: {} }];
  });
  const initialSnapshot = useRef(JSON.stringify(nodes));
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null);
  const panningRef = useRef(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  panRef.current = pan;
  zoomRef.current = zoom;

  const [dataComponentOptions, setDataComponentOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const options = [];
      let itemDataComponents = [];
      if (itemId) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'items', id: itemId });
          const item = JSON.parse(raw);
          itemDataComponents = item.dataComponents || [];
        } catch {}
      }
      const attachedRefs = new Set(itemDataComponents.filter(dc => dc.kind === 'ref' && dc.ref).map(dc => dc.ref));
      if (attachedRefs.size > 0) {
        try {
          const globalIds = await invoke('list_ycs_data', { category: 'components' });
          for (const id of globalIds) {
            try {
              const raw = await invoke('load_ycs_data', { category: 'components', id });
              const c = JSON.parse(raw);
              if (!attachedRefs.has(c.name || id)) continue;
              options.push({
                value: c.name || id,
                label: `${c.name || id} (Global)`,
                compType: c.type,
                constName: c.name || id,
              });
            } catch {}
          }
        } catch {}
      }
      for (const dc of itemDataComponents) {
        if (dc.kind !== 'inline' || !dc.name) continue;
        const compId = `${itemId}_${dc.name}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        options.push({
          value: dc.name,
          label: dc.name,
          compType: dc.type,
          constName: compId,
        });
      }
      if (!cancelled) {
        dynamicDataComponentOptions = options;
        setDataComponentOptions(options);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [itemId]);

  const [entityVariableOptions, setEntityVariableOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const options = [];
      try {
        const ids = await invoke('list_ycs_data', { category: 'entityvars' });
        for (const id of ids) {
          try {
            const raw = await invoke('load_ycs_data', { category: 'entityvars', id });
            const v = JSON.parse(raw);
            options.push({
              value: v.name || id,
              label: v.name || id,
              varType: v.type,
              constName: v.name || id,
            });
          } catch {}
        }
      } catch {}
      if (!cancelled) {
        dynamicEntityVariableOptions = options;
        setEntityVariableOptions(options);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const [resourceOptions, setResourceOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const options = [];
      try {
        const ids = await invoke('list_ycs_data', { category: 'resources' });
        for (const id of ids) {
          try {
            const raw = await invoke('load_ycs_data', { category: 'resources', id });
            const resource = JSON.parse(raw);
            options.push({
              value: resource.id || id,
              label: resource.id === 'stamina' || id === 'stamina'
                ? `${resource.name || 'Stamina'} (Always Available)`
                : resource.name || resource.id || id,
            });
          } catch {}
        }
      } catch {}
      options.sort((a, b) => (a.value === 'stamina' ? -1 : b.value === 'stamina' ? 1 : a.label.localeCompare(b.label)));
      if (!cancelled) {
        dynamicResourceOptions = options;
        setResourceOptions(options);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const [vfxOptions, setVfxOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const options = [];
      try {
        const ids = await invoke('list_ycs_data', { category: 'vfx' });
        for (const id of ids) {
          try {
            const raw = await invoke('load_ycs_data', { category: 'vfx', id });
            const effect = JSON.parse(raw);
            options.push({ value: effect.id || id, label: effect.name || effect.id || id });
          } catch {}
        }
      } catch {}
      options.sort((a, b) => a.label.localeCompare(b.label));
      if (!cancelled) {
        dynamicVfxOptions = options;
        setVfxOptions(options);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const [modAttributeOptions, setModAttributeOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const options = [];
      try {
        const ids = await invoke('list_ycs_data', { category: 'attributes' });
        for (const id of ids) {
          try {
            const raw = await invoke('load_ycs_data', { category: 'attributes', id });
            const a = JSON.parse(raw);
            options.push({
              value: a.name || id,
              label: `${a.titleText || a.name || id} (mod)`,
            });
          } catch {}
        }
      } catch {}
      if (!cancelled) {
        dynamicModAttributeOptions = options;
        setModAttributeOptions(options);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const options = [];
      try {
        const ids = await invoke('list_textures');
        for (const id of ids) {
          try {
            const raw = await invoke('load_texture', { id });
            const tex = JSON.parse(raw);
            options.push({
              value: tex.id || id,
              label: tex.label || id,
              rows: tex.rows || 1,
              hasMask: !!tex.hasMask,
              hasEmissive: !!tex.hasEmissive,
              animatedOnUse: !!tex.animatedOnUse,
              ticksPerFrame: tex.ticksPerFrame || 4,
            });
          } catch {}
        }
      } catch {}
      if (!cancelled) dynamicTextureOptions = options;
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const addBlock = useCallback((block, wx, wy) => {
    const bdef = blockDefRegistry.get(block.opcode);
    const id = makeId();
    let defaultFields = {};
    if (bdef?.fields) for (const [k, f] of Object.entries(bdef.fields)) defaultFields[k] = f.default !== undefined ? f.default : '';
    let allSlotDefs = [];
    if (bdef) {
      const mainSlots = extractSlotDefs(parseLabel(bdef.label));
      const shapeSlots = bdef.shapeSlots ? Object.values(bdef.shapeSlots).flatMap(s => extractSlotDefs(parseLabel(s))) : [];
      const suffixSlots = bdef.suffixLabel ? extractSlotDefs(parseLabel(bdef.suffixLabel)) : [];
      const seen = new Set();
      allSlotDefs = [...mainSlots, ...shapeSlots, ...suffixSlots].filter(s => { if (seen.has(s.key)) return false; seen.add(s.key); return true; });
    }
    const slots = {};
    const extraNodes = [];
    allSlotDefs.forEach((sd, idx) => {
      const sdDefault = bdef?.codegen?.slotDefaults?.[sd.key];
      if (sdDefault) {
        const childId = makeId();
        const childBdef = blockDefRegistry.get(sdDefault.opcode);
        slots[sd.key] = childId;
        extraNodes.push({ id: childId, opcode: sdDefault.opcode, x: wx + 220, y: wy + idx * 60,
          nextId: null, linkType: childBdef?.linkType || null, isAction: false, fields: { ...(sdDefault.fields || {}) }, slots: {} });
      }
    });
    const newNode = { id, opcode: block.opcode, x: wx, y: wy, nextId: null,
      linkType: bdef?.linkType || block.linkType || null, isAction: bdef?.isAction || block.isAction || false, fields: defaultFields, slots };
    setNodes(ns => [...ns, newNode, ...extraNodes]);
    setSelected(id);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const { block, clientX, clientY } = e.detail;
      const el = canvasAreaRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
      const z = zoomRef.current; const p = panRef.current;
      if (!p) return;
      addBlock(block, (clientX - rect.left) / z - p.x, (clientY - rect.top) / z - p.y);
    };
    window.addEventListener('ycs-blocky-drop', handler);
    return () => window.removeEventListener('ycs-blocky-drop', handler);
  }, [addBlock]);

  useEffect(() => {
    if (pan !== null) return;
    const el = canvasAreaRef.current;
    if (!el) return;
    const startNode = nodesRef.current.find(n => n.id === 'start');
    if (!startNode) return;
    setPan({ x: el.clientWidth / 2 - startNode.x - 60, y: el.clientHeight / 2 - startNode.y - BLOCK_H / 2 });
  }, [pan]);

  const relayoutChains = useCallback(() => {
    requestAnimationFrame(() => {
      if (!canvasAreaRef.current) return;
      const canvasRect = canvasAreaRef.current.getBoundingClientRect();
      const z = zoomRef.current; const p = panRef.current;
      if (!p) return;
      const fixes = {};
      let needsUpdate = false;
      const visited = new Set();
      const walkChain = (startId) => {
        let prevId = startId;
        let prev = nodesRef.current.find(n => n.id === prevId);
        if (!prev) return;
        while (prev?.nextId) {
          if (visited.has(prev.nextId)) break;
          visited.add(prev.nextId);
          const next = nodesRef.current.find(n => n.id === prev.nextId);
          if (!next) break;
          const prevEl = canvasAreaRef.current?.querySelector(`[data-blockid="${prevId}"]`);
          if (prevEl) {
            const prevRect = prevEl.getBoundingClientRect();
            const expectedY = (prevRect.bottom - canvasRect.top) / z - p.y + 4;
            const currentY = next.y + (fixes[next.id] || 0);
            if (Math.abs(currentY - expectedY) > 2) {
              const dy = expectedY - currentY;
              [next.id, ...getDescendants(next.id, nodesRef.current)].forEach(did => { fixes[did] = (fixes[did] || 0) + dy; });
              needsUpdate = true;
            }
          }
          prevId = next.id; prev = next;
        }
      };
      const walkAll = (startId) => {
        let cur = startId;
        while (cur) {
          if (visited.has(cur)) break;
          const node = nodesRef.current.find(n => n.id === cur);
          if (!node) break;
          if (isBodyBlock(node)) { const bkeys = getBodyKeys(node); for (const bk of bkeys) { if (node.slots?.[bk]) walkChain(node.slots[bk]); } }
          cur = node.nextId;
        }
      };
      walkChain('start'); walkAll('start');
      if (needsUpdate) setNodes(ns => ns.map(n => fixes[n.id] !== undefined ? { ...n, y: n.y + fixes[n.id] } : n));
    });
  }, []);

  const handleFieldChange = useCallback((nodeId, field, value) => {
    setNodes(ns => ns.map(n => {
      if (n.id !== nodeId) return n;
      if (field === '__linkType') return { ...n, linkType: value };
      if (field === '__clearSlot') return { ...n, slots: { ...(n.slots || {}), [value]: null } };
      return { ...n, fields: { ...n.fields, [field]: value } };
    }));
    requestAnimationFrame(() => relayoutChains());
  }, [relayoutChains]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const el = canvasAreaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const oldZ = zoomRef.current;
    const nz = Math.min(Math.max(0.4, oldZ + delta), 2);
    if (nz === oldZ) return;
    setPan(p => ({ x: mx / nz - (mx / oldZ - p.x), y: my / nz - (my / oldZ - p.y) }));
    setZoom(nz);
  }, []);

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.button === 1 || (e.button === 0 && !e.target.closest('[data-blockid]'))) {
      panningRef.current = { startX: e.clientX, startY: e.clientY, startPan: { ...panRef.current } };
      setSelected(null);
    }
  }, []);

  const handleCanvasMouseMove = useCallback((e) => {
    if (panningRef.current) {
      const dx = e.clientX - panningRef.current.startX;
      const dy = e.clientY - panningRef.current.startY;
      const z = zoomRef.current;
      setPan({ x: panningRef.current.startPan.x + dx / z, y: panningRef.current.startPan.y + dy / z });
    }
    if (dragging) {
      const rect = canvasAreaRef.current.getBoundingClientRect();
      const z = zoomRef.current; const p = panRef.current;
      const wx = (e.clientX - rect.left) / z - p.x - dragging.offX;
      const wy = (e.clientY - rect.top) / z - p.y - dragging.offY;
      setNodes(ns => {
        const node = ns.find(n => n.id === dragging.id);
        if (!node) return ns;
        const dx = wx - node.x; const dy = wy - node.y;
        const desc = new Set([dragging.id, ...getDescendants(dragging.id, ns)]);
        return ns.map(n => desc.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n);
      });
    }
  }, [dragging]);

  const handleCanvasMouseUp = useCallback((e) => {
    if (dragging) {
      const dragNode = nodesRef.current.find(n => n.id === dragging.id);
      if (!dragNode) { panningRef.current = null; setDragging(null); return; }
      setNodes(ns => {
        let updated = [...ns];
        if (dragNode.isAction || dragNode.id === 'start') {
          if (dragNode.id !== 'start') {
            let bestDist = SNAP_THRESHOLD;
            let snapAction = null;
            const smx = e.clientX; const smy = e.clientY;
            let bestBodyDist = Infinity;
            const canvasEl = canvasAreaRef.current;
            (canvasEl ? canvasEl.querySelectorAll('[data-bodyslotkey]') : []).forEach(el => {
              const rect = el.getBoundingClientRect();
              const dx = Math.max(rect.left - smx, 0, smx - rect.right);
              const dy = Math.max(rect.top - smy, 0, smy - rect.bottom);
              const edgeDist = Math.hypot(dx, dy);
              if (edgeDist > SNAP_THRESHOLD || edgeDist >= bestBodyDist) return;
              const parentId = el.dataset.parentid; const slotKey = el.dataset.bodyslotkey;
              if (parentId === dragNode.id || getDescendants(dragNode.id, updated).includes(parentId)) return;
              const parentNode = updated.find(n => n.id === parentId);
              if (!parentNode) return;
              const existingChild = parentNode.slots?.[slotKey];
              if (existingChild) {
                let tail = existingChild;
                while (true) { const tn = updated.find(n => n.id === tail); if (!tn?.nextId) break; tail = tn.nextId; }
                const tailNode = updated.find(n => n.id === tail);
                if (tailNode && !tailNode.nextId && tail !== dragNode.id) { bestBodyDist = edgeDist; snapAction = { type: 'chain', targetId: tail }; }
              } else { bestBodyDist = edgeDist; snapAction = { type: 'body', parentId, slotKey }; }
            });
            if (!snapAction) {
              for (const n of updated) {
                if (n.id === dragNode.id || (!n.isAction && n.id !== 'start') || getDescendants(dragNode.id, updated).includes(n.id) || n.nextId) continue;
                const nEl = canvasEl?.querySelector(`[data-blockid="${n.id}"]`);
                if (!nEl) continue;
                const nRect = nEl.getBoundingClientRect();
                const d = Math.hypot(smx - (nRect.left + 20), smy - nRect.bottom);
                if (d < bestDist) { bestDist = d; snapAction = { type: 'chain', targetId: n.id }; }
              }
            }
            if (snapAction?.type === 'body') {
              updated = updated.map(n => n.id === snapAction.parentId ? { ...n, slots: { ...(n.slots || {}), [snapAction.slotKey]: dragNode.id } } : n);
            } else if (snapAction?.type === 'chain') {
              updated = updated.map(n => n.id === snapAction.targetId ? { ...n, nextId: dragNode.id } : n);
              const target = updated.find(n => n.id === snapAction.targetId);
              if (target) {
                const tEl = canvasEl?.querySelector(`[data-blockid="${target.id}"]`);
                if (tEl) {
                  const canvasRect = canvasAreaRef.current?.getBoundingClientRect();
                  const z = zoomRef.current; const p = panRef.current;
                  if (canvasRect && p) {
                    const tRect = tEl.getBoundingClientRect();
                    const snapY = (tRect.bottom - canvasRect.top) / z - p.y + 4;
                    const dx = target.x - dragNode.x; const dy = snapY - dragNode.y;
                    const desc = new Set([dragNode.id, ...getDescendants(dragNode.id, updated)]);
                    updated = updated.map(n => desc.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n);
                  }
                }
              }
            }
          }
        } else if (dragNode.linkType) {
          let best = null; let bestDist = 50;
          const smx = e.clientX; const smy = e.clientY;
          (canvasAreaRef.current?.querySelectorAll('.slot-conn') || []).forEach(el => {
            if (el.dataset.nodeid === dragNode.id) return;
            const rect = el.getBoundingClientRect();
            const d = Math.hypot(smx - (rect.left + rect.width / 2), smy - (rect.top + rect.height / 2));
            if (d < bestDist) { bestDist = d; best = { nodeId: el.dataset.nodeid, sk: el.dataset.sk }; }
          });
          if (best) {
            const parentNode = updated.find(n => n.id === best.nodeId);
            if (parentNode) {
              const parentBdef = blockDefRegistry.get(parentNode.opcode);
              let accepts = null;
              if (parentBdef) {
                const dynAccepts = getDynamicAccepts(parentBdef, parentNode, best.sk);
                if (dynAccepts) { accepts = dynAccepts; }
                else if (/^condition\d+$/.test(best.sk)) { accepts = 'logic'; }
                else if (/^col(Radius|Width|Height|Depth)$/.test(best.sk)) { accepts = 'number'; }
                else {
                  const rsMatch = parentBdef.repeatableSlots && best.sk.startsWith(parentBdef.repeatableSlots.key);
                  if (rsMatch) { accepts = parentBdef.repeatableSlots.accepts || 'text'; }
                  else {
                    let allSegs = parseLabel(parentBdef.label);
                    if (parentBdef.shapeSlots) Object.values(parentBdef.shapeSlots).forEach(s => { allSegs = allSegs.concat(parseLabel(s)); });
                    if (parentBdef.suffixLabel) allSegs = allSegs.concat(parseLabel(parentBdef.suffixLabel));
                    const slotSeg = allSegs.find(s => s.type === 'slot' && s.key === best.sk);
                    if (slotSeg) accepts = slotSeg.accepts;
                  }
                }
              }
              if (accepts === dragNode.linkType) {
                updated = updated.map(n => n.id === parentNode.id ? { ...n, slots: { ...(n.slots || {}), [best.sk]: dragNode.id } } : n);
              }
            }
          }
        }
        return updated;
      });
      requestAnimationFrame(() => requestAnimationFrame(() => relayoutChains()));
    }
    panningRef.current = null;
    setDragging(null);
  }, [dragging, relayoutChains]);

  useEffect(() => {
    window.addEventListener('mousemove', handleCanvasMouseMove);
    window.addEventListener('mouseup', handleCanvasMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleCanvasMouseMove);
      window.removeEventListener('mouseup', handleCanvasMouseUp);
    };
  }, [handleCanvasMouseMove, handleCanvasMouseUp]);

  const handleBlockMouseDown = useCallback((e, nid) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setSelected(nid);
    const rect = e.currentTarget.getBoundingClientRect();
    const z = zoomRef.current;
    const offX = (e.clientX - rect.left) / z;
    const offY = (e.clientY - rect.top) / z;
    setNodes(ns => {
      let updated = [...ns];
      let wasSlotted = false;
      for (const n of updated) {
        if (n.slots) { for (const k in n.slots) { if (n.slots[k] === nid) { wasSlotted = true; break; } } }
        if (wasSlotted) break;
      }
      updated = updated.map(n => n.nextId === nid ? { ...n, nextId: null } : n);
      updated = updated.map(n => {
        if (!n.slots) return n;
        const newSlots = { ...n.slots }; let changed = false;
        for (const k in newSlots) { if (newSlots[k] === nid) { newSlots[k] = null; changed = true; } }
        return changed ? { ...n, slots: newSlots } : n;
      });
      if (wasSlotted) {
        const canvasRect = canvasAreaRef.current?.getBoundingClientRect();
        if (canvasRect) {
          const p = panRef.current;
          const wx = (e.clientX - canvasRect.left) / z - p.x - offX;
          const wy = (e.clientY - canvasRect.top) / z - p.y - offY;
          updated = updated.map(n => n.id === nid ? { ...n, x: wx, y: wy } : n);
        }
      }
      const desc = new Set([nid, ...getDescendants(nid, updated)]);
      return [...updated.filter(n => !desc.has(n.id)), ...updated.filter(n => desc.has(n.id))];
    });
    setDragging({ id: nid, offX, offY });
  }, []);

  const handleDelete = useCallback((nid) => {
    if (nid === 'start') return;
    setNodes(ns => {
      const ch = new Set([nid, ...getDescendants(nid, ns)]);
      return ns.filter(n => !ch.has(n.id)).map(n => {
        let next = n;
        if (n.nextId && ch.has(n.nextId)) next = { ...next, nextId: null };
        if (n.slots) {
          const newSlots = { ...n.slots }; let changed = false;
          for (const k in newSlots) { if (ch.has(newSlots[k])) { newSlots[k] = null; changed = true; } }
          if (changed) next = { ...next, slots: newSlots };
        }
        return next;
      });
    });
    setSelected(null);
  }, []);

  const clipboardRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && selected !== 'start') handleDelete(selected);
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selected && selected !== 'start') {
        e.preventDefault();
        const ns = nodesRef.current; const node = ns.find(n => n.id === selected);
        if (!node) return;
        const descIds = new Set([selected, ...getDescendants(selected, ns)]);
        clipboardRef.current = ns.filter(n => descIds.has(n.id)).map(n => ({ ...n }));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboardRef.current) {
        e.preventDefault();
        const idMap = {};
        clipboardRef.current.forEach(n => { idMap[n.id] = makeId(); });
        const pasted = clipboardRef.current.map(n => ({
          ...n, id: idMap[n.id], x: (n.x || 0) + 40, y: (n.y || 0) + 40,
          nextId: n.nextId ? (idMap[n.nextId] || null) : null,
          slots: n.slots ? Object.fromEntries(Object.entries(n.slots).map(([k, v]) => [k, v ? (idMap[v] || null) : null])) : {},
          fields: { ...(n.fields || {}) },
        }));
        setNodes(ns => [...ns, ...pasted]);
        setSelected(pasted[0]?.id || null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, handleDelete]);

  const getChain = useCallback(() => {
    const chain = new Set();
    const walkChain = (startId) => {
      let cur = startId;
      while (cur) {
        if (chain.has(cur)) break;
        chain.add(cur);
        const node = nodesRef.current.find(n => n.id === cur);
        if (node?.slots && isBodyBlock(node)) { for (const k in node.slots) { if (node.slots[k]) walkChain(node.slots[k]); } }
        cur = node?.nextId || null;
      }
    };
    walkChain('start');
    return chain;
  }, []);

  const chain = getChain();

  const slottedIds = useMemo(() => {
    const s = new Set();
    const addChain = (startId) => {
      let cur = startId;
      while (cur) {
        if (s.has(cur)) break; s.add(cur);
        const n = nodes.find(nd => nd.id === cur);
        if (n) addSlotted(n.id);
        cur = n?.nextId || null;
      }
    };
    const addSlotted = (nid) => {
      const node = nodes.find(n => n.id === nid);
      if (!node?.slots) return;
      const bdef = blockDefRegistry.get(node.opcode);
      const bodyKeySet = new Set(getBodyKeys(node, bdef));
      for (const k in node.slots) {
        const cid = node.slots[k];
        if (cid) { if (bodyKeySet.has(k)) { addChain(cid); } else { s.add(cid); addSlotted(cid); } }
      }
    };
    nodes.forEach(n => addSlotted(n.id));
    return s;
  }, [nodes]);

  const onPaletteItemMouseDown = (e, block) => {
    e.preventDefault();
    window.__blockyDragBlock = { block, startX: e.clientX, startY: e.clientY };
    const onMove = (me) => {
      const d = window.__blockyDragBlock;
      if (!d) return;
      if (!d.ghost) {
        if (Math.abs(me.clientX - d.startX) + Math.abs(me.clientY - d.startY) < 5) return;
        const ghost = document.createElement('div');
        ghost.textContent = d.block.label;
        ghost.style.cssText = `position:fixed;pointer-events:none;z-index:99999;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;color:#fff;background:${d.block.color || '#5a9a6a'};opacity:0.85;white-space:nowrap;`;
        document.body.appendChild(ghost);
        d.ghost = ghost;
      }
      d.ghost.style.left = me.clientX + 8 + 'px';
      d.ghost.style.top = me.clientY + 8 + 'px';
    };
    const onUp = (ue) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const d = window.__blockyDragBlock;
      if (d?.ghost) {
        d.ghost.remove();
        window.dispatchEvent(new CustomEvent('ycs-blocky-drop', { detail: { block: d.block, clientX: ue.clientX, clientY: ue.clientY } }));
      }
      window.__blockyDragBlock = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  if (pan === null) {
    return <div ref={canvasAreaRef} style={{ position: 'relative', width: '100%', height: '100%' }} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--ycs-foreground)' }}>
        <button className="ycs-button icon" onClick={() => { setNodes(JSON.parse(initialSnapshot.current)); onBack && onBack(); }} title="Cancel">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M10 12L6 8l4-4"/></svg>
        </button>
        <span style={{ fontSize: '13px', opacity: 0.4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Method</span>
        <span style={{ fontSize: '14px', fontWeight: 500, flex: 1 }}>{methodLabel}</span>
        <button className="ycs-button" onClick={() => {
          const data = JSON.stringify(nodesRef.current);
          localStorage.setItem(STORAGE_PREFIX + stableId, data);
          initialSnapshot.current = data;
        }}>Save</button>
        <button className="ycs-button" onClick={() => {
          const data = JSON.stringify(nodesRef.current);
          localStorage.setItem(STORAGE_PREFIX + stableId, data);
          initialSnapshot.current = data;
          onBack && onBack();
        }}>Save & Close</button>
      </div>

      {/* Body: palette + canvas */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <BlockPalette onItemMouseDown={onPaletteItemMouseDown} />

        <div ref={canvasAreaRef}
          style={{ position: 'relative', flex: 1, overflow: 'hidden', backgroundColor: 'transparent', minHeight: 0 }}
          onMouseDown={handleCanvasMouseDown}
          onWheel={handleWheel}
          onDragOver={e => e.preventDefault()}
          onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, zIndex: 3,
            transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
            <div style={{ position: 'absolute', left: pan.x, top: pan.y }}>
              {nodes.map(node => {
                if (slottedIds.has(node.id)) return null;
                return (
                  <CanvasBlock key={node.id} node={node} nodes={nodes} inChain={chain.has(node.id)}
                    selected={selected} onSelect={setSelected} onBlockMouseDown={handleBlockMouseDown}
                    onFieldChange={handleFieldChange} />
                );
              })}
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 8, right: 8, fontSize: '10px',
            color: 'var(--ycs-text)', opacity: 0.3, pointerEvents: 'none', zIndex: 4 }}>
            {Math.round(zoom * 100)}%
          </div>
        </div>
      </div>

    </div>
  );
}
