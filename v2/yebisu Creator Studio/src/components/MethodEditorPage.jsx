import React, { useState, useEffect, useMemo } from 'react';
import { StandardDropdownField } from './Field/Field';
import * as itemStore from '../store/itemStore';

const USE_ANIMATIONS = [
  { value: 'NONE', label: 'None' },
  { value: 'EAT', label: 'Eat' },
  { value: 'DRINK', label: 'Drink' },
  { value: 'BLOCK', label: 'Block' },
  { value: 'BOW', label: 'Bow' },
  { value: 'SPEAR', label: 'Spear' },
  { value: 'CROSSBOW', label: 'Crossbow' },
  { value: 'SPYGLASS', label: 'Spyglass' },
  { value: 'TOOT_HORN', label: 'Horn' },
  { value: 'BRUSH', label: 'Brush' },
];

const ITEM_METHODS = [
  { key: 'useOn', label: 'Block Interaction', sig: 'useOn(UseOnContext context)' },
  { key: 'use', label: 'Interaction', sig: 'use(Level, Player, InteractionHand)' },
  { key: 'continuousUse', label: 'Continuous Use', sig: 'onUseTick(Level, LivingEntity, ItemStack, int)', requires: 'use' },
  { key: 'finishUsingItem', label: 'Finished Using', sig: 'finishUsingItem(ItemStack, Level, LivingEntity)' },
  { key: 'inventoryTick', label: 'Inventory Tick', sig: 'inventoryTick(ItemStack, Level, Entity, int, boolean)' },
  { key: 'hurtEnemy', label: 'Combat / Hurt Entity', sig: 'hurtEnemy(ItemStack, LivingEntity, LivingEntity)' },
  { key: 'interactLivingEntity', label: 'Entity Interaction', sig: 'interactLivingEntity(ItemStack, Player, LivingEntity, InteractionHand)' },
];

export { ITEM_METHODS };

function resolveItemId(tabId, nodeId) {
  const stableId = tabId || nodeId;
  const seeded = localStorage.getItem('ycs-child-item-id::' + stableId);
  if (seeded) return seeded;
  const parts = (stableId || '').split('::');
  if (parts.length >= 3) {
    return parts[parts.length - 2];
  }
  return '';
}

function hasBlockData(itemId, methodKey) {
  const graphs = itemStore.getSection(itemId, 'blockGraphs');
  if (!graphs) return false;
  const data = graphs[methodKey];
  if (!data) return false;
  return Array.isArray(data) ? data.length > 1 : !!data;
}

