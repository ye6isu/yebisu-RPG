import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FieldRow, StringField, NumberInput, DropdownField } from './Field/Field';
import { VANILLA_ITEMS } from '../data/vanillaItems';

const MODID = 'yebisurpg';
const JAVA_BASE = 'java/net/ye6isu/yebisuRPG';
const RES_BASE = 'resources/assets/yebisurpg';

const VANILLA_TABS = [
  { label: 'Building Blocks', value: 'minecraft:building_blocks' },
  { label: 'Colored Blocks', value: 'minecraft:colored_blocks' },
  { label: 'Natural Blocks', value: 'minecraft:natural_blocks' },
  { label: 'Functional Blocks', value: 'minecraft:functional_blocks' },
  { label: 'Redstone Blocks', value: 'minecraft:redstone_blocks' },
  { label: 'Hotbar', value: 'minecraft:hotbar' },
  { label: 'Search', value: 'minecraft:search' },
  { label: 'Tools & Utilities', value: 'minecraft:tools_and_utilities' },
  { label: 'Combat', value: 'minecraft:combat' },
  { label: 'Food & Drinks', value: 'minecraft:food_and_drinks' },
  { label: 'Ingredients', value: 'minecraft:ingredients' },
  { label: 'Spawn Eggs', value: 'minecraft:spawn_eggs' },
  { label: 'Operator Utilities', value: 'minecraft:op_blocks' },
  { label: 'Inventory', value: 'minecraft:inventory' },
];

function FieldGroup({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{
        fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
        opacity: 0.4, padding: '4px 0', userSelect: 'none',
      }}>
        {label}
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '4px',
        borderLeft: '1px solid var(--ycs-foreground)',
        paddingLeft: '12px', marginLeft: '4px',
      }}>
        {children}
      </div>
    </div>
  );
}

function Checkbox({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0,
        border: `1px solid ${checked ? 'var(--ycs-highlight)' : 'var(--ycs-foreground)'}`,
        borderRadius: '3px',
        backgroundColor: checked ? 'var(--ycs-highlight)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background-color 0.1s, border-color 0.1s',
      }}
    >
      {checked && (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </div>
  );
}

