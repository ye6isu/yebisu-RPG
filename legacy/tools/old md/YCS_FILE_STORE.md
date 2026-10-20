# YCS File Store Architecture

## Overview

YCS uses JSON files on disk as the single source of truth for all editor state.
This replaces the previous localStorage-based persistence, which suffered from
session-specific key drift (nodeId changes on every app restart).

## Storage Locations

All paths are relative to `<modRoot>/src/main/`:

| Content | Path | Format |
|---------|------|--------|
| Item save files | `resources/assets/yebisurpg/ycs/items/<item_id>.json` | One file per item |
| Texture library | `resources/assets/yebisurpg/ycs/textures.json` | Array of texture objects |
| Creative tabs | `resources/assets/yebisurpg/ycs/ycs_custom_tabs.json` | Array of tab objects |
| Tab assignments | `resources/assets/yebisurpg/ycs/ycs_tabs.json` | Object: itemId → tabKey |

## Item JSON Schema

Each item file contains ALL editor state for that item:

```json
{
  "displayName": "Ruby Sword",
  "id": "ruby_sword",
  "constName": "RUBY_SWORD",
  "customConstName": false,
  "multipleStates": false,
  "stateCount": 2,
  "holdingMode": "handheld",
  "textureName": "ruby_sword",
  "states": [
    { "holdingMode": "none", "textureName": "", "modelJson": "" }
  ],
  "modelJson": "",
  "stackSize": "64",
  "isTool": true,
  "toolType": "Sword",
  "tier": "Diamond",
  "damage": "7",
  "speed": "-2.4",
  "isFood": false,
  "hasDurability": true,
  "durability": "500",
  "hasUseDuration": false,
  "hasTooltip": true,
  "tooltipNormal": "A blazing ruby blade",
  "creativeTab": "combat",
  "tags": "",

  "recipe": {
    "craftingEnabled": true,
    "craftingShape": "shaped",
    "craftingCount": 1,
    "slots": [null, "minecraft:diamond", null, null, "minecraft:diamond", null, null, "minecraft:stick", null],
    "smeltingEnabled": false
  },

  "dataComponents": [
    { "name": "CHARGE_LEVEL", "id": "charge_level", "type": "number", "defaultValue": "0" }
  ],

  "enabledMethods": ["use", "hurtEnemy"],

  "blockGraphs": {
    "use": [
      { "id": "start", "opcode": "start", "isAction": true, "x": 0, "y": 0, "nextId": null, "fields": {}, "slots": {} }
    ],
    "hurtEnemy": []
  },

  "modelJsonData": {
    "model-json": { "geoModelJson": "...", "geoModelFileName": "sword.geo.json" }
  }
}
```

## Store Modules

### `src/store/itemStore.js`

In-memory cache with async file I/O. Key functions:

| Function | Description |
|----------|-------------|
| `loadItem(itemId)` | Load from disk into cache, return data |
| `saveItem(itemId, data)` | Write to disk and update cache |
| `deleteItemFile(itemId)` | Delete file and remove from cache |
| `listItems()` | List all item IDs from `ycs/items/*.json` |
| `getCached(itemId)` | Read from cache (no I/O) |
| `setCached(itemId, data)` | Write to cache only (for live editing) |
| `getSection(itemId, section)` | Read a specific section from cache |
| `updateSection(itemId, section, data)` | Update a section in cache |
| `subscribe(itemId, callback)` | Listen for changes to an item |

### `src/store/textureStore.js`

Same pattern for the texture library at `ycs/textures.json`.

## Data Flow

```
User edits form field
        │
        ▼
  React state update
        │
        ▼
  itemStore.setCached(id, form)     ← live cache update (no disk I/O)
        │
        ▼
  Child editors read via getSection()
        │
        ▼
  User clicks "Save"
        │
        ├── itemStore.saveItem(id, fullData)   ← writes JSON to disk
        └── injectItem(form)                   ← injects into Java/resources
```

## What Stays in localStorage

Only UI-session state that has no value across restarts:

| Key | Purpose |
|-----|---------|
| `ycs-workspace` | Workspace layout tree |
| `ycs-preferences` | User preferences |
| `ycs-*-seed` | Ephemeral one-time seeds consumed on editor open |
| `ycs-child-item-id::<tabId>` | Parent→child item ID bridge (consumed on mount) |

## Migration

On first launch after the migration:
- Items landing page falls back to scanning Java if no JSON files exist
- Opening an existing item from Java scan loads the sparse data
- Saving that item creates the full JSON file
- Subsequent opens load from JSON with all fields intact
