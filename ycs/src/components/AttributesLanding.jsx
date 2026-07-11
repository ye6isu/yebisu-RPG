import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FieldRow, StringField } from './Field/Field';

const JAVA_BASE = 'java/net/ye6isu/yebisuRPG';

export function attributeConstName(name) {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
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

function AttributeRow({ attribute, onClick, onDelete }) {
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
          <path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" />
        </svg>
      </div>
      <div style={{ fontSize: '13px', fontWeight: '500', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '24px' }}>
        {attribute.titleText || attribute.name || attribute.id}
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

function AttributeEditor({ attributeId, onBack }) {
  const [name, setName] = useState('');
  const [titleText, setTitleText] = useState('');
  const [min, setMin] = useState('0');
  const [base, setBase] = useState('0');
  const [max, setMax] = useState('100');
  const [syncToClient, setSyncToClient] = useState(true);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!attributeId) return;
    invoke('load_ycs_data', { category: 'attributes', id: attributeId })
      .then(raw => {
        const data = JSON.parse(raw);
        setName(data.name || attributeId);
        setTitleText(data.titleText || '');
        setMin(String(data.min ?? 0));
        setBase(String(data.base ?? 0));
        setMax(String(data.max ?? 100));
        setSyncToClient(data.syncToClient !== false);
      })
      .catch(() => {});
  }, [attributeId]);

  const handleSave = async () => {
    const trimmed = name.trim().toLowerCase().replace(/\s/g, '_');
    if (!trimmed) { setStatus({ ok: false, msg: 'Name is required.' }); return; }
    const minNum = parseFloat(min) || 0;
    const baseNum = parseFloat(base) || 0;
    const maxNum = parseFloat(max) || 0;
    if (!(minNum <= baseNum && baseNum <= maxNum)) {
      setStatus({ ok: false, msg: 'Must satisfy Min <= Base <= Max.' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const id = attributeId || trimmed;
      const constName = attributeConstName(trimmed);

      // Remove old registration line if renaming/re-saving (idempotent re-inject)
      if (attributeId) {
        const prev = await invoke('load_ycs_data', { category: 'attributes', id: attributeId }).then(r => JSON.parse(r)).catch(() => null);
        if (prev?._injections) {
          for (const inj of prev._injections) {
            await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content }).catch(() => {});
          }
        }
      }

      const line = `    public static final DeferredHolder<Attribute, Attribute> ${constName} = registerAttribute("${trimmed}", ${minNum}D, ${baseNum}D, ${maxNum}D, ${syncToClient});`;
      await invoke('inject_marker', {
        file: `${JAVA_BASE}/attribute/ModAttributes.java`,
        marker: 'YCS_Attributes',
        content: line,
      });

      const payload = {
        name: trimmed, titleText, min: minNum, base: baseNum, max: maxNum, syncToClient,
        _injections: [{ type: 'java-marker', file: `${JAVA_BASE}/attribute/ModAttributes.java`, marker: 'YCS_Attributes', content: line }],
      };
      await invoke('save_ycs_data', { category: 'attributes', id, content: JSON.stringify(payload, null, 2) });

      if (attributeId && attributeId !== id) {
        await invoke('delete_ycs_data', { category: 'attributes', id: attributeId }).catch(() => {});
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
    if (!attributeId) return;
    setSaving(true);
    try {
      const prev = await invoke('load_ycs_data', { category: 'attributes', id: attributeId }).then(r => JSON.parse(r)).catch(() => null);
      if (prev?._injections) {
        for (const inj of prev._injections) {
          await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content }).catch(() => {});
        }
      }
      await invoke('delete_ycs_data', { category: 'attributes', id: attributeId });
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
          {attributeId ? `Edit Attribute: ${attributeId}` : 'New Attribute'}
        </h2>
        {status && <span style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252' }}>{status.msg}</span>}
        {attributeId && <button className="ycs-button" onClick={handleRemove} disabled={saving} style={{ color: '#e05252' }}>Remove</button>}
        <button className="ycs-button" onClick={onBack}>Cancel</button>
        <button className="ycs-button" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <FieldRow label="Name">
          <StringField value={name} onChange={v => setName(v.toLowerCase().replace(/\s/g, '_'))} style={{ width: '100%' }} />
        </FieldRow>
        <FieldRow label="Display Text">
          <StringField value={titleText} onChange={setTitleText} style={{ width: '100%' }} />
        </FieldRow>
        <FieldRow label="Min">
          <StringField value={min} onChange={setMin} style={{ width: '100%' }} />
        </FieldRow>
        <FieldRow label="Base">
          <StringField value={base} onChange={setBase} style={{ width: '100%' }} />
        </FieldRow>
        <FieldRow label="Max">
          <StringField value={max} onChange={setMax} style={{ width: '100%' }} />
        </FieldRow>
        <FieldRow label="Sync to Client">
          <Checkbox checked={syncToClient} onChange={setSyncToClient} />
        </FieldRow>
      </div>
    </div>
  );
}

export default function AttributesLanding() {
  const [attributes, setAttributes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const reload = useCallback(async () => {
    try {
      const ids = await invoke('list_ycs_data', { category: 'attributes' });
      const loaded = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'attributes', id });
          loaded.push({ id, ...JSON.parse(raw) });
        } catch {}
      }
      setAttributes(loaded);
    } catch { setAttributes([]); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const deleteAttribute = async (attribute, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete attribute "${attribute.titleText || attribute.name || attribute.id}"? Any Blocky blocks referencing it will go stale.`)) {
      return;
    }
    try {
      if (attribute._injections) {
        for (const inj of attribute._injections) {
          await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content }).catch(() => {});
        }
      }
      await invoke('delete_ycs_data', { category: 'attributes', id: attribute.id });
      await reload();
    } catch {}
  };

  if (creating) return <AttributeEditor onBack={() => { setCreating(false); reload(); }} />;
  if (editing) return <AttributeEditor attributeId={editing} onBack={() => { setEditing(null); reload(); }} />;

  const filtered = attributes.filter(a => !search || (a.titleText || a.name || a.id).toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Attributes</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            className="ycs-string-input"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '160px' }}
          />
          <button className="ycs-button icon" onClick={() => setCreating(true)} title="New Attribute">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', minHeight: 0 }}>
        {filtered.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {filtered.map(attribute => (
              <AttributeRow
                key={attribute.id}
                attribute={attribute}
                onClick={() => setEditing(attribute.id)}
                onDelete={e => deleteAttribute(attribute, e)}
              />
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.3, fontSize: '13px', padding: '8px 0' }}>No attributes yet. Click + to add one.</div>
        )}
      </div>
    </div>
  );
}
