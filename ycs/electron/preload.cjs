const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ycsNative', {
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close:    () => ipcRenderer.send('win:close'),
  isElectron: true,
});
