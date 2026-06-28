import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StringField, StandardDropdownField, DropdownField, NumberInput, findNodeByTabId as findNodeByTabIdUtil } from './Field/Field';
import SpritePreview from './SpritePreview';
import { injectItem, removeItem, isItemInjected } from '../codegen/itemInjector';
import * as itemStore from '../store/itemStore';
import { getCached as getCachedTextures } from '../store/textureStore';

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
    const list = getCachedTextures();
    return list.find(t => t.label === textureName) || null;
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
  useAnimation: 'NONE',
  noSlowdown: false,
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

function seedChildLocalStorage(tileId, entityData) {
  if (!entityData || !tileId) return;
  // Flat structure: form fields are at top level alongside recipe, dataComponents, etc.
  const itemId = entityData.id || '';
  // Seed form for legacy localStorage consumers
  const { recipe, dataComponents, enabledMethods, blockGraphs, modelJsonData, ...formFields } = entityData;
  if (Object.keys(formFields).length > 0) {
    localStorage.setItem(FORM_STORAGE_PREFIX + tileId, JSON.stringify(formFields));
  }
  if (recipe) {
    const recipeTabId = `Item Recipe::${tileId}::recipe`;
    localStorage.setItem('ycs-recipe::' + recipeTabId, JSON.stringify(recipe));
  }
  if (dataComponents) {
    const dcTabId = `Data Components::${tileId}::data-components`;
    localStorage.setItem('ycs-data-components::' + dcTabId, JSON.stringify(dataComponents));
  }
  if (enabledMethods) {
    const methodsKey = `ycs-methods::item::${itemId}`;
    localStorage.setItem(methodsKey, JSON.stringify(enabledMethods));
    const methodsTabId = `Item Methods::${tileId}::methods`;
    localStorage.setItem('ycs-methods-enabled::' + methodsTabId, JSON.stringify(enabledMethods));
  }
  if (blockGraphs && itemId) {
    for (const [key, val] of Object.entries(blockGraphs)) {
      localStorage.setItem(`ycs-blocky::item::${itemId}::${key}`, typeof val === 'string' ? val : JSON.stringify(val));
    }
  }
}

function usePersistedForm(nodeId, tabId) {
  const [form, setFormRaw] = useState(() => {
    try {
      const seedRaw = localStorage.getItem('ycs-item-editor-seed');
      if (seedRaw) {
        const seed = JSON.parse(seedRaw);
        if (seed.childTabId === tabId) {
          localStorage.removeItem('ycs-item-editor-seed');
          const seedForm = seed.form || { ...DEFAULT_FORM, states: DEFAULT_FORM.states.map(s => ({ ...s })) };
          // Check in-memory cache for full data from prior session
          if (seedForm.id) {
            const cached = itemStore.getCached(seedForm.id);
            if (cached?.id) return cached;
          }
          return seedForm;
        }
      }
    } catch {}
    return { ...DEFAULT_FORM, states: DEFAULT_FORM.states.map(s => ({ ...s })) };
  });

  const entityLoadedRef = useRef(false);

  useEffect(() => {
    if (entityLoadedRef.current) return;
    const itemId = form.id;
    if (!itemId) return;
    entityLoadedRef.current = true;
    itemStore.loadItem(itemId).then(data => {
      if (!data) {
        itemStore.setCached(itemId, { ...form });
        return;
      }
      // data is flat: all form fields + recipe + dataComponents + enabledMethods + blockGraphs + modelJsonData
      const { recipe, dataComponents, enabledMethods, blockGraphs, modelJsonData, ...formFields } = data;
      if (Object.keys(formFields).length > 0) setFormRaw(prev => ({ ...prev, ...formFields }));
      const tileId = nodeId || tabId;
      seedChildLocalStorage(tileId, data);
      itemStore.setCached(itemId, data);
    });
  }, [form.id, nodeId, tabId]);

  const setForm = useCallback((updater) => {
    setFormRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Update itemStore cache — merge form fields while preserving child sections
      if (next.id) {
        const cached = itemStore.getCached(next.id) || {};
        itemStore.setCached(next.id, { ...cached, ...next });
      }
      // Bridge: keep localStorage in sync for child editors not yet migrated
      const tileId = nodeId || tabId;
      if (tileId) localStorage.setItem(FORM_STORAGE_PREFIX + tileId, JSON.stringify(next));
      return next;
    });
  }, [nodeId, tabId]);

  const F = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, [setForm]);

  return { form, F, setForm };
}

