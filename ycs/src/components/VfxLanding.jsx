import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ColorField, FieldRow, NumberInput, StandardDropdownField, StringField } from './Field/Field';
import { useTitlebarActions } from './Titlebar/TitlebarActionsContext';
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
const MIN_TIMELINE_TICK = -12000;
const MAX_TIMELINE_TICK = 24000;
const KEYFRAME_TIME_PRECISION = 1000;
const KEYFRAME_TIME_EPSILON = 0.5 / KEYFRAME_TIME_PRECISION;

const DEFAULT_EFFECT = {
  id: '',
  name: '',
  durationTicks: '40',
  objects: [],
};

const LINEAR_EASING = { x1: 1 / 3, y1: 1 / 3, x2: 2 / 3, y2: 2 / 3 };
const EASING_FAMILIES = [
  {
    label: 'Ease',
    in: { x1: 0.42, y1: 0, x2: 1, y2: 1 },
    out: { x1: 0, y1: 0, x2: 0.58, y2: 1 },
    inOut: { x1: 0.42, y1: 0, x2: 0.58, y2: 1 },
  },
  {
    label: 'Sine',
    in: { x1: 0.12, y1: 0, x2: 0.39, y2: 0 },
    out: { x1: 0.61, y1: 1, x2: 0.88, y2: 1 },
    inOut: { x1: 0.37, y1: 0, x2: 0.63, y2: 1 },
  },
  {
    label: 'Quad',
    in: { x1: 0.11, y1: 0, x2: 0.5, y2: 0 },
    out: { x1: 0.5, y1: 1, x2: 0.89, y2: 1 },
    inOut: { x1: 0.45, y1: 0, x2: 0.55, y2: 1 },
  },
  {
    label: 'Cubic',
    in: { x1: 0.32, y1: 0, x2: 0.67, y2: 0 },
    out: { x1: 0.33, y1: 1, x2: 0.68, y2: 1 },
    inOut: { x1: 0.65, y1: 0, x2: 0.35, y2: 1 },
  },
  {
    label: 'Quart',
    in: { x1: 0.5, y1: 0, x2: 0.75, y2: 0 },
    out: { x1: 0.25, y1: 1, x2: 0.5, y2: 1 },
    inOut: { x1: 0.76, y1: 0, x2: 0.24, y2: 1 },
  },
  {
    label: 'Quint',
    in: { x1: 0.64, y1: 0, x2: 0.78, y2: 0 },
    out: { x1: 0.22, y1: 1, x2: 0.36, y2: 1 },
    inOut: { x1: 0.83, y1: 0, x2: 0.17, y2: 1 },
  },
  {
    label: 'Expo',
    in: { x1: 0.7, y1: 0, x2: 0.84, y2: 0 },
    out: { x1: 0.16, y1: 1, x2: 0.3, y2: 1 },
    inOut: { x1: 0.87, y1: 0, x2: 0.13, y2: 1 },
  },
  {
    label: 'Circ',
    in: { x1: 0.55, y1: 0, x2: 1, y2: 0.45 },
    out: { x1: 0, y1: 0.55, x2: 0.45, y2: 1 },
    inOut: { x1: 0.85, y1: 0, x2: 0.15, y2: 1 },
  },
  {
    label: 'Back',
    in: { x1: 0.36, y1: 0, x2: 0.66, y2: -0.56 },
    out: { x1: 0.34, y1: 1.56, x2: 0.64, y2: 1 },
    inOut: { x1: 0.68, y1: -0.6, x2: 0.32, y2: 1.6 },
  },
  { label: 'Elastic', type: 'elastic' },
  { label: 'Bounce', type: 'bounce' },
];

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
    separatePositionDimensions: false,
    positionKeyframes: [],
    positionXKeyframes: [],
    positionYKeyframes: [],
    positionZKeyframes: [],
    separateRotationDimensions: false,
    rotationKeyframes: [],
    rotationXKeyframes: [],
    rotationYKeyframes: [],
    rotationZKeyframes: [],
    separateScaleDimensions: false,
    scaleKeyframes: [],
    scaleXKeyframes: [],
    scaleYKeyframes: [],
    scaleZKeyframes: [],
    opacityKeyframes: [],
  };
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function displayNumber(value) {
  return String(Math.round(number(value) * 10000) / 10000);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function timelineTime(value) {
  return Math.round(number(value) * KEYFRAME_TIME_PRECISION) / KEYFRAME_TIME_PRECISION;
}

function sameTimelineTime(first, second) {
  return Math.abs(number(first) - number(second)) < KEYFRAME_TIME_EPSILON;
}

function uniqueKeyframesByTime(keyframes) {
  if (!Array.isArray(keyframes)) return [];
  const byTime = new Map();
  for (const keyframe of keyframes) {
    const tick = clamp(timelineTime(keyframe.tick), MIN_TIMELINE_TICK, MAX_TIMELINE_TICK);
    // Later entries represent the most recently authored value and win when
    // repairing older data that already contains duplicate timestamps.
    byTime.set(Math.round(tick * KEYFRAME_TIME_PRECISION), {
      ...keyframe,
      tick: String(tick),
    });
  }
  return [...byTime.values()].sort((first, second) => number(first.tick) - number(second.tick));
}

function uniqueKeyframeCollections(collections) {
  if (!collections) return {};
  return Object.fromEntries(Object.entries(collections).map(([property, keyframes]) => (
    [property, uniqueKeyframesByTime(keyframes)]
  )));
}

function hasDuplicateKeyframeTimes(keyframes) {
  const times = new Set();
  for (const keyframe of keyframes || []) {
    const tick = clamp(timelineTime(keyframe.tick), MIN_TIMELINE_TICK, MAX_TIMELINE_TICK);
    const timeKey = Math.round(tick * KEYFRAME_TIME_PRECISION);
    if (times.has(timeKey)) return true;
    times.add(timeKey);
  }
  return false;
}

function availableDraggedKeyframeTime({
  rawTick,
  candidateTick,
  keyframes,
  movingKeyframeId,
  minTick,
  maxTick,
  direction,
  step,
}) {
  const occupied = new Set((keyframes || [])
    .filter(keyframe => keyframe.id !== movingKeyframeId)
    .map(keyframe => timelineTime(keyframe.tick))
    .filter(tick => tick >= minTick && tick <= maxTick)
    .map(tick => Math.round(tick * KEYFRAME_TIME_PRECISION)));
  let candidate = clamp(timelineTime(candidateTick), minTick, maxTick);
  let candidateKey = Math.round(candidate * KEYFRAME_TIME_PRECISION);
  if (!occupied.has(candidateKey)) return candidate;

  const pointerSide = Math.sign(number(direction, 0));
  const side = rawTick < candidate
    ? -1
    : rawTick > candidate
      ? 1
      : pointerSide;
  if (side === 0) return null;

  const increment = Math.max(1 / KEYFRAME_TIME_PRECISION, step) * side;
  do {
    candidate = timelineTime(candidate + increment);
    if (candidate < minTick || candidate > maxTick) return null;
    candidateKey = Math.round(candidate * KEYFRAME_TIME_PRECISION);
  } while (occupied.has(candidateKey));
  return candidate;
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
  for (const group of groups) {
    const selectedIds = new Set(group.selectedKeyframes.map(keyframe => keyframe.id));
    const fixedTicks = group.keyframes
      .filter(keyframe => !selectedIds.has(keyframe.id))
      .map(keyframe => timelineTime(keyframe.tick));
    for (const selected of group.selectedKeyframes) {
      for (const fixedTick of fixedTicks) {
        blocked.add(Math.round(
          timelineTime(fixedTick - selected.startTick) * KEYFRAME_TIME_PRECISION,
        ));
      }
    }
  }

  let candidate = clamp(timelineTime(candidateDelta), minDelta, maxDelta);
  let candidateKey = Math.round(candidate * KEYFRAME_TIME_PRECISION);
  if (!blocked.has(candidateKey)) return candidate;

  const pointerSide = Math.sign(number(direction, 0));
  const side = rawDelta < candidate
    ? -1
    : rawDelta > candidate
      ? 1
      : pointerSide;
  if (side === 0) return null;

  const increment = Math.max(1 / KEYFRAME_TIME_PRECISION, step) * side;
  do {
    candidate = timelineTime(candidate + increment);
    if (candidate < minDelta || candidate > maxDelta) return null;
    candidateKey = Math.round(candidate * KEYFRAME_TIME_PRECISION);
  } while (blocked.has(candidateKey));
  return candidate;
}

function separatedTransform(property) {
  const match = /^(position|rotation|scale)([XYZ])$/.exec(property || '');
  return match ? { property: match[1], axis: match[2].toLowerCase() } : null;
}

function normalizedEasing(easing) {
  const type = ['elastic', 'bounce'].includes(easing?.type) ? easing.type : 'cubic';
  const mode = ['in', 'out', 'inOut'].includes(easing?.mode) ? easing.mode : 'inOut';
  return {
    type,
    mode,
    amount: clamp(number(easing?.amount, 1), 0, 4),
    x1: clamp(number(easing?.x1, 1 / 3), 0, 1),
    y1: number(easing?.y1, 1 / 3),
    x2: clamp(number(easing?.x2, 2 / 3), 0, 1),
    y2: number(easing?.y2, 2 / 3),
  };
}

function cubicCoordinate(start, control1, control2, end, amount) {
  const inverse = 1 - amount;
  return (inverse ** 3 * start)
    + (3 * inverse * inverse * amount * control1)
    + (3 * inverse * amount * amount * control2)
    + (amount ** 3 * end);
}

function bounceOut(progress) {
  const coefficient = 7.5625;
  const divisor = 2.75;
  if (progress < 1 / divisor) return coefficient * progress * progress;
  if (progress < 2 / divisor) {
    const shifted = progress - 1.5 / divisor;
    return coefficient * shifted * shifted + 0.75;
  }
  if (progress < 2.5 / divisor) {
    const shifted = progress - 2.25 / divisor;
    return coefficient * shifted * shifted + 0.9375;
  }
  const shifted = progress - 2.625 / divisor;
  return coefficient * shifted * shifted + 0.984375;
}

function bounceProgress(progress, mode) {
  if (mode === 'in') return 1 - bounceOut(1 - progress);
  if (mode === 'inOut') {
    return progress < 0.5
      ? (1 - bounceOut(1 - (2 * progress))) / 2
      : (1 + bounceOut((2 * progress) - 1)) / 2;
  }
  return bounceOut(progress);
}

function elasticProgress(progress, mode) {
  if (progress === 0 || progress === 1) return progress;
  if (mode === 'in') {
    const period = (2 * Math.PI) / 3;
    return -(2 ** ((10 * progress) - 10)) * Math.sin(((10 * progress) - 10.75) * period);
  }
  if (mode === 'inOut') {
    const period = (2 * Math.PI) / 4.5;
    return progress < 0.5
      ? -((2 ** ((20 * progress) - 10)) * Math.sin(((20 * progress) - 11.125) * period)) / 2
      : ((2 ** ((-20 * progress) + 10)) * Math.sin(((20 * progress) - 11.125) * period)) / 2 + 1;
  }
  const period = (2 * Math.PI) / 3;
  return (2 ** (-10 * progress)) * Math.sin(((10 * progress) - 0.75) * period) + 1;
}

function easedProgress(progress, easing) {
  const curve = normalizedEasing(easing);
  if (curve.type === 'bounce') return bounceProgress(progress, curve.mode);
  if (curve.type === 'elastic') {
    const elastic = elasticProgress(progress, curve.mode);
    return progress + ((elastic - progress) * curve.amount);
  }
  let low = 0;
  let high = 1;
  for (let index = 0; index < 14; index += 1) {
    const amount = (low + high) / 2;
    if (cubicCoordinate(0, curve.x1, curve.x2, 1, amount) < progress) low = amount;
    else high = amount;
  }
  return cubicCoordinate(0, curve.y1, curve.y2, 1, (low + high) / 2);
}

function storedSize(key, fallback) {
  const parsed = Number.parseInt(localStorage.getItem(key), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function vector(value, fallback = { x: 0, y: 0, z: 0 }) {
  return {
    x: number(value?.x, fallback.x),
    y: number(value?.y, fallback.y),
    z: number(value?.z, fallback.z),
  };
}

function orderedPositionKeyframes(object) {
  if (!Array.isArray(object.positionKeyframes)) return [];
  return uniqueKeyframesByTime(object.positionKeyframes)
    .map((keyframe, index) => ({
      id: String(keyframe.id || `position_${index + 1}`),
      tick: clamp(timelineTime(keyframe.tick), MIN_TIMELINE_TICK, MAX_TIMELINE_TICK),
      value: vector(keyframe.value, vector(object.position)),
      easing: normalizedEasing(keyframe.easing),
    }))
    .sort((a, b) => a.tick - b.tick);
}

function orderedVectorKeyframes(object, property, fallback) {
  const source = object?.[`${property}Keyframes`];
  if (!Array.isArray(source)) return [];
  return uniqueKeyframesByTime(source)
    .map((keyframe, index) => ({
      id: String(keyframe.id || `${property}_${index + 1}`),
      tick: clamp(timelineTime(keyframe.tick), MIN_TIMELINE_TICK, MAX_TIMELINE_TICK),
      value: vector(keyframe.value, vector(object[property], fallback)),
      easing: normalizedEasing(keyframe.easing),
    }))
    .sort((first, second) => first.tick - second.tick);
}

function orderedScalarKeyframes(object, property, fallback = 0) {
  const source = object?.[`${property}Keyframes`];
  if (!Array.isArray(source)) return [];
  return uniqueKeyframesByTime(source)
    .map((keyframe, index) => ({
      id: String(keyframe.id || `${property}_${index + 1}`),
      tick: clamp(timelineTime(keyframe.tick), MIN_TIMELINE_TICK, MAX_TIMELINE_TICK),
      value: number(keyframe.value, fallback),
      easing: normalizedEasing(keyframe.easing),
    }))
    .sort((first, second) => first.tick - second.tick);
}

function orderedOpacityKeyframes(object) {
  if (!Array.isArray(object.opacityKeyframes)) return [];
  return uniqueKeyframesByTime(object.opacityKeyframes)
    .map((keyframe, index) => ({
      id: String(keyframe.id || `opacity_${index + 1}`),
      tick: clamp(timelineTime(keyframe.tick), MIN_TIMELINE_TICK, MAX_TIMELINE_TICK),
      value: clamp(number(keyframe.value, number(object.opacity, 1)), 0, 1),
      easing: normalizedEasing(keyframe.easing),
    }))
    .sort((a, b) => a.tick - b.tick);
}

function vectorAtTick(keyframes, fallback, tick) {
  if (keyframes.length === 0) return vector(fallback);
  if (tick <= keyframes[0].tick) return keyframes[0].value;
  const last = keyframes[keyframes.length - 1];
  if (tick >= last.tick) return last.value;

  for (let index = 1; index < keyframes.length; index += 1) {
    const next = keyframes[index];
    if (tick > next.tick) continue;
    const previous = keyframes[index - 1];
    const span = Math.max(KEYFRAME_TIME_EPSILON, next.tick - previous.tick);
    const progress = easedProgress(clamp((tick - previous.tick) / span, 0, 1), previous.easing);
    return {
      x: previous.value.x + ((next.value.x - previous.value.x) * progress),
      y: previous.value.y + ((next.value.y - previous.value.y) * progress),
      z: previous.value.z + ((next.value.z - previous.value.z) * progress),
    };
  }
  return last.value;
}

function scalarAtTick(keyframes, fallback, tick) {
  if (keyframes.length === 0) return number(fallback);
  if (tick <= keyframes[0].tick) return keyframes[0].value;
  const last = keyframes[keyframes.length - 1];
  if (tick >= last.tick) return last.value;

  for (let index = 1; index < keyframes.length; index += 1) {
    const next = keyframes[index];
    if (tick > next.tick) continue;
    const previous = keyframes[index - 1];
    const span = Math.max(KEYFRAME_TIME_EPSILON, next.tick - previous.tick);
    const progress = easedProgress(clamp((tick - previous.tick) / span, 0, 1), previous.easing);
    return previous.value + ((next.value - previous.value) * progress);
  }
  return last.value;
}

function positionAtTick(object, tick) {
  if (!object.separatePositionDimensions) {
    return vectorAtTick(orderedPositionKeyframes(object), object.position, tick);
  }
  const fallback = vector(object.position);
  return {
    x: scalarAtTick(orderedScalarKeyframes(object, 'positionX', fallback.x), fallback.x, tick),
    y: scalarAtTick(orderedScalarKeyframes(object, 'positionY', fallback.y), fallback.y, tick),
    z: scalarAtTick(orderedScalarKeyframes(object, 'positionZ', fallback.z), fallback.z, tick),
  };
}

function transformAtTick(object, property, fallback, tick) {
  const separateField = `separate${property[0].toUpperCase()}${property.slice(1)}Dimensions`;
  if (!object[separateField]) {
    return vectorAtTick(orderedVectorKeyframes(object, property, fallback), vector(object[property], fallback), tick);
  }
  const base = vector(object[property], fallback);
  return {
    x: scalarAtTick(orderedScalarKeyframes(object, `${property}X`, base.x), base.x, tick),
    y: scalarAtTick(orderedScalarKeyframes(object, `${property}Y`, base.y), base.y, tick),
    z: scalarAtTick(orderedScalarKeyframes(object, `${property}Z`, base.z), base.z, tick),
  };
}

function rotationAtTick(object, tick) {
  return transformAtTick(object, 'rotation', { x: 0, y: 0, z: 0 }, tick);
}

function scaleAtTick(object, tick) {
  return transformAtTick(object, 'scale', { x: 1, y: 1, z: 1 }, tick);
}

function opacityAtTick(object, tick) {
  return clamp(scalarAtTick(orderedOpacityKeyframes(object), number(object.opacity, 1), tick), 0, 1);
}

function makeKeyframeId(keyframes, prefix) {
  let index = keyframes.length + 1;
  while (keyframes.some(keyframe => keyframe.id === `${prefix}_${index}`)) index += 1;
  return `${prefix}_${index}`;
}

function authoredPositionKeyframes(object) {
  return orderedPositionKeyframes(object).map(keyframe => ({
    id: keyframe.id,
    tick: String(clamp(keyframe.tick, MIN_TIMELINE_TICK, MAX_TIMELINE_TICK)),
    value: {
      x: String(keyframe.value.x),
      y: String(keyframe.value.y),
      z: String(keyframe.value.z),
    },
    easing: keyframe.easing,
  }));
}

function authoredVectorKeyframes(object, property, fallback) {
  return orderedVectorKeyframes(object, property, fallback).map(keyframe => ({
    id: keyframe.id,
    tick: String(keyframe.tick),
    value: {
      x: String(keyframe.value.x),
      y: String(keyframe.value.y),
      z: String(keyframe.value.z),
    },
    easing: keyframe.easing,
  }));
}

function authoredScalarKeyframes(object, property, fallback) {
  return orderedScalarKeyframes(object, property, fallback).map(keyframe => ({
    id: keyframe.id,
    tick: String(keyframe.tick),
    value: String(keyframe.value),
    easing: keyframe.easing,
  }));
}

function authoredOpacityKeyframes(object) {
  return orderedOpacityKeyframes(object).map(keyframe => ({
    id: keyframe.id,
    tick: String(clamp(keyframe.tick, MIN_TIMELINE_TICK, MAX_TIMELINE_TICK)),
    value: String(keyframe.value),
    easing: keyframe.easing,
  }));
}

function runtimePlane(effectId, object) {
  const objectId = sanitizeId(object.id) || 'plane';
  const positionKeyframes = orderedPositionKeyframes(object).map(keyframe => ({
    ...keyframe,
    tick: clamp(keyframe.tick, MIN_TIMELINE_TICK, MAX_TIMELINE_TICK),
  }));
  const opacityKeyframes = orderedOpacityKeyframes(object).map(keyframe => ({
    ...keyframe,
    tick: clamp(keyframe.tick, MIN_TIMELINE_TICK, MAX_TIMELINE_TICK),
  }));
  const fallbackPosition = vector(object.position);
  const positionXKeyframes = orderedScalarKeyframes(object, 'positionX', fallbackPosition.x);
  const positionYKeyframes = orderedScalarKeyframes(object, 'positionY', fallbackPosition.y);
  const positionZKeyframes = orderedScalarKeyframes(object, 'positionZ', fallbackPosition.z);
  const rotationKeyframes = orderedVectorKeyframes(object, 'rotation');
  const fallbackRotation = vector(object.rotation);
  const rotationXKeyframes = orderedScalarKeyframes(object, 'rotationX', fallbackRotation.x);
  const rotationYKeyframes = orderedScalarKeyframes(object, 'rotationY', fallbackRotation.y);
  const rotationZKeyframes = orderedScalarKeyframes(object, 'rotationZ', fallbackRotation.z);
  const scaleKeyframes = orderedVectorKeyframes(object, 'scale', { x: 1, y: 1, z: 1 });
  const fallbackScale = vector(object.scale, { x: 1, y: 1, z: 1 });
  const scaleXKeyframes = orderedScalarKeyframes(object, 'scaleX', fallbackScale.x);
  const scaleYKeyframes = orderedScalarKeyframes(object, 'scaleY', fallbackScale.y);
  const scaleZKeyframes = orderedScalarKeyframes(object, 'scaleZ', fallbackScale.z);
  const startTick = clamp(Math.floor(number(object.startTick, 0)), MIN_TIMELINE_TICK, MAX_TIMELINE_TICK - 1);
  const endTick = clamp(
    Math.floor(number(object.endTick, startTick + 1)),
    startTick + 1,
    MAX_TIMELINE_TICK,
  );
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
    startTick,
    endTick,
    positionKeyframes,
    separatePositionDimensions: Boolean(object.separatePositionDimensions),
    positionXKeyframes,
    positionYKeyframes,
    positionZKeyframes,
    separateRotationDimensions: Boolean(object.separateRotationDimensions),
    rotationKeyframes,
    rotationXKeyframes,
    rotationYKeyframes,
    rotationZKeyframes,
    separateScaleDimensions: Boolean(object.separateScaleDimensions),
    scaleKeyframes,
    scaleXKeyframes,
    scaleYKeyframes,
    scaleZKeyframes,
    opacityKeyframes,
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
      const initialPosition = positionAtTick(object, tickRef.current);
      const initialRotation = rotationAtTick(object, tickRef.current);
      const initialScale = scaleAtTick(object, tickRef.current);
      mesh.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
      mesh.rotation.set(
        THREE.MathUtils.degToRad(initialRotation.x),
        THREE.MathUtils.degToRad(initialRotation.y),
        THREE.MathUtils.degToRad(initialRotation.z),
      );
      mesh.scale.set(initialScale.x, initialScale.y, initialScale.z);
      mesh.userData = {
        object,
        texture,
        material,
        billboard: !!object.billboard,
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
        const { object, texture, material, billboard, outline } = mesh.userData;
        const active = tickRef.current >= number(object.startTick, 0)
          && tickRef.current < number(object.endTick, Number.POSITIVE_INFINITY);
        mesh.visible = active;
        if (outline) outline.visible = active;
        if (!active) continue;
        const position = positionAtTick(object, tickRef.current);
        const rotation = rotationAtTick(object, tickRef.current);
        const scale = scaleAtTick(object, tickRef.current);
        mesh.position.set(position.x, position.y, position.z);
        mesh.scale.set(scale.x, scale.y, scale.z);
        material.opacity = opacityAtTick(object, tickRef.current);
        if (billboard) {
          mesh.quaternion.copy(camera.quaternion);
          mesh.rotateZ(THREE.MathUtils.degToRad(rotation.z));
        } else {
          mesh.rotation.set(
            THREE.MathUtils.degToRad(rotation.x),
            THREE.MathUtils.degToRad(rotation.y),
            THREE.MathUtils.degToRad(rotation.z),
          );
        }
        if (outline) outline.update();
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
        <label key={axis}><span>{axis.toUpperCase()}</span><NumberInput value={value?.[axis] ?? '0'} onChange={next => onChange({ ...value, [axis]: next }, axis)} /></label>
      ))}
    </div>
  );
}

