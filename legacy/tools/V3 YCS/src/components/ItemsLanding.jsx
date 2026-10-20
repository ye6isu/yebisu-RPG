import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import ItemEditor from './ItemEditor';
import BlockEditor from './BlockEditor';
import { useTitlebarActions } from './Titlebar/TitlebarActionsContext';

export default function ItemsLanding({ isActive = false }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [blockEditing, setBlockEditing] = useState(null); // { itemId, methodKey }
  const [controlHeld, setControlHeld] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState(null);

  useTitlebarActions({
    active: isActive,
    enabled: !creating && !editing,
    search,
    onSearchChange: setSearch,
    onAdd: () => { setEditing(null); setCreating(true); },
  });

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

  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === 'Control') setControlHeld(true);
    };
    const handleKeyUp = event => {
      if (event.key === 'Control') setControlHeld(false);
    };
    const handleBlur = () => setControlHeld(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

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
      await invoke('delete_geo_model', { kind: 'items', id: item.id }).catch(() => {});
      await invoke('delete_ycs_data', { category: 'items', id: item.id });
      await reload();
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  if (creating || editing) {
    return (
      <div style={{ position: 'relative', height: '100%' }}>
        <div style={{ height: '100%', visibility: blockEditing ? 'hidden' : 'visible', pointerEvents: blockEditing ? 'none' : 'auto' }}>
          <ItemEditor
            isActive={isActive && !blockEditing}
            itemId={editing || undefined}
            onBack={() => { setCreating(false); setEditing(null); reload(); }}
            onOpenBlockEditor={(itemId, methodKey) => setBlockEditing({ itemId, methodKey })}
          />
        </div>
        {blockEditing && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <BlockEditor itemId={blockEditing.itemId} methodKey={blockEditing.methodKey} onBack={() => setBlockEditing(null)} />
          </div>
        )}
      </div>
    );
  }

  const filtered = items.filter(item =>
    !search || (item.displayName || item.id).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', minHeight: 0 }}>
        {filtered.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {filtered.map(item => (
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
                  setHoveredItemId(item.id);
                  e.currentTarget.style.backgroundColor = 'var(--ycs-accent)';
                  e.currentTarget.style.borderColor = 'var(--ycs-highlight)';
                }}
                onMouseLeave={e => {
                  setHoveredItemId(current => current === item.id ? null : current);
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--ycs-foreground)';
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
                    cursor: 'pointer',
                    opacity: controlHeld && hoveredItemId === item.id ? 1 : 0,
                    pointerEvents: controlHeld && hoveredItemId === item.id ? 'auto' : 'none',
                    transition: 'opacity 0.1s',
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
