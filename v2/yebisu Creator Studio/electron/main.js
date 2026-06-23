const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const windowStateKeeper = require('electron-window-state');

const isDev = process.env.NODE_ENV !== 'production';

let mainWindow;

function createWindow() {
  let mainWindowState = windowStateKeeper({
    defaultWidth: 1000,
    defaultHeight: 700
  });

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: 800,
    minHeight: 600,
    icon: isDev 
      ? path.join(__dirname, '../public/logo.png') 
      : path.join(__dirname, '../dist/logo.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#323233',
      symbolColor: '#cccccc',
      height: 28
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  if (isDev) {
    // Load Vite dev server
    mainWindow.loadURL('http://localhost:5174');
  } else {
    // Load built static files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindowState.manage(mainWindow);
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.on('window-control', (event, action) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;
    
    if (action === 'minimize') {
      win.minimize();
    } else if (action === 'maximize') {
      win.isMaximized() ? win.unmaximize() : win.maximize();
    } else if (action === 'close') {
      win.close();
    }
  });

  ipcMain.on('update-theme', (event, { accent, bg }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (accent) mainWindow.setTitleBarOverlay({ color: accent });
    }
  });

  ipcMain.on('open-preferences', () => {
    let prefsWindowState = windowStateKeeper({
      defaultWidth: 600,
      defaultHeight: 450,
      file: 'preferences-window-state.json'
    });

    const prefsWindow = new BrowserWindow({
      x: prefsWindowState.x,
      y: prefsWindowState.y,
      width: prefsWindowState.width,
      height: prefsWindowState.height,
      minWidth: 600,
      minHeight: 450,
      parent: mainWindow,
      modal: true,
      minimizable: false,
      maximizable: false,
      icon: isDev ? path.join(__dirname, '../public/logo.png') : path.join(__dirname, '../dist/logo.png'),
      frame: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    if (isDev) {
      prefsWindow.loadURL('http://localhost:5174/?page=preferences');
    } else {
      prefsWindow.loadFile(path.join(__dirname, '../dist/index.html'), { search: 'page=preferences' });
    }

    prefsWindowState.manage(prefsWindow);
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
