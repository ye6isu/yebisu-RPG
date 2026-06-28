/**
 * Texture Store — In-memory cache with JSON-file-backed persistence.
 * Stored at: resources/assets/yebisurpg/ycs/textures.json
 */
import { loadTexturesFile, saveTexturesFile } from '../entityFiles';

let cache = null;
const listeners = new Set();

function notify() {
  listeners.forEach(fn => fn(cache));
}

export function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export async function loadTextures() {
  if (cache) return cache;
  cache = await loadTexturesFile();
  return cache;
}

export async function saveTextures(textures) {
  cache = textures;
  await saveTexturesFile(textures);
  notify();
}

export function getCached() {
  return cache ?? [];
}

export function setCached(textures) {
  cache = textures;
  notify();
}