function TransportIcon({ type }) {
  if (type === 'graph') {
    return (
      <svg className="vfx-transport-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2 2.5h1.5v10H14V14H2z" />
        <path d="m4.5 10.75 2.4-3 2.1 1.6 3.2-5.1 1.25.8-4.1 6.45-2.2-1.7-1.5 1.9z" />
      </svg>
    );
  }
  if (type === 'play') {
    return (
      <svg className="vfx-transport-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4.5 2.75 13 8l-8.5 5.25z" />
      </svg>
    );
  }
  if (type === 'pause') {
    return (
      <svg className="vfx-transport-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3.5 2.5h3v11h-3zm6 0h3v11h-3z" />
      </svg>
    );
  }
  const previous = type === 'previous';
  return (
    <svg className="vfx-transport-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d={previous ? 'M2.5 2.5h2v11h-2zM13 3 5.5 8l7.5 5z' : 'M11.5 2.5h2v11h-2zM3 3l7.5 5L3 13z'} />
    </svg>
  );
}

function selectionKey(selection) {
  return `${selection.objectId}\u0000${selection.property}\u0000${selection.keyframeId}`;
}

function containsSelection(selections, candidate) {
  const key = selectionKey(candidate);
  return selections.some(selection => selectionKey(selection) === key);
}