function ItemArranger({ items, onReorder }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const state = useRef({ from: null, to: null, active: false });
  const containerRef = useRef(null);

  const getRowIdx = (y) => {
    if (!containerRef.current) return null;
    const rows = containerRef.current.querySelectorAll('[data-row-idx]');
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) return parseInt(row.dataset.rowIdx);
    }
    return null;
  };

  const onPointerDown = (e, idx) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    state.current = { from: idx, to: idx, active: true };
    setDragIdx(idx);
    setOverIdx(idx);
  };

  const onPointerMove = (e) => {
    if (!state.current.active) return;
    const idx = getRowIdx(e.clientY);
    if (idx !== null && idx !== state.current.to) {
      state.current.to = idx;
      setOverIdx(idx);
    }
  };

  const onPointerUp = (e) => {
    if (!state.current.active) return;
    const { from, to } = state.current;
    state.current = { from: null, to: null, active: false };
    if (from !== null && to !== null && from !== to) {
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onReorder(next);
    }
    setDragIdx(null);
    setOverIdx(null);
  };

  if (items.length === 0) {
    return (
      <div style={{ opacity: 0.35, fontSize: '12px', padding: '8px 0' }}>
        No items assigned to this tab yet.
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {items.map((item, idx) => (
        <div
          key={item.id}
          data-row-idx={idx}
          onPointerDown={e => onPointerDown(e, idx)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '4px 8px',
            borderRadius: 'var(--ycs-radius, 4px)',
            border: `1px solid ${overIdx === idx && dragIdx !== idx ? 'var(--ycs-highlight)' : 'var(--ycs-foreground)'}`,
            opacity: dragIdx === idx ? 0.4 : 1,
            cursor: dragIdx !== null ? 'grabbing' : 'grab',
            backgroundColor: overIdx === idx && dragIdx !== idx ? 'var(--ycs-accent)' : 'transparent',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" style={{ opacity: 0.3, flexShrink: 0 }}>
            <circle cx="3" cy="2" r="1.5"/><circle cx="7" cy="2" r="1.5"/>
            <circle cx="3" cy="7" r="1.5"/><circle cx="7" cy="7" r="1.5"/>
            <circle cx="3" cy="12" r="1.5"/><circle cx="7" cy="12" r="1.5"/>
          </svg>
          <div style={{ flex: 1, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ fontWeight: 500 }}>{item.displayName || item.id}</span>
            <span style={{ opacity: 0.4, marginLeft: '6px', fontSize: '11px' }}>{MODID}:{item.id}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TabEditor({ tabId: existingId, onBack }) {
  const [tabId, setTabId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [iconItem, setIconItem] = useState('minecraft:stone');
  const [cycleEnabled, setCycleEnabled] = useState(false);
  const [cycleMs, setCycleMs] = useState('2000');
  const [assignedItems, setAssignedItems] = useState([]); // [{id, displayName}] in order
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [injected, setInjected] = useState(false);
  const [currentInjections, setCurrentInjections] = useState([]);
  const [lastSavedId, setLastSavedId] = useState(existingId || null);
  const [itemOptions, setItemOptions] = useState([]);

  const loadItemOptions = useCallback(async () => {
    const modItems = [];
    try {
      const ids = await invoke('list_ycs_data', { category: 'items' });
      for (const id of ids) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'items', id });
          const data = JSON.parse(raw);
          modItems.push({ id: `${MODID}:${data.id}`, displayName: data.displayName || data.id });
        } catch {}
      }
    } catch {}
    const combined = [
      ...modItems.map(i => ({ label: `${i.displayName} — ${i.id}`, value: i.id })),
      ...VANILLA_ITEMS.map(i => ({ label: `${i.displayName} — ${i.id}`, value: i.id })),
    ];
    setItemOptions(combined);
  }, []);

  // Load assigned items for this tab by scanning all item JSONs
  const loadAssignedItems = useCallback(async (tid) => {
    if (!tid) return;
    try {
      const ids = await invoke('list_ycs_data', { category: 'items' });
      const found = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'items', id });
          const data = JSON.parse(raw);
          if (data.creativeTab === tid) {
            found.push({ id: data.id, displayName: data.displayName || data.id, order: data.tabOrder ?? 9999 });
          }
        } catch {}
      }
      found.sort((a, b) => a.order - b.order);
      setAssignedItems(found.map(({ id, displayName }) => ({ id, displayName })));
    } catch {}
  }, []);

  useEffect(() => {
    loadItemOptions();
    if (existingId) {
      invoke('load_ycs_data', { category: 'tabs', id: existingId })
        .then(raw => {
          const data = JSON.parse(raw);
          setTabId(data.id || '');
          setDisplayName(data.displayName || '');
          setIconItem(data.iconItem || 'minecraft:stone');
          setCycleEnabled(data.cycleEnabled || false);
          setCycleMs(String(data.cycleMs ?? 2000));
          const inj = Array.isArray(data._injections) ? data._injections : [];
          setCurrentInjections(inj);
          setInjected(inj.length > 0);
        })
        .catch(() => {});
      loadAssignedItems(existingId);
    }
  }, [existingId, loadItemOptions, loadAssignedItems]);

  const handleIdChange = (val) => setTabId(val.toLowerCase().replace(/\s/g, '_'));

  const removeExistingInjections = async () => {
    for (let i = currentInjections.length - 1; i >= 0; i--) {
      const inj = currentInjections[i];
      try {
        if (inj.type === 'java-marker') {
          await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content });
        } else if (inj.type === 'json-key') {
          await invoke('delete_json_key', { file: inj.file, key: inj.key });
        }
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }
    setCurrentInjections([]);
  };

  const handleSave = async () => {
    if (!tabId) { setStatus({ ok: false, msg: 'Tab ID is required.' }); return; }
    setSaving(true);
    try {
      await removeExistingInjections();

      if (lastSavedId && lastSavedId !== tabId) {
        await invoke('delete_ycs_data', { category: 'tabs', id: lastSavedId }).catch(() => {});
      }

      const injections = [];
      const iconParts = iconItem.includes(':') ? iconItem : `minecraft:${iconItem}`;
      const [iconNs, iconPath] = iconParts.split(':');

      const tabLine = `    public static final net.neoforged.neoforge.registries.DeferredHolder<net.minecraft.world.item.CreativeModeTab, net.minecraft.world.item.CreativeModeTab> ${tabId.toUpperCase()} = CREATIVE_MODE_TABS.register("${tabId}",\n            () -> net.minecraft.world.item.CreativeModeTab.builder()\n                    .title(net.minecraft.network.chat.Component.translatable("itemGroup.${MODID}.${tabId}"))\n                    .icon(() -> new net.minecraft.world.item.ItemStack(net.minecraft.core.registries.BuiltInRegistries.ITEM.get(net.minecraft.resources.ResourceLocation.fromNamespaceAndPath("${iconNs}", "${iconPath}"))))\n                    .build());`;

      await invoke('inject_marker', {
        file: `${JAVA_BASE}/item/ModCreativeModeTabs.java`,
        marker: 'YCS_Mod_Creative_Tabs',
        content: tabLine,
      });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/item/ModCreativeModeTabs.java`, marker: 'YCS_Mod_Creative_Tabs', content: tabLine });

      // Icon cycler registration
      if (cycleEnabled) {
        const ms = Math.max(500, parseInt(cycleMs) || 2000);
        const cyclerLine = `        ENTRIES.add(new CycleEntry(ModCreativeModeTabs.${tabId.toUpperCase()}, ${ms}L, new java.util.ArrayList<>()));`;
        await invoke('inject_marker', {
          file: `${JAVA_BASE}/item/TabIconCycler.java`,
          marker: 'YCS_Cycler_Register',
          content: cyclerLine,
        });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/item/TabIconCycler.java`, marker: 'YCS_Cycler_Register', content: cyclerLine });
      }

      const langKey = `itemGroup.${MODID}.${tabId}`;
      await invoke('set_json_key', { file: `${RES_BASE}/lang/en_us.json`, key: langKey, value: displayName || tabId });
      injections.push({ type: 'json-key', file: `${RES_BASE}/lang/en_us.json`, key: langKey });

      // Save tab order into each assigned item's JSON so injection order is preserved
      for (let i = 0; i < assignedItems.length; i++) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'items', id: assignedItems[i].id });
          const data = JSON.parse(raw);
          data.tabOrder = i;
          await invoke('save_ycs_data', { category: 'items', id: assignedItems[i].id, content: JSON.stringify(data, null, 2) });
        } catch {}
      }

      const payload = { id: tabId, displayName, iconItem, cycleEnabled, cycleMs: parseInt(cycleMs) || 2000, type: 'tab', _injections: injections };
      await invoke('save_ycs_data', { category: 'tabs', id: tabId, content: JSON.stringify(payload, null, 2) });

      setCurrentInjections(injections);
      setInjected(true);
      setLastSavedId(tabId);
      if (onBack) onBack();
    } catch (err) {
      setStatus({ ok: false, msg: 'Injection failed: ' + err });
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!existingId && !tabId) return;
    const targetId = existingId || tabId;
    setSaving(true);
    try {
      await removeExistingInjections();
      await invoke('delete_ycs_data', { category: 'tabs', id: targetId });
      setInjected(false);
      if (onBack) onBack();
    } catch (err) {
      setStatus({ ok: false, msg: 'Remove failed: ' + err });
    }
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500', flex: 1 }}>
          {existingId ? `Edit Tab: ${existingId}` : 'New Tab'}
        </h2>
        {status && <span style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252' }}>{status.msg}</span>}
        {injected && <button className="ycs-button" onClick={handleRemove} style={{ color: '#e05252' }}>Remove</button>}
        <button className="ycs-button" onClick={onBack}>Cancel</button>
        <button className="ycs-button" onClick={handleSave} disabled={saving || !tabId}>{saving ? 'Saving...' : 'Save'}</button>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <FieldGroup label="Identity">
          <FieldRow label="Tab ID">
              <StringField value={tabId} onChange={handleIdChange} />
          </FieldRow>
          <FieldRow label="Display Name">
              <StringField value={displayName} onChange={setDisplayName} />
          </FieldRow>
        </FieldGroup>

        <FieldGroup label="Appearance">
          <FieldRow label="Cycle Icons">
            <Checkbox checked={cycleEnabled} onChange={setCycleEnabled} />
          </FieldRow>
          {cycleEnabled && (
            <FieldRow label="Cycle Speed (ms)">
              <NumberInput value={cycleMs} onChange={setCycleMs} />
            </FieldRow>
          )}
          {!cycleEnabled && (
            <FieldRow label="Icon Item">
              <DropdownField value={iconItem} onChange={setIconItem} options={itemOptions} />
            </FieldRow>
          )}
        </FieldGroup>

        {existingId && (
          <FieldGroup label={`Item Order (${assignedItems.length})`}>
            <ItemArranger
              tabId={existingId}
              items={assignedItems}
              onReorder={setAssignedItems}
            />
          </FieldGroup>
        )}
      </div>
    </div>
  );
}
