const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  controlWindow: (action) => ipcRenderer.send('window-control', action),
  openPreferences: () => ipcRenderer.send('open-preferences'),
  updateTheme: (theme) => ipcRenderer.send('update-theme', theme)
});
