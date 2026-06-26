import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StringField } from './Field/Field';

const STORAGE_PREFIX = 'ycs-data-components::';

const COMPONENT_TYPES = [
  { label: 'Number', value: 'number', defaultValue: '0' },
  { label: 'Decimal', value: 'decimal', defaultValue: '0.0' },
  { label: 'Logic', value: 'logic', defaultValue: false },
  { label: 'Text', value: 'text', defaultValue: '' },
  { label: 'ItemStack', value: 'itemstack', defaultValue: '' },
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

function readState(nodeId) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + nodeId);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeState(nodeId, data) {
  localStorage.setItem(STORAGE_PREFIX + nodeId, JSON.stringify(data));
}

export default function DataComponentEditorPage({ isTile = false, onClose, nodeId, tree, tabId }) {
  const stableId = tabId || nodeId;
  const [components, setComponentsRaw] = useState(() => readState(stableId) || []);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addBtnRef = useRef(null);

  useEffect(() => {
    const saved = readState(stableId);
    if (saved) setComponentsRaw(saved);
  }, [stableId]);

  const setComponents = useCallback((updater) => {
    setComponentsRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      writeState(stableId, next);
      return next;
    });
  }, [stableId]);

  const addComponent = (type) => {
    const typeDef = COMPONENT_TYPES.find(t => t.value === type);
    setComponents(prev => [...prev, {
      name: '',
      type,
      defaultValue: typeDef ? typeDef.defaultValue : '',
    }]);
    setShowAddMenu(false);
  };

  const removeComponent = (index) => {
    setComponents(prev => prev.filter((_, i) => i !== index));
  };

  const updateComponent = (index, key, value) => {
    setComponents(prev => prev.map((c, i) => i === index ? { ...c, [key]: value } : c));
  };

  useEffect(() => {
    if (!showAddMenu) return;
    const handleClick = (e) => {
      if (addBtnRef.current && !addBtnRef.current.contains(e.target)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showAddMenu]);

  const renderValueField = (comp, index) => {
    switch (comp.type) {
      case 'number':
        return <NumberInput value={comp.defaultValue} onChange={v => updateComponent(index, 'defaultValue', v)} />;
      case 'decimal':
        return <NumberInput value={comp.defaultValue} onChange={v => updateComponent(index, 'defaultValue', v)} />;
      case 'logic':
        return (
          <input
            type="checkbox"
            className="ycs-checkbox"
            checked={!!comp.defaultValue}
            onChange={e => updateComponent(index, 'defaultValue', e.target.checked)}
          />
        );
      case 'text':
        return <StringField value={comp.defaultValue} onChange={v => updateComponent(index, 'defaultValue', v)} style={{ width: '100%' }} />;
      case 'itemstack':
        return (
          <div style={{
            padding: '4px 8px', fontSize: '12px', opacity: 0.5,
            border: '1px solid var(--ycs-foreground)', borderRadius: 'var(--ycs-radius, 4px)',
            height: '24px', display: 'flex', alignItems: 'center', boxSizing: 'border-box',
          }}>
            Item picker placeholder
          </div>
        );
      default:
        return null;
    }
  };

  const getTypeLabel = (type) => {
    const found = COMPONENT_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

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
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Data Components</h2>
          <div style={{ position: 'relative' }} ref={addBtnRef}>
            <button
              className="ycs-button icon"
              onClick={() => setShowAddMenu(!showAddMenu)}
              title="Add Component"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            {showAddMenu && (
              <div className="dropdown" style={{
                position: 'absolute', top: '32px', right: 0, zIndex: 1000,
                minWidth: '140px',
              }}>
                {COMPONENT_TYPES.map(t => (
                  <div
                    key={t.value}
                    className="dropdown-item"
                    onClick={() => addComponent(t.value)}
                  >
                    {t.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0, padding: '16px 20px' }}>
          {components.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.5, fontSize: '13px' }}>
              No data components added.
            </div>
          )}

          {components.map((comp, index) => (
            <div
              key={index}
              style={{
                border: '1px solid var(--ycs-foreground)',
                borderRadius: 'var(--ycs-radius, 4px)',
                padding: '12px',
                marginBottom: '10px',
                position: 'relative',
              }}
            >
              {/* Remove button */}
              <button
                className="ycs-button icon"
                onClick={() => removeComponent(index)}
                style={{ position: 'absolute', top: '6px', right: '6px', width: '22px', height: '22px', minWidth: '22px' }}
                title="Remove"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingRight: '30px' }}>
                <span style={{ fontSize: '12px', opacity: 0.6, whiteSpace: 'nowrap', minWidth: '40px' }}>Name</span>
                <StringField
                  value={comp.name}
                  onChange={v => updateComponent(index, 'name', v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Type */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', opacity: 0.6, whiteSpace: 'nowrap', minWidth: '40px' }}>Type</span>
                <span style={{
                  fontSize: '12px', padding: '4px 8px',
                  backgroundColor: 'var(--ycs-foreground)',
                  borderRadius: 'var(--ycs-radius, 4px)',
                }}>
                  {getTypeLabel(comp.type)}
                </span>
              </div>

              {/* Default Value */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', opacity: 0.6, whiteSpace: 'nowrap', minWidth: '40px' }}>Default</span>
                {renderValueField(comp, index)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
