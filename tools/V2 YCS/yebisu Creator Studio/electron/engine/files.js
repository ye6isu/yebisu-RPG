const fs = require('fs');
const path = require('path');
const { app, dialog } = require('electron');

const CONFIG_PATH = () => path.join(app.getPath('userData'), 'ycs-config.json');

function getModRoot() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH(), 'utf-8'));
    return config.modRoot || null;
  } catch {
    return null;
  }
}

function setModRoot(modRoot) {
  const configPath = CONFIG_PATH();
  let config = {};
  try { config = JSON.parse(fs.readFileSync(configPath, 'utf-8')); } catch {}
  config.modRoot = modRoot;
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

function resolveModPath(relativePath) {
  const modRoot = getModRoot();
  if (!modRoot) throw new Error('Mod root not configured. Use config.setModRoot first.');
  const basePath = path.join(modRoot, 'src', 'main');
  const resolved = path.resolve(basePath, relativePath);
  if (!resolved.startsWith(path.resolve(modRoot))) {
    throw new Error(`Path traversal blocked: ${relativePath}`);
  }
  return resolved;
}

function resolveModRootPath(relativePath) {
  const modRoot = getModRoot();
  if (!modRoot) throw new Error('Mod root not configured. Use config.setModRoot first.');
  const resolved = path.resolve(modRoot, relativePath);
  if (!resolved.startsWith(path.resolve(modRoot))) {
    throw new Error(`Path traversal blocked: ${relativePath}`);
  }
  return resolved;
}

function readFile(filePath, encoding = 'utf-8') {
  if (encoding === 'base64') {
    return fs.readFileSync(filePath).toString('base64');
  }
  return fs.readFileSync(filePath, encoding);
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

function writeBase64(filePath, base64Data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const buf = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(filePath, buf);
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function deleteFile(filePath, modRoot) {
  if (!fs.existsSync(filePath)) return;
  fs.unlinkSync(filePath);
  // Prune empty parent dirs up to mod root
  if (modRoot) {
    let dir = path.dirname(filePath);
    const root = path.resolve(modRoot);
    while (dir.length > root.length && dir.startsWith(root)) {
      try {
        const entries = fs.readdirSync(dir);
        if (entries.length === 0) {
          fs.rmdirSync(dir);
          dir = path.dirname(dir);
        } else {
          break;
        }
      } catch {
        break;
      }
    }
  }
}

function deleteDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true });
  }
}

function listFiles(dirPath, pattern) {
  if (!fs.existsSync(dirPath)) return [];
  const results = [];

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const rel = path.relative(dirPath, full).replace(/\\/g, '/');
        if (!pattern || matchPattern(entry.name, pattern)) {
          results.push(rel);
        }
      }
    }
  };

  walk(dirPath);
  return results;
}

function matchPattern(filename, pattern) {
  if (pattern.startsWith('*.')) {
    return filename.endsWith(pattern.slice(1));
  }
  // Simple wildcard: convert * to regex
  const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
  return regex.test(filename);
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

async function pickDirectory(parentWindow) {
  const result = await dialog.showOpenDialog(parentWindow || null, {
    properties: ['openDirectory'],
    title: 'Select Mod Root Directory'
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}

async function pickFiles(parentWindow, filters, multiSelections) {
  const properties = ['openFile'];
  if (multiSelections) properties.push('multiSelections');
  const result = await dialog.showOpenDialog(parentWindow || null, {
    properties,
    filters: filters || [],
    title: 'Select Files'
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths;
}

function importFile(absoluteSrc, relativeDest) {
  const modRoot = getModRoot();
  if (!modRoot) throw new Error('Mod root not configured');
  const destPath = resolveModPath(relativeDest);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(absoluteSrc, destPath);
}

module.exports = {
  getModRoot,
  setModRoot,
  resolveModPath,
  resolveModRootPath,
  readFile,
  writeFile,
  writeBase64,
  copyFile,
  importFile,
  deleteFile,
  deleteDir,
  listFiles,
  exists,
  pickDirectory,
  pickFiles,
};
