import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StandardDropdownField, NumberInput, Divider } from './Field/Field';
import ItemSelector from './ItemSelector';

const SHAPE_OPTIONS = [
  { label: 'Shaped', value: 'shaped' },
  { label: 'Shapeless', value: 'shapeless' },
];

const STORAGE_PREFIX = 'ycs-recipe::';

function makeDefault() {
  return {
    craftingEnabled: true,
    craftingShape: 'shaped',
    craftingCount: 1,
    slots: [null, null, null, null, null, null, null, null, null],
    smeltingEnabled: false, smeltingInput: null, smeltingXP: '0.1', smeltingTime: '200',
    blastingEnabled: false, blastingInput: null, blastingXP: '0.1', blastingTime: '100',
    smokingEnabled: false, smokingInput: null, smokingXP: '0.1', smokingTime: '100',
    campfireEnabled: false, campfireInput: null, campfireXP: '0.1', campfireTime: '600',
    stonecuttingEnabled: false, stonecuttingInput: null, stonecuttingCount: 1,
  };
}

function readState(id) { try { const r = localStorage.getItem(STORAGE_PREFIX + id); return r ? JSON.parse(r) : null; } catch { return null; } }
function writeState(id, d) { localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(d)); }


const SlotSquare = React.forwardRef(({ item, selected, onClick, onMouseEnter, onContextMenu, size = 48 }, ref) => (
  <div ref={ref} onClick={onClick} onMouseEnter={onMouseEnter} onContextMenu={onContextMenu}
    style={{
      width: size, height: size,
      border: `2px solid ${selected ? 'var(--ycs-highlight)' : 'var(--ycs-foreground)'}`,
      borderRadius: 'var(--ycs-radius, 4px)', backgroundColor: 'transparent',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', transition: 'border-color 0.1s',
      position: 'relative', overflow: 'hidden',
    }}>
    {item ? (
      <div style={{ fontSize: '8px', opacity: 0.8, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden',
        textOverflow: 'ellipsis', width: '100%', padding: '0 2px' }}>
        {item.replace(/^[#]?[^:]+:/, '').replace(/_/g, ' ')}
      </div>
    ) : (
      <div style={{ opacity: 0.15, fontSize: '18px' }}>+</div>
    )}
  </div>
));

const ArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, flexShrink: 0 }}>
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

const SectionCheckbox = ({ label, checked, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: 'var(--ycs-highlight)' }} />
    {label}
  </label>
);


