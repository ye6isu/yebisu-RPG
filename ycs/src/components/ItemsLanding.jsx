import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import ItemEditor from './ItemEditor';

export default function ItemsLanding() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    try {
      const ids = await invoke('list_ycs_data', { category: 'items' });
      const loaded = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'items', id });
          const item = JSON.parse(raw);
          const texId = item.texture || item.geoTexture;
          if (texId) {
            item._thumbUrl = await invoke('load_texture_image', { id: texId }).catch(() => null);
          }
          loaded.push(item);
        } catch {}
      }
      setItems(loaded);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const deleteItem = async (item, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${item.displayName || item.id}"?`)) return;
    const injections = Array.isArray(item._injections) ? item._injections : [];
    try {
      for (let i = injections.length - 1; i >= 0; i--) {
        const inj = injections[i];
        try {
          if (inj.type === 'java-marker') {
            await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content });
          } else if (inj.type === 'json-key') {
            await invoke('delete_json_key', { file: inj.file, key: inj.key });
          } else if (inj.type === 'created-file') {
            await invoke('delete_mod_file', { file: inj.file });
          }
        } catch {}
      }
      await invoke('delete_geo_model', { id: item.id }).catch(() => {});
      await invoke('delete_ycs_data', { category: 'items', id: item.id });
      await reload();
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  if (creating) {
    return <ItemEditor onBack={() => { setCreating(false); reload(); }} />;
  }

  if (editing) {
    return <ItemEditor itemId={editing} onBack={() => { setEditing(null); reload(); }} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '12px 16px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
      }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Items</h2>
        <button className="ycs-button icon" onClick={() => setCreating(true)} title="New Item">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', minHeight: 0 }}>
        {items.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {items.map(item => (
              <div
                key={item.id}
                onClick={() => setEditing(item.id)}
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
                  overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  imageRendering: 'pixelated',
                }}>
                  {item._thumbUrl ? (
                    <img src={item._thumbUrl} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', imageRendering: 'pixelated' }} />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.2 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    </svg>
                  )}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '500', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '24px' }}>
                  {item.displayName || item.id}
                </div>
                <div
                  className="row-delete"
                  onClick={(e) => deleteItem(item, e)}
                  title="Delete"
                  style={{
                    width: 18, height: 18,
                    cursor: 'pointer', opacity: 0, transition: 'opacity 0.1s',
                    flexShrink: 0,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <circle cx="9" cy="9" r="9" fill="white" />
                    <line x1="5" y1="9" x2="13" y2="9" stroke="black" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
