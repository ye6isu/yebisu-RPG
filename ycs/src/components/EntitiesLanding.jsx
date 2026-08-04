import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { FieldRow, StringField, StandardDropdownField } from './Field/Field';
import { attrRegistryRef, compileChain, collectBlockImports } from '../codegen/visual/compiler.js';
import EntityAttributesPage, { DEFAULT_ENTITY_ATTRIBUTES } from './EntityAttributesPage';
import EntityGoalsPage from './EntityGoalsPage';
import EntityAnimationsPage from './EntityAnimationsPage';
import EntityPartsPage from './EntityPartsPage';
import BlockEditor from './BlockEditor';
import { useTitlebarActions } from './Titlebar/TitlebarActionsContext';

const JAVA_BASE = 'java/net/ye6isu/yebisuRPG';

function entityConstName(id) {
  return id.toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

function formatModelNumber(value) {
  return Number.parseFloat(value.toFixed(4)).toString();
}

function readModelVec3(obj, key) {
  const arr = obj?.[key];
  return Array.isArray(arr) ? [
    Number(arr[0]) || 0,
    Number(arr[1]) || 0,
    Number(arr[2]) || 0,
  ] : [0, 0, 0];
}

function modelHitboxPartsFromGeo(raw) {
  const parsed = JSON.parse(raw);
  const geometry = parsed?.['minecraft:geometry'];
  const bones = Array.isArray(geometry?.[0]?.bones) ? geometry[0].bones : [];
  return bones
    .filter(bone => typeof bone?.name === 'string' && bone.name.startsWith('hb_'))
    .map((bone) => {
      const cube = Array.isArray(bone.cubes) ? bone.cubes[0] : null;
      const pivot = readModelVec3(bone, 'pivot');
      const origin = readModelVec3(cube, 'origin');
      const size = readModelVec3(cube, 'size').map(v => Math.abs(v));
      const center = [
        origin[0] + size[0] / 2,
        origin[1] + size[1] / 2,
        origin[2] + size[2] / 2,
      ];
      return {
        name: bone.name,
        boneName: bone.name,
        width: formatModelNumber(Math.max(size[0], size[2]) / 16 || 1),
        height: formatModelNumber(size[1] / 16 || 1),
        offsetX: formatModelNumber(center[0] - pivot[0]),
        offsetY: formatModelNumber(origin[1] - pivot[1]),
        offsetZ: formatModelNumber(center[2] - pivot[2]),
        source: 'model',
      };
    });
}

async function loadModelHitboxParts(entityId) {
  const raw = await invoke('load_geo_model_content', { kind: 'entities', id: entityId });
  return modelHitboxPartsFromGeo(raw);
}

function FieldIconButton({ onClick, title, hasData, disabled }) {
  return (
    <button className="ycs-button field" onClick={onClick} title={title} disabled={disabled}
      style={{ flexShrink: 0, fontSize: '11px', minWidth: 'unset', padding: '0 6px', width: 'auto', height: '24px' }}>
      {hasData ? 'edit' : 'set'}
    </button>
  );
}

function FieldGroup({ label, headerExtra, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
        fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
        opacity: 0.4, padding: '4px 0', userSelect: 'none',
      }}>
        <span>{label}</span>
        {headerExtra}
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
        width: '180px', flex: '0 0 180px', height: '24px', display: 'flex', alignItems: 'center',
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
  const [hitboxWidth, setHitboxWidth] = useState('0.6');
  const [hitboxHeight, setHitboxHeight] = useState('1.8');
  const [eyeHeight, setEyeHeight] = useState('');
  const [hostility, setHostility] = useState('passive');
  const [attributes, setAttributes] = useState(DEFAULT_ENTITY_ATTRIBUTES);
  const [goals, setGoals] = useState([]);
  const [parts, setParts] = useState([]);
  const [blockEditing, setBlockEditing] = useState(null); // { entityId, methodKey }
  const [headBone, setHeadBone] = useState('');
  const [idleAnim, setIdleAnim] = useState('idle');
  const [walkAnim, setWalkAnim] = useState('');
  const [currentInjections, setCurrentInjections] = useState([]);
  const [lastSavedId, setLastSavedId] = useState(entityId || null);
  const [injected, setInjected] = useState(false);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [subpage, setSubpage] = useState(null); // null | 'attributes' | 'goals' | 'animations'

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
        setHitboxWidth(String(data.hitboxWidth ?? 0.6));
        setHitboxHeight(String(data.hitboxHeight ?? 1.8));
        setEyeHeight(data.eyeHeight != null ? String(data.eyeHeight) : '');
        setHostility(data.hostility || 'passive');
        setAttributes(Array.isArray(data.attributes) && data.attributes.length > 0 ? data.attributes : DEFAULT_ENTITY_ATTRIBUTES);
        setGoals(Array.isArray(data.goals) ? data.goals : []);
        setParts(Array.isArray(data.hitboxParts) ? data.hitboxParts : []);
        setHeadBone(data.headBone || '');
        setIdleAnim(data.idleAnim || 'idle');
        setWalkAnim(data.walkAnim || '');
        setCurrentInjections(Array.isArray(data._injections) ? data._injections : []);
        setInjected((data._injections || []).length > 0);
        setLastSavedId(entityId);
      })
      .catch(() => {});
    invoke('load_geo_model_path', { kind: 'entities', id: entityId }).then(() => setGeoModelSet(true)).catch(() => setGeoModelSet(false));
    invoke('load_animation_file_path', { kind: 'entities', id: entityId }).then(() => setAnimFileSet(true)).catch(() => setAnimFileSet(false));
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
      await invoke('import_geo_model', { kind: 'entities', id, sourcePath: filePath });
      const detectedParts = await loadModelHitboxParts(id).catch(() => []);
      setParts(detectedParts);
      setGeoModelSet(true);
      setStatus({ ok: true, msg: detectedParts.length > 0 ? `Geo model imported. Found ${detectedParts.length} hitbox part${detectedParts.length === 1 ? '' : 's'}.` : 'Geo model imported.' });
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
      await invoke('import_animation_file', { kind: 'entities', id, sourcePath: filePath });
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
        await invoke('delete_geo_model', { kind: 'entities', id: lastSavedId }).catch(() => {});
        await invoke('delete_animation_file', { kind: 'entities', id: lastSavedId }).catch(() => {});
        // Carry over the On Part Hit Blocky graph under the new id, same convention
        // Keybinds use for renamed On Press/On Release graphs.
        const oldKey = `ycs-blocky::entity::${lastSavedId}::entityPartHit`;
        const raw = localStorage.getItem(oldKey);
        if (raw) {
          localStorage.setItem(`ycs-blocky::entity::${trimmed}::entityPartHit`, raw);
          localStorage.removeItem(oldKey);
        }
      }

      const injections = [];
      const constName = entityConstName(trimmed);
      const hbW = parseFloat(hitboxWidth) || 0.6;
      const hbH = parseFloat(hitboxHeight) || 1.8;
      const eyeH = parseFloat(eyeHeight);
      const eyeHeightCall = Number.isFinite(eyeH) ? `.eyeHeight(${eyeH}F)` : '';
      const hostilityEnum = hostility.toUpperCase();

      // Entity type registration
      const entityLine = `    public static final DeferredHolder<EntityType<?>, EntityType<YcsMobEntity>> ${constName} = ENTITY_TYPES.register("${trimmed}", () -> EntityType.Builder.of(YcsMobEntity::new, MobCategory.CREATURE).sized(${hbW}F, ${hbH}F)${eyeHeightCall}.build("${trimmed}"));`;
      await invoke('inject_marker', { file: `${JAVA_BASE}/entity/ModEntities.java`, marker: 'YCS_Mod_Entities', content: entityLine });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/entity/ModEntities.java`, marker: 'YCS_Mod_Entities', content: entityLine });

      // Attribute registration — open-ended list, generated directly as a .add(...) chain
      // since a fixed-arity Java helper can't represent an arbitrary set of attributes.
      const attrCalls = attributes.map(a => `.add(${attrRegistryRef(a.id)}, ${parseFloat(a.value) || 0}D)`).join('');
      const attrLine = `        event.put(ModEntities.${constName}.get(), LivingEntity.createLivingAttributes().add(Attributes.FOLLOW_RANGE, 16.0)${attrCalls}.build());`;
      await invoke('inject_marker', { file: `${JAVA_BASE}/entity/ModEntityEvents.java`, marker: 'YCS_Entity_Attributes', content: attrLine });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/entity/ModEntityEvents.java`, marker: 'YCS_Entity_Attributes', content: attrLine });

      // Hostility / Goal Builder registration — one builder-chain call covering
      // hostility, every extra goal, and an optional ranged attack config.
      const rangedGoal = goals.find(g => g.type === 'ranged_attack');
      const goalCalls = goals.filter(g => g.type !== 'ranged_attack').map(g => {
        const p = g.params || {};
        switch (g.type) {
          case 'float':
            return `.withGoal(new YcsMobData.GoalEntry(YcsMobData.GoalType.FLOAT, 0D, 0D, 0F, false, null))`;
          case 'wander':
            return `.withGoal(new YcsMobData.GoalEntry(YcsMobData.GoalType.WANDER, ${parseFloat(p.speedModifier) || 1}D, 0D, 0F, false, null))`;
          case 'look_at_player':
            return `.withGoal(new YcsMobData.GoalEntry(YcsMobData.GoalType.LOOK_AT_PLAYER, 0D, 0D, ${parseFloat(p.maxDistance) || 8}F, false, null))`;
          case 'look_around':
            return `.withGoal(new YcsMobData.GoalEntry(YcsMobData.GoalType.LOOK_AROUND, 0D, 0D, 0F, false, null))`;
          case 'avoid_entity':
            return `.withGoal(new YcsMobData.GoalEntry(YcsMobData.GoalType.AVOID_ENTITY, ${parseFloat(p.speedModifier) || 1}D, ${parseFloat(p.sprintSpeedModifier) || 1.5}D, ${parseFloat(p.maxDistance) || 8}F, false, null))`;
          case 'panic':
            return `.withGoal(new YcsMobData.GoalEntry(YcsMobData.GoalType.PANIC, ${parseFloat(p.speedModifier) || 1.25}D, 0D, 0F, false, null))`;
          case 'tempt':
            return `.withGoal(new YcsMobData.GoalEntry(YcsMobData.GoalType.TEMPT, ${parseFloat(p.speedModifier) || 1}D, 0D, 0F, ${!!p.canScare}, "${p.itemId || 'minecraft:wheat'}"))`;
          case 'breed':
            return `.withGoal(new YcsMobData.GoalEntry(YcsMobData.GoalType.BREED, ${parseFloat(p.speedModifier) || 1}D, 0D, 0F, false, null)).withBreedingItem("${p.itemId || 'minecraft:wheat'}")`;
          default:
            return '';
        }
      }).join('');
      const rangedCall = rangedGoal
        ? (() => {
            const p = rangedGoal.params || {};
            return `.withRangedAttack(new YcsMobData.RangedAttackConfig(${parseFloat(p.speedModifier) || 1}D, ${parseInt(p.attackInterval) || 20}, ${parseFloat(p.attackRadius) || 10}F, ${parseFloat(p.damage) || 3}D))`;
          })()
        : '';
      const headBoneCall = headBone ? `.withHeadBone("${headBone}")` : '';
      const animNamesCall = `.withAnimNames("${idleAnim || ''}", "${walkAnim || ''}")`;
      const detectedParts = await loadModelHitboxParts(trimmed).catch(() => parts);
      const savedParts = Array.isArray(detectedParts) ? detectedParts : [];
      const partCalls = savedParts.map(p =>
        `.withPart("${p.name}", "${p.boneName}", ${parseFloat(p.width) || 1}F, ${parseFloat(p.height) || 1}F, ${parseFloat(p.offsetX) || 0}F, ${parseFloat(p.offsetY) || 0}F, ${parseFloat(p.offsetZ) || 0}F)`
      ).join('');
      const hostilityLine = `        YcsMobData.register(ModEntities.${constName}.get(), new YcsMobData.Config(YcsMobData.Hostility.${hostilityEnum})${goalCalls}${rangedCall}${headBoneCall}${animNamesCall}${partCalls});`;
      await invoke('inject_marker', { file: `${JAVA_BASE}/entity/ModEntityEvents.java`, marker: 'YCS_Entity_Hostility', content: hostilityLine });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/entity/ModEntityEvents.java`, marker: 'YCS_Entity_Hostility', content: hostilityLine });

      // Renderer registration
      const animFilePath = `yebisurpg:animations/entity/${trimmed}.animation.json`;
      const headBoneArg = headBone ? `"${headBone}"` : 'null';
      const rendererLine = `        ModEntityRendererRegistry.tryRegister(specs, ModEntities.${constName}.get(), "${trimmed}", "${animFilePath}", "${idleAnim}", "${walkAnim}", ${headBoneArg});`;
      await invoke('inject_marker', { file: `${JAVA_BASE}/entity/client/ModEntityRendererRegistry.java`, marker: 'YCS_Entity_Renderer_Collect', content: rendererLine });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/entity/client/ModEntityRendererRegistry.java`, marker: 'YCS_Entity_Renderer_Collect', content: rendererLine });

      // Copy geo model / texture / animation file into mod resources
      const geoDest = `resources/assets/yebisurpg/geo/entity/${trimmed}.geo.json`;
      await invoke('copy_geo_model_to_mod', { kind: 'entities', modelId: trimmed, destFile: geoDest });
      injections.push({ type: 'created-file', file: geoDest });

      const texDest = `resources/assets/yebisurpg/textures/entity/${trimmed}.png`;
      await invoke('copy_texture_to_mod', { textureId, destFile: texDest });
      injections.push({ type: 'created-file', file: texDest });

      const animDest = `resources/assets/yebisurpg/animations/entity/${trimmed}.animation.json`;
      await invoke('copy_animation_file_to_mod', { kind: 'entities', id: trimmed, destFile: animDest });
      injections.push({ type: 'created-file', file: animDest });

      // Lang key
      const langKey = `entity.yebisurpg.${trimmed}`;
      await invoke('set_json_key', { file: 'resources/assets/yebisurpg/lang/en_us.json', key: langKey, value: displayName || trimmed });
      injections.push({ type: 'json-key', file: 'resources/assets/yebisurpg/lang/en_us.json', key: langKey });

      // On Part Hit Blocky graph — compiled into EntityPartHitHandlers.java, one
      // case per entity id (mirrors KeybindHandlers' On Press/On Release dispatch).
      const partHitRaw = localStorage.getItem(`ycs-blocky::entity::${trimmed}::entityPartHit`);
      if (partHitRaw) {
        try {
          const nodes = JSON.parse(partHitRaw);
          const startNode = nodes.find(n => n.id === 'start');
          if (startNode?.nextId) {
            const lines = compileChain(startNode.nextId, nodes, 'entityPartHit');
            const caseLine = `            case "${trimmed}" -> { ${lines.join(' ')} }`;
            await invoke('inject_marker', { file: `${JAVA_BASE}/entity/EntityPartHitHandlers.java`, marker: 'YCS_Entity_Part_Hit_Dispatch', content: caseLine });
            injections.push({ type: 'java-marker', file: `${JAVA_BASE}/entity/EntityPartHitHandlers.java`, marker: 'YCS_Entity_Part_Hit_Dispatch', content: caseLine });

            for (const imp of collectBlockImports(nodes)) {
              const importLine = `import ${imp};`;
              await invoke('inject_marker', { file: `${JAVA_BASE}/entity/EntityPartHitHandlers.java`, marker: 'YCS_Entity_Part_Hit_Imports', content: importLine });
              injections.push({ type: 'java-marker', file: `${JAVA_BASE}/entity/EntityPartHitHandlers.java`, marker: 'YCS_Entity_Part_Hit_Imports', content: importLine });
            }
          }
        } catch (e) {
          console.error('Block compile error for entityPartHit', e);
        }
      }

      const payload = {
        id: trimmed, displayName, texture: textureId,
        hitboxWidth: hbW, hitboxHeight: hbH,
        eyeHeight: Number.isFinite(eyeH) ? eyeH : null,
        hostility, attributes, goals, hitboxParts: savedParts,
        headBone, idleAnim, walkAnim,
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
      await invoke('delete_geo_model', { kind: 'entities', id: lastSavedId }).catch(() => {});
      await invoke('delete_animation_file', { kind: 'entities', id: lastSavedId }).catch(() => {});
      await invoke('delete_ycs_data', { category: 'entities', id: lastSavedId });
      localStorage.removeItem(`ycs-blocky::entity::${lastSavedId}::entityPartHit`);
      if (onBack) onBack();
    } catch (err) {
      setStatus({ ok: false, msg: 'Remove failed: ' + err });
    }
    setSaving(false);
  };

  const textureOptions = textures.map(t => ({ value: t.id, label: t.label || t.id }));

  if (subpage === 'attributes') {
    return (
      <EntityAttributesPage
        entityId={id}
        attributes={attributes}
        onChange={setAttributes}
        onBack={() => setSubpage(null)}
      />
    );
  }
  if (subpage === 'goals') {
    return (
      <EntityGoalsPage
        entityId={id}
        goals={goals}
        onChange={setGoals}
        onBack={() => setSubpage(null)}
      />
    );
  }
  if (subpage === 'animations') {
    return (
      <EntityAnimationsPage
        entityId={id}
        headBone={headBone}
        idleAnim={idleAnim}
        walkAnim={walkAnim}
        onChangeHeadBone={setHeadBone}
        onChangeIdleAnim={setIdleAnim}
        onChangeWalkAnim={setWalkAnim}
        onBack={() => setSubpage(null)}
      />
    );
  }
  if (subpage === 'parts') {
    return (
      <EntityPartsPage
        entityId={id || lastSavedId}
        parts={parts}
        onChange={setParts}
        onOpenPartHitEditor={(entId, methodKey) => setBlockEditing({ entityId: entId, methodKey })}
        onBack={() => setSubpage(null)}
      />
    );
  }
  if (blockEditing) {
    return (
      <BlockEditor
        entityId={blockEditing.entityId}
        methodKey={blockEditing.methodKey}
        onBack={() => setBlockEditing(null)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500', flex: 1 }}>
          {entityId ? `Edit Entity: ${entityId}` : 'New Entity'}
        </h2>
        {status && <span style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252' }}>{status.msg}</span>}
        {injected && <button className="ycs-button" onClick={handleRemove} disabled={saving} style={{ color: '#e05252' }}>Remove</button>}
        <button className="ycs-button" onClick={onBack}>Cancel</button>
        <button className="ycs-button" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <FieldGroup label="Identity">
          <FieldRow label="Id">
          <StringField value={id} onChange={v => setId(v.toLowerCase().replace(/\s/g, '_'))} disabled={!!entityId} />
          </FieldRow>
          <FieldRow label="Display Name">
          <StringField value={displayName} onChange={setDisplayName} />
          </FieldRow>
        </FieldGroup>

        <FieldGroup label="Appearance">
          <FieldRow label="Texture">
            <StandardDropdownField value={textureId} onChange={setTextureId} options={textureOptions} searchable />
          </FieldRow>
          <FieldRow label="Geo Model">
            <FileDropZone hasFile={geoModelSet} fileName={geoModelSet ? `${id}.geo.json` : ''} onImport={importGeoModel} accept=".json" />
          </FieldRow>
        </FieldGroup>

        <FieldGroup label="Animations">
          <FieldRow label="Animation File">
            <FileDropZone hasFile={animFileSet} fileName={animFileSet ? `${id}.animation.json` : ''} onImport={importAnimationFile} accept=".json" />
          </FieldRow>
          <FieldRow label="Head Bone & Poses">
            <FieldIconButton title="Manage Animations" hasData={!!headBone || !!walkAnim} onClick={() => setSubpage('animations')} />
            <span style={{ fontSize: 11, opacity: 0.5 }}>{idleAnim || '(idle unset)'}{walkAnim ? ` / ${walkAnim}` : ''}</span>
          </FieldRow>
        </FieldGroup>

        <FieldGroup label="Attributes">
          <FieldRow label="Stats & Combat">
            <FieldIconButton title="Manage Attributes" hasData={attributes.length > 0} onClick={() => setSubpage('attributes')} />
            <span style={{ fontSize: 11, opacity: 0.5 }}>{attributes.length} attribute{attributes.length === 1 ? '' : 's'}</span>
          </FieldRow>
        </FieldGroup>

        <FieldGroup label="Combat">
          <FieldRow label="Hostility">
            <StandardDropdownField
              value={hostility}
              onChange={setHostility}
              options={[
                { value: 'passive', label: 'Passive' },
                { value: 'hostile', label: 'Hostile' },
                { value: 'neutral', label: 'Neutral' },
              ]}
            />
          </FieldRow>
        </FieldGroup>

        <FieldGroup label="AI Goals">
          <FieldRow label="Goal Builder">
            <FieldIconButton title="Manage Goals" hasData={goals.length > 0} onClick={() => setSubpage('goals')} />
            <span style={{ fontSize: 11, opacity: 0.5 }}>{goals.length} extra goal{goals.length === 1 ? '' : 's'}</span>
          </FieldRow>
        </FieldGroup>

        <FieldGroup label="Hitbox">
          <FieldRow label="Hitbox Width">
          <StringField value={hitboxWidth} onChange={setHitboxWidth} style={{ width: '90px' }} />
          </FieldRow>
          <FieldRow label="Hitbox Height">
          <StringField value={hitboxHeight} onChange={setHitboxHeight} style={{ width: '90px' }} />
          </FieldRow>
          <FieldRow label="Eye Height">
          <StringField value={eyeHeight} onChange={setEyeHeight} placeholder="Default" style={{ width: '90px' }} />
          </FieldRow>
          <FieldRow label="Extra Hitbox Parts">
            <FieldIconButton title="Manage Parts" hasData={parts.length > 0} onClick={() => setSubpage('parts')} />
            <span style={{ fontSize: 11, opacity: 0.5 }}>{parts.length} part{parts.length === 1 ? '' : 's'}</span>
          </FieldRow>
        </FieldGroup>
      </div>
    </div>
  );
}

export default function EntitiesLanding({ isActive = false }) {
  const [entities, setEntities] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  useTitlebarActions({ active: isActive, search, onSearchChange: setSearch, onAdd: () => { setEditing(null); setCreating(true); } });

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
      await invoke('delete_geo_model', { kind: 'entities', id: entity.id }).catch(() => {});
      await invoke('delete_animation_file', { kind: 'entities', id: entity.id }).catch(() => {});
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', minHeight: 0 }}>
        {filtered.length > 0 && (
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
        )}
      </div>
    </div>
  );
}
