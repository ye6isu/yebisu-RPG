import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { StringField, NumberInput, StandardDropdownField, EditorFooter } from './Field/Field';
import * as itemStore from '../store/itemStore';

const MODID = 'yebisurpg';
const JAVA_BASE = 'java/net/ye6isu/yebisuRPG';
const DATA_COMP_FILE = `${JAVA_BASE}/component/ModDataComponents.java`;
const DATA_COMP_MARKER = 'YCS_DataComponents';

const COMPONENT_TYPES = [
  { label: 'Number', value: 'number', defaultValue: '0' },
  { label: 'Logic', value: 'logic', defaultValue: false },
  { label: 'Text', value: 'text', defaultValue: '' },
  { label: 'ItemStack', value: 'itemstack', defaultValue: '' },
];

const TYPE_TO_JAVA = {
  number: { javaType: 'Integer', codec: 'Codec.INT', netCodec: 'ByteBufCodecs.VAR_INT' },
  logic: { javaType: 'Boolean', codec: 'Codec.BOOL', netCodec: 'ByteBufCodecs.BOOL' },
  text: { javaType: 'String', codec: 'Codec.STRING', netCodec: 'ByteBufCodecs.STRING_UTF8' },
};

function buildJavaLine(comp) {
  const info = TYPE_TO_JAVA[comp.type];
  const regId = comp.id || comp.name;
  if (!info || !regId) return null;
  const constName = (comp.name || regId).toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  return `    public static final DeferredHolder<DataComponentType<?>, DataComponentType<${info.javaType}>> ${constName} = COMPONENTS.register("${regId}", () -> DataComponentType.<${info.javaType}>builder().persistent(${info.codec}).networkSynchronized(${info.netCodec}).build());`;
}

function resolveItemId(tabId, nodeId) {
  const stableId = tabId || nodeId;
  const seeded = localStorage.getItem('ycs-child-item-id::' + stableId);
  if (seeded) return seeded;
  const parts = (stableId || '').split('::');
  if (parts.length >= 3) return parts[parts.length - 2];
  return '';
}

function InlineValueField({ comp, onChange }) {
  switch (comp.type) {
    case 'number':
      return <NumberInput value={comp.defaultValue} onChange={onChange} style={{ flex: 1, minWidth: '40px' }} />;
    case 'logic':
      return (
        <StandardDropdownField
          value={comp.defaultValue === true || comp.defaultValue === 'true' ? 'true' : 'false'}
          onChange={v => onChange(v === 'true')}
          options={[{ label: 'true', value: 'true' }, { label: 'false', value: 'false' }]}
        />
      );
    case 'text':
      return <StringField value={comp.defaultValue} onChange={onChange} style={{ flex: 1, minWidth: '40px' }} />;
    case 'itemstack':
      return <span style={{ fontSize: '10px', opacity: 0.4, flex: 1 }}>—</span>;
    default:
      return null;
  }
}

