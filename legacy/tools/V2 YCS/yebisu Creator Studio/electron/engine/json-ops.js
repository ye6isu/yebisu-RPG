const files = require('./files');

function readJson(filePath) {
  const content = files.readFile(filePath);
  return JSON.parse(content);
}

function writeJson(filePath, data, options = {}) {
  let content;
  if (options.sortKeys) {
    const sorted = sortKeysDeep(data);
    content = JSON.stringify(sorted, null, 2);
  } else {
    content = JSON.stringify(data, null, 2);
  }
  files.writeFile(filePath, content + '\n');
}

function sortKeysDeep(obj) {
  if (Array.isArray(obj)) return obj.map(sortKeysDeep);
  if (obj !== null && typeof obj === 'object') {
    const sorted = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortKeysDeep(obj[key]);
    }
    return sorted;
  }
  return obj;
}

// For flat files (en_us.json): keyPath is a literal string key
// For nested files: keyPath is an array of keys
function getJsonKey(filePath, keyPath) {
  const data = readJson(filePath);
  if (typeof keyPath === 'string') {
    return data[keyPath];
  }
  let current = data;
  for (const key of keyPath) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return current;
}

function setJsonKey(filePath, keyPath, value, options = {}) {
  const data = readJson(filePath);
  if (typeof keyPath === 'string') {
    data[keyPath] = value;
  } else {
    let current = data;
    for (let i = 0; i < keyPath.length - 1; i++) {
      if (current[keyPath[i]] === undefined) {
        current[keyPath[i]] = {};
      }
      current = current[keyPath[i]];
    }
    current[keyPath[keyPath.length - 1]] = value;
  }
  writeJson(filePath, data, options);
}

function deleteJsonKey(filePath, keyPath, options = {}) {
  const data = readJson(filePath);
  if (typeof keyPath === 'string') {
    delete data[keyPath];
  } else {
    let current = data;
    for (let i = 0; i < keyPath.length - 1; i++) {
      if (current[keyPath[i]] === undefined) return;
      current = current[keyPath[i]];
    }
    delete current[keyPath[keyPath.length - 1]];
  }
  writeJson(filePath, data, options);
}

module.exports = {
  readJson,
  writeJson,
  getJsonKey,
  setJsonKey,
  deleteJsonKey,
};
