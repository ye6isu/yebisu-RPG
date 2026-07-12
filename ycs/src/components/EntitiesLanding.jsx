import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { FieldRow, StringField, StandardDropdownField } from './Field/Field';

const JAVA_BASE = 'java/net/ye6isu/yebisuRPG';

function entityConstName(id) {
  return id.toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

function FileDropZone({ hasFile, fileName, onImport, accept }) {
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
            if (!accept || path.endsWith(accept)) onImportRef.current(path);
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

  return (
    <div
      ref={zoneRef}
      onClick={() => onImport()}
      className="ycs-string-input"
      style={{
        flex: 1, height: '24px', display: 'flex', alignItems: 'center',
        justifyContent: hasFile ? 'flex-start' : 'center', gap: '6px',
        cursor: 'pointer', fontSize: '12px', padding: '0 8px', boxSizing: 'border-box',
        borderColor: dragOver ? 'var(--ycs-highlight)' : undefined,
        backgroundColor: dragOver ? 'var(--ycs-accent)' : undefined,
      }}
    >
      {hasFile ? (
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
    </div>
  );
}

function EntityRow({ entity, onClick, onDelete }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px',
        borderRadius: 'var(--ycs-radius, 4px)', border: '1px solid var(--ycs-foreground)',
        cursor: 'pointer', transition: 'background-color 0.1s, border-color 0.1s',
        boxSizing: 'border-box', minWidth: '160px', flex: '1 1 160px', maxWidth: '280px',
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
        width: '24px', height: '24px', flexShrink: 0, borderRadius: 'var(--ycs-radius, 4px)',
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', imageRendering: 'pixelated',
      }}>
        {entity._thumbUrl ? (
          <img src={entity._thumbUrl} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', imageRendering: 'pixelated' }} />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}>
            <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
          </svg>
        )}
      </div>
      <div style={{ fontSize: '13px', fontWeight: '500', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '24px' }}>
        {entity.displayName || entity.id}
      </div>
      <div
        className="row-delete" onClick={onDelete} title="Delete"
        style={{ width: 18, height: 18, cursor: 'pointer', opacity: 0, transition: 'opacity 0.1s', flexShrink: 0 }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <circle cx="9" cy="9" r="9" fill="white" />
          <line x1="5" y1="9" x2="13" y2="9" stroke="black" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

function EntityEditor({ entityId, onBack }) {
  const [id, setId] = useState(entityId || '');
  const [displayName, setDisplayName] = useState('');
  const [textureId, setTextureId] = useState('');
  const [textures, setTextures] = useState([]);
  const [geoModelSet, setGeoModelSet] = useState(false);
  const [animFileSet, setAnimFileSet] = useState(false);
  const [maxHealth, setMaxHealth] = useState('20');
  const [movementSpeed, setMovementSpeed] = useState('0.25');
  const [hitboxWidth, setHitboxWidth] = useState('0.6');
  const [hitboxHeight, setHitboxHeight] = useState('1.8');
  const [idleAnim, setIdleAnim] = useState('idle');
  const [walkAnim, setWalkAnim] = useState('walk');
  const [currentInjections, setCurrentInjections] = useState([]);
  const [lastSavedId, setLastSavedId] = useState(entityId || null);
  const [injected, setInjected] = useState(false);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    invoke('list_textures').then(async (ids) => {
      const loaded = [];
      for (const tid of ids) {
        try {
          const raw = await invoke('load_texture', { id: tid });
          loaded.push(JSON.parse(raw));
        } catch {}
      }
      setTextures(loaded);
    }).catch(() => setTextures([]));
  }, []);

  useEffect(() => {
    if (!entityId) return;
    invoke('load_ycs_data', { category: 'entities', id: entityId })
      .then(raw => {
        const data = JSON.parse(raw);
        setId(data.id || entityId);
        setDisplayName(data.displayName || '');
        setTextureId(data.texture || '');
        setMaxHealth(String(data.maxHealth ?? 20));
        setMovementSpeed(String(data.movementSpeed ?? 0.25));
        setHitboxWidth(String(data.hitboxWidth ?? 0.6));
        setHitboxHeight(String(data.hitboxHeight ?? 1.8));
        setIdleAnim(data.idleAnim || 'idle');
        setWalkAnim(data.walkAnim || 'walk');
        setCurrentInjections(Array.isArray(data._injections) ? data._injections : []);
        setInjected((data._injections || []).length > 0);
        setLastSavedId(entityId);
      })
      .catch(() => {});
    invoke('load_geo_model_path', { id: entityId }).then(() => setGeoModelSet(true)).catch(() => setGeoModelSet(false));
    invoke('load_animation_file_path', { id: entityId }).then(() => setAnimFileSet(true)).catch(() => setAnimFileSet(false));
  }, [entityId]);

  const importGeoModel = async (droppedPath) => {
    if (!id) { setStatus({ ok: false, msg: 'Set an Entity ID first.' }); return; }
    let filePath = droppedPath;
    if (!filePath) {
      const file = await open({ multiple: false, filters: [{ name: 'Bedrock Geo', extensions: ['json'] }] });
      if (!file) return;
      filePath = typeof file === 'string' ? file : file.path;
    }
    try {
      await invoke('import_geo_model', { id, sourcePath: filePath });
      setGeoModelSet(true);
      setStatus({ ok: true, msg: 'Geo model imported.' });
    } catch (err) {
      setStatus({ ok: false, msg: 'Failed to import model: ' + err });
    }
  };

  const importAnimationFile = async (droppedPath) => {
    if (!id) { setStatus({ ok: false, msg: 'Set an Entity ID first.' }); return; }
    let filePath = droppedPath;
    if (!filePath) {
      const file = await open({ multiple: false, filters: [{ name: 'Bedrock Animation', extensions: ['json'] }] });
      if (!file) return;
      filePath = typeof file === 'string' ? file : file.path;
    }
    try {
      await invoke('import_animation_file', { id, sourcePath: filePath });
      setAnimFileSet(true);
      setStatus({ ok: true, msg: 'Animation file imported.' });
    } catch (err) {
      setStatus({ ok: false, msg: 'Failed to import animation file: ' + err });
    }
  };

  const removeExistingInjections = async (injections) => {
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
  };

  const handleSave = async () => {
    const trimmed = id.trim().toLowerCase().replace(/\s/g, '_');
    if (!trimmed) { setStatus({ ok: false, msg: 'Entity ID is required.' }); return; }
    if (!textureId) { setStatus({ ok: false, msg: 'Select a texture.' }); return; }
    if (!geoModelSet) { setStatus({ ok: false, msg: 'Import a geo model.' }); return; }
    if (!animFileSet) { setStatus({ ok: false, msg: 'Import an animation file.' }); return; }

    setSaving(true);
    setStatus(null);
    try {
      // Idempotent re-inject: tear down whatever this entity previously injected first.
      if (currentInjections.length > 0) {
        await removeExistingInjections(currentInjections);
      }
      if (lastSavedId && lastSavedId !== trimmed) {
        await invoke('delete_ycs_data', { category: 'entities', id: lastSavedId }).catch(() => {});
        await invoke('delete_geo_model', { id: lastSavedId }).catch(() => {});
        await invoke('delete_animation_file', { id: lastSavedId }).catch(() => {});
      }

      const injections = [];
      const constName = entityConstName(trimmed);
      const maxHealthNum = parseFloat(maxHealth) || 1;
      const moveSpeedNum = parseFloat(movementSpeed) || 0;
      const hbW = parseFloat(hitboxWidth) || 0.6;
      const hbH = parseFloat(hitboxHeight) || 1.8;

      // Entity type registration
      const entityLine = `    public static final DeferredHolder<EntityType<?>, EntityType<YcsMobEntity>> ${constName} = ENTITY_TYPES.register("${trimmed}", () -> EntityType.Builder.of(YcsMobEntity::new, MobCategory.CREATURE).sized(${hbW}F, ${hbH}F).build("${trimmed}"));`;
      await invoke('inject_marker', { file: `${JAVA_BASE}/entity/ModEntities.java`, marker: 'YCS_Mod_Entities', content: entityLine });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/entity/ModEntities.java`, marker: 'YCS_Mod_Entities', content: entityLine });

      // Attribute registration
      const attrLine = `        event.put(ModEntities.${constName}.get(), YcsMobEntity.createAttributes(${maxHealthNum}D, ${moveSpeedNum}D).build());`;
      await invoke('inject_marker', { file: `${JAVA_BASE}/entity/ModEntityEvents.java`, marker: 'YCS_Entity_Attributes', content: attrLine });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/entity/ModEntityEvents.java`, marker: 'YCS_Entity_Attributes', content: attrLine });

      // Renderer registration
      const animFilePath = `yebisurpg:animations/entity/${trimmed}.animation.json`;
      const rendererLine = `        ModEntityRendererRegistry.tryRegister(specs, ModEntities.${constName}.get(), "${trimmed}", "${animFilePath}", "${idleAnim}", "${walkAnim}");`;
      await invoke('inject_marker', { file: `${JAVA_BASE}/entity/client/ModEntityRendererRegistry.java`, marker: 'YCS_Entity_Renderer_Collect', content: rendererLine });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/entity/client/ModEntityRendererRegistry.java`, marker: 'YCS_Entity_Renderer_Collect', content: rendererLine });

      // Copy geo model / texture / animation file into mod resources
      const geoDest = `resources/assets/yebisurpg/geo/entity/${trimmed}.geo.json`;
      await invoke('copy_geo_model_to_mod', { modelId: trimmed, destFile: geoDest });
      injections.push({ type: 'created-file', file: geoDest });

      const texDest = `resources/assets/yebisurpg/textures/entity/${trimmed}.png`;
      await invoke('copy_texture_to_mod', { textureId, destFile: texDest });
      injections.push({ type: 'created-file', file: texDest });

      const animDest = `resources/assets/yebisurpg/animations/entity/${trimmed}.animation.json`;
      await invoke('copy_animation_file_to_mod', { id: trimmed, destFile: animDest });
      injections.push({ type: 'created-file', file: animDest });

      // Lang key
      const langKey = `entity.yebisurpg.${trimmed}`;
      await invoke('set_json_key', { file: 'resources/assets/yebisurpg/lang/en_us.json', key: langKey, value: displayName || trimmed });
      injections.push({ type: 'json-key', file: 'resources/assets/yebisurpg/lang/en_us.json', key: langKey });

      const payload = {
        id: trimmed, displayName, texture: textureId,
        maxHealth: maxHealthNum, movementSpeed: moveSpeedNum,
        hitboxWidth: hbW, hitboxHeight: hbH,
        idleAnim, walkAnim,
        _injections: injections,
      };
      await invoke('save_ycs_data', { category: 'entities', id: trimmed, content: JSON.stringify(payload, null, 2) });

      setCurrentInjections(injections);
      setLastSavedId(trimmed);
      setInjected(true);
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
    if (!lastSavedId) return;
    setSaving(true);
    try {
      await removeExistingInjections(currentInjections);
      await invoke('delete_geo_model', { id: lastSavedId }).catch(() => {});
      await invoke('delete_animation_file', { id: lastSavedId }).catch(() => {});
      await invoke('delete_ycs_data', { category: 'entities', id: lastSavedId });
      if (onBack) onBack();
    } catch (err) {
      setStatus({ ok: false, msg: 'Remove failed: ' + err });
    }
    setSaving(false);
  };

  const textureOptions = textures.map(t => ({ value: t.id, label: t.label || t.id }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500', flex: 1 }}>
          {entityId ? `Edit Entity: ${entityId}` : 'New Entity'}
        </h2>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <FieldRow label="Id">
          <StringField value={id} onChange={v => setId(v.toLowerCase().replace(/\s/g, '_'))} disabled={!!entityId} style={{ width: '100%' }} />
        </FieldRow>
        <FieldRow label="Display Name">
          <StringField value={displayName} onChange={setDisplayName} style={{ width: '100%' }} />
        </FieldRow>
        <FieldRow label="Texture">
          <StandardDropdownField value={textureId} onChange={setTextureId} options={textureOptions} searchable />
        </FieldRow>
        <FieldRow label="Geo Model">
          <FileDropZone hasFile={geoModelSet} fileName={geoModelSet ? `${id}.geo.json` : ''} onImport={importGeoModel} accept=".json" />
        </FieldRow>
        <FieldRow label="Animation File">
          <FileDropZone hasFile={animFileSet} fileName={animFileSet ? `${id}.animation.json` : ''} onImport={importAnimationFile} accept=".json" />
        </FieldRow>
        <FieldRow label="Idle Animation Name">
          <StringField value={idleAnim} onChange={setIdleAnim} style={{ width: '100%' }} />
        </FieldRow>
        <FieldRow label="Walk Animation Name">
          <StringField value={walkAnim} onChange={setWalkAnim} style={{ width: '100%' }} />
        </FieldRow>
        <FieldRow label="Max Health">
          <StringField value={maxHealth} onChange={setMaxHealth} style={{ width: '100%' }} />
        </FieldRow>
        <FieldRow label="Movement Speed">
          <StringField value={movementSpeed} onChange={setMovementSpeed} style={{ width: '100%' }} />
        </FieldRow>
        <FieldRow label="Hitbox Width">
          <StringField value={hitboxWidth} onChange={setHitboxWidth} style={{ width: '100%' }} />
        </FieldRow>
        <FieldRow label="Hitbox Height">
          <StringField value={hitboxHeight} onChange={setHitboxHeight} style={{ width: '100%' }} />
        </FieldRow>
      </div>

      <div style={{
        padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px',
        borderTop: '1px solid var(--ycs-foreground)', flexShrink: 0,
      }}>
        {status && <span style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252', marginRight: 'auto' }}>{status.msg}</span>}
        {injected && <button className="ycs-button" onClick={handleRemove} disabled={saving} style={{ color: '#e05252' }}>Remove</button>}
        <button className="ycs-button" onClick={onBack}>Cancel</button>
        <button className="ycs-button" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </div>
  );
}

export default function EntitiesLanding() {
  const [entities, setEntities] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const reload = useCallback(async () => {
    try {
      const ids = await invoke('list_ycs_data', { category: 'entities' });
      const loaded = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'entities', id });
          const entity = JSON.parse(raw);
          if (entity.texture) {
            entity._thumbUrl = await invoke('load_texture_image', { id: entity.texture }).catch(() => null);
          }
          loaded.push(entity);
        } catch {}
      }
      setEntities(loaded);
    } catch {
      setEntities([]);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const deleteEntity = async (entity, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${entity.displayName || entity.id}"?`)) return;
    const injections = Array.isArray(entity._injections) ? entity._injections : [];
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
      await invoke('delete_geo_model', { id: entity.id }).catch(() => {});
      await invoke('delete_animation_file', { id: entity.id }).catch(() => {});
      await invoke('delete_ycs_data', { category: 'entities', id: entity.id });
      await reload();
    } catch (err) {
      console.error('Failed to delete entity:', err);
    }
  };

  if (creating) return <EntityEditor onBack={() => { setCreating(false); reload(); }} />;
  if (editing) return <EntityEditor entityId={editing} onBack={() => { setEditing(null); reload(); }} />;

  const filtered = entities.filter(entity =>
    !search || (entity.displayName || entity.id).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '12px 16px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
      }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Entities</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            className="ycs-string-input"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '160px' }}
          />
          <button className="ycs-button icon" onClick={() => setCreating(true)} title="New Entity">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', minHeight: 0 }}>
        {filtered.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {filtered.map(entity => (
              <EntityRow
                key={entity.id}
                entity={entity}
                onClick={() => setEditing(entity.id)}
                onDelete={e => deleteEntity(entity, e)}
              />
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.3, fontSize: '13px', padding: '8px 0' }}>No entities yet. Click + to add one.</div>
        )}
      </div>
    </div>
  );
}