export function DataEntryList({ items, onAdd, onRemove, onUpdate, title }) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addBtnRef = useRef(null);

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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', backgroundColor: 'transparent',
        color: 'var(--ycs-text)',
      }}>
        <div style={{
          padding: '12px 16px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
        }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>{title || 'Data Components'}</h2>
          <div style={{ position: 'relative' }} ref={addBtnRef}>
            <button className="ycs-button icon" onClick={() => setShowAddMenu(!showAddMenu)} title="Add">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            {showAddMenu && (() => {
              const r = addBtnRef.current?.getBoundingClientRect();
              if (!r) return null;
              return ReactDOM.createPortal(
                <div onMouseDown={e => e.stopPropagation()} className="dropdown" style={{
                  position: 'fixed', top: r.bottom + 4, left: r.right, transform: 'translateX(-100%)',
                  zIndex: 99999, minWidth: '140px',
                }}>
                  {COMPONENT_TYPES.map(t => (
                    <div key={t.value} className="dropdown-item"
                      onMouseDown={e => { e.stopPropagation(); onAdd(t.value); setShowAddMenu(false); }}>
                      {t.label}
                    </div>
                  ))}
                </div>,
                document.body
              );
            })()}
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0, padding: '12px 16px' }}>
          {items.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.5, fontSize: '13px' }}>
              No entries. Click + to add one.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {items.map((entry, i) => (
              <div key={i} style={{
                position: 'relative',
                padding: '10px 12px',
                border: '1px solid var(--ycs-foreground)',
                borderRadius: 'var(--ycs-radius, 4px)',
              }}
                onMouseEnter={e => {
                  const del = e.currentTarget.querySelector('.entry-delete');
                  if (del) del.style.opacity = '1';
                }}
                onMouseLeave={e => {
                  const del = e.currentTarget.querySelector('.entry-delete');
                  if (del) del.style.opacity = '0';
                }}
              >
                <div className="entry-delete"
                  onClick={() => onRemove(i)}
                  title="Remove"
                  style={{
                    position: 'absolute', top: 4, right: 4, width: 16, height: 16,
                    cursor: 'pointer', opacity: 0, transition: 'opacity 0.1s', zIndex: 1,
                  }}>
                  <svg width="16" height="16" viewBox="0 0 18 18">
                    <defs><mask id={`del-entry-${i}`}><circle cx="9" cy="9" r="9" fill="white"/><line x1="5" y1="9" x2="13" y2="9" stroke="black" strokeWidth="2" strokeLinecap="round"/></mask></defs>
                    <circle cx="9" cy="9" r="9" fill="white" mask={`url(#del-entry-${i})`}/>
                  </svg>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingRight: '20px' }}>
                  <span style={{ fontSize: '11px', opacity: 0.5, flexShrink: 0 }}>Name</span>
                  <StringField
                    value={entry.name}
                    onChange={v => onUpdate(i, 'name', v)}
                    placeholder="Display Name"
                    style={{ flex: 1, minWidth: '60px' }}
                  />
                  <span style={{ fontSize: '11px', opacity: 0.5, flexShrink: 0 }}>ID</span>
                  <StringField
                    value={entry.id || ''}
                    onChange={v => onUpdate(i, 'id', v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="registry_id"
                    style={{ flex: 1, minWidth: '60px' }}
                  />
                  <div style={{ flex: 1, minWidth: '40px', display: 'flex', alignItems: 'center' }}>
                    <InlineValueField comp={entry} onChange={v => onUpdate(i, 'defaultValue', v)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DataComponentEditorPage({ isTile = false, onClose, nodeId, tree, tabId }) {
  const stableId = tabId || nodeId;
  const itemId = resolveItemId(tabId, nodeId);

  const [components, setComponentsRaw] = useState(() => {
    const fromStore = itemStore.getSection(itemId, 'dataComponents');
    return Array.isArray(fromStore) ? fromStore : [];
  });
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    const fromStore = itemStore.getSection(itemId, 'dataComponents');
    if (Array.isArray(fromStore)) setComponentsRaw(fromStore);
    return itemStore.subscribe(itemId, (data) => {
      if (data?.dataComponents) setComponentsRaw(data.dataComponents);
    });
  }, [itemId]);

  const setComponents = useCallback((updater) => {
    setComponentsRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (itemId) itemStore.updateSection(itemId, 'dataComponents', next);
      return next;
    });
  }, [itemId]);

  const addComponent = (type) => {
    const typeDef = COMPONENT_TYPES.find(t => t.value === type);
    setComponents(prev => [...prev, {
      name: '',
      id: '',
      type,
      defaultValue: typeDef ? typeDef.defaultValue : '',
    }]);
  };

  const removeComponent = (index) => {
    setComponents(prev => prev.filter((_, i) => i !== index));
  };

  const updateComponent = (index, key, value) => {
    setComponents(prev => prev.map((c, i) => i === index ? { ...c, [key]: value } : c));
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    setStatus(null);
    try {
      const fe = window.electronAPI?.fileEngine;
      if (!fe) throw new Error('File engine not available');

      if (!itemId) throw new Error('Could not determine item ID — save the item first');

      // Load manifest via proper API
      const mr = await fe.manifest.load();
      const manifest = (mr?.ok && mr.data) ? mr.data : { version: 1, modId: MODID, basePath: 'src/main', entries: {} };
      const entries = manifest.entries || {};

      // Collect data component injections used by OTHER items (shared reference protection)
      const otherItemComps = new Set();
      for (const [eid, entry] of Object.entries(entries)) {
        if (eid === itemId) continue;
        if (entry.injections) {
          for (const inj of entry.injections) {
            if (inj.type === 'java-marker' && inj.marker === DATA_COMP_MARKER && inj.content) {
              otherItemComps.add(inj.content);
            }
          }
        }
      }

      const entry = entries[itemId] || { type: 'item', displayName: itemId, injections: [] };
      const oldDcInjections = (entry.injections || []).filter(
        inj => inj.type === 'java-marker' && inj.marker === DATA_COMP_MARKER
      );

      // Remove old injections from Java file (only if not shared)
      for (const old of oldDcInjections) {
        if (old.content && !otherItemComps.has(old.content)) {
          try { await fe.markers.remove(DATA_COMP_FILE, DATA_COMP_MARKER, old.content); } catch {}
        }
      }

      // Remove old DC injections from manifest entry
      entry.injections = (entry.injections || []).filter(
        inj => !(inj.type === 'java-marker' && inj.marker === DATA_COMP_MARKER)
      );

      // Inject new data components
      const newInjections = [];
      for (const comp of components) {
        const line = buildJavaLine(comp);
        if (!line) continue;

        // Only inject into Java if not already present (another item may share it)
        if (!otherItemComps.has(line)) {
          const currentContent = await fe.markers.read(DATA_COMP_FILE, DATA_COMP_MARKER);
          const currentLines = (currentContent?.ok && currentContent.data) ? currentContent.data : '';
          if (!currentLines.includes(line)) {
            await fe.markers.append(DATA_COMP_FILE, DATA_COMP_MARKER, line);
          }
        }

        newInjections.push({
          file: DATA_COMP_FILE,
          marker: DATA_COMP_MARKER,
          type: 'java-marker',
          content: line,
        });
      }

      entry.injections = [...entry.injections, ...newInjections];
      entry.modified = new Date().toISOString();
      if (!entry.created) entry.created = entry.modified;
      entries[itemId] = entry;
      manifest.entries = entries;
      await fe.manifest.save(manifest);

      setStatus({ ok: true, msg: 'Saved & injected' });
    } catch (err) {
      setStatus({ ok: false, msg: err.message });
    } finally {
      setSaving(false);
    }
  }, [components, itemId, stableId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataEntryList
          items={components}
          onAdd={addComponent}
          onRemove={removeComponent}
          onUpdate={updateComponent}
          title="Data Components"
        />
      </div>
      <EditorFooter status={status} onSave={handleSave} saving={saving} />
    </div>
  );
}
