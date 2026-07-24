import { useCallback, useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DropdownField, FieldRow, NumberInput, StandardDropdownField, StringField } from './Field/Field';

const JAVA_FILE = 'java/net/ye6isu/yebisuRPG/resource/PlayerResourceRegistry.java';
const JAVA_MARKER = 'YCS_Player_Resources';
const HUD_TEXTURE_DIR = 'resources/assets/yebisurpg/textures/hud';

function constName(id) {
  return id.toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

function normalizeId(value) {
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function imageDimensions(dataUrl) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth || 1, height: image.naturalHeight || 1 });
    image.onerror = () => resolve({ width: 9, height: 9 });
    image.src = dataUrl;
  });
}

async function loadCategory(category) {
  const ids = await invoke('list_ycs_data', { category }).catch(() => []);
  const values = [];
  for (const id of ids) {
    try {
      const raw = await invoke('load_ycs_data', { category, id });
      values.push({ id, ...JSON.parse(raw) });
    } catch {}
  }
  return values;
}

async function loadTextures() {
  const ids = await invoke('list_textures').catch(() => []);
  const values = [];
  for (const id of ids) {
    try {
      const [raw, dataUrl] = await Promise.all([
        invoke('load_texture', { id }),
        invoke('load_texture_image', { id }),
      ]);
      const dimensions = await imageDimensions(dataUrl);
      values.push({ id, ...JSON.parse(raw), dataUrl, ...dimensions });
    } catch {}
  }
  return values;
}

async function removeInjections(injections) {
  for (const injection of [...(injections || [])].reverse()) {
    if (injection.type === 'java-marker') {
      await invoke('remove_marker_content', {
        file: injection.file,
        marker: injection.marker,
        content: injection.content,
      }).catch(() => {});
    } else if (injection.type === 'created-file') {
      await invoke('delete_mod_file', { file: injection.file }).catch(() => {});
    }
  }
}

