import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import ThreeDViewport from './ThreeDViewport';
import OverlayScrollArea from './OverlayScrollArea';
import {
  FieldRow,
  NumberInput,
  StandardDropdownField,
  StringField,
} from './Field/Field';
import { useTitlebarActions } from './Titlebar/TitlebarActionsContext';
import {
  easingProgress,
  hasPropertyKeyframeAtTick,
  keyframesForField,
  linearEasing,
  makeKeyframeId,
  normalizeEasing,
  propertyKeyframeFields,
  propertyValueAtTick,
  sameKeyframeTick,
} from './VfxKeyframes';
import './VfxNewLanding.css';

const JAVA_BASE = 'java/net/ye6isu/yebisuRPG';
const LEFT_WIDTH_KEY = 'ycs-vfx-new-left-width';
const RIGHT_WIDTH_KEY = 'ycs-vfx-new-right-width';
const BOTTOM_HEIGHT_KEY = 'ycs-vfx-new-bottom-height';
const BOTTOM_LEFT_WIDTH_KEY = 'ycs-vfx-new-bottom-left-width';
const CURVE_HEIGHT_KEY = 'ycs-vfx-new-curve-height';

const MIN_LEFT_WIDTH = 180;
const MIN_RIGHT_WIDTH = 180;
const MIN_VIEWPORT_WIDTH = 300;
const MIN_BOTTOM_HEIGHT = 180;
const MIN_BOTTOM_LEFT_WIDTH = 180;
const MIN_BOTTOM_CONTENT_WIDTH = 300;
const MIN_MAIN_HEIGHT = 180;
const MIN_INSPECTOR_HEIGHT = 64;
const MIN_CURVE_HEIGHT = 72;
const RESIZER_SIZE = 5;
const PREVIEW_EDGE_BUFFER = 7;
const MIN_RULER_TICK_SPACING = 36;
const TIMELINE_SNAP_DISTANCE = 8;
const TIMELINE_ROW_HEIGHT = 28;
const TIMELINE_PROPERTIES = ['Position', 'Rotation', 'Scale', 'Opacity'];
const MIN_TIMELINE_TICK = -12000;
const MAX_TIMELINE_TICK = 24000;
const KEYFRAME_TIME_PRECISION = 1000;
const EASING_PRESET_FAMILIES = [
  { label: 'Linear', type: 'linear' },
  { label: 'Step', type: 'step', amountLabel: 'Steps', defaultAmount: 2, min: 2, max: 64, step: 1 },
  { label: 'Sine', type: 'sine' },
  { label: 'Quad', type: 'quad' },
  { label: 'Cubic', type: 'cubicPower' },
  { label: 'Quart', type: 'quart' },
  { label: 'Quint', type: 'quint' },
  { label: 'Expo', type: 'expo' },
  { label: 'Circ', type: 'circ' },
  { label: 'Back', type: 'back', amountLabel: 'Amount', defaultAmount: 1.70158, min: 0, max: 10, step: 0.1 },
  { label: 'Elastic', type: 'elastic', amountLabel: 'Amount', defaultAmount: 1, min: 0, max: 4, step: 0.1 },
  { label: 'Bounce', type: 'bounce', amountLabel: 'Strength', defaultAmount: 1, min: 0, max: 4, step: 0.1 },
];