function KeyframeGraph({
  effect,
  selectedKeyframes,
  duration,
  previewTick,
  propertyTab,
  onPropertyTab,
  squareLayout,
  onSquareLayout,
  onChangeKeyframe,
  onApplyEasingPreset,
  copiedEasing,
  onCopySelectedEasing,
  onApplyCopiedEasing,
  onPreviewTick,
}) {
  const [elasticAmountInput, setElasticAmountInput] = useState('1');
  const elasticAmount = clamp(number(elasticAmountInput, 1), 0, 4);
  const allSeries = [];
  const positionColors = { x: '#ef6b64', y: '#e2b84f', z: '#62a8f5' };

  for (const selection of selectedKeyframes) {
    const object = effect.objects.find(candidate => candidate.id === selection.objectId);
    if (!object) continue;
    if (['position', 'rotation', 'scale'].includes(selection.property)) {
      const property = selection.property;
      const keyframes = property === 'position'
        ? orderedPositionKeyframes(object)
        : orderedVectorKeyframes(object, property, property === 'scale' ? { x: 1, y: 1, z: 1 } : undefined);
      const keyframe = keyframes.find(candidate => candidate.id === selection.keyframeId);
      if (!keyframe) continue;
      for (const axis of ['x', 'y', 'z']) {
        allSeries.push({
          group: `${object.id}:${property}:${axis}`,
          label: `${object.name || object.id} ${property[0].toUpperCase() + property.slice(1)} ${axis.toUpperCase()}`,
          color: positionColors[axis],
          property,
          axis,
          tick: keyframe.tick,
          value: keyframe.value[axis],
          easing: keyframe.easing,
          selection,
        });
      }
    } else if (/^(position|rotation|scale)[XYZ]$/.test(selection.property)) {
      const [, property] = selection.property.match(/^(position|rotation|scale)[XYZ]$/);
      const axis = selection.property.at(-1).toLowerCase();
      const fallback = property === 'scale' ? 1 : 0;
      const keyframe = orderedScalarKeyframes(object, selection.property, number(object[property]?.[axis], fallback))
        .find(candidate => candidate.id === selection.keyframeId);
      if (!keyframe) continue;
      allSeries.push({
        group: `${object.id}:${selection.property}`,
        label: `${object.name || object.id} ${axis.toUpperCase()} ${property[0].toUpperCase() + property.slice(1)}`,
        color: positionColors[axis],
        property,
        axis,
        tick: keyframe.tick,
        value: keyframe.value,
        easing: keyframe.easing,
        selection,
      });
    } else {
      const keyframe = orderedOpacityKeyframes(object).find(candidate => candidate.id === selection.keyframeId);
      if (!keyframe) continue;
      allSeries.push({
        group: `${object.id}:opacity`,
        label: `${object.name || object.id} Opacity`,
        color: '#f0d66d',
        property: 'opacity',
        axis: null,
        tick: keyframe.tick,
        value: keyframe.value,
        easing: keyframe.easing,
        selection,
      });
    }
  }

  const visibleSeries = propertyTab === 'all'
    ? allSeries
    : allSeries.filter(point => point.property === propertyTab);

  const renderCanvas = (points, laneLabel = null) => {
    const grouped = new Map();
    for (const point of points) {
      if (!grouped.has(point.group)) grouped.set(point.group, []);
      grouped.get(point.group).push(point);
    }

    const values = points.map(point => point.value);
    if (!squareLayout) {
      for (const groupPoints of grouped.values()) {
        const ordered = [...groupPoints].sort((first, second) => first.tick - second.tick);
        for (let index = 1; index < ordered.length; index += 1) {
          const previous = ordered[index - 1];
          const next = ordered[index];
          const easing = normalizedEasing(previous.easing);
          const valueSpan = next.value - previous.value;
          if (easing.type === 'cubic') {
            values.push(
              previous.value + (valueSpan * easing.y1),
              previous.value + (valueSpan * easing.y2),
            );
          } else {
            for (let sample = 1; sample < 32; sample += 1) {
              values.push(previous.value + (valueSpan * easedProgress(sample / 32, easing)));
            }
          }
        }
      }
    }

    let minValue = values.length ? Math.min(...values) : 0;
    let maxValue = values.length ? Math.max(...values) : 1;
    if (sameTimelineTime(minValue, maxValue)) {
      const padding = Math.max(0.5, Math.abs(minValue) * 0.15);
      minValue -= padding;
      maxValue += padding;
    } else if (!squareLayout) {
      const padding = (maxValue - minValue) * 0.12;
      minValue -= padding;
      maxValue += padding;
    }

    let minTick = squareLayout ? Math.min(...points.map(point => point.tick)) : 0;
    let maxTick = squareLayout ? Math.max(...points.map(point => point.tick)) : duration;
    if (sameTimelineTime(minTick, maxTick)) {
      const padding = Math.max(0.5, duration * 0.025);
      minTick -= padding;
      maxTick += padding;
    }
    const tickSpan = Math.max(KEYFRAME_TIME_EPSILON, maxTick - minTick);
    const xAt = tick => ((tick - minTick) / tickSpan) * 1000;
    const yAt = value => ((maxValue - value) / (maxValue - minValue)) * 1000;
    const graphCoordinates = (event, svg) => {
      const rect = svg.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * 1000,
        y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * 1000,
        rect,
      };
    };
    const valueAt = graphY => maxValue - ((graphY / 1000) * (maxValue - minValue));
    const tickAt = graphX => minTick + ((graphX / 1000) * tickSpan);
    const nearestSnap = (rawValue, candidates, coordinateAt, rawCoordinate, pixelScale) => {
      let nearest = rawValue;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const candidate of candidates) {
        const distance = Math.abs(coordinateAt(candidate) - rawCoordinate) * pixelScale;
        if (distance < nearestDistance) {
          nearest = candidate;
          nearestDistance = distance;
        }
      }
      return nearestDistance <= 12 ? nearest : rawValue;
    };

    return (
      <div key={laneLabel || 'combined'} className={`vfx-graph-canvas ${squareLayout ? 'square' : 'full'}`}>
        {laneLabel && <span className="vfx-graph-lane-label">{laneLabel}</span>}
        <span className="vfx-graph-value max">{displayNumber(maxValue)}</span>
        <span className="vfx-graph-value min">{displayNumber(minValue)}</span>
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio={squareLayout ? 'xMidYMid meet' : 'none'}
          aria-label={`${laneLabel || 'Selected keyframe'} value graph`}
        >
          <path className="vfx-graph-axis" d="M0 1000H1000M0 500H1000M0 0H1000" />
          <path className="vfx-graph-playhead" d={`M${xAt(previewTick)} 0V1000`} />
          {[...grouped.values()].map(groupPoints => {
            const ordered = [...groupPoints].sort((first, second) => first.tick - second.tick);
            let path = `M${xAt(ordered[0].tick)} ${yAt(ordered[0].value)}`;
            for (let index = 1; index < ordered.length; index += 1) {
              const previous = ordered[index - 1];
              const next = ordered[index];
              const easing = normalizedEasing(previous.easing);
              const tickSpan = next.tick - previous.tick;
              const valueSpan = next.value - previous.value;
              if (easing.type === 'cubic') {
                path += ` C${xAt(previous.tick + (tickSpan * easing.x1))} ${yAt(previous.value + (valueSpan * easing.y1))}`
                  + ` ${xAt(previous.tick + (tickSpan * easing.x2))} ${yAt(previous.value + (valueSpan * easing.y2))}`
                  + ` ${xAt(next.tick)} ${yAt(next.value)}`;
              } else {
                for (let sample = 1; sample <= 48; sample += 1) {
                  const progress = sample / 48;
                  path += ` L${xAt(previous.tick + (tickSpan * progress))} ${yAt(previous.value + (valueSpan * easedProgress(progress, easing)))}`;
                }
              }
            }
            return <path key={ordered[0].group} className="vfx-graph-line" stroke={ordered[0].color} d={path} />;
          })}
          {[...grouped.values()].flatMap(groupPoints => {
            const ordered = [...groupPoints].sort((first, second) => first.tick - second.tick);
            return ordered.slice(0, -1).flatMap((point, index) => {
              const next = ordered[index + 1];
              const easing = normalizedEasing(point.easing);
              if (easing.type !== 'cubic') return [];
              const tickSpan = next.tick - point.tick;
              const valueSpan = next.value - point.value;
              return [
                ['first', easing.x1, easing.y1],
                ['second', easing.x2, easing.y2],
              ].map(([handle, handleX, handleY]) => {
                const cx = xAt(point.tick + (tickSpan * handleX));
                const cy = yAt(point.value + (valueSpan * handleY));
                return (
                  <g key={`${selectionKey(point.selection)}:${point.axis || 'value'}:${handle}`} className="vfx-graph-handle">
                    <path
                      className="vfx-graph-handle-line"
                      d={`M${handle === 'first' ? xAt(point.tick) : xAt(next.tick)} ${handle === 'first' ? yAt(point.value) : yAt(next.value)}L${cx} ${cy}`}
                    />
                    <path className="vfx-graph-handle-knob-outline" d={`M${cx} ${cy}h0.01`} />
                    <path
                      className="vfx-graph-handle-knob"
                      d={`M${cx} ${cy}h0.01`}
                      onPointerDown={event => {
                        event.stopPropagation();
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                      onPointerMove={event => {
                        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                        const graph = graphCoordinates(event, event.currentTarget.ownerSVGElement);
                        const rawNormalizedX = clamp((tickAt(graph.x) - point.tick) / Math.max(KEYFRAME_TIME_EPSILON, tickSpan), 0, 1);
                        const normalizedX = handle === 'first'
                          ? Math.min(rawNormalizedX, easing.x2)
                          : Math.max(rawNormalizedX, easing.x1);
                        const normalizedY = Math.abs(valueSpan) < KEYFRAME_TIME_EPSILON
                          ? handleY
                          : (valueAt(graph.y) - point.value) / valueSpan;
                        onChangeKeyframe(point.selection, {
                          easing: {
                            ...easing,
                            [handle === 'first' ? 'x1' : 'x2']: normalizedX,
                            [handle === 'first' ? 'y1' : 'y2']: normalizedY,
                          },
                        });
                      }}
                    />
                  </g>
                );
              });
            });
          })}
          {points.map((point, index) => {
            const px = xAt(point.tick);
            const py = yAt(point.value);
            return (
              <g key={`${selectionKey(point.selection)}:${point.axis || 'value'}:${index}`}>
                <path className="vfx-graph-point-outline" d={`M${px} ${py}h0.01`} />
                <path
                  className="vfx-graph-point"
                  stroke={point.color}
                  d={`M${px} ${py}h0.01`}
                  onPointerDown={event => {
                    event.stopPropagation();
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={event => {
                    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                    const graph = graphCoordinates(event, event.currentTarget.ownerSVGElement);
                    let rawTick = tickAt(graph.x);
                    let value = valueAt(graph.y);
                    if (event.ctrlKey || event.metaKey) {
                      const otherPoints = points.filter(candidate => (
                        selectionKey(candidate.selection) !== selectionKey(point.selection)
                        || candidate.axis !== point.axis
                      ));
                      rawTick = nearestSnap(
                        rawTick,
                        [0, duration, previewTick, ...otherPoints.map(candidate => candidate.tick)],
                        xAt,
                        graph.x,
                        graph.rect.width / 1000,
                      );
                      value = nearestSnap(
                        value,
                        [0, ...otherPoints.map(candidate => candidate.value)],
                        yAt,
                        graph.y,
                        graph.rect.height / 1000,
                      );
                    }
                    const object = effect.objects.find(candidate => candidate.id === point.selection.objectId);
                    const keyframes = object?.[`${point.selection.property}Keyframes`] || [];
                    const tick = availableDraggedKeyframeTime({
                      rawTick,
                      candidateTick: event.shiftKey ? Math.round(rawTick) : timelineTime(rawTick),
                      keyframes,
                      movingKeyframeId: point.selection.keyframeId,
                      minTick: 0,
                      maxTick: duration,
                      direction: Math.sign(event.movementX),
                      step: event.shiftKey ? 1 : 1 / KEYFRAME_TIME_PRECISION,
                    });
                    if (tick === null) return;
                    onChangeKeyframe(point.selection, { tick, axis: point.axis, value });
                    onPreviewTick(clamp(tick, 0, duration));
                  }}
                >
                  <title>Drag keyframe; Ctrl/Cmd snaps to nearby graph targets, Shift snaps time to whole ticks</title>
                </path>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div
      className={`vfx-graph-view ${squareLayout ? 'square' : 'full'}`}
      onMouseDown={event => {
        event.stopPropagation();
        if (!event.target.closest('button')) event.preventDefault();
      }}
    >
      <div className="vfx-graph-tabs">
        <div className="vfx-graph-tab-group" role="tablist" aria-label="Graph property">
          {['all', 'position', 'rotation', 'scale', 'opacity'].map(property => (
            <button
              key={property}
              className={propertyTab === property ? 'active' : ''}
              onClick={() => onPropertyTab(property)}
              role="tab"
              aria-selected={propertyTab === property}
            >
              {property === 'all' ? 'All' : property[0].toUpperCase() + property.slice(1)}
            </button>
          ))}
        </div>
        <button
          className={`vfx-graph-layout-toggle ${squareLayout ? 'active' : ''}`}
          onClick={() => onSquareLayout(!squareLayout)}
          title={squareLayout ? 'Use the full graph width' : 'Keep the graph square'}
          aria-label={squareLayout ? 'Use full-width graph' : 'Use square graph'}
          aria-pressed={squareLayout}
        >
          Square
        </button>
      </div>
      {allSeries.length === 0 ? (
        <div className="vfx-graph-empty">Select keyframes in the timeline, then open Graph.</div>
      ) : visibleSeries.length === 0 ? (
        <div className="vfx-graph-empty">No selected {propertyTab} keyframes.</div>
      ) : (
        <>
          <div className="vfx-graph-legend">
            {[...new Map(visibleSeries.map(point => [point.group, point])).values()].map(point => (
              <span key={point.group}><i style={{ background: point.color }} />{point.label}</span>
            ))}
          </div>
          <div className="vfx-graph-plots">
            <aside className="vfx-graph-presets" aria-label="Easing presets">
              <div className="vfx-graph-presets-header">
                <strong>Easing Presets</strong>
                <span>{selectedKeyframes.length} selected</span>
              </div>
              <div className="vfx-graph-easing-clipboard">
                <button
                  onClick={onCopySelectedEasing}
                  disabled={selectedKeyframes.length === 0}
                  title="Read the visible selected segment's easing, or the selected key's outgoing easing"
                >
                  Read Selected
                </button>
                <button
                  onClick={onApplyCopiedEasing}
                  disabled={!copiedEasing || selectedKeyframes.length === 0}
                  title="Apply copied easing to the current keyframe selection"
                >
                  Apply Copied
                </button>
              </div>
              <p>
                {copiedEasing
                  ? `Copied: ${copiedEasing.type === 'cubic'
                    ? 'Custom cubic'
                    : `${copiedEasing.type} ${copiedEasing.mode}${copiedEasing.type === 'elastic' ? ` @ ${displayNumber(copiedEasing.amount)}` : ''}`}`
                  : 'Applies to each selected key’s outgoing curve.'}
              </p>
              <label className="vfx-graph-elastic-amount">
                <span>Elastic Amount</span>
                <input
                  type="number"
                  min="0"
                  max="4"
                  step="0.1"
                  value={elasticAmountInput}
                  onChange={event => setElasticAmountInput(event.target.value)}
                  onBlur={() => setElasticAmountInput(displayNumber(elasticAmount))}
                  onKeyDown={event => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                    else if (event.key === 'Escape') {
                      setElasticAmountInput(displayNumber(elasticAmount));
                      event.currentTarget.blur();
                    }
                  }}
                  aria-label="Elastic amount"
                  title="0 is linear, 1 is standard elastic, and higher values increase overshoot"
                />
              </label>
              <div className="vfx-graph-linear-preset">
                <button onClick={() => onApplyEasingPreset(LINEAR_EASING)} title="Apply Linear easing">
                  Linear
                </button>
              </div>
              {EASING_FAMILIES.map(family => (
                <div key={family.label} className="vfx-graph-easing-family">
                  <span>{family.label}</span>
                  <div>
                    {[
                      ['In', 'in'],
                      ['Out', 'out'],
                      ['In/Out', 'inOut'],
                    ].map(([label, mode]) => {
                      const easing = family.type
                        ? {
                            type: family.type,
                            mode,
                            amount: family.type === 'elastic' ? elasticAmount : 1,
                          }
                        : family[mode];
                      return (
                        <button
                          key={mode}
                          onClick={() => onApplyEasingPreset(easing)}
                          title={`Apply ${family.label} ${label}${family.type === 'elastic' ? ` at amount ${elasticAmount}` : ''}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </aside>
            {renderCanvas(visibleSeries)}
          </div>
        </>
      )}
    </div>
  );
}

function Timeline({
  effect,
  selectedId,
  onSelect,
  onUpdateRange,
  onUpdatePositionKeyframes,
  onUpdateOpacityKeyframes,
  onUpdateKeyframes,
  onLoadPosition,
  onLoadOpacity,
  onLoadRotation,
  onLoadScale,
  onToggleSeparatePosition,
  onToggleSeparateTransform,
  selectedKeyframes,
  onSelectKeyframes,
  previewTick,
  onPreviewTick,
  playing,
  onPlaying,
}) {
  const duration = Math.max(1, Math.floor(number(effect.durationTicks, 40)));
  const dragRef = useRef(null);
  const updateRangeRef = useRef(onUpdateRange);
  const updatePositionKeyframesRef = useRef(onUpdatePositionKeyframes);
  const updateOpacityKeyframesRef = useRef(onUpdateOpacityKeyframes);
  const updateKeyframesRef = useRef(onUpdateKeyframes);
  const updatePreviewTickRef = useRef(onPreviewTick);
  const selectKeyframesRef = useRef(onSelectKeyframes);
  const scrubModifierRef = useRef(false);
  const tickInputFocusedRef = useRef(false);
  const rowsRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [marquee, setMarquee] = useState(null);
  const [graphOpen, setGraphOpen] = useState(false);
  const [graphPropertyTab, setGraphPropertyTab] = useState('all');
  const [graphSquareLayout, setGraphSquareLayout] = useState(true);
  const [copiedEasing, setCopiedEasing] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [tickInput, setTickInput] = useState(() => displayNumber(previewTick));
  const knownObjectIdsRef = useRef(new Set());
  const selectedKeyframe = selectedKeyframes.length === 1 ? selectedKeyframes[0] : null;
  updateRangeRef.current = onUpdateRange;
  updatePositionKeyframesRef.current = onUpdatePositionKeyframes;
  updateOpacityKeyframesRef.current = onUpdateOpacityKeyframes;
  updateKeyframesRef.current = onUpdateKeyframes;
  updatePreviewTickRef.current = onPreviewTick;
  selectKeyframesRef.current = onSelectKeyframes;

  const deleteSelectedKeyframes = useCallback(() => {
    if (selectedKeyframes.length === 0) return;
    const groupedSelections = new Map();
    for (const selection of selectedKeyframes) {
      const key = `${selection.objectId}\u0000${selection.property}`;
      if (!groupedSelections.has(key)) {
        groupedSelections.set(key, {
          objectId: selection.objectId,
          property: selection.property,
          ids: new Set(),
        });
      }
      groupedSelections.get(key).ids.add(selection.keyframeId);
    }

    for (const { objectId, property, ids } of groupedSelections.values()) {
      const object = effect.objects.find(candidate => candidate.id === objectId);
      if (!object) continue;
      const keyframes = (object[`${property}Keyframes`] || []).filter(keyframe => !ids.has(keyframe.id));
      if (property === 'position') onUpdatePositionKeyframes(objectId, keyframes);
      else if (property === 'opacity') onUpdateOpacityKeyframes(objectId, keyframes);
      else onUpdateKeyframes(objectId, property, keyframes);
    }
    onPlaying(false);
    onSelectKeyframes([]);
  }, [
    effect.objects,
    onPlaying,
    onSelectKeyframes,
    onUpdateKeyframes,
    onUpdateOpacityKeyframes,
    onUpdatePositionKeyframes,
    selectedKeyframes,
  ]);

  useEffect(() => {
    if (!tickInputFocusedRef.current) setTickInput(displayNumber(previewTick));
  }, [previewTick]);

  useEffect(() => {
    const updateModifier = event => {
      scrubModifierRef.current = event.shiftKey;
    };
    const clearModifier = () => {
      scrubModifierRef.current = false;
    };
    window.addEventListener('keydown', updateModifier);
    window.addEventListener('keyup', updateModifier);
    window.addEventListener('blur', clearModifier);
    return () => {
      window.removeEventListener('keydown', updateModifier);
      window.removeEventListener('keyup', updateModifier);
      window.removeEventListener('blur', clearModifier);
    };
  }, []);

  useEffect(() => {
    const togglePlayback = event => {
      if (event.code !== 'Space' || event.repeat || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof Element) {
        const editor = target.closest('input, textarea, select, [contenteditable="true"]');
        if (editor) {
          const numericInput = editor.matches('input[type="number"], input[inputmode="numeric"]');
          if (!numericInput) return;
          editor.blur();
        }
      }
      event.preventDefault();
      onPlaying(!playing);
    };
    window.addEventListener('keydown', togglePlayback);
    return () => window.removeEventListener('keydown', togglePlayback);
  }, [onPlaying, onSelectKeyframes, playing]);

  useEffect(() => {
    const deleteSelection = event => {
      if (!['Delete', 'Backspace'].includes(event.key) || event.repeat || selectedKeyframes.length === 0) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      deleteSelectedKeyframes();
    };
    window.addEventListener('keydown', deleteSelection);
    return () => window.removeEventListener('keydown', deleteSelection);
  }, [deleteSelectedKeyframes, selectedKeyframes.length]);

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

      if (drag.kind === 'marquee') {
        const left = Math.min(drag.startX, event.clientX);
        const right = Math.max(drag.startX, event.clientX);
        const top = Math.min(drag.startY, event.clientY);
        const bottom = Math.max(drag.startY, event.clientY);
        setMarquee({ left, top, width: right - left, height: bottom - top });

        const boxed = [];
        rowsRef.current?.querySelectorAll('.vfx-keyframe').forEach(element => {
          const rect = element.getBoundingClientRect();
          if (rect.right < left || rect.left > right || rect.bottom < top || rect.top > bottom) return;
          boxed.push({
            objectId: element.dataset.keyframeObject,
            property: element.dataset.keyframeProperty,
            keyframeId: element.dataset.keyframeId,
          });
        });
        const byKey = new Map(drag.baseSelection.map(selection => [selectionKey(selection), selection]));
        for (const selection of boxed) byKey.set(selectionKey(selection), selection);
        selectKeyframesRef.current([...byKey.values()]);
        return;
      }

      const rawDeltaTicks = ((event.clientX - drag.startX) / drag.trackWidth) * drag.duration;
      if (drag.kind === 'keyframe') {
        const pointerDirection = Math.sign(event.clientX - drag.lastPointerX)
          || Math.sign(rawDeltaTicks - drag.lastDelta);
        drag.lastPointerX = event.clientX;
        const nextDelta = availableDraggedKeyframeDelta({
          rawDelta: rawDeltaTicks,
          candidateDelta: event.shiftKey ? Math.round(rawDeltaTicks) : timelineTime(rawDeltaTicks),
          groups: drag.groups,
          minDelta: drag.minDelta,
          maxDelta: drag.maxDelta,
          direction: pointerDirection,
          step: event.shiftKey ? 1 : 1 / KEYFRAME_TIME_PRECISION,
        });
        if (nextDelta === null || sameTimelineTime(nextDelta, drag.lastDelta)) return;

        drag.lastDelta = nextDelta;
        for (const group of drag.groups) {
          const startTicks = new Map(group.selectedKeyframes.map(selected => [selected.id, selected.startTick]));
          const nextKeyframes = group.keyframes.map(keyframe => (
            startTicks.has(keyframe.id)
              ? { ...keyframe, tick: String(timelineTime(startTicks.get(keyframe.id) + nextDelta)) }
              : keyframe
          ));
          if (group.property === 'position') {
            updatePositionKeyframesRef.current(group.objectId, nextKeyframes);
          } else if (group.property === 'opacity') {
            updateOpacityKeyframesRef.current(group.objectId, nextKeyframes);
          } else {
            updateKeyframesRef.current(group.objectId, group.property, nextKeyframes);
          }
        }
        updatePreviewTickRef.current(timelineTime(drag.startTick + nextDelta));
        return;
      }

      const deltaTicks = Math.round(rawDeltaTicks);
      let nextStart = drag.startTick;
      let nextEnd = drag.endTick;

      if (drag.mode === 'move') {
        const length = drag.endTick - drag.startTick;
        const minStart = Math.max(MIN_TIMELINE_TICK, 1 - length);
        const maxStart = Math.min(drag.duration - 1, MAX_TIMELINE_TICK - length);
        nextStart = clamp(drag.startTick + deltaTicks, minStart, maxStart);
        nextEnd = nextStart + length;
      } else if (drag.mode === 'start') {
        nextStart = clamp(
          drag.startTick + deltaTicks,
          MIN_TIMELINE_TICK,
          Math.min(drag.endTick - 1, drag.duration - 1),
        );
      } else {
        nextEnd = clamp(
          drag.endTick + deltaTicks,
          Math.max(drag.startTick + 1, 1),
          MAX_TIMELINE_TICK,
        );
      }

      if (nextStart === drag.lastStart && nextEnd === drag.lastEnd) return;
      drag.lastStart = nextStart;
      drag.lastEnd = nextEnd;
      const keyframeDelta = drag.mode === 'move' ? nextStart - drag.startTick : 0;
      const shiftedKeyframes = drag.mode === 'move'
        ? {
            positionKeyframes: drag.positionKeyframes.map(keyframe => ({
              ...keyframe,
              tick: String(clamp(
                timelineTime(keyframe.tick) + keyframeDelta,
                MIN_TIMELINE_TICK,
                MAX_TIMELINE_TICK,
              )),
            })),
            opacityKeyframes: drag.opacityKeyframes.map(keyframe => ({
              ...keyframe,
              tick: String(clamp(
                timelineTime(keyframe.tick) + keyframeDelta,
                MIN_TIMELINE_TICK,
                MAX_TIMELINE_TICK,
              )),
            })),
            positionXKeyframes: drag.positionXKeyframes.map(keyframe => ({ ...keyframe, tick: String(clamp(timelineTime(keyframe.tick) + keyframeDelta, MIN_TIMELINE_TICK, MAX_TIMELINE_TICK)) })),
            positionYKeyframes: drag.positionYKeyframes.map(keyframe => ({ ...keyframe, tick: String(clamp(timelineTime(keyframe.tick) + keyframeDelta, MIN_TIMELINE_TICK, MAX_TIMELINE_TICK)) })),
            positionZKeyframes: drag.positionZKeyframes.map(keyframe => ({ ...keyframe, tick: String(clamp(timelineTime(keyframe.tick) + keyframeDelta, MIN_TIMELINE_TICK, MAX_TIMELINE_TICK)) })),
            rotationKeyframes: drag.rotationKeyframes.map(keyframe => ({ ...keyframe, tick: String(clamp(timelineTime(keyframe.tick) + keyframeDelta, MIN_TIMELINE_TICK, MAX_TIMELINE_TICK)) })),
            rotationXKeyframes: drag.rotationXKeyframes.map(keyframe => ({ ...keyframe, tick: String(clamp(timelineTime(keyframe.tick) + keyframeDelta, MIN_TIMELINE_TICK, MAX_TIMELINE_TICK)) })),
            rotationYKeyframes: drag.rotationYKeyframes.map(keyframe => ({ ...keyframe, tick: String(clamp(timelineTime(keyframe.tick) + keyframeDelta, MIN_TIMELINE_TICK, MAX_TIMELINE_TICK)) })),
            rotationZKeyframes: drag.rotationZKeyframes.map(keyframe => ({ ...keyframe, tick: String(clamp(timelineTime(keyframe.tick) + keyframeDelta, MIN_TIMELINE_TICK, MAX_TIMELINE_TICK)) })),
            scaleKeyframes: drag.scaleKeyframes.map(keyframe => ({ ...keyframe, tick: String(clamp(timelineTime(keyframe.tick) + keyframeDelta, MIN_TIMELINE_TICK, MAX_TIMELINE_TICK)) })),
            scaleXKeyframes: drag.scaleXKeyframes.map(keyframe => ({ ...keyframe, tick: String(clamp(timelineTime(keyframe.tick) + keyframeDelta, MIN_TIMELINE_TICK, MAX_TIMELINE_TICK)) })),
            scaleYKeyframes: drag.scaleYKeyframes.map(keyframe => ({ ...keyframe, tick: String(clamp(timelineTime(keyframe.tick) + keyframeDelta, MIN_TIMELINE_TICK, MAX_TIMELINE_TICK)) })),
            scaleZKeyframes: drag.scaleZKeyframes.map(keyframe => ({ ...keyframe, tick: String(clamp(timelineTime(keyframe.tick) + keyframeDelta, MIN_TIMELINE_TICK, MAX_TIMELINE_TICK)) })),
          }
        : null;
      updateRangeRef.current(drag.objectId, String(nextStart), String(nextEnd), shiftedKeyframes);
    };

    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setDragging(null);
      setMarquee(null);
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
    const startTick = clamp(
      Math.round(number(object.startTick)),
      MIN_TIMELINE_TICK,
      MAX_TIMELINE_TICK - 1,
    );
    const endTick = clamp(
      Math.round(number(object.endTick, duration)),
      startTick + 1,
      MAX_TIMELINE_TICK,
    );
    dragRef.current = {
      kind: 'range',
      objectId: object.id,
      mode,
      startX: event.clientX,
      trackWidth: Math.max(1, track.getBoundingClientRect().width),
      duration,
      startTick,
      endTick,
      lastStart: startTick,
      lastEnd: endTick,
      positionKeyframes: Array.isArray(object.positionKeyframes) ? object.positionKeyframes : [],
      opacityKeyframes: Array.isArray(object.opacityKeyframes) ? object.opacityKeyframes : [],
      positionXKeyframes: Array.isArray(object.positionXKeyframes) ? object.positionXKeyframes : [],
      positionYKeyframes: Array.isArray(object.positionYKeyframes) ? object.positionYKeyframes : [],
      positionZKeyframes: Array.isArray(object.positionZKeyframes) ? object.positionZKeyframes : [],
      rotationKeyframes: Array.isArray(object.rotationKeyframes) ? object.rotationKeyframes : [],
      rotationXKeyframes: Array.isArray(object.rotationXKeyframes) ? object.rotationXKeyframes : [],
      rotationYKeyframes: Array.isArray(object.rotationYKeyframes) ? object.rotationYKeyframes : [],
      rotationZKeyframes: Array.isArray(object.rotationZKeyframes) ? object.rotationZKeyframes : [],
      scaleKeyframes: Array.isArray(object.scaleKeyframes) ? object.scaleKeyframes : [],
      scaleXKeyframes: Array.isArray(object.scaleXKeyframes) ? object.scaleXKeyframes : [],
      scaleYKeyframes: Array.isArray(object.scaleYKeyframes) ? object.scaleYKeyframes : [],
      scaleZKeyframes: Array.isArray(object.scaleZKeyframes) ? object.scaleZKeyframes : [],
    };
    setDragging({ kind: 'range', objectId: object.id, mode });
    onSelect(object.id);
    document.body.style.cursor = mode === 'move' ? 'grabbing' : 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  const startKeyframeDrag = (event, object, property, keyframe) => {
    if (event.button !== 0) return;
    const track = event.currentTarget.closest('.vfx-track');
    if (!track) return;

    event.preventDefault();
    event.stopPropagation();
    onPlaying(false);
    onSelect(object.id);
    const selection = { objectId: object.id, property, keyframeId: keyframe.id };
    const alreadySelected = containsSelection(selectedKeyframes, selection);
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      const nextSelections = alreadySelected
        ? selectedKeyframes.filter(candidate => selectionKey(candidate) !== selectionKey(selection))
        : [...selectedKeyframes, selection];
      onSelectKeyframes(nextSelections);
      return;
    }
    const dragSelections = alreadySelected ? selectedKeyframes : [selection];
    onSelectKeyframes(dragSelections);
    const startTick = clamp(timelineTime(keyframe.tick), 0, duration);
    onPreviewTick(startTick);
    if (property === 'position') {
      onLoadPosition(object.id, {
        x: String(number(keyframe.value?.x)),
        y: String(number(keyframe.value?.y)),
        z: String(number(keyframe.value?.z)),
      });
    } else if (property === 'opacity') {
      onLoadOpacity(object.id, String(clamp(number(keyframe.value, 1), 0, 1)));
    } else if (separatedTransform(property)) {
      const separated = separatedTransform(property);
      const fallback = separated.property === 'scale' ? 1 : 0;
      const live = separated.property === 'position'
        ? positionAtTick(object, startTick)
        : separated.property === 'rotation'
          ? rotationAtTick(object, startTick)
          : scaleAtTick(object, startTick);
      const value = {
        ...Object.fromEntries(Object.entries(live).map(([key, entry]) => [key, String(entry)])),
        [separated.axis]: String(number(keyframe.value, fallback)),
      };
      if (separated.property === 'position') onLoadPosition(object.id, value);
      else if (separated.property === 'rotation') onLoadRotation(object.id, value);
      else onLoadScale(object.id, value);
    } else if (property === 'rotation') {
      onLoadRotation(object.id, {
        x: String(number(keyframe.value?.x)),
        y: String(number(keyframe.value?.y)),
        z: String(number(keyframe.value?.z)),
      });
    } else if (property === 'scale') {
      onLoadScale(object.id, {
        x: String(number(keyframe.value?.x, 1)),
        y: String(number(keyframe.value?.y, 1)),
        z: String(number(keyframe.value?.z, 1)),
      });
    }

    const groupsByTrack = new Map();
    for (const selectedSelection of dragSelections) {
      const selectedObject = effect.objects.find(candidate => candidate.id === selectedSelection.objectId);
      if (!selectedObject) continue;
      const source = Array.isArray(selectedObject[`${selectedSelection.property}Keyframes`])
        ? selectedObject[`${selectedSelection.property}Keyframes`]
        : [];
      const selectedSourceKeyframe = source.find(candidate => candidate.id === selectedSelection.keyframeId);
      if (!selectedSourceKeyframe) continue;
      const groupKey = `${selectedSelection.objectId}\u0000${selectedSelection.property}`;
      if (!groupsByTrack.has(groupKey)) {
        groupsByTrack.set(groupKey, {
          objectId: selectedSelection.objectId,
          property: selectedSelection.property,
          keyframes: source,
          selectedKeyframes: [],
        });
      }
      groupsByTrack.get(groupKey).selectedKeyframes.push({
        id: selectedSourceKeyframe.id,
        startTick: clamp(timelineTime(selectedSourceKeyframe.tick), 0, duration),
      });
    }
    const groups = [...groupsByTrack.values()];
    const movingKeyframes = groups.flatMap(group => group.selectedKeyframes);
    if (movingKeyframes.length === 0) return;
    const minDelta = Math.max(...movingKeyframes.map(selected => -selected.startTick));
    const maxDelta = Math.min(...movingKeyframes.map(selected => duration - selected.startTick));

    dragRef.current = {
      kind: 'keyframe',
      objectId: object.id,
      property,
      keyframeId: keyframe.id,
      groups,
      startX: event.clientX,
      trackWidth: Math.max(1, track.getBoundingClientRect().width),
      duration,
      startTick,
      minDelta,
      maxDelta,
      lastDelta: 0,
      lastPointerX: event.clientX,
    };
    setDragging({ kind: 'keyframe', objectId: object.id, property, keyframeId: keyframe.id });
    document.body.style.cursor = 'ew-resize';
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

  const startMarqueeSelection = event => {
    if (event.button !== 0 || graphOpen) return;
    if (event.target.closest('button, input, .vfx-track-range, .vfx-track-handle')) return;
    event.preventDefault();
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    const baseSelection = additive ? selectedKeyframes : [];
    if (!additive) onSelectKeyframes([]);
    dragRef.current = {
      kind: 'marquee',
      startX: event.clientX,
      startY: event.clientY,
      baseSelection,
    };
    setMarquee({ left: event.clientX, top: event.clientY, width: 0, height: 0 });
    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = 'none';
  };

  const selectPositionKeyframe = (event, object, keyframe) => {
    event.stopPropagation();
    onPlaying(false);
    onSelectKeyframes([{ objectId: object.id, property: 'position', keyframeId: keyframe.id }]);
    onSelect(object.id);
    onPreviewTick(clamp(timelineTime(keyframe.tick), 0, duration));
    onLoadPosition(object.id, {
      x: String(number(keyframe.value?.x)),
      y: String(number(keyframe.value?.y)),
      z: String(number(keyframe.value?.z)),
    });
  };

  const addPositionKeyframe = (event, object) => {
    event.stopPropagation();
    onPlaying(false);
    const tick = clamp(timelineTime(previewTick), 0, duration);
    const keyframes = Array.isArray(object.positionKeyframes) ? object.positionKeyframes : [];
    const existing = keyframes.find(keyframe => sameTimelineTime(keyframe.tick, tick));
    if (existing) {
      selectPositionKeyframe(event, object, existing);
      return;
    }
    const keyframe = {
      id: makeKeyframeId(keyframes, 'position'),
      tick: String(tick),
      value: {
        x: String(number(object.position?.x)),
        y: String(number(object.position?.y)),
        z: String(number(object.position?.z)),
      },
      easing: normalizedEasing(),
    };
    onUpdatePositionKeyframes(object.id, [...keyframes, keyframe]);
    onSelectKeyframes([{ objectId: object.id, property: 'position', keyframeId: keyframe.id }]);
    onSelect(object.id);
  };

  const applyPositionKeyframe = (event, object) => {
    event.stopPropagation();
    if (selectedKeyframe?.objectId !== object.id || selectedKeyframe.property !== 'position') return;
    const keyframes = (object.positionKeyframes || []).map(keyframe => (
      keyframe.id === selectedKeyframe.keyframeId
        ? {
            ...keyframe,
            value: {
              x: String(number(object.position?.x)),
              y: String(number(object.position?.y)),
              z: String(number(object.position?.z)),
            },
          }
        : keyframe
    ));
    onUpdatePositionKeyframes(object.id, keyframes);
  };

  const deletePositionKeyframe = (event, object) => {
    event.stopPropagation();
    if (selectedKeyframe?.objectId !== object.id || selectedKeyframe.property !== 'position') return;
    onUpdatePositionKeyframes(
      object.id,
      (object.positionKeyframes || []).filter(keyframe => keyframe.id !== selectedKeyframe.keyframeId),
    );
    onSelectKeyframes([]);
  };

  const selectOpacityKeyframe = (event, object, keyframe) => {
    event.stopPropagation();
    onPlaying(false);
    onSelectKeyframes([{ objectId: object.id, property: 'opacity', keyframeId: keyframe.id }]);
    onSelect(object.id);
    onPreviewTick(clamp(timelineTime(keyframe.tick), 0, duration));
    onLoadOpacity(object.id, String(clamp(number(keyframe.value, 1), 0, 1)));
  };

  const addOpacityKeyframe = (event, object) => {
    event.stopPropagation();
    onPlaying(false);
    const tick = clamp(timelineTime(previewTick), 0, duration);
    const keyframes = Array.isArray(object.opacityKeyframes) ? object.opacityKeyframes : [];
    const existing = keyframes.find(keyframe => sameTimelineTime(keyframe.tick, tick));
    if (existing) {
      selectOpacityKeyframe(event, object, existing);
      return;
    }
    const keyframe = {
      id: makeKeyframeId(keyframes, 'opacity'),
      tick: String(tick),
      value: String(clamp(number(object.opacity, 1), 0, 1)),
      easing: normalizedEasing(),
    };
    onUpdateOpacityKeyframes(object.id, [...keyframes, keyframe]);
    onSelectKeyframes([{ objectId: object.id, property: 'opacity', keyframeId: keyframe.id }]);
    onSelect(object.id);
  };

  const applyOpacityKeyframe = (event, object) => {
    event.stopPropagation();
    if (selectedKeyframe?.objectId !== object.id || selectedKeyframe.property !== 'opacity') return;
    const keyframes = (object.opacityKeyframes || []).map(keyframe => (
      keyframe.id === selectedKeyframe.keyframeId
        ? { ...keyframe, value: String(clamp(number(object.opacity, 1), 0, 1)) }
        : keyframe
    ));
    onUpdateOpacityKeyframes(object.id, keyframes);
  };

  const deleteOpacityKeyframe = (event, object) => {
    event.stopPropagation();
    if (selectedKeyframe?.objectId !== object.id || selectedKeyframe.property !== 'opacity') return;
    onUpdateOpacityKeyframes(
      object.id,
      (object.opacityKeyframes || []).filter(keyframe => keyframe.id !== selectedKeyframe.keyframeId),
    );
    onSelectKeyframes([]);
  };

  const focusGenericKeyframe = (object, property, keyframe) => {
    onPlaying(false);
    onSelectKeyframes([{ objectId: object.id, property, keyframeId: keyframe.id }]);
    onSelect(object.id);
    const tick = clamp(timelineTime(keyframe.tick), 0, duration);
    onPreviewTick(tick);
    const separated = separatedTransform(property);
    if (separated) {
      const fallback = separated.property === 'scale' ? 1 : 0;
      const live = separated.property === 'position'
        ? positionAtTick(object, tick)
        : separated.property === 'rotation'
          ? rotationAtTick(object, tick)
          : scaleAtTick(object, tick);
      const value = {
        x: String(live.x),
        y: String(live.y),
        z: String(live.z),
        [separated.axis]: String(number(keyframe.value, fallback)),
      };
      if (separated.property === 'position') onLoadPosition(object.id, value);
      else if (separated.property === 'rotation') onLoadRotation(object.id, value);
      else onLoadScale(object.id, value);
    } else if (property === 'rotation') {
      onLoadRotation(object.id, Object.fromEntries(['x', 'y', 'z'].map(axis => [axis, String(number(keyframe.value?.[axis]))])));
    } else if (property === 'scale') {
      onLoadScale(object.id, Object.fromEntries(['x', 'y', 'z'].map(axis => [axis, String(number(keyframe.value?.[axis], 1))])));
    }
  };

  const addGenericKeyframe = (event, object, property) => {
    event.stopPropagation();
    onPlaying(false);
    const tick = clamp(timelineTime(previewTick), 0, duration);
    const keyframes = Array.isArray(object[`${property}Keyframes`]) ? object[`${property}Keyframes`] : [];
    const existing = keyframes.find(keyframe => sameTimelineTime(keyframe.tick, tick));
    if (existing) {
      focusGenericKeyframe(object, property, existing);
      return;
    }
    let value;
    const separated = separatedTransform(property);
    if (separated) {
      const live = separated.property === 'position'
        ? positionAtTick(object, tick)
        : separated.property === 'rotation'
          ? rotationAtTick(object, tick)
          : scaleAtTick(object, tick);
      value = String(live[separated.axis]);
    } else {
      const fallback = property === 'scale' ? { x: 1, y: 1, z: 1 } : { x: 0, y: 0, z: 0 };
      value = Object.fromEntries(['x', 'y', 'z'].map(axis => [axis, String(number(object[property]?.[axis], fallback[axis]))]));
    }
    const keyframe = {
      id: makeKeyframeId(keyframes, property),
      tick: String(tick),
      value,
      easing: normalizedEasing(),
    };
    onUpdateKeyframes(object.id, property, [...keyframes, keyframe]);
    onSelectKeyframes([{ objectId: object.id, property, keyframeId: keyframe.id }]);
    onSelect(object.id);
  };

  const applyGenericKeyframe = (event, object, property) => {
    event.stopPropagation();
    if (selectedKeyframe?.objectId !== object.id || selectedKeyframe.property !== property) return;
    const separated = separatedTransform(property);
    const keyframes = (object[`${property}Keyframes`] || []).map(keyframe => {
      if (keyframe.id !== selectedKeyframe.keyframeId) return keyframe;
      const value = separated
        ? String(number(object[separated.property]?.[separated.axis], separated.property === 'scale' ? 1 : 0))
        : Object.fromEntries(['x', 'y', 'z'].map(component => [component, String(number(object[property]?.[component], property === 'scale' ? 1 : 0))]));
      return { ...keyframe, value };
    });
    onUpdateKeyframes(object.id, property, keyframes);
  };

  const deleteGenericKeyframe = (event, object, property) => {
    event.stopPropagation();
    if (selectedKeyframe?.objectId !== object.id || selectedKeyframe.property !== property) return;
    onUpdateKeyframes(
      object.id,
      property,
      (object[`${property}Keyframes`] || []).filter(keyframe => keyframe.id !== selectedKeyframe.keyframeId),
    );
    onSelectKeyframes([]);
  };

  const movePreviewTick = delta => {
    const nextTick = clamp(timelineTime(previewTick + delta), 0, duration);
    onPlaying(false);
    onSelectKeyframes([]);
    onPreviewTick(nextTick);
    setTickInput(String(nextTick));
  };

  const commitTickInput = rawValue => {
    const parsed = Number(rawValue);
    const nextTick = clamp(
      timelineTime(Number.isFinite(parsed) ? parsed : previewTick),
      0,
      duration,
    );
    onPlaying(false);
    onSelectKeyframes([]);
    onPreviewTick(nextTick);
    setTickInput(String(nextTick));
  };

  const scrubTo = rawValue => {
    const parsed = clamp(number(rawValue, previewTick), 0, duration);
    const nextTick = scrubModifierRef.current ? Math.round(parsed) : parsed;
    onPreviewTick(nextTick);
  };

  const genericTrackRow = (object, label, property, keyframes, nested = false, separation = null) => {
    const hasSelectedKeyframe = selectedKeyframe?.objectId === object.id
      && selectedKeyframe.property === property
      && keyframes.some(keyframe => keyframe.id === selectedKeyframe.keyframeId);
    const separated = Boolean(separation?.separate);
    return (
      <div key={property} className={`vfx-timeline-row vfx-timeline-property-row ${nested ? 'vfx-timeline-axis-row' : ''}`} onClick={() => onSelect(object.id)}>
        <span className="vfx-timeline-property-label">
          <span>{label}</span>
          <span className="vfx-keyframe-actions">
            {separation && (
              <button
                className={`vfx-separate-dimensions ${separated ? 'active' : ''}`}
                onClick={event => {
                  event.stopPropagation();
                  onToggleSeparateTransform(object.id, property, !separated);
                }}
                title={separated ? `Recombine ${label} dimensions` : `Separate ${label} dimensions`}
                aria-label={separated ? `Recombine ${label} dimensions` : `Separate ${label} dimensions`}
                aria-pressed={separated}
              >XYZ</button>
            )}
            {!separated && <button onClick={event => addGenericKeyframe(event, object, property)} title={`Add ${label} keyframe at preview time`} aria-label={`Add ${label} keyframe`}>+</button>}
            {!separated && <button onClick={event => applyGenericKeyframe(event, object, property)} disabled={!hasSelectedKeyframe} title={`Apply current ${label} value to selected keyframe`} aria-label={`Apply ${label} keyframe`}>✓</button>}
            {!separated && <button onClick={event => deleteGenericKeyframe(event, object, property)} disabled={!hasSelectedKeyframe} title={`Delete selected ${label} keyframe`} aria-label={`Delete ${label} keyframe`}>−</button>}
          </span>
        </span>
        <div className="vfx-track vfx-keyframe-track">
          {!separated && keyframes.map(keyframe => {
            const selected = containsSelection(selectedKeyframes, { objectId: object.id, property, keyframeId: keyframe.id });
            return (
              <button
                key={keyframe.id}
                className={`vfx-keyframe ${selected ? 'selected' : ''} ${dragging?.kind === 'keyframe' && dragging.objectId === object.id && dragging.property === property && dragging.keyframeId === keyframe.id ? 'dragging' : ''}`}
                style={{ left: `${(keyframe.tick / duration) * 100}%` }}
                data-keyframe-object={object.id}
                data-keyframe-property={property}
                data-keyframe-id={keyframe.id}
                onMouseDown={event => startKeyframeDrag(event, object, property, keyframe)}
                title={`${label} keyframe at tick ${keyframe.tick}`}
                aria-label={`${label} keyframe at tick ${keyframe.tick}`}
              />
            );
          })}
          <div className="vfx-playhead" style={{ left: `${(previewTick / duration) * 100}%` }} />
        </div>
      </div>
    );
  };

  const changeGraphKeyframe = (selection, patch) => {
    const object = effect.objects.find(candidate => candidate.id === selection.objectId);
    if (!object) return;
    const source = object[`${selection.property}Keyframes`] || [];
    if (patch.tick !== undefined && source.some(keyframe => (
      keyframe.id !== selection.keyframeId && sameTimelineTime(keyframe.tick, patch.tick)
    ))) return;
    const keyframes = source.map(keyframe => {
      if (keyframe.id !== selection.keyframeId) return keyframe;
      const next = { ...keyframe };
      if (patch.tick !== undefined) next.tick = String(clamp(timelineTime(patch.tick), MIN_TIMELINE_TICK, MAX_TIMELINE_TICK));
      if (patch.easing) next.easing = normalizedEasing(patch.easing);
      if (patch.value !== undefined) {
        if (['position', 'rotation', 'scale'].includes(selection.property)) {
          next.value = { ...keyframe.value, [patch.axis]: String(patch.value) };
        } else {
          next.value = String(selection.property === 'opacity' ? clamp(patch.value, 0, 1) : patch.value);
        }
      }
      return next;
    });
    if (selection.property === 'position') onUpdatePositionKeyframes(selection.objectId, keyframes);
    else if (selection.property === 'opacity') onUpdateOpacityKeyframes(selection.objectId, keyframes);
    else onUpdateKeyframes(selection.objectId, selection.property, keyframes);
  };

  const applyGraphEasingPreset = easing => {
    const groupedSelections = new Map();
    for (const selection of selectedKeyframes) {
      const key = `${selection.objectId}\u0000${selection.property}`;
      if (!groupedSelections.has(key)) {
        groupedSelections.set(key, {
          objectId: selection.objectId,
          property: selection.property,
          ids: new Set(),
        });
      }
      groupedSelections.get(key).ids.add(selection.keyframeId);
    }

    const normalized = normalizedEasing(easing);
    for (const { objectId, property, ids } of groupedSelections.values()) {
      const object = effect.objects.find(candidate => candidate.id === objectId);
      if (!object) continue;
      const keyframes = (object[`${property}Keyframes`] || []).map(keyframe => (
        ids.has(keyframe.id) ? { ...keyframe, easing: { ...normalized } } : keyframe
      ));
      if (property === 'position') onUpdatePositionKeyframes(objectId, keyframes);
      else if (property === 'opacity') onUpdateOpacityKeyframes(objectId, keyframes);
      else onUpdateKeyframes(objectId, property, keyframes);
    }
  };

  const copySelectedGraphEasing = () => {
    if (selectedKeyframes.length === 0) return;
    const activeSelection = selectedKeyframes[selectedKeyframes.length - 1];
    const relatedSelections = selectedKeyframes.filter(selection => (
      selection.objectId === activeSelection.objectId
      && selection.property === activeSelection.property
    ));
    const object = effect.objects.find(candidate => candidate.id === activeSelection.objectId);
    const keyframes = object?.[`${activeSelection.property}Keyframes`] || [];
    const relatedKeyframes = relatedSelections
      .map(selection => ({
        selection,
        keyframe: keyframes.find(candidate => candidate.id === selection.keyframeId),
      }))
      .filter(entry => entry.keyframe)
      .sort((first, second) => number(first.keyframe.tick) - number(second.keyframe.tick));
    if (relatedKeyframes.length === 0) return;

    const activeIndex = relatedKeyframes.findIndex(entry => (
      entry.selection.keyframeId === activeSelection.keyframeId
    ));
    const sourceIndex = relatedKeyframes.length > 1 && activeIndex === relatedKeyframes.length - 1
      ? activeIndex - 1
      : Math.max(0, activeIndex);
    setCopiedEasing({ ...normalizedEasing(relatedKeyframes[sourceIndex].keyframe.easing) });
  };

  return (
    <div className="vfx-timeline">
      <div className="vfx-timeline-toolbar">
        <div className="vfx-timeline-controls">
          <button className="ycs-button icon vfx-transport-button" onClick={() => movePreviewTick(-1)} title="Previous tick" aria-label="Previous tick">
            <TransportIcon type="previous" />
          </button>
          <button
            className="ycs-button icon vfx-transport-button"
            onClick={() => onPlaying(!playing)}
            title={playing ? 'Pause' : 'Play'}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            <TransportIcon type={playing ? 'pause' : 'play'} />
          </button>
          <button className="ycs-button icon vfx-transport-button" onClick={() => movePreviewTick(1)} title="Next tick" aria-label="Next tick">
            <TransportIcon type="next" />
          </button>
          <button
            className={`ycs-button icon vfx-transport-button vfx-graph-toggle ${graphOpen ? 'active' : ''}`}
            onClick={() => setGraphOpen(current => !current)}
            title={graphOpen ? 'Show Timeline' : 'Show Selected Keys in Graph'}
            aria-label={graphOpen ? 'Show timeline' : 'Show selected keys in graph'}
            aria-pressed={graphOpen}
          >
            <TransportIcon type="graph" />
          </button>
          <input
            className="ycs-string-input vfx-tick-input"
            type="number"
            min="0"
            max={duration}
            step="0.01"
            value={tickInput}
            aria-label="Current tick"
            title="Current tick"
            onFocus={() => { tickInputFocusedRef.current = true; }}
            onChange={event => setTickInput(event.target.value)}
            onBlur={event => {
              tickInputFocusedRef.current = false;
              commitTickInput(event.target.value);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.blur();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                const currentTick = displayNumber(previewTick);
                setTickInput(currentTick);
                event.currentTarget.value = currentTick;
                event.currentTarget.blur();
              }
            }}
          />
          <span className="vfx-tick-total">/ {duration}</span>
        </div>
        <div className="vfx-timeline-scrubber">
          <input
            className="ycs-slider"
            type="range"
            min="0"
            max={duration}
            step="0.01"
            value={previewTick}
            title="Hold Shift while scrubbing to snap to whole ticks"
            onPointerDown={event => {
              scrubModifierRef.current = event.shiftKey;
            }}
            onChange={event => scrubTo(event.target.value)}
            onKeyDown={event => {
              if (event.shiftKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
                event.preventDefault();
                movePreviewTick(event.key === 'ArrowLeft' ? -1 : 1);
              }
            }}
          />
        </div>
      </div>
      {graphOpen ? (
        <KeyframeGraph
          effect={effect}
          selectedKeyframes={selectedKeyframes}
          duration={duration}
          previewTick={previewTick}
          propertyTab={graphPropertyTab}
          onPropertyTab={setGraphPropertyTab}
          squareLayout={graphSquareLayout}
          onSquareLayout={setGraphSquareLayout}
          onChangeKeyframe={changeGraphKeyframe}
          onApplyEasingPreset={applyGraphEasingPreset}
          copiedEasing={copiedEasing}
          onCopySelectedEasing={copySelectedGraphEasing}
          onApplyCopiedEasing={() => {
            if (copiedEasing) applyGraphEasingPreset(copiedEasing);
          }}
          onPreviewTick={onPreviewTick}
        />
      ) : (
      <div ref={rowsRef} className="vfx-timeline-rows" onMouseDown={startMarqueeSelection}>
        {effect.objects.map(object => {
          const start = number(object.startTick);
          const end = Math.max(start + 1, number(object.endTick, duration));
          const expanded = expandedIds.has(object.id);
          const positionKeyframes = orderedPositionKeyframes(object);
          const fallbackPosition = vector(object.position);
          const positionXKeyframes = orderedScalarKeyframes(object, 'positionX', fallbackPosition.x);
          const positionYKeyframes = orderedScalarKeyframes(object, 'positionY', fallbackPosition.y);
          const positionZKeyframes = orderedScalarKeyframes(object, 'positionZ', fallbackPosition.z);
          const rotationKeyframes = orderedVectorKeyframes(object, 'rotation');
          const fallbackRotation = vector(object.rotation);
          const rotationXKeyframes = orderedScalarKeyframes(object, 'rotationX', fallbackRotation.x);
          const rotationYKeyframes = orderedScalarKeyframes(object, 'rotationY', fallbackRotation.y);
          const rotationZKeyframes = orderedScalarKeyframes(object, 'rotationZ', fallbackRotation.z);
          const scaleKeyframes = orderedVectorKeyframes(object, 'scale', { x: 1, y: 1, z: 1 });
          const fallbackScale = vector(object.scale, { x: 1, y: 1, z: 1 });
          const scaleXKeyframes = orderedScalarKeyframes(object, 'scaleX', fallbackScale.x);
          const scaleYKeyframes = orderedScalarKeyframes(object, 'scaleY', fallbackScale.y);
          const scaleZKeyframes = orderedScalarKeyframes(object, 'scaleZ', fallbackScale.z);
          const opacityKeyframes = orderedOpacityKeyframes(object);
          const hasSelectedPositionKeyframe = selectedKeyframe?.objectId === object.id
            && selectedKeyframe.property === 'position'
            && positionKeyframes.some(keyframe => keyframe.id === selectedKeyframe.keyframeId);
          const hasSelectedOpacityKeyframe = selectedKeyframe?.objectId === object.id
            && selectedKeyframe.property === 'opacity'
            && opacityKeyframes.some(keyframe => keyframe.id === selectedKeyframe.keyframeId);
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
                <div className="vfx-track vfx-active-track">
                  <div
                    className={`vfx-track-range ${dragging?.kind === 'range' && dragging.objectId === object.id ? `dragging ${dragging.mode}` : ''}`}
                    style={rangeStyle}
                    onMouseDown={event => startClipDrag(event, object, 'move')}
                    title={`Active: ${displayNumber(start)} - ${displayNumber(end)} ticks`}
                  >
                    <span className="vfx-track-handle start" onMouseDown={event => startClipDrag(event, object, 'start')} />
                    <span className="vfx-track-handle end" onMouseDown={event => startClipDrag(event, object, 'end')} />
                  </div>
                  <div className="vfx-playhead" style={{ left: `${(previewTick / duration) * 100}%` }} />
                </div>
              </div>
              {expanded && (
                <div className="vfx-timeline-row vfx-timeline-property-row" onClick={() => onSelect(object.id)}>
                  <span className="vfx-timeline-property-label">
                    <span>Position</span>
                    <span className="vfx-keyframe-actions">
                      <button
                        className={`vfx-separate-dimensions ${object.separatePositionDimensions ? 'active' : ''}`}
                        onClick={event => { event.stopPropagation(); onToggleSeparatePosition(object.id, !object.separatePositionDimensions); }}
                        title={object.separatePositionDimensions ? 'Recombine Position dimensions' : 'Separate Position dimensions'}
                        aria-label={object.separatePositionDimensions ? 'Recombine Position dimensions' : 'Separate Position dimensions'}
                        aria-pressed={Boolean(object.separatePositionDimensions)}
                      >XYZ</button>
                      {!object.separatePositionDimensions && <button onClick={event => addPositionKeyframe(event, object)} title="Add Position keyframe at preview tick" aria-label="Add Position keyframe">+</button>}
                      {!object.separatePositionDimensions && <button onClick={event => applyPositionKeyframe(event, object)} disabled={!hasSelectedPositionKeyframe} title="Apply current Position fields to selected keyframe" aria-label="Apply Position keyframe">✓</button>}
                      {!object.separatePositionDimensions && <button onClick={event => deletePositionKeyframe(event, object)} disabled={!hasSelectedPositionKeyframe} title="Delete selected Position keyframe" aria-label="Delete Position keyframe">−</button>}
                    </span>
                  </span>
                  <div className="vfx-track vfx-keyframe-track">
                    {!object.separatePositionDimensions && positionKeyframes.map(keyframe => {
                      const selected = containsSelection(selectedKeyframes, {
                        objectId: object.id,
                        property: 'position',
                        keyframeId: keyframe.id,
                      });
                      return (
                        <button
                          key={keyframe.id}
                          className={`vfx-keyframe ${selected ? 'selected' : ''} ${dragging?.kind === 'keyframe' && dragging.objectId === object.id && dragging.property === 'position' && dragging.keyframeId === keyframe.id ? 'dragging' : ''}`}
                          style={{ left: `${(keyframe.tick / duration) * 100}%` }}
                          data-keyframe-object={object.id}
                          data-keyframe-property="position"
                          data-keyframe-id={keyframe.id}
                          onMouseDown={event => startKeyframeDrag(event, object, 'position', keyframe)}
                          title={`Position keyframe at tick ${keyframe.tick}`}
                          aria-label={`Position keyframe at tick ${keyframe.tick}`}
                        />
                      );
                    })}
                    <div className="vfx-playhead" style={{ left: `${(previewTick / duration) * 100}%` }} />
                  </div>
                </div>
              )}
              {expanded && object.separatePositionDimensions && genericTrackRow(object, 'X Position', 'positionX', positionXKeyframes, true)}
              {expanded && object.separatePositionDimensions && genericTrackRow(object, 'Y Position', 'positionY', positionYKeyframes, true)}
              {expanded && object.separatePositionDimensions && genericTrackRow(object, 'Z Position', 'positionZ', positionZKeyframes, true)}
              {expanded && genericTrackRow(object, 'Rotation', 'rotation', rotationKeyframes, false, { separate: object.separateRotationDimensions })}
              {expanded && object.separateRotationDimensions && genericTrackRow(object, 'X Rotation', 'rotationX', rotationXKeyframes, true)}
              {expanded && object.separateRotationDimensions && genericTrackRow(object, 'Y Rotation', 'rotationY', rotationYKeyframes, true)}
              {expanded && object.separateRotationDimensions && genericTrackRow(object, 'Z Rotation', 'rotationZ', rotationZKeyframes, true)}
              {expanded && genericTrackRow(object, 'Scale', 'scale', scaleKeyframes, false, { separate: object.separateScaleDimensions })}
              {expanded && object.separateScaleDimensions && genericTrackRow(object, 'X Scale', 'scaleX', scaleXKeyframes, true)}
              {expanded && object.separateScaleDimensions && genericTrackRow(object, 'Y Scale', 'scaleY', scaleYKeyframes, true)}
              {expanded && object.separateScaleDimensions && genericTrackRow(object, 'Z Scale', 'scaleZ', scaleZKeyframes, true)}
              {expanded && (
                <div className="vfx-timeline-row vfx-timeline-property-row" onClick={() => onSelect(object.id)}>
                  <span className="vfx-timeline-property-label">
                    <span>Opacity</span>
                    <span className="vfx-keyframe-actions">
                      <button onClick={event => addOpacityKeyframe(event, object)} title="Add Opacity keyframe at preview tick" aria-label="Add Opacity keyframe">+</button>
                      <button onClick={event => applyOpacityKeyframe(event, object)} disabled={!hasSelectedOpacityKeyframe} title="Apply current Opacity field to selected keyframe" aria-label="Apply Opacity keyframe">✓</button>
                      <button onClick={event => deleteOpacityKeyframe(event, object)} disabled={!hasSelectedOpacityKeyframe} title="Delete selected Opacity keyframe" aria-label="Delete Opacity keyframe">−</button>
                    </span>
                  </span>
                  <div className="vfx-track vfx-keyframe-track">
                    {opacityKeyframes.map(keyframe => {
                      const selected = containsSelection(selectedKeyframes, {
                        objectId: object.id,
                        property: 'opacity',
                        keyframeId: keyframe.id,
                      });
                      return (
                        <button
                          key={keyframe.id}
                          className={`vfx-keyframe ${selected ? 'selected' : ''} ${dragging?.kind === 'keyframe' && dragging.objectId === object.id && dragging.property === 'opacity' && dragging.keyframeId === keyframe.id ? 'dragging' : ''}`}
                          style={{ left: `${(keyframe.tick / duration) * 100}%` }}
                          data-keyframe-object={object.id}
                          data-keyframe-property="opacity"
                          data-keyframe-id={keyframe.id}
                          onMouseDown={event => startKeyframeDrag(event, object, 'opacity', keyframe)}
                          title={`Opacity keyframe at tick ${keyframe.tick}`}
                          aria-label={`Opacity keyframe at tick ${keyframe.tick}`}
                        />
                      );
                    })}
                    <div className="vfx-playhead" style={{ left: `${(previewTick / duration) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
      {marquee && <div className="vfx-selection-marquee" style={marquee} />}
    </div>
  );
}

function VfxEditor({ effectId, onBack, isActive }) {
  const [effect, setEffect] = useState(DEFAULT_EFFECT);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedKeyframes, setSelectedKeyframes] = useState([]);
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
        const durationTicks = Math.max(1, Math.floor(number(loaded.durationTicks, 40)));
        const objects = (loaded.objects || []).map(object => ({
          ...object,
          separatePositionDimensions: Boolean(object.separatePositionDimensions),
          positionKeyframes: authoredPositionKeyframes(object),
          positionXKeyframes: authoredScalarKeyframes(object, 'positionX', number(object.position?.x)),
          positionYKeyframes: authoredScalarKeyframes(object, 'positionY', number(object.position?.y)),
          positionZKeyframes: authoredScalarKeyframes(object, 'positionZ', number(object.position?.z)),
          separateRotationDimensions: Boolean(object.separateRotationDimensions),
          rotationKeyframes: authoredVectorKeyframes(object, 'rotation'),
          rotationXKeyframes: authoredScalarKeyframes(object, 'rotationX', number(object.rotation?.x)),
          rotationYKeyframes: authoredScalarKeyframes(object, 'rotationY', number(object.rotation?.y)),
          rotationZKeyframes: authoredScalarKeyframes(object, 'rotationZ', number(object.rotation?.z)),
          separateScaleDimensions: Boolean(object.separateScaleDimensions),
          scaleKeyframes: authoredVectorKeyframes(object, 'scale', { x: 1, y: 1, z: 1 }),
          scaleXKeyframes: authoredScalarKeyframes(object, 'scaleX', number(object.scale?.x, 1)),
          scaleYKeyframes: authoredScalarKeyframes(object, 'scaleY', number(object.scale?.y, 1)),
          scaleZKeyframes: authoredScalarKeyframes(object, 'scaleZ', number(object.scale?.z, 1)),
          opacityKeyframes: authoredOpacityKeyframes(object),
        }));
        setEffect({ ...DEFAULT_EFFECT, ...loaded, id: loaded.id || effectId, durationTicks: String(durationTicks), objects });
        setSelectedId(loaded.objects?.[0]?.id || null);
        setSelectedKeyframes([]);
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
  const selectedKeyframe = selectedKeyframes.length === 1 ? selectedKeyframes[0] : null;
  const selectedPositionKeyframe = selectedKeyframe?.objectId === selectedId && selectedKeyframe.property === 'position'
    ? selected?.positionKeyframes?.find(keyframe => keyframe.id === selectedKeyframe.keyframeId)
    : null;
  const selectedOpacityKeyframe = selectedKeyframe?.objectId === selectedId && selectedKeyframe.property === 'opacity'
    ? selected?.opacityKeyframes?.find(keyframe => keyframe.id === selectedKeyframe.keyframeId)
    : null;
  const selectedPositionAxis = selectedKeyframe?.objectId === selectedId && /^position[XYZ]$/.test(selectedKeyframe.property)
    ? selectedKeyframe.property.at(-1).toLowerCase()
    : null;
  const selectedPositionAxisKeyframe = selectedPositionAxis
    ? selected?.[`${selectedKeyframe.property}Keyframes`]?.find(keyframe => keyframe.id === selectedKeyframe.keyframeId)
    : null;
  const selectedRotationKeyframe = selectedKeyframe?.objectId === selectedId && selectedKeyframe.property === 'rotation'
    ? selected?.rotationKeyframes?.find(keyframe => keyframe.id === selectedKeyframe.keyframeId)
    : null;
  const selectedRotationAxis = selectedKeyframe?.objectId === selectedId && /^rotation[XYZ]$/.test(selectedKeyframe.property)
    ? selectedKeyframe.property.at(-1).toLowerCase()
    : null;
  const selectedRotationAxisKeyframe = selectedRotationAxis
    ? selected?.[`${selectedKeyframe.property}Keyframes`]?.find(keyframe => keyframe.id === selectedKeyframe.keyframeId)
    : null;
  const selectedScaleKeyframe = selectedKeyframe?.objectId === selectedId && selectedKeyframe.property === 'scale'
    ? selected?.scaleKeyframes?.find(keyframe => keyframe.id === selectedKeyframe.keyframeId)
    : null;
  const selectedScaleAxis = selectedKeyframe?.objectId === selectedId && /^scale[XYZ]$/.test(selectedKeyframe.property)
    ? selectedKeyframe.property.at(-1).toLowerCase()
    : null;
  const selectedScaleAxisKeyframe = selectedScaleAxis
    ? selected?.[`${selectedKeyframe.property}Keyframes`]?.find(keyframe => keyframe.id === selectedKeyframe.keyframeId)
    : null;
  const livePosition = selected ? positionAtTick(selected, previewTick) : null;
  const liveRotation = selected ? rotationAtTick(selected, previewTick) : null;
  const liveScale = selected ? scaleAtTick(selected, previewTick) : null;
  const liveOpacity = selected ? opacityAtTick(selected, previewTick) : 1;
  const inspectorPosition = selectedPositionAxisKeyframe
    ? { ...Object.fromEntries(Object.entries(livePosition).map(([axis, value]) => [axis, displayNumber(value)])), [selectedPositionAxis]: selectedPositionAxisKeyframe.value }
    : selectedPositionKeyframe?.value
    || ((selected?.separatePositionDimensions
      ? selected.positionXKeyframes?.length || selected.positionYKeyframes?.length || selected.positionZKeyframes?.length
      : selected?.positionKeyframes?.length)
      ? { x: displayNumber(livePosition.x), y: displayNumber(livePosition.y), z: displayNumber(livePosition.z) }
      : selected?.position);
  const inspectorRotation = selectedRotationAxisKeyframe
    ? { ...Object.fromEntries(Object.entries(liveRotation).map(([axis, value]) => [axis, displayNumber(value)])), [selectedRotationAxis]: selectedRotationAxisKeyframe.value }
    : selectedRotationKeyframe?.value
    || ((selected?.separateRotationDimensions
      ? selected.rotationXKeyframes?.length || selected.rotationYKeyframes?.length || selected.rotationZKeyframes?.length
      : selected?.rotationKeyframes?.length)
      ? { x: displayNumber(liveRotation.x), y: displayNumber(liveRotation.y), z: displayNumber(liveRotation.z) }
      : selected?.rotation);
  const inspectorScale = selectedScaleAxisKeyframe
    ? { ...Object.fromEntries(Object.entries(liveScale).map(([axis, value]) => [axis, displayNumber(value)])), [selectedScaleAxis]: selectedScaleAxisKeyframe.value }
    : selectedScaleKeyframe?.value
    || ((selected?.separateScaleDimensions
      ? selected.scaleXKeyframes?.length || selected.scaleYKeyframes?.length || selected.scaleZKeyframes?.length
      : selected?.scaleKeyframes?.length)
      ? { x: displayNumber(liveScale.x), y: displayNumber(liveScale.y), z: displayNumber(liveScale.z) }
      : selected?.scale);
  const inspectorOpacity = selectedOpacityKeyframe
    ? selectedOpacityKeyframe.value
    : (selected?.opacityKeyframes?.length ? displayNumber(liveOpacity) : selected?.opacity);
  const setEffectField = (key, value) => setEffect(current => ({ ...current, [key]: value }));
  const updateSelected = patch => setEffect(current => ({
    ...current,
    objects: current.objects.map(object => object.id === selectedId ? { ...object, ...patch } : object),
  }));
  const updateObjectRange = useCallback((objectId, startTick, endTick, shiftedKeyframes = null) => {
    const keyframeCollision = shiftedKeyframes
      && Object.values(shiftedKeyframes).some(hasDuplicateKeyframeTimes);
    setEffect(current => ({
      ...current,
      objects: current.objects.map(object => object.id === objectId
        ? keyframeCollision
          ? object
          : {
            ...object,
            startTick,
            endTick,
            ...uniqueKeyframeCollections(shiftedKeyframes),
          }
        : object),
    }));
  }, []);
  const updateObjectPositionKeyframes = useCallback((objectId, positionKeyframes) => {
    setEffect(current => ({
      ...current,
      objects: current.objects.map(object => object.id === objectId
        ? hasDuplicateKeyframeTimes(positionKeyframes)
          ? object
          : { ...object, positionKeyframes: uniqueKeyframesByTime(positionKeyframes) }
        : object),
    }));
  }, []);
  const updateObjectOpacityKeyframes = useCallback((objectId, opacityKeyframes) => {
    setEffect(current => ({
      ...current,
      objects: current.objects.map(object => object.id === objectId
        ? hasDuplicateKeyframeTimes(opacityKeyframes)
          ? object
          : { ...object, opacityKeyframes: uniqueKeyframesByTime(opacityKeyframes) }
        : object),
    }));
  }, []);
  const updateObjectKeyframes = useCallback((objectId, property, keyframes) => {
    setEffect(current => ({
      ...current,
      objects: current.objects.map(object => object.id === objectId
        ? hasDuplicateKeyframeTimes(keyframes)
          ? object
          : { ...object, [`${property}Keyframes`]: uniqueKeyframesByTime(keyframes) }
        : object),
    }));
  }, []);
  const loadObjectPosition = useCallback((objectId, position) => {
    setEffect(current => ({
      ...current,
      objects: current.objects.map(object => object.id === objectId
        ? { ...object, position }
        : object),
    }));
  }, []);
  const loadObjectOpacity = useCallback((objectId, opacity) => {
    setEffect(current => ({
      ...current,
      objects: current.objects.map(object => object.id === objectId
        ? { ...object, opacity }
        : object),
    }));
  }, []);
  const loadObjectRotation = useCallback((objectId, rotation) => {
    setEffect(current => ({
      ...current,
      objects: current.objects.map(object => object.id === objectId ? { ...object, rotation } : object),
    }));
  }, []);
  const loadObjectScale = useCallback((objectId, scale) => {
    setEffect(current => ({
      ...current,
      objects: current.objects.map(object => object.id === objectId ? { ...object, scale } : object),
    }));
  }, []);

  useEffect(() => {
    setSelectedKeyframes(current => current.filter(selection => {
      const object = effect.objects.find(candidate => candidate.id === selection.objectId);
      const keyframes = object?.[`${selection.property}Keyframes`];
      return keyframes?.some(keyframe => keyframe.id === selection.keyframeId);
    }));
  }, [effect.objects]);

  const selectObject = objectId => {
    setSelectedId(objectId);
    setSelectedKeyframes([]);
  };

  const toggleSeparatePosition = (objectId, separate) => {
    setSelectedKeyframes([]);
    setEffect(current => ({
      ...current,
      objects: current.objects.map(object => {
        if (object.id !== objectId) return object;
        if (separate) {
          const combined = orderedPositionKeyframes(object);
          const axisKeys = axis => combined.map(keyframe => ({
            id: `${axis}_${keyframe.id}`,
            tick: String(keyframe.tick),
            value: String(keyframe.value[axis]),
            easing: keyframe.easing,
          }));
          return {
            ...object,
            separatePositionDimensions: true,
            positionXKeyframes: axisKeys('x'),
            positionYKeyframes: axisKeys('y'),
            positionZKeyframes: axisKeys('z'),
          };
        }
        const ticks = [...new Set([
          ...(object.positionXKeyframes || []).map(keyframe => timelineTime(keyframe.tick)),
          ...(object.positionYKeyframes || []).map(keyframe => timelineTime(keyframe.tick)),
          ...(object.positionZKeyframes || []).map(keyframe => timelineTime(keyframe.tick)),
        ])].sort((first, second) => first - second);
        const positionKeyframes = ticks.map((tick, index) => {
          const value = positionAtTick({ ...object, separatePositionDimensions: true }, tick);
          const source = [...(object.positionXKeyframes || []), ...(object.positionYKeyframes || []), ...(object.positionZKeyframes || [])]
            .find(keyframe => sameTimelineTime(keyframe.tick, tick));
          return {
            id: `position_${index + 1}`,
            tick: String(tick),
            value: Object.fromEntries(['x', 'y', 'z'].map(axis => [axis, String(value[axis])])),
            easing: normalizedEasing(source?.easing),
          };
        });
        return { ...object, separatePositionDimensions: false, positionKeyframes };
      }),
    }));
  };

  const toggleSeparateTransform = (objectId, property, separate) => {
    if (!['rotation', 'scale'].includes(property)) return;
    const capitalized = property[0].toUpperCase() + property.slice(1);
    const separateField = `separate${capitalized}Dimensions`;
    const fallback = property === 'scale' ? { x: 1, y: 1, z: 1 } : { x: 0, y: 0, z: 0 };
    setSelectedKeyframes([]);
    setEffect(current => ({
      ...current,
      objects: current.objects.map(object => {
        if (object.id !== objectId) return object;
        if (separate) {
          const combined = orderedVectorKeyframes(object, property, fallback);
          const axisKeys = axis => combined.map(keyframe => ({
            id: `${axis}_${keyframe.id}`,
            tick: String(keyframe.tick),
            value: String(keyframe.value[axis]),
            easing: keyframe.easing,
          }));
          return {
            ...object,
            [separateField]: true,
            [`${property}XKeyframes`]: axisKeys('x'),
            [`${property}YKeyframes`]: axisKeys('y'),
            [`${property}ZKeyframes`]: axisKeys('z'),
          };
        }

        const axisKeyframes = ['X', 'Y', 'Z'].flatMap(axis => object[`${property}${axis}Keyframes`] || []);
        const ticks = [...new Set(axisKeyframes.map(keyframe => timelineTime(keyframe.tick)))]
          .sort((first, second) => first - second);
        const keyframes = ticks.map((tick, index) => {
          const value = transformAtTick({ ...object, [separateField]: true }, property, fallback, tick);
          const source = axisKeyframes.find(keyframe => sameTimelineTime(keyframe.tick, tick));
          return {
            id: `${property}_${index + 1}`,
            tick: String(tick),
            value: Object.fromEntries(['x', 'y', 'z'].map(axis => [axis, String(value[axis])])),
            easing: normalizedEasing(source?.easing),
          };
        });
        return { ...object, [separateField]: false, [`${property}Keyframes`]: keyframes };
      }),
    }));
  };

  const updateSelectedPosition = (position, changedAxis) => {
    if (!selected) return;
    if (selected.separatePositionDimensions) {
      const property = `position${changedAxis.toUpperCase()}`;
      const keyframes = selected[`${property}Keyframes`] || [];
      const selectedAxisKey = selectedKeyframe?.property === property
        ? keyframes.find(keyframe => keyframe.id === selectedKeyframe.keyframeId)
        : null;
      const tick = clamp(timelineTime(previewTick), 0, Math.max(1, Math.floor(number(effect.durationTicks, 40))));
      const existing = selectedAxisKey || keyframes.find(keyframe => sameTimelineTime(keyframe.tick, tick));
      const keyframeId = existing?.id || makeKeyframeId(keyframes, property);
      const nextKeyframes = existing
        ? keyframes.map(keyframe => keyframe.id === keyframeId ? { ...keyframe, value: position[changedAxis] } : keyframe)
        : [...keyframes, { id: keyframeId, tick: String(tick), value: position[changedAxis], easing: normalizedEasing() }];
      updateObjectKeyframes(selected.id, property, nextKeyframes);
      updateSelected({ position });
      setSelectedKeyframes([{ objectId: selected.id, property, keyframeId }]);
      return;
    }
    let keyframeId = selectedPositionKeyframe?.id || null;
    let addKeyframe = false;
    if (!keyframeId && selected.positionKeyframes?.length) {
      const tick = clamp(timelineTime(previewTick), 0, Math.max(1, Math.floor(number(effect.durationTicks, 40))));
      const existing = selected.positionKeyframes.find(keyframe => sameTimelineTime(keyframe.tick, tick));
      keyframeId = existing?.id || makeKeyframeId(selected.positionKeyframes, 'position');
      addKeyframe = !existing;
      setSelectedKeyframes([{ objectId: selected.id, property: 'position', keyframeId }]);
    }
    setEffect(current => ({
      ...current,
      objects: current.objects.map(object => {
        if (object.id !== selectedId) return object;
        let positionKeyframes = object.positionKeyframes || [];
        if (keyframeId) {
          if (addKeyframe) {
            positionKeyframes = [...positionKeyframes, {
              id: keyframeId,
              tick: String(clamp(timelineTime(previewTick), 0, Math.max(1, Math.floor(number(current.durationTicks, 40))))),
              value: position,
              easing: normalizedEasing(),
            }];
          } else {
            positionKeyframes = positionKeyframes.map(keyframe => (
              keyframe.id === keyframeId ? { ...keyframe, value: position } : keyframe
            ));
          }
        }
        return { ...object, position, positionKeyframes };
      }),
    }));
  };

  const updateSelectedOpacity = opacity => {
    if (!selected) return;
    let keyframeId = selectedOpacityKeyframe?.id || null;
    let addKeyframe = false;
    if (!keyframeId && selected.opacityKeyframes?.length) {
      const tick = clamp(timelineTime(previewTick), 0, Math.max(1, Math.floor(number(effect.durationTicks, 40))));
      const existing = selected.opacityKeyframes.find(keyframe => sameTimelineTime(keyframe.tick, tick));
      keyframeId = existing?.id || makeKeyframeId(selected.opacityKeyframes, 'opacity');
      addKeyframe = !existing;
      setSelectedKeyframes([{ objectId: selected.id, property: 'opacity', keyframeId }]);
    }
    setEffect(current => ({
      ...current,
      objects: current.objects.map(object => {
        if (object.id !== selectedId) return object;
        let opacityKeyframes = object.opacityKeyframes || [];
        if (keyframeId) {
          if (addKeyframe) {
            opacityKeyframes = [...opacityKeyframes, {
              id: keyframeId,
              tick: String(clamp(timelineTime(previewTick), 0, Math.max(1, Math.floor(number(current.durationTicks, 40))))),
              value: opacity,
              easing: normalizedEasing(),
            }];
          } else {
            opacityKeyframes = opacityKeyframes.map(keyframe => (
              keyframe.id === keyframeId ? { ...keyframe, value: opacity } : keyframe
            ));
          }
        }
        return { ...object, opacity, opacityKeyframes };
      }),
    }));
  };

  const updateSelectedVectorProperty = (property, value, changedAxis) => {
    if (!selected) return;
    const separateField = `separate${property[0].toUpperCase()}${property.slice(1)}Dimensions`;
    if (selected[separateField] && changedAxis) {
      const axisProperty = `${property}${changedAxis.toUpperCase()}`;
      const axisKeyframes = selected[`${axisProperty}Keyframes`] || [];
      const selectedAxisKey = selectedKeyframe?.property === axisProperty
        ? axisKeyframes.find(keyframe => keyframe.id === selectedKeyframe.keyframeId)
        : null;
      const tick = clamp(timelineTime(previewTick), 0, Math.max(1, Math.floor(number(effect.durationTicks, 40))));
      const existing = selectedAxisKey || axisKeyframes.find(keyframe => sameTimelineTime(keyframe.tick, tick));
      const keyframeId = existing?.id || makeKeyframeId(axisKeyframes, axisProperty);
      const nextKeyframes = existing
        ? axisKeyframes.map(keyframe => keyframe.id === keyframeId ? { ...keyframe, value: value[changedAxis] } : keyframe)
        : [...axisKeyframes, { id: keyframeId, tick: String(tick), value: value[changedAxis], easing: normalizedEasing() }];
      updateObjectKeyframes(selected.id, axisProperty, nextKeyframes);
      updateSelected({ [property]: value });
      setSelectedKeyframes([{ objectId: selected.id, property: axisProperty, keyframeId }]);
      return;
    }
    const keyframes = selected[`${property}Keyframes`] || [];
    const selectedPropertyKey = selectedKeyframe?.property === property
      ? keyframes.find(keyframe => keyframe.id === selectedKeyframe.keyframeId)
      : null;
    let keyframeId = selectedPropertyKey?.id || null;
    let addKeyframe = false;
    if (!keyframeId && keyframes.length) {
      const tick = clamp(timelineTime(previewTick), 0, Math.max(1, Math.floor(number(effect.durationTicks, 40))));
      const existing = keyframes.find(keyframe => sameTimelineTime(keyframe.tick, tick));
      keyframeId = existing?.id || makeKeyframeId(keyframes, property);
      addKeyframe = !existing;
      setSelectedKeyframes([{ objectId: selected.id, property, keyframeId }]);
    }
    setEffect(current => ({
      ...current,
      objects: current.objects.map(object => {
        if (object.id !== selectedId) return object;
        let nextKeyframes = object[`${property}Keyframes`] || [];
        if (keyframeId) {
          if (addKeyframe) {
            nextKeyframes = [...nextKeyframes, {
              id: keyframeId,
              tick: String(clamp(timelineTime(previewTick), 0, Math.max(1, Math.floor(number(current.durationTicks, 40))))),
              value,
              easing: normalizedEasing(),
            }];
          } else {
            nextKeyframes = nextKeyframes.map(keyframe => keyframe.id === keyframeId ? { ...keyframe, value } : keyframe);
          }
        }
        return { ...object, [property]: value, [`${property}Keyframes`]: nextKeyframes };
      }),
    }));
  };

  const addPlane = () => {
    setEffect(current => {
      const plane = newPlane(current.objects, current.durationTicks);
      setSelectedId(plane.id);
      setSelectedKeyframes([]);
      return { ...current, objects: [...current.objects, plane] };
    });
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setEffect(current => {
      const objects = current.objects.filter(object => object.id !== selectedId);
      setSelectedId(objects[0]?.id || null);
      setSelectedKeyframes([]);
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
      const objects = effect.objects.map(object => runtimePlane(id, object));
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
        content: JSON.stringify({ version: 4, durationTicks, objects }, null, 2),
      });
      injections.push({ type: 'created-file', file: runtimeFile });

      const registryLine = `        VfxRegistry.register("${id}", ${durationTicks});`;
      await invoke('inject_marker', {
        file: `${JAVA_BASE}/vfx/VfxRegistry.java`, marker: 'YCS_Vfx_Definitions', content: registryLine,
      });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/vfx/VfxRegistry.java`, marker: 'YCS_Vfx_Definitions', content: registryLine });

      const payload = {
        ...effect,
        version: 4,
        id,
        name: effect.name || id,
        durationTicks,
        objects: effect.objects.map((object, index) => ({
          ...object,
          startTick: String(objects[index].startTick),
          endTick: String(objects[index].endTick),
          positionKeyframes: authoredPositionKeyframes(object),
          separatePositionDimensions: Boolean(object.separatePositionDimensions),
          positionXKeyframes: authoredScalarKeyframes(object, 'positionX', number(object.position?.x)),
          positionYKeyframes: authoredScalarKeyframes(object, 'positionY', number(object.position?.y)),
          positionZKeyframes: authoredScalarKeyframes(object, 'positionZ', number(object.position?.z)),
          separateRotationDimensions: Boolean(object.separateRotationDimensions),
          rotationKeyframes: authoredVectorKeyframes(object, 'rotation'),
          rotationXKeyframes: authoredScalarKeyframes(object, 'rotationX', number(object.rotation?.x)),
          rotationYKeyframes: authoredScalarKeyframes(object, 'rotationY', number(object.rotation?.y)),
          rotationZKeyframes: authoredScalarKeyframes(object, 'rotationZ', number(object.rotation?.z)),
          separateScaleDimensions: Boolean(object.separateScaleDimensions),
          scaleKeyframes: authoredVectorKeyframes(object, 'scale', { x: 1, y: 1, z: 1 }),
          scaleXKeyframes: authoredScalarKeyframes(object, 'scaleX', number(object.scale?.x, 1)),
          scaleYKeyframes: authoredScalarKeyframes(object, 'scaleY', number(object.scale?.y, 1)),
          scaleZKeyframes: authoredScalarKeyframes(object, 'scaleZ', number(object.scale?.z, 1)),
          opacityKeyframes: authoredOpacityKeyframes(object),
        })),
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

  useTitlebarActions({
    active: isActive,
    buttons: [
      { id: 'save', icon: 'save', title: saving ? 'Saving VFX' : 'Save VFX', disabled: saving, onClick: handleSave },
      { id: 'cancel', icon: 'cancel', title: 'Cancel', disabled: saving, onClick: onBack },
      { id: 'delete', icon: 'delete', title: 'Delete VFX', danger: true, disabled: saving || !effectId, onClick: handleRemove },
    ],
  });

  return (
    <div className="vfx-editor">
      {status && <div className={`vfx-editor-status ${status.ok ? 'status-ok' : 'status-error'}`} role="status">{status.message}</div>}

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
                <button key={object.id} className={`vfx-object-row ${selectedId === object.id ? 'selected' : ''}`} onClick={() => selectObject(object.id)}>
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
                <FieldRow label={selectedPositionAxisKeyframe ? `${selectedPositionAxis.toUpperCase()} Position Key` : selectedPositionKeyframe ? "Position Key" : "Position"}><VectorFields value={inspectorPosition} onChange={updateSelectedPosition} /></FieldRow>
                <FieldRow label={selectedRotationAxisKeyframe ? `${selectedRotationAxis.toUpperCase()} Rotation Key` : selectedRotationKeyframe ? "Rotation Key" : "Rotation"}><VectorFields value={inspectorRotation} onChange={(rotation, axis) => updateSelectedVectorProperty('rotation', rotation, axis)} /></FieldRow>
                <FieldRow label={selectedScaleAxisKeyframe ? `${selectedScaleAxis.toUpperCase()} Scale Key` : selectedScaleKeyframe ? "Scale Key" : "Scale"}><VectorFields value={inspectorScale} onChange={(scale, axis) => updateSelectedVectorProperty('scale', scale, axis)} /></FieldRow>
                <FieldRow label="Base Size"><div className="vfx-pair"><NumberInput value={selected.width} onChange={width => updateSelected({ width })} /><NumberInput value={selected.height} onChange={height => updateSelected({ height })} /></div></FieldRow>
                <FieldRow label="Color"><div className="vfx-pair"><ColorField value={selected.color} onChange={color => updateSelected({ color })} /></div></FieldRow>
                <FieldRow label={selectedOpacityKeyframe ? "Opacity Key" : "Opacity"}><NumberInput value={inspectorOpacity} onChange={updateSelectedOpacity} /></FieldRow>
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
          <Timeline
            effect={effect}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdateRange={updateObjectRange}
            onUpdatePositionKeyframes={updateObjectPositionKeyframes}
            onUpdateOpacityKeyframes={updateObjectOpacityKeyframes}
            onUpdateKeyframes={updateObjectKeyframes}
            onLoadPosition={loadObjectPosition}
            onLoadOpacity={loadObjectOpacity}
            onLoadRotation={loadObjectRotation}
            onLoadScale={loadObjectScale}
            onToggleSeparatePosition={toggleSeparatePosition}
            onToggleSeparateTransform={toggleSeparateTransform}
            selectedKeyframes={selectedKeyframes}
            onSelectKeyframes={setSelectedKeyframes}
            previewTick={previewTick}
            onPreviewTick={setPreviewTick}
            playing={playing}
            onPlaying={setPlaying}
          />
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

export default function VfxLanding({ isActive = false }) {
  const [effects, setEffects] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  useTitlebarActions({
    active: isActive,
    enabled: !creating && !editing,
    search,
    onSearchChange: setSearch,
    onAdd: () => { setEditing(null); setCreating(true); },
  });

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

  if (creating) return <VfxEditor isActive={isActive} onBack={() => { setCreating(false); reload(); }} />;
  if (editing) return <VfxEditor isActive={isActive} effectId={editing} onBack={() => { setEditing(null); reload(); }} />;

  const filtered = effects.filter(effect => `${effect.name || ''} ${effect.id || ''}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="vfx-landing">
      <div className="vfx-list">
        {filtered.map(effect => <VfxRow key={effect.id} effect={effect} onEdit={() => setEditing(effect.id)} onDelete={() => deleteEffect(effect)} />)}
      </div>
    </div>
  );
}
