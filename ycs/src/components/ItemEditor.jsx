import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { FieldRow, StringField, StandardDropdownField } from './Field/Field';

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

const MODID = 'yebisurpg';
const JAVA_BASE = 'java/net/ye6isu/yebisuRPG';
const RES_BASE = 'resources/assets/yebisurpg';

function FileDropZone({ hasFile, fileName, onImport, onClear }) {
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
            if (path.endsWith('.json')) {
              onImportRef.current(path);
            }
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
  }, []);

  return (
    <div
      ref={zoneRef}
      onClick={() => onImport()}
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

export default function ItemEditor({ itemId: existingId, onBack }) {
  const [itemId, setItemId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [texture, setTexture] = useState('');
  const [holdingMode, setHoldingMode] = useState('generated');
  const [stackSize, setStackSize] = useState('64');
  const [geoModel, setGeoModel] = useState('');
  const [geoTexture, setGeoTexture] = useState('');
  const [displayModel, setDisplayModel] = useState('');
  const [textures, setTextures] = useState([]);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [injected, setInjected] = useState(false);
  const [currentInjections, setCurrentInjections] = useState([]);
  const [lastSavedId, setLastSavedId] = useState(existingId || null);
  const [customClass, setCustomClass] = useState(false);

  const is3D = holdingMode === '3d';

  const toPascalCase = (s) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');

  const handleIdChange = (val) => {
    setItemId(val.toLowerCase().replace(/\s/g, '_'));
  };

  const loadTextures = useCallback(async () => {
    try {
      const ids = await invoke('list_textures');
      const loaded = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_texture', { id });
          loaded.push(JSON.parse(raw));
        } catch {}
      }
      setTextures(loaded);
    } catch {}
  }, []);

  useEffect(() => {
    loadTextures();
    if (existingId) {
      invoke('load_ycs_data', { category: 'items', id: existingId })
        .then(raw => {
          const data = JSON.parse(raw);
          setItemId(data.id || '');
          setDisplayName(data.displayName || '');
          setTexture(data.texture || '');
          setHoldingMode(data.holdingMode || 'generated');
          setStackSize(String(data.stackSize ?? '64'));
          setGeoModel(data.geoModel || '');
          setGeoTexture(data.geoTexture || '');
          setDisplayModel(data.displayModel || '');
          setCustomClass(data.customClass || false);
          const inj = Array.isArray(data._injections) ? data._injections : [];
          setCurrentInjections(inj);
          setInjected(inj.length > 0);
        })
        .catch(() => {});
    }
  }, [existingId, loadTextures]);

  const buildPayload = () => ({
    id: itemId,
    displayName,
    texture,
    holdingMode,
    stackSize: parseInt(stackSize) || 64,
    geoModel: is3D && geoModel ? itemId : '',
    geoTexture: is3D ? geoTexture : '',
    displayModel: is3D && displayModel ? itemId : '',
    customClass,
    type: 'item',
  });

  const removeExistingInjections = async () => {
    for (let i = currentInjections.length - 1; i >= 0; i--) {
      const inj = currentInjections[i];
      try {
        if (inj.type === 'java-marker') {
          await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content });
        } else if (inj.type === 'json-key') {
          await invoke('delete_json_key', { file: inj.file, key: inj.key });
        } else if (inj.type === 'created-file') {
          await invoke('delete_mod_file', { file: inj.file });
        }
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }
    setCurrentInjections([]);
  };

  const importGeoModel = async (droppedPath) => {
    if (!itemId) { setStatus({ ok: false, msg: 'Set an Item ID first.' }); return; }
    let filePath = droppedPath;
    if (!filePath) {
      const file = await open({
        multiple: false,
        filters: [{ name: 'Bedrock Geo', extensions: ['json'] }],
      });
      if (!file) return;
      filePath = typeof file === 'string' ? file : file.path;
    }
    try {
      await invoke('import_geo_model', { id: itemId, sourcePath: filePath });
      setGeoModel(itemId);
      setStatus({ ok: true, msg: 'Geo model imported.' });
    } catch (err) {
      setStatus({ ok: false, msg: 'Failed to import model: ' + err });
    }
  };

  const importDisplayModel = async (droppedPath) => {
    if (!itemId) { setStatus({ ok: false, msg: 'Set an Item ID first.' }); return; }
    let filePath = droppedPath;
    if (!filePath) {
      const file = await open({
        multiple: false,
        filters: [{ name: 'Display Model JSON', extensions: ['json'] }],
      });
      if (!file) return;
      filePath = typeof file === 'string' ? file : file.path;
    }
    try {
      await invoke('import_display_model', { id: itemId, sourcePath: filePath });
      setDisplayModel(itemId);
      setStatus({ ok: true, msg: 'Display model imported.' });
    } catch (err) {
      setStatus({ ok: false, msg: 'Failed to import display model: ' + err });
    }
  };

  const handleSaveAndInject = async () => {
    if (!itemId) { setStatus({ ok: false, msg: 'Item ID is required.' }); return; }
    setSaving(true);
    try {
      await removeExistingInjections();
      if (lastSavedId && lastSavedId !== itemId) {
        await invoke('delete_ycs_data', { category: 'items', id: lastSavedId }).catch(() => {});
        await invoke('delete_geo_model', { id: lastSavedId }).catch(() => {});
      }

      const payload = buildPayload();
      const injections = [];
      const CN = itemId.toUpperCase();
      const className = toPascalCase(itemId) + 'Item';
      const propsChain = parseInt(stackSize) !== 64 ? `.stacksTo(${parseInt(stackSize)})` : '';
      const constructor = customClass
        ? `new ${className}(new Item.Properties()${propsChain})`
        : `new Item(new Item.Properties()${propsChain})`;

      const regLine = `    public static final DeferredItem<Item> ${CN} = ITEMS.register("${itemId}",\n            () -> ${constructor});`;
      await invoke('inject_marker', {
        file: `${JAVA_BASE}/item/ModItems.java`,
        marker: 'YCS_Mod_Items',
        content: regLine,
      });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/item/ModItems.java`, marker: 'YCS_Mod_Items', content: regLine });

      if (customClass) {
        const classFile = `${JAVA_BASE}/item/custom/${className}.java`;
        const exists = await invoke('mod_file_exists', { file: classFile });
        if (!exists) {
          const classContent = `package net.ye6isu.yebisuRPG.item.custom;

import net.minecraft.world.item.Item;

public class ${className} extends Item {
    public ${className}(Properties properties) {
        super(properties);
    }
}
`;
          await invoke('write_mod_file', { file: classFile, content: classContent });
        }
        injections.push({ type: 'created-file', file: classFile });

        const importLine = `import net.ye6isu.yebisuRPG.item.custom.${className};`;
        await invoke('inject_marker', {
          file: `${JAVA_BASE}/item/ModItems.java`,
          marker: 'YCS_Mod_Item_Imports',
          content: importLine,
        });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/item/ModItems.java`, marker: 'YCS_Mod_Item_Imports', content: importLine });
      }

      const langKey = `item.${MODID}.${itemId}`;
      await invoke('set_json_key', {
        file: `${RES_BASE}/lang/en_us.json`,
        key: langKey,
        value: displayName || itemId,
      });
      injections.push({ type: 'json-key', file: `${RES_BASE}/lang/en_us.json`, key: langKey });

      if (is3D) {
        // If ID changed since last import, rename stored model files to match new ID
        const modelSourceId = geoModel || displayModel;
        if (modelSourceId && modelSourceId !== itemId) {
          await invoke('rename_geo_model', { oldId: modelSourceId, newId: itemId }).catch(() => {});
        }

        // Copy geo model to mod
        const hasGeo = await invoke('load_geo_model_path', { id: itemId }).then(() => true).catch(() => false);
        if (hasGeo) {
          const geoDestPath = `${RES_BASE}/geo/item/${itemId}.geo.json`;
          await invoke('copy_geo_model_to_mod', { modelId: itemId, destFile: geoDestPath });
          injections.push({ type: 'created-file', file: geoDestPath });
        }

        if (geoTexture) {
          const geoTexPath = `${RES_BASE}/textures/geo/item/${itemId}.png`;
          await invoke('copy_texture_to_mod', { textureId: geoTexture, destFile: geoTexPath });
          injections.push({ type: 'created-file', file: geoTexPath });
        }

        const collectLine = `        tryRegister(items, ModItems.${CN}, "${itemId}");`;
        await invoke('inject_marker', {
          file: `${JAVA_BASE}/client/renderer/GeoItemRegistry.java`,
          marker: 'YCS_Geo_Collect',
          content: collectLine,
        });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/client/renderer/GeoItemRegistry.java`, marker: 'YCS_Geo_Collect', content: collectLine });

        // Copy display model to mod (or write fallback)
        const displayModelPath = `${RES_BASE}/models/item/${itemId}.json`;
        const hasDisplay = await invoke('load_display_model', { id: itemId }).then(() => true).catch(() => false);
        if (hasDisplay) {
          await invoke('copy_display_model_to_mod', { modelId: itemId, destFile: displayModelPath });
        } else {
          const fallbackModel = JSON.stringify({ parent: "minecraft:builtin/entity" }, null, 2);
          await invoke('write_mod_file', { file: displayModelPath, content: fallbackModel });
        }
        injections.push({ type: 'created-file', file: displayModelPath });

      } else {
        const isHandheld = holdingMode === 'handheld';
        const modelLine = isHandheld
          ? `        handheldItem(ModItems.${CN});`
          : `        basicItem(ModItems.${CN}.get());`;
        await invoke('inject_marker', {
          file: `${JAVA_BASE}/datagen/ModItemModelProvider.java`,
          marker: 'YCS_Mod_Item_Model',
          content: modelLine,
        });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/datagen/ModItemModelProvider.java`, marker: 'YCS_Mod_Item_Model', content: modelLine });

        if (texture) {
          const texPath = `${RES_BASE}/textures/item/${itemId}.png`;
          await invoke('copy_texture_to_mod', { textureId: texture, destFile: texPath });
          injections.push({ type: 'created-file', file: texPath });
        }
      }

      payload._injections = injections;
      await invoke('save_ycs_data', {
        category: 'items',
        id: itemId,
        content: JSON.stringify(payload, null, 2),
      });

      setCurrentInjections(injections);
      setInjected(true);
      setLastSavedId(itemId);
      if (onBack) onBack();
    } catch (err) {
      setStatus({ ok: false, msg: 'Injection failed: ' + err });
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!existingId && !itemId) return;
    const targetId = existingId || itemId;
    setSaving(true);
    try {
      await removeExistingInjections();
      await invoke('delete_geo_model', { id: targetId }).catch(() => {});
      await invoke('delete_ycs_data', { category: 'items', id: targetId });
      setStatus({ ok: true, msg: 'Removed and cleaned up.' });
      setInjected(false);
      if (onBack) onBack();
    } catch (err) {
      setStatus({ ok: false, msg: 'Remove failed: ' + err });
    }
    setSaving(false);
  };

  const textureOptions = textures.map(t => ({ label: t.label, value: t.id }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500', flex: 1 }}>
          {existingId ? `Edit Item: ${existingId}` : 'New Item'}
        </h2>
        {status && <span style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252' }}>{status.msg}</span>}
        {injected && <button className="ycs-button" onClick={handleRemove} style={{ color: '#e05252' }}>Remove</button>}
        <button className="ycs-button" onClick={onBack}>Cancel</button>
        <button className="ycs-button" onClick={handleSaveAndInject} disabled={saving || !itemId}>{saving ? 'Saving...' : 'Save'}</button>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <FieldGroup label="Identity">
          <FieldRow label="Item ID">
            <StringField value={itemId} onChange={handleIdChange} style={{ width: '100%' }} />
          </FieldRow>
          <FieldRow label="Display Name">
            <StringField value={displayName} onChange={setDisplayName} style={{ width: '100%' }} />
          </FieldRow>
        </FieldGroup>

        <FieldGroup label="Appearance">
          <FieldRow label="Holding Mode">
            <StandardDropdownField
              value={holdingMode}
              onChange={setHoldingMode}
              options={[
                { label: 'Generated', value: 'generated' },
                { label: 'Handheld', value: 'handheld' },
                { label: '3D Model', value: '3d' },
              ]}
            />
          </FieldRow>

          {is3D ? (
            <>
              <FieldRow label="Texture">
                <StandardDropdownField
                  value={geoTexture}
                  onChange={setGeoTexture}
                  options={[{ label: '(None)', value: '' }, ...textureOptions]}
                />
              </FieldRow>
              <FieldRow label="Model">
                <FileDropZone
                  hasFile={!!geoModel}
                  fileName={`${geoModel}.geo.json`}
                  onImport={(path) => importGeoModel(path)}
                  onClear={() => setGeoModel('')}
                />
              </FieldRow>
              <FieldRow label="Display Model">
                <FileDropZone
                  hasFile={!!displayModel}
                  fileName={`${displayModel}.display.json`}
                  onImport={(path) => importDisplayModel(path)}
                  onClear={() => setDisplayModel('')}
                />
              </FieldRow>
            </>
          ) : (
            <FieldRow label="Texture">
              <StandardDropdownField
                value={texture}
                onChange={setTexture}
                options={[{ label: '(None)', value: '' }, ...textureOptions]}
              />
            </FieldRow>
          )}
        </FieldGroup>

        <FieldGroup label="Properties">
          <FieldRow label="Stack Size">
            <StringField value={stackSize} onChange={setStackSize} style={{ width: '80px' }} />
          </FieldRow>
        </FieldGroup>

        <FieldGroup label="Advanced">
          <FieldRow label="Custom Class">
            <div
              onClick={() => setCustomClass(!customClass)}
              style={{
                width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0,
                border: `1px solid ${customClass ? 'var(--ycs-highlight)' : 'var(--ycs-foreground)'}`,
                borderRadius: '3px',
                backgroundColor: customClass ? 'var(--ycs-highlight)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background-color 0.1s, border-color 0.1s',
              }}
            >
              {customClass && (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            {customClass && itemId && (
              <span style={{ fontSize: '11px', opacity: 0.5, fontFamily: 'monospace' }}>
                {toPascalCase(itemId)}Item.java
              </span>
            )}
          </FieldRow>
        </FieldGroup>
      </div>

    </div>
  );
}
