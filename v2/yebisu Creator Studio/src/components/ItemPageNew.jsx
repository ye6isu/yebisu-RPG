import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StringField, StandardDropdownField, DropdownField } from './Field/Field';
import SpritePreview from './SpritePreview';

const HOLDING_MODES = [
  { label: 'Default', value: 'none' },
  { label: 'Handheld', value: 'handheld' },
  { label: '3D Model', value: '3d' },
];

const FullWidthRow = ({ label, children }) => (
  <div className="ycs-field-row">
    <div className="ycs-field-label">{label}</div>
    <div className="ycs-field-control" style={{ flex: 1 }}>
      {children}
    </div>
  </div>
);

const DualRow = ({ label1, children1, label2, children2 }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', minHeight: '24px' }}>
    <div className="ycs-field-label">{label1}</div>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0, maxWidth: '40%' }}>
      {children1}
    </div>
    <div className="ycs-field-label" style={{ minWidth: 'auto', paddingLeft: '16px' }}>{label2}</div>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
      {children2}
    </div>
  </div>
);

const Separator = () => (
  <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', margin: '25px 0' }} />
);

const CheckboxRow = ({ label, checked, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
    <input type="checkbox" className="ycs-checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    <span style={{ fontSize: '13px', color: 'var(--ycs-text)', userSelect: 'none' }}>{label}</span>
  </div>
);

const TextureField = ({ textureName, onClickSet, isOpen }) => {
  const tex = (() => {
    if (!textureName) return null;
    try {
      const raw = localStorage.getItem('ycs-textures-list');
      const list = raw ? JSON.parse(raw) : [];
      return list.find(t => t.label === textureName) || null;
    } catch { return null; }
  })();

  return (
  <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
    <div style={{
      width: 24,
      height: 24,
      background: tex ? 'transparent' : 'var(--ycs-foreground)',
      borderRadius: 'var(--ycs-radius, 4px)',
      border: tex ? 'none' : '1px dashed var(--ycs-foreground)',
      flexShrink: 0,
      imageRendering: 'pixelated',
      overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {tex?.dataUrl && (
        <SpritePreview
          url={tex.dataUrl} size={24}
          isSpritesheet={tex.isSpritesheet} frames={tex.frames}
          isAnimated={tex.isAnimated} ticksPerFrame={tex.ticksPerFrame}
          defaultFrame={tex.defaultFrame}
        />
      )}
    </div>
    <div style={{
      flex: 1,
      padding: '4px 8px',
      backgroundColor: 'transparent',
      color: 'var(--ycs-text)',
      border: '1px solid var(--ycs-foreground)',
      borderRadius: 'var(--ycs-radius, 4px)',
      fontSize: '12px',
      fontFamily: 'inherit',
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      boxSizing: 'border-box',
      opacity: textureName ? 1 : 0.5,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    }}>
      {textureName || 'none selected'}
    </div>
    <button className={`ycs-button inline${isOpen ? ' active' : ''}`} onClick={onClickSet} style={{ flexShrink: 0 }}>
      {textureName ? 'edit' : 'set'}
    </button>
  </div>
  );
};

const ChildTileField = ({ summary, hasContent, onClickSet, isOpen }) => (
  <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
    <div style={{
      flex: 1,
      padding: '4px 8px',
      backgroundColor: 'transparent',
      color: 'var(--ycs-text)',
      border: '1px solid var(--ycs-foreground)',
      borderRadius: 'var(--ycs-radius, 4px)',
      fontSize: '12px',
      fontFamily: 'inherit',
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      boxSizing: 'border-box',
      opacity: hasContent ? 1 : 0.5,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    }}>
      {summary || 'none'}
    </div>
    <button className={`ycs-button inline${isOpen ? ' active' : ''}`} onClick={onClickSet} style={{ flexShrink: 0 }}>
      {hasContent ? 'edit' : 'set'}
    </button>
  </div>
);

const SubSection = ({ title, children }) => (
  <div style={{ marginBottom: '20px' }}>
    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--ycs-text)', marginBottom: '10px' }}>{title}</div>
    <div style={{ paddingLeft: '16px', borderLeft: '2px solid var(--ycs-foreground)' }}>
      {children}
    </div>
  </div>
);

const TIERS = [
  { label: 'Wood', value: 'Wood' },
  { label: 'Stone', value: 'Stone' },
  { label: 'Iron', value: 'Iron' },
  { label: 'Gold', value: 'Gold' },
  { label: 'Diamond', value: 'Diamond' },
  { label: 'Netherite', value: 'Netherite' },
];

const TOOL_TYPES = [
  { label: 'Sword', value: 'Sword' },
  { label: 'Pickaxe', value: 'Pickaxe' },
  { label: 'Axe', value: 'Axe' },
  { label: 'Shovel', value: 'Shovel' },
  { label: 'Hoe', value: 'Hoe' },
];

const NumberInput = ({ value, onChange, style = {} }) => (
  <input
    className="ycs-string-input"
    type="text"
    inputMode="numeric"
    value={value}
    onChange={e => {
      const v = e.target.value;
      if (v === '' || v === '-' || /^-?\d*\.?\d*$/.test(v)) onChange(v);
    }}
    style={{ width: '80px', ...style }}
  />
);

const SectionHeader = ({ title }) => (
  <h2 style={{ marginTop: 0, fontSize: '16px', fontWeight: '500', color: 'var(--ycs-text)', marginBottom: '15px' }}>{title}</h2>
);

export const DEFAULT_FORM = {
  displayName: '',
  id: '',
  customConstName: false,
  constName: '',
  multipleStates: false,
  stateCount: 2,
  holdingMode: 'none',
  textureName: '',
  states: [
    { holdingMode: 'none', textureName: '', modelJson: '' },
    { holdingMode: 'none', textureName: '', modelJson: '' },
  ],
  modelJson: '',
  stackSize: '64',
  isTool: false,
  toolType: 'Sword',
  tier: 'Iron',
  damage: '3',
  speed: '-2.4',
  isFood: false,
  foodNutrition: '3',
  foodSaturation: '0.3',
  foodAlwaysEdible: false,
  isFuel: false,
  burnTime: '1600',
  hasDurability: false,
  durability: '100',
  hasUseDuration: false,
  useDuration: '72000',
  hasTooltip: false,
  tooltipNormal: '',
  hasHiddenTooltip: false,
  tooltipHidden: '',
  tooltipShiftHint: '',
  useDefaultShiftHint: true,
  creativeTab: '',
  tags: '',
  hasRecipe: false,
  recipeType: 'shaped',
  customClass: '',
  dataComponents: [],
};

export const FORM_STORAGE_PREFIX = 'ycs-form::';
const popoutChildren = new Set();

function readFormFromStorage(nodeId) {
  try {
    const raw = localStorage.getItem(FORM_STORAGE_PREFIX + nodeId);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function writeFormToStorage(nodeId, data) {
  localStorage.setItem(FORM_STORAGE_PREFIX + nodeId, JSON.stringify(data));
}

function usePersistedForm(nodeId, tabId) {
  const [form, setFormRaw] = useState(() => {
    const existing = readFormFromStorage(nodeId);
    if (existing) return existing;

    // Check if the landing page seeded data for this editor
    try {
      const seedRaw = localStorage.getItem('ycs-item-editor-seed');
      if (seedRaw) {
        const seed = JSON.parse(seedRaw);
        if (seed.childTabId === tabId) {
          localStorage.removeItem('ycs-item-editor-seed');
          writeFormToStorage(nodeId, seed.form);
          return seed.form;
        }
      }
    } catch {}

    return { ...DEFAULT_FORM, states: DEFAULT_FORM.states.map(s => ({ ...s })) };
  });

  const formRef = useRef(form);
  formRef.current = form;

  useEffect(() => {
    const saved = readFormFromStorage(nodeId);
    if (saved) setFormRaw(saved);

    const handleStorage = (e) => {
      if (e.key === FORM_STORAGE_PREFIX + nodeId && e.newValue) {
        try { setFormRaw(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [nodeId]);

  const setForm = useCallback((updater) => {
    setFormRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      writeFormToStorage(nodeId, next);
      return next;
    });
  }, [nodeId]);

  const F = useCallback((key, value) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      return next;
    });
  }, [setForm]);

  return { form, F, setForm };
}

export default function ItemPageNew({ isTile = false, nodeId, tree, tabId }) {
  const formKey = tabId || nodeId || 'item-default';
  const { form, F, setForm } = usePersistedForm(formKey, tabId);

  useEffect(() => {
    if (form.multipleStates) {
      const needed = form.stateCount;
      if (form.states.length < needed) {
        const newStates = [...form.states];
        while (newStates.length < needed) newStates.push({ holdingMode: 'none', textureName: '', modelJson: '' });
        F('states', newStates);
      } else if (form.states.length > needed) {
        F('states', form.states.slice(0, needed));
      }
    }
  }, [form.stateCount, form.multipleStates]);

  const updateState = (i, key, val) => {
    F('states', form.states.map((s, idx) => idx === i ? { ...s, [key]: val } : s));
  };

  useEffect(() => {
    const handler = (e) => {
      const { selectorTabId, textureName } = e.detail || {};
      if (!selectorTabId) return;
      const tId = nodeId || formKey;
      const prefix = `Item Texture::${tId}::`;
      if (!selectorTabId.startsWith(prefix)) return;
      const key = selectorTabId.slice(prefix.length);
      if (key === 'main') {
        F('textureName', textureName);
        const texList = JSON.parse(localStorage.getItem('ycs-textures-list') || '[]');
        const found = texList.find(t => t.label === textureName);
        if (found?.dataUrl) {
          const modelTabId = `Item Model JSON::${tId}::model-json`;
          localStorage.setItem(`ycs-model-texture::${modelTabId}`, found.dataUrl);
          window.dispatchEvent(new CustomEvent('ycs-model-texture-update', { detail: { modelTabId, textureUrl: found.dataUrl } }));
        }
      } else if (key.startsWith('state-')) {
        const idx = parseInt(key.replace('state-', ''), 10);
        if (!isNaN(idx)) updateState(idx, 'textureName', textureName);
      }
    };
    window.addEventListener('ycs-texture-selected', handler);
    return () => window.removeEventListener('ycs-texture-selected', handler);
  }, [nodeId, formKey]);

  useEffect(() => {
    const handler = (e) => {
      const { selectorTabId, geoModelJson, geoModelFileName, itemModelJson, itemModelFileName } = e.detail || {};
      if (!selectorTabId) return;
      const tId = nodeId || formKey;
      const prefix = `Item Model JSON::${tId}::`;
      if (!selectorTabId.startsWith(prefix)) return;
      const key = selectorTabId.slice(prefix.length);
      if (key === 'model-json') {
        F('modelJson', JSON.stringify({ geoModelJson, geoModelFileName, itemModelJson, itemModelFileName }));
      } else if (key.startsWith('state-')) {
        const idx = parseInt(key.replace('state-', '').replace('-model-json', ''), 10);
        if (!isNaN(idx)) {
          updateState(idx, 'modelJson', JSON.stringify({ geoModelJson, geoModelFileName, itemModelJson, itemModelFileName }));
        }
      }
    };
    window.addEventListener('ycs-model-json-changed', handler);
    return () => window.removeEventListener('ycs-model-json-changed', handler);
  }, [nodeId, formKey]);

  const findNodeByTabId = (tabId) => {
    let found = null;
    const search = (n) => {
      if (!n) return;
      if (n.type === 'leaf' && n.tabId === tabId) found = n;
      if (n.type === 'split') n.children.forEach(search);
    };
    if (tree) search(tree);
    return found;
  };

  const isPopout = !tree;

  const tileId = nodeId || formKey;

  const toggleChildTile = (prefix, key) => {
    const tabId = `${prefix}::${tileId}::${key}`;

    if (isPopout) {
      if (popoutChildren.has(tabId)) {
        window.electronAPI?.closePopout(tabId);
        popoutChildren.delete(tabId);
      } else {
        window.electronAPI?.openPopout(tabId);
        popoutChildren.add(tabId);
      }
      return;
    }

    const existing = findNodeByTabId(tabId);
    if (existing) {
      window.dispatchEvent(new CustomEvent('ycs-close-tab-recursive', {
        detail: { targetId: existing.id }
      }));
    } else {
      if (prefix === 'Item Model JSON') {
        const texName = key === 'model-json' ? form.textureName : form.states?.[parseInt(key.replace('state-', '').replace('-model-json', ''))]?.textureName;
        if (texName) {
          try {
            const texList = JSON.parse(localStorage.getItem('ycs-textures-list') || '[]');
            const found = texList.find(t => t.label === texName);
            if (found?.dataUrl) localStorage.setItem(`ycs-model-texture::${tabId}`, found.dataUrl);
          } catch {}
        }
      }
      window.dispatchEvent(new CustomEvent('ycs-toggle-child', {
        detail: {
          parentId: nodeId,
          targetNodeId: nodeId,
          childTabId: tabId,
          direction: 'right',
          isOpen: true,
        }
      }));
    }
  };

  const isChildOpen = (prefix, key) => {
    const tabId = `${prefix}::${tileId}::${key}`;
    if (isPopout) return popoutChildren.has(tabId);
    return !!findNodeByTabId(tabId);
  };

  const toggleTextureSelector = (key) => toggleChildTile('Item Texture', key);

  const handleIdChange = (v) => {
    const sanitized = v.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setForm(prev => ({
      ...prev,
      id: sanitized,
      constName: prev.customConstName ? prev.constName : sanitized.toUpperCase(),
    }));
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'transparent', color: 'var(--ycs-text)' }}>
      <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', overflowX: 'auto', minWidth: 0 }}>
        <div style={{ minWidth: '450px' }}>

        <h2 style={{ marginTop: 0, fontSize: '16px', fontWeight: '500', color: 'var(--ycs-text)', marginBottom: '15px' }}>Identity</h2>

        <FullWidthRow label="Display Name">
          <StringField value={form.displayName} onChange={v => F('displayName', v)} placeholder="" style={{ width: '100%' }} />
        </FullWidthRow>

        <DualRow
          label1="ID"
          children1={<StringField value={form.id} onChange={handleIdChange} placeholder="" style={{ width: '100%' }} />}
          label2={
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" className="ycs-checkbox" checked={form.customConstName} onChange={e => F('customConstName', e.target.checked)} />
              <span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>Custom Const</span>
            </div>
          }
          children2={
            <StringField
              value={form.customConstName ? form.constName : form.id.toUpperCase()}
              onChange={v => { if (form.customConstName) F('constName', v.toUpperCase().replace(/[^A-Z0-9_]/g, '')); }}
              placeholder=""
              style={{ width: '100%', opacity: form.customConstName ? 1 : 0.4 }}
            />
          }
        />

        <Separator />

        <SectionHeader title="Appearance" />

        <CheckboxRow label="Multiple States" checked={form.multipleStates} onChange={v => { F('multipleStates', v); if (v && form.stateCount < 2) F('stateCount', 2); }} />

        {!form.multipleStates ? (
          <>
            <FullWidthRow label="Model">
              <StandardDropdownField value={form.holdingMode} onChange={v => F('holdingMode', v)} options={HOLDING_MODES} />
            </FullWidthRow>

            <FullWidthRow label="Texture">
              <TextureField textureName={form.textureName} onClickSet={() => toggleTextureSelector('main')} isOpen={isChildOpen('Item Texture', 'main')} />
            </FullWidthRow>

            {form.holdingMode === '3d' && (
              <FullWidthRow label="JSON">
                <ChildTileField
                  summary={(() => { try { const m = JSON.parse(form.modelJson); return [m.geoModelFileName, m.itemModelFileName].filter(Boolean).join(', ') || null; } catch { return null; } })()}
                  hasContent={!!form.modelJson}
                  onClickSet={() => toggleChildTile('Item Model JSON', 'model-json')}
                  isOpen={isChildOpen('Item Model JSON', 'model-json')}
                />
              </FullWidthRow>
            )}
          </>
        ) : (
          <>
            <FullWidthRow label="State Count">
              <input
                className="ycs-string-input"
                type="number"
                value={form.stateCount}
                onChange={e => F('stateCount', Math.max(2, Math.min(16, parseInt(e.target.value) || 2)))}
                style={{ width: '60px' }}
              />
            </FullWidthRow>

            {form.states.slice(0, form.stateCount).map((st, i) => (
              <SubSection key={i} title={i === 0 ? 'Default State' : `State ${i + 1}`}>
                <FullWidthRow label="Model">
                  <StandardDropdownField value={st.holdingMode} onChange={v => updateState(i, 'holdingMode', v)} options={HOLDING_MODES} />
                </FullWidthRow>
                <FullWidthRow label="Texture">
                  <TextureField textureName={st.textureName} onClickSet={() => toggleTextureSelector(`state-${i}`)} isOpen={isChildOpen('Item Texture', `state-${i}`)} />
                </FullWidthRow>
                {st.holdingMode === '3d' && (
                  <FullWidthRow label="JSON">
                    <ChildTileField
                      summary={(() => { try { const m = JSON.parse(st.modelJson); return [m.geoModelFileName, m.itemModelFileName].filter(Boolean).join(', ') || null; } catch { return null; } })()}
                      hasContent={!!st.modelJson}
                      onClickSet={() => toggleChildTile('Item Model JSON', `state-${i}-model-json`)}
                      isOpen={isChildOpen('Item Model JSON', `state-${i}-model-json`)}
                    />
                  </FullWidthRow>
                )}
              </SubSection>
            ))}
          </>
        )}

        <Separator />

        <SectionHeader title="Properties" />

        <FullWidthRow label="Stack Size">
          <NumberInput value={form.stackSize} onChange={v => F('stackSize', String(Math.max(1, Math.min(99, parseInt(v) || 64))))} />
        </FullWidthRow>

        <CheckboxRow label="Tool" checked={form.isTool} onChange={v => { F('isTool', v); if (v) { F('isFood', false); F('isFuel', false); if (form.holdingMode === 'none') F('holdingMode', 'handheld'); } }} />
        {form.isTool && (
          <SubSection title="">
            <FullWidthRow label="Tool Type">
              <StandardDropdownField value={form.toolType} onChange={v => F('toolType', v)} options={TOOL_TYPES} />
            </FullWidthRow>
            <FullWidthRow label="Tier">
              <StandardDropdownField value={form.tier} onChange={v => F('tier', v)} options={TIERS} />
            </FullWidthRow>
            <DualRow
              label1="Damage"
              children1={<NumberInput value={form.damage} onChange={v => F('damage', v)} />}
              label2="Speed"
              children2={<NumberInput value={form.speed} onChange={v => F('speed', v)} />}
            />
          </SubSection>
        )}

        {!form.isTool && (
          <>
            <CheckboxRow label="Food" checked={form.isFood} onChange={v => F('isFood', v)} />
            {form.isFood && (
              <SubSection title="">
                <DualRow
                  label1="Nutrition"
                  children1={<NumberInput value={form.foodNutrition} onChange={v => F('foodNutrition', v)} />}
                  label2="Saturation"
                  children2={<NumberInput value={form.foodSaturation} onChange={v => F('foodSaturation', v)} />}
                />
                <CheckboxRow label="Always Edible" checked={form.foodAlwaysEdible} onChange={v => F('foodAlwaysEdible', v)} />
              </SubSection>
            )}

            <CheckboxRow label="Fuel" checked={form.isFuel} onChange={v => F('isFuel', v)} />
            {form.isFuel && (
              <SubSection title="">
                <FullWidthRow label="Burn Time (ticks)">
                  <NumberInput value={form.burnTime} onChange={v => F('burnTime', v)} />
                </FullWidthRow>
              </SubSection>
            )}
          </>
        )}

        <CheckboxRow label="Has Durability" checked={form.hasDurability} onChange={v => F('hasDurability', v)} />
        {form.hasDurability && (
          <SubSection title="">
            <FullWidthRow label="Durability">
              <NumberInput value={form.durability} onChange={v => F('durability', v)} />
            </FullWidthRow>
          </SubSection>
        )}

        <CheckboxRow label="Use Duration" checked={form.hasUseDuration} onChange={v => F('hasUseDuration', v)} />
        {form.hasUseDuration && (
          <SubSection title="">
            <FullWidthRow label="Duration (ticks)">
              <NumberInput value={form.useDuration} onChange={v => F('useDuration', v)} />
            </FullWidthRow>
          </SubSection>
        )}

        <CheckboxRow label="Tooltip" checked={form.hasTooltip} onChange={v => F('hasTooltip', v)} />
        {form.hasTooltip && (
          <SubSection title="">
            <FullWidthRow label="Normal Text">
              <StringField value={form.tooltipNormal} onChange={v => F('tooltipNormal', v)} style={{ width: '100%' }} />
            </FullWidthRow>
            <DualRow
              label1={
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="checkbox" className="ycs-checkbox" checked={form.hasHiddenTooltip} onChange={e => F('hasHiddenTooltip', e.target.checked)} />
                  <span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>Hidden Text</span>
                </div>
              }
              children1={
                <StringField
                  value={form.hasHiddenTooltip ? form.tooltipHidden : ''}
                  onChange={v => { if (form.hasHiddenTooltip) F('tooltipHidden', v); }}
                  style={{ width: '100%', opacity: form.hasHiddenTooltip ? 1 : 0.4 }}
                />
              }
              label2={
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="checkbox" className="ycs-checkbox" checked={!form.useDefaultShiftHint} onChange={e => F('useDefaultShiftHint', !e.target.checked)} disabled={!form.hasHiddenTooltip} />
                  <span style={{ fontSize: '13px', whiteSpace: 'nowrap', opacity: form.hasHiddenTooltip ? 1 : 0.4 }}>Custom Shift Hint</span>
                </div>
              }
              children2={
                <StringField
                  value={!form.useDefaultShiftHint && form.hasHiddenTooltip ? form.tooltipShiftHint : ''}
                  onChange={v => { if (!form.useDefaultShiftHint && form.hasHiddenTooltip) F('tooltipShiftHint', v); }}
                  style={{ width: '100%', opacity: (!form.useDefaultShiftHint && form.hasHiddenTooltip) ? 1 : 0.4 }}
                />
              }
            />
          </SubSection>
        )}

        <Separator />

        <SectionHeader title="Creative Tab" />

        <FullWidthRow label="Tab">
          <DropdownField value={form.creativeTab} onChange={v => F('creativeTab', v)} options={[
            { label: 'None', value: '' },
            { label: 'COMBAT', value: 'COMBAT' },
            { label: 'TOOLS_AND_UTILITIES', value: 'TOOLS_AND_UTILITIES' },
            { label: 'INGREDIENTS', value: 'INGREDIENTS' },
            { label: 'FOOD_AND_DRINKS', value: 'FOOD_AND_DRINKS' },
            { label: 'BUILDING_BLOCKS', value: 'BUILDING_BLOCKS' },
            { label: 'NATURAL_BLOCKS', value: 'NATURAL_BLOCKS' },
            { label: 'FUNCTIONAL_BLOCKS', value: 'FUNCTIONAL_BLOCKS' },
            { label: 'REDSTONE_BLOCKS', value: 'REDSTONE_BLOCKS' },
            { label: 'COLORED_BLOCKS', value: 'COLORED_BLOCKS' },
            { label: 'SPAWN_EGGS', value: 'SPAWN_EGGS' },
            { label: 'OP_BLOCKS', value: 'OP_BLOCKS' },
          ]} />
        </FullWidthRow>

        <Separator />

        <SectionHeader title="Tags" />

        <FullWidthRow label="Item Tags">
          <ChildTileField
            summary={form.tags || null}
            hasContent={!!form.tags}
            onClickSet={() => toggleChildTile('Item Tags', 'tags')}
            isOpen={isChildOpen('Item Tags', 'tags')}
          />
        </FullWidthRow>

        <Separator />

        <SectionHeader title="Recipe" />

        <FullWidthRow label="Recipe">
          <ChildTileField
            summary={form.hasRecipe ? form.recipeType : null}
            hasContent={form.hasRecipe}
            onClickSet={() => toggleChildTile('Item Recipe', 'recipe')}
            isOpen={isChildOpen('Item Recipe', 'recipe')}
          />
        </FullWidthRow>

        <Separator />

        <SectionHeader title="Methods" />

        <FullWidthRow label="Methods">
          <ChildTileField
            summary={null}
            hasContent={false}
            onClickSet={() => toggleChildTile('Item Methods', 'methods')}
            isOpen={isChildOpen('Item Methods', 'methods')}
          />
        </FullWidthRow>

        <Separator />

        <SectionHeader title="Data Components" />

        <FullWidthRow label="Components">
          <ChildTileField
            summary={form.dataComponents.length > 0 ? `${form.dataComponents.length} component(s)` : null}
            hasContent={form.dataComponents.length > 0}
            onClickSet={() => toggleChildTile('Data Components', 'data-components')}
            isOpen={isChildOpen('Data Components', 'data-components')}
          />
        </FullWidthRow>

        </div>
      </div>
      <div style={{
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '8px',
        borderTop: '1px solid var(--ycs-foreground)',
        backgroundColor: 'transparent',
        flexShrink: 0,
      }}>
        <button className="ycs-button" onClick={() => {}}>Save & Close</button>
        <button className="ycs-button" onClick={() => {}}>Cancel</button>
        <button className="ycs-button" onClick={() => {}}>Save</button>
      </div>
    </div>
  );
}

export function ItemTexturePlaceholder() {
  return (
    <div style={{ padding: '20px', color: 'var(--ycs-text)' }}>
      <h2 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '15px' }}>Texture Selector</h2>
      <div style={{ opacity: 0.5, fontSize: '13px' }}>Texture picker will go here.</div>
    </div>
  );
}

