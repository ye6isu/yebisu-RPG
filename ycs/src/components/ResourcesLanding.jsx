import { useCallback, useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DropdownField, FieldRow, NumberInput, StringField } from './Field/Field';
import { useTitlebarActions } from './Titlebar/TitlebarActionsContext';

const JAVA_FILE = 'java/net/ye6isu/yebisuRPG/resource/PlayerResourceRegistry.java';
const JAVA_MARKER = 'YCS_Player_Resources';
const VARIABLE_JAVA_FILE = 'java/net/ye6isu/yebisuRPG/entityvar/ModAttachments.java';
const VARIABLE_JAVA_MARKER = 'YCS_Entity_Attachments';
const ATTRIBUTE_JAVA_FILE = 'java/net/ye6isu/yebisuRPG/attribute/ModAttributes.java';
const ATTRIBUTE_JAVA_MARKER = 'YCS_Attributes';
const PLAYER_ATTRIBUTE_JAVA_FILE = 'java/net/ye6isu/yebisuRPG/entity/ModEntityEvents.java';
const PLAYER_ATTRIBUTE_JAVA_MARKER = 'YCS_Player_Resource_Attributes';
const HUD_TEXTURE_DIR = 'resources/assets/yebisurpg/textures/hud';
const ATTRIBUTE_LIMIT = 1_000_000_000;

function constName(id) {
  return id.toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

function normalizeId(value) {
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function managedIds(id) {
  return {
    currentVariable: `current_${id}`,
    maxAttribute: `max_${id}`,
    regenerationAttribute: `${id}_regeneration`,
  };
}

function javaDouble(value) {
  return `${Object.is(value, -0) ? 0 : value}D`;
}

function compareResourceOrder(a, b) {
  if (a.id === 'stamina') return b.id === 'stamina' ? 0 : -1;
  if (b.id === 'stamina') return 1;
  return (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id);
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

async function removeManagedDefinitions(resource) {
  if (!resource) return;
  const ids = {
    ...managedIds(resource.id),
    currentVariable: resource.currentVariable || managedIds(resource.id).currentVariable,
    maxAttribute: resource.maxAttribute || managedIds(resource.id).maxAttribute,
    regenerationAttribute: resource.regenerationAttribute || managedIds(resource.id).regenerationAttribute,
  };
  const removeData = async (category, id) => {
    const data = await invoke('load_ycs_data', { category, id })
      .then(raw => JSON.parse(raw)).catch(() => null);
    await removeInjections(data?._injections);
    await invoke('delete_ycs_data', { category, id }).catch(() => {});
  };
  await removeData('entityvars', ids.currentVariable);
  await removeData('attributes', ids.maxAttribute);
  await removeData('attributes', ids.regenerationAttribute);
}

function ResourcePreview({ bar, currentDefault, maximumDefault }) {
  const current = Number(currentDefault) || 0;
  const maximum = Number(maximumDefault) || 0;
  const fraction = maximum > 0 ? Math.max(0, Math.min(1, current / maximum)) : 0;
  const format = value => Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);

  return (
    <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 137, height: 10, position: 'relative', background: '#211d25', border: '1px solid #62576b', boxSizing: 'border-box' }}>
        {bar?.dataUrl && (
          <div style={{ position: 'absolute', left: 2, top: 2, width: `${132 * fraction}px`, height: 4, overflow: 'hidden' }}>
            <img src={bar.dataUrl} alt="" style={{ width: 132, height: 4, maxWidth: 'none', imageRendering: 'pixelated' }} />
          </div>
        )}
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, lineHeight: '9px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
          {format(Math.max(0, current))}/{format(Math.max(0, maximum))}
        </span>
      </div>
    </div>
  );
}

