import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ColorField, FieldRow, NumberInput, StandardDropdownField, StringField } from './Field/Field';
import './VfxLanding.css';

const JAVA_BASE = 'java/net/ye6isu/yebisuRPG';
const HIERARCHY_WIDTH_KEY = 'ycs-vfx-hierarchy-width';
const INSPECTOR_WIDTH_KEY = 'ycs-vfx-inspector-width';
const TIMELINE_HEIGHT_KEY = 'ycs-vfx-timeline-height';

const MIN_HIERARCHY_WIDTH = 180;
const MIN_INSPECTOR_WIDTH = 230;
const MIN_PREVIEW_WIDTH = 300;
const MIN_TIMELINE_HEIGHT = 100;
const MIN_MAIN_HEIGHT = 180;
const RESIZER_SIZE = 5;

const DEFAULT_EFFECT = {
  id: '',
  name: '',
  durationTicks: '40',
  objects: [],
};

function sanitizeId(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function makeObjectId(objects) {
  let index = objects.length + 1;
  while (objects.some(object => object.id === `plane_${index}`)) index += 1;
  return `plane_${index}`;
}

function newPlane(objects, durationTicks) {
  const id = makeObjectId(objects);
  return {
    id,
    name: `Plane ${objects.length + 1}`,
    type: 'plane',
    texture: '',
    position: { x: '0', y: '1', z: '0' },
    rotation: { x: '0', y: '0', z: '0' },
    scale: { x: '1', y: '1', z: '1' },
    width: '1',
    height: '1',
    billboard: true,
    fullBright: true,
    color: '#ffffff',
    opacity: '1',
    rows: '1',
    ticksPerFrame: '2',
    textureLoop: true,
    startTick: '0',
    endTick: String(Math.max(1, Number(durationTicks) || 40)),
  };
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function storedSize(key, fallback) {
  const parsed = Number.parseInt(localStorage.getItem(key), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function runtimePlane(effectId, object) {
  const objectId = sanitizeId(object.id) || 'plane';
  return {
    ...object,
    id: objectId,
    texture: `yebisurpg:textures/vfx/${effectId}/${objectId}.png`,
    position: {
      x: number(object.position?.x), y: number(object.position?.y), z: number(object.position?.z),
    },
    rotation: {
      x: number(object.rotation?.x), y: number(object.rotation?.y), z: number(object.rotation?.z),
    },
    scale: {
      x: number(object.scale?.x, 1), y: number(object.scale?.y, 1), z: number(object.scale?.z, 1),
    },
    width: Math.max(0.001, number(object.width, 1)),
    height: Math.max(0.001, number(object.height, 1)),
    opacity: clamp(number(object.opacity, 1), 0, 1),
    rows: Math.max(1, Math.floor(number(object.rows, 1))),
    ticksPerFrame: Math.max(1, Math.floor(number(object.ticksPerFrame, 2))),
    startTick: Math.max(0, Math.floor(number(object.startTick, 0))),
    endTick: Math.max(1, Math.floor(number(object.endTick, 1))),
  };
}

async function removeInjections(injections) {
  if (!Array.isArray(injections)) return;
  for (const injection of [...injections].reverse()) {
    if (injection.type === 'java-marker') {
      await invoke('remove_marker_content', { file: injection.file, marker: injection.marker, content: injection.content }).catch(() => {});
    } else if (injection.type === 'json-key') {
      await invoke('delete_json_key', { file: injection.file, key: injection.key }).catch(() => {});
    } else if (injection.type === 'created-file') {
      await invoke('delete_mod_file', { file: injection.file }).catch(() => {});
    }
  }
}

function PlanePreview({ objects, selectedId, textureUrls, previewTick }) {
  const hostRef = useRef(null);
  const tickRef = useRef(previewTick);
  const viewRef = useRef({
    position: [3.6, 2.8, 4.8],
    target: [0, 0.75, 0],
  });
  tickRef.current = previewTick;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101113);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 500);
    camera.position.fromArray(viewRef.current.position);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.fromArray(viewRef.current.target);
    controls.update();
    const saveView = () => {
      camera.position.toArray(viewRef.current.position);
      controls.target.toArray(viewRef.current.target);
    };
    controls.addEventListener('change', saveView);

    const resources = [];
    const gridColor = 0x45484e;
    const grid = new THREE.GridHelper(12, 24, gridColor, 0x26282c);
    scene.add(grid);
    scene.add(new THREE.AxesHelper(1.25));

    const frontLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 6),
    ]);
    const frontLineMaterial = new THREE.LineBasicMaterial({ color: gridColor, depthTest: false });
    const frontLine = new THREE.Line(frontLineGeometry, frontLineMaterial);
    frontLine.renderOrder = 1;
    const frontMarkerGeometry = new THREE.PlaneGeometry(0.16, 0.16);
    frontMarkerGeometry.rotateZ(Math.PI / 4);
    frontMarkerGeometry.rotateX(-Math.PI / 2);
    const frontMarkerMaterial = new THREE.MeshBasicMaterial({
      color: gridColor,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const frontMarker = new THREE.Mesh(frontMarkerGeometry, frontMarkerMaterial);
    frontMarker.position.set(0, 0, 6);
    frontMarker.renderOrder = 2;
    scene.add(frontLine, frontMarker);
    resources.push(frontLineGeometry, frontLineMaterial, frontMarkerGeometry, frontMarkerMaterial);

    const meshes = [];
    const loader = new THREE.TextureLoader();
    for (const object of objects) {
      if (object.type !== 'plane') continue;
      const geometry = new THREE.PlaneGeometry(Math.max(0.001, number(object.width, 1)), Math.max(0.001, number(object.height, 1)));
      const textureUrl = textureUrls[object.texture];
      const texture = textureUrl ? loader.load(textureUrl) : null;
      if (texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      }
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        color: new THREE.Color(object.color || '#ffffff'),
        transparent: true,
        opacity: clamp(number(object.opacity, 1), 0, 1),
        side: THREE.DoubleSide,
        depthWrite: false,
        wireframe: !texture,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(number(object.position?.x), number(object.position?.y), number(object.position?.z));
      mesh.rotation.set(
        THREE.MathUtils.degToRad(number(object.rotation?.x)),
        THREE.MathUtils.degToRad(number(object.rotation?.y)),
        THREE.MathUtils.degToRad(number(object.rotation?.z)),
      );
      mesh.scale.set(number(object.scale?.x, 1), number(object.scale?.y, 1), number(object.scale?.z, 1));
      mesh.userData = {
        object,
        texture,
        billboard: !!object.billboard,
        baseRotationZ: mesh.rotation.z,
        outline: null,
      };
      scene.add(mesh);
      meshes.push(mesh);
      resources.push(geometry, material);
      if (texture) resources.push(texture);

      if (object.id === selectedId) {
        const outline = new THREE.BoxHelper(mesh, 0x4fa3ff);
        scene.add(outline);
        mesh.userData.outline = outline;
        resources.push(outline.geometry, outline.material);
      }
    }

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let animationFrame = 0;
    const render = () => {
      for (const mesh of meshes) {
        const { object, texture, billboard, baseRotationZ, outline } = mesh.userData;
        const active = tickRef.current >= number(object.startTick, 0)
          && tickRef.current < number(object.endTick, Number.POSITIVE_INFINITY);
        mesh.visible = active;
        if (outline) outline.visible = active;
        if (!active) continue;
        if (billboard) {
          mesh.quaternion.copy(camera.quaternion);
          mesh.rotateZ(baseRotationZ);
        }
        if (texture) {
          const rows = Math.max(1, Math.floor(number(object.rows, 1)));
          const ticksPerFrame = Math.max(1, Math.floor(number(object.ticksPerFrame, 2)));
          const rawFrame = Math.max(0, Math.floor((tickRef.current - number(object.startTick, 0)) / ticksPerFrame));
          const frame = object.textureLoop ? rawFrame % rows : Math.min(rawFrame, rows - 1);
          texture.repeat.set(1, 1 / rows);
          texture.offset.set(0, 1 - ((frame + 1) / rows));
        }
      }
      controls.update();
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(render);
    };
    render();

    return () => {
      saveView();
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      controls.removeEventListener('change', saveView);
      controls.dispose();
      for (const resource of resources) resource?.dispose?.();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [objects, selectedId, textureUrls]);

  return <div ref={hostRef} className="vfx-preview" />;
}

function VectorFields({ value, onChange }) {
  return (
    <div className="vfx-vector-fields">
      {['x', 'y', 'z'].map(axis => (
        <label key={axis}><span>{axis.toUpperCase()}</span><NumberInput value={value?.[axis] ?? '0'} onChange={next => onChange({ ...value, [axis]: next })} /></label>
      ))}
    </div>
  );
}

function Timeline({ effect, selectedId, onSelect, onUpdateRange, previewTick, onPreviewTick, playing, onPlaying }) {
  const duration = Math.max(1, Math.floor(number(effect.durationTicks, 40)));
  const dragRef = useRef(null);
  const updateRangeRef = useRef(onUpdateRange);
  const [dragging, setDragging] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const knownObjectIdsRef = useRef(new Set());
  updateRangeRef.current = onUpdateRange;

  useEffect(() => {
    const objectIds = new Set(effect.objects.map(object => object.id));
    setExpandedIds(current => {
      const next = new Set(current);
      let changed = false;
      for (const id of next) {
        if (!objectIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      for (const id of objectIds) {
        if (!knownObjectIdsRef.current.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : current;
    });
    knownObjectIdsRef.current = objectIds;
  }, [effect.objects]);

  useEffect(() => {
    const onMove = event => {
      const drag = dragRef.current;
      if (!drag) return;

      const deltaTicks = Math.round(((event.clientX - drag.startX) / drag.trackWidth) * drag.duration);
      let nextStart = drag.startTick;
      let nextEnd = drag.endTick;

      if (drag.mode === 'move') {
        const length = drag.endTick - drag.startTick;
        nextStart = clamp(drag.startTick + deltaTicks, 0, drag.duration - length);
        nextEnd = nextStart + length;
      } else if (drag.mode === 'start') {
        nextStart = clamp(drag.startTick + deltaTicks, 0, drag.endTick - 1);
      } else {
        nextEnd = clamp(drag.endTick + deltaTicks, drag.startTick + 1, drag.duration);
      }

      if (nextStart === drag.lastStart && nextEnd === drag.lastEnd) return;
      drag.lastStart = nextStart;
      drag.lastEnd = nextEnd;
      updateRangeRef.current(drag.objectId, String(nextStart), String(nextEnd));
    };

    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setDragging(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const startClipDrag = (event, object, mode) => {
    if (event.button !== 0) return;
    const track = event.currentTarget.closest('.vfx-track');
    if (!track) return;

    event.preventDefault();
    event.stopPropagation();
    const startTick = clamp(Math.round(number(object.startTick)), 0, duration - 1);
    const endTick = clamp(Math.round(number(object.endTick, duration)), startTick + 1, duration);
    dragRef.current = {
      objectId: object.id,
      mode,
      startX: event.clientX,
      trackWidth: Math.max(1, track.getBoundingClientRect().width),
      duration,
      startTick,
      endTick,
      lastStart: startTick,
      lastEnd: endTick,
    };
    setDragging({ objectId: object.id, mode });
    onSelect(object.id);
    document.body.style.cursor = mode === 'move' ? 'grabbing' : 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  const toggleExpanded = (event, objectId) => {
    event.stopPropagation();
    setExpandedIds(current => {
      const next = new Set(current);
      if (next.has(objectId)) next.delete(objectId);
      else next.add(objectId);
      return next;
    });
  };

  return (
    <div className="vfx-timeline">
      <div className="vfx-timeline-toolbar">
        <div className="vfx-timeline-controls">
          <button className="ycs-button icon" onClick={() => onPlaying(!playing)} title={playing ? 'Pause' : 'Play'}>{playing ? 'II' : '>'}</button>
          <span>{Math.floor(previewTick)} / {duration}</span>
        </div>
        <div className="vfx-timeline-scrubber">
          <input className="ycs-slider" type="range" min="0" max={duration} step="0.01" value={previewTick} onChange={event => onPreviewTick(Number(event.target.value))} />
        </div>
      </div>
      <div className="vfx-timeline-rows">
        {effect.objects.map(object => {
          const start = clamp(number(object.startTick), 0, duration);
          const end = clamp(number(object.endTick, duration), start, duration);
          const expanded = expandedIds.has(object.id);
          const rangeStyle = {
            left: `${(start / duration) * 100}%`,
            width: `${Math.max(0.5, ((end - start) / duration) * 100)}%`,
          };
          return (
            <div key={object.id} className={`vfx-timeline-layer ${selectedId === object.id ? 'selected' : ''}`}>
              <div className="vfx-timeline-row vfx-timeline-layer-row" onClick={() => onSelect(object.id)}>
                <span className="vfx-timeline-layer-label">
                  <button
                    className={`vfx-disclosure ${expanded ? 'expanded' : ''}`}
                    onClick={event => toggleExpanded(event, object.id)}
                    title={expanded ? 'Collapse Layer' : 'Expand Layer'}
                    aria-label={expanded ? 'Collapse layer' : 'Expand layer'}
                    aria-expanded={expanded}
                  >
                    <span />
                  </button>
                  <span>{object.name || object.id}</span>
                </span>
                <div className="vfx-track">
                  <div className="vfx-track-range summary" style={rangeStyle} />
                  <div className="vfx-playhead" style={{ left: `${(previewTick / duration) * 100}%` }} />
                </div>
              </div>
              {expanded && (
                <div className="vfx-timeline-row vfx-timeline-property-row" onClick={() => onSelect(object.id)}>
                  <span>Active</span>
                  <div className="vfx-track">
                    <div
                      className={`vfx-track-range ${dragging?.objectId === object.id ? `dragging ${dragging.mode}` : ''}`}
                      style={rangeStyle}
                      onMouseDown={event => startClipDrag(event, object, 'move')}
                      title={`${Math.round(start)} - ${Math.round(end)} ticks`}
                    >
                      <span className="vfx-track-handle start" onMouseDown={event => startClipDrag(event, object, 'start')} />
                      <span className="vfx-track-handle end" onMouseDown={event => startClipDrag(event, object, 'end')} />
                    </div>
                    <div className="vfx-playhead" style={{ left: `${(previewTick / duration) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VfxEditor({ effectId, onBack }) {
  const [effect, setEffect] = useState(DEFAULT_EFFECT);
  const [selectedId, setSelectedId] = useState(null);
  const [textures, setTextures] = useState([]);
  const [textureUrls, setTextureUrls] = useState({});
  const [previewTick, setPreviewTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hierarchyWidth, setHierarchyWidth] = useState(() => storedSize(HIERARCHY_WIDTH_KEY, 230));
  const [inspectorWidth, setInspectorWidth] = useState(() => storedSize(INSPECTOR_WIDTH_KEY, 310));
  const [timelineHeight, setTimelineHeight] = useState(() => storedSize(TIMELINE_HEIGHT_KEY, 170));
  const workspaceRef = useRef(null);
  const resizingRef = useRef(null);
  const paneSizesRef = useRef({ hierarchyWidth, inspectorWidth, timelineHeight });
  paneSizesRef.current = { hierarchyWidth, inspectorWidth, timelineHeight };

  const startResize = useCallback((pane, event) => {
    event.preventDefault();
    resizingRef.current = pane;
    document.body.style.cursor = pane === 'timeline' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMove = event => {
      const pane = resizingRef.current;
      const workspace = workspaceRef.current;
      if (!pane || !workspace) return;

      const rect = workspace.getBoundingClientRect();
      if (pane === 'hierarchy') {
        const max = Math.max(
          MIN_HIERARCHY_WIDTH,
          rect.width - paneSizesRef.current.inspectorWidth - MIN_PREVIEW_WIDTH - (RESIZER_SIZE * 2),
        );
        setHierarchyWidth(clamp(event.clientX - rect.left, MIN_HIERARCHY_WIDTH, max));
      } else if (pane === 'inspector') {
        const max = Math.max(
          MIN_INSPECTOR_WIDTH,
          rect.width - paneSizesRef.current.hierarchyWidth - MIN_PREVIEW_WIDTH - (RESIZER_SIZE * 2),
        );
        setInspectorWidth(clamp(rect.right - event.clientX, MIN_INSPECTOR_WIDTH, max));
      } else if (pane === 'timeline') {
        const max = Math.max(MIN_TIMELINE_HEIGHT, rect.height - MIN_MAIN_HEIGHT - RESIZER_SIZE);
        setTimelineHeight(clamp(rect.bottom - event.clientY, MIN_TIMELINE_HEIGHT, max));
      }
    };

    const onUp = () => {
      const pane = resizingRef.current;
      if (!pane) return;
      const sizes = paneSizesRef.current;
      if (pane === 'hierarchy') localStorage.setItem(HIERARCHY_WIDTH_KEY, String(sizes.hierarchyWidth));
      if (pane === 'inspector') localStorage.setItem(INSPECTOR_WIDTH_KEY, String(sizes.inspectorWidth));
      if (pane === 'timeline') localStorage.setItem(TIMELINE_HEIGHT_KEY, String(sizes.timelineHeight));
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const options = [];
      const urls = {};
      try {
        const ids = await invoke('list_textures');
        for (const id of ids) {
          try {
            const metadata = JSON.parse(await invoke('load_texture', { id }));
            const image = await invoke('load_texture_image', { id }).catch(() => null);
            options.push({
              value: id,
              label: metadata.label || metadata.id || id,
              rows: Math.max(1, metadata.rows || 1),
              ticksPerFrame: Math.max(1, metadata.ticksPerFrame || 2),
              img: image,
            });
            if (image) urls[id] = image;
          } catch {}
        }
      } catch {}
      if (!cancelled) {
        setTextures(options);
        setTextureUrls(urls);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!effectId) return;
    invoke('load_ycs_data', { category: 'vfx', id: effectId })
      .then(raw => {
        const loaded = JSON.parse(raw);
        setEffect({ ...DEFAULT_EFFECT, ...loaded, id: loaded.id || effectId, durationTicks: String(loaded.durationTicks || 40), objects: loaded.objects || [] });
        setSelectedId(loaded.objects?.[0]?.id || null);
      })
      .catch(() => {});
  }, [effectId]);

  useEffect(() => {
    if (!playing) return undefined;
    let frame = 0;
    let previous = performance.now();
    const tick = now => {
      const deltaTicks = (now - previous) / 50;
      previous = now;
      setPreviewTick(current => {
        const duration = Math.max(1, number(effect.durationTicks, 40));
        const next = current + deltaTicks;
        return next >= duration ? 0 : next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, effect.durationTicks]);

  const selected = effect.objects.find(object => object.id === selectedId) || null;
  const setEffectField = (key, value) => setEffect(current => ({ ...current, [key]: value }));
  const updateSelected = patch => setEffect(current => ({
    ...current,
    objects: current.objects.map(object => object.id === selectedId ? { ...object, ...patch } : object),
  }));
  const updateObjectRange = useCallback((objectId, startTick, endTick) => {
    setEffect(current => ({
      ...current,
      objects: current.objects.map(object => object.id === objectId
        ? { ...object, startTick, endTick }
        : object),
    }));
  }, []);

  const addPlane = () => {
    setEffect(current => {
      const plane = newPlane(current.objects, current.durationTicks);
      setSelectedId(plane.id);
      return { ...current, objects: [...current.objects, plane] };
    });
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setEffect(current => {
      const objects = current.objects.filter(object => object.id !== selectedId);
      setSelectedId(objects[0]?.id || null);
      return { ...current, objects };
    });
  };

  const selectTexture = textureId => {
    const metadata = textures.find(texture => texture.value === textureId);
    updateSelected({
      texture: textureId,
      rows: String(metadata?.rows || 1),
      ticksPerFrame: String(metadata?.ticksPerFrame || 2),
    });
  };

  const handleSave = async () => {
    const id = sanitizeId(effect.id || effect.name);
    if (!id) return setStatus({ ok: false, message: 'ID is required.' });
    if (effect.objects.some(object => !object.texture)) return setStatus({ ok: false, message: 'Every plane needs a texture.' });

    setSaving(true);
    setStatus(null);
    try {
      const previous = effectId
        ? await invoke('load_ycs_data', { category: 'vfx', id: effectId }).then(raw => JSON.parse(raw)).catch(() => null)
        : null;
      await removeInjections(previous?._injections);

      const durationTicks = clamp(Math.floor(number(effect.durationTicks, 40)), 1, 12000);
      const objects = effect.objects.map(object => {
        const runtime = runtimePlane(id, object);
        runtime.startTick = clamp(runtime.startTick, 0, durationTicks - 1);
        runtime.endTick = clamp(runtime.endTick, runtime.startTick + 1, durationTicks);
        return runtime;
      });
      const injections = [];

      for (let index = 0; index < effect.objects.length; index += 1) {
        const source = effect.objects[index];
        const runtime = objects[index];
        const textureFile = `resources/assets/yebisurpg/textures/vfx/${id}/${runtime.id}.png`;
        await invoke('copy_texture_to_mod', { textureId: source.texture, destFile: textureFile });
        injections.push({ type: 'created-file', file: textureFile });
      }

      const runtimeFile = `resources/assets/yebisurpg/vfx/${id}.json`;
      await invoke('write_mod_file', {
        file: runtimeFile,
        content: JSON.stringify({ version: 1, durationTicks, objects }, null, 2),
      });
      injections.push({ type: 'created-file', file: runtimeFile });

      const registryLine = `        VfxRegistry.register("${id}", ${durationTicks});`;
      await invoke('inject_marker', {
        file: `${JAVA_BASE}/vfx/VfxRegistry.java`, marker: 'YCS_Vfx_Definitions', content: registryLine,
      });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/vfx/VfxRegistry.java`, marker: 'YCS_Vfx_Definitions', content: registryLine });

      const payload = {
        ...effect,
        id,
        name: effect.name || id,
        durationTicks,
        objects: effect.objects,
        _injections: injections,
      };
      await invoke('save_ycs_data', { category: 'vfx', id, content: JSON.stringify(payload, null, 2) });
      if (effectId && effectId !== id) await invoke('delete_ycs_data', { category: 'vfx', id: effectId }).catch(() => {});
      setStatus({ ok: true, message: 'Saved.' });
      onBack();
    } catch (error) {
      setStatus({ ok: false, message: String(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!effectId || !window.confirm(`Delete VFX "${effect.name || effectId}"?`)) return;
    setSaving(true);
    try {
      const previous = await invoke('load_ycs_data', { category: 'vfx', id: effectId }).then(raw => JSON.parse(raw)).catch(() => null);
      await removeInjections(previous?._injections);
      await invoke('delete_ycs_data', { category: 'vfx', id: effectId });
      onBack();
    } catch (error) {
      setStatus({ ok: false, message: String(error) });
      setSaving(false);
    }
  };

  return (
    <div className="vfx-editor">
      <div className="vfx-editor-toolbar">
        <h2>{effectId ? `Edit VFX: ${effectId}` : 'New VFX'}</h2>
        {status && <span className={status.ok ? 'status-ok' : 'status-error'}>{status.message}</span>}
        {effectId && <button className="ycs-button" onClick={handleRemove} disabled={saving}>Remove</button>}
        <button className="ycs-button" onClick={onBack}>Cancel</button>
        <button className="ycs-button" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>

      <div
        ref={workspaceRef}
        className="vfx-workspace"
        style={{ '--vfx-hierarchy-width': `${hierarchyWidth}px` }}
      >
        <div className="vfx-main-row">
          <aside className="vfx-hierarchy" style={{ width: hierarchyWidth }}>
            <div className="vfx-panel-header"><span>Effect</span></div>
            <div className="vfx-effect-settings">
              <FieldRow label="ID"><StringField value={effect.id} onChange={value => setEffectField('id', sanitizeId(value))} /></FieldRow>
              <FieldRow label="Name"><StringField value={effect.name} onChange={value => setEffectField('name', value)} /></FieldRow>
              <FieldRow label="Duration"><NumberInput value={effect.durationTicks} onChange={value => setEffectField('durationTicks', value)} /></FieldRow>
            </div>
            <div className="vfx-panel-header"><span>Objects</span><button className="ycs-button icon" onClick={addPlane} title="Add Plane">+</button></div>
            <div className="vfx-object-list">
              {effect.objects.map(object => (
                <button key={object.id} className={`vfx-object-row ${selectedId === object.id ? 'selected' : ''}`} onClick={() => setSelectedId(object.id)}>
                  <span className="vfx-object-icon" />
                  <span>{object.name || object.id}</span>
                </button>
              ))}
            </div>
          </aside>

          <div
            className="vfx-resizer vfx-resizer-vertical"
            role="separator"
            aria-label="Resize object hierarchy"
            aria-orientation="vertical"
            onMouseDown={event => startResize('hierarchy', event)}
          />

          <PlanePreview objects={effect.objects} selectedId={selectedId} textureUrls={textureUrls} previewTick={previewTick} />

          <div
            className="vfx-resizer vfx-resizer-vertical"
            role="separator"
            aria-label="Resize inspector"
            aria-orientation="vertical"
            onMouseDown={event => startResize('inspector', event)}
          />

          <aside className="vfx-inspector" style={{ width: inspectorWidth }}>
            <div className="vfx-panel-header"><span>Inspector</span><button className="ycs-button icon" onClick={removeSelected} disabled={!selected} title="Remove Object">-</button></div>
            {selected ? (
              <div className="vfx-inspector-fields">
                <FieldRow label="Name"><StringField value={selected.name} onChange={name => updateSelected({ name })} /></FieldRow>
                <FieldRow label="Texture"><StandardDropdownField value={selected.texture} onChange={selectTexture} options={textures} searchable /></FieldRow>
                <FieldRow label="Position"><VectorFields value={selected.position} onChange={position => updateSelected({ position })} /></FieldRow>
                <FieldRow label="Rotation"><VectorFields value={selected.rotation} onChange={rotation => updateSelected({ rotation })} /></FieldRow>
                <FieldRow label="Scale"><VectorFields value={selected.scale} onChange={scale => updateSelected({ scale })} /></FieldRow>
                <FieldRow label="Size"><div className="vfx-pair"><NumberInput value={selected.width} onChange={width => updateSelected({ width })} /><NumberInput value={selected.height} onChange={height => updateSelected({ height })} /></div></FieldRow>
                <FieldRow label="Color"><div className="vfx-pair"><ColorField value={selected.color} onChange={color => updateSelected({ color })} /></div></FieldRow>
                <FieldRow label="Opacity"><NumberInput value={selected.opacity} onChange={opacity => updateSelected({ opacity })} /></FieldRow>
                <FieldRow label="Billboard"><input type="checkbox" checked={selected.billboard} onChange={event => updateSelected({ billboard: event.target.checked })} /></FieldRow>
                <FieldRow label="Full Bright"><input type="checkbox" checked={selected.fullBright} onChange={event => updateSelected({ fullBright: event.target.checked })} /></FieldRow>
                <FieldRow label="Frames"><NumberInput value={selected.rows} onChange={rows => updateSelected({ rows })} /></FieldRow>
                <FieldRow label="Ticks / Frame"><NumberInput value={selected.ticksPerFrame} onChange={ticksPerFrame => updateSelected({ ticksPerFrame })} /></FieldRow>
                <FieldRow label="Loop Texture"><input type="checkbox" checked={selected.textureLoop} onChange={event => updateSelected({ textureLoop: event.target.checked })} /></FieldRow>
                <FieldRow label="Active"><div className="vfx-pair"><NumberInput value={selected.startTick} onChange={startTick => updateSelected({ startTick })} /><NumberInput value={selected.endTick} onChange={endTick => updateSelected({ endTick })} /></div></FieldRow>
              </div>
            ) : <div className="vfx-empty">Add or select an object.</div>}
          </aside>
        </div>

        <div
          className="vfx-resizer vfx-resizer-horizontal"
          role="separator"
          aria-label="Resize timeline"
          aria-orientation="horizontal"
          onMouseDown={event => startResize('timeline', event)}
        />

        <div className="vfx-timeline-pane" style={{ height: timelineHeight }}>
          <Timeline effect={effect} selectedId={selectedId} onSelect={setSelectedId} onUpdateRange={updateObjectRange} previewTick={previewTick} onPreviewTick={setPreviewTick} playing={playing} onPlaying={setPlaying} />
        </div>
      </div>
    </div>
  );
}

function VfxRow({ effect, onEdit, onDelete }) {
  return (
    <div className="vfx-list-row" onClick={onEdit}>
      <div className="vfx-list-thumb">{effect._thumb ? <img src={effect._thumb} alt="" /> : <span />}</div>
      <div className="vfx-list-name"><strong>{effect.name || effect.id}</strong><span>{effect.objects?.length || 0} object(s)</span></div>
      <span>{effect.durationTicks || 0} ticks</span>
      <button className="ycs-button icon" title="Delete" onClick={event => { event.stopPropagation(); onDelete(); }}>-</button>
    </div>
  );
}

export default function VfxLanding() {
  const [effects, setEffects] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const reload = useCallback(async () => {
    const loaded = [];
    try {
      const ids = await invoke('list_ycs_data', { category: 'vfx' });
      for (const id of ids) {
        try {
          const effect = JSON.parse(await invoke('load_ycs_data', { category: 'vfx', id }));
          const firstTexture = effect.objects?.find(object => object.texture)?.texture;
          if (firstTexture) effect._thumb = await invoke('load_texture_image', { id: firstTexture }).catch(() => null);
          loaded.push(effect);
        } catch {}
      }
    } catch {}
    setEffects(loaded);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const deleteEffect = async effect => {
    if (!window.confirm(`Delete VFX "${effect.name || effect.id}"?`)) return;
    await removeInjections(effect._injections);
    await invoke('delete_ycs_data', { category: 'vfx', id: effect.id });
    reload();
  };

  if (creating) return <VfxEditor onBack={() => { setCreating(false); reload(); }} />;
  if (editing) return <VfxEditor effectId={editing} onBack={() => { setEditing(null); reload(); }} />;

  const filtered = effects.filter(effect => `${effect.name || ''} ${effect.id || ''}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="vfx-landing">
      <div className="vfx-landing-toolbar">
        <h2>VFX</h2>
        <input className="ycs-string-input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search" />
        <button className="ycs-button icon" onClick={() => setCreating(true)} title="New VFX">+</button>
      </div>
      <div className="vfx-list">
        {filtered.map(effect => <VfxRow key={effect.id} effect={effect} onEdit={() => setEditing(effect.id)} onDelete={() => deleteEffect(effect)} />)}
        {!filtered.length && <div className="vfx-empty">No VFX yet.</div>}
      </div>
    </div>
  );
}
