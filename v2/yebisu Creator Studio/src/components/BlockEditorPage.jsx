import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { BLOCK_DEFS, blockDefRegistry } from '../codegen/visual/blockDefs.js';
import { parseLabel, extractSlotDefs } from '../codegen/visual/labelParser.js';

const STORAGE_PREFIX = 'ycs-blocky::';

const DROPDOWN_SOURCES = {
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
    { label: '[Mod] Stun', value: 'ModEffects.STUN' },
    { label: '[Mod] Root', value: 'ModEffects.ROOT' },
  ],
};

function evalCondition(cond, fields) {
  const eqMatch = cond.match(/^(\w+)\s*==\s*'([^']*)'$/);
  if (eqMatch) return (fields?.[eqMatch[1]] ?? "") === eqMatch[2];
  const neqMatch = cond.match(/^(\w+)\s*!=\s*'([^']*)'$/);
  if (neqMatch) return (fields?.[neqMatch[1]] ?? "") !== neqMatch[2];
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

function getBlockColor(node, bdef, inChain) {
  if (node.id === 'start') return BLOCK_COLORS.start;
  if (!inChain && (node.isAction || node.id === 'start')) return BLOCK_COLORS.disconnected;
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

// ── Portal Dropdown (renders outside zoom transform) ───────────────────
function PortalDropdown({ value, options, onChange, compact, transparent, minWidth: mw }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const anchorRef = useRef(null);
  const selected = options.find(o => o.value === value) || options[0];
  const openDrop = (e) => {
    e.stopPropagation();
    if (!open) { const r = anchorRef.current?.getBoundingClientRect(); if (r) setRect(r); }
    setOpen(o => !o);
  };
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const list = open && rect ? ReactDOM.createPortal(
    <div onWheel={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
      style={{ position: 'fixed', top: rect.bottom + 2, left: rect.left, zIndex: 99999,
        background: 'var(--ycs-accent-solid, #323233)', border: '1px solid var(--ycs-foreground)',
        borderRadius: 5, minWidth: Math.max(mw || 80, rect.width), maxHeight: 220,
        display: 'flex', flexDirection: 'column', boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)', overflow: 'hidden' }}>
      <div style={{ overflowY: 'auto', maxHeight: 200 }}>
        {options.map(o => (
          <div key={o.value} className="dropdown-item" onMouseDown={e => { e.stopPropagation(); onChange(o.value); setOpen(false); }}
            style={{ padding: '0 10px', fontSize: 12, color: o.value === value ? 'var(--ycs-highlight)' : 'var(--ycs-text)',
              cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {o.label}
          </div>
        ))}
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

// ── SlotConn (Scratch-like value slot) ─────────────────────────────────
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

// ── Single Segment Renderer ───────────────────────────────────────────
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
    const options = fieldDef?.options || (fieldDef?.source && DROPDOWN_SOURCES[fieldDef.source]) || [];
    if (options.length > 0) {
      return <PortalDropdown key={i} value={node.fields?.[seg.key] ?? fieldDef?.default ?? ''}
        onChange={v => onFieldChange && onFieldChange(nodeId, seg.key, v)}
        compact={fieldDef?.compact} transparent={transp} minWidth={fieldDef?.minWidth || 60} options={options} />;
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

// ── Full Block Content (handles multiline, shapeSlots, repeatableSlots, suffixLabel) ──
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

// ── Settings Portal (renders popup outside zoom transform) ────────────
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

// ── Settings Popup Content (renders fields from bdef.settings) ────────
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
          if (s.type === 'dropdown') {
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--ycs-text)', fontSize: 12 }}>{s.label}</span>
                <select className="ycs-select inline" value={node.fields?.[key] ?? s.default ?? ''}
                  onChange={e => { e.stopPropagation(); onFieldChange?.(node.id, key, e.target.value); }}
                  onMouseDown={e => e.stopPropagation()}>
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

// ── Body Block Slot (the indented body region for if/delay/forEach) ───
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

// ── Animation Bitmask Settings (custom per-part table) ────────────────
const ANIM_OPCODES = new Set(['anim.firstperson.play', 'anim.thirdperson.play', 'anim.tppose.set', 'anim.handpose.set']);

function AnimationSettingsPopup({ node, onFieldChange, showSettings, setShowSettings, anchorRef }) {
  const op = node.opcode;
  if (!ANIM_OPCODES.has(op)) return null;

  const isFP = op === 'anim.firstperson.play';
  const isTP = op === 'anim.thirdperson.play';
  const isTPPose = op === 'anim.tppose.set';
  const isHandPose = op === 'anim.handpose.set';

  if (isHandPose) {
    const checked = !!node.fields?.allowVanillaActions;
    return (
      <SettingsPortal open={showSettings} onClose={() => setShowSettings(false)} anchorRef={anchorRef}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ycs-text)', fontSize: 12, cursor: 'pointer' }}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onFieldChange?.(node.id, 'allowVanillaActions', !checked); }}>
          <input type="checkbox" className="ycs-checkbox" checked={checked} onChange={() => {}} />
          Allow Vanilla Actions
        </label>
      </SettingsPortal>
    );
  }

  const handMask = node.fields?.handMask || 0;
  const lookMask = node.fields?.lookAtMask || 0;
  const vanMask = node.fields?.vanillaMask || 0;
  const actMask = node.fields?.allowActionsMask || 0;
  const keepMask = node.fields?.keepPosScaleMask || 0;
  const fpMask = node.fields?.fpViewMask || 0;

  const MaskCB = ({ field, mask, bit, inverted, disabled, opacity }) => (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'default' : 'pointer', opacity: opacity ?? 1 }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); if (!disabled) onFieldChange?.(node.id, field, mask ^ bit); }}>
      <input type="checkbox" className="ycs-checkbox" checked={inverted ? !(mask & bit) : !!(mask & bit)} disabled={disabled} onChange={() => {}} />
    </label>
  );

  const tdC = { textAlign: 'center', padding: '1px 6px' };
  const hdC = { color: 'var(--ycs-text)', opacity: 0.5, fontSize: 11, padding: '0 6px', textAlign: 'center' };
  const bdC = { borderLeft: '1px solid var(--ycs-foreground)' };

  if (isFP) {
    return (
      <SettingsPortal open={showSettings} onClose={() => setShowSettings(false)} anchorRef={anchorRef}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, color: 'var(--ycs-text)' }}>
          <thead><tr>
            <td style={{ paddingRight: 8 }}></td>
            <td style={hdC}>Hand</td>
          </tr></thead>
          <tbody>
            <tr><td style={{ paddingRight: 8, fontSize: 12 }}>Right Arm</td><td style={tdC}><MaskCB field="handMask" mask={handMask} bit={512} inverted /></td></tr>
            <tr><td style={{ paddingRight: 8, fontSize: 12 }}>Left Arm</td><td style={tdC}><MaskCB field="handMask" mask={handMask} bit={1024} inverted /></td></tr>
          </tbody>
        </table>
      </SettingsPortal>
    );
  }

  // Third person play or pose
  const rootYawOn = !!(lookMask & (1 << 12));
  const rootPitchOn = !!(lookMask & (1 << 13));
  const rootActive = rootYawOn || rootPitchOn;
  const parts = [
    { label: 'Right Arm', lookBase: 4, vanBit: 4, handBit: 512 },
    { label: 'Left Arm', lookBase: 6, vanBit: 8, handBit: 1024 },
    { label: 'Right Leg', lookBase: 8, vanBit: 16 },
    { label: 'Left Leg', lookBase: 10, vanBit: 32 },
  ];

  return (
    <SettingsPortal open={showSettings} onClose={() => setShowSettings(false)} anchorRef={anchorRef}>
      <table style={{ borderCollapse: 'collapse', fontSize: 12, color: 'var(--ycs-text)' }}>
        <thead><tr>
          <td style={{ paddingRight: 8 }}></td>
          <td style={hdC}>Hand</td>
          <td style={{ ...hdC, ...bdC }}>Yaw</td>
          <td style={{ ...hdC, ...bdC }}>Pitch</td>
          <td style={{ ...hdC, ...bdC }}>Animation</td>
          {isTPPose && <td style={{ ...hdC, ...bdC }}>Allow Act</td>}
          {isTPPose && <td style={{ ...hdC, ...bdC }}>Keep Pos</td>}
          <td style={{ ...hdC, ...bdC }}>FP View</td>
        </tr></thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid var(--ycs-foreground)' }}>
            <td style={{ paddingRight: 8, fontWeight: 700, opacity: 0.7, fontSize: 12 }}>Root (Face Cam)</td>
            <td style={tdC}></td>
            <td style={{ ...tdC, ...bdC }}><MaskCB field="lookAtMask" mask={lookMask} bit={1 << 12} /></td>
            <td style={{ ...tdC, ...bdC }}><MaskCB field="lookAtMask" mask={lookMask} bit={1 << 13} /></td>
            <td style={{ ...tdC, ...bdC }}></td>
            {isTPPose && <td style={{ ...tdC, ...bdC }}></td>}
            {isTPPose && <td style={{ ...tdC, ...bdC }}></td>}
            <td style={{ ...tdC, ...bdC }}></td>
          </tr>
          {parts.map(({ label, lookBase, vanBit, handBit }) => (
            <tr key={label}>
              <td style={{ paddingRight: 8, fontSize: 12 }}>{label}</td>
              <td style={tdC}>{handBit ? <MaskCB field="handMask" mask={handMask} bit={handBit} inverted /> : null}</td>
              <td style={{ ...tdC, ...bdC, opacity: rootActive ? 0.35 : 1 }}><MaskCB field="lookAtMask" mask={lookMask} bit={1 << lookBase} /></td>
              <td style={{ ...tdC, ...bdC, opacity: rootActive ? 0.35 : 1 }}><MaskCB field="lookAtMask" mask={lookMask} bit={1 << (lookBase + 1)} /></td>
              <td style={{ ...tdC, ...bdC }}><MaskCB field="vanillaMask" mask={vanMask} bit={vanBit} /></td>
              {isTPPose && <td style={{ ...tdC, ...bdC }}><MaskCB field="allowActionsMask" mask={actMask} bit={vanBit} /></td>}
              {isTPPose && <td style={{ ...tdC, ...bdC }}><MaskCB field="keepPosScaleMask" mask={keepMask} bit={vanBit} disabled={!(actMask & vanBit)} opacity={(actMask & vanBit) ? 1 : 0.35} /></td>}
              <td style={{ ...tdC, ...bdC }}><MaskCB field="fpViewMask" mask={fpMask} bit={vanBit} /></td>
            </tr>
          ))}
          <tr style={{ borderTop: '1px solid var(--ycs-foreground)' }}>
            <td style={{ paddingRight: 8, fontSize: 12 }}>Head</td>
            <td style={tdC}></td>
            <td style={{ ...tdC, ...bdC }}></td><td style={{ ...tdC, ...bdC }}></td>
            <td style={{ ...tdC, ...bdC }}><MaskCB field="vanillaMask" mask={vanMask} bit={1} /></td>
            {isTPPose && <td style={{ ...tdC, ...bdC }}><MaskCB field="allowActionsMask" mask={actMask} bit={1} /></td>}
            {isTPPose && <td style={{ ...tdC, ...bdC }}><MaskCB field="keepPosScaleMask" mask={keepMask} bit={1} disabled={!(actMask & 1)} opacity={(actMask & 1) ? 1 : 0.35} /></td>}
            <td style={{ ...tdC, ...bdC }}><MaskCB field="fpViewMask" mask={fpMask} bit={1} /></td>
          </tr>
          <tr>
            <td style={{ paddingRight: 8, fontSize: 12 }}>Torso</td>
            <td style={tdC}></td>
            <td style={{ ...tdC, ...bdC }}></td><td style={{ ...tdC, ...bdC }}></td>
            <td style={{ ...tdC, ...bdC }}><MaskCB field="vanillaMask" mask={vanMask} bit={2} /></td>
            {isTPPose && <td style={{ ...tdC, ...bdC }}><MaskCB field="allowActionsMask" mask={actMask} bit={2} /></td>}
            {isTPPose && <td style={{ ...tdC, ...bdC }}><MaskCB field="keepPosScaleMask" mask={keepMask} bit={2} disabled={!(actMask & 2)} opacity={(actMask & 2) ? 1 : 0.35} /></td>}
            <td style={{ ...tdC, ...bdC }}><MaskCB field="fpViewMask" mask={fpMask} bit={2} /></td>
          </tr>
          <tr style={{ borderTop: '1px solid var(--ycs-foreground)' }}>
            <td style={{ paddingRight: 8, fontSize: 12 }}>Disable Crouch</td>
            <td style={tdC}></td>
            <td style={{ ...tdC, ...bdC }}></td><td style={{ ...tdC, ...bdC }}></td>
            <td style={{ ...tdC, ...bdC }}><MaskCB field="vanillaMask" mask={vanMask} bit={64} /></td>
            {isTPPose && <td style={{ ...tdC, ...bdC }}></td>}
            {isTPPose && <td style={{ ...tdC, ...bdC }}></td>}
            <td style={{ ...tdC, ...bdC }}></td>
          </tr>
          <tr>
            <td style={{ paddingRight: 8, fontSize: 12 }}>Disable Sitting</td>
            <td style={tdC}></td>
            <td style={{ ...tdC, ...bdC }}></td><td style={{ ...tdC, ...bdC }}></td>
            <td style={{ ...tdC, ...bdC }}><MaskCB field="vanillaMask" mask={vanMask} bit={256} /></td>
            {isTPPose && <td style={{ ...tdC, ...bdC }}></td>}
            {isTPPose && <td style={{ ...tdC, ...bdC }}></td>}
            <td style={{ ...tdC, ...bdC }}></td>
          </tr>
          <tr>
            <td style={{ paddingRight: 8, fontSize: 12 }}>Disable Prone</td>
            <td style={tdC}></td>
            <td style={{ ...tdC, ...bdC }}></td><td style={{ ...tdC, ...bdC }}></td>
            <td style={{ ...tdC, ...bdC }}><MaskCB field="vanillaMask" mask={vanMask} bit={128} /></td>
            {isTPPose && <td style={{ ...tdC, ...bdC }}></td>}
            {isTPPose && <td style={{ ...tdC, ...bdC }}></td>}
            <td style={{ ...tdC, ...bdC }}></td>
          </tr>
        </tbody>
      </table>
    </SettingsPortal>
  );
}

// ── Canvas Block (renders a single block, either standalone or inline) ─
function CanvasBlock({ node, nodes, inChain, selected, onSelect, onBlockMouseDown, onFieldChange, inline, bodyInline }) {
  const bdef = blockDefRegistry.get(node.opcode);
  const isStart = node.id === 'start';
  const isAct = node.isAction || isStart;
  const isVal = !!node.linkType;
  const bg = getBlockColor(node, bdef, inChain);

  const [showSettings, setShowSettings] = useState(false);
  const settingsAnchorRef = useRef(null);

  const isAnimBlock = ANIM_OPCODES.has(node.opcode);
  const hasSettings = isAnimBlock || (bdef?.settings && Object.keys(bdef.settings).some(k => !k.startsWith('_') ? bdef.settings[k].type !== 'hidden' : k === '_actions'));
  const hasBody = isBodyBlock(node, bdef);
  const bodyToggles = (!bdef?.bodyConfig && bdef?.settings?._actions) ? bdef.settings._actions.filter(a => a.onClick?.action === 'toggle').map(a => a.onClick.field) : [];
  const showBody = hasBody && (bodyToggles.length === 0 || bodyToggles.some(f => !!(node.fields?.[f])));
  const isIf = bdef?.bodyConfig?.type === 'if';

  const startBdef = isStart ? { label: 'Start' } : bdef;
  const contentProps = { bdef: startBdef, node, nodes, onFieldChange, nodeId: node.id, onSelect, selected, onBlockMouseDown };

  // Inline value block (rendered inside a parent's SlotConn)
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

  const settingsPopup = isAnimBlock
    ? <AnimationSettingsPopup node={node} onFieldChange={onFieldChange} showSettings={showSettings} setShowSettings={setShowSettings} anchorRef={settingsAnchorRef} />
    : <BlockSettingsPopup bdef={bdef} node={node} onFieldChange={onFieldChange} showSettings={showSettings} setShowSettings={setShowSettings} anchorRef={settingsAnchorRef} />;

  // Body block (if/delay/forEach) — renders as compound with body slots
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
          <div style={{
            position: 'absolute', top: -6, right: -6, width: 14, height: 14,
            borderRadius: '50%', background: '#e11d48', fontSize: '9px',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, zIndex: 10,
          }}>!</div>
        )}
        {settingsPopup}

        {/* Header row */}
        <div style={{
          minHeight: BLOCK_H, background: bg, borderRadius: `${BLOCK_RADIUS}px ${BLOCK_RADIUS}px 0 0`,
          display: 'flex', alignItems: 'center', padding: '0 10px', gap: 10, cursor: 'grab',
          border: sel2, boxSizing: 'border-box',
        }}>
          <BlockContent {...contentProps} settingsGear={settingsGear} />
        </div>

        {/* Dash: On Collision section */}
        {isDash && dashHasCol && (() => {
          const colShape = node.fields?.collisionShape || 'sphere';
          return <>
            <div style={{
              minHeight: BLOCK_H, background: bg, display: 'flex', alignItems: 'center',
              padding: '0 10px', gap: 10,
              borderLeft: sel2, borderRight: sel2, boxSizing: 'border-box',
            }}>
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

        {/* Dash: Then section */}
        {isDash && dashHasThen && (
          <>
            <div style={{
              minHeight: BLOCK_H, background: bg, display: 'flex', alignItems: 'center',
              padding: '0 10px',
              borderLeft: sel2, borderRight: sel2, boxSizing: 'border-box',
            }}>
              <span style={{ fontSize: 14, fontFamily: 'sans-serif', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>Then</span>
            </div>
            <div style={bodyWrap}>
              <BodySlot slotKey={dashThenSlot} parentId={node.id} slotId={node.slots?.[dashThenSlot]} nodes={nodes} inChain={inChain} selected={selected}
                onSelect={onSelect} onBlockMouseDown={onBlockMouseDown} onFieldChange={onFieldChange} />
            </div>
          </>
        )}

        {/* Non-dash: Primary body slot (do0) */}
        {!isDash && (
          <div style={bodyWrap}>
            <BodySlot slotKey="do0" parentId={node.id} slotId={node.slots?.do0} nodes={nodes} inChain={inChain} selected={selected}
              onSelect={onSelect} onBlockMouseDown={onBlockMouseDown} onFieldChange={onFieldChange} />
          </div>
        )}

        {/* Else If branches (if block) */}
        {isIf && Array.from({ length: elseIfCount }).map((_, i) => (
          <React.Fragment key={`elif-${i}`}>
            <div style={{
              minHeight: BLOCK_H, background: bg, display: 'flex', alignItems: 'center',
              padding: '0 10px', gap: 10,
              borderLeft: sel2, borderRight: sel2, boxSizing: 'border-box',
            }}>
              <span style={{ fontSize: 14, fontFamily: 'sans-serif', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>Else If</span>
              <SlotConn sk={`condition${i + 1}`} connId={node.slots?.[`condition${i + 1}`]} nodes={nodes}
                onFieldChange={onFieldChange} nodeId={node.id} onSelect={onSelect} selected={selected} onBlockMouseDown={onBlockMouseDown} />
            </div>
            <div style={bodyWrap}>
              <BodySlot slotKey={`do${i + 1}`} parentId={node.id} slotId={node.slots?.[`do${i + 1}`]} nodes={nodes} inChain={inChain} selected={selected}
                onSelect={onSelect} onBlockMouseDown={onBlockMouseDown} onFieldChange={onFieldChange} />
            </div>
          </React.Fragment>
        ))}

        {/* Else branch (if block) */}
        {isIf && hasElse && (
          <>
            <div style={{
              minHeight: BLOCK_H, background: bg, display: 'flex', alignItems: 'center',
              padding: '0 10px',
              borderLeft: sel2, borderRight: sel2, boxSizing: 'border-box',
            }}>
              <span style={{ fontSize: 14, fontFamily: 'sans-serif', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>Else</span>
            </div>
            <div style={bodyWrap}>
              <BodySlot slotKey="doElse" parentId={node.id} slotId={node.slots?.doElse} nodes={nodes} inChain={inChain} selected={selected}
                onSelect={onSelect} onBlockMouseDown={onBlockMouseDown} onFieldChange={onFieldChange} />
            </div>
          </>
        )}

        {/* Bottom cap */}
        <div style={{
          height: 12, background: bg, borderRadius: `0 0 ${BLOCK_RADIUS}px ${BLOCK_RADIUS}px`,
          borderLeft: sel2, borderRight: sel2,
          borderBottom: sel2, boxSizing: 'border-box',
        }} />
      </div>
    );
  }

  // Body-inline action block (rendered inside a BodySlot, not absolutely positioned)
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

  // Standard action or value block
  return (
    <div
      data-blockid={node.id}
      onMouseDown={e => { if (e.button !== 0) return; e.stopPropagation(); onSelect?.(node.id); onBlockMouseDown?.(e, node.id); }}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        minWidth: isVal ? 50 : undefined,
        width: 'fit-content',
        minHeight: isVal ? undefined : BLOCK_H,
        height: isVal ? 'auto' : undefined,
        display: 'flex',
        alignItems: 'center',
        padding: isVal ? '8px 10px' : '0 10px',
        gap: 10,
        background: bg,
        borderRadius: BLOCK_RADIUS,
        cursor: 'grab',
        userSelect: 'none',
        opacity: (!inChain && isAct && !isStart) ? 0.6 : 1,
        border: selected === node.id ? '2px solid #fff' : '2px solid transparent',
        boxSizing: 'border-box',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
        zIndex: isVal ? 100 : (!inChain ? 50 : (node.depth || 1)),
      }}
    >
      {isVal && (
        <div style={{
          position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)',
          width: 10, height: 20, borderRadius: '10px 0 0 10px', background: bg,
        }} />
      )}
      {!inChain && isAct && !isStart && (
        <div style={{
          position: 'absolute', top: -6, right: -6, width: 14, height: 14,
          borderRadius: '50%', background: '#e11d48', fontSize: '9px',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700,
        }}>!</div>
      )}
      <BlockContent {...contentProps} settingsGear={settingsGear} />
      {settingsPopup}
    </div>
  );
}

// ── Block Palette (child tile, spawns on the left) ──────────────────────
export function BlockPalettePage() {
  const [openCats, setOpenCats] = useState({});
  const toggle = (cat) => setOpenCats(p => ({ ...p, [cat]: !p[cat] }));
  const palette = useMemo(() => buildPaletteFromDefs(), []);

  const onItemMouseDown = (e, block) => {
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
        window.dispatchEvent(new CustomEvent('ycs-blocky-drop', {
          detail: { block: d.block, clientX: ue.clientX, clientY: ue.clientY }
        }));
      }
      window.__blockyDragBlock = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column',
        backgroundColor: 'transparent', color: 'var(--ycs-text)',
      }}>
        <div style={{ padding: '8px 12px', flexShrink: 0, borderBottom: '1px solid var(--ycs-foreground)' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>Palette</h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '4px 0' }}>
          {Object.entries(palette).map(([cat, subs]) => {
            const data = subs.data || [];
            const actions = subs.actions || [];
            const otherSubs = Object.entries(subs).filter(([k]) => k !== 'data' && k !== 'actions');
            return (
              <div key={cat}>
                <div onClick={() => toggle(cat)} style={{
                  padding: '5px 12px', fontSize: '11px', fontWeight: 600, opacity: 0.7,
                  cursor: 'pointer', userSelect: 'none', display: 'flex', justifyContent: 'space-between',
                }}>
                  {cat} <span style={{ fontSize: '9px' }}>{openCats[cat] ? '▾' : '▸'}</span>
                </div>
                {openCats[cat] && (
                  <div style={{ padding: '0 8px 4px' }}>
                    {actions.length > 0 && (
                      <>
                        <div style={{ fontSize: '9px', opacity: 0.35, padding: '2px 4px', fontWeight: 700 }}>ACTIONS</div>
                        {actions.map(b => (
                          <div key={b.opcode} onMouseDown={e => onItemMouseDown(e, b)}
                            style={{
                              padding: '4px 8px', margin: '1px 0', borderRadius: 6, fontSize: '11px',
                              fontWeight: 600, color: '#fff', cursor: 'grab', userSelect: 'none',
                              background: b.color || BLOCK_COLORS.default,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                            {b.label}
                          </div>
                        ))}
                      </>
                    )}
                    {data.length > 0 && (
                      <>
                        <div style={{ fontSize: '9px', opacity: 0.35, padding: '2px 4px', fontWeight: 700 }}>DATA</div>
                        {data.map(b => (
                          <div key={b.opcode} onMouseDown={e => onItemMouseDown(e, b)}
                            style={{
                              padding: '4px 8px', margin: '1px 0', borderRadius: 6, fontSize: '11px',
                              fontWeight: 600, color: '#fff', cursor: 'grab', userSelect: 'none',
                              background: b.color || BLOCK_COLORS.default,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                            {b.label}
                          </div>
                        ))}
                      </>
                    )}
                    {otherSubs.map(([subName, blocks]) => (
                      <React.Fragment key={subName}>
                        <div style={{ fontSize: '9px', opacity: 0.35, padding: '2px 4px', fontWeight: 700 }}>{subName.toUpperCase()}</div>
                        {blocks.map(b => (
                          <div key={b.opcode} onMouseDown={e => onItemMouseDown(e, b)}
                            style={{
                              padding: '4px 8px', margin: '1px 0', borderRadius: 6, fontSize: '11px',
                              fontWeight: 600, color: '#fff', cursor: 'grab', userSelect: 'none',
                              background: b.color || BLOCK_COLORS.default,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
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
    </div>
  );
}

// ── Block Editor Canvas (main tile) ─────────────────────────────────────
const METHOD_LABELS = {
  useOn: 'Block Interaction', use: 'Interaction', continuousUse: 'Continuous Use',
  releaseUsing: 'Release Using', finishUsingItem: 'Finished Using',
  inventoryTick: 'Inventory Tick', hurtEnemy: 'Combat / Hurt Entity',
  interactLivingEntity: 'Entity Interaction',
};

export default function BlockEditorPage({ isTile = false, onClose, nodeId, tree, tabId }) {
  const rawId = tabId || nodeId;
  const methodKey = tabId ? tabId.split('::').pop() : null;
  const methodLabel = methodKey ? METHOD_LABELS[methodKey] : null;

  const stableId = useMemo(() => {
    const seedRaw = localStorage.getItem('ycs-blocky-seed::' + rawId);
    if (seedRaw) return seedRaw;
    return rawId;
  }, [rawId]);

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

  // ── Spawn palette child tile ──────────────────────────────────────────
  const spawnGuard = useRef(false);
  useEffect(() => {
    if (!nodeId) return;
    const hasPalette = tree && JSON.stringify(tree).includes('"Block Palette"');
    if (hasPalette) { spawnGuard.current = false; return; }
    if (spawnGuard.current) return;
    spawnGuard.current = true;
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('ycs-replace-and-split', {
        detail: { nodeId, replaceTabId: rawId, splitTabId: 'Block Palette', direction: 'left', splitSize: 20 }
      }));
    }, 50);
  });

  // ── Add block from palette or drop ────────────────────────────────────
  const addBlock = useCallback((block, wx, wy) => {
    const bdef = blockDefRegistry.get(block.opcode);
    const id = makeId();

    // Build default fields from blockDef
    let defaultFields = {};
    if (bdef) {
      if (bdef.fields) for (const [k, f] of Object.entries(bdef.fields)) defaultFields[k] = f.default !== undefined ? f.default : '';
    }

    // Extract all slot definitions from the label
    let allSlotDefs = [];
    if (bdef) {
      const mainSlots = extractSlotDefs(parseLabel(bdef.label));
      const shapeSlots = bdef.shapeSlots ? Object.values(bdef.shapeSlots).flatMap(s => extractSlotDefs(parseLabel(s))) : [];
      const suffixSlots = bdef.suffixLabel ? extractSlotDefs(parseLabel(bdef.suffixLabel)) : [];
      const seen = new Set();
      allSlotDefs = [...mainSlots, ...shapeSlots, ...suffixSlots].filter(s => { if (seen.has(s.key)) return false; seen.add(s.key); return true; });
    }

    // Auto-create default slot children
    const slots = {};
    const extraNodes = [];
    allSlotDefs.forEach((sd, idx) => {
      const sdDefault = bdef?.codegen?.slotDefaults?.[sd.key];
      if (sdDefault) {
        const childId = makeId();
        const childBdef = blockDefRegistry.get(sdDefault.opcode);
        const childLT = childBdef?.linkType || null;
        slots[sd.key] = childId;
        extraNodes.push({
          id: childId, opcode: sdDefault.opcode,
          x: wx + 220, y: wy + idx * 60,
          nextId: null, linkType: childLT, isAction: false,
          fields: { ...(sdDefault.fields || {}) }, slots: {},
        });
      }
    });

    const newNode = {
      id, opcode: block.opcode,
      x: wx, y: wy,
      nextId: null,
      linkType: bdef?.linkType || block.linkType || null,
      isAction: bdef?.isAction || block.isAction || false,
      fields: defaultFields,
      slots,
    };

    setNodes(ns => [...ns, newNode, ...extraNodes]);
    setSelected(id);
  }, []);

  // ── Listen for palette drops ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const { block, clientX, clientY } = e.detail;
      const el = canvasAreaRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
      const z = zoomRef.current;
      const p = panRef.current;
      if (!p) return;
      const wx = (clientX - rect.left) / z - p.x;
      const wy = (clientY - rect.top) / z - p.y;
      addBlock(block, wx, wy);
    };
    window.addEventListener('ycs-blocky-drop', handler);
    return () => window.removeEventListener('ycs-blocky-drop', handler);
  }, [addBlock]);

  // ── Center start block on first mount ─────────────────────────────────
  useEffect(() => {
    if (pan !== null) return;
    const el = canvasAreaRef.current;
    if (!el) return;
    const startNode = nodesRef.current.find(n => n.id === 'start');
    if (!startNode) return;
    setPan({ x: el.clientWidth / 2 - startNode.x - 60, y: el.clientHeight / 2 - startNode.y - BLOCK_H / 2 });
  }, [pan]);

  // ── Persist to localStorage ───────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + stableId, JSON.stringify(nodes));
  }, [nodes, stableId]);

  // ── Field change handler (with deferred chain re-layout) ──────────────
  const relayoutChains = useCallback(() => {
    requestAnimationFrame(() => {
      if (!canvasAreaRef.current) return;
      const canvasRect = canvasAreaRef.current.getBoundingClientRect();
      const z = zoomRef.current;
      const p = panRef.current;
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
          const prevEl = document.querySelector(`[data-blockid="${prevId}"]`);
          if (prevEl) {
            const prevRect = prevEl.getBoundingClientRect();
            const expectedY = (prevRect.bottom - canvasRect.top) / z - p.y + 4;
            const currentY = next.y + (fixes[next.id] || 0);
            if (Math.abs(currentY - expectedY) > 2) {
              const dy = expectedY - currentY;
              const desc = [next.id, ...getDescendants(next.id, nodesRef.current)];
              desc.forEach(did => { fixes[did] = (fixes[did] || 0) + dy; });
              needsUpdate = true;
            }
          }
          prevId = next.id;
          prev = next;
        }
      };
      const walkAll = (startId) => {
        let cur = startId;
        while (cur) {
          if (visited.has(cur)) break;
          const node = nodesRef.current.find(n => n.id === cur);
          if (!node) break;
          if (isBodyBlock(node)) {
            const bkeys = getBodyKeys(node);
            for (const bk of bkeys) {
              if (node.slots?.[bk]) walkChain(node.slots[bk]);
            }
          }
          cur = node.nextId;
        }
      };
      walkChain('start');
      walkAll('start');
      if (needsUpdate) {
        setNodes(ns => ns.map(n => fixes[n.id] !== undefined ? { ...n, y: n.y + fixes[n.id] } : n));
      }
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

  // ── Zoom ──────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const el = canvasAreaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const oldZ = zoomRef.current;
    const nz = Math.min(Math.max(0.4, oldZ + delta), 2);
    if (nz === oldZ) return;
    setPan(p => ({
      x: mx / nz - (mx / oldZ - p.x),
      y: my / nz - (my / oldZ - p.y),
    }));
    setZoom(nz);
  }, []);

  // ── Canvas pan ────────────────────────────────────────────────────────
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
      const z = zoomRef.current;
      const p = panRef.current;
      const wx = (e.clientX - rect.left) / z - p.x - dragging.offX;
      const wy = (e.clientY - rect.top) / z - p.y - dragging.offY;
      setNodes(ns => {
        const node = ns.find(n => n.id === dragging.id);
        if (!node) return ns;
        const dx = wx - node.x, dy = wy - node.y;
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
            const mx = dragNode.x, my = dragNode.y;
            let bestDist = SNAP_THRESHOLD;
            let snapAction = null;

            // 1) Body-slot snapping: find body-slot regions via DOM
            const smx = e.clientX, smy = e.clientY;
            let bestBodyDist = Infinity;
            document.querySelectorAll('[data-bodyslotkey]').forEach(el => {
              const rect = el.getBoundingClientRect();
              // Distance from mouse to nearest edge of the body slot rect (0 if inside)
              const dx = Math.max(rect.left - smx, 0, smx - rect.right);
              const dy = Math.max(rect.top - smy, 0, smy - rect.bottom);
              const edgeDist = Math.hypot(dx, dy);
              if (edgeDist > SNAP_THRESHOLD) return;
              if (edgeDist >= bestBodyDist) return;
              const parentId = el.dataset.parentid;
              const slotKey = el.dataset.bodyslotkey;
              if (parentId === dragNode.id || getDescendants(dragNode.id, updated).includes(parentId)) return;
              const parentNode = updated.find(n => n.id === parentId);
              if (!parentNode) return;
              const existingChild = parentNode.slots?.[slotKey];
              if (existingChild) {
                let tail = existingChild;
                while (true) {
                  const tn = updated.find(n => n.id === tail);
                  if (!tn?.nextId) break;
                  tail = tn.nextId;
                }
                const tailNode = updated.find(n => n.id === tail);
                if (tailNode && !tailNode.nextId && tail !== dragNode.id) {
                  bestBodyDist = edgeDist;
                  snapAction = { type: 'chain', targetId: tail };
                }
              } else {
                bestBodyDist = edgeDist;
                snapAction = { type: 'body', parentId, slotKey };
              }
            });

            // 2) Standard chain snapping (below any action block, including body blocks)
            if (!snapAction) {
              for (const n of updated) {
                if (n.id === dragNode.id) continue;
                if (!n.isAction && n.id !== 'start') continue;
                if (getDescendants(dragNode.id, updated).includes(n.id)) continue;
                if (n.nextId) continue;
                const nBdef = blockDefRegistry.get(n.opcode);
                const nEl = document.querySelector(`[data-blockid="${n.id}"]`);
                if (!nEl) continue;
                const nRect = nEl.getBoundingClientRect();
                const bx = nRect.left + 20;
                const by = nRect.bottom;
                const d = Math.hypot(smx - bx, smy - by);
                if (d < bestDist) { bestDist = d; snapAction = { type: 'chain', targetId: n.id }; }
              }
            }

            if (snapAction?.type === 'body') {
              updated = updated.map(n => n.id === snapAction.parentId
                ? { ...n, slots: { ...(n.slots || {}), [snapAction.slotKey]: dragNode.id } }
                : n);
            } else if (snapAction?.type === 'chain') {
              updated = updated.map(n => n.id === snapAction.targetId ? { ...n, nextId: dragNode.id } : n);
              const target = updated.find(n => n.id === snapAction.targetId);
              if (target) {
                const tEl = document.querySelector(`[data-blockid="${target.id}"]`);
                if (tEl) {
                  const canvasRect = canvasAreaRef.current?.getBoundingClientRect();
                  const z = zoomRef.current;
                  const p = panRef.current;
                  if (canvasRect && p) {
                    const tRect = tEl.getBoundingClientRect();
                    const snapX = target.x;
                    const snapY = (tRect.bottom - canvasRect.top) / z - p.y + 4;
                    const dx = snapX - dragNode.x;
                    const dy = snapY - dragNode.y;
                    const desc = new Set([dragNode.id, ...getDescendants(dragNode.id, updated)]);
                    updated = updated.map(n => desc.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n);
                  }
                }
              }
            }
          }
        } else if (dragNode.linkType) {
          // Value slot snapping — find nearest .slot-conn element
          let best = null;
          let bestDist = 50;
          const smx = e.clientX, smy = e.clientY;
          document.querySelectorAll('.slot-conn').forEach(el => {
            if (el.dataset.nodeid === dragNode.id) return;
            const rect = el.getBoundingClientRect();
            const sx = rect.left + rect.width / 2;
            const sy = rect.top + rect.height / 2;
            const d = Math.hypot(smx - sx, smy - sy);
            if (d < bestDist) { bestDist = d; best = { nodeId: el.dataset.nodeid, sk: el.dataset.sk }; }
          });
          if (best) {
            const parentNode = updated.find(n => n.id === best.nodeId);
            if (parentNode) {
              // Check type compatibility
              const parentBdef = blockDefRegistry.get(parentNode.opcode);
              let accepts = null;
              if (parentBdef) {
                const dynAccepts = getDynamicAccepts(parentBdef, parentNode, best.sk);
                if (dynAccepts) {
                  accepts = dynAccepts;
                } else if (/^condition\d+$/.test(best.sk)) {
                  accepts = 'logic';
                } else if (/^col(Radius|Width|Height|Depth)$/.test(best.sk)) {
                  accepts = 'number';
                } else {
                  // Check repeatable slots
                  const rsMatch = parentBdef.repeatableSlots && best.sk.startsWith(parentBdef.repeatableSlots.key);
                  if (rsMatch) {
                    accepts = parentBdef.repeatableSlots.accepts || 'text';
                  } else {
                    let allSegs = parseLabel(parentBdef.label);
                    if (parentBdef.shapeSlots) Object.values(parentBdef.shapeSlots).forEach(s => { allSegs = allSegs.concat(parseLabel(s)); });
                    if (parentBdef.suffixLabel) allSegs = allSegs.concat(parseLabel(parentBdef.suffixLabel));
                    const slotSeg = allSegs.find(s => s.type === 'slot' && s.key === best.sk);
                    if (slotSeg) accepts = slotSeg.accepts;
                  }
                }
              }
              if (accepts === dragNode.linkType) {
                updated = updated.map(n => n.id === parentNode.id
                  ? { ...n, slots: { ...(n.slots || {}), [best.sk]: dragNode.id } }
                  : n);
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

  // ── Block mouse down (drag start with auto-detach) ────────────────────
  const handleBlockMouseDown = useCallback((e, nid) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setSelected(nid);
    const rect = e.currentTarget.getBoundingClientRect();
    const z = zoomRef.current;
    const offX = (e.clientX - rect.left) / z;
    const offY = (e.clientY - rect.top) / z;

    // Auto-detach: remove from any parent's nextId or slots, and position at world coords
    setNodes(ns => {
      let updated = [...ns];
      const node = updated.find(n => n.id === nid);
      if (!node) return ns;

      // Check if this node is slotted inline (rendered inside a parent)
      let wasSlotted = false;
      for (const n of updated) {
        if (n.slots) {
          for (const k in n.slots) {
            if (n.slots[k] === nid) { wasSlotted = true; break; }
          }
        }
        if (wasSlotted) break;
      }

      // Detach from nextId chains
      updated = updated.map(n => n.nextId === nid ? { ...n, nextId: null } : n);
      // Detach from slots
      updated = updated.map(n => {
        if (!n.slots) return n;
        const newSlots = { ...n.slots };
        let changed = false;
        for (const k in newSlots) { if (newSlots[k] === nid) { newSlots[k] = null; changed = true; } }
        return changed ? { ...n, slots: newSlots } : n;
      });

      // If it was slotted (inline), give it a world position based on mouse
      if (wasSlotted) {
        const canvasRect = canvasAreaRef.current?.getBoundingClientRect();
        if (canvasRect) {
          const p = panRef.current;
          const wx = (e.clientX - canvasRect.left) / z - p.x - offX;
          const wy = (e.clientY - canvasRect.top) / z - p.y - offY;
          updated = updated.map(n => n.id === nid ? { ...n, x: wx, y: wy } : n);
        }
      }

      // Move dragged subtree to end of array so it renders on top
      const desc = new Set([nid, ...getDescendants(nid, updated)]);
      const base = updated.filter(n => !desc.has(n.id));
      const top = updated.filter(n => desc.has(n.id));
      return [...base, ...top];
    });

    setDragging({ id: nid, offX, offY });
  }, []);

  // ── HTML5 drag & drop fallback ────────────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('block');
    if (!data) return;
    const bd = JSON.parse(data);
    const rect = canvasAreaRef.current.getBoundingClientRect();
    const z = zoomRef.current;
    const p = panRef.current;
    addBlock(bd, (e.clientX - rect.left) / z - p.x, (e.clientY - rect.top) / z - p.y);
  }, [addBlock]);

  // ── Delete ────────────────────────────────────────────────────────────
  const handleDelete = useCallback((nid) => {
    if (nid === 'start') return;
    setNodes(ns => {
      const ch = new Set([nid, ...getDescendants(nid, ns)]);
      return ns.filter(n => !ch.has(n.id)).map(n => {
        let next = n;
        if (n.nextId && ch.has(n.nextId)) next = { ...next, nextId: null };
        if (n.slots) {
          const newSlots = { ...n.slots };
          let changed = false;
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
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && selected !== 'start') {
        handleDelete(selected);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selected && selected !== 'start') {
        e.preventDefault();
        const ns = nodesRef.current;
        const node = ns.find(n => n.id === selected);
        if (!node) return;
        const descIds = new Set([selected, ...getDescendants(selected, ns)]);
        clipboardRef.current = ns.filter(n => descIds.has(n.id)).map(n => ({ ...n }));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboardRef.current) {
        e.preventDefault();
        const idMap = {};
        clipboardRef.current.forEach(n => { idMap[n.id] = makeId(); });
        const pasted = clipboardRef.current.map(n => ({
          ...n,
          id: idMap[n.id],
          x: (n.x || 0) + 40,
          y: (n.y || 0) + 40,
          nextId: n.nextId ? (idMap[n.nextId] || null) : null,
          slots: n.slots ? Object.fromEntries(
            Object.entries(n.slots).map(([k, v]) => [k, v ? (idMap[v] || null) : null])
          ) : {},
          fields: { ...(n.fields || {}) },
        }));
        setNodes(ns => [...ns, ...pasted]);
        setSelected(pasted[0]?.id || null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, handleDelete]);

  // ── Chain tracking (includes body-slot children recursively) ─────────
  const getChain = useCallback(() => {
    const chain = new Set();
    const walkChain = (startId) => {
      let cur = startId;
      while (cur) {
        if (chain.has(cur)) break;
        chain.add(cur);
        const node = nodesRef.current.find(n => n.id === cur);
        if (node?.slots && isBodyBlock(node)) {
          for (const k in node.slots) {
            if (node.slots[k]) walkChain(node.slots[k]);
          }
        }
        cur = node?.nextId || null;
      }
    };
    walkChain('start');
    return chain;
  }, []);

  const chain = getChain();

  // ── Determine which nodes are slotted (rendered inline, not standalone)
  const slottedIds = useMemo(() => {
    const s = new Set();
    const addChain = (startId) => {
      let cur = startId;
      while (cur) {
        if (s.has(cur)) break;
        s.add(cur);
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
        if (cid) {
          if (bodyKeySet.has(k)) {
            addChain(cid);
          } else {
            s.add(cid);
            addSlotted(cid);
          }
        }
      }
    };
    nodes.forEach(n => addSlotted(n.id));
    return s;
  }, [nodes]);

  const handleSave = useCallback(() => {
    const data = JSON.stringify(nodesRef.current);
    localStorage.setItem(STORAGE_PREFIX + stableId, data);
    initialSnapshot.current = data;
  }, [stableId]);

  const closePaletteIfLast = useCallback(() => {
    if (!tree) return;
    let count = 0;
    const walk = (node) => {
      if (node.tabId && node.tabId.startsWith('Block Editor::')) count++;
      if (node.children) node.children.forEach(walk);
    };
    walk(tree);
    if (count <= 1) {
      const findPalette = (node) => {
        if (node.tabId === 'Block Palette') return node;
        if (node.children) for (const c of node.children) { const r = findPalette(c); if (r) return r; }
        return null;
      };
      const palette = findPalette(tree);
      if (palette) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('ycs-close-tab-recursive', { detail: { targetId: palette.id } }));
        }, 0);
      }
    }
  }, [tree]);

  const handleCancel = useCallback(() => {
    const snapshot = JSON.parse(initialSnapshot.current);
    setNodes(snapshot);
    localStorage.setItem(STORAGE_PREFIX + stableId, initialSnapshot.current);
    closePaletteIfLast();
    if (onClose) onClose();
  }, [stableId, onClose, closePaletteIfLast]);

  const handleSaveAndClose = useCallback(() => {
    handleSave();
    closePaletteIfLast();
    if (onClose) onClose();
  }, [handleSave, onClose, closePaletteIfLast]);

  if (pan === null) {
    return <div ref={canvasAreaRef} style={{ position: 'relative', width: '100%', height: '100%' }} />;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {methodLabel && (
        <div style={{
          padding: '6px 14px', flexShrink: 0,
          borderBottom: '1px solid var(--ycs-foreground)',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, fontWeight: 600, color: 'var(--ycs-text)',
        }}>
          <span style={{ opacity: 0.4, fontSize: 11 }}>METHOD</span>
          <span>{methodLabel}</span>
        </div>
      )}

      <div ref={canvasAreaRef} style={{ position: 'relative', flex: 1, overflow: 'hidden', backgroundColor: 'transparent', minHeight: 0 }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onWheel={handleWheel}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, width: 0, height: 0, zIndex: 3,
          transform: `scale(${zoom})`, transformOrigin: '0 0',
        }}>
          <div style={{ position: 'absolute', left: pan.x, top: pan.y }}>
            {nodes.map(node => {
              if (slottedIds.has(node.id)) return null;
              const inChain = chain.has(node.id);
              return (
                <CanvasBlock key={node.id} node={node} nodes={nodes} inChain={inChain}
                  selected={selected} onSelect={setSelected} onBlockMouseDown={handleBlockMouseDown}
                  onFieldChange={handleFieldChange} />
              );
            })}
          </div>
        </div>

        {nodes.length <= 1 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            color: 'var(--ycs-text)', opacity: 0.15, fontSize: 16, fontWeight: 500,
            pointerEvents: 'none', zIndex: 1, textAlign: 'center', userSelect: 'none',
          }}>
            Drag blocks from the palette to get started
          </div>
        )}

        <div style={{
          position: 'absolute', bottom: 8, right: 8, fontSize: '10px',
          color: 'var(--ycs-text)', opacity: 0.3, pointerEvents: 'none', zIndex: 4,
        }}>
          {Math.round(zoom * 100)}%
        </div>
      </div>

      <div style={{
        padding: '6px 10px', flexShrink: 0,
        borderTop: '1px solid var(--ycs-foreground)',
        display: 'flex', justifyContent: 'flex-end', gap: 6,
      }}>
        <button className="ycs-button inline" onClick={handleCancel}>Cancel</button>
        <button className="ycs-button inline" onClick={handleSave}>Save</button>
        <button className="ycs-button inline" onClick={handleSaveAndClose}>Save & Close</button>
      </div>
    </div>
  );
}