export default function ItemPageNew({ isTile = false, onClose, nodeId, tree, tabId }) {
  const formKey = tabId || nodeId || 'item-default';
  const { form, F, setForm } = usePersistedForm(formKey, tabId);
  const originalIdRef = useRef(form.id || '');

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

  const updateState = useCallback((i, key, val) => {
    setForm(prev => ({
      ...prev,
      states: prev.states.map((s, idx) => idx === i ? { ...s, [key]: val } : s),
    }));
  }, [setForm]);

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
        const texList = getCachedTextures();
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

  const findNodeByTabId = (tabId) => findNodeByTabIdUtil(tree, tabId);

  const isPopout = !tree;

  const tileId = nodeId || formKey;

  const toggleChildTile = (prefix, key) => {
    const tabId = `${prefix}::${tileId}::${key}`;

    if (isPopout) {
      if (popoutChildren.has(tabId)) {
        window.electronAPI?.closePopout(tabId);
        popoutChildren.delete(tabId);
      } else {
        if (form.id) localStorage.setItem('ycs-child-item-id::' + tabId, form.id);
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
      // Seed the item ID for child editors to resolve
      if (form.id) {
        localStorage.setItem('ycs-child-item-id::' + tabId, form.id);
      }
      if (prefix === 'Item Model JSON') {
        // Seed existing model data so the child tile shows current values
        const modelJsonStr = key === 'model-json' ? form.modelJson : form.states?.[parseInt(key.replace('state-', '').replace('-model-json', ''))]?.modelJson;
        if (modelJsonStr) {
          try {
            const parsed = JSON.parse(modelJsonStr);
            localStorage.setItem(`ycs-model-json::${tabId}`, JSON.stringify(parsed));
          } catch {}
        }
        const texName = key === 'model-json' ? form.textureName : form.states?.[parseInt(key.replace('state-', '').replace('-model-json', ''))]?.textureName;
        if (texName) {
          const texList = getCachedTextures();
          const found = texList.find(t => t.label === texName);
          if (found?.dataUrl) localStorage.setItem(`ycs-model-texture::${tabId}`, found.dataUrl);
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

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [customTabs, setCustomTabs] = useState([]);

  const loadCustomTabs = useCallback(async () => {
    try {
      const fe = window.electronAPI?.fileEngine;
      if (!fe) return;
      const r = await fe.json.read('resources/assets/yebisurpg/ycs/ycs_custom_tabs.json');
      if (r?.ok && Array.isArray(r.data)) setCustomTabs(r.data);
    } catch {}
  }, []);

  useEffect(() => { loadCustomTabs(); }, [loadCustomTabs]);

  useEffect(() => {
    const handler = () => loadCustomTabs();
    window.addEventListener('ycs-tabs-changed', handler);
    return () => window.removeEventListener('ycs-tabs-changed', handler);
  }, [loadCustomTabs]);

  const handleSave = useCallback(async () => {
    if (!form.id) { setSaveStatus({ ok: false, msg: 'Item ID is required' }); return; }
    if (!form.displayName) { setSaveStatus({ ok: false, msg: 'Display Name is required' }); return; }
    setSaving(true);
    setSaveStatus(null);
    try {
      const oldId = originalIdRef.current;
      if (oldId && oldId !== form.id) {
        const oldInjected = await isItemInjected(oldId);
        if (oldInjected) await removeItem(oldId);
        await itemStore.deleteItemFile(oldId);
      }
      const alreadyInjected = await isItemInjected(form.id);
      if (alreadyInjected) {
        await removeItem(form.id);
      }

      // Read child data from itemStore cache first, fall back to localStorage
      const cached = itemStore.getCached(form.id) || {};

      const stableMethodsKey = `ycs-methods::item::${form.id}`;
      const enabledRaw = localStorage.getItem(stableMethodsKey)
        || localStorage.getItem('ycs-methods-enabled::Item Methods::' + tileId + '::methods');
      const enabledMethods = cached.enabledMethods || (enabledRaw ? JSON.parse(enabledRaw) : []);
      const hasCustomClass = enabledMethods.length > 0 || form.hasUseDuration || (form.useAnimation && form.useAnimation !== 'NONE');

      const recipeTabId = `Item Recipe::${tileId}::recipe`;
      const recipeRaw = localStorage.getItem('ycs-recipe::' + recipeTabId);
      const recipeData = cached.recipe || (recipeRaw ? JSON.parse(recipeRaw) : null);

      const dcTabId = `Data Components::${tileId}::data-components`;
      const dcRaw = localStorage.getItem('ycs-data-components::' + dcTabId);
      const dataComponents = cached.dataComponents || (dcRaw ? JSON.parse(dcRaw) : []);

      // Collect blocky data from cache or localStorage
      let blocky = cached.blockGraphs || {};
      if (Object.keys(blocky).length === 0) {
        const blockyPrefix = `ycs-blocky::item::${form.id}::`;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(blockyPrefix)) {
            blocky[key.slice(blockyPrefix.length)] = localStorage.getItem(key);
          }
        }
      }

      // Save entity JSON file (single source of truth)
      const entityData = {
        ...form,
        recipe: recipeData,
        dataComponents,
        enabledMethods,
        blockGraphs: Object.keys(blocky).length > 0 ? blocky : {},
        modelJsonData: cached.modelJsonData || {},
      };
      await itemStore.saveItem(form.id, entityData);

      const augmented = {
        ...form,
        hasCustomClass,
        enabledMethods,
        blockEditorPrefix: `item::${form.id}`,
        recipeData,
        dataComponents,
      };
      const results = await injectItem(augmented);
      const allOk = results.every(r => r.ok);
      setSaveStatus({ ok: allOk, msg: allOk ? 'Saved & injected' : 'Partial failure', results });
      if (allOk) {
        originalIdRef.current = form.id;
        window.dispatchEvent(new CustomEvent('ycs-item-changed'));
      }
    } catch (err) {
      setSaveStatus({ ok: false, msg: err.message });
    } finally {
      setSaving(false);
    }
  }, [form]);

  const cleanupItemStorage = useCallback((itemId) => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith(`ycs-blocky::item::${itemId}::`) ||
        key === `ycs-methods::item::${itemId}` ||
        key.startsWith(`ycs-blocky-seed::`) && localStorage.getItem(key)?.startsWith(`item::${itemId}::`)
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }, []);

  const handleDelete = useCallback(async () => {
    if (!form.id) return;
    setSaving(true);
    try {
      await removeItem(form.id);
      cleanupItemStorage(form.id);
      await itemStore.deleteItemFile(form.id);
      setSaveStatus({ ok: true, msg: 'Removed from mod' });
      window.dispatchEvent(new CustomEvent('ycs-item-changed'));
    } catch (err) {
      setSaveStatus({ ok: false, msg: err.message });
    } finally {
      setSaving(false);
    }
  }, [form.id]);

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

        <CheckboxRow label="Multiple States" checked={form.multipleStates} onChange={v => {
          if (v) {
            // Switching to multistate: close single-state child tiles
            const mainTex = findNodeByTabId(`Item Texture::${tileId}::main`);
            if (mainTex) window.dispatchEvent(new CustomEvent('ycs-close-tab-recursive', { detail: { targetId: mainTex.id } }));
            const mainModel = findNodeByTabId(`Item Model JSON::${tileId}::model-json`);
            if (mainModel) window.dispatchEvent(new CustomEvent('ycs-close-tab-recursive', { detail: { targetId: mainModel.id } }));
          } else {
            // Switching from multistate: close all state child tiles
            for (let i = 0; i < 16; i++) {
              const stTex = findNodeByTabId(`Item Texture::${tileId}::state-${i}`);
              if (stTex) window.dispatchEvent(new CustomEvent('ycs-close-tab-recursive', { detail: { targetId: stTex.id } }));
              const stModel = findNodeByTabId(`Item Model JSON::${tileId}::state-${i}-model-json`);
              if (stModel) window.dispatchEvent(new CustomEvent('ycs-close-tab-recursive', { detail: { targetId: stModel.id } }));
            }
          }
          F('multipleStates', v);
          if (v && form.stateCount < 2) F('stateCount', 2);
        }} />

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

        <CheckboxRow label="Tool" checked={form.isTool} onChange={v => { F('isTool', v); if (v) { F('isFood', false); F('isFuel', false); } }} />
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
            <DualRow
              label1="Duration (ticks)"
              children1={<NumberInput value={form.useDuration} onChange={v => F('useDuration', v)} />}
              label2="Animation"
              children2={
                <StandardDropdownField value={form.useAnimation} onChange={v => F('useAnimation', v)} options={[
                  { label: 'None', value: 'NONE' },
                  { label: 'Eat', value: 'EAT' },
                  { label: 'Drink', value: 'DRINK' },
                  { label: 'Block', value: 'BLOCK' },
                  { label: 'Bow', value: 'BOW' },
                  { label: 'Spear', value: 'SPEAR' },
                  { label: 'Crossbow', value: 'CROSSBOW' },
                  { label: 'Spyglass', value: 'SPYGLASS' },
                  { label: 'Toot Horn', value: 'TOOT_HORN' },
                  { label: 'Brush', value: 'BRUSH' },
                ]} />
              }
            />
            <CheckboxRow label="No Slowdown" checked={form.noSlowdown} onChange={v => F('noSlowdown', v)} />
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

        {!form.isTool && (
          <FullWidthRow label="Stack Size">
            <NumberInput value={form.stackSize} onChange={v => F('stackSize', String(Math.max(1, Math.min(99, parseInt(v) || 64))))} />
          </FullWidthRow>
        )}

        <Separator />

        <SectionHeader title="Creative Tab" />

        <FullWidthRow label="Tab">
          <DropdownField value={form.creativeTab} onChange={v => F('creativeTab', v)} options={[
            { label: 'None', value: '' },
            { label: 'Yebisu RPG', value: 'yebisurpg_tab' },
            { label: 'Combat', value: 'combat' },
            { label: 'Tools & Utilities', value: 'tools_and_utilities' },
            { label: 'Food & Drinks', value: 'food_and_drinks' },
            { label: 'Ingredients', value: 'ingredients' },
            { label: 'Building Blocks', value: 'building_blocks' },
            { label: 'Natural Blocks', value: 'natural_blocks' },
            { label: 'Functional Blocks', value: 'functional_blocks' },
            { label: 'Redstone', value: 'redstone_blocks' },
            { label: 'Colored Blocks', value: 'colored_blocks' },
            { label: 'Spawn Eggs', value: 'spawn_eggs' },
            { label: 'Operator', value: 'op_blocks' },
            ...customTabs.map(t => ({ label: t.displayName || t.key, value: t.key })),
          ]} />
        </FullWidthRow>

        <Separator />

        <SectionHeader title="Tags" />

        <FullWidthRow label="Item Tags">
          <ChildTileField
            summary={(() => {
              const parts = [];
              if (form.tags) parts.push(form.tags);
              if (form.hasUseDuration && form.noSlowdown) parts.push('no_slowdown');
              return parts.length ? parts.join(', ') : null;
            })()}
            hasContent={!!form.tags || (form.hasUseDuration && form.noSlowdown)}
            onClickSet={() => toggleChildTile('Item Tags', 'tags')}
            isOpen={isChildOpen('Item Tags', 'tags')}
          />
        </FullWidthRow>

        <Separator />

        <SectionHeader title="Recipe" />

        <FullWidthRow label="Recipe">
          <ChildTileField
            summary={(() => {
              const cached = form.id ? itemStore.getCached(form.id) : null;
              const rd = cached?.recipe || null;
              if (!rd) return null;
              const parts = [];
              if (rd.craftingEnabled && rd.slots?.some(s => s)) parts.push(rd.craftingShape || 'shaped');
              if (rd.smeltingEnabled) parts.push('smelting');
              if (rd.blastingEnabled) parts.push('blasting');
              if (rd.smokingEnabled) parts.push('smoking');
              if (rd.campfireEnabled) parts.push('campfire');
              if (rd.stonecuttingEnabled) parts.push('stonecutting');
              return parts.length ? parts.join(', ') : null;
            })()}
            hasContent={(() => {
              const cached = form.id ? itemStore.getCached(form.id) : null;
              const rd = cached?.recipe || null;
              return rd && (rd.craftingEnabled || rd.smeltingEnabled || rd.blastingEnabled || rd.smokingEnabled || rd.campfireEnabled || rd.stonecuttingEnabled);
            })()}
            onClickSet={() => toggleChildTile('Item Recipe', 'recipe')}
            isOpen={isChildOpen('Item Recipe', 'recipe')}
          />
        </FullWidthRow>

        <Separator />

        <SectionHeader title="Methods" />

        <FullWidthRow label="Methods">
          <ChildTileField
            summary={(() => {
              const cached = form.id ? itemStore.getCached(form.id) : null;
              const em = cached?.enabledMethods || [];
              return em.length > 0 ? `${em.length} method(s)` : null;
            })()}
            hasContent={(() => {
              const cached = form.id ? itemStore.getCached(form.id) : null;
              return (cached?.enabledMethods || []).length > 0;
            })()}
            onClickSet={() => toggleChildTile('Item Methods', 'methods')}
            isOpen={isChildOpen('Item Methods', 'methods')}
          />
        </FullWidthRow>

        <Separator />

        <SectionHeader title="Data Components" />

        <FullWidthRow label="Components">
          <ChildTileField
            summary={(() => {
              const cached = form.id ? itemStore.getCached(form.id) : null;
              const dc = cached?.dataComponents || [];
              return dc.length > 0 ? `${dc.length} component(s)` : null;
            })()}
            hasContent={(() => {
              const cached = form.id ? itemStore.getCached(form.id) : null;
              const dc = cached?.dataComponents || [];
              return dc.length > 0;
            })()}
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
        {saveStatus && (
          <span style={{ fontSize: 11, color: saveStatus.ok ? '#5ba558' : '#e05252', marginRight: 'auto' }}>
            {saveStatus.msg}
          </span>
        )}
        <button className="ycs-button" onClick={handleDelete} disabled={saving}>Remove</button>
        <button className="ycs-button" onClick={() => { if (onClose) onClose(); }} disabled={saving}>Cancel</button>
        <button className="ycs-button" onClick={handleSave} disabled={saving}>Save</button>
        <button className="ycs-button" onClick={async () => { await handleSave(); if (onClose) onClose(); }} disabled={saving}>
          {saving ? 'Saving...' : 'Save & Close'}
        </button>
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
