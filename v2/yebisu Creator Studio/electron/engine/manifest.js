const path = require('path');
const jsonOps = require('./json-ops');
const files = require('./files');

const MANIFEST_FILENAME = 'ycs-manifest.json';

function manifestPath(modRoot) {
  return path.join(modRoot, MANIFEST_FILENAME);
}

function loadManifest(modRoot) {
  const mp = manifestPath(modRoot);
  if (!files.exists(mp)) {
    return createEmptyManifest();
  }
  return jsonOps.readJson(mp);
}

function saveManifest(modRoot, manifest) {
  manifest.modified = new Date().toISOString();
  jsonOps.writeJson(manifestPath(modRoot), manifest);
}

function createEmptyManifest() {
  return {
    version: 1,
    modId: 'yebisurpg',
    basePath: 'src/main',
    entries: {},
    assets: {},
  };
}

function addEntry(modRoot, entryId, entryData) {
  const manifest = loadManifest(modRoot);
  if (manifest.entries[entryId]) {
    throw new Error(`Entry '${entryId}' already exists in manifest`);
  }
  manifest.entries[entryId] = {
    ...entryData,
    created: entryData.created || new Date().toISOString(),
    modified: new Date().toISOString(),
  };
  saveManifest(modRoot, manifest);
  return manifest;
}

function updateEntry(modRoot, entryId, updates) {
  const manifest = loadManifest(modRoot);
  if (!manifest.entries[entryId]) {
    throw new Error(`Entry '${entryId}' not found in manifest`);
  }
  manifest.entries[entryId] = {
    ...manifest.entries[entryId],
    ...updates,
    modified: new Date().toISOString(),
  };
  saveManifest(modRoot, manifest);
  return manifest;
}

function removeEntry(modRoot, entryId) {
  const manifest = loadManifest(modRoot);
  const entry = manifest.entries[entryId];
  if (!entry) {
    throw new Error(`Entry '${entryId}' not found in manifest`);
  }

  // Clean asset usedBy references
  if (entry.assets && Array.isArray(entry.assets)) {
    for (const assetId of entry.assets) {
      if (manifest.assets[assetId]) {
        manifest.assets[assetId].usedBy = manifest.assets[assetId].usedBy.filter(id => id !== entryId);
      }
    }
  }

  delete manifest.entries[entryId];
  saveManifest(modRoot, manifest);
  return manifest;
}

function addAsset(modRoot, assetId, assetData) {
  const manifest = loadManifest(modRoot);
  if (manifest.assets[assetId]) {
    // Merge usedBy if asset already exists
    const existing = manifest.assets[assetId];
    if (assetData.usedBy) {
      for (const id of assetData.usedBy) {
        if (!existing.usedBy.includes(id)) {
          existing.usedBy.push(id);
        }
      }
    }
  } else {
    manifest.assets[assetId] = {
      ...assetData,
      usedBy: assetData.usedBy || [],
    };
  }
  saveManifest(modRoot, manifest);
  return manifest;
}

function removeAsset(modRoot, assetId) {
  const manifest = loadManifest(modRoot);
  if (!manifest.assets[assetId]) {
    throw new Error(`Asset '${assetId}' not found in manifest`);
  }
  if (manifest.assets[assetId].usedBy.length > 0) {
    throw new Error(`Asset '${assetId}' is still in use by: ${manifest.assets[assetId].usedBy.join(', ')}`);
  }
  delete manifest.assets[assetId];
  saveManifest(modRoot, manifest);
  return manifest;
}

function getOrphanedAssets(manifest) {
  const orphaned = [];
  for (const [id, asset] of Object.entries(manifest.assets)) {
    if (!asset.usedBy || asset.usedBy.length === 0) {
      orphaned.push({ id, ...asset });
    }
  }
  return orphaned;
}

function traceEntry(manifest, entryId) {
  const entry = manifest.entries[entryId];
  if (!entry) {
    throw new Error(`Entry '${entryId}' not found in manifest`);
  }

  const referencedAssets = [];
  if (entry.assets) {
    for (const assetId of entry.assets) {
      if (manifest.assets[assetId]) {
        referencedAssets.push({ id: assetId, ...manifest.assets[assetId] });
      }
    }
  }

  return {
    entry,
    injections: entry.injections || [],
    assets: referencedAssets,
  };
}

function listEntries(manifest, type) {
  const entries = [];
  for (const [id, entry] of Object.entries(manifest.entries)) {
    if (!type || entry.type === type) {
      entries.push({ id, ...entry });
    }
  }
  return entries;
}

module.exports = {
  loadManifest,
  saveManifest,
  createEmptyManifest,
  addEntry,
  updateEntry,
  removeEntry,
  addAsset,
  removeAsset,
  getOrphanedAssets,
  traceEntry,
  listEntries,
};
