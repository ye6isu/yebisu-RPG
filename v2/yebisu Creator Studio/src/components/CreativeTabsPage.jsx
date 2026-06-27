import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StringField, StandardDropdownField, NumberInput, findNodeByTabId as findNodeByTabIdUtil } from './Field/Field';
import ItemSelector from './ItemSelector';

const MODID = 'yebisurpg';
const TABS_FILE = 'resources/assets/yebisurpg/ycs/ycs_custom_tabs.json';
const TABS_ASSIGN_FILE = 'resources/assets/yebisurpg/ycs/ycs_tabs.json';
const LANG_FILE = 'resources/assets/yebisurpg/lang/en_us.json';
const JAVA_BASE = 'java/net/ye6isu/yebisuRPG';

const CARD_SIZE = 120;
const TAB_FORM_PREFIX = 'ycs-tab-form::';

const ICON_MODE_OPTIONS = [
  { label: 'Item', value: 'item' },
  { label: 'Cycle All', value: 'cycle' },
];

function buildTabRegistration(tab) {
  const cn = tab.key.toUpperCase();
  const iconRef = tab.iconRef || '';
  let iconLine;
  if (iconRef.startsWith('cycle:')) {
    iconLine = `            .icon(() -> new ItemStack(ModItems.ITEMS.getEntries().iterator().next().get()))`;
  } else if (iconRef) {
    iconLine = `            .icon(() -> new ItemStack(ModItems.${iconRef.toUpperCase()}.get()))`;
  } else {
    iconLine = `            .icon(() -> new ItemStack(net.minecraft.world.item.Items.BARRIER))`;
  }
  return `    public static final java.util.function.Supplier<CreativeModeTab> ${cn} = CREATIVE_MODE_TAB_DEFERRED_REGISTER.register("${tab.key}", () -> CreativeModeTab.builder()\n${iconLine}\n            .title(Component.translatable("creativetab.${MODID}.${tab.key}"))\n            .build());`;
}

// ══════════════════════════════════════════════════════════════════════════════
// Landing page (card grid) — registered as 'Creative Tabs'
// ══════════════════════════════════════════════════════════════════════════════