export default function MethodEditorPage({ isTile = false, onClose, nodeId, tree, tabId }) {
  const tileId = tabId || nodeId;
  const itemId = resolveItemId(tabId, nodeId);

  const [parentForm, setParentForm] = useState(() => {
    if (itemId) {
      const cached = itemStore.getCached(itemId);
      if (cached) return cached;
    }
    return {};
  });

  const [enabledMethods, setEnabledMethods] = useState(() => {
    if (itemId) {
      const stored = itemStore.getSection(itemId, 'enabledMethods');
      if (stored) return stored;
    }
    return [];
  });

  useEffect(() => {
    if (!itemId) return;
    return itemStore.subscribe(itemId, (data) => {
      if (data) {
        setParentForm(data);
        if (data.enabledMethods) setEnabledMethods(data.enabledMethods);
      }
    });
  }, [itemId]);

  const updateParentField = (key, value) => {
    setParentForm(prev => {
      const next = { ...prev, [key]: value };
      if (itemId) itemStore.setCached(itemId, next);
      return next;
    });
  };

  useEffect(() => {
    if (itemId) itemStore.updateSection(itemId, 'enabledMethods', enabledMethods);
  }, [enabledMethods, itemId]);

  const findNodeByTabId = (searchTabId) => {
    if (!tree) return null;
    const search = (node) => {
      if (node.tabId === searchTabId) return node;
      if (node.children) for (const c of node.children) { const r = search(c); if (r) return r; }
      return null;
    };
    return search(tree);
  };

  const blockEditorPrefix = itemId ? `item::${itemId}` : `Block Editor::${tileId}`;

  const openEditor = (methodKey) => {
    const childTabId = `Block Editor::${tileId}::${methodKey}`;
    const existing = findNodeByTabId(childTabId);
    if (existing) {
      window.dispatchEvent(new CustomEvent('ycs-close-tab-recursive', {
        detail: { targetId: existing.id }
      }));
    } else {
      if (!enabledMethods.includes(methodKey)) {
        setEnabledMethods(prev => [...prev, methodKey]);
      }
      const storageKey = `${blockEditorPrefix}::${methodKey}`;
      localStorage.setItem('ycs-blocky-seed::' + childTabId, storageKey);
      if (itemId) localStorage.setItem('ycs-child-item-id::' + childTabId, itemId);
      window.dispatchEvent(new CustomEvent('ycs-toggle-child', {
        detail: {
          parentId: nodeId,
          targetNodeId: nodeId,
          childTabId,
          direction: 'right',
          isOpen: true,
        }
      }));
    }
  };

  const isMethodOpen = (methodKey) => {
    const childTabId = `Block Editor::${tileId}::${methodKey}`;
    return !!findNodeByTabId(childTabId);
  };

  const closeBlockEditor = (methodKey) => {
    const childTabId = `Block Editor::${tileId}::${methodKey}`;
    const existing = findNodeByTabId(childTabId);
    if (existing) {
      window.dispatchEvent(new CustomEvent('ycs-close-tab-recursive', { detail: { targetId: existing.id } }));
    }
  };

  const closePalette = () => {
    const paletteNode = findNodeByTabId('Block Palette');
    if (paletteNode) {
      window.dispatchEvent(new CustomEvent('ycs-close-tab-recursive', { detail: { targetId: paletteNode.id } }));
    }
  };

  const toggleMethod = (key, checked) => {
    if (checked) {
      setEnabledMethods(prev => [...prev, key]);
      return;
    }
    const toRemove = [key];
    if (key === 'use') toRemove.push('continuousUse', 'releaseUsing');
    toRemove.forEach(k => closeBlockEditor(k));
    setEnabledMethods(prev => {
      const next = prev.filter(k => !toRemove.includes(k));
      if (next.length === 0) closePalette();
      return next;
    });
  };

  const isEnabled = (key) => enabledMethods.includes(key);

  const noSlowdown = (parentForm.tags || '').includes('yebisurpg:no_use_slowdown');

  const toggleNoSlowdown = (checked) => {
    const tags = parentForm.tags || '';
    const tagArr = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (checked) {
      if (!tagArr.includes('yebisurpg:no_use_slowdown')) tagArr.push('yebisurpg:no_use_slowdown');
    } else {
      const idx = tagArr.indexOf('yebisurpg:no_use_slowdown');
      if (idx >= 0) tagArr.splice(idx, 1);
    }
    updateParentField('tags', tagArr.join(', '));
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', backgroundColor: 'transparent',
        color: 'var(--ycs-text)',
      }}>
        <div style={{ padding: '12px 16px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Methods</h2>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 16px' }}>
          {ITEM_METHODS.map(m => {
            const on = isEnabled(m.key);
            const has = hasBlockData(itemId, m.key);
            const gated = m.requires && !isEnabled(m.requires);
            const isCont = m.key === 'continuousUse';

            return (
              <div key={m.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: on && !gated ? '0' : '15px', opacity: gated ? 0.35 : 1 }}>
                  <input
                    type="checkbox" className="ycs-checkbox"
                    checked={on && !gated}
                    disabled={gated}
                    onChange={e => toggleMethod(m.key, e.target.checked)}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '13px', userSelect: 'none' }}>{m.label}</span>
                    {gated && (
                      <span style={{ fontSize: 10, color: '#e8a868', background: '#3a2010', padding: '1px 5px', borderRadius: 3, marginLeft: 6 }}>
                        requires Interaction
                      </span>
                    )}
                  </div>
                  {on && !gated && !isCont && (
                    <button
                      className={`ycs-button inline${isMethodOpen(m.key) ? ' active' : ''}`}
                      onClick={() => openEditor(m.key)}
                      style={{ flexShrink: 0 }}
                    >
                      {has ? 'edit' : 'set'}
                    </button>
                  )}
                </div>

                {on && !gated && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ paddingLeft: '16px', borderLeft: '2px solid var(--ycs-foreground)' }}>
                      {!isCont ? (
                        <div style={{ fontSize: '10px', opacity: 0.4, fontFamily: 'monospace', padding: '4px 0' }}>{m.sig}</div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                            <input type="checkbox" className="ycs-checkbox" checked={noSlowdown} onChange={e => toggleNoSlowdown(e.target.checked)} />
                            <span style={{ fontSize: '13px', userSelect: 'none' }}>No Slowdown</span>
                          </div>

                          <div style={{ display: 'flex', gap: 6, marginBottom: '10px' }}>
                            <button
                              className={`ycs-button inline${isMethodOpen('continuousUse') ? ' active' : ''}`}
                              onClick={() => openEditor('continuousUse')}
                            >
                              {hasBlockData(itemId, 'continuousUse') ? 'edit' : 'set'} onUseTick
                            </button>
                            <button
                              className={`ycs-button inline${isMethodOpen('releaseUsing') ? ' active' : ''}`}
                              onClick={() => openEditor('releaseUsing')}
                            >
                              {hasBlockData(itemId, 'releaseUsing') ? 'edit' : 'set'} releaseUsing
                            </button>
                          </div>
                        </>
                      )}
                    </div>
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
