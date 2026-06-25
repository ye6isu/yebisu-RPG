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
  onDockSuccess: (callback) => ipcRenderer.on('dock-success', (_event, data) => callback(data))
});