function sanitizeId(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function makeObjectId(objects) {
  let index = objects.length + 1;
  while (objects.some(object => object.id === `plane_${index}`)) index += 1;
  return `plane_${index}`;
}

function objectDefaults(overrides = {}) {
  const position = overrides.position || { x: '0', y: '0', z: '0' };
  const pivot = overrides.pivot || { x: '0', y: '0', z: '0' };
  return {
    id: '',
    name: 'Plane',
    type: 'plane',
    position,
    pivot,
    baseRotation: { x: '0', y: '0', z: '0' },
    rotation: { x: '0', y: '0', z: '0' },
    scale: { x: '1', y: '1', z: '1' },
    width: '1',
    height: '1',
    texture: '',
    color: '#ffffff',
    opacity: '1',
    billboard: false,
    fullBright: false,
    rows: '1',
    ticksPerFrame: '2',
    textureLoop: true,
    start: 0,
    end: 100,
    expanded: false,
    ...overrides,
  };
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function authoredObject(object) {
  const { start, end, expanded, ...source } = object;
  const startTick = clamp(Math.floor(number(start, 0)), MIN_TIMELINE_TICK, MAX_TIMELINE_TICK - 1);
  const endTick = clamp(
    Math.floor(number(end, startTick + 1)),
    startTick + 1,
    MAX_TIMELINE_TICK,
  );
  return {
    ...source,
    startTick: String(startTick),
    endTick: String(endTick),
  };
}

function numericKeyframeValue(value, fallback = 0) {
  if (value && typeof value === 'object') {
    return {
      x: number(value.x, fallback),
      y: number(value.y, fallback),
      z: number(value.z, fallback),
    };
  }
  return number(value, fallback);
}

function runtimeKeyframes(object, property, fallback = 0) {
  const keyframes = Array.isArray(object[`${property}Keyframes`])
    ? object[`${property}Keyframes`]
    : [];
  return keyframes.map(keyframe => ({
    ...keyframe,
    tick: clamp(number(keyframe.tick), MIN_TIMELINE_TICK, MAX_TIMELINE_TICK),
    value: numericKeyframeValue(keyframe.value, fallback),
  }));
}

function runtimePlane(effectId, source) {
  const object = authoredObject(source);
  const objectId = sanitizeId(object.id) || 'plane';
  return {
    ...object,
    id: objectId,
    texture: `yebisurpg:textures/vfx/${effectId}/${objectId}.png`,
    position: {
      x: number(object.position?.x),
      y: number(object.position?.y),
      z: number(object.position?.z),
    },
    pivot: {
      x: number(object.pivot?.x),
      y: number(object.pivot?.y),
      z: number(object.pivot?.z),
    },
    baseRotation: {
      x: number(object.baseRotation?.x),
      y: number(object.baseRotation?.y),
      z: number(object.baseRotation?.z),
    },
    rotation: {
      x: number(object.rotation?.x),
      y: number(object.rotation?.y),
      z: number(object.rotation?.z),
    },
    scale: {
      x: number(object.scale?.x, 1),
      y: number(object.scale?.y, 1),
      z: number(object.scale?.z, 1),
    },
    width: Math.max(0.001, number(object.width, 1)),
    height: Math.max(0.001, number(object.height, 1)),
    opacity: clamp(number(object.opacity, 1), 0, 1),
    rows: Math.max(1, Math.floor(number(object.rows, 1))),
    ticksPerFrame: Math.max(1, Math.floor(number(object.ticksPerFrame, 2))),
    startTick: number(object.startTick),
    endTick: number(object.endTick, 1),
    positionKeyframes: runtimeKeyframes(object, 'position'),
    positionXKeyframes: runtimeKeyframes(object, 'positionX'),
    positionYKeyframes: runtimeKeyframes(object, 'positionY'),
    positionZKeyframes: runtimeKeyframes(object, 'positionZ'),
    rotationKeyframes: runtimeKeyframes(object, 'rotation'),
    rotationXKeyframes: runtimeKeyframes(object, 'rotationX'),
    rotationYKeyframes: runtimeKeyframes(object, 'rotationY'),
    rotationZKeyframes: runtimeKeyframes(object, 'rotationZ'),
    scaleKeyframes: runtimeKeyframes(object, 'scale', 1),
    scaleXKeyframes: runtimeKeyframes(object, 'scaleX', 1),
    scaleYKeyframes: runtimeKeyframes(object, 'scaleY', 1),
    scaleZKeyframes: runtimeKeyframes(object, 'scaleZ', 1),
    opacityKeyframes: runtimeKeyframes(object, 'opacity', 1),
  };
}

async function removeInjections(injections) {
  if (!Array.isArray(injections)) return;
  for (const injection of [...injections].reverse()) {
    if (injection.type === 'java-marker') {
      await invoke('remove_marker_content', {
        file: injection.file,
        marker: injection.marker,
        content: injection.content,
      }).catch(() => {});
    } else if (injection.type === 'json-key') {
      await invoke('delete_json_key', { file: injection.file, key: injection.key }).catch(() => {});
    } else if (injection.type === 'created-file') {
      await invoke('delete_mod_file', { file: injection.file }).catch(() => {});
    }
  }
}

function draggableNumber(value, step) {
  const precision = Math.max(0, (String(step).split('.')[1] || '').length);
  const rounded = Number(value.toFixed(precision));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function authoredKeyframeValue(value) {
  if (value && typeof value === 'object') {
    return {
      x: String(value.x),
      y: String(value.y),
      z: String(value.z),
    };
  }
  return String(value);
}

function inspectorPropertyValue(object, property, tick) {
  const fields = propertyKeyframeFields(object, property);
  const animated = fields.some(field => keyframesForField(object, field).length > 0);
  return animated
    ? authoredKeyframeValue(propertyValueAtTick(object, property, tick))
    : object[property];
}

function propertyKeyframeTicks(object, property) {
  const ticks = new Map();
  propertyKeyframeFields(object, property).forEach(field => {
    keyframesForField(object, field).forEach(keyframe => {
      const tick = number(keyframe.tick);
      ticks.set(Math.round(tick * 1000), tick);
    });
  });
  return [...ticks.values()].sort((first, second) => first - second);
}

function timelineTime(value) {
  return Math.round(number(value) * KEYFRAME_TIME_PRECISION) / KEYFRAME_TIME_PRECISION;
}

function keyframeSelectionKey(selection) {
  return `${selection.objectId}\u0000${selection.field}\u0000${selection.keyframeId}`;
}

function containsKeyframeSelection(selections, candidate) {
  const key = keyframeSelectionKey(candidate);
  return selections.some(selection => keyframeSelectionKey(selection) === key);
}

function keyframeSelectionsAtTick(object, property, tick) {
  return propertyKeyframeFields(object, property).flatMap(field => (
    keyframesForField(object, field)
      .filter(keyframe => sameKeyframeTick(keyframe.tick, tick))
      .map(keyframe => ({ objectId: object.id, field, keyframeId: keyframe.id }))
  ));
}

function availableDraggedKeyframeDelta({
  rawDelta,
  candidateDelta,
  groups,
  minDelta,
  maxDelta,
  direction,
  step,
}) {
  const blocked = new Set();
  groups.forEach(group => {
    const selectedIds = new Set(group.selectedKeyframes.map(keyframe => keyframe.id));
    const fixedTicks = group.keyframes
      .filter(keyframe => !selectedIds.has(keyframe.id))
      .map(keyframe => timelineTime(keyframe.tick));
    group.selectedKeyframes.forEach(selected => {
      fixedTicks.forEach(fixedTick => {
        blocked.add(Math.round(
          timelineTime(fixedTick - selected.startTick) * KEYFRAME_TIME_PRECISION,
        ));
      });
    });
  });

  let candidate = clamp(timelineTime(candidateDelta), minDelta, maxDelta);
  let candidateKey = Math.round(candidate * KEYFRAME_TIME_PRECISION);
  if (!blocked.has(candidateKey)) return candidate;

  const pointerSide = Math.sign(number(direction));
  const side = rawDelta < candidate ? -1 : rawDelta > candidate ? 1 : pointerSide;
  if (side === 0) return null;

  const increment = Math.max(1 / KEYFRAME_TIME_PRECISION, step) * side;
  do {
    candidate = timelineTime(candidate + increment);
    if (candidate < minDelta || candidate > maxDelta) return null;
    candidateKey = Math.round(candidate * KEYFRAME_TIME_PRECISION);
  } while (blocked.has(candidateKey));
  return candidate;
}

function DraggableNumberInput({ value, onChange, dragStep = 1 }) {
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);

  useEffect(() => () => {
    if (!dragRef.current) return;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const startDrag = event => {
    if (event.button !== 0) return;
    const startValue = Number(value);
    if (!Number.isFinite(startValue)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startValue,
      steps: 0,
      dragging: false,
    };
  };

  const moveDrag = event => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    if (!drag.dragging && Math.abs(deltaX) < 3) return;
    drag.dragging = true;
    event.preventDefault();
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    const steps = Math.trunc(deltaX / 6);
    if (steps === drag.steps) return;
    drag.steps = steps;
    onChange(draggableNumber(drag.startValue + (steps * dragStep), dragStep));
  };

  const stopDrag = event => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    suppressClickRef.current = drag.dragging;
    dragRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  return (
    <span
      className="vfx-new-draggable-number"
      title="Drag horizontally to adjust, or click to type"
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onClickCapture={event => {
        if (!suppressClickRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClickRef.current = false;
      }}
    >
      <NumberInput value={value} onChange={onChange} />
    </span>
  );
}

function InspectorCheckbox({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className={`vfx-new-inspector-checkbox ${checked ? 'checked' : ''}`}
      onClick={() => onChange(!checked)}
      aria-label={label}
      aria-pressed={checked}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  );
}

function VectorFields({ value, onChange, dragStep = 0.1 }) {
  return (
    <div className="vfx-new-vector-fields">
      {['x', 'y', 'z'].map(axis => (
        <label key={axis}>
          <span>{axis.toUpperCase()}</span>
          <DraggableNumberInput
            value={value?.[axis] ?? '0'}
            onChange={next => onChange(axis, next)}
            dragStep={dragStep}
          />
        </label>
      ))}
    </div>
  );
}

function editableCubicEasing(easing) {
  const normalized = normalizeEasing(easing);
  if (normalized.type === 'cubic') return normalized;
  return {
    ...linearEasing(),
    y1: easingProgress(1 / 3, normalized),
    y2: easingProgress(2 / 3, normalized),
  };
}

function CubicCurveEditor({
  height,
  selectedCount,
  onApply,
  onRead,
}) {
  const [draftEasing, setDraftEasing] = useState(() => linearEasing());
  const [activeFamily, setActiveFamily] = useState('Linear');
  const [graphSize, setGraphSize] = useState(0);
  const draggedHandleRef = useRef(null);
  const graphWrapRef = useRef(null);
  const curve = normalizeEasing(draftEasing);
  const editableCurve = editableCubicEasing(curve);
  const handles = {
    first: { x: editableCurve.x1, y: editableCurve.y1 },
    second: { x: editableCurve.x2, y: editableCurve.y2 },
  };

  useEffect(() => {
    const graphWrap = graphWrapRef.current;
    if (!graphWrap) return undefined;
    const updateGraphSize = () => {
      const nextSize = Math.max(0, Math.floor(Math.min(
        graphWrap.clientWidth,
        graphWrap.clientHeight,
      )));
      setGraphSize(current => (current === nextSize ? current : nextSize));
    };
    const observer = new ResizeObserver(updateGraphSize);
    observer.observe(graphWrap);
    updateGraphSize();
    return () => observer.disconnect();
  }, []);

  const isLinear = easing => easing.type === 'cubic'
    && Math.abs(easing.x1 - (1 / 3)) < 0.0001
    && Math.abs(easing.y1 - (1 / 3)) < 0.0001
    && Math.abs(easing.x2 - (2 / 3)) < 0.0001
    && Math.abs(easing.y2 - (2 / 3)) < 0.0001;

  const familyForEasing = easing => {
    if (isLinear(easing)) return 'Linear';
    return EASING_PRESET_FAMILIES.find(family => family.type === easing.type)?.label || 'Custom';
  };

  const updateHandleFromPointer = (handle, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    const y = clamp(1 - ((event.clientY - rect.top) / Math.max(1, rect.height)), 0, 1);
    setActiveFamily('Custom');
    setDraftEasing(current => ({
      ...editableCubicEasing(current),
      type: 'cubic',
      ...(handle === 'first' ? { x1: x, y1: y } : { x2: x, y2: y }),
    }));
  };

  const nudgeHandle = (handle, event) => {
    const directions = {
      ArrowLeft: { x: -0.01, y: 0 },
      ArrowRight: { x: 0.01, y: 0 },
      ArrowDown: { x: 0, y: -0.01 },
      ArrowUp: { x: 0, y: 0.01 },
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    setActiveFamily('Custom');
    setDraftEasing(current => {
      const normalized = editableCubicEasing(current);
      const point = handle === 'first'
        ? { x: normalized.x1, y: normalized.y1 }
        : { x: normalized.x2, y: normalized.y2 };
      const next = {
        x: clamp(point.x + direction.x, 0, 1),
        y: clamp(point.y + direction.y, 0, 1),
      };
      return {
        ...normalized,
        type: 'cubic',
        ...(handle === 'first' ? { x1: next.x, y1: next.y } : { x2: next.x, y2: next.y }),
      };
    });
  };

  const selectFamily = family => {
    setActiveFamily(family.label);
    if (family.type === 'linear') {
      const next = linearEasing();
      setDraftEasing(next);
      onApply(next);
      return;
    }
    const next = normalizeEasing({
      ...curve,
      type: family.type,
      mode: ['in', 'out', 'inOut'].includes(curve.mode) ? curve.mode : 'inOut',
      amount: curve.type === family.type ? curve.amount : (family.defaultAmount ?? 1),
    });
    setDraftEasing(next);
    onApply(next);
  };

  const readSelectedEasing = () => {
    const easing = onRead();
    if (!easing) return;
    const normalized = normalizeEasing(easing);
    setDraftEasing(normalized);
    setActiveFamily(familyForEasing(normalized));
  };

  const firstX = handles.first.x * 100;
  const firstY = 100 - (handles.first.y * 100);
  const secondX = handles.second.x * 100;
  const secondY = 100 - (handles.second.y * 100);
  const sampledPath = curve.type === 'cubic'
    ? `M0 100C${firstX} ${firstY} ${secondX} ${secondY} 100 0`
    : Array.from({ length: 101 }, (_, index) => {
        const progress = index / 100;
        return `${index === 0 ? 'M' : 'L'}${progress * 100} ${100 - (easingProgress(progress, curve) * 100)}`;
      }).join('');

  const selectedFamilyDefinition = EASING_PRESET_FAMILIES
    .find(family => family.label === activeFamily);
  const selectedFamilyHasModes = selectedFamilyDefinition
    && !['linear', 'step'].includes(selectedFamilyDefinition.type);
  const draftSummary = curve.type === 'cubic'
    ? `${curve.x1.toFixed(2)}, ${curve.y1.toFixed(2)} / ${curve.x2.toFixed(2)}, ${curve.y2.toFixed(2)}`
    : `${activeFamily} ${curve.mode === 'inOut' ? 'In/Out' : curve.mode === 'in' ? 'In' : 'Out'}`;

  return (
    <section className="vfx-new-curve-editor" style={{ height }} aria-label="Graph Editor">
      <div className="vfx-new-inspector-header vfx-new-curve-editor-title">Graph Editor</div>
      <OverlayScrollArea
        className="vfx-new-curve-editor-scroll"
        contentClassName="vfx-new-curve-editor-content"
        vertical
        horizontal={false}
      >
      <div className="vfx-new-curve-editor-values" title={draftSummary}>{draftSummary}</div>
      <div ref={graphWrapRef} className="vfx-new-curve-editor-graph-wrap">
      <svg
        className="vfx-new-curve-editor-graph"
        style={graphSize > 0 ? { width: graphSize, height: graphSize } : undefined}
        viewBox="0 0 100 100"
        role="img"
        aria-label="Current outgoing keyframe easing curve"
        onPointerDown={event => {
          const handle = event.target.dataset.curveHandle;
          if (!handle) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          draggedHandleRef.current = handle;
          updateHandleFromPointer(handle, event);
        }}
        onPointerMove={event => {
          if (!draggedHandleRef.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          updateHandleFromPointer(draggedHandleRef.current, event);
        }}
        onPointerUp={event => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          draggedHandleRef.current = null;
        }}
        onPointerCancel={event => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          draggedHandleRef.current = null;
        }}
      >
        <g className="vfx-new-curve-grid" aria-hidden="true">
          <path d="M25 0V100M50 0V100M75 0V100M0 25H100M0 50H100M0 75H100" />
          <path className="diagonal" d="M0 100L100 0" />
        </g>
        <g className="vfx-new-curve-controls" aria-hidden="true">
          <path d={`M0 100L${firstX} ${firstY}M100 0L${secondX} ${secondY}`} />
        </g>
        <path className="vfx-new-curve-path" d={sampledPath} />
        <circle className="vfx-new-curve-endpoint" cx="0" cy="100" r="2" />
        <circle className="vfx-new-curve-endpoint" cx="100" cy="0" r="2" />
        {[
          ['first', firstX, firstY, 'First curve control point'],
          ['second', secondX, secondY, 'Second curve control point'],
        ].map(([handle, x, y, label]) => (
          <circle
            key={handle}
            className="vfx-new-curve-handle"
            cx={x}
            cy={y}
            r="4"
            data-curve-handle={handle}
            role="slider"
            tabIndex="0"
            aria-label={label}
            aria-valuemin="0"
            aria-valuemax="1"
            aria-valuenow={handle === 'first' ? editableCurve.x1 : editableCurve.x2}
            aria-valuetext={`${handles[handle].x.toFixed(2)}, ${handles[handle].y.toFixed(2)}`}
            onKeyDown={event => nudgeHandle(handle, event)}
          />
        ))}
      </svg>
      </div>
      <div className="vfx-new-curve-editor-controls">
      <div className="vfx-new-curve-actions">
        <button
          type="button"
          className="ycs-button"
          disabled={selectedCount === 0}
          onClick={() => onApply(curve)}
          title="Apply this easing to each segment between consecutive selected keyframes"
        >
          Apply
        </button>
        <button
          type="button"
          className="ycs-button"
          disabled={selectedCount === 0}
          onClick={readSelectedEasing}
          title="Read the easing from the active selected segment"
        >
          Read
        </button>
      </div>
      <div className="vfx-new-easing-grid">
        {EASING_PRESET_FAMILIES.map(family => {
          const selected = activeFamily === family.label;
          return (
            <div key={family.label} className={`vfx-new-easing-family ${selected ? 'selected' : ''}`}>
              <button
                type="button"
                className="ycs-button vfx-new-easing-family-button"
                onClick={() => selectFamily(family)}
                aria-pressed={selected}
              >
                {family.label}
              </button>
            </div>
          );
        })}
      </div>
      <div className="vfx-new-easing-mode-buttons shared">
        {[['In', 'in'], ['Out', 'out'], ['In/Out', 'inOut']].map(([label, mode]) => (
          <button
            key={mode}
            type="button"
            className={`ycs-button ${selectedFamilyHasModes && curve.mode === mode ? 'selected' : ''}`}
            disabled={!selectedFamilyHasModes}
            onClick={() => {
              const next = normalizeEasing({ ...curve, mode });
              setDraftEasing(next);
              onApply(next);
            }}
            aria-pressed={Boolean(selectedFamilyHasModes && curve.mode === mode)}
          >
            {label}
          </button>
        ))}
      </div>
      {selectedFamilyDefinition?.amountLabel && (
        <>
          <label className="vfx-new-easing-amount">
            <span>{selectedFamilyDefinition.amountLabel}</span>
            <DraggableNumberInput
              value={draftEasing.amount ?? selectedFamilyDefinition.defaultAmount}
              dragStep={selectedFamilyDefinition.step}
              onChange={amount => setDraftEasing(current => ({ ...current, amount }))}
            />
          </label>
          <div className="vfx-new-easing-range-hint">
            {selectedFamilyDefinition.min}-{selectedFamilyDefinition.max}
          </div>
        </>
      )}
      </div>
      </OverlayScrollArea>
    </section>
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function storedSize(key, fallback) {
  const parsed = Number.parseInt(localStorage.getItem(key), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bufferedPreviewPosition(value) {
  const clampedValue = clamp(value, 0, 100);
  const edgeCorrection = ((PREVIEW_EDGE_BUFFER * 2) * clampedValue) / 100;
  return `calc(${PREVIEW_EDGE_BUFFER}px + ${clampedValue}% - ${edgeCorrection}px)`;
}

function bufferedPreviewPixelPosition(value, width) {
  const usableWidth = Math.max(1, width - (PREVIEW_EDGE_BUFFER * 2));
  return PREVIEW_EDGE_BUFFER + ((value / 100) * usableWidth);
}

function formatRulerTime(value) {
  return String(Math.round(value));
}

function niceWholeInterval(minimumInterval) {
  if (minimumInterval <= 1) return 1;
  const exponent = Math.floor(Math.log10(minimumInterval));
  const magnitude = 10 ** exponent;
  const normalized = minimumInterval / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function rulerInterval(span, width) {
  const usableWidth = Math.max(1, width - (PREVIEW_EDGE_BUFFER * 2));
  const minimumInterval = (span / usableWidth) * MIN_RULER_TICK_SPACING;
  return niceWholeInterval(minimumInterval);
}

function rulerTicks(start, end, interval) {
  const ticks = [];
  const first = Math.ceil((start - 0.000001) / interval) * interval;
  for (let value = first; value <= end + 0.000001; value += interval) {
    ticks.push(Number(value.toFixed(6)));
  }
  return ticks;
}

function VfxNewLanding({ effectId = null, onBack = () => {}, isActive = false }) {
  const [leftWidth, setLeftWidth] = useState(() => Math.max(MIN_LEFT_WIDTH, storedSize(LEFT_WIDTH_KEY, 230)));
  const [rightWidth, setRightWidth] = useState(() => Math.max(MIN_RIGHT_WIDTH, storedSize(RIGHT_WIDTH_KEY, 310)));
  const [bottomHeight, setBottomHeight] = useState(() => Math.max(MIN_BOTTOM_HEIGHT, storedSize(BOTTOM_HEIGHT_KEY, 180)));
  const [bottomLeftWidth, setBottomLeftWidth] = useState(() => Math.max(MIN_BOTTOM_LEFT_WIDTH, storedSize(BOTTOM_LEFT_WIDTH_KEY, 230)));
  const [curveHeight, setCurveHeight] = useState(() => Math.max(MIN_CURVE_HEIGHT, storedSize(CURVE_HEIGHT_KEY, 420)));
  const [effectName, setEffectName] = useState('');
  const [effectEditorId, setEffectEditorId] = useState('');
  const [durationTicks, setDurationTicks] = useState(100);
  const [previewTick, setPreviewTick] = useState(0);
  const [previewTickInput, setPreviewTickInput] = useState('0');
  const [playing, setPlaying] = useState(false);
  const [timelineView, setTimelineView] = useState({ start: 0, end: 100 });
  const [timelineObjects, setTimelineObjects] = useState([]);
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [selectedKeyframes, setSelectedKeyframes] = useState([]);
  const [keyframeMarquee, setKeyframeMarquee] = useState(null);
  const [textures, setTextures] = useState([]);
  const [textureUrls, setTextureUrls] = useState({});
  const [currentInjections, setCurrentInjections] = useState([]);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(effectId));
  const [renamingObject, setRenamingObject] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [previewBarWidth, setPreviewBarWidth] = useState(600);
  const [durationScrollbar, setDurationScrollbar] = useState({ visible: false, left: 0, width: 0 });
  const [objectScrollbar, setObjectScrollbar] = useState({ visible: false, top: 0, height: 0 });
  const [timelineScrollbar, setTimelineScrollbar] = useState({ visible: false, top: 0, height: 0 });
  const [inspectorScrollbar, setInspectorScrollbar] = useState({ visible: false, top: 0, height: 0 });
  const [inspectorHorizontalScrollbar, setInspectorHorizontalScrollbar] = useState({ visible: false, left: 0, width: 0 });
  const workspaceRef = useRef(null);
  const rightPanelRef = useRef(null);
  const resizingRef = useRef(null);
  const previewBarRef = useRef(null);
  const previewTickInputFocusedRef = useRef(false);
  const currentTimeDragRef = useRef(null);
  const durationScrollRef = useRef(null);
  const durationThumbDragRef = useRef(null);
  const objectListScrollRef = useRef(null);
  const inspectorScrollRef = useRef(null);
  const inspectorHorizontalThumbDragRef = useRef(null);
  const verticalThumbDragRef = useRef(null);
  const timelineDragRef = useRef(null);
  const keyframeDragRef = useRef(null);
  const keyframeMarqueeRef = useRef(null);
  const previewTickRef = useRef(previewTick);
  const nextPlaneNumberRef = useRef(1);
  const leftTimelineScrollRef = useRef(null);
  const rightTimelineScrollRef = useRef(null);
  const paneSizesRef = useRef({ leftWidth, rightWidth, bottomHeight, bottomLeftWidth, curveHeight });
  paneSizesRef.current = { leftWidth, rightWidth, bottomHeight, bottomLeftWidth, curveHeight };
  previewTickRef.current = previewTick;
  const timelineSpan = Math.max(0.0001, timelineView.end - timelineView.start);
  const previewPosition = ((previewTick - timelineView.start) / timelineSpan) * 100;
  const previewVisible = previewTick >= timelineView.start && previewTick <= timelineView.end;
  const previewRulerInterval = rulerInterval(timelineSpan, previewBarWidth);
  const previewRulerTicks = rulerTicks(timelineView.start, timelineView.end, previewRulerInterval);
  const visibleTimelineObjects = timelineObjects;
  const selectedObject = timelineObjects.find(object => object.id === selectedObjectId) ?? null;
  let timelineContentHeight = 0;
  const timelineObjectLayout = visibleTimelineObjects.map(object => {
    const top = timelineContentHeight;
    timelineContentHeight += TIMELINE_ROW_HEIGHT
      + (object.expanded ? TIMELINE_PROPERTIES.length * TIMELINE_ROW_HEIGHT : 0);
    const startPosition = ((object.start - timelineView.start) / timelineSpan) * 100;
    const endPosition = ((object.end - timelineView.start) / timelineSpan) * 100;
    const left = bufferedPreviewPixelPosition(startPosition, previewBarWidth);
    const right = bufferedPreviewPixelPosition(endPosition, previewBarWidth);
    return { ...object, top, left, right };
  });
  const verticalScrollContentKey = visibleTimelineObjects
    .map(object => `${object.id}:${object.expanded}`)
    .join('|');

  useEffect(() => {
    let cancelled = false;
    const loadTextures = async () => {
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
              rows: Math.max(1, number(metadata.rows, 1)),
              ticksPerFrame: Math.max(1, number(metadata.ticksPerFrame, 2)),
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
    loadTextures();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!effectId) {
      setLoading(false);
      setEffectEditorId('');
      setEffectName('');
      setDurationTicks(100);
      setPreviewTick(0);
      setTimelineView({ start: 0, end: 100 });
      setTimelineObjects([]);
      setSelectedObjectId(null);
      setSelectedKeyframes([]);
      setCurrentInjections([]);
      nextPlaneNumberRef.current = 1;
      return;
    }

    let cancelled = false;
    setLoading(true);
    invoke('load_ycs_data', { category: 'vfx', id: effectId })
      .then(raw => {
        if (cancelled) return;
        const loaded = JSON.parse(raw);
        const duration = clamp(Math.floor(number(loaded.durationTicks, 100)), 1, 12000);
        const objects = (loaded.objects || []).map((object, index) => objectDefaults({
          ...object,
          id: object.id || `plane_${index + 1}`,
          name: object.name || object.id || `Plane ${index + 1}`,
          start: number(object.startTick, 0),
          end: number(object.endTick, duration),
        }));
        setEffectEditorId(loaded.id || effectId);
        setEffectName(loaded.name || loaded.id || effectId);
        setDurationTicks(duration);
        setPreviewTick(0);
        setTimelineView({ start: 0, end: duration });
        setTimelineObjects(objects);
        setSelectedObjectId(objects[0]?.id || null);
        setSelectedKeyframes([]);
        setCurrentInjections(Array.isArray(loaded._injections) ? loaded._injections : []);
        nextPlaneNumberRef.current = objects.length + 1;
      })
      .catch(error => {
        if (!cancelled) setStatus({ ok: false, message: String(error) });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [effectId]);

  useEffect(() => {
    const bar = previewBarRef.current;
    if (!bar) return undefined;
    const updateWidth = () => setPreviewBarWidth(Math.max(1, bar.clientWidth));
    const observer = new ResizeObserver(updateWidth);
    observer.observe(bar);
    updateWidth();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const registrations = [
      { scroller: objectListScrollRef.current, setScrollbar: setObjectScrollbar },
      { scroller: rightTimelineScrollRef.current, setScrollbar: setTimelineScrollbar },
      { scroller: inspectorScrollRef.current, setScrollbar: setInspectorScrollbar },
    ].filter(registration => registration.scroller);
    const cleanups = registrations.map(({ scroller, setScrollbar }) => {
      const updateScrollbar = () => {
        const viewportHeight = scroller.clientHeight;
        const contentHeight = scroller.scrollHeight;
        const maxScroll = Math.max(0, contentHeight - viewportHeight);
        if (maxScroll <= 0) {
          setScrollbar({ visible: false, top: 0, height: viewportHeight });
          return;
        }
        const thumbHeight = Math.max(24, (viewportHeight / contentHeight) * viewportHeight);
        const thumbTravel = Math.max(0, viewportHeight - thumbHeight);
        setScrollbar({
          visible: true,
          top: (scroller.scrollTop / maxScroll) * thumbTravel,
          height: thumbHeight,
        });
      };
      const observer = new ResizeObserver(updateScrollbar);
      observer.observe(scroller);
      if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
      scroller.addEventListener('scroll', updateScrollbar);
      updateScrollbar();
      return () => {
        observer.disconnect();
        scroller.removeEventListener('scroll', updateScrollbar);
      };
    });
    return () => cleanups.forEach(cleanup => cleanup());
  }, [verticalScrollContentKey, bottomHeight, leftWidth, selectedObjectId]);

  useEffect(() => {
    const scroller = inspectorScrollRef.current;
    if (!scroller) return undefined;
    const updateScrollbar = () => {
      const viewportWidth = scroller.clientWidth;
      const contentWidth = scroller.scrollWidth;
      const maxScroll = Math.max(0, contentWidth - viewportWidth);
      if (maxScroll <= 0) {
        setInspectorHorizontalScrollbar({ visible: false, left: 0, width: viewportWidth });
        return;
      }
      const thumbWidth = Math.max(24, (viewportWidth / contentWidth) * viewportWidth);
      const thumbTravel = Math.max(0, viewportWidth - thumbWidth);
      setInspectorHorizontalScrollbar({
        visible: true,
        left: (scroller.scrollLeft / maxScroll) * thumbTravel,
        width: thumbWidth,
      });
    };
    const observer = new ResizeObserver(updateScrollbar);
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
    scroller.addEventListener('scroll', updateScrollbar);
    updateScrollbar();
    return () => {
      observer.disconnect();
      scroller.removeEventListener('scroll', updateScrollbar);
    };
  }, [selectedObjectId, rightWidth]);

  useEffect(() => {
    const scroller = durationScrollRef.current;
    if (!scroller) return undefined;
    const updateScrollbar = () => {
      const viewportWidth = scroller.clientWidth;
      const contentWidth = scroller.scrollWidth;
      const maxScroll = Math.max(0, contentWidth - viewportWidth);
      if (maxScroll <= 0) {
        setDurationScrollbar({ visible: false, left: 0, width: viewportWidth });
        return;
      }
      const thumbWidth = Math.max(24, (viewportWidth / contentWidth) * viewportWidth);
      const thumbTravel = Math.max(0, viewportWidth - thumbWidth);
      setDurationScrollbar({
        visible: true,
        left: (scroller.scrollLeft / maxScroll) * thumbTravel,
        width: thumbWidth,
      });
    };
    const observer = new ResizeObserver(updateScrollbar);
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
    scroller.addEventListener('scroll', updateScrollbar);
    updateScrollbar();
    return () => {
      observer.disconnect();
      scroller.removeEventListener('scroll', updateScrollbar);
    };
  }, []);

  useEffect(() => {
    if (!previewTickInputFocusedRef.current) setPreviewTickInput(String(previewTick));
  }, [previewTick]);

  useEffect(() => {
    if (!playing) return undefined;
    let animationFrame = 0;
    let previous = performance.now();
    let playbackTick = previewTickRef.current;
    const cycleLength = durationTicks + 1;
    const advancePlayback = now => {
      playbackTick = (playbackTick + ((now - previous) / 50)) % cycleLength;
      previous = now;
      setPreviewTick(timelineTime(Math.min(playbackTick, durationTicks)));
      animationFrame = window.requestAnimationFrame(advancePlayback);
    };
    animationFrame = window.requestAnimationFrame(advancePlayback);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [playing, durationTicks]);

  useEffect(() => {
    setSelectedKeyframes(current => current.filter(selection => {
      const object = timelineObjects.find(candidate => candidate.id === selection.objectId);
      return keyframesForField(object, selection.field)
        .some(keyframe => keyframe.id === selection.keyframeId);
    }));
  }, [timelineObjects]);

  useEffect(() => {
    const moveKeyframes = event => {
      const marquee = keyframeMarqueeRef.current;
      if (marquee) {
        const moved = Math.abs(event.clientX - marquee.startX) >= 3
          || Math.abs(event.clientY - marquee.startY) >= 3;
        if (!moved && !marquee.moved) return;
        if (!marquee.moved) {
          marquee.moved = true;
        }
        const left = Math.min(marquee.startX, event.clientX);
        const right = Math.max(marquee.startX, event.clientX);
        const top = Math.min(marquee.startY, event.clientY);
        const bottom = Math.max(marquee.startY, event.clientY);
        setKeyframeMarquee({ left, top, width: right - left, height: bottom - top });
        const next = new Map(
          (marquee.replaceSelection ? [] : marquee.baseSelection)
            .map(selection => [keyframeSelectionKey(selection), selection]),
        );
        rightTimelineScrollRef.current
          ?.querySelectorAll('.vfx-new-timeline-keyframe-marker')
          .forEach(marker => {
            const rect = marker.getBoundingClientRect();
            if (rect.right < left || rect.left > right || rect.bottom < top || rect.top > bottom) return;
            try {
              JSON.parse(marker.dataset.keyframeSelections || '[]').forEach(selection => {
                next.set(keyframeSelectionKey(selection), selection);
              });
            } catch {}
          });
        setSelectedKeyframes([...next.values()]);
        return;
      }

      const drag = keyframeDragRef.current;
      if (!drag) return;
      const rawDelta = ((event.clientX - drag.startX) / drag.trackWidth) * drag.timelineSpan;
      const direction = Math.sign(event.clientX - drag.lastPointerX)
        || Math.sign(rawDelta - drag.lastDelta);
      drag.lastPointerX = event.clientX;
      const nextDelta = availableDraggedKeyframeDelta({
        rawDelta,
        candidateDelta: Math.round(rawDelta),
        groups: drag.groups,
        minDelta: drag.minDelta,
        maxDelta: drag.maxDelta,
        direction,
        step: 1,
      });
      if (nextDelta === null || sameKeyframeTick(nextDelta, drag.lastDelta)) return;
      drag.lastDelta = nextDelta;
      setTimelineObjects(current => current.map(object => {
        const groups = drag.groups.filter(group => group.objectId === object.id);
        if (groups.length === 0) return object;
        const patch = {};
        groups.forEach(group => {
          const selectedStartTicks = new Map(
            group.selectedKeyframes.map(keyframe => [keyframe.id, keyframe.startTick]),
          );
          patch[`${group.field}Keyframes`] = group.keyframes.map(keyframe => (
            selectedStartTicks.has(keyframe.id)
              ? {
                  ...keyframe,
                  tick: String(Math.round(selectedStartTicks.get(keyframe.id) + nextDelta)),
                }
              : keyframe
          ));
        });
        return { ...object, ...patch };
      }));
      setPreviewTick(timelineTime(drag.anchorTick + nextDelta));
    };

    const stopKeyframeDrag = () => {
      if (!keyframeDragRef.current && !keyframeMarqueeRef.current) return;
      keyframeDragRef.current = null;
      keyframeMarqueeRef.current = null;
      setKeyframeMarquee(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', moveKeyframes);
    window.addEventListener('pointerup', stopKeyframeDrag);
    window.addEventListener('pointercancel', stopKeyframeDrag);
    return () => {
      window.removeEventListener('pointermove', moveKeyframes);
      window.removeEventListener('pointerup', stopKeyframeDrag);
      window.removeEventListener('pointercancel', stopKeyframeDrag);
      keyframeMarqueeRef.current = null;
      setKeyframeMarquee(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  useEffect(() => {
    const togglePlayback = event => {
      if (event.code !== 'Space' || event.repeat || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      setPlaying(current => !current);
    };
    window.addEventListener('keydown', togglePlayback);
    return () => window.removeEventListener('keydown', togglePlayback);
  }, []);

  useEffect(() => {
    const resizeSelectedObjectToPlayhead = event => {
      if ((event.code !== 'BracketLeft' && event.code !== 'BracketRight') || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      setPlaying(false);
      setTimelineObjects(current => current.map(object => {
        if (object.id !== selectedObjectId) return object;
        if (event.code === 'BracketLeft') {
          return { ...object, start: clamp(previewTick, 0, object.end - 1) };
        }
        return { ...object, end: clamp(previewTick, object.start + 1, durationTicks) };
      }));
    };
    window.addEventListener('keydown', resizeSelectedObjectToPlayhead);
    return () => window.removeEventListener('keydown', resizeSelectedObjectToPlayhead);
  }, [previewTick, durationTicks, selectedObjectId]);

  const updateDuration = event => {
    const nextDuration = clamp(Math.round(Number(event.target.value) || 1), 1, 12000);
    setDurationTicks(nextDuration);
    setPreviewTick(current => Math.min(current, nextDuration));
    setTimelineView({ start: 0, end: nextDuration });
  };

  const addPlane = () => {
    setTimelineObjects(current => {
      const id = makeObjectId(current);
      const planeNumber = nextPlaneNumberRef.current;
      nextPlaneNumberRef.current += 1;
      const plane = objectDefaults({
        id,
        name: `Plane ${planeNumber}`,
        start: 0,
        end: durationTicks,
      });
      setSelectedObjectId(id);
      return [...current, plane];
    });
  };

  const deleteObject = (objectId, event) => {
    event.stopPropagation();
    const objectIndex = timelineObjects.findIndex(object => object.id === objectId);
    if (objectIndex < 0) return;
    const remainingObjects = timelineObjects.filter(object => object.id !== objectId);
    setTimelineObjects(remainingObjects);
    if (selectedObjectId === objectId) {
      const nextSelection = remainingObjects[Math.min(objectIndex, remainingObjects.length - 1)];
      setSelectedObjectId(nextSelection?.id ?? null);
    }
  };

  const toggleObjectExpanded = objectId => {
    setTimelineObjects(current => current.map(object => (
      object.id === objectId ? { ...object, expanded: !object.expanded } : object
    )));
  };

  const updateObject = (objectId, patch) => {
    setTimelineObjects(current => current.map(object => (
      object.id === objectId ? { ...object, ...patch } : object
    )));
  };

  const updateObjectIdentity = (objectId, value) => {
    const nextName = String(value);
    const nextId = sanitizeId(nextName) || objectId;
    setTimelineObjects(current => current.map(object => (
      object.id === objectId ? { ...object, id: nextId, name: nextName } : object
    )));
    setSelectedObjectId(nextId);
    setSelectedKeyframes(current => current.map(selection => (
      selection.objectId === objectId ? { ...selection, objectId: nextId } : selection
    )));
  };

  const readSelectedKeyframeEasing = () => {
    const activeSelection = selectedKeyframes[selectedKeyframes.length - 1];
    if (!activeSelection) return null;
    const object = timelineObjects.find(candidate => candidate.id === activeSelection.objectId);
    const selectedIds = new Set(selectedKeyframes
      .filter(selection => (
        selection.objectId === activeSelection.objectId
        && selection.field === activeSelection.field
      ))
      .map(selection => selection.keyframeId));
    const ordered = keyframesForField(object, activeSelection.field)
      .filter(keyframe => selectedIds.has(keyframe.id))
      .sort((first, second) => number(first.tick) - number(second.tick));
    if (ordered.length === 0) return null;
    const activeIndex = ordered.findIndex(keyframe => keyframe.id === activeSelection.keyframeId);
    const sourceIndex = activeIndex > 0 ? activeIndex - 1 : 0;
    return normalizeEasing(ordered[sourceIndex].easing);
  };

  const applyEasingToSelectedKeyframes = easing => {
    if (selectedKeyframes.length === 0) return;
    const normalized = normalizeEasing(easing);
    setPlaying(false);
    setTimelineObjects(current => current.map(object => {
      const objectSelections = selectedKeyframes.filter(selection => selection.objectId === object.id);
      if (objectSelections.length === 0) return object;
      const patch = {};
      new Set(objectSelections.map(selection => selection.field)).forEach(field => {
        const selectedIds = new Set(objectSelections
          .filter(selection => selection.field === field)
          .map(selection => selection.keyframeId));
        const ordered = [...keyframesForField(object, field)]
          .sort((first, second) => number(first.tick) - number(second.tick));
        const easingOwnerIds = new Set();
        if (selectedIds.size <= 1) {
          selectedIds.forEach(id => easingOwnerIds.add(id));
        } else {
          for (let index = 0; index < ordered.length - 1; index += 1) {
            if (selectedIds.has(ordered[index].id) && selectedIds.has(ordered[index + 1].id)) {
              easingOwnerIds.add(ordered[index].id);
            }
          }
        }
        patch[`${field}Keyframes`] = keyframesForField(object, field).map(keyframe => (
          easingOwnerIds.has(keyframe.id)
            ? { ...keyframe, easing: { ...normalized } }
            : keyframe
        ));
      });
      return { ...object, ...patch };
    }));
  };

  const updateObjectVector = (objectId, field, axis, value) => {
    setPlaying(false);
    setTimelineObjects(current => current.map(object => {
      if (object.id !== objectId) return object;
      const keyframeFields = propertyKeyframeFields(object, field);
      const animated = keyframeFields.some(keyframeField => keyframesForField(object, keyframeField).length > 0);
      if (!animated) return { ...object, [field]: { ...object[field], [axis]: value } };
      const currentValue = propertyValueAtTick(object, field, previewTick);
      const nextValue = { ...currentValue, [axis]: value };
      if (keyframeFields.length === 1) {
        const keyframeField = `${keyframeFields[0]}Keyframes`;
        const keyframes = keyframesForField(object, keyframeFields[0]);
        const keyframeIndex = keyframes.findIndex(keyframe => sameKeyframeTick(keyframe.tick, previewTick));
        if (keyframeIndex < 0) {
          return {
            ...object,
            [keyframeField]: [...keyframes, {
              id: makeKeyframeId(keyframes, keyframeFields[0]),
              tick: String(previewTick),
              value: authoredKeyframeValue(nextValue),
              easing: linearEasing(),
            }].sort((first, second) => number(first.tick) - number(second.tick)),
          };
        }
        return {
          ...object,
          [keyframeField]: keyframes.map((keyframe, index) => (
            index === keyframeIndex
              ? { ...keyframe, value: authoredKeyframeValue(nextValue) }
              : keyframe
          )),
        };
      }
      const patch = {};
      keyframeFields.forEach((keyframeName, index) => {
        const keyframeField = `${keyframeName}Keyframes`;
        const keyframes = keyframesForField(object, keyframeName);
        const keyframeIndex = keyframes.findIndex(keyframe => sameKeyframeTick(keyframe.tick, previewTick));
        const axisName = ['x', 'y', 'z'][index];
        if (keyframeIndex < 0) {
          patch[keyframeField] = [...keyframes, {
            id: makeKeyframeId(keyframes, keyframeName),
            tick: String(previewTick),
            value: String(nextValue[axisName]),
            easing: linearEasing(),
          }].sort((first, second) => number(first.tick) - number(second.tick));
        } else {
          patch[keyframeField] = keyframes.map((keyframe, keyframeArrayIndex) => (
            keyframeArrayIndex === keyframeIndex
              ? { ...keyframe, value: String(nextValue[axisName]) }
              : keyframe
          ));
        }
      });
      return { ...object, ...patch };
    }));
  };

  const updateObjectScalar = (objectId, field, value) => {
    setPlaying(false);
    setTimelineObjects(current => current.map(object => {
      if (object.id !== objectId) return object;
      const keyframeField = `${field}Keyframes`;
      const keyframes = keyframesForField(object, field);
      if (keyframes.length === 0) return { ...object, [field]: value };
      const keyframeIndex = keyframes.findIndex(keyframe => sameKeyframeTick(keyframe.tick, previewTick));
      if (keyframeIndex < 0) {
        return {
          ...object,
          [keyframeField]: [...keyframes, {
            id: makeKeyframeId(keyframes, field),
            tick: String(previewTick),
            value: String(value),
            easing: linearEasing(),
          }].sort((first, second) => number(first.tick) - number(second.tick)),
        };
      }
      return {
        ...object,
        [keyframeField]: keyframes.map((keyframe, index) => (
          index === keyframeIndex ? { ...keyframe, value } : keyframe
        )),
      };
    }));
  };

  const togglePropertyKeyframe = (objectId, property) => {
    setPlaying(false);
    setTimelineObjects(current => current.map(object => {
      if (object.id !== objectId) return object;
      const fields = propertyKeyframeFields(object, property);
      const hasKeyframe = hasPropertyKeyframeAtTick(object, property, previewTick);
      const currentValue = propertyValueAtTick(object, property, previewTick);
      const patch = {};
      fields.forEach((field, index) => {
        const keyframeField = `${field}Keyframes`;
        const keyframes = keyframesForField(object, field);
        if (hasKeyframe) {
          patch[keyframeField] = keyframes.filter(keyframe => !sameKeyframeTick(keyframe.tick, previewTick));
          return;
        }
        if (keyframes.some(keyframe => sameKeyframeTick(keyframe.tick, previewTick))) return;
        const axis = fields.length === 1 ? null : ['x', 'y', 'z'][index];
        const keyframeValue = axis ? currentValue[axis] : currentValue;
        patch[keyframeField] = [...keyframes, {
          id: makeKeyframeId(keyframes, field),
          tick: String(previewTick),
          value: authoredKeyframeValue(keyframeValue),
          easing: linearEasing(),
        }].sort((first, second) => number(first.tick) - number(second.tick));
      });
      return { ...object, ...patch };
    }));
  };

  const startKeyframeMarquee = event => {
    if (event.button !== 0 || event.target.closest('button, .vfx-new-timeline-dummy')) return;
    event.preventDefault();
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    keyframeMarqueeRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseSelection: selectedKeyframes,
      replaceSelection: !additive,
      moved: false,
    };
    setKeyframeMarquee({ left: event.clientX, top: event.clientY, width: 0, height: 0 });
    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = 'none';
  };

  const startKeyframeDrag = (event, object, property, tick) => {
    if (event.button !== 0) return;
    const track = event.currentTarget.closest('.vfx-new-timeline-property-track');
    if (!track) return;
    event.preventDefault();
    event.stopPropagation();
    setPlaying(false);
    setSelectedObjectId(object.id);

    const markerSelections = keyframeSelectionsAtTick(object, property, tick);
    if (markerSelections.length === 0) return;
    const alreadySelected = markerSelections.every(selection => (
      containsKeyframeSelection(selectedKeyframes, selection)
    ));
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      if (!alreadySelected) {
        setSelectedKeyframes(current => {
          const next = new Map(current.map(selection => [keyframeSelectionKey(selection), selection]));
          markerSelections.forEach(selection => next.set(keyframeSelectionKey(selection), selection));
          return [...next.values()];
        });
      }
      return;
    }

    const dragSelections = alreadySelected ? selectedKeyframes : markerSelections;
    setSelectedKeyframes(dragSelections);
    const groupsByTrack = new Map();
    dragSelections.forEach(selection => {
      const selectedObject = timelineObjects.find(candidate => candidate.id === selection.objectId);
      if (!selectedObject) return;
      const keyframes = keyframesForField(selectedObject, selection.field);
      const selectedKeyframe = keyframes.find(keyframe => keyframe.id === selection.keyframeId);
      if (!selectedKeyframe) return;
      const groupKey = `${selection.objectId}\u0000${selection.field}`;
      if (!groupsByTrack.has(groupKey)) {
        groupsByTrack.set(groupKey, {
          objectId: selection.objectId,
          field: selection.field,
          keyframes,
          selectedKeyframes: [],
        });
      }
      groupsByTrack.get(groupKey).selectedKeyframes.push({
        id: selectedKeyframe.id,
        startTick: clamp(Math.round(number(selectedKeyframe.tick)), 0, durationTicks),
      });
    });
    const groups = [...groupsByTrack.values()];
    const movingKeyframes = groups.flatMap(group => group.selectedKeyframes);
    if (movingKeyframes.length === 0) return;
    const anchorTick = clamp(Math.round(number(tick)), 0, durationTicks);
    setPreviewTick(anchorTick);
    setPreviewTickInput(String(anchorTick));
    keyframeDragRef.current = {
      groups,
      startX: event.clientX,
      trackWidth: Math.max(1, track.getBoundingClientRect().width - (PREVIEW_EDGE_BUFFER * 2)),
      timelineSpan,
      anchorTick,
      minDelta: Math.max(...movingKeyframes.map(keyframe => -keyframe.startTick)),
      maxDelta: Math.min(...movingKeyframes.map(keyframe => durationTicks - keyframe.startTick)),
      lastDelta: 0,
      lastPointerX: event.clientX,
    };
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  const selectTexture = (objectId, textureId) => {
    const metadata = textures.find(texture => texture.value === textureId);
    updateObject(objectId, {
      texture: textureId,
      rows: String(Math.max(1, number(metadata?.rows, 1))),
      ticksPerFrame: String(Math.max(1, number(metadata?.ticksPerFrame, 2))),
    });
  };

  const handleSave = async () => {
    if (loading) return;
    const id = sanitizeId(effectEditorId || effectName);
    if (!id) {
      setStatus({ ok: false, message: 'ID is required.' });
      return;
    }
    if (timelineObjects.some(object => !object.texture)) {
      setStatus({ ok: false, message: 'Every plane needs a texture.' });
      return;
    }
    const objectIds = timelineObjects.map(object => sanitizeId(object.id) || 'plane');
    if (new Set(objectIds).size !== objectIds.length) {
      setStatus({ ok: false, message: 'Every plane needs a unique ID.' });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      await removeInjections(currentInjections);
      const duration = clamp(Math.floor(number(durationTicks, 100)), 1, 12000);
      const runtimeObjects = timelineObjects.map(object => runtimePlane(id, object));
      const injections = [];

      for (let index = 0; index < timelineObjects.length; index += 1) {
        const textureFile = `resources/assets/yebisurpg/textures/vfx/${id}/${runtimeObjects[index].id}.png`;
        await invoke('copy_texture_to_mod', {
          textureId: timelineObjects[index].texture,
          destFile: textureFile,
        });
        injections.push({ type: 'created-file', file: textureFile });
      }

      const runtimeFile = `resources/assets/yebisurpg/vfx/${id}.json`;
      await invoke('write_mod_file', {
        file: runtimeFile,
        content: JSON.stringify({ version: 4, durationTicks: duration, objects: runtimeObjects }, null, 2),
      });
      injections.push({ type: 'created-file', file: runtimeFile });

      const registryLine = `        VfxRegistry.register("${id}", ${duration});`;
      await invoke('inject_marker', {
        file: `${JAVA_BASE}/vfx/VfxRegistry.java`,
        marker: 'YCS_Vfx_Definitions',
        content: registryLine,
      });
      injections.push({
        type: 'java-marker',
        file: `${JAVA_BASE}/vfx/VfxRegistry.java`,
        marker: 'YCS_Vfx_Definitions',
        content: registryLine,
      });

      const payload = {
        version: 4,
        id,
        name: effectName || id,
        durationTicks: duration,
        objects: timelineObjects.map(authoredObject),
        _injections: injections,
      };
      await invoke('save_ycs_data', {
        category: 'vfx',
        id,
        content: JSON.stringify(payload, null, 2),
      });
      if (effectId && effectId !== id) {
        await invoke('delete_ycs_data', { category: 'vfx', id: effectId }).catch(() => {});
      }
      setCurrentInjections(injections);
      onBack();
    } catch (error) {
      setStatus({ ok: false, message: String(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!effectId || !window.confirm(`Delete VFX "${effectName || effectId}"?`)) return;
    setSaving(true);
    setStatus(null);
    try {
      await removeInjections(currentInjections);
      await invoke('delete_ycs_data', { category: 'vfx', id: effectId });
      onBack();
    } catch (error) {
      setStatus({ ok: false, message: String(error) });
      setSaving(false);
    }
  };

  useTitlebarActions({
    active: isActive,
    buttons: [
      {
        id: 'save',
        icon: 'save',
        title: saving ? 'Saving VFX' : 'Save VFX',
        disabled: saving || loading,
        onClick: handleSave,
      },
      { id: 'cancel', icon: 'cancel', title: 'Cancel', disabled: saving, onClick: onBack },
      {
        id: 'delete',
        icon: 'delete',
        title: 'Delete VFX',
        danger: true,
        disabled: saving || loading || !effectId,
        onClick: handleRemove,
      },
    ],
  });

  const beginObjectRename = (object, source, event) => {
    event.stopPropagation();
    setSelectedObjectId(object.id);
    setRenameValue(object.name);
    setRenamingObject({ id: object.id, source });
  };

  const commitObjectRename = () => {
    if (!renamingObject) return;
    const nextName = renameValue.trim();
    if (nextName) updateObjectIdentity(renamingObject.id, nextName);
    setRenamingObject(null);
  };

  const commitPreviewTick = rawValue => {
    const parsed = Number(rawValue);
    const nextTick = clamp(
      Math.round(Number.isFinite(parsed) ? parsed : previewTick),
      0,
      durationTicks,
    );
    setPlaying(false);
    setPreviewTick(nextTick);
    setPreviewTickInput(String(nextTick));
  };

  const startCurrentTimeDrag = event => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    currentTimeDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startTick: previewTick,
      dragging: false,
    };
  };

  const moveCurrentTimeDrag = event => {
    const drag = currentTimeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    if (!drag.dragging && Math.abs(deltaX) < 3) return;
    drag.dragging = true;
    event.preventDefault();
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    const nextTick = clamp(drag.startTick + Math.round(deltaX / 6), 0, durationTicks);
    setPlaying(false);
    setPreviewTick(nextTick);
    setPreviewTickInput(String(nextTick));
  };

  const stopCurrentTimeDrag = event => {
    const drag = currentTimeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    currentTimeDragRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const handleDurationWheel = event => {
    const scroller = durationScrollRef.current;
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    event.preventDefault();
    scroller.scrollLeft += event.deltaX || event.deltaY;
  };

  const startDurationThumbDrag = event => {
    const scroller = durationScrollRef.current;
    if (!scroller || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    durationThumbDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: scroller.scrollLeft,
    };
  };

  const moveDurationThumbDrag = event => {
    const drag = durationThumbDragRef.current;
    const scroller = durationScrollRef.current;
    if (!drag || !scroller || drag.pointerId !== event.pointerId) return;
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const thumbTravel = Math.max(1, scroller.clientWidth - durationScrollbar.width);
    scroller.scrollLeft = clamp(
      drag.startScrollLeft + (((event.clientX - drag.startX) / thumbTravel) * maxScroll),
      0,
      maxScroll,
    );
  };

  const stopDurationThumbDrag = event => {
    const drag = durationThumbDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    durationThumbDragRef.current = null;
  };

  const startInspectorHorizontalThumbDrag = event => {
    const scroller = inspectorScrollRef.current;
    if (!scroller || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    inspectorHorizontalThumbDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: scroller.scrollLeft,
    };
  };

  const moveInspectorHorizontalThumbDrag = event => {
    const drag = inspectorHorizontalThumbDragRef.current;
    const scroller = inspectorScrollRef.current;
    if (!drag || !scroller || drag.pointerId !== event.pointerId) return;
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const thumbTravel = Math.max(1, scroller.clientWidth - inspectorHorizontalScrollbar.width);
    scroller.scrollLeft = clamp(
      drag.startScrollLeft + (((event.clientX - drag.startX) / thumbTravel) * maxScroll),
      0,
      maxScroll,
    );
  };

  const stopInspectorHorizontalThumbDrag = event => {
    const drag = inspectorHorizontalThumbDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    inspectorHorizontalThumbDragRef.current = null;
  };

  const startVerticalThumbDrag = (source, event) => {
    const scroller = source === 'objects'
      ? objectListScrollRef.current
      : source === 'inspector'
        ? inspectorScrollRef.current
        : rightTimelineScrollRef.current;
    if (!scroller || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    verticalThumbDragRef.current = {
      pointerId: event.pointerId,
      source,
      startY: event.clientY,
      startScrollTop: scroller.scrollTop,
    };
  };

  const moveVerticalThumbDrag = event => {
    const drag = verticalThumbDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const scroller = drag.source === 'objects'
      ? objectListScrollRef.current
      : drag.source === 'inspector'
        ? inspectorScrollRef.current
        : rightTimelineScrollRef.current;
    const scrollbar = drag.source === 'objects'
      ? objectScrollbar
      : drag.source === 'inspector'
        ? inspectorScrollbar
        : timelineScrollbar;
    if (!scroller) return;
    const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const thumbTravel = Math.max(1, scroller.clientHeight - scrollbar.height);
    scroller.scrollTop = clamp(
      drag.startScrollTop + (((event.clientY - drag.startY) / thumbTravel) * maxScroll),
      0,
      maxScroll,
    );
  };

  const stopVerticalThumbDrag = event => {
    const drag = verticalThumbDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    verticalThumbDragRef.current = null;
  };

  const handleTimelineWheel = event => {
    if (!event.ctrlKey && !event.shiftKey) return;
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const usableWidth = Math.max(1, rect.width - (PREVIEW_EDGE_BUFFER * 2));
    if (event.ctrlKey) {
      const cursorRatio = clamp(
        (event.clientX - rect.left - PREVIEW_EDGE_BUFFER) / usableWidth,
        0,
        1,
      );
      setTimelineView(current => {
        const currentSpan = current.end - current.start;
        const minimumSpan = Math.min(durationTicks, 1);
        const nextSpan = clamp(
          Math.round(currentSpan * Math.exp(event.deltaY * 0.002)),
          minimumSpan,
          durationTicks,
        );
        const cursorTime = current.start + (currentSpan * cursorRatio);
        const nextStart = clamp(
          Math.round(cursorTime - (nextSpan * cursorRatio)),
          0,
          durationTicks - nextSpan,
        );
        return { start: nextStart, end: nextStart + nextSpan };
      });
      return;
    }

    setTimelineView(current => {
      const currentSpan = current.end - current.start;
      const panDelta = (event.deltaX || event.deltaY) * (currentSpan / usableWidth);
      const nextStart = clamp(Math.round(current.start + panDelta), 0, durationTicks - currentSpan);
      return { start: nextStart, end: nextStart + currentSpan };
    });
  };

  const scrubTimelineAt = (clientX, element) => {
    const rect = element.getBoundingClientRect();
    const usableWidth = Math.max(1, rect.width - (PREVIEW_EDGE_BUFFER * 2));
    const position = clamp(
      (clientX - rect.left - PREVIEW_EDGE_BUFFER) / usableWidth,
      0,
      1,
    );
    const nextTick = timelineView.start + (timelineSpan * position);
    setPlaying(false);
    setPreviewTick(clamp(Math.round(nextTick), 0, durationTicks));
  };

  const startTimelineObjectDrag = (objectId, mode, event) => {
    const object = timelineObjects.find(candidate => candidate.id === objectId);
    if (!object) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    timelineDragRef.current = {
      pointerId: event.pointerId,
      objectId,
      mode,
      startX: event.clientX,
      range: { start: object.start, end: object.end },
      moved: false,
    };
    setSelectedObjectId(objectId);
    setPlaying(false);
  };

  const moveTimelineObjectDrag = event => {
    const drag = timelineDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (Math.abs(event.clientX - drag.startX) >= 3) drag.moved = true;
    const usableWidth = Math.max(1, previewBarWidth - (PREVIEW_EDGE_BUFFER * 2));
    const deltaTicks = ((event.clientX - drag.startX) / usableWidth) * timelineSpan;
    const snapDistanceTicks = (TIMELINE_SNAP_DISTANCE / usableWidth) * timelineSpan;
    const snap = value => Math.round(value);
    const nearPlayhead = value => event.shiftKey && Math.abs(value - previewTick) <= snapDistanceTicks;
    let nextRange;

    if (drag.mode === 'move') {
      const length = drag.range.end - drag.range.start;
      const candidateStart = drag.range.start + deltaTicks;
      const candidateEnd = candidateStart + length;
      let snappedStart = candidateStart;
      if (nearPlayhead(candidateStart)) {
        snappedStart = previewTick;
      } else if (nearPlayhead(candidateEnd)) {
        snappedStart = previewTick - length;
      }
      const start = clamp(snap(snappedStart), 0, durationTicks - length);
      nextRange = { start, end: snap(start + length) };
    } else if (drag.mode === 'start') {
      const candidateStart = drag.range.start + deltaTicks;
      const start = clamp(
        snap(nearPlayhead(candidateStart) ? previewTick : candidateStart),
        0,
        drag.range.end - 1,
      );
      nextRange = { start, end: drag.range.end };
    } else {
      const candidateEnd = drag.range.end + deltaTicks;
      const end = clamp(
        snap(nearPlayhead(candidateEnd) ? previewTick : candidateEnd),
        drag.range.start + 1,
        durationTicks,
      );
      nextRange = { start: drag.range.start, end };
    }
    setTimelineObjects(current => current.map(object => (
      object.id === drag.objectId ? { ...object, ...nextRange } : object
    )));
  };

  const stopTimelineObjectDrag = event => {
    const drag = timelineDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!drag.moved) setSelectedObjectId(drag.objectId);
    timelineDragRef.current = null;
  };

  const syncTimelineScroll = (source, event) => {
    const other = source === 'left' ? rightTimelineScrollRef.current : leftTimelineScrollRef.current;
    if (other && Math.abs(other.scrollTop - event.currentTarget.scrollTop) > 0.5) {
      other.scrollTop = event.currentTarget.scrollTop;
    }
  };

  const startResize = useCallback((pane, event) => {
    event.preventDefault();
    resizingRef.current = pane;
    document.body.style.cursor = ['bottom', 'curve'].includes(pane) ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMove = event => {
      const pane = resizingRef.current;
      const workspace = workspaceRef.current;
      if (!pane || !workspace) return;

      const rect = workspace.getBoundingClientRect();
      if (pane === 'left') {
        const max = Math.max(
          MIN_LEFT_WIDTH,
          rect.width - paneSizesRef.current.rightWidth - MIN_VIEWPORT_WIDTH - (RESIZER_SIZE * 2),
        );
        setLeftWidth(clamp(event.clientX - rect.left, MIN_LEFT_WIDTH, max));
      } else if (pane === 'right') {
        const max = Math.max(
          MIN_RIGHT_WIDTH,
          rect.width - paneSizesRef.current.leftWidth - MIN_VIEWPORT_WIDTH - (RESIZER_SIZE * 2),
        );
        setRightWidth(clamp(rect.right - event.clientX, MIN_RIGHT_WIDTH, max));
      } else if (pane === 'bottom') {
        const max = Math.max(MIN_BOTTOM_HEIGHT, rect.height - MIN_MAIN_HEIGHT - RESIZER_SIZE);
        setBottomHeight(clamp(rect.bottom - event.clientY, MIN_BOTTOM_HEIGHT, max));
      } else if (pane === 'bottom-left') {
        const max = Math.max(
          MIN_BOTTOM_LEFT_WIDTH,
          rect.width - MIN_BOTTOM_CONTENT_WIDTH - RESIZER_SIZE,
        );
        setBottomLeftWidth(clamp(event.clientX - rect.left, MIN_BOTTOM_LEFT_WIDTH, max));
      } else if (pane === 'curve') {
        const rightRect = rightPanelRef.current?.getBoundingClientRect();
        if (!rightRect) return;
        const max = Math.max(
          MIN_CURVE_HEIGHT,
          rightRect.height - 36 - MIN_INSPECTOR_HEIGHT - RESIZER_SIZE,
        );
        setCurveHeight(clamp(rightRect.bottom - event.clientY, MIN_CURVE_HEIGHT, max));
      }
    };

    const onUp = () => {
      const pane = resizingRef.current;
      if (!pane) return;
      const sizes = paneSizesRef.current;
      if (pane === 'left') localStorage.setItem(LEFT_WIDTH_KEY, String(sizes.leftWidth));
      if (pane === 'right') localStorage.setItem(RIGHT_WIDTH_KEY, String(sizes.rightWidth));
      if (pane === 'bottom') localStorage.setItem(BOTTOM_HEIGHT_KEY, String(sizes.bottomHeight));
      if (pane === 'bottom-left') localStorage.setItem(BOTTOM_LEFT_WIDTH_KEY, String(sizes.bottomLeftWidth));
      if (pane === 'curve') localStorage.setItem(CURVE_HEIGHT_KEY, String(sizes.curveHeight));
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

  return (
    <main className="vfx-new-landing">
      {status && (
        <div className={`vfx-new-status ${status.ok ? 'status-ok' : 'status-error'}`} role="status">
          {status.message}
        </div>
      )}
      <div ref={workspaceRef} className="vfx-new-workspace">
        <div className="vfx-new-main-row">
        <aside className="vfx-new-panel vfx-new-panel-left" style={{ width: leftWidth }}>
          <div className="vfx-new-inspector-header vfx-new-effect-settings-header">Effect Settings</div>
          <div className="vfx-new-duration-scroll-shell">
            <div ref={durationScrollRef} className="vfx-new-duration-scroll" onWheel={handleDurationWheel}>
              <FieldRow label="ID">
                <StringField value={effectEditorId} onChange={value => setEffectEditorId(sanitizeId(value))} />
              </FieldRow>
              <FieldRow label="Name">
                <StringField value={effectName} onChange={setEffectName} />
              </FieldRow>
              <label className="ycs-field-row vfx-new-duration-field">
                <span className="ycs-field-label">Duration</span>
                <span className="ycs-field-control">
                  <input
                    className="ycs-string-input"
                    type="number"
                    min="1"
                    max="12000"
                    step="1"
                    value={durationTicks}
                    onChange={updateDuration}
                    title="Effect duration in ticks"
                  />
                </span>
              </label>
            </div>
            {durationScrollbar.visible && (
              <div className="vfx-new-duration-scrollbar" aria-hidden="true">
                <span
                  className="vfx-new-duration-scrollbar-thumb"
                  style={{ left: durationScrollbar.left, width: durationScrollbar.width }}
                  onPointerDown={startDurationThumbDrag}
                  onPointerMove={moveDurationThumbDrag}
                  onPointerUp={stopDurationThumbDrag}
                  onPointerCancel={stopDurationThumbDrag}
                />
              </div>
            )}
          </div>
          <div className="vfx-new-objects-header">
            <span>Objects</span>
            <button className="ycs-button icon" type="button" onClick={addPlane} title="Add Plane" aria-label="Add Plane">+</button>
          </div>
          <div className="vfx-new-object-list-shell">
            <div ref={objectListScrollRef} className="vfx-new-object-list">
              {visibleTimelineObjects.map(object => (
                <div
                  key={object.id}
                  className={`vfx-new-object-row ${selectedObjectId === object.id ? 'selected' : ''}`}
                  role="button"
                  tabIndex="0"
                  onClick={() => {
                    setSelectedObjectId(object.id);
                    setSelectedKeyframes([]);
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedObjectId(object.id);
                      setSelectedKeyframes([]);
                    }
                  }}
                >
                  <span className="vfx-new-object-icon" />
                  {renamingObject?.id === object.id && renamingObject.source === 'objects' ? (
                    <input
                      autoFocus
                      className="vfx-new-inline-name-input"
                      value={renameValue}
                      onClick={event => event.stopPropagation()}
                      onChange={event => setRenameValue(event.target.value)}
                      onBlur={commitObjectRename}
                      onKeyDown={event => {
                        event.stopPropagation();
                        if (event.key === 'Enter') event.currentTarget.blur();
                        if (event.key === 'Escape') {
                          setRenamingObject(null);
                          setRenameValue(object.name);
                        }
                      }}
                    />
                  ) : (
                    <span
                      className="vfx-new-object-name"
                      onDoubleClick={event => beginObjectRename(object, 'objects', event)}
                    >
                      {object.name}
                    </span>
                  )}
                  <button
                    type="button"
                    className="vfx-new-object-delete"
                    onClick={event => deleteObject(object.id, event)}
                    title={`Delete ${object.name}`}
                    aria-label={`Delete ${object.name}`}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                      <circle cx="9" cy="9" r="9" fill="white" />
                      <line x1="5" y1="9" x2="13" y2="9" stroke="black" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            {objectScrollbar.visible && (
              <div className="vfx-new-overlay-scrollbar vertical objects" aria-hidden="true">
                <span
                  className="vfx-new-overlay-scrollbar-thumb"
                  style={{ top: objectScrollbar.top, height: objectScrollbar.height }}
                  onPointerDown={event => startVerticalThumbDrag('objects', event)}
                  onPointerMove={moveVerticalThumbDrag}
                  onPointerUp={stopVerticalThumbDrag}
                  onPointerCancel={stopVerticalThumbDrag}
                />
              </div>
            )}
          </div>
        </aside>

        <div
          className="vfx-new-resizer vfx-new-resizer-vertical"
          role="separator"
          aria-label="Resize left panel"
          aria-orientation="vertical"
          onMouseDown={event => startResize('left', event)}
        />

        <ThreeDViewport
          className="vfx-new-viewport"
          ariaLabel="VFX creator 3D viewport with grid and front indicator"
          objects={timelineObjects}
          selectedId={selectedObjectId}
          textureUrls={textureUrls}
          previewTick={previewTick}
        />

        <div
          className="vfx-new-resizer vfx-new-resizer-vertical"
          role="separator"
          aria-label="Resize right panel"
          aria-orientation="vertical"
          onMouseDown={event => startResize('right', event)}
        />

        <aside ref={rightPanelRef} className="vfx-new-panel vfx-new-panel-right" style={{ width: rightWidth }}>
          <section className="vfx-new-inspector-pane" aria-label="Inspector">
          <div className="vfx-new-inspector-header">Inspector</div>
          <div className="vfx-new-inspector-shell">
            <div ref={inspectorScrollRef} className="vfx-new-inspector-fields">
              <div className="vfx-new-inspector-fields-inner">
                {selectedObject ? (
                  <>
                    <FieldRow label="Name / Object ID">
                      <StringField
                        value={selectedObject.name}
                        onChange={value => updateObjectIdentity(selectedObject.id, value)}
                      />
                    </FieldRow>
                    <FieldRow label="Texture">
                      <StandardDropdownField
                        value={selectedObject.texture}
                        onChange={texture => selectTexture(selectedObject.id, texture)}
                        options={textures}
                        searchable
                      />
                    </FieldRow>
                    <FieldRow label="Pivot">
                      <VectorFields
                        value={selectedObject.pivot}
                        onChange={(axis, value) => updateObject(selectedObject.id, {
                          pivot: { ...selectedObject.pivot, [axis]: value },
                        })}
                      />
                    </FieldRow>
                    <FieldRow label="Scale">
                      <VectorFields
                        value={inspectorPropertyValue(selectedObject, 'scale', previewTick)}
                        onChange={(axis, value) => updateObjectVector(selectedObject.id, 'scale', axis, value)}
                      />
                    </FieldRow>
                    <FieldRow label="Plane Rotation">
                      <VectorFields
                        value={selectedObject.baseRotation}
                        onChange={(axis, value) => updateObject(selectedObject.id, {
                          baseRotation: { ...selectedObject.baseRotation, [axis]: value },
                        })}
                        dragStep={1}
                      />
                    </FieldRow>
                    <FieldRow label="Position">
                      <VectorFields
                        value={inspectorPropertyValue(selectedObject, 'position', previewTick)}
                        onChange={(axis, value) => updateObjectVector(selectedObject.id, 'position', axis, value)}
                      />
                    </FieldRow>
                    <FieldRow label="Rotation">
                      <VectorFields
                        value={inspectorPropertyValue(selectedObject, 'rotation', previewTick)}
                        onChange={(axis, value) => updateObjectVector(selectedObject.id, 'rotation', axis, value)}
                        dragStep={1}
                      />
                    </FieldRow>
                    <FieldRow label="Base Size">
                      <div className="vfx-new-pair-fields">
                        <DraggableNumberInput
                          value={selectedObject.width}
                          onChange={width => updateObject(selectedObject.id, { width })}
                          dragStep={0.1}
                        />
                        <DraggableNumberInput
                          value={selectedObject.height}
                          onChange={height => updateObject(selectedObject.id, { height })}
                          dragStep={0.1}
                        />
                      </div>
                    </FieldRow>
                    <FieldRow label="Opacity">
                      <DraggableNumberInput
                        value={inspectorPropertyValue(selectedObject, 'opacity', previewTick)}
                        onChange={opacity => updateObjectScalar(selectedObject.id, 'opacity', opacity)}
                        dragStep={0.01}
                      />
                    </FieldRow>
                    <FieldRow label="Billboard">
                      <InspectorCheckbox
                        checked={selectedObject.billboard}
                        onChange={billboard => updateObject(selectedObject.id, { billboard })}
                        label="Billboard"
                      />
                    </FieldRow>
                    <FieldRow label="Full Bright">
                      <InspectorCheckbox
                        checked={selectedObject.fullBright}
                        onChange={fullBright => updateObject(selectedObject.id, { fullBright })}
                        label="Full Bright"
                      />
                    </FieldRow>
                    <FieldRow label="Active">
                      <div className="vfx-new-pair-fields">
                        <DraggableNumberInput
                          value={selectedObject.start}
                          onChange={start => updateObject(selectedObject.id, {
                            start: clamp(Math.floor(number(start)), MIN_TIMELINE_TICK, number(selectedObject.end) - 1),
                          })}
                          dragStep={1}
                        />
                        <DraggableNumberInput
                          value={selectedObject.end}
                          onChange={end => updateObject(selectedObject.id, {
                            end: clamp(Math.floor(number(end)), number(selectedObject.start) + 1, MAX_TIMELINE_TICK),
                          })}
                          dragStep={1}
                        />
                      </div>
                    </FieldRow>
                  </>
                ) : (
                  <div className="vfx-new-inspector-empty">Select an object.</div>
                )}
              </div>
            </div>
            {inspectorScrollbar.visible && (
              <div className="vfx-new-overlay-scrollbar vertical inspector" aria-hidden="true">
                <span
                  className="vfx-new-overlay-scrollbar-thumb"
                  style={{ top: inspectorScrollbar.top, height: inspectorScrollbar.height }}
                  onPointerDown={event => startVerticalThumbDrag('inspector', event)}
                  onPointerMove={moveVerticalThumbDrag}
                  onPointerUp={stopVerticalThumbDrag}
                  onPointerCancel={stopVerticalThumbDrag}
                />
              </div>
            )}
            {inspectorHorizontalScrollbar.visible && (
              <div className="vfx-new-overlay-scrollbar horizontal inspector" aria-hidden="true">
                <span
                  className="vfx-new-overlay-scrollbar-thumb horizontal"
                  style={{ left: inspectorHorizontalScrollbar.left, width: inspectorHorizontalScrollbar.width }}
                  onPointerDown={startInspectorHorizontalThumbDrag}
                  onPointerMove={moveInspectorHorizontalThumbDrag}
                  onPointerUp={stopInspectorHorizontalThumbDrag}
                  onPointerCancel={stopInspectorHorizontalThumbDrag}
                />
              </div>
            )}
          </div>
          </section>
          <div
            className="vfx-new-resizer vfx-new-resizer-horizontal vfx-new-curve-resizer"
            role="separator"
            aria-label="Resize graph editor"
            aria-orientation="horizontal"
            onMouseDown={event => startResize('curve', event)}
          />
          <CubicCurveEditor
            height={curveHeight}
            selectedCount={selectedKeyframes.length}
            onApply={applyEasingToSelectedKeyframes}
            onRead={readSelectedKeyframeEasing}
          />
        </aside>
        </div>

        <div
          className="vfx-new-resizer vfx-new-resizer-horizontal"
          role="separator"
          aria-label="Resize bottom panel"
          aria-orientation="horizontal"
          onMouseDown={event => startResize('bottom', event)}
        />

        <div className="vfx-new-panel vfx-new-panel-bottom" style={{ height: bottomHeight }}>
        <div className="vfx-new-bottom-header vfx-new-time-bar">
          <input
            className="ycs-string-input vfx-new-current-time-input"
            type="number"
            min="0"
            max={durationTicks}
            step="1"
            value={previewTickInput}
            aria-label="Current preview time"
            title="Type a tick or drag horizontally to scrub"
            onPointerDown={startCurrentTimeDrag}
            onPointerMove={moveCurrentTimeDrag}
            onPointerUp={stopCurrentTimeDrag}
            onPointerCancel={stopCurrentTimeDrag}
            onFocus={() => { previewTickInputFocusedRef.current = true; }}
            onChange={event => setPreviewTickInput(event.target.value)}
            onBlur={event => {
              previewTickInputFocusedRef.current = false;
              commitPreviewTick(event.target.value);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.blur();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                const currentTick = String(previewTick);
                setPreviewTickInput(currentTick);
                event.currentTarget.value = currentTick;
                event.currentTarget.blur();
              }
            }}
          />
          <span>/ {durationTicks}</span>
          <button
            type="button"
            className="ycs-button icon vfx-new-playback-button"
            onClick={() => setPlaying(current => !current)}
            title={playing ? 'Pause' : 'Play'}
            aria-label={playing ? 'Pause' : 'Play'}
            aria-pressed={playing}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 5v14M17 5v14" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5l11 7-11 7V5Z" />
              </svg>
            )}
          </button>
        </div>
        <div className="vfx-new-bottom-body">
          <div className="vfx-new-bottom-left" style={{ width: bottomLeftWidth }}>
            <div className="vfx-new-bottom-left-ruler-spacer" />
            <div
              ref={leftTimelineScrollRef}
              className="vfx-new-timeline-left-scroll"
              onScroll={event => syncTimelineScroll('left', event)}
            >
              {timelineObjectLayout.map(object => (
                <div key={object.id} className="vfx-new-timeline-layer-group">
                  <div
                    className={`vfx-new-timeline-layer ${selectedObjectId === object.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedObjectId(object.id);
                      setSelectedKeyframes([]);
                    }}
                  >
                    <div className="vfx-new-timeline-layer-row">
                      <button
                        type="button"
                        className={`vfx-new-timeline-disclosure ${object.expanded ? 'expanded' : ''}`}
                        onClick={event => {
                          event.stopPropagation();
                          toggleObjectExpanded(object.id);
                        }}
                        title={object.expanded ? `Collapse ${object.name}` : `Expand ${object.name}`}
                        aria-label={object.expanded ? `Collapse ${object.name}` : `Expand ${object.name}`}
                        aria-expanded={object.expanded}
                      >
                        <span />
                      </button>
                      {renamingObject?.id === object.id && renamingObject.source === 'timeline' ? (
                        <input
                          autoFocus
                          className="vfx-new-inline-name-input timeline"
                          value={renameValue}
                          onClick={event => event.stopPropagation()}
                          onChange={event => setRenameValue(event.target.value)}
                          onBlur={commitObjectRename}
                          onKeyDown={event => {
                            event.stopPropagation();
                            if (event.key === 'Enter') event.currentTarget.blur();
                            if (event.key === 'Escape') {
                              setRenamingObject(null);
                              setRenameValue(object.name);
                            }
                          }}
                        />
                      ) : (
                        <span onDoubleClick={event => beginObjectRename(object, 'timeline', event)}>{object.name}</span>
                      )}
                    </div>
                  </div>
                  {object.expanded && TIMELINE_PROPERTIES.map(property => (
                    <div
                      key={property}
                      className="vfx-new-timeline-property-row"
                    >
                      <span>{property}</span>
                      <button
                        type="button"
                        className={`vfx-new-property-keyframe-diamond ${hasPropertyKeyframeAtTick(object, property.toLowerCase(), previewTick) ? 'keyed' : ''}`}
                        onClick={event => {
                          event.stopPropagation();
                          togglePropertyKeyframe(object.id, property.toLowerCase());
                        }}
                        title={`${hasPropertyKeyframeAtTick(object, property.toLowerCase(), previewTick) ? 'Remove' : 'Add'} ${property} keyframe at tick ${previewTick}`}
                        aria-label={`${hasPropertyKeyframeAtTick(object, property.toLowerCase(), previewTick) ? 'Remove' : 'Add'} ${property} keyframe at tick ${previewTick}`}
                        aria-pressed={hasPropertyKeyframeAtTick(object, property.toLowerCase(), previewTick)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div
            className="vfx-new-resizer vfx-new-resizer-vertical"
            role="separator"
            aria-label="Resize bottom left section"
            aria-orientation="vertical"
            onMouseDown={event => startResize('bottom-left', event)}
          />
          <div className="vfx-new-bottom-content">
            <div ref={previewBarRef} className="vfx-new-bottom-header vfx-new-preview-bar" onWheel={handleTimelineWheel}>
              <div className="vfx-new-preview-ruler" aria-hidden="true">
                {previewRulerTicks.map(tick => {
                  const percentage = ((tick - timelineView.start) / timelineSpan) * 100;
                  const edgeKind = percentage <= 0.0001
                    ? 'start'
                    : percentage >= 99.9999
                      ? 'end'
                      : '';
                  return (
                    <span
                      key={tick}
                      className={`vfx-new-preview-ruler-tick whole ${edgeKind}`}
                      style={{ left: bufferedPreviewPosition(percentage) }}
                    >
                      <span className="vfx-new-preview-ruler-label">{formatRulerTime(tick)}</span>
                      <span className="vfx-new-preview-ruler-mark" />
                    </span>
                  );
                })}
              </div>
              <div
                className="vfx-new-preview-scrubber"
                role="slider"
                tabIndex="0"
                aria-valuemin={timelineView.start}
                aria-valuemax={timelineView.end}
                aria-valuenow={previewTick}
                aria-label="Preview position"
                title="Drag to scrub; Ctrl+wheel zooms at the cursor; Shift+wheel pans horizontally"
                onPointerDown={event => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  scrubTimelineAt(event.clientX, event.currentTarget);
                }}
                onPointerMove={event => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    scrubTimelineAt(event.clientX, event.currentTarget);
                  }
                }}
                onPointerUp={event => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                onPointerCancel={event => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                onKeyDown={event => {
                  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                  event.preventDefault();
                  const direction = event.key === 'ArrowLeft' ? -1 : 1;
                  setPreviewTick(current => clamp(
                    current + direction,
                    0,
                    durationTicks,
                  ));
                }}
              />
            </div>
            <div
              ref={rightTimelineScrollRef}
              className="vfx-new-bottom-section-content"
              onScroll={event => syncTimelineScroll('right', event)}
              onPointerDown={startKeyframeMarquee}
            >
              <div className="vfx-new-timeline-track-rows" style={{ height: Math.max(TIMELINE_ROW_HEIGHT, timelineContentHeight) }}>
                {timelineObjectLayout.map(object => (
                  <div key={object.id}>
                    {object.expanded && TIMELINE_PROPERTIES.map((property, index) => (
                      <div
                        key={property}
                        className="vfx-new-timeline-property-track"
                        style={{ top: object.top + ((index + 1) * TIMELINE_ROW_HEIGHT) }}
                        aria-label={`${object.name} ${property} track`}
                      >
                        {propertyKeyframeTicks(object, property.toLowerCase())
                          .filter(tick => tick >= timelineView.start && tick <= timelineView.end)
                          .map(tick => {
                            const propertyName = property.toLowerCase();
                            const markerSelections = keyframeSelectionsAtTick(object, propertyName, tick);
                            const selected = markerSelections.length > 0 && markerSelections.every(selection => (
                              containsKeyframeSelection(selectedKeyframes, selection)
                            ));
                            const markerKey = markerSelections
                              .map(keyframeSelectionKey)
                              .sort()
                              .join('|');
                            return (
                              <button
                                type="button"
                                key={markerKey || tick}
                                className={`vfx-new-timeline-keyframe-marker ${selected ? 'selected' : ''}`}
                                style={{
                                  left: bufferedPreviewPosition(((tick - timelineView.start) / timelineSpan) * 100),
                                }}
                                onPointerDown={event => startKeyframeDrag(event, object, propertyName, tick)}
                                data-keyframe-selections={JSON.stringify(markerSelections)}
                                title={`${property} keyframe at tick ${tick}`}
                                aria-label={`${property} keyframe at tick ${tick}`}
                                aria-pressed={selected}
                              />
                            );
                          })}
                      </div>
                    ))}
                    <div
                      className={`ycs-tab vfx-new-timeline-dummy ${selectedObjectId === object.id ? 'selected' : ''}`}
                      style={{ top: object.top, left: object.left, width: Math.max(1, object.right - object.left) }}
                      role="slider"
                      aria-label={`${object.name} timeline range`}
                      aria-valuemin="0"
                      aria-valuemax={durationTicks}
                      aria-valuetext={`${object.start} to ${object.end}`}
                      onPointerDown={event => startTimelineObjectDrag(object.id, 'move', event)}
                      onPointerMove={moveTimelineObjectDrag}
                      onPointerUp={stopTimelineObjectDrag}
                      onPointerCancel={stopTimelineObjectDrag}
                    >
                      <span
                        className="vfx-new-timeline-dummy-handle start"
                        onPointerDown={event => startTimelineObjectDrag(object.id, 'start', event)}
                        onPointerMove={moveTimelineObjectDrag}
                        onPointerUp={stopTimelineObjectDrag}
                        onPointerCancel={stopTimelineObjectDrag}
                      />
                      <span className="vfx-new-timeline-dummy-label">{object.name}</span>
                      <span
                        className="vfx-new-timeline-dummy-handle end"
                        onPointerDown={event => startTimelineObjectDrag(object.id, 'end', event)}
                        onPointerMove={moveTimelineObjectDrag}
                        onPointerUp={stopTimelineObjectDrag}
                        onPointerCancel={stopTimelineObjectDrag}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {timelineScrollbar.visible && (
              <div className="vfx-new-overlay-scrollbar vertical timeline" aria-hidden="true">
                <span
                  className="vfx-new-overlay-scrollbar-thumb"
                  style={{ top: timelineScrollbar.top, height: timelineScrollbar.height }}
                  onPointerDown={event => startVerticalThumbDrag('timeline', event)}
                  onPointerMove={moveVerticalThumbDrag}
                  onPointerUp={stopVerticalThumbDrag}
                  onPointerCancel={stopVerticalThumbDrag}
                />
              </div>
            )}
            {previewVisible && (
              <div
                className="vfx-new-preview-playhead"
                style={{ left: bufferedPreviewPosition(previewPosition) }}
                aria-hidden="true"
              >
                <span className="vfx-new-preview-pointer" />
                <span className="vfx-new-preview-line" />
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
      {keyframeMarquee && (
        <div className="vfx-new-keyframe-selection-marquee" style={keyframeMarquee} aria-hidden="true" />
      )}
    </main>
  );
}

export default VfxNewLanding;
