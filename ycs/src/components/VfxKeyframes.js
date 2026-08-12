const KEYFRAME_TIME_EPSILON = 0.0005;

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function vector(value, fallback = { x: 0, y: 0, z: 0 }) {
  return {
    x: number(value?.x, fallback.x),
    y: number(value?.y, fallback.y),
    z: number(value?.z, fallback.z),
  };
}

export function linearEasing() {
  return {
    type: 'cubic',
    mode: 'inOut',
    amount: 1,
    x1: 1 / 3,
    y1: 1 / 3,
    x2: 2 / 3,
    y2: 2 / 3,
  };
}

export function normalizeEasing(easing) {
  const supportedTypes = [
    'cubic',
    'step',
    'sine',
    'quad',
    'cubicPower',
    'quart',
    'quint',
    'expo',
    'circ',
    'back',
    'elastic',
    'bounce',
  ];
  const type = supportedTypes.includes(easing?.type) ? easing.type : 'cubic';
  const mode = ['in', 'out', 'inOut'].includes(easing?.mode) ? easing.mode : 'inOut';
  const fallbackAmount = type === 'step' ? 2 : type === 'back' ? 1.70158 : 1;
  const maximumAmount = type === 'step' ? 64 : type === 'back' ? 10 : 4;
  return {
    type,
    mode,
    amount: clamp(number(easing?.amount, fallbackAmount), 0, maximumAmount),
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

function elasticProgress(progress, mode, amount) {
  if (progress === 0 || progress === 1) return progress;
  const multiplier = amount === 0 ? 1 : amount;
  if (mode === 'in') {
    const period = (2 * Math.PI) / 3;
    return -(2 ** ((10 * progress) - 10))
      * Math.sin(((10 * progress) - 10.75) * period * multiplier);
  }
  if (mode === 'inOut') {
    const period = (2 * Math.PI) / 4.5;
    return progress < 0.5
      ? -((2 ** ((20 * progress) - 10))
          * Math.sin(((20 * progress) - 11.125) * period * multiplier)) / 2
      : ((2 ** ((-20 * progress) + 10))
          * Math.sin(((20 * progress) - 11.125) * period * multiplier)) / 2 + 1;
  }
  const period = (2 * Math.PI) / 3;
  return (2 ** (-10 * progress))
    * Math.sin(((10 * progress) - 0.75) * period * multiplier) + 1;
}

function powerProgress(progress, mode, power) {
  if (mode === 'in') return progress ** power;
  if (mode === 'out') return 1 - ((1 - progress) ** power);
  return progress < 0.5
    ? ((2 ** (power - 1)) * (progress ** power))
    : 1 - (((-2 * progress + 2) ** power) / 2);
}

function backProgress(progress, mode, amount) {
  const overshoot = amount === 0 ? 1.70158 : amount;
  if (mode === 'in') return (overshoot + 1) * (progress ** 3) - overshoot * (progress ** 2);
  if (mode === 'out') {
    return 1 + (overshoot + 1) * ((progress - 1) ** 3) + overshoot * ((progress - 1) ** 2);
  }
  const scaled = overshoot * 1.525;
  return progress < 0.5
    ? (((2 * progress) ** 2) * (((scaled + 1) * 2 * progress) - scaled)) / 2
    : ((((2 * progress - 2) ** 2) * (((scaled + 1) * (2 * progress - 2)) + scaled)) + 2) / 2;
}

export function easingProgress(progress, easing) {
  const curve = normalizeEasing(easing);
  if (curve.type === 'step') {
    const steps = Math.max(2, Math.round(curve.amount));
    return progress < 1 ? Math.floor(progress * steps) / steps : 1;
  }
  if (curve.type === 'sine') {
    if (curve.mode === 'in') return 1 - Math.cos((progress * Math.PI) / 2);
    if (curve.mode === 'out') return Math.sin((progress * Math.PI) / 2);
    return -(Math.cos(Math.PI * progress) - 1) / 2;
  }
  if (curve.type === 'quad') return powerProgress(progress, curve.mode, 2);
  if (curve.type === 'cubicPower') return powerProgress(progress, curve.mode, 3);
  if (curve.type === 'quart') return powerProgress(progress, curve.mode, 4);
  if (curve.type === 'quint') return powerProgress(progress, curve.mode, 5);
  if (curve.type === 'expo') {
    if (progress === 0 || progress === 1) return progress;
    if (curve.mode === 'in') return 2 ** ((10 * progress) - 10);
    if (curve.mode === 'out') return 1 - (2 ** (-10 * progress));
    return progress < 0.5
      ? (2 ** ((20 * progress) - 10)) / 2
      : (2 - (2 ** ((-20 * progress) + 10))) / 2;
  }
  if (curve.type === 'circ') {
    if (curve.mode === 'in') return 1 - Math.sqrt(1 - (progress ** 2));
    if (curve.mode === 'out') return Math.sqrt(1 - ((progress - 1) ** 2));
    return progress < 0.5
      ? (1 - Math.sqrt(1 - ((2 * progress) ** 2))) / 2
      : (Math.sqrt(1 - ((-2 * progress + 2) ** 2)) + 1) / 2;
  }
  if (curve.type === 'back') return backProgress(progress, curve.mode, curve.amount);
  if (curve.type === 'bounce') {
    const bounce = bounceProgress(progress, curve.mode);
    return progress + ((bounce - progress) * curve.amount);
  }
  if (curve.type === 'elastic') return elasticProgress(progress, curve.mode, curve.amount);
  let low = 0;
  let high = 1;
  for (let index = 0; index < 14; index += 1) {
    const amount = (low + high) / 2;
    if (cubicCoordinate(0, curve.x1, curve.x2, 1, amount) < progress) low = amount;
    else high = amount;
  }
  return cubicCoordinate(0, curve.y1, curve.y2, 1, (low + high) / 2);
}

export function propertyKeyframeFields(object, property) {
  if (property === 'opacity') return ['opacity'];
  const separateField = `separate${property[0].toUpperCase()}${property.slice(1)}Dimensions`;
  return object?.[separateField]
    ? [`${property}X`, `${property}Y`, `${property}Z`]
    : [property];
}

export function keyframesForField(object, field) {
  return Array.isArray(object?.[`${field}Keyframes`]) ? object[`${field}Keyframes`] : [];
}

export function sameKeyframeTick(first, second) {
  return Math.abs(number(first) - number(second)) <= KEYFRAME_TIME_EPSILON;
}

export function hasPropertyKeyframeAtTick(object, property, tick) {
  return propertyKeyframeFields(object, property).every(field => (
    keyframesForField(object, field).some(keyframe => sameKeyframeTick(keyframe.tick, tick))
  ));
}

export function makeKeyframeId(keyframes, prefix) {
  let index = keyframes.length + 1;
  while (keyframes.some(keyframe => keyframe.id === `${prefix}_${index}`)) index += 1;
  return `${prefix}_${index}`;
}

function orderedKeyframes(object, field, fallback, scalar) {
  return keyframesForField(object, field)
    .map(keyframe => ({
      ...keyframe,
      tick: number(keyframe.tick),
      value: scalar ? number(keyframe.value, fallback) : vector(keyframe.value, fallback),
      easing: normalizeEasing(keyframe.easing),
    }))
    .sort((first, second) => first.tick - second.tick);
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
    const progress = easingProgress(clamp((tick - previous.tick) / span, 0, 1), previous.easing);
    return previous.value + ((next.value - previous.value) * progress);
  }
  return last.value;
}

function vectorAtTick(keyframes, fallback, tick) {
  const base = vector(fallback);
  if (keyframes.length === 0) return base;
  if (tick <= keyframes[0].tick) return keyframes[0].value;
  const last = keyframes[keyframes.length - 1];
  if (tick >= last.tick) return last.value;
  for (let index = 1; index < keyframes.length; index += 1) {
    const next = keyframes[index];
    if (tick > next.tick) continue;
    const previous = keyframes[index - 1];
    const span = Math.max(KEYFRAME_TIME_EPSILON, next.tick - previous.tick);
    const progress = easingProgress(clamp((tick - previous.tick) / span, 0, 1), previous.easing);
    return {
      x: previous.value.x + ((next.value.x - previous.value.x) * progress),
      y: previous.value.y + ((next.value.y - previous.value.y) * progress),
      z: previous.value.z + ((next.value.z - previous.value.z) * progress),
    };
  }
  return last.value;
}

export function propertyValueAtTick(object, property, tick) {
  if (property === 'opacity') {
    return clamp(scalarAtTick(
      orderedKeyframes(object, 'opacity', number(object?.opacity, 1), true),
      number(object?.opacity, 1),
      tick,
    ), 0, 1);
  }

  const fallback = property === 'scale'
    ? { x: 1, y: 1, z: 1 }
    : { x: 0, y: 0, z: 0 };
  const base = vector(object?.[property], fallback);
  const fields = propertyKeyframeFields(object, property);
  if (fields.length === 1) {
    return vectorAtTick(orderedKeyframes(object, property, base, false), base, tick);
  }
  return {
    x: scalarAtTick(orderedKeyframes(object, fields[0], base.x, true), base.x, tick),
    y: scalarAtTick(orderedKeyframes(object, fields[1], base.y, true), base.y, tick),
    z: scalarAtTick(orderedKeyframes(object, fields[2], base.z, true), base.z, tick),
  };
}