export function ItemTagsPlaceholder() {
  return (
    <div style={{ padding: '20px', color: 'var(--ycs-text)' }}>
      <h2 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '15px' }}>Item Tags</h2>
      <div style={{ opacity: 0.5, fontSize: '13px' }}>Tag editor will go here.</div>
    </div>
  );
}

export function ItemRecipePlaceholder() {
  return (
    <div style={{ padding: '20px', color: 'var(--ycs-text)' }}>
      <h2 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '15px' }}>Recipe Editor</h2>
      <div style={{ opacity: 0.5, fontSize: '13px' }}>Recipe editor will go here.</div>
    </div>
  );
}

export function ItemMethodsPlaceholder() {
  return (
    <div style={{ padding: '20px', color: 'var(--ycs-text)' }}>
      <h2 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '15px' }}>Methods</h2>
      <div style={{ opacity: 0.5, fontSize: '13px' }}>Method editor will go here.</div>
    </div>
  );
}

export function ItemModelJsonPlaceholder() {
  return (
    <div style={{ padding: '20px', color: 'var(--ycs-text)' }}>
      <h2 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '15px' }}>Model JSON Editor</h2>
      <div style={{ opacity: 0.5, fontSize: '13px' }}>JSON model editor will go here.</div>
    </div>
  );
}

export function DataComponentsPlaceholder() {
  return (
    <div style={{ padding: '20px', color: 'var(--ycs-text)' }}>
      <h2 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '15px' }}>Data Components</h2>
      <div style={{ opacity: 0.5, fontSize: '13px' }}>Data component editor will go here.</div>
    </div>
  );
}
