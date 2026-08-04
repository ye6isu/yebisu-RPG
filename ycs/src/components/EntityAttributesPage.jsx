import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { StringField } from './Field/Field';
import { VANILLA_ATTRIBUTES } from './BlockEditor';

// Attributes that vanilla's construction-time machinery hard-requires — see
// YcsMobEntity's FOLLOW_RANGE javadoc for the class of crash omitting one causes.
// Value-editable, but not removable from the list.
const LOCKED_ATTRIBUTE_IDS = new Set(['generic.max_health', 'generic.movement_speed']);

// Bare minimum every entity needs — see LOCKED_ATTRIBUTE_IDS above for why these
// two can't be removed. Everything else (attack damage, armor, scale, etc.) is
// opt-in via "Add Attribute", not pre-populated.
export const DEFAULT_ENTITY_ATTRIBUTES = [
  { id: 'generic.max_health', value: 20 },
  { id: 'generic.movement_speed', value: 0.25 },
];

function attributeLabel(id, modAttributes) {
  const vanilla = VANILLA_ATTRIBUTES.find(a => a.value === id);
  if (vanilla) return vanilla.label;
  const mod = modAttributes.find(a => a.name === id);
  if (mod) return mod.titleText || mod.name;
  return id;
}

function AddAttributeDropdown({ modAttributes, existingIds, onAdd, onClose }) {
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const options = [
    ...VANILLA_ATTRIBUTES.map(a => ({ value: a.value, label: a.label })),
    ...modAttributes.map(a => ({ value: a.name, label: `${a.titleText || a.name} (Mod)` })),
  ].filter(o => !existingIds.has(o.value) && (!search || o.label.toLowerCase().includes(search.toLowerCase())));

  return (
    <div ref={ref} className="dropdown" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', zIndex: 10, maxHeight: '260px', overflowY: 'auto', minWidth: '220px' }}>
      <div style={{ padding: '4px' }}>
        <input
          className="ycs-string-input"
          autoFocus
          placeholder="Search attributes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>
      <div className="dropdown-separator" />
      {options.length === 0 && <div style={{ padding: '8px', fontSize: '12px', opacity: 0.5 }}>No matches.</div>}
      {options.map(o => (
        <div key={o.value} className="dropdown-item" onClick={() => { onAdd(o.value); onClose(); }}>
          {o.label}
        </div>
      ))}
    </div>
  );
}

function AttributeRow({ id, value, label, locked, onChangeValue, onDelete }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px',
        borderRadius: 'var(--ycs-radius, 4px)', border: '1px solid var(--ycs-foreground)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: '500', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </div>
          <StringField value={String(value)} onChange={v => onChangeValue(id, v)} style={{ width: '90px' }} />
      {!locked && (
        <div onClick={() => onDelete(id)} title="Remove" style={{ width: 18, height: 18, cursor: 'pointer', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <circle cx="9" cy="9" r="9" fill="white" />
            <line x1="5" y1="9" x2="13" y2="9" stroke="black" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}

export default function EntityAttributesPage({ entityId, attributes, onChange, onBack }) {
  const [modAttributes, setModAttributes] = useState([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    invoke('list_ycs_data', { category: 'attributes' }).then(async (ids) => {
      const loaded = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'attributes', id });
          const attribute = JSON.parse(raw);
          if (!attribute.resourceManaged) loaded.push(attribute);
        } catch {}
      }
      setModAttributes(loaded);
    }).catch(() => setModAttributes([]));
  }, []);

  const list = attributes && attributes.length > 0 ? attributes : DEFAULT_ENTITY_ATTRIBUTES;

  const changeValue = (id, v) => {
    const num = parseFloat(v);
    onChange(list.map(a => a.id === id ? { ...a, value: Number.isNaN(num) ? a.value : num } : a));
  };

  const remove = (id) => {
    if (LOCKED_ATTRIBUTE_IDS.has(id)) return;
    onChange(list.filter(a => a.id !== id));
  };

  const add = (id) => {
    if (list.some(a => a.id === id)) return;
    onChange([...list, { id, value: 0 }]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button className="ycs-tiny-button" onClick={onBack} title="Back" style={{ border: '1px solid var(--ycs-foreground)' }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 12L6 8l4-4"/></svg>
        </button>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500', flex: 1 }}>
          Entity Attributes: {entityId || 'New Entity'}
        </h2>
        <div style={{ position: 'relative' }}>
          <button className="ycs-button" onClick={() => setShowAdd(v => !v)}>Add Attribute</button>
          {showAdd && (
            <AddAttributeDropdown
              modAttributes={modAttributes}
              existingIds={new Set(list.map(a => a.id))}
              onAdd={add}
              onClose={() => setShowAdd(false)}
            />
          )}
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {list.map(a => (
          <AttributeRow
            key={a.id}
            id={a.id}
            value={a.value}
            label={attributeLabel(a.id, modAttributes)}
            locked={LOCKED_ATTRIBUTE_IDS.has(a.id)}
            onChangeValue={changeValue}
            onDelete={remove}
          />
        ))}
      </div>
    </div>
  );
}
