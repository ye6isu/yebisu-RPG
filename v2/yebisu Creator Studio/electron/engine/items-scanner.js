const path = require('path');
const fs = require('fs');

function scanAllItems(modRoot) {
  const basePath = path.join(modRoot, 'src', 'main');
  const modItemsPath = path.join(basePath, 'java', 'net', 'ye6isu', 'yebisuRPG', 'item', 'ModItems.java');
  const langPath = path.join(basePath, 'resources', 'assets', 'yebisurpg', 'lang', 'en_us.json');

  if (!fs.existsSync(modItemsPath)) throw new Error('ModItems.java not found');

  const source = fs.readFileSync(modItemsPath, 'utf-8');
  const lang = fs.existsSync(langPath) ? JSON.parse(fs.readFileSync(langPath, 'utf-8')) : {};

  const markerStartIdx = source.indexOf('//YCS_Mod_Items_START');
  const markerEndIdx = source.indexOf('//YCS_Mod_Items_END');

  const items = [];
  // Match multi-line register calls: captures const name, generic type, item id, and full body
  const registerRe = /public\s+static\s+final\s+DeferredItem<(\w+)>\s+(\w+)\s*=\s*ITEMS\.register\("(\w+)",([\s\S]*?)\)\);/g;

  let match;
  while ((match = registerRe.exec(source)) !== null) {
    // Skip the ITEMS.register(eventBus) call
    if (match[0].includes('eventBus')) continue;

    const genericType = match[1];
    const constName = match[2];
    const id = match[3];
    const body = match[4];
    const charPos = match.index;

    const isYCS = markerStartIdx !== -1 && markerEndIdx !== -1 &&
      charPos > markerStartIdx && charPos < markerEndIdx;

    const displayName = lang[`item.yebisurpg.${id}`] || id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const item = {
      id,
      constName,
      displayName,
      source: isYCS ? 'ycs' : 'code',
      itemClass: 'Item',
      properties: {},
    };

    // Detect item class
    if (body.includes('new ArmorItem(')) item.itemClass = 'ArmorItem';
    else if (body.includes('DeferredSpawnEggItem')) item.itemClass = 'SpawnEgg';
    else if (body.includes('SwordItem') || body.includes('createAttributes')) item.itemClass = 'SwordItem';
    else if (body.includes('PickaxeItem')) item.itemClass = 'PickaxeItem';
    else if (body.includes('AxeItem')) item.itemClass = 'AxeItem';
    else if (body.includes('ShovelItem')) item.itemClass = 'ShovelItem';
    else if (body.includes('HoeItem')) item.itemClass = 'HoeItem';
    else {
      // Check for custom class names (e.g. YasuoKatanaItem)
      const customMatch = body.match(/new\s+(\w+Item)\s*\(/);
      if (customMatch && customMatch[1] !== 'Item') item.itemClass = customMatch[1];
    }

    // Parse properties
    const stacksTo = body.match(/\.stacksTo\((\d+)\)/);
    if (stacksTo) item.properties.stackSize = stacksTo[1];

    const durability = body.match(/\.durability\(([^)]+)\)/);
    if (durability) item.properties.durability = durability[1];

    const foodMatch = body.match(/\.food\(/);
    if (foodMatch) item.properties.isFood = true;

    // Tool attributes: SwordItem.createAttributes(Tiers.X, damage, speed)
    const attrMatch = body.match(/createAttributes\(Tiers\.(\w+),\s*([\d.f-]+),\s*([\d.f-]+)\)/);
    if (attrMatch) {
      item.properties.isTool = true;
      item.properties.tier = attrMatch[1].charAt(0) + attrMatch[1].slice(1).toLowerCase();
      item.properties.damage = attrMatch[2].replace('f', '');
      item.properties.speed = attrMatch[3].replace('f', '');
    }

    // Armor type
    const armorTypeMatch = body.match(/ArmorItem\.Type\.(\w+)/);
    if (armorTypeMatch) {
      item.properties.armorType = armorTypeMatch[1].charAt(0) + armorTypeMatch[1].slice(1).toLowerCase();
    }

    items.push(item);
  }

  return items;
}

module.exports = { scanAllItems };
