import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FieldRow, StringField, StandardDropdownField } from './Field/Field';

const JAVA_BASE = 'java/net/ye6isu/yebisuRPG';

export const DATA_COMPONENT_TYPES = [
  { label: 'Number', value: 'double' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Text', value: 'string' },
];

const DC_REGISTER_METHOD = { double: 'registerDouble', boolean: 'registerBoolean', string: 'registerString' };
const DC_JAVA_TYPE = { double: 'Double', boolean: 'Boolean', string: 'String' };

export function componentConstName(name) {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

function TypeGroup({ label, children }) {
  return (
    <div>
      <div style={{
        fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
        opacity: 0.4, padding: '4px 0', userSelect: 'none',
      }}>
        {label}
      </div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '4px',
        borderLeft: '1px solid var(--ycs-foreground)',
        paddingLeft: '12px', marginLeft: '4px', marginBottom: '12px',
      }}>
        {children}
      </div>
    </div>
  );
}

function ComponentRow({ comp, onClick, onDelete }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '6px 8px',
        borderRadius: 'var(--ycs-radius, 4px)',
        border: '1px solid var(--ycs-foreground)',
        cursor: 'pointer',
        transition: 'background-color 0.1s, border-color 0.1s',
        boxSizing: 'border-box',
        minWidth: '160px', flex: '1 1 160px', maxWidth: '280px',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = 'var(--ycs-accent)';
        e.currentTarget.style.borderColor = 'var(--ycs-highlight)';
        const del = e.currentTarget.querySelector('.row-delete');
        if (del) del.style.opacity = '1';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.borderColor = 'var(--ycs-foreground)';
        const del = e.currentTarget.querySelector('.row-delete');
        if (del) del.style.opacity = '0';
      }}
    >
      <div style={{
        width: '24px', height: '24px', flexShrink: 0,
        borderRadius: 'var(--ycs-radius, 4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </div>
      <div style={{ fontSize: '13px', fontWeight: '500', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '24px' }}>
        {comp.name || comp.id}
      </div>
      <div
        className="row-delete"
        onClick={onDelete}
        title="Delete"
        style={{ width: 18, height: 18, cursor: 'pointer', opacity: 0, transition: 'opacity 0.1s', flexShrink: 0 }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <circle cx="9" cy="9" r="9" fill="white"/>
          <line x1="5" y1="9" x2="13" y2="9" stroke="black" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}

function Checkbox({ checked, onChange, disabled = false }) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: '16px', height: '16px', cursor: disabled ? 'default' : 'pointer', flexShrink: 0,
        border: `1px solid ${checked ? 'var(--ycs-highlight)' : 'var(--ycs-foreground)'}`,
        borderRadius: '3px',
        backgroundColor: checked ? 'var(--ycs-highlight)' : 'transparent',
        opacity: disabled ? 0.5 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
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

function ComponentEditor({ componentId, onBack, onSaved }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('double');
  const [defaultValue, setDefaultValue] = useState('');
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!componentId) return;
    invoke('load_ycs_data', { category: 'components', id: componentId })
      .then(raw => {
        const data = JSON.parse(raw);
        setName(data.name || componentId);
        setType(data.type || 'double');
        setDefaultValue(data.defaultValue ?? '');
      })
      .catch(() => {});
  }, [componentId]);

  const handleSave = async () => {
    const trimmed = name.trim().toLowerCase().replace(/\s/g, '_');
    if (!trimmed) { setStatus({ ok: false, msg: 'Name is required.' }); return; }
    setSaving(true);
    setStatus(null);
    try {
      const id = componentId || trimmed;
      const constName = componentConstName(trimmed);
      const method = DC_REGISTER_METHOD[type] || 'registerDouble';
      const javaType = DC_JAVA_TYPE[type] || 'Double';

      // Remove old registration line if renaming/re-saving (idempotent re-inject)
      if (componentId) {
        const prev = await invoke('load_ycs_data', { category: 'components', id: componentId }).then(r => JSON.parse(r)).catch(() => null);
        if (prev?._injections) {
          for (const inj of prev._injections) {
            await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content }).catch(() => {});
          }
        }
      }

      const line = `    public static final DeferredHolder<DataComponentType<?>, DataComponentType<${javaType}>> ${constName} = ${method}("${trimmed}");`;
      await invoke('inject_marker', {
        file: `${JAVA_BASE}/component/ModDataComponents.java`,
        marker: 'YCS_Data_Components',
        content: line,
      });

      const payload = {
        name: trimmed, type, defaultValue,
        _injections: [{ type: 'java-marker', file: `${JAVA_BASE}/component/ModDataComponents.java`, marker: 'YCS_Data_Components', content: line }],
      };
      await invoke('save_ycs_data', { category: 'components', id, content: JSON.stringify(payload, null, 2) });

      if (componentId && componentId !== id) {
        await invoke('delete_ycs_data', { category: 'components', id: componentId }).catch(() => {});
      }

      setStatus({ ok: true, msg: 'Saved.' });
      if (onSaved) onSaved();
    } catch (err) {
      setStatus({ ok: false, msg: String(err) });
    }
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500', flex: 1 }}>
          {componentId ? `Edit Component: ${componentId}` : 'New Data Component'}
        </h2>
        {status && <span style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252' }}>{status.msg}</span>}
        <button className="ycs-button" onClick={onBack}>Cancel</button>
        <button className="ycs-button" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <FieldRow label="Name">
          <StringField value={name} onChange={v => setName(v.toLowerCase().replace(/\s/g, '_'))} style={{ width: '100%' }} />
        </FieldRow>
        <FieldRow label="Type">
          <StandardDropdownField value={type} onChange={setType} options={DATA_COMPONENT_TYPES} />
        </FieldRow>
        {type === 'boolean' ? (
          <FieldRow label="Default">
            <Checkbox checked={!!defaultValue} onChange={setDefaultValue} />
          </FieldRow>
        ) : (
          <FieldRow label="Default">
            <StringField value={defaultValue} onChange={setDefaultValue} style={{ width: '100%' }} />
          </FieldRow>
        )}
      </div>
    </div>
  );
}

