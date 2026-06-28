/**
 * Item Store — In-memory cache with JSON-file-backed persistence.
 * Delegates disk I/O to entityFiles.js.
 * Components read/write through this store for cross-component reactivity.
 */
import { loadEntityFile, saveEntityFile, deleteEntityFile, listEntityFiles } from '../entityFiles';

const cache = {};
const listeners = {};

function notify(itemId) {
  if (listeners[itemId]) {
    listeners[itemId].forEach(fn => fn(cache[itemId]));
  }
}

export function subscribe(itemId, callback) {
  if (!listeners[itemId]) listeners[itemId] = new Set();
  listeners[itemId].add(callback);
  return () => listeners[itemId]?.delete(callback);
}

export async function loadItem(itemId) {
  if (cache[itemId]) return cache[itemId];
  const data = await loadEntityFile('item', itemId);
  if (data) {
    cache[itemId] = data;
    return data;
  }
  return null;
}

export async function saveItem(itemId, data) {
  cache[itemId] = data;
  await saveEntityFile('item', itemId, data);
  notify(itemId);
}

export async function deleteItemFile(itemId) {
  await deleteEntityFile('item', itemId);
  delete cache[itemId];
}

export async function listItems() {
  return await listEntityFiles('item');
}

export function updateSection(itemId, section, data) {
  if (!cache[itemId]) cache[itemId] = {};
  cache[itemId][section] = data;
  notify(itemId);
}

export function getSection(itemId, section) {
  return cache[itemId]?.[section] ?? null;
}

export function getCached(itemId) {
  return cache[itemId] ?? null;
}

export function setCached(itemId, data) {
  cache[itemId] = data;
  notify(itemId);
}

export function evict(itemId) {
  delete cache[itemId];
}

export const DEFAULT_ITEM = {
  displayName: '',
  id: '',
  constName: '',
  customConstName: false,
  multipleStates: false,
  stateCount: 2,
  holdingMode: 'none',
  textureName: '',
  states: [
    { holdingMode: 'none', textureName: '', modelJson: '' },
    { holdingMode: 'none', textureName: '', modelJson: '' },
  ],
  modelJson: '',
  stackSize: '64',
  isTool: false,
  toolType: 'Sword',
  tier: 'Iron',
  damage: '3',
  speed: '-2.4',
  isFood: false,
  foodNutrition: '3',
  foodSaturation: '0.3',
  foodAlwaysEdible: false,
  isFuel: false,
  burnTime: '1600',
  hasDurability: false,
  durability: '100',
  hasUseDuration: false,
  useDuration: '72000',
  useAnimation: 'NONE',
  noSlowdown: false,
  hasTooltip: false,
  tooltipNormal: '',
  hasHiddenTooltip: false,
  tooltipHidden: '',
  tooltipShiftHint: '',
  useDefaultShiftHint: true,
  creativeTab: '',
  tags: '',
  hasRecipe: false,
  recipeType: 'shaped',
  customClass: '',
  recipe: null,
  selectedTags: [],
  dataComponents: [],
  enabledMethods: [],
  blockGraphs: {},
  modelJsonData: {},
};
