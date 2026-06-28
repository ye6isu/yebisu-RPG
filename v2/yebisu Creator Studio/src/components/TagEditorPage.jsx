import React, { useState, useEffect, useCallback } from 'react';

const TAG_STORAGE_PREFIX = 'ycs-tags::';

const TAG_CATEGORIES = [
  {
    label: 'Vanilla',
    tags: [
      'minecraft:swords', 'minecraft:axes', 'minecraft:pickaxes', 'minecraft:shovels', 'minecraft:hoes',
      'minecraft:trimmable_armor', 'minecraft:durability_enchantable', 'minecraft:mining_enchantable',
      'minecraft:damage_enchantable', 'minecraft:fire_aspect_enchantable', 'minecraft:sharp_weapon_enchantable',
      'minecraft:mining_loot_enchantable', 'minecraft:crossbow_enchantable', 'minecraft:bow_enchantable',
      'minecraft:vanishing_enchantable', 'minecraft:breaks_decorated_pots', 'minecraft:piglin_loved',
      'minecraft:fox_food', 'minecraft:beacon_payment_items', 'minecraft:creeper_drop_music_discs',
      'minecraft:coals', 'minecraft:arrows',
    ],
  },
  {
    label: 'NeoForge',
    tags: [
      'neoforge:tools', 'neoforge:tools/swords', 'neoforge:tools/axes', 'neoforge:tools/pickaxes',
      'neoforge:tools/shovels', 'neoforge:tools/hoes', 'neoforge:ores', 'neoforge:ingots', 'neoforge:gems',
      'neoforge:nuggets', 'neoforge:raw_materials', 'neoforge:dusts', 'neoforge:rods', 'neoforge:plates',
      'neoforge:dyes',
    ],
  },
  {
    label: 'Mod',
    tags: [
      'yebisurpg:cursed_item', 'yebisurpg:test_items',
    ],
  },
  {
    label: 'Special',
    tags: [
      'no_slowdown',
    ],
  },
];

function readTags(nodeId) {
  try {
    const raw = localStorage.getItem(TAG_STORAGE_PREFIX + nodeId);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeTags(nodeId, tags) {
  localStorage.setItem(TAG_STORAGE_PREFIX + nodeId, JSON.stringify(tags));
}

export default function TagEditorPage({ isTile = false, onClose, nodeId, tree, tabId }) {
  const stableId = tabId || nodeId;
  const [selected, setSelected] = useState(() => readTags(stableId));
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const saved = readTags(stableId);
    if (saved.length) setSelected(saved);
  }, [stableId]);

  const persist = useCallback((next) => {
    setSelected(next);
    writeTags(stableId, next);
  }, [stableId]);

  const toggleTag = (tag) => {
    if (selected.includes(tag)) {
      persist(selected.filter(t => t !== tag));
    } else {
      persist([...selected, tag]);
    }
  };

  const removeTag = (tag) => {
    persist(selected.filter(t => t !== tag));
  };

  const addCustomTag = () => {
    const trimmed = filter.trim();
    if (!trimmed) return;
    const tag = trimmed.includes(':') ? trimmed : `custom:${trimmed}`;
    if (!selected.includes(tag)) {
      persist([...selected, tag]);
    }
    setFilter('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomTag();
    }
  };

  const q = filter.toLowerCase();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', backgroundColor: 'transparent',
        color: 'var(--ycs-text)',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
        }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Tags</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              className="ycs-string-input"
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ width: '160px' }}
            />
            <button className="ycs-button icon" onClick={addCustomTag} title="Add custom tag">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

        {/* Selected Tags */}
        <div style={{
          padding: '10px 16px', flexShrink: 0, maxHeight: '120px', overflowY: 'auto',
          display: 'flex', flexWrap: 'wrap', gap: '4px', alignContent: 'flex-start',
        }}>
          {selected.length === 0 && (
            <span style={{ fontSize: '12px', opacity: 0.4 }}>No tags selected</span>
          )}
          {selected.map(tag => (
            <div key={tag} style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '2px 8px', fontSize: '11px',
              border: '1px solid var(--ycs-foreground)',
              borderRadius: 'var(--ycs-radius, 4px)',
              backgroundColor: 'transparent',
              whiteSpace: 'nowrap',
            }}>
              <span>{tag}</span>
              <span
                onClick={() => removeTag(tag)}
                style={{ cursor: 'pointer', opacity: 0.6, fontSize: '13px', lineHeight: 1 }}
                title="Remove"
              >×</span>
            </div>
          ))}
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

        {/* Tag List */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {TAG_CATEGORIES.map(cat => {
            const visibleTags = cat.tags.filter(t => !q || t.toLowerCase().includes(q));
            if (visibleTags.length === 0) return null;
            return (
              <div key={cat.label}>
                <div style={{
                  fontSize: '11px', fontWeight: '600', textTransform: 'uppercase',
                  letterSpacing: '0.5px', opacity: 0.5, padding: '8px 12px',
                }}>
                  {cat.label}
                </div>
                {visibleTags.map(tag => {
                  const isSelected = selected.includes(tag);
                  return (
                    <div
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: '6px 12px', fontSize: '13px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        backgroundColor: isSelected ? 'var(--ycs-highlight)' : 'transparent',
                        transition: 'background-color 0.1s',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--ycs-accent)'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <span>{tag}</span>
                      {isSelected && <span style={{ fontSize: '14px' }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
