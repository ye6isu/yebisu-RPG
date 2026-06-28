const files = require('./files');

// Matches both formats:
//   //YCS_Name_START  /  //YCS_Name_END
//   //YCS:name:start  /  //YCS:name:end
// Captures the full marker name including the YCS prefix.
// Group 1: indent, Group 2: full name (e.g. "YCS_Mod_Items" or "YCS:use")
const MARKER_START_RE = /^(\s*)\/\/(YCS[_:].+?)[_:](?:START|start)\s*$/;
const MARKER_END_RE = /^(\s*)\/\/(YCS[_:].+?)[_:](?:END|end)\s*$/;

function normalizeMarkerName(raw) {
  return raw.replace(/[_:](?:START|END|start|end)$/i, '');
}

function scanMarkers(filePath) {
  const content = files.readFile(filePath);
  const lines = content.split('\n');
  const markers = [];
  const openStack = [];

  for (let i = 0; i < lines.length; i++) {
    const startMatch = lines[i].match(MARKER_START_RE);
    if (startMatch) {
      openStack.push({
        name: normalizeMarkerName(startMatch[2]),
        startLine: i,
        indent: startMatch[1],
      });
      continue;
    }

    const endMatch = lines[i].match(MARKER_END_RE);
    if (endMatch) {
      const endName = normalizeMarkerName(endMatch[2]);
      // Find matching open marker (search from top of stack)
      const openIdx = openStack.findLastIndex(m => m.name === endName);
      if (openIdx !== -1) {
        const open = openStack.splice(openIdx, 1)[0];
        const contentLines = lines.slice(open.startLine + 1, i);
        markers.push({
          name: open.name,
          startLine: open.startLine,
          endLine: i,
          indent: open.indent,
          content: contentLines.join('\n'),
        });
      }
    }
  }

  return markers;
}

function readMarker(filePath, markerName) {
  const markers = scanMarkers(filePath);
  const found = markers.find(m => m.name === markerName);
  if (!found) throw new Error(`Marker '${markerName}' not found in ${filePath}`);
  return found.content;
}

function writeMarker(filePath, markerName, content) {
  const fileContent = files.readFile(filePath);
  const lines = fileContent.split('\n');
  const markers = scanMarkers(filePath);
  const found = markers.find(m => m.name === markerName);
  if (!found) throw new Error(`Marker '${markerName}' not found in ${filePath}`);

  const newLines = [
    ...lines.slice(0, found.startLine + 1),
    ...(content ? content.split('\n') : []),
    ...lines.slice(found.endLine),
  ];

  files.writeFile(filePath, newLines.join('\n'));
}

function appendToMarker(filePath, markerName, newContent) {
  const fileContent = files.readFile(filePath);
  const lines = fileContent.split('\n');
  const markers = scanMarkers(filePath);
  const found = markers.find(m => m.name === markerName);
  if (!found) throw new Error(`Marker '${markerName}' not found in ${filePath}`);

  const insertLines = newContent.split('\n');

  // Insert before the END marker line, with a blank line separator if content already exists
  const existingContent = found.content.trim();
  const insertAt = found.endLine;

  if (existingContent) {
    lines.splice(insertAt, 0, '', ...insertLines);
  } else {
    lines.splice(insertAt, 0, ...insertLines);
  }

  files.writeFile(filePath, lines.join('\n'));
}

function removeFromMarker(filePath, markerName, contentToRemove) {
  const fileContent = files.readFile(filePath);
  const lines = fileContent.split('\n');
  const markers = scanMarkers(filePath);
  const found = markers.find(m => m.name === markerName);
  if (!found) throw new Error(`Marker '${markerName}' not found in ${filePath}`);

  const removeLines = contentToRemove.trim().split('\n').map(l => l.trim());
  const markerLines = lines.slice(found.startLine + 1, found.endLine);

  // Find the contiguous block that matches removeLines
  let removeStart = -1;
  for (let i = 0; i <= markerLines.length - removeLines.length; i++) {
    let match = true;
    for (let j = 0; j < removeLines.length; j++) {
      if (markerLines[i + j].trim() !== removeLines[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      removeStart = i;
      break;
    }
  }

  if (removeStart === -1) {
    throw new Error(`Content to remove not found in marker '${markerName}' in ${filePath}`);
  }

  // Calculate actual line indices in the file
  const fileRemoveStart = found.startLine + 1 + removeStart;
  const fileRemoveEnd = fileRemoveStart + removeLines.length;

  // Also remove a leading blank line if one exists (cleanup separator)
  let actualStart = fileRemoveStart;
  if (actualStart > found.startLine + 1 && lines[actualStart - 1].trim() === '') {
    actualStart--;
  }

  lines.splice(actualStart, fileRemoveEnd - actualStart);
  files.writeFile(filePath, lines.join('\n'));
}

module.exports = {
  scanMarkers,
  readMarker,
  writeMarker,
  appendToMarker,
  removeFromMarker,
};
