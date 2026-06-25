const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  controlWindow: (action) => ipcRenderer.send('window-control', action),
  openPreferences: () => ipcRenderer.send('open-preferences'),
  updateTheme: (theme) => ipcRenderer.send('update-theme', theme),
  setMinimumSize: (width, height) => ipcRenderer.send('set-minimum-size', width, height),
  openPopout: (tabId) => ipcRenderer.send('open-popout', tabId),
  closePopout: (tabId) => ipcRenderer.send('close-popout', tabId),
  moveWindowTo: (x, y) => ipcRenderer.send('move-window-to', x, y),
  startDrag: () => ipcRenderer.send('drag-start'),
  endDrag: () => ipcRenderer.send('drag-end'),
  onNativePopoutDropped: (callback) => ipcRenderer.on('native-popout-dropped', (_event, data) => callback(data)),
  broadcastDockSuccess: (tabId) => ipcRenderer.send('broadcast-dock-success', tabId),
  onDockSuccess: (callback) => ipcRenderer.on('dock-success', (_event, data) => callback(data)),

  fileEngine: {
    config: {
      getModRoot: () => ipcRenderer.invoke('ycs:config:getModRoot'),
      setModRoot: (modRoot) => ipcRenderer.invoke('ycs:config:setModRoot', modRoot),
    },
    files: {
      read: (relativePath, encoding) => ipcRenderer.invoke('ycs:files:read', relativePath, encoding),
      write: (relativePath, content) => ipcRenderer.invoke('ycs:files:write', relativePath, content),
      copy: (src, dest) => ipcRenderer.invoke('ycs:files:copy', src, dest),
      delete: (relativePath) => ipcRenderer.invoke('ycs:files:delete', relativePath),
      deleteDir: (relativePath) => ipcRenderer.invoke('ycs:files:deleteDir', relativePath),
      list: (relativePath, pattern) => ipcRenderer.invoke('ycs:files:list', relativePath, pattern),
      exists: (relativePath) => ipcRenderer.invoke('ycs:files:exists', relativePath),
      pickDirectory: () => ipcRenderer.invoke('ycs:files:pickDirectory'),
    },
    json: {
      read: (relativePath) => ipcRenderer.invoke('ycs:json:read', relativePath),
      write: (relativePath, data, options) => ipcRenderer.invoke('ycs:json:write', relativePath, data, options),
      getKey: (relativePath, keyPath) => ipcRenderer.invoke('ycs:json:getKey', relativePath, keyPath),
      setKey: (relativePath, keyPath, value, options) => ipcRenderer.invoke('ycs:json:setKey', relativePath, keyPath, value, options),
      deleteKey: (relativePath, keyPath, options) => ipcRenderer.invoke('ycs:json:deleteKey', relativePath, keyPath, options),
    },
    markers: {
      scan: (relativePath) => ipcRenderer.invoke('ycs:markers:scan', relativePath),
      read: (relativePath, markerName) => ipcRenderer.invoke('ycs:markers:read', relativePath, markerName),
      write: (relativePath, markerName, content) => ipcRenderer.invoke('ycs:markers:write', relativePath, markerName, content),
      append: (relativePath, markerName, content) => ipcRenderer.invoke('ycs:markers:append', relativePath, markerName, content),
      remove: (relativePath, markerName, content) => ipcRenderer.invoke('ycs:markers:remove', relativePath, markerName, content),
    },
    manifest: {
      load: () => ipcRenderer.invoke('ycs:manifest:load'),
      save: (manifestData) => ipcRenderer.invoke('ycs:manifest:save', manifestData),
      addEntry: (entryId, entryData) => ipcRenderer.invoke('ycs:manifest:addEntry', entryId, entryData),
      updateEntry: (entryId, updates) => ipcRenderer.invoke('ycs:manifest:updateEntry', entryId, updates),
      removeEntry: (entryId) => ipcRenderer.invoke('ycs:manifest:removeEntry', entryId),
      addAsset: (assetId, assetData) => ipcRenderer.invoke('ycs:manifest:addAsset', assetId, assetData),
      removeAsset: (assetId) => ipcRenderer.invoke('ycs:manifest:removeAsset', assetId),
      trace: (entryId) => ipcRenderer.invoke('ycs:manifest:trace', entryId),
      listEntries: (type) => ipcRenderer.invoke('ycs:manifest:listEntries', type),
      orphanedAssets: () => ipcRenderer.invoke('ycs:manifest:orphanedAssets'),
    },
  },
});
