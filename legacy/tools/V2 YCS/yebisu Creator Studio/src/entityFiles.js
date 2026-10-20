const YCS_BASE = 'resources/assets/yebisurpg/ycs';

const ENTITY_PATHS = {
  item: `${YCS_BASE}/items`,
  texture: `${YCS_BASE}/textures.json`,
  tab: `${YCS_BASE}/tabs`,
};

function fe() {
  return window.electronAPI?.fileEngine;
}

export async function loadEntityFile(type, id) {
  const f = fe();
  if (!f) return null;
  const path = `${ENTITY_PATHS[type]}/${id}.json`;
  try {
    const r = await f.json.read(path);
    return r?.ok ? r.data : null;
  } catch {
    return null;
  }
}

export async function saveEntityFile(type, id, data) {
  const f = fe();
  if (!f) throw new Error('File engine not available');
  const dir = ENTITY_PATHS[type];
  const path = `${dir}/${id}.json`;
  const r = await f.json.write(path, data);
  if (r && !r.ok) throw new Error(r.error || 'Failed to save entity file');
}

export async function deleteEntityFile(type, id) {
  const f = fe();
  if (!f) throw new Error('File engine not available');
  const path = `${ENTITY_PATHS[type]}/${id}.json`;
  try {
    await f.files.delete(path);
  } catch {}
}

export async function renameEntityFile(type, oldId, newId) {
  if (oldId === newId) return;
  const data = await loadEntityFile(type, oldId);
  if (data) {
    await saveEntityFile(type, newId, data);
    await deleteEntityFile(type, oldId);
  }
}

export async function listEntityFiles(type) {
  const f = fe();
  if (!f) return [];
  const dir = ENTITY_PATHS[type];
  try {
    const r = await f.files.list(dir, '*.json');
    if (r?.ok && Array.isArray(r.data)) {
      return r.data.map(name => name.replace(/\.json$/, ''));
    }
  } catch {}
  return [];
}

export async function loadTexturesFile() {
  const f = fe();
  if (!f) return [];
  try {
    const r = await f.json.read(ENTITY_PATHS.texture);
    const list = r?.ok && Array.isArray(r.data) ? r.data : [];
    localStorage.setItem('ycs-textures-list', JSON.stringify(list));
    return list;
  } catch {
    return [];
  }
}

export async function saveTexturesFile(textures) {
  const f = fe();
  if (!f) throw new Error('File engine not available');
  await f.json.write(ENTITY_PATHS.texture, textures);
  localStorage.setItem('ycs-textures-list', JSON.stringify(textures));
}

export { YCS_BASE, ENTITY_PATHS };