// Inline ingredient slot — smaller, used for cook/stonecutter rows
const InlineSlot = React.forwardRef(({ item, selected, onClick, onContextMenu }, ref) => (
  <div ref={ref} onClick={onClick} onContextMenu={onContextMenu}
    style={{
      width: 32, height: 24, minWidth: 32,
      border: `1px solid ${selected ? 'var(--ycs-highlight)' : 'var(--ycs-foreground)'}`,
      borderRadius: 'var(--ycs-radius, 4px)', backgroundColor: 'transparent',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'border-color 0.1s', overflow: 'hidden',
    }}>
    {item ? (
      <div style={{ fontSize: '8px', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 2px' }}>
        {item.replace(/^[#]?[^:]+:/, '').replace(/_/g, ' ')}
      </div>
    ) : (
      <div style={{ opacity: 0.15, fontSize: '12px' }}>+</div>
    )}
  </div>
));

export default function RecipeEditorPage({ isTile = false, onClose, nodeId, tree, tabId }) {
  const stateKey = tabId || nodeId || 'recipe-default';
  const [recipe, setRecipeRaw] = useState(() => readState(stateKey) || makeDefault());
  const [picker, setPicker] = useState(null);
  const [brushItem, setBrushItem] = useState(null);
  const [brushActive, setBrushActive] = useState(false);
  const slotRefs = useRef({});

  const setRecipe = useCallback((updater) => {
    setRecipeRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      writeState(stateKey, next);
      return next;
    });
  }, [stateKey]);

  const R = useCallback((key, value) => {
    setRecipe(prev => ({ ...prev, [key]: value }));
  }, [setRecipe]);

  const openPicker = (slot, el) => {
    if (!el) return;
    setPicker({ slot, rect: el.getBoundingClientRect() });
  };

  const handlePickItem = (itemId) => {
    const slot = picker?.slot;
    if (slot == null) return;
    if (typeof slot === 'number') {
      setRecipe(prev => {
        const slots = [...prev.slots];
        slots[slot] = itemId;
        return { ...prev, slots };
      });
      setBrushItem(itemId);
      setBrushActive(true);
    } else {
      R(slot, itemId);
    }
    setPicker(null);
  };

  const handleSlotHover = (i) => {
    if (!brushActive || brushItem == null) return;
    setRecipe(prev => {
      if (prev.slots[i] === brushItem) return prev;
      const slots = [...prev.slots];
      slots[i] = brushItem;
      return { ...prev, slots };
    });
  };

  useEffect(() => {
    if (!brushActive) return;
    const stop = () => setBrushActive(false);
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, [brushActive]);

  const clearGridSlot = (e, i) => {
    e.preventDefault();
    setRecipe(prev => {
      const slots = [...prev.slots];
      slots[i] = null;
      return { ...prev, slots };
    });
  };

  const clearKey = (e, key) => {
    e.preventDefault();
    R(key, null);
  };

  // Cook section: [checkbox] Label [ingredient] [cook time] [xp]
  const renderCookRow = (key, label, showXP = true) => {
    const enabled = recipe[`${key}Enabled`];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <SectionCheckbox label={label} checked={enabled} onChange={v => R(`${key}Enabled`, v)} />
        {enabled && (
          <>
            <InlineSlot
              ref={el => slotRefs.current[`${key}Input`] = el}
              item={recipe[`${key}Input`]}
              selected={picker?.slot === `${key}Input`}
              onClick={() => openPicker(`${key}Input`, slotRefs.current[`${key}Input`])}
              onContextMenu={e => clearKey(e, `${key}Input`)}
            />
            <NumberInput value={recipe[`${key}Time`]} onChange={v => R(`${key}Time`, v)} style={{ width: '55px' }} />
            <span style={{ fontSize: '10px', opacity: 0.4 }}>ticks</span>
            {showXP && (
              <>
                <NumberInput value={recipe[`${key}XP`]} onChange={v => R(`${key}XP`, v)} style={{ width: '45px' }} />
                <span style={{ fontSize: '10px', opacity: 0.4 }}>xp</span>
              </>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column',
        backgroundColor: 'transparent', color: 'var(--ycs-text)',
      }}>
        <div style={{ padding: '12px 16px', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Recipe</h2>
        </div>
        <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '12px 16px' }}>
          {/* ── Crafting ──────────────────────────── */}
          <SectionCheckbox label="Crafting" checked={recipe.craftingEnabled} onChange={v => R('craftingEnabled', v)} />
          {recipe.craftingEnabled && (
            <div style={{ paddingLeft: '22px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 48px)', gap: '4px' }}>
                  {recipe.slots.map((slot, i) => (
                    <SlotSquare
                      key={i}
                      ref={el => slotRefs.current[i] = el}
                      item={slot}
                      selected={picker?.slot === i}
                      onClick={() => {
                        if (brushItem != null) {
                          setRecipe(prev => {
                            const slots = [...prev.slots];
                            slots[i] = brushItem;
                            return { ...prev, slots };
                          });
                        } else {
                          openPicker(i, slotRefs.current[i]);
                        }
                      }}
                      onMouseEnter={() => handleSlotHover(i)}
                      onContextMenu={e => clearGridSlot(e, i)}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '52px' }}>
                  <div style={{ width: '120px' }}>
                    <StandardDropdownField value={recipe.craftingShape} onChange={v => R('craftingShape', v)} options={SHAPE_OPTIONS} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <NumberInput value={String(recipe.craftingCount || 1)} onChange={v => R('craftingCount', Math.max(1, parseInt(v) || 1))} />
                    <span style={{ fontSize: '10px', opacity: 0.4 }}>count</span>
                  </div>
                </div>
              </div>
              {brushItem != null && (
                <div style={{ marginTop: '6px', fontSize: '10px', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Brush: <strong>{brushItem.replace(/^[#]?[^:]+:/, '')}</strong> — click slots to paint, right-click to clear</span>
                  <button className="ycs-button icon" onClick={() => setBrushItem(null)} title="Clear brush" style={{ width: '22px', height: '22px', minWidth: '22px', padding: 0, flexShrink: 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}

          <Divider style={{ margin: '12px 0' }} />
          {renderCookRow('smelting', 'Smelting')}
          <Divider style={{ margin: '12px 0' }} />
          {renderCookRow('blasting', 'Blasting')}
          <Divider style={{ margin: '12px 0' }} />
          {renderCookRow('smoking', 'Smoking')}
          <Divider style={{ margin: '12px 0' }} />
          {renderCookRow('campfire', 'Campfire Cooking')}
          <Divider style={{ margin: '12px 0' }} />

          {/* ── Stonecutting ───────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SectionCheckbox label="Stonecutting" checked={recipe.stonecuttingEnabled} onChange={v => R('stonecuttingEnabled', v)} />
            {recipe.stonecuttingEnabled && (
              <>
                <InlineSlot
                  ref={el => slotRefs.current['stonecuttingInput'] = el}
                  item={recipe.stonecuttingInput}
                  selected={picker?.slot === 'stonecuttingInput'}
                  onClick={() => openPicker('stonecuttingInput', slotRefs.current['stonecuttingInput'])}
                  onContextMenu={e => clearKey(e, 'stonecuttingInput')}
                />
                <NumberInput value={String(recipe.stonecuttingCount)} onChange={v => R('stonecuttingCount', Math.max(1, parseInt(v) || 1))} />
                <span style={{ fontSize: '10px', opacity: 0.4 }}>count</span>
              </>
            )}
          </div>
        </div>
      </div>

      {picker && (
        <ItemSelector
          anchorRect={picker.rect}
          onSelect={handlePickItem}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