export default function CreativeTabsPage({ isTile = false, onClose, nodeId, tree, tabId }) {
  const [tabs, setTabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  const findNodeByTabId = (tid) => findNodeByTabIdUtil(tree, tid);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fe = window.electronAPI?.fileEngine;
      if (!fe) { setLoading(false); return; }
      const r = await fe.json.read(TABS_FILE);
      if (r?.ok && Array.isArray(r.data)) setTabs(r.data);
      else setTabs([]);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener('ycs-tabs-changed', handler);
    return () => window.removeEventListener('ycs-tabs-changed', handler);
  }, [load]);

  const openEditor = (tab, index) => {
    const childTabId = `Tab Editor::${nodeId}::${tab.key || index}`;
    const existing = findNodeByTabId(childTabId);
    if (existing) {
      window.dispatchEvent(new CustomEvent('ycs-close-tab-recursive', { detail: { targetId: existing.id } }));
      return;
    }
    // Seed form data for the child tile
    localStorage.setItem(TAB_FORM_PREFIX + childTabId, JSON.stringify(tab));
    window.dispatchEvent(new CustomEvent('ycs-toggle-child', {
      detail: { parentId: nodeId, targetNodeId: nodeId, childTabId, direction: 'right', isOpen: true }
    }));
  };

  const addTab = () => {
    const newTab = { key: '', displayName: '', iconRef: '', iconMode: 'item', cycleMs: 2000 };
    const childTabId = `Tab Editor::${nodeId}::new-${Date.now()}`;
    localStorage.setItem(TAB_FORM_PREFIX + childTabId, JSON.stringify(newTab));
    window.dispatchEvent(new CustomEvent('ycs-toggle-child', {
      detail: { parentId: nodeId, targetNodeId: nodeId, childTabId, direction: 'right', isOpen: true }
    }));
  };

  const deleteTab = async (index) => {
    const tab = tabs[index];
    if (!tab.key) return;
    const fe = window.electronAPI?.fileEngine;
    if (!fe) return;

    const next = tabs.filter((_, i) => i !== index);
    await fe.json.write(TABS_FILE, next);

    const ar = await fe.json.read(TABS_ASSIGN_FILE);
    const assignments = (ar?.ok && ar.data) ? { ...ar.data } : {};
    Object.keys(assignments).forEach(k => { if (assignments[k] === tab.key) delete assignments[k]; });
    await fe.json.write(TABS_ASSIGN_FILE, assignments);

    const langKey = `creativetab.${MODID}.${tab.key}`;
    try { await fe.json.deleteKey(LANG_FILE, langKey); } catch {}
    try {
      const regLine = buildTabRegistration(tab);
      await fe.markers.remove(`${JAVA_BASE}/item/ModCreativeModeTabs.java`, 'YCS_Mod_Creative_Tabs', regLine);
    } catch {}

    setTabs(next);
    window.dispatchEvent(new CustomEvent('ycs-tabs-changed'));
  };

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
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Creative Tabs</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {status && <span style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252' }}>{status.msg}</span>}
            <button className="ycs-button icon" onClick={load} title="Refresh">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
              </svg>
            </button>
            <button className="ycs-button icon" onClick={addTab} title="Add Tab">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0, padding: '16px' }}>
          {loading && <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.5, fontSize: '13px' }}>Loading...</div>}

          {!loading && tabs.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.5, fontSize: '13px' }}>
              No custom creative tabs. Click + to create one.
            </div>
          )}

          {!loading && tabs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {tabs.map((tab, index) => (
                <div
                  key={tab.key || index}
                  onClick={() => openEditor(tab, index)}
                  style={{
                    width: `${CARD_SIZE}px`, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '10px 8px 8px',
                    borderRadius: 'var(--ycs-radius, 4px)',
                    border: '1px solid var(--ycs-foreground)',
                    backgroundColor: 'transparent',
                    transition: 'border-color 0.1s, background-color 0.1s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--ycs-highlight)';
                    e.currentTarget.style.backgroundColor = 'var(--ycs-accent)';
                    const del = e.currentTarget.querySelector('.card-delete');
                    if (del) del.style.opacity = '1';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--ycs-foreground)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                    const del = e.currentTarget.querySelector('.card-delete');
                    if (del) del.style.opacity = '0';
                  }}
                >
                  <div className="card-delete" onClick={e => { e.stopPropagation(); deleteTab(index); }} title="Delete"
                    style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, cursor: 'pointer', opacity: 0, transition: 'opacity 0.1s' }}>
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <defs><mask id={`del-tab-${tab.key || index}`}><circle cx="9" cy="9" r="9" fill="white"/><line x1="5" y1="9" x2="13" y2="9" stroke="black" strokeWidth="2" strokeLinecap="round"/></mask></defs>
                      <circle cx="9" cy="9" r="9" fill="white" mask={`url(#del-tab-${tab.key || index})`}/>
                    </svg>
                  </div>

                  <div style={{
                    width: '48px', height: '48px', backgroundColor: 'var(--ycs-foreground)',
                    borderRadius: 'var(--ycs-radius, 4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '8px', flexShrink: 0,
                  }}>
                    {(tab.iconMode === 'cycle' || tab.iconRef?.startsWith('cycle:')) ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                      </svg>
                    ) : (
                      <span style={{ fontSize: '10px', fontFamily: 'monospace', opacity: 0.5, textAlign: 'center', padding: '0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                        {tab.iconRef || '?'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '500', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                    {tab.displayName || tab.key || 'untitled'}
                  </div>
                  <div style={{ fontSize: '10px', opacity: 0.5, fontFamily: 'monospace', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tab.key || ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab Editor (child tile) — registered as 'Tab Editor'
// ══════════════════════════════════════════════════════════════════════════════

const IconSlot = React.forwardRef(({ item, selected, onClick, onContextMenu }, ref) => (
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

export function TabEditorPage({ isTile = false, onClose, nodeId, tree, tabId }) {
  const formKey = tabId || nodeId;

  const [form, setFormRaw] = useState(() => {
    try {
      const raw = localStorage.getItem(TAB_FORM_PREFIX + formKey);
      return raw ? JSON.parse(raw) : { key: '', displayName: '', iconRef: '', iconMode: 'item', cycleMs: 2000 };
    } catch { return { key: '', displayName: '', iconRef: '', iconMode: 'item', cycleMs: 2000 }; }
  });

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [picker, setPicker] = useState(null);
  const iconSlotRef = useRef(null);

  const findNodeByTabId = (tid) => findNodeByTabIdUtil(tree, tid);

  const F = useCallback((key, value) => {
    setFormRaw(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(TAB_FORM_PREFIX + formKey, JSON.stringify(next));
      return next;
    });
  }, [formKey]);

  const iconMode = form.iconMode || (form.iconRef?.startsWith('cycle:') ? 'cycle' : 'item');

  const handleSave = useCallback(async () => {
    if (!form.key) { setStatus({ ok: false, msg: 'ID is required' }); return; }
    setSaving(true);
    setStatus(null);
    try {
      const fe = window.electronAPI?.fileEngine;
      if (!fe) throw new Error('File engine not available');

      // Read existing tabs, update or add
      const r = await fe.json.read(TABS_FILE);
      let tabs = (r?.ok && Array.isArray(r.data)) ? r.data : [];
      const existingIdx = tabs.findIndex(t => t.key === form.key);
      if (existingIdx >= 0) {
        tabs[existingIdx] = form;
      } else {
        tabs.push(form);
      }
      await fe.json.write(TABS_FILE, tabs);

      // Lang + Java registration
      const langKey = `creativetab.${MODID}.${form.key}`;
      const displayName = form.displayName || form.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      await fe.json.setKey(LANG_FILE, langKey, displayName, { sortKeys: true });

      const regLine = buildTabRegistration(form);
      try { await fe.markers.remove(`${JAVA_BASE}/item/ModCreativeModeTabs.java`, 'YCS_Mod_Creative_Tabs', regLine); } catch {}
      await fe.markers.append(`${JAVA_BASE}/item/ModCreativeModeTabs.java`, 'YCS_Mod_Creative_Tabs', regLine);

      setStatus({ ok: true, msg: 'Saved & injected' });
      window.dispatchEvent(new CustomEvent('ycs-tabs-changed'));
    } catch (err) {
      setStatus({ ok: false, msg: err.message });
    } finally {
      setSaving(false);
    }
  }, [form, formKey]);

  const itemListTabId = `Tab Items::${formKey}`;
  const isItemListOpen = !!findNodeByTabId(itemListTabId);

  const toggleItemList = () => {
    const existing = findNodeByTabId(itemListTabId);
    if (existing) {
      window.dispatchEvent(new CustomEvent('ycs-close-tab-recursive', { detail: { targetId: existing.id } }));
    } else {
      window.dispatchEvent(new CustomEvent('ycs-toggle-child', {
        detail: { parentId: nodeId, targetNodeId: nodeId, childTabId: itemListTabId, direction: 'bottom', isOpen: true }
      }));
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'transparent', color: 'var(--ycs-text)' }}>
      <div style={{ padding: '12px 16px', flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>{form.displayName || form.key || 'New Tab'}</h2>
      </div>
      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px 20px' }}>
        <div className="ycs-field-row">
          <div className="ycs-field-label">Display Name</div>
          <div className="ycs-field-control" style={{ flex: 1 }}>
            <StringField value={form.displayName || ''} onChange={v => F('displayName', v)} style={{ width: '100%' }} />
          </div>
        </div>

        <div className="ycs-field-row">
          <div className="ycs-field-label">ID</div>
          <div className="ycs-field-control" style={{ flex: 1 }}>
            <StringField value={form.key || ''} onChange={v => F('key', v.toLowerCase().replace(/[^a-z0-9_]/g, ''))} style={{ width: '100%' }} />
          </div>
        </div>

        <div className="ycs-field-row">
          <div className="ycs-field-label">Icon Mode</div>
          <div className="ycs-field-control" style={{ flex: 1 }}>
            <StandardDropdownField
              value={iconMode}
              onChange={v => {
                F('iconMode', v);
                if (v === 'cycle') F('iconRef', `cycle:${form.cycleMs || 2000}`);
                else F('iconRef', '');
              }}
              options={ICON_MODE_OPTIONS}
            />
          </div>
        </div>

        {iconMode === 'item' && (
          <div className="ycs-field-row">
            <div className="ycs-field-label">Icon Item</div>
            <div className="ycs-field-control" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconSlot
                ref={iconSlotRef}
                item={form.iconRef || null}
                selected={!!picker}
                onClick={() => {
                  if (!iconSlotRef.current) return;
                  setPicker({ rect: iconSlotRef.current.getBoundingClientRect() });
                }}
                onContextMenu={e => { e.preventDefault(); F('iconRef', ''); }}
              />
              <span style={{ fontSize: '11px', opacity: 0.5, fontFamily: 'monospace' }}>
                {form.iconRef || 'none'}
              </span>
            </div>
          </div>
        )}

        {iconMode === 'cycle' && (
          <div className="ycs-field-row">
            <div className="ycs-field-label">Cycle Speed (ms)</div>
            <div className="ycs-field-control" style={{ flex: 1 }}>
              <NumberInput
                value={String(form.cycleMs || 2000)}
                onChange={v => {
                  const ms = Math.max(100, parseInt(v) || 2000);
                  F('cycleMs', ms);
                  F('iconRef', `cycle:${ms}`);
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{
        padding: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px',
        borderTop: '1px solid var(--ycs-foreground)', flexShrink: 0,
      }}>
        {status && <span style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252', marginRight: 'auto' }}>{status.msg}</span>}
        <button className={`ycs-button inline${isItemListOpen ? ' active' : ''}`} onClick={toggleItemList}>
          Edit Item List
        </button>
        <button className="ycs-button" onClick={() => { if (onClose) onClose(); }}>Cancel</button>
        <button className="ycs-button" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>

      {picker && (
        <ItemSelector
          anchorRect={picker.rect}
          onSelect={itemId => { F('iconRef', itemId); setPicker(null); }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab Item List (child tile) — registered as 'Tab Items'
// ══════════════════════════════════════════════════════════════════════════════

function DragItemRow({ itemId, index, onMove }) {
  const label = itemId.replace(/^[#]?[^:]+:/, '').replace(/_/g, ' ');
  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData('tab-item-index', String(index))}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        const from = parseInt(e.dataTransfer.getData('tab-item-index'), 10);
        if (!isNaN(from) && from !== index) onMove(from, index);
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '4px 8px',
        borderRadius: 'var(--ycs-radius, 4px)',
        border: '1px solid var(--ycs-foreground)',
        fontSize: '12px', cursor: 'grab',
      }}
    >
      <div style={{ opacity: 0.3, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
          <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
          <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
        </svg>
      </div>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: '10px', opacity: 0.4, fontFamily: 'monospace', flexShrink: 0 }}>{itemId}</span>
    </div>
  );
}

export function TabItemListPage({ isTile = false, onClose, nodeId, tree, tabId }) {
  const parentFormKey = tabId?.replace(/^Tab Items::/, '') || '';
  const [tabKey, setTabKey] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const formRaw = localStorage.getItem(TAB_FORM_PREFIX + parentFormKey);
      const form = formRaw ? JSON.parse(formRaw) : null;
      const key = form?.key || '';
      setTabKey(key);
      if (!key) { setItems([]); setLoading(false); return; }

      const fe = window.electronAPI?.fileEngine;
      if (!fe) { setLoading(false); return; }
      const ar = await fe.json.read(TABS_ASSIGN_FILE);
      const assignments = (ar?.ok && ar.data) ? ar.data : {};
      const ordered = Object.entries(assignments).filter(([, v]) => v === key).map(([k]) => k);
      setItems(ordered);
    } catch {}
    setLoading(false);
  }, [parentFormKey]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener('ycs-tabs-changed', handler);
    return () => window.removeEventListener('ycs-tabs-changed', handler);
  }, [load]);

  const moveItem = async (from, to) => {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);

    const fe = window.electronAPI?.fileEngine;
    if (!fe || !tabKey) return;
    const ar = await fe.json.read(TABS_ASSIGN_FILE);
    const oldAssignments = (ar?.ok && ar.data) ? ar.data : {};
    const rebuilt = {};
    Object.entries(oldAssignments).forEach(([k, v]) => { if (v !== tabKey) rebuilt[k] = v; });
    next.forEach(itemId => { rebuilt[itemId] = tabKey; });
    await fe.json.write(TABS_ASSIGN_FILE, rebuilt);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', backgroundColor: 'transparent',
        color: 'var(--ycs-text)',
      }}>
        <div style={{ padding: '12px 16px', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Item Arrangement</h2>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '12px 16px' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', opacity: 0.4, fontSize: '12px' }}>Loading...</div>
          ) : items.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', opacity: 0.4, fontSize: '12px' }}>
              No items assigned to this tab yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {items.map((itemId, i) => (
                <DragItemRow key={`${itemId}-${i}`} itemId={itemId} index={i} onMove={moveItem} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
