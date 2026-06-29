import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

const CARD_SIZE = 120;

export default function TextureManager() {
  const [textures, setTextures] = useState([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(null);

  const reload = useCallback(async () => {
    try {
      const ids = await invoke('list_textures');
      const loaded = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_texture', { id });
          const meta = JSON.parse(raw);
          const dataUrl = await invoke('load_texture_image', { id }).catch(() => null);
          loaded.push({ ...meta, dataUrl });
        } catch {}
      }
      setTextures(loaded);
    } catch {
      setTextures([]);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const importTexture = async () => {
    const file = await open({
      multiple: false,
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    });
    if (!file) return;

    const filePath = typeof file === 'string' ? file : file.path;
    const fileName = filePath.split(/[/\\]/).pop();
    const label = fileName.replace(/\.[^.]+$/, '');
    let id = label.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const existingIds = new Set(textures.map(t => t.id));
    if (existingIds.has(id)) {
      let suffix = 2;
      while (existingIds.has(`${id}_${suffix}`)) suffix++;
      id = `${id}_${suffix}`;
    }

    try {
      const meta = { id, label, fileName };
      await invoke('save_texture', { id, metadata: JSON.stringify(meta, null, 2) });
      await invoke('import_texture_image', { id, sourcePath: filePath });
      await reload();
    } catch (err) {
      console.error('Failed to import texture:', err);
    }
  };

  const deleteTexture = async (tex, e) => {
    e.stopPropagation();
    try {
      const usages = await invoke('find_texture_usage', { textureId: tex.id });
      if (usages.length > 0) {
        const names = usages.join(', ');
        const confirmed = window.confirm(
          `This texture is used by: ${names}\n\nDelete anyway?`
        );
        if (!confirmed) return;
      }
      await invoke('delete_texture', { id: tex.id });
      await reload();
    } catch (err) {
      console.error('Failed to delete texture:', err);
    }
  };

  const filtered = textures.filter(tex => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return tex.label.toLowerCase().includes(q) || (tex.id || '').toLowerCase().includes(q);
  });

  if (editing) {
    return <TextureEditor texture={editing} onBack={() => { setEditing(null); reload(); }} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '12px 16px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
      }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Textures</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            className="ycs-string-input"
            type="text"
            placeholder="Filter..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ width: '160px' }}
          />
          <button className="ycs-button icon" onClick={importTexture} title="Import Texture">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', minHeight: 0 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.5, fontSize: '13px' }}>
            {filter ? 'No textures match your filter.' : ''}
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {filtered.map(tex => (
              <div
                key={tex.id}
                onClick={() => setEditing(tex)}
                style={{
                  width: `${CARD_SIZE}px`,
                  cursor: 'pointer',
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
                <div
                  className="card-delete"
                  onClick={(e) => deleteTexture(tex, e)}
                  title="Delete"
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 18, height: 18,
                    cursor: 'pointer', opacity: 0, transition: 'opacity 0.1s',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <circle cx="9" cy="9" r="9" fill="white" />
                    <line x1="5" y1="9" x2="13" y2="9" stroke="black" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>

                <div style={{
                  width: '64px', height: '64px',
                  borderRadius: 'var(--ycs-radius, 4px)',
                  imageRendering: 'pixelated',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '8px', flexShrink: 0,
                  overflow: 'hidden',
                }}>
                  {tex.dataUrl ? (
                    <img src={tex.dataUrl} alt={tex.label} style={{ width: '64px', height: '64px', objectFit: 'contain', imageRendering: 'pixelated' }} />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.25 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    </svg>
                  )}
                </div>

                <div style={{
                  fontSize: '12px', fontWeight: '500',
                  textAlign: 'center', width: '100%',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  marginBottom: '2px',
                }}>
                  {tex.label}
                </div>

                <div style={{
                  fontSize: '10px', opacity: 0.5, fontFamily: 'monospace',
                  textAlign: 'center', width: '100%',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {tex.id}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TextureEditor({ texture, onBack }) {
  const [label, setLabel] = useState(texture.label || '');
  const [id, setId] = useState(texture.id || '');
  const [dataUrl, setDataUrl] = useState(texture.dataUrl || '');
  const [newImagePath, setNewImagePath] = useState(null);
  const [status, setStatus] = useState(null);

  const replaceImage = async () => {
    const file = await open({
      multiple: false,
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    });
    if (!file) return;
    const filePath = typeof file === 'string' ? file : file.path;
    try {
      const preview = await invoke('read_image_base64', { path: filePath });
      setDataUrl(preview);
      setNewImagePath(filePath);
    } catch (err) {
      setStatus({ ok: false, msg: 'Failed to read image: ' + err });
    }
  };

  const save = async () => {
    if (!id) {
      setStatus({ ok: false, msg: 'ID is required' });
      return;
    }
    try {
      if (texture.id !== id) {
        if (!newImagePath) {
          await invoke('rename_texture_image', { oldId: texture.id, newId: id }).catch(() => {});
        }
        // Delete old metadata JSON (image already renamed or will be replaced)
        await invoke('delete_texture', { id: texture.id }).catch(() => {});
      }
      const meta = { id, label, fileName: texture.fileName };
      await invoke('save_texture', { id, metadata: JSON.stringify(meta, null, 2) });
      if (newImagePath) {
        await invoke('import_texture_image', { id, sourcePath: newImagePath });
      }
      onBack();
    } catch (err) {
      setStatus({ ok: false, msg: 'Failed: ' + err });
    }
  };

  const handleRemove = async () => {
    try {
      const usages = await invoke('find_texture_usage', { textureId: texture.id });
      if (usages.length > 0) {
        const confirmed = window.confirm(`This texture is used by: ${usages.join(', ')}\n\nDelete anyway?`);
        if (!confirmed) return;
      }
      await invoke('delete_texture', { id: texture.id });
      onBack();
    } catch (err) {
      setStatus({ ok: false, msg: 'Delete failed: ' + err });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500', flex: 1 }}>Edit Texture</h2>
        {status && <span style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252' }}>{status.msg}</span>}
        <button className="ycs-button" onClick={handleRemove} style={{ color: '#e05252' }}>Remove</button>
        <button className="ycs-button" onClick={onBack}>Cancel</button>
        <button className="ycs-button" onClick={save}>Save</button>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div
            onClick={replaceImage}
            style={{
              width: '96px', height: '96px', flexShrink: 0,
              border: '1px solid var(--ycs-foreground)',
              borderRadius: 'var(--ycs-radius, 4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', imageRendering: 'pixelated', overflow: 'hidden',
            }}
            title="Click to replace image"
          >
            {dataUrl ? (
              <img src={dataUrl} alt={label} style={{ width: '96px', height: '96px', objectFit: 'contain', imageRendering: 'pixelated' }} />
            ) : (
              <span style={{ opacity: 0.3, fontSize: '12px' }}>No image</span>
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="ycs-field-row">
              <label className="ycs-field-label">Label</label>
              <div className="ycs-field-control">
                <input className="ycs-string-input" type="text" value={label} onChange={e => setLabel(e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>
            <div className="ycs-field-row">
              <label className="ycs-field-label">ID</label>
              <div className="ycs-field-control">
                <input className="ycs-string-input" type="text" value={id} onChange={e => setId(e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
