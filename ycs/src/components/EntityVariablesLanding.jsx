import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTitlebarActions } from './Titlebar/TitlebarActionsContext';
import { FieldRow, StringField, StandardDropdownField } from './Field/Field';

const JAVA_BASE = 'java/net/ye6isu/yebisuRPG';

export const ENTITY_VARIABLE_TYPES = [
  { label: 'Number', value: 'double' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Text', value: 'string' },
];

const EV_REGISTER_METHOD = { double: 'registerDouble', boolean: 'registerBoolean', string: 'registerString' };
const EV_JAVA_TYPE = { double: 'Double', boolean: 'Boolean', string: 'String' };

export function entityVariableConstName(name) {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

function defaultLiteral(type, defaultValue) {
  if (type === 'boolean') return defaultValue ? 'true' : 'false';
  if (type === 'string') return JSON.stringify(String(defaultValue ?? ''));
  const num = Number(defaultValue);
  return Number.isFinite(num) ? String(num) : '0';
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

function VariableRow({ variable, onClick, onDelete }) {
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
          <path d="M4 4h16v4H4z" /><path d="M4 10h10v4H4z" /><path d="M4 16h7v4H4z" />
        </svg>
      </div>
      <div style={{ fontSize: '13px', fontWeight: '500', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '24px' }}>
        {variable.name || variable.id}
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

function VariableEditor({ variableId, onBack, isActive = false }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('double');
  const [defaultValue, setDefaultValue] = useState('');
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!variableId) return;
    invoke('load_ycs_data', { category: 'entityvars', id: variableId })
      .then(raw => {
        const data = JSON.parse(raw);
        setName(data.name || variableId);
        setType(data.type || 'double');
        setDefaultValue(data.defaultValue ?? '');
      })
      .catch(() => {});
  }, [variableId]);

  const handleSave = async () => {
    const trimmed = name.trim().toLowerCase().replace(/\s/g, '_');
    if (!trimmed) { setStatus({ ok: false, msg: 'Name is required.' }); return; }
    setSaving(true);
    setStatus(null);
    try {
      const id = variableId || trimmed;
      const constName = entityVariableConstName(trimmed);
      const method = EV_REGISTER_METHOD[type] || 'registerDouble';
      const javaType = EV_JAVA_TYPE[type] || 'Double';

      // Remove old registration line if renaming/re-saving (idempotent re-inject)
      if (variableId) {
        const prev = await invoke('load_ycs_data', { category: 'entityvars', id: variableId }).then(r => JSON.parse(r)).catch(() => null);
        if (prev?._injections) {
          for (const inj of prev._injections) {
            await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content }).catch(() => {});
          }
        }
      }

      const line = `    public static final DeferredHolder<AttachmentType<?>, AttachmentType<${javaType}>> ${constName} = ${method}("${trimmed}", ${defaultLiteral(type, defaultValue)});`;
      await invoke('inject_marker', {
        file: `${JAVA_BASE}/entityvar/ModAttachments.java`,
        marker: 'YCS_Entity_Attachments',
        content: line,
      });

      const payload = {
        name: trimmed, type, defaultValue,
        _injections: [{ type: 'java-marker', file: `${JAVA_BASE}/entityvar/ModAttachments.java`, marker: 'YCS_Entity_Attachments', content: line }],
      };
      await invoke('save_ycs_data', { category: 'entityvars', id, content: JSON.stringify(payload, null, 2) });

      if (variableId && variableId !== id) {
        await invoke('delete_ycs_data', { category: 'entityvars', id: variableId }).catch(() => {});
      }

      setStatus({ ok: true, msg: 'Saved.' });
      if (onBack) onBack();
    } catch (err) {
      setStatus({ ok: false, msg: String(err) });
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!variableId) return;
    setSaving(true);
    try {
      const prev = await invoke('load_ycs_data', { category: 'entityvars', id: variableId }).then(r => JSON.parse(r)).catch(() => null);
      if (prev?._injections) {
        for (const inj of prev._injections) {
          await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content }).catch(() => {});
        }
      }
      await invoke('delete_ycs_data', { category: 'entityvars', id: variableId });
      if (onBack) onBack();
    } catch (err) {
      setStatus({ ok: false, msg: 'Remove failed: ' + err });
    }
    setSaving(false);
  };

  useTitlebarActions({
    active: isActive,
    buttons: [
      { id: 'save', icon: 'save', title: saving ? 'Saving entity variable' : 'Save entity variable', disabled: saving || !name, onClick: handleSave },
      { id: 'cancel', icon: 'cancel', title: 'Cancel', disabled: saving, onClick: onBack },
      { id: 'delete', icon: 'delete', title: 'Delete entity variable', danger: true, disabled: saving || !variableId, onClick: handleRemove },
    ],
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {status && <div role="status" style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252' }}>{status.msg}</div>}
        <FieldRow label="Name">
        <StringField value={name} onChange={v => setName(v.toLowerCase().replace(/\s/g, '_'))} />
        </FieldRow>
        <FieldRow label="Type">
          <StandardDropdownField value={type} onChange={setType} options={ENTITY_VARIABLE_TYPES} />
        </FieldRow>
        {type === 'boolean' ? (
          <FieldRow label="Default">
            <Checkbox checked={!!defaultValue} onChange={setDefaultValue} />
          </FieldRow>
        ) : (
          <FieldRow label="Default">
          <StringField value={defaultValue} onChange={setDefaultValue} style={{ width: type === 'double' ? '90px' : '180px' }} />
          </FieldRow>
        )}
      </div>
    </div>
  );
}

export default function EntityVariablesLanding({ isActive = false }) {
  const [variables, setVariables] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  useTitlebarActions({ active: isActive, enabled: !creating && !editing, search, onSearchChange: setSearch, onAdd: () => { setEditing(null); setCreating(true); } });

  const reload = useCallback(async () => {
    try {
      const ids = await invoke('list_ycs_data', { category: 'entityvars' });
      const loaded = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'entityvars', id });
          loaded.push({ id, ...JSON.parse(raw) });
        } catch {}
      }
      setVariables(loaded);
    } catch { setVariables([]); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const deleteVariable = async (variable, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete variable "${variable.name || variable.id}"? Any Blocky blocks referencing it will go stale.`)) {
      return;
    }
    try {
      if (variable._injections) {
        for (const inj of variable._injections) {
          await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content }).catch(() => {});
        }
      }
      await invoke('delete_ycs_data', { category: 'entityvars', id: variable.id });
      await reload();
    } catch {}
  };

  if (creating) return <VariableEditor isActive={isActive} onBack={() => { setCreating(false); reload(); }} />;
  if (editing) return <VariableEditor isActive={isActive} variableId={editing} onBack={() => { setEditing(null); reload(); }} />;

  const filtered = variables.filter(v => !v.resourceManaged && (!search || (v.name || v.id).toLowerCase().includes(search.toLowerCase())));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', minHeight: 0 }}>
        {filtered.length > 0 && (
          ENTITY_VARIABLE_TYPES.map(({ value, label }) => {
            const group = filtered.filter(v => v.type === value);
            if (group.length === 0) return null;
            return (
              <TypeGroup key={value} label={label}>
                {group.map(variable => (
                  <VariableRow
                    key={variable.id}
                    variable={variable}
                    onClick={() => setEditing(variable.id)}
                    onDelete={e => deleteVariable(variable, e)}
                  />
                ))}
              </TypeGroup>
            );
          })
        )}
      </div>
    </div>
  );
}