export default function ComponentsLanding() {
  const [components, setComponents] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const reload = useCallback(async () => {
    try {
      const ids = await invoke('list_ycs_data', { category: 'components' });
      const loaded = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'components', id });
          loaded.push({ id, ...JSON.parse(raw) });
        } catch {}
      }
      setComponents(loaded);
    } catch { setComponents([]); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const deleteComponent = async (comp, e) => {
    e.stopPropagation();
    const usages = await invoke('find_component_usage', { componentId: comp.name || comp.id }).catch(() => []);
    if (usages.length > 0) {
      const confirmed = window.confirm(`This component is used by: ${usages.join(', ')}\n\nDelete anyway? These items will keep a dangling reference until re-saved.`);
      if (!confirmed) return;
    } else if (!window.confirm(`Delete component "${comp.name || comp.id}"?`)) {
      return;
    }
    try {
      if (comp._injections) {
        for (const inj of comp._injections) {
          await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content }).catch(() => {});
        }
      }
      await invoke('delete_ycs_data', { category: 'components', id: comp.id });
      await reload();
    } catch {}
  };

  if (creating) return <ComponentEditor onBack={() => { setCreating(false); reload(); }} onSaved={() => { setCreating(false); reload(); }} />;
  if (editing) return <ComponentEditor componentId={editing} onBack={() => { setEditing(null); reload(); }} onSaved={() => reload()} />;

  const filtered = components.filter(c => !search || (c.name || c.id).toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Data Components</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            className="ycs-string-input"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '160px' }}
          />
          <button className="ycs-button icon" onClick={() => setCreating(true)} title="New Data Component">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', minHeight: 0 }}>
        {filtered.length > 0 ? (
          DATA_COMPONENT_TYPES.map(({ value, label }) => {
            const group = filtered.filter(c => c.type === value);
            if (group.length === 0) return null;
            return (
              <TypeGroup key={value} label={label}>
                {group.map(comp => (
                  <ComponentRow
                    key={comp.id}
                    comp={comp}
                    onClick={() => setEditing(comp.id)}
                    onDelete={e => deleteComponent(comp, e)}
                  />
                ))}
              </TypeGroup>
            );
          })
        ) : (
          <div style={{ opacity: 0.3, fontSize: '13px', padding: '8px 0' }}>No data components yet. Click + to add one.</div>
        )}
      </div>
    </div>
  );
}
