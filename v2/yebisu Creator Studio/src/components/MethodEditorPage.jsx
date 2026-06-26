import React, { useState, useEffect, useCallback } from 'react';

const STORAGE_PREFIX = 'ycs-methods::';

const ITEM_METHODS = [
  { key: 'useOn', label: 'Block Interaction', sig: 'useOn(UseOnContext context)', desc: 'Called when the item is used on a block (right-click on block)' },
  { key: 'use', label: 'Interaction', sig: 'use(Level, Player, InteractionHand)', desc: 'Called when the item is right-clicked (general use)' },
  { key: 'continuousUse', label: 'Continuous Use', sig: 'onUseTick(Level, LivingEntity, ItemStack, int)', desc: 'Called every tick while the item is being used (held right-click)' },
  { key: 'releaseUsing', label: 'Release Using', sig: 'releaseUsing(ItemStack, Level, LivingEntity, int)', desc: 'Called when the player stops using the item (release right-click)' },
  { key: 'finishUsingItem', label: 'Finished Using', sig: 'finishUsingItem(ItemStack, Level, LivingEntity)', desc: 'Called when the use duration expires (e.g. eating finishes)' },
  { key: 'inventoryTick', label: 'Inventory Tick', sig: 'inventoryTick(ItemStack, Level, Entity, int, boolean)', desc: 'Called every tick while the item is in inventory' },
  { key: 'hurtEnemy', label: 'Combat / Hurt Entity', sig: 'hurtEnemy(ItemStack, LivingEntity, LivingEntity)', desc: 'Called when the item hits an entity' },
  { key: 'interactLivingEntity', label: 'Entity Interaction', sig: 'interactLivingEntity(ItemStack, Player, LivingEntity, InteractionHand)', desc: 'Called when right-clicking an entity with the item' },
];

function readState(nodeId) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + nodeId);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeState(nodeId, data) {
  localStorage.setItem(STORAGE_PREFIX + nodeId, JSON.stringify(data));
}

function makeDefault() {
  const state = {};
  ITEM_METHODS.forEach(m => { state[m.key] = false; });
  return state;
}

export default function MethodEditorPage({ isTile = false, onClose, nodeId, tree, tabId }) {
  const stableId = tabId || nodeId;
  const [state, setStateRaw] = useState(() => readState(stableId) || makeDefault());

  useEffect(() => {
    const saved = readState(stableId);
    if (saved) setStateRaw(saved);
  }, [stableId]);

  const set = useCallback((key, value) => {
    setStateRaw(prev => {
      const next = { ...prev, [key]: value };
      writeState(stableId, next);
      return next;
    });
  }, [stableId]);

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

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '12px 16px' }}>
          <div style={{ fontSize: '11px', opacity: 0.4, marginBottom: '12px' }}>
            Enable Java method overrides for this item. Each method generates a stub in the custom item class.
          </div>
          {ITEM_METHODS.map(m => (
            <div key={m.key} style={{ marginBottom: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!state[m.key]}
                  onChange={e => set(m.key, e.target.checked)}
                  style={{ accentColor: 'var(--ycs-highlight)', marginTop: '2px', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{m.label}</div>
                  <div style={{ fontSize: '10px', opacity: 0.4, fontFamily: 'monospace' }}>{m.sig}</div>
                  <div style={{ fontSize: '10px', opacity: 0.35, marginTop: '2px' }}>{m.desc}</div>
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