function ResourcePreview({ filled, empty, currentVariable, maxAttribute }) {
  const current = Number(currentVariable?.defaultValue ?? 0);
  const maximum = Number(maxAttribute?.max ?? 0);
  const fraction = maximum > 0 ? Math.max(0, Math.min(1, current / maximum)) : 0;
  const format = value => Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);

  return (
    <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', height: 9 }}>
        <div style={{ width: 9, height: 9, position: 'relative', flexShrink: 0 }}>
          {empty?.dataUrl && <img src={empty.dataUrl} alt="" style={{ position: 'absolute', inset: 0, width: 9, height: 9, imageRendering: 'pixelated' }} />}
          {filled?.dataUrl && (
            <div style={{ position: 'absolute', inset: 0, width: `${fraction * 100}%`, overflow: 'hidden' }}>
              <img src={filled.dataUrl} alt="" style={{ width: 9, height: 9, maxWidth: 'none', imageRendering: 'pixelated' }} />
            </div>
          )}
        </div>
        <span style={{ marginLeft: 1, marginTop: 1, fontSize: 9, lineHeight: '9px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
          {format(Math.max(0, current))}/{format(Math.max(0, maximum))}
        </span>
      </div>
    </div>
  );
}

function ResourceEditor({ resourceId, onBack }) {
  const [id, setId] = useState(resourceId || '');
  const [name, setName] = useState('');
  const [currentVariable, setCurrentVariable] = useState('');
  const [maxAttribute, setMaxAttribute] = useState('');
  const [filledTexture, setFilledTexture] = useState('');
  const [emptyTexture, setEmptyTexture] = useState('');
  const [order, setOrder] = useState('0');
  const [regenerationPerSecond, setRegenerationPerSecond] = useState('0');
  const [variables, setVariables] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [textures, setTextures] = useState([]);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([loadCategory('entityvars'), loadCategory('attributes'), loadTextures()])
      .then(([variableValues, attributeValues, textureValues]) => {
        setVariables(variableValues.filter(variable => variable.type === 'double'));
        setAttributes(attributeValues);
        setTextures(textureValues);
      });
  }, []);

  useEffect(() => {
    if (!resourceId) return;
    invoke('load_ycs_data', { category: 'resources', id: resourceId })
      .then(raw => {
        const data = JSON.parse(raw);
        setId(data.id || resourceId);
        setName(data.name || resourceId);
        setCurrentVariable(data.currentVariable || '');
        setMaxAttribute(data.maxAttribute || '');
        setFilledTexture(data.filledTexture || '');
        setEmptyTexture(data.emptyTexture || '');
        setOrder(String(data.order ?? 0));
        setRegenerationPerSecond(String(data.regenerationPerSecond ?? 0));
      })
      .catch(() => {});
  }, [resourceId]);

  const variableOptions = variables.map(variable => ({ value: variable.id, label: variable.name || variable.id }));
  const attributeOptions = attributes.map(attribute => ({ value: attribute.id, label: attribute.titleText || attribute.name || attribute.id }));
  const textureOptions = textures.map(texture => ({ value: texture.id, label: texture.label || texture.id, img: texture.dataUrl }));
  const selectedFilled = textures.find(texture => texture.id === filledTexture);
  const selectedEmpty = textures.find(texture => texture.id === emptyTexture);
  const selectedVariable = variables.find(variable => variable.id === currentVariable);
  const selectedAttribute = attributes.find(attribute => attribute.id === maxAttribute);

  const save = async () => {
    const trimmed = normalizeId(id || name);
    if (!trimmed || !currentVariable || !maxAttribute || !selectedFilled || !selectedEmpty) {
      setStatus({ ok: false, msg: 'ID, variable, attribute, and both textures are required.' });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      let previous = null;
      if (resourceId) {
        previous = await invoke('load_ycs_data', { category: 'resources', id: resourceId })
          .then(raw => JSON.parse(raw)).catch(() => null);
        await removeInjections(previous?._injections);
        if (resourceId !== trimmed) {
          await invoke('delete_ycs_data', { category: 'resources', id: resourceId }).catch(() => {});
        }
      }

      const parsedOrder = Number.parseInt(order, 10) || 0;
      const parsedRegeneration = Math.max(0, Number.parseFloat(regenerationPerSecond) || 0);
      const line = `        register(new PlayerResourceDefinition("${trimmed}", ${parsedOrder}, "${filledTexture}", ${selectedFilled.width}, ${selectedFilled.height}, "${emptyTexture}", ${selectedEmpty.width}, ${selectedEmpty.height}, ${parsedRegeneration}, player -> player.getData(ModAttachments.${constName(currentVariable)}.get()), (player, value) -> player.setData(ModAttachments.${constName(currentVariable)}.get(), value), player -> ((RangedAttribute) ModAttributes.${constName(maxAttribute)}.get()).getMaxValue()));`;
      await invoke('inject_marker', { file: JAVA_FILE, marker: JAVA_MARKER, content: line });

      const injections = [{ type: 'java-marker', file: JAVA_FILE, marker: JAVA_MARKER, content: line }];
      for (const textureId of new Set([filledTexture, emptyTexture])) {
        const file = `${HUD_TEXTURE_DIR}/${textureId}.png`;
        await invoke('copy_texture_to_mod', { textureId, destFile: file });
        injections.push({ type: 'created-file', file });
      }

      const payload = {
        id: trimmed,
        name: name.trim() || trimmed,
        currentVariable,
        maxAttribute,
        filledTexture,
        emptyTexture,
        order: parsedOrder,
        regenerationPerSecond: parsedRegeneration,
        filledTextureWidth: selectedFilled.width,
        filledTextureHeight: selectedFilled.height,
        emptyTextureWidth: selectedEmpty.width,
        emptyTextureHeight: selectedEmpty.height,
        _injections: injections,
      };
      await invoke('save_ycs_data', { category: 'resources', id: trimmed, content: JSON.stringify(payload, null, 2) });
      onBack();
    } catch (error) {
      setStatus({ ok: false, msg: String(error) });
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!resourceId) return;
    setSaving(true);
    try {
      const previous = await invoke('load_ycs_data', { category: 'resources', id: resourceId })
        .then(raw => JSON.parse(raw)).catch(() => null);
      await removeInjections(previous?._injections);
      await invoke('delete_ycs_data', { category: 'resources', id: resourceId });
      onBack();
    } catch (error) {
      setStatus({ ok: false, msg: String(error) });
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500, flex: 1 }}>{resourceId ? `Edit Resource: ${resourceId}` : 'New Resource'}</h2>
        {status && <span style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252' }}>{status.msg}</span>}
        {resourceId && <button className="ycs-button" onClick={remove} disabled={saving} style={{ color: '#e05252' }}>Remove</button>}
        <button className="ycs-button" onClick={onBack}>Cancel</button>
        <button className="ycs-button" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>
      <div style={{ height: 1, backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <FieldRow label="Name"><StringField value={name} onChange={setName} style={{ width: '100%' }} /></FieldRow>
        <FieldRow label="ID"><StringField value={id} onChange={value => setId(normalizeId(value))} style={{ width: '100%' }} /></FieldRow>
        <FieldRow label="Current Variable"><StandardDropdownField value={currentVariable} onChange={setCurrentVariable} options={variableOptions} searchable /></FieldRow>
        <FieldRow label="Maximum Attribute"><StandardDropdownField value={maxAttribute} onChange={setMaxAttribute} options={attributeOptions} searchable /></FieldRow>
        <FieldRow label="Filled Texture"><DropdownField value={filledTexture} onChange={setFilledTexture} options={textureOptions} /></FieldRow>
        <FieldRow label="Empty Texture"><DropdownField value={emptyTexture} onChange={setEmptyTexture} options={textureOptions} /></FieldRow>
        <FieldRow label="Order"><NumberInput value={order} onChange={setOrder} /></FieldRow>
        <FieldRow label="Regeneration / Second"><NumberInput value={regenerationPerSecond} onChange={setRegenerationPerSecond} /></FieldRow>
        <FieldRow label="Preview">
          <ResourcePreview filled={selectedFilled} empty={selectedEmpty} currentVariable={selectedVariable} maxAttribute={selectedAttribute} />
        </FieldRow>
      </div>
    </div>
  );
}

function ResourceRow({ resource, onEdit, onDelete }) {
  return (
    <div onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', border: '1px solid var(--ycs-foreground)', borderRadius: 'var(--ycs-radius)', cursor: 'pointer', minWidth: 180, maxWidth: 300, flex: '1 1 180px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resource.name || resource.id}</div>
        <div style={{ fontSize: 10, opacity: 0.5 }}>{resource.currentVariable} / {resource.maxAttribute}</div>
      </div>
      <button className="ycs-button icon" onClick={event => { event.stopPropagation(); onDelete(); }} title="Delete" style={{ color: '#e05252' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
      </button>
    </div>
  );
}

export default function ResourcesLanding() {
  const [resources, setResources] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const reload = useCallback(() => loadCategory('resources').then(setResources), []);
  useEffect(() => { reload(); }, [reload]);

  const filtered = useMemo(() => resources
    .filter(resource => !search || (resource.name || resource.id).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id)), [resources, search]);

  const deleteResource = async resource => {
    if (!window.confirm(`Delete resource "${resource.name || resource.id}"?`)) return;
    await removeInjections(resource._injections);
    await invoke('delete_ycs_data', { category: 'resources', id: resource.id }).catch(() => {});
    reload();
  };

  if (creating) return <ResourceEditor onBack={() => { setCreating(false); reload(); }} />;
  if (editing) return <ResourceEditor resourceId={editing} onBack={() => { setEditing(null); reload(); }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Resources</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input className="ycs-string-input" value={search} onChange={event => setSearch(event.target.value)} style={{ width: 160 }} />
          <button className="ycs-button icon" onClick={() => setCreating(true)} title="New Resource">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>
      <div style={{ height: 1, backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
        {filtered.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {filtered.map(resource => <ResourceRow key={resource.id} resource={resource} onEdit={() => setEditing(resource.id)} onDelete={() => deleteResource(resource)} />)}
          </div>
        ) : <div style={{ opacity: 0.3, fontSize: 13, padding: '8px 0' }}>No resources yet.</div>}
      </div>
    </div>
  );
}
