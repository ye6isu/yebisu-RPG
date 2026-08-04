import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { FieldRow, NumberInput } from './Field/Field';
import { useTitlebarActions } from './Titlebar/TitlebarActionsContext';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

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

/** Bar-style click-to-browse + native Tauri drag-and-drop image picker, matching ItemEditor.jsx's FileDropZone. */
function ImageBarDropZone({ hasFile, fileName, onImport, onClear, accept = IMAGE_EXTENSIONS }) {
  const [dragOver, setDragOver] = useState(false);
  const zoneRef = useRef(null);
  const dragOverRef = useRef(false);
  const onImportRef = useRef(onImport);
  onImportRef.current = onImport;

  useEffect(() => {
    let unlisten;
    import('@tauri-apps/api/webview').then(({ getCurrentWebview }) => {
      getCurrentWebview().onDragDropEvent((event) => {
        const dpr = window.devicePixelRatio || 1;
        if (event.payload.type === 'over') {
          if (!zoneRef.current) return;
          const rect = zoneRef.current.getBoundingClientRect();
          const x = event.payload.position.x / dpr;
          const y = event.payload.position.y / dpr;
          const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
          if (inside !== dragOverRef.current) {
            dragOverRef.current = inside;
            setDragOver(inside);
          }
        } else if (event.payload.type === 'drop') {
          if (dragOverRef.current && event.payload.paths?.length > 0) {
            const path = event.payload.paths[0];
            const ext = path.split('.').pop()?.toLowerCase();
            if (accept.includes(ext)) onImportRef.current(path);
          }
          dragOverRef.current = false;
          setDragOver(false);
        } else if (event.payload.type === 'leave') {
          dragOverRef.current = false;
          setDragOver(false);
        }
      }).then(fn => { unlisten = fn; });
    }).catch(() => {});
    return () => { if (unlisten) unlisten(); };
  }, [accept]);

  const browse = async () => {
    const file = await open({ multiple: false, filters: [{ name: 'Images', extensions: accept }] });
    if (!file) return;
    onImport(typeof file === 'string' ? file : file.path);
  };

  return (
    <div
      ref={zoneRef}
      onClick={browse}
      className="ycs-string-input"
      style={{
        flex: 1,
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: hasFile ? 'flex-start' : 'center',
        gap: '6px',
        cursor: 'pointer',
        fontSize: '12px',
        padding: '0 8px',
        boxSizing: 'border-box',
        borderColor: dragOver ? 'var(--ycs-highlight)' : undefined,
        backgroundColor: dragOver ? 'var(--ycs-accent)' : undefined,
      }}
    >
      {hasFile ? (
        <>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
          {onClear && (
            <svg
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0, cursor: 'pointer' }}
            >
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
    </div>
  );
}

/** Preview-only animation player for spritesheet textures — not wired to any runtime system; actual playback is configured in the Blocky editor. Also serves as the plain static preview when not a spritesheet (rows=1). */
export function SpritesheetPreview({ dataUrl, rows, defaultFrame, ticksPerFrame, size = 96, showControls = false, autoPlay = false, bare = false }) {
  const canvasRef = useRef(null);
  const [playing, setPlaying] = useState(autoPlay);
  const imgRef = useRef(null);
  const frameRef = useRef(defaultFrame);
  const tickRef = useRef(0);

  useEffect(() => {
    if (!dataUrl) return;
    const img = new Image();
    img.onload = () => { imgRef.current = img; };
    img.src = dataUrl;
  }, [dataUrl]);

  useEffect(() => {
    if (!playing) frameRef.current = defaultFrame;
  }, [playing, defaultFrame]);

  useEffect(() => {
    let raf;
    let stopped = false;
    const tpf = Math.max(1, parseInt(ticksPerFrame) || 1);

    const draw = () => {
      if (stopped) return;
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (canvas && img && img.complete && rows > 0) {
        const ctx = canvas.getContext('2d');
        const frameW = img.width;
        const frameH = Math.floor(img.height / rows);
        const frame = playing ? frameRef.current : Math.min(Math.max(defaultFrame, 0), rows - 1);
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          img,
          0, frame * frameH, frameW, frameH,
          0, 0, canvas.width, canvas.height
        );

        if (playing) {
          tickRef.current++;
          // 20 ticks/sec, matching Minecraft's tick rate
          if (tickRef.current >= tpf) {
            tickRef.current = 0;
            frameRef.current = (frameRef.current + 1) % rows;
          }
        }
      }
      raf = requestAnimationFrame(() => setTimeout(draw, 1000 / 20));
    };
    draw();
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }, [rows, playing, ticksPerFrame, defaultFrame]);

  const canvasEl = <canvas ref={canvasRef} width={size} height={size} style={{ width: `${size}px`, height: `${size}px`, imageRendering: 'pixelated' }} />;

  if (bare) return canvasEl;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
      <div style={{
        width: `${size}px`, height: `${size}px`,
        border: '1px solid var(--ycs-foreground)', borderRadius: 'var(--ycs-radius, 4px)',
        overflow: 'hidden', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {canvasEl}
      </div>
      {showControls && (
        <button className="ycs-button" onClick={() => setPlaying(p => !p)} style={{ width: `${size}px`, minWidth: 0, boxSizing: 'border-box', padding: '4px' }}>
          {playing ? 'Pause' : 'Play'}
        </button>
      )}
    </div>
  );
}

const CARD_SIZE = 120;

export default function TextureManager({ isActive = false }) {
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
      const dataUrl = await invoke('read_image_base64', { path: filePath });
      setEditing({ id, label, fileName, isNew: true, dataUrl, newImagePath: filePath });
    } catch (err) {
      console.error('Failed to read image:', err);
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
      if (tex.hasMask) await invoke('delete_texture', { id: `${tex.id}_mask` }).catch(() => {});
      if (tex.hasEmissive) await invoke('delete_texture', { id: `${tex.id}_emissive` }).catch(() => {});
      await reload();
    } catch (err) {
      console.error('Failed to delete texture:', err);
    }
  };

  useTitlebarActions({ active: isActive, search: filter, onSearchChange: setFilter, onAdd: importTexture });

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
  const [newImagePath, setNewImagePath] = useState(texture.newImagePath || null);
  const [status, setStatus] = useState(null);
  const isNew = !!texture.isNew;
  const [isSpritesheet, setIsSpritesheet] = useState(!!(texture.rows > 1));
  const [rows, setRows] = useState(String(texture.rows ?? '1'));
  const [defaultFrame, setDefaultFrame] = useState(String(texture.defaultFrame ?? '0'));
  const [animatedOnUse, setAnimatedOnUse] = useState(!!texture.animatedOnUse);
  const [ticksPerFrame, setTicksPerFrame] = useState(String(texture.ticksPerFrame ?? '4'));

  const [hasMask, setHasMask] = useState(!!texture.hasMask);
  const [maskDataUrl, setMaskDataUrl] = useState(null);
  const [maskImagePath, setMaskImagePath] = useState(null);
  const [hasEmissive, setHasEmissive] = useState(!!texture.hasEmissive);
  const [emissiveDataUrl, setEmissiveDataUrl] = useState(null);
  const [emissiveImagePath, setEmissiveImagePath] = useState(null);

  useEffect(() => {
    if (texture.hasMask) invoke('load_texture_image', { id: `${texture.id}_mask` }).then(setMaskDataUrl).catch(() => {});
    if (texture.hasEmissive) invoke('load_texture_image', { id: `${texture.id}_emissive` }).then(setEmissiveDataUrl).catch(() => {});
  }, [texture.id, texture.hasMask, texture.hasEmissive]);

  const pickImage = async (filePath, setUrl, setPath, setHas) => {
    try {
      const preview = await invoke('read_image_base64', { path: filePath });
      setUrl(preview);
      setPath(filePath);
      setHas(true);
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
      if (!isNew && texture.id !== id) {
        if (!newImagePath) {
          await invoke('rename_texture_image', { oldId: texture.id, newId: id }).catch(() => {});
        }
        if (hasMask && !maskImagePath) {
          await invoke('rename_texture_image', { oldId: `${texture.id}_mask`, newId: `${id}_mask` }).catch(() => {});
        }
        if (hasEmissive && !emissiveImagePath) {
          await invoke('rename_texture_image', { oldId: `${texture.id}_emissive`, newId: `${id}_emissive` }).catch(() => {});
        }
        // Delete old metadata JSON (image already renamed or will be replaced)
        await invoke('delete_texture', { id: texture.id }).catch(() => {});
      }
      const meta = {
        id, label, fileName: texture.fileName,
        rows: isSpritesheet ? (parseInt(rows) || 1) : 1,
        defaultFrame: isSpritesheet ? (parseInt(defaultFrame) || 0) : undefined,
        animatedOnUse: isSpritesheet ? (animatedOnUse || undefined) : undefined,
        ticksPerFrame: isSpritesheet && animatedOnUse ? (parseInt(ticksPerFrame) || 1) : undefined,
        hasMask: hasMask || undefined,
        hasEmissive: hasEmissive || undefined,
      };
      await invoke('save_texture', { id, metadata: JSON.stringify(meta, null, 2) });
      if (newImagePath) {
        await invoke('import_texture_image', { id, sourcePath: newImagePath });
      }
      if (maskImagePath) {
        await invoke('import_texture_image', { id: `${id}_mask`, sourcePath: maskImagePath });
      }
      if (emissiveImagePath) {
        await invoke('import_texture_image', { id: `${id}_emissive`, sourcePath: emissiveImagePath });
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
      if (hasMask) await invoke('delete_texture', { id: `${texture.id}_mask` }).catch(() => {});
      if (hasEmissive) await invoke('delete_texture', { id: `${texture.id}_emissive` }).catch(() => {});
      onBack();
    } catch (err) {
      setStatus({ ok: false, msg: 'Delete failed: ' + err });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500', flex: 1 }}>{isNew ? 'New Texture' : 'Edit Texture'}</h2>
        {status && <span style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252' }}>{status.msg}</span>}
        {!isNew && <button className="ycs-button" onClick={handleRemove} style={{ color: '#e05252' }}>Remove</button>}
        <button className="ycs-button" onClick={onBack}>Cancel</button>
        <button className="ycs-button" onClick={save}>Save</button>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <FieldGroup label="Identity">
          <FieldRow label="Label">
            <input className="ycs-string-input" type="text" value={label} onChange={e => setLabel(e.target.value)} />
          </FieldRow>
          <FieldRow label="ID">
            <input className="ycs-string-input" type="text" value={id} onChange={e => setId(e.target.value)} />
          </FieldRow>
        </FieldGroup>

        <FieldGroup label="Images">
          <FieldRow label="Texture">
            <ImageBarDropZone
              hasFile={!!dataUrl}
              fileName={newImagePath ? newImagePath.split(/[/\\]/).pop() : texture.fileName}
              onImport={(path) => pickImage(path, setDataUrl, setNewImagePath, () => {})}
            />
          </FieldRow>

          <FieldRow label="Mask">
            <ImageBarDropZone
              hasFile={!!maskDataUrl}
              fileName={maskImagePath ? maskImagePath.split(/[/\\]/).pop() : `${texture.id}_mask`}
              onImport={(path) => pickImage(path, setMaskDataUrl, setMaskImagePath, setHasMask)}
              onClear={hasMask ? () => { setHasMask(false); setMaskDataUrl(null); setMaskImagePath(null); } : null}
            />
          </FieldRow>

          <FieldRow label="Emissive">
            <ImageBarDropZone
              hasFile={!!emissiveDataUrl}
              fileName={emissiveImagePath ? emissiveImagePath.split(/[/\\]/).pop() : `${texture.id}_emissive`}
              onImport={(path) => pickImage(path, setEmissiveDataUrl, setEmissiveImagePath, setHasEmissive)}
              onClear={hasEmissive ? () => { setHasEmissive(false); setEmissiveDataUrl(null); setEmissiveImagePath(null); } : null}
            />
          </FieldRow>
        </FieldGroup>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={isSpritesheet} onChange={e => setIsSpritesheet(e.target.checked)} />
              <label style={{ fontSize: '13px' }}>Spritesheet (multiple frames)</label>
            </div>

            {isSpritesheet && (
              <FieldGroup label="Spritesheet">
                <FieldRow label="Rows">
                  <NumberInput value={rows} onChange={setRows} />
                </FieldRow>
                <FieldRow label="Default Frame">
                  <NumberInput value={defaultFrame} onChange={setDefaultFrame} />
                </FieldRow>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input type="checkbox" checked={animatedOnUse} onChange={e => setAnimatedOnUse(e.target.checked)} />
                  <label style={{ fontSize: '13px' }}>Animated</label>
                </div>
                {animatedOnUse && (
                  <FieldRow label="Ticks/Frame">
                    <NumberInput value={ticksPerFrame} onChange={setTicksPerFrame} />
                  </FieldRow>
                )}
              </FieldGroup>
            )}
          </div>

          <SpritesheetPreview
            dataUrl={dataUrl}
            rows={isSpritesheet ? (parseInt(rows) || 1) : 1}
            defaultFrame={parseInt(defaultFrame) || 0}
            ticksPerFrame={ticksPerFrame}
            showControls={isSpritesheet}
          />
        </div>
      </div>
    </div>
  );
}
