const path = require('path');
const fs = require('fs');

function scanTextures(modRoot) {
  const texturesDir = path.join(modRoot, 'src', 'main', 'resources', 'assets', 'yebisurpg', 'textures');
  if (!fs.existsSync(texturesDir)) return [];

  const results = [];

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.png')) {
        const rel = path.relative(texturesDir, full).replace(/\\/g, '/');
        const parts = rel.split('/');
        const category = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
        results.push({
          name: path.basename(entry.name, '.png'),
          relativePath: 'resources/assets/yebisurpg/textures/' + rel,
          category,
        });
      }
    }
  };

  walk(texturesDir);
  return results;
}

module.exports = { scanTextures };
