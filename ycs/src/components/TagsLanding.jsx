import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { VANILLA_ITEMS } from '../data/vanillaItems';

const MODID = 'yebisurpg';

function TagEditor({ tagId, onBack, onSaved }) {
  const [tagName, setTagName] = useState('');
  const [values, setValues] = useState([]);
  const [filter, setFilter] = useState('');
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modItems, setModItems] = useState([]);

  useEffect(() => {
    const load = async () => {
      // Load mod item list
      const itemIds = await invoke('list_ycs_data', { category: 'items' }).catch(() => []);
      setModItems(itemIds.map(id => ({ id: `${MODID}:${id}`, label: id })));

      if (!tagId) return;

      // Load tag record
      const raw = await invoke('load_ycs_data', { category: 'tags', id: tagId }).catch(() => null);
      const data = raw ? JSON.parse(raw) : {};
      const name = data.tagName || tagId;
      setTagName(name);

      // Scan all items for ones that reference this tag
      const fromItems = new Set();
      for (const id of itemIds) {
        try {
          const itemRaw = await invoke('load_ycs_data', { category: 'items', id });
          const item = JSON.parse(itemRaw);
          if ((item.tags || []).includes(name)) {
            fromItems.add(`${MODID}:${id}`);
          }
        } catch {}
      }

      // Merge stored values + item-assigned values
      const merged = [...new Set([...(data.values || []), ...fromItems])];
      setValues(merged);
    };
    load();
  }, [tagId]);

  const toggle = (val) => setValues(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const addCustom = () => {
    const trimmed = filter.trim();
    if (!trimmed) return;
    const val = trimmed.includes(':') ? trimmed : `${MODID}:${trimmed}`;
    if (!values.includes(val)) setValues(prev => [...prev, val]);
    setFilter('');
  };

  const handleSave = async () => {
    const name = tagName.trim();
    if (!name || !name.includes(':')) { setStatus({ ok: false, msg: 'Tag ID required (e.g. yebisurpg:magic_weapons)' }); return; }
    setSaving(true);
    setStatus(null);
    try {
      const [ns, ...rest] = name.split(':');
      const tagPath = rest.join(':');
      const id = tagId || `${ns}__${tagPath.replace(/\//g, '_')}`;
      const file = `resources/data/${ns}/tags/item/${tagPath}.json`;
      await invoke('write_mod_file', { file, content: JSON.stringify({ replace: false, values }, null, 2) });
      await invoke('save_ycs_data', {
        category: 'tags',
        id,
        content: JSON.stringify({ tagName: name, values, _file: file }, null, 2),
      });
      setStatus({ ok: true, msg: 'Saved.' });
      if (onSaved) onSaved();
    } catch (err) {
      setStatus({ ok: false, msg: String(err) });
    }
    setSaving(false);
  };

  const q = filter.toLowerCase();

  const vanillaFiltered = VANILLA_ITEMS.filter(i => !q || i.id.includes(q) || i.displayName.toLowerCase().includes(q));
  const modFiltered = modItems.filter(i => !q || i.id.includes(q));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button className="ycs-tiny-button" onClick={onBack} title="Back">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 12L6 8l4-4"/></svg>
        </button>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500', flex: 1 }}>
          {tagId ? (tagName || tagId) : 'New Tag'}
        </h2>
        {status && <span style={{ fontSize: '12px', color: status.ok ? 'inherit' : '#f88', opacity: 0.8 }}>{status.msg}</span>}
        <button className="ycs-button" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save & Inject'}</button>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', flexShrink: 0 }} />

      {/* Tag ID field */}
      <div style={{ padding: '10px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '13px', minWidth: '80px', opacity: 0.5, userSelect: 'none' }}>Tag ID</span>
        <input
          className="ycs-string-input"
          type="text"
          value={tagName}
          onChange={e => setTagName(e.target.value)}
          placeholder="yebisurpg:magic_weapons"
          disabled={!!tagId}
          style={{ flex: 1, opacity: tagId ? 0.5 : 1 }}
        />
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', flexShrink: 0 }} />

      {/* Selected chips */}
      <div style={{
        padding: '10px 16px', flexShrink: 0, minHeight: '40px', maxHeight: '110px', overflowY: 'auto',
        display: 'flex', flexWrap: 'wrap', gap: '4px', alignContent: 'flex-start',
      }}>
        {values.length === 0
          ? <span style={{ fontSize: '12px', opacity: 0.3 }}>No items assigned</span>
          : values.map(v => (
            <div key={v} style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '2px 8px', fontSize: '11px',
              border: '1px solid var(--ycs-foreground)',
              borderRadius: 'var(--ycs-radius, 4px)', whiteSpace: 'nowrap',
            }}>
              <span>{v}</span>
              <span onClick={() => toggle(v)} style={{ cursor: 'pointer', opacity: 0.5, fontSize: '14px', lineHeight: 1 }}>×</span>
            </div>
          ))
        }
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', flexShrink: 0 }} />

      {/* Search + add custom */}
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', gap: '8px' }}>
        <input
          className="ycs-string-input"
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
          style={{ flex: 1 }}
          autoFocus
        />
        <button className="ycs-button icon" onClick={addCustom} title="Add custom entry">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Item browser */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {modFiltered.length > 0 && (
          <Section label="Mod Items">
            {modFiltered.map(i => <Row key={i.id} id={i.id} label={i.id} selected={values.includes(i.id)} onToggle={toggle} />)}
          </Section>
        )}
        {vanillaFiltered.length > 0 && (
          <Section label="Vanilla Items">
            {vanillaFiltered.map(i => <Row key={i.id} id={i.id} label={`${i.displayName} — ${i.id}`} selected={values.includes(i.id)} onToggle={toggle} />)}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.5, padding: '8px 16px 4px' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({ id, label, selected, onToggle }) {
  return (
    <div onClick={() => onToggle(id)} style={{
      padding: '6px 16px', fontSize: '13px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: selected ? 'var(--ycs-highlight)' : 'transparent',
      transition: 'background-color 0.1s',
    }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.backgroundColor = 'var(--ycs-accent)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <span>{label}</span>
      {selected && <span style={{ fontSize: '13px', opacity: 0.8 }}>✓</span>}
    </div>
  );
}

export default function TagsLanding() {
  const [tags, setTags] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const reload = useCallback(async () => {
    try {
      // Build a map of tagName -> item count by scanning all items
      const tagItemCount = {};
      try {
        const itemIds = await invoke('list_ycs_data', { category: 'items' });
        for (const itemId of itemIds) {
          try {
            const raw = await invoke('load_ycs_data', { category: 'items', id: itemId });
            const item = JSON.parse(raw);
            for (const t of (item.tags || [])) {
              tagItemCount[t] = (tagItemCount[t] || 0) + 1;
            }
          } catch {}
        }
      } catch {}

      const ids = await invoke('list_ycs_data', { category: 'tags' });
      const loaded = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'tags', id });
          const data = JSON.parse(raw);
          // item count = items referencing this tag + values stored directly in the tag
          const fromItems = tagItemCount[data.tagName] || 0;
          const fromValues = (data.values || []).length;
          const itemCount = Math.max(fromItems, fromValues);
          loaded.push({ id, ...data, _itemCount: itemCount });
        } catch {}
      }
      setTags(loaded);
    } catch { setTags([]); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const deleteTag = async (tag, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete tag "${tag.tagName || tag.id}"?`)) return;
    try {
      if (tag._file) await invoke('delete_mod_file', { file: tag._file }).catch(() => {});
      await invoke('delete_ycs_data', { category: 'tags', id: tag.id });
      await reload();
    } catch {}
  };

  if (creating) return <TagEditor onBack={() => { setCreating(false); reload(); }} onSaved={() => { setCreating(false); reload(); }} />;
  if (editing)  return <TagEditor tagId={editing} onBack={() => { setEditing(null); reload(); }} onSaved={() => reload()} />;

  const filtered = tags.filter(t => !search || (t.tagName || t.id).toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Tags</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            className="ycs-string-input"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '160px' }}
          />
          <button className="ycs-button icon" onClick={() => setCreating(true)} title="New Tag">
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
            {filtered.map(tag => (
              <div
                key={tag.id}
                onClick={() => setEditing(tag.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 8px',
                  borderRadius: 'var(--ycs-radius, 4px)',
                  border: '1px solid var(--ycs-foreground)',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s, border-color 0.1s',
                  boxSizing: 'border-box',
                  minWidth: '160px', flex: '1 1 160px', maxWidth: '320px',
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
                <div style={{ width: '6px', height: '24px', flexShrink: 0, borderRadius: '3px', backgroundColor: 'var(--ycs-highlight)', opacity: 0.6 }} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tag.tagName || tag.id}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.4 }}>
                    {tag._itemCount || 0} item{(tag._itemCount || 0) !== 1 ? 's' : ''}
                  </div>
                </div>
                <div
                  className="row-delete"
                  onClick={e => deleteTag(tag, e)}
                  title="Delete"
                  style={{ width: 18, height: 18, cursor: 'pointer', opacity: 0, transition: 'opacity 0.1s', flexShrink: 0 }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <circle cx="9" cy="9" r="9" fill="white"/>
                    <line x1="5" y1="9" x2="13" y2="9" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.3, fontSize: '13px', padding: '8px 0' }}>No tags yet. Click + to add one.</div>
        )}
      </div>
    </div>
  );
}
