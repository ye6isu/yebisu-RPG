const files = require('./files');
const jsonOps = require('./json-ops');
const markers = require('./markers');
const manifest = require('./manifest');

function wrap(fn) {
  return async (event, ...args) => {
    try {
      const result = await fn(event, ...args);
      return { ok: true, data: result };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };
}

function registerFileEngineIPC(ipcMain) {
  // ── Config ──────────────────────────────────────────────────────
  ipcMain.handle('ycs:config:getModRoot', wrap(() => {
    return files.getModRoot();
  }));

  ipcMain.handle('ycs:config:setModRoot', wrap((event, modRoot) => {
    files.setModRoot(modRoot);
  }));

  // ── Files ───────────────────────────────────────────────────────
  ipcMain.handle('ycs:files:read', wrap((event, relativePath, encoding) => {
    const resolved = files.resolveModPath(relativePath);
    return files.readFile(resolved, encoding);
  }));

  ipcMain.handle('ycs:files:write', wrap((event, relativePath, content) => {
    const resolved = files.resolveModPath(relativePath);
    files.writeFile(resolved, content);
  }));

  ipcMain.handle('ycs:files:copy', wrap((event, srcRelative, destRelative) => {
    const src = files.resolveModPath(srcRelative);
    const dest = files.resolveModPath(destRelative);
    files.copyFile(src, dest);
  }));

  ipcMain.handle('ycs:files:delete', wrap((event, relativePath) => {
    const resolved = files.resolveModPath(relativePath);
    files.deleteFile(resolved, files.getModRoot());
  }));

  ipcMain.handle('ycs:files:deleteDir', wrap((event, relativePath) => {
    const resolved = files.resolveModPath(relativePath);
    files.deleteDir(resolved);
  }));

  ipcMain.handle('ycs:files:list', wrap((event, relativePath, pattern) => {
    const resolved = files.resolveModPath(relativePath);
    return files.listFiles(resolved, pattern);
  }));

  ipcMain.handle('ycs:files:exists', wrap((event, relativePath) => {
    const resolved = files.resolveModPath(relativePath);
    return files.exists(resolved);
  }));

  ipcMain.handle('ycs:files:pickDirectory', wrap(async (event) => {
    const { BrowserWindow } = require('electron');
    const win = BrowserWindow.fromWebContents(event.sender);
    return await files.pickDirectory(win);
  }));

  // ── JSON ────────────────────────────────────────────────────────
  ipcMain.handle('ycs:json:read', wrap((event, relativePath) => {
    const resolved = files.resolveModPath(relativePath);
    return jsonOps.readJson(resolved);
  }));

  ipcMain.handle('ycs:json:write', wrap((event, relativePath, data, options) => {
    const resolved = files.resolveModPath(relativePath);
    jsonOps.writeJson(resolved, data, options);
  }));

  ipcMain.handle('ycs:json:getKey', wrap((event, relativePath, keyPath) => {
    const resolved = files.resolveModPath(relativePath);
    return jsonOps.getJsonKey(resolved, keyPath);
  }));

  ipcMain.handle('ycs:json:setKey', wrap((event, relativePath, keyPath, value, options) => {
    const resolved = files.resolveModPath(relativePath);
    jsonOps.setJsonKey(resolved, keyPath, value, options);
  }));

  ipcMain.handle('ycs:json:deleteKey', wrap((event, relativePath, keyPath, options) => {
    const resolved = files.resolveModPath(relativePath);
    jsonOps.deleteJsonKey(resolved, keyPath, options);
  }));

  // ── Markers ─────────────────────────────────────────────────────
  ipcMain.handle('ycs:markers:scan', wrap((event, relativePath) => {
    const resolved = files.resolveModPath(relativePath);
    return markers.scanMarkers(resolved);
  }));

  ipcMain.handle('ycs:markers:read', wrap((event, relativePath, markerName) => {
    const resolved = files.resolveModPath(relativePath);
    return markers.readMarker(resolved, markerName);
  }));

  ipcMain.handle('ycs:markers:write', wrap((event, relativePath, markerName, content) => {
    const resolved = files.resolveModPath(relativePath);
    markers.writeMarker(resolved, markerName, content);
  }));

  ipcMain.handle('ycs:markers:append', wrap((event, relativePath, markerName, content) => {
    const resolved = files.resolveModPath(relativePath);
    markers.appendToMarker(resolved, markerName, content);
  }));

  ipcMain.handle('ycs:markers:remove', wrap((event, relativePath, markerName, content) => {
    const resolved = files.resolveModPath(relativePath);
    markers.removeFromMarker(resolved, markerName, content);
  }));

  // ── Manifest ────────────────────────────────────────────────────
  ipcMain.handle('ycs:manifest:load', wrap(() => {
    const modRoot = files.getModRoot();
    if (!modRoot) throw new Error('Mod root not configured');
    return manifest.loadManifest(modRoot);
  }));

  ipcMain.handle('ycs:manifest:save', wrap((event, manifestData) => {
    const modRoot = files.getModRoot();
    if (!modRoot) throw new Error('Mod root not configured');
    manifest.saveManifest(modRoot, manifestData);
  }));

  ipcMain.handle('ycs:manifest:addEntry', wrap((event, entryId, entryData) => {
    const modRoot = files.getModRoot();
    if (!modRoot) throw new Error('Mod root not configured');
    return manifest.addEntry(modRoot, entryId, entryData);
  }));

  ipcMain.handle('ycs:manifest:updateEntry', wrap((event, entryId, updates) => {
    const modRoot = files.getModRoot();
    if (!modRoot) throw new Error('Mod root not configured');
    return manifest.updateEntry(modRoot, entryId, updates);
  }));

  ipcMain.handle('ycs:manifest:removeEntry', wrap((event, entryId) => {
    const modRoot = files.getModRoot();
    if (!modRoot) throw new Error('Mod root not configured');
    return manifest.removeEntry(modRoot, entryId);
  }));

  ipcMain.handle('ycs:manifest:addAsset', wrap((event, assetId, assetData) => {
    const modRoot = files.getModRoot();
    if (!modRoot) throw new Error('Mod root not configured');
    return manifest.addAsset(modRoot, assetId, assetData);
  }));

  ipcMain.handle('ycs:manifest:removeAsset', wrap((event, assetId) => {
    const modRoot = files.getModRoot();
    if (!modRoot) throw new Error('Mod root not configured');
    return manifest.removeAsset(modRoot, assetId);
  }));

  ipcMain.handle('ycs:manifest:trace', wrap((event, entryId) => {
    const modRoot = files.getModRoot();
    if (!modRoot) throw new Error('Mod root not configured');
    const m = manifest.loadManifest(modRoot);
    return manifest.traceEntry(m, entryId);
  }));

  ipcMain.handle('ycs:manifest:listEntries', wrap((event, type) => {
    const modRoot = files.getModRoot();
    if (!modRoot) throw new Error('Mod root not configured');
    const m = manifest.loadManifest(modRoot);
    return manifest.listEntries(m, type);
  }));

  ipcMain.handle('ycs:manifest:orphanedAssets', wrap(() => {
    const modRoot = files.getModRoot();
    if (!modRoot) throw new Error('Mod root not configured');
    const m = manifest.loadManifest(modRoot);
    return manifest.getOrphanedAssets(m);
  }));
}

module.exports = { registerFileEngineIPC };