function ResourceEditor({ resourceId, onBack, isActive = false }) {
  const [id, setId] = useState(resourceId || '');
  const [name, setName] = useState('');
  const [currentDefault, setCurrentDefault] = useState('0');
  const [maximumDefault, setMaximumDefault] = useState('100');
  const [regenerationDefault, setRegenerationDefault] = useState('0');
  const [barTexture, setBarTexture] = useState('');
  const [order, setOrder] = useState('0');
  const [textures, setTextures] = useState([]);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTextures().then(setTextures);
  }, []);

  useEffect(() => {
    if (resourceId) return undefined;
    let cancelled = false;
    loadCategory('resources').then(existing => {
      if (cancelled) return;
      const highestOrder = existing.reduce((highest, resource) => Math.max(highest, Number(resource.order) || 0), 0);
      setOrder(String(highestOrder + 1));
    });
    return () => { cancelled = true; };
  }, [resourceId]);

  useEffect(() => {
    if (!resourceId) return;
    invoke('load_ycs_data', { category: 'resources', id: resourceId })
      .then(raw => {
        const data = JSON.parse(raw);
        setId(data.id || resourceId);
        setName(data.name || resourceId);
        setCurrentDefault(String(data.currentDefault ?? 0));
        setMaximumDefault(String(data.maximumDefault ?? 100));
        setRegenerationDefault(String(data.regenerationDefault ?? data.regenerationPerSecond ?? 0));
        setBarTexture(data.barTexture || data.filledTexture || '');
        setOrder(String(data.order ?? 0));
      })
      .catch(() => {});
  }, [resourceId]);

  const textureOptions = textures.map(texture => ({ value: texture.id, label: texture.label || texture.id, img: texture.dataUrl }));
  const selectedBar = textures.find(texture => texture.id === barTexture);

  const save = async () => {
    const trimmed = normalizeId(id || name);
    if (resourceId === 'stamina' && trimmed !== 'stamina') {
      setStatus({ ok: false, msg: 'Stamina is required and its ID cannot be changed.' });
      return;
    }
    if (!trimmed || !selectedBar) {
      setStatus({ ok: false, msg: 'ID and bar texture are required.' });
      return;
    }

    const parsedCurrent = Number.parseFloat(currentDefault);
    const parsedMaximum = Number.parseFloat(maximumDefault);
    const parsedRegeneration = Number.parseFloat(regenerationDefault);
    if (![parsedCurrent, parsedMaximum, parsedRegeneration].every(Number.isFinite)
        || parsedCurrent < 0 || parsedMaximum < 0 || parsedCurrent > parsedMaximum || parsedRegeneration < 0
        || parsedMaximum > ATTRIBUTE_LIMIT || parsedRegeneration > ATTRIBUTE_LIMIT) {
      setStatus({ ok: false, msg: `Defaults must be non-negative, current cannot exceed maximum, and attributes cannot exceed ${ATTRIBUTE_LIMIT}.` });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const ids = managedIds(trimmed);
      let previous = null;
      if (resourceId) {
        previous = await invoke('load_ycs_data', { category: 'resources', id: resourceId })
          .then(raw => JSON.parse(raw)).catch(() => null);
      }

      if (resourceId !== trimmed) {
        const existingResource = await invoke('load_ycs_data', { category: 'resources', id: trimmed })
          .then(() => true).catch(() => false);
        if (existingResource) throw new Error(`Resource ID "${trimmed}" already exists.`);
      }

      for (const [category, generatedId] of [
        ['entityvars', ids.currentVariable],
        ['attributes', ids.maxAttribute],
        ['attributes', ids.regenerationAttribute],
      ]) {
        const existing = await invoke('load_ycs_data', { category, id: generatedId })
          .then(raw => JSON.parse(raw)).catch(() => null);
        if (existing && (!existing.resourceManaged || existing.ownerResource !== resourceId)) {
          throw new Error(`Generated ID "${generatedId}" is already in use.`);
        }
      }

      if (previous) {
        await removeInjections(previous?._injections);
        await removeManagedDefinitions(previous);
        if (resourceId !== trimmed) {
          await invoke('delete_ycs_data', { category: 'resources', id: resourceId }).catch(() => {});
        }
      }

      const parsedOrder = trimmed === 'stamina' ? 0 : (Number.parseInt(order, 10) || 0);
      const runtimeBarTexture = `${trimmed}_bar`;
      const variableLine = `    public static final DeferredHolder<AttachmentType<?>, AttachmentType<Double>> ${constName(ids.currentVariable)} = registerDouble("${ids.currentVariable}", ${javaDouble(parsedCurrent)});`;
      const maxAttributeLine = `    public static final DeferredHolder<Attribute, Attribute> ${constName(ids.maxAttribute)} = registerAttribute("${ids.maxAttribute}", 0D, ${javaDouble(parsedMaximum)}, 1.0E9D, true);`;
      const regenerationAttributeLine = `    public static final DeferredHolder<Attribute, Attribute> ${constName(ids.regenerationAttribute)} = registerAttribute("${ids.regenerationAttribute}", 0D, ${javaDouble(parsedRegeneration)}, 1.0E9D, true);`;
      const maxPlayerAttributeLine = `        event.add(EntityType.PLAYER, ModAttributes.${constName(ids.maxAttribute)});`;
      const regenerationPlayerAttributeLine = `        event.add(EntityType.PLAYER, ModAttributes.${constName(ids.regenerationAttribute)});`;
      const resourceLine = `        register(new PlayerResourceDefinition("${trimmed}", ${parsedOrder}, "${runtimeBarTexture}", ${selectedBar.width}, ${selectedBar.height}, player -> player.getData(ModAttachments.${constName(ids.currentVariable)}.get()), (player, value) -> player.setData(ModAttachments.${constName(ids.currentVariable)}.get(), value), player -> player.getAttributeValue(ModAttributes.${constName(ids.maxAttribute)}), player -> player.getAttributeValue(ModAttributes.${constName(ids.regenerationAttribute)})));`;
      const javaInjections = [
        { file: VARIABLE_JAVA_FILE, marker: VARIABLE_JAVA_MARKER, content: variableLine },
        { file: ATTRIBUTE_JAVA_FILE, marker: ATTRIBUTE_JAVA_MARKER, content: maxAttributeLine },
        { file: ATTRIBUTE_JAVA_FILE, marker: ATTRIBUTE_JAVA_MARKER, content: regenerationAttributeLine },
        { file: PLAYER_ATTRIBUTE_JAVA_FILE, marker: PLAYER_ATTRIBUTE_JAVA_MARKER, content: maxPlayerAttributeLine },
        { file: PLAYER_ATTRIBUTE_JAVA_FILE, marker: PLAYER_ATTRIBUTE_JAVA_MARKER, content: regenerationPlayerAttributeLine },
        { file: JAVA_FILE, marker: JAVA_MARKER, content: resourceLine },
      ];
      for (const injection of javaInjections) {
        await invoke('inject_marker', injection);
      }

      const injections = javaInjections.map(injection => ({ type: 'java-marker', ...injection }));
      const textureFile = `${HUD_TEXTURE_DIR}/${runtimeBarTexture}.png`;
      await invoke('copy_texture_to_mod', { textureId: barTexture, destFile: textureFile });
      injections.push({ type: 'created-file', file: textureFile });

      const ownerFields = { resourceManaged: true, ownerResource: trimmed, _injections: [] };
      await invoke('save_ycs_data', {
        category: 'entityvars',
        id: ids.currentVariable,
        content: JSON.stringify({ name: ids.currentVariable, type: 'double', defaultValue: String(parsedCurrent), ...ownerFields }, null, 2),
      });
      await invoke('save_ycs_data', {
        category: 'attributes',
        id: ids.maxAttribute,
        content: JSON.stringify({ name: ids.maxAttribute, titleText: `Maximum ${name.trim() || trimmed}`, min: 0, base: parsedMaximum, max: ATTRIBUTE_LIMIT, syncToClient: true, ...ownerFields }, null, 2),
      });
      await invoke('save_ycs_data', {
        category: 'attributes',
        id: ids.regenerationAttribute,
        content: JSON.stringify({ name: ids.regenerationAttribute, titleText: `${name.trim() || trimmed} Regeneration`, min: 0, base: parsedRegeneration, max: ATTRIBUTE_LIMIT, syncToClient: true, ...ownerFields }, null, 2),
      });

      const payload = {
        id: trimmed,
        name: name.trim() || trimmed,
        ...ids,
        currentDefault: parsedCurrent,
        maximumDefault: parsedMaximum,
        regenerationDefault: parsedRegeneration,
        barTexture,
        order: parsedOrder,
        barTextureWidth: selectedBar.width,
        barTextureHeight: selectedBar.height,
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
    if (!resourceId || resourceId === 'stamina') return;
    setSaving(true);
    try {
      const previous = await invoke('load_ycs_data', { category: 'resources', id: resourceId })
        .then(raw => JSON.parse(raw)).catch(() => null);
      await removeInjections(previous?._injections);
      await removeManagedDefinitions(previous);
      await invoke('delete_ycs_data', { category: 'resources', id: resourceId });
      onBack();
    } catch (error) {
      setStatus({ ok: false, msg: String(error) });
      setSaving(false);
    }
  };

  useTitlebarActions({
    active: isActive,
    buttons: [
      { id: 'save', icon: 'save', title: saving ? 'Saving resource' : 'Save resource', disabled: saving || !id, onClick: save },
      { id: 'cancel', icon: 'cancel', title: 'Cancel', disabled: saving, onClick: onBack },
      { id: 'delete', icon: 'delete', title: resourceId === 'stamina' ? 'Stamina cannot be deleted' : 'Delete resource', danger: true, disabled: saving || !resourceId || resourceId === 'stamina', onClick: remove },
    ],
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {status && <div role="status" style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252' }}>{status.msg}</div>}
      <FieldRow label="Name"><StringField value={name} onChange={setName} /></FieldRow>
      <FieldRow label="ID"><StringField value={id} onChange={value => setId(normalizeId(value))} disabled={resourceId === 'stamina'} /></FieldRow>
        <FieldRow label="Current Default"><NumberInput value={currentDefault} onChange={setCurrentDefault} /></FieldRow>
        <FieldRow label="Maximum Default"><NumberInput value={maximumDefault} onChange={setMaximumDefault} /></FieldRow>
        <FieldRow label="Regeneration Default"><NumberInput value={regenerationDefault} onChange={setRegenerationDefault} /></FieldRow>
        <FieldRow label="Bar Texture"><DropdownField value={barTexture} onChange={setBarTexture} options={textureOptions} /></FieldRow>
        {resourceId !== 'stamina' && <FieldRow label="Order"><NumberInput value={order} onChange={setOrder} /></FieldRow>}
        <FieldRow label="Preview">
          <ResourcePreview bar={selectedBar} currentDefault={currentDefault} maximumDefault={maximumDefault} />
        </FieldRow>
      </div>
    </div>
  );
}

function ResourceRow({ resource, onEdit, onDelete }) {
  const protectedResource = resource.id === 'stamina';
  return (
    <div
      onClick={onEdit}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', border: '1px solid var(--ycs-foreground)', borderRadius: 'var(--ycs-radius)', cursor: 'pointer', transition: 'background-color 0.1s, border-color 0.1s', boxSizing: 'border-box', minWidth: 180, maxWidth: 300, flex: '1 1 180px' }}
      onMouseEnter={event => {
        event.currentTarget.style.backgroundColor = 'var(--ycs-accent)';
        event.currentTarget.style.borderColor = 'var(--ycs-highlight)';
        const deleteButton = event.currentTarget.querySelector('.row-delete');
        if (deleteButton) deleteButton.style.opacity = '1';
      }}
      onMouseLeave={event => {
        event.currentTarget.style.backgroundColor = 'transparent';
        event.currentTarget.style.borderColor = 'var(--ycs-foreground)';
        const deleteButton = event.currentTarget.querySelector('.row-delete');
        if (deleteButton) deleteButton.style.opacity = '0';
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resource.name || resource.id}</div>
        <div style={{ fontSize: 10, opacity: 0.5 }}>{resource.currentVariable} / {resource.maxAttribute}</div>
      </div>
      {!protectedResource && (
        <div
          className="row-delete"
          onClick={event => { event.stopPropagation(); onDelete(); }}
          title="Delete"
          style={{ width: 18, height: 18, cursor: 'pointer', opacity: 0, transition: 'opacity 0.1s', flexShrink: 0 }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <circle cx="9" cy="9" r="9" fill="white" />
            <line x1="5" y1="9" x2="13" y2="9" stroke="black" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}

export default function ResourcesLanding({ isActive = false }) {
  const [resources, setResources] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  useTitlebarActions({ active: isActive, enabled: !creating && !editing, search, onSearchChange: setSearch, onAdd: () => { setEditing(null); setCreating(true); } });

  const reload = useCallback(() => loadCategory('resources').then(setResources), []);
  useEffect(() => { reload(); }, [reload]);

  const filtered = useMemo(() => resources
    .filter(resource => !search || (resource.name || resource.id).toLowerCase().includes(search.toLowerCase()))
    .sort(compareResourceOrder), [resources, search]);

  const deleteResource = async resource => {
    if (resource.id === 'stamina') return;
    if (!window.confirm(`Delete resource "${resource.name || resource.id}"?`)) return;
    await removeInjections(resource._injections);
    await removeManagedDefinitions(resource);
    await invoke('delete_ycs_data', { category: 'resources', id: resource.id }).catch(() => {});
    reload();
  };

  if (creating) return <ResourceEditor isActive={isActive} onBack={() => { setCreating(false); reload(); }} />;
  if (editing) return <ResourceEditor isActive={isActive} resourceId={editing} onBack={() => { setEditing(null); reload(); }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
        {filtered.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {filtered.map(resource => <ResourceRow key={resource.id} resource={resource} onEdit={() => setEditing(resource.id)} onDelete={() => deleteResource(resource)} />)}
          </div>
        )}
      </div>
    </div>
  );
}
