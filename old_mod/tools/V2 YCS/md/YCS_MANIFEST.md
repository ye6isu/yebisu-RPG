# YCS Manifest & Injection Engine

> **AI META-INSTRUCTION:** This document is the absolute source of truth for how YCS tracks, injects, and removes entries from the Minecraft mod. All code generation and cleanup must follow these rules exactly.

## 1. Overview

The **YCS Manifest** (`ycs-manifest.json`) is a master record that lives in the mod root directory (`/yebisu-RPG/ycs-manifest.json`). It tracks every entry YCS has created, which files were touched, what was injected where, and which assets are shared between entries.

**Core guarantees:**
- **Creation is deterministic** — YCS reads the manifest schema, injects using markers, logs everything automatically. No human reminders needed.
- **Deletion is safe** — look up the entry, remove all injections, delete created files, warn if a shared asset would become orphaned.
- **Dependencies are tracked** — textures, models, sounds, etc. know their consumers. Deleting a shared asset triggers a warning.

## 2. Manifest Location & Versioning

- **Path:** `/yebisu-RPG/ycs-manifest.json` (mod root, next to `build.gradle`)
- **Why mod root:** The manifest must travel with the code it describes. Cloning the repo on another machine preserves full tracking. Paths are relative to the mod root, so they're always valid.
- **Version control:** Committed to git alongside the mod source. Changes to the manifest appear in the same diff as the code changes it describes.
- **YCS UI state** (editor prefs, layout, undo history) stays in `/v2/yebisu Creator Studio/` — never in the manifest.

## 3. Manifest Schema

```json
{
  "version": 1,
  "modId": "yebisurpg",
  "basePath": "src/main",
  "entries": {
    "<entry_id>": {
      "type": "<entry_type>",
      "displayName": "Human Readable Name",
      "created": "2026-06-26T12:00:00Z",
      "modified": "2026-06-26T12:00:00Z",
      "injections": [
        {
          "file": "java/net/ye6isu/yebisuRPG/item/ModItems.java",
          "marker": "YCS_Mod_Items",
          "type": "java-marker",
          "content": "<the exact line(s) injected>"
        },
        {
          "file": "resources/assets/yebisurpg/models/item/ruby_sword.json",
          "type": "created-file"
        },
        {
          "file": "resources/assets/yebisurpg/lang/en_us.json",
          "key": "item.yebisurpg.ruby_sword",
          "type": "json-key"
        }
      ],
      "assets": ["ruby_sword_texture.png"],
      "properties": {}
    }
  },
  "assets": {
    "<asset_id>": {
      "path": "resources/assets/yebisurpg/textures/item/ruby_sword.png",
      "type": "texture",
      "usedBy": ["ruby_sword"]
    }
  }
}
```

### Field Reference

| Field | Description |
|-------|-------------|
| `version` | Schema version. Increment on breaking changes. |
| `modId` | The mod identifier (`yebisurpg`). |
| `basePath` | All file paths in `injections` and `assets` are relative to this (`src/main`). |
| `entries.<id>` | Unique snake_case identifier for the entry (e.g., `ruby_sword`). |
| `entries.<id>.type` | Entry type enum (see §4). |
| `entries.<id>.displayName` | The human-readable name shown in YCS UI and used for `en_us.json`. |
| `entries.<id>.injections[]` | Array of every file touched. Each injection has a `type` (see §5). |
| `entries.<id>.assets[]` | Array of `asset_id` references this entry depends on. |
| `entries.<id>.properties` | Type-specific data (tier, damage, food properties, etc.). Stored here so YCS can re-read and re-edit entries. |
| `assets.<id>` | Unique identifier for a shared asset (texture, sound, model file). |
| `assets.<id>.usedBy` | Array of `entry_id`s that reference this asset. |

## 4. Entry Types

Each entry type defines which registry files it injects into, which resource files it creates, and which lang keys it adds.

| Type | Registry File | Resource Files | Lang Key Pattern |
|------|--------------|----------------|------------------|
| `item` | `ModItems.java` (marker: `YCS_Mod_Items`) | `models/item/<id>.json`, optional texture | `item.yebisurpg.<id>` |
| `block` | `ModBlocks.java` (marker: `YCS_Mod_Blocks`) | `blockstates/<id>.json`, `models/block/<id>.json`, optional texture | `block.yebisurpg.<id>` |
| `effect` | `ModEffects.java` (marker: `YCS_Effects`) | optional `textures/mob_effect/<id>.png` | `effect.yebisurpg.<id>` |
| `attribute` | `ModAttributes.java` (marker: `YCS_Attributes`, imports: `YCS_Attributes_IMPORTS`) | none | `attribute.yebisurpg.<id>` |
| `data_component` | `ModDataComponents.java` (marker: `YCS_DataComponents`) | none | none |
| `creative_tab` | `ModCreativeModeTabs.java` (marker: `YCS_Mod_Creative_Tabs`) | optional tab icon texture | `creativetab.yebisurpg.<id>` |
| `sound` | `ModSounds.java` (needs marker: `YCS_Sounds`) | `sounds.json` entry, `.ogg` file | none |
| `entity` | `ModEntities.java` (needs marker: `YCS_Entities`) | model/texture/animation files | `entity.yebisurpg.<id>` |

> **Note:** `ModSounds.java` and `ModEntities.java` currently lack YCS markers. These must be added before YCS can inject into them.

## 5. Injection Types

Each injection in the `injections[]` array has a `type` that determines how it's written and how it's cleaned up:

### `java-marker`
Injects one or more lines of Java code between existing `//YCS_<Marker>_START` and `//YCS_<Marker>_END` comments in a registry class.

- **Write:** Append the line(s) just before the `_END` marker.
- **Delete:** Scan between the markers, find the line(s) matching `content`, remove them.
- **The `content` field** stores the exact injected text so deletion can find it reliably.

```
//YCS_Mod_Items_START
    public static final DeferredItem<Item> RUBY_SWORD = ITEMS.register("ruby_sword", ...);
//YCS_Mod_Items_END
```

### `java-marker-import`
Same as `java-marker` but for import blocks (e.g., `YCS_Attributes_IMPORTS`). Used when an entry requires a custom import that isn't already present.

### `json-key`
Adds or removes a single key-value pair in a flat JSON file (like `en_us.json`).

- **Write:** Parse JSON, insert key, write back (sorted alphabetically).
- **Delete:** Parse JSON, remove the key, write back.
- **The `key` field** identifies which JSON key belongs to this entry.

### `json-entry`
Adds or removes a nested entry in a JSON file (like `sounds.json` where each sound is a named object).

- **Write:** Parse JSON, insert the named object, write back.
- **Delete:** Parse JSON, remove the named object, write back.
- **The `key` field** identifies which top-level key belongs to this entry.

### `created-file`
A file that was created entirely by YCS (model JSON, texture, blockstate, animation, custom Java class).

- **Write:** Create the file at the specified path.
- **Delete:** Delete the file. If the parent directory is now empty, delete the directory too.

## 6. Marker Format Standard

All Java registry files that YCS injects into must have marker comments following this exact format:

```java
//YCS_<MarkerName>_START
<injected lines go here>
//YCS_<MarkerName>_END
```

**Rules:**
- Markers use `//` with no space before the tag (matching the existing codebase pattern).
- `<MarkerName>` must exactly match the `marker` field in the manifest injection.
- There must be no code between `_START` and `_END` that isn't managed by YCS. Hand-written code goes **above** the `_START` marker.
- Import markers (`_IMPORTS_START` / `_IMPORTS_END`) are placed in the import section of the file, separate from the registration markers.

### Existing Markers in Codebase

| File | Marker Name | Status |
|------|-------------|--------|
| `ModItems.java` | `YCS_Mod_Items` | Active |
| `ModBlocks.java` | `YCS_Mod_Blocks` | Active |
| `ModEffects.java` | `YCS_Effects` | Active |
| `ModAttributes.java` | `YCS_Attributes` | Active |
| `ModAttributes.java` | `YCS_Attributes_IMPORTS` | Active (import block) |
| `ModDataComponents.java` | `YCS_DataComponents` | Active |
| `ModCreativeModeTabs.java` | `YCS_Mod_Creative_Tabs` | Active |
| `ModSounds.java` | — | **Needs markers added** |
| `ModEntities.java` | — | **Needs markers added** |

## 7. Operations

### 7.1 Creating an Entry

1. Generate a unique `entry_id` (snake_case, e.g., `ruby_sword`).
2. For each injection defined by the entry type (§4):
   a. **java-marker:** Read the target file, find the `_END` marker, insert the generated code before it, save.
   b. **json-key:** Read the JSON, add the key, write back sorted.
   c. **created-file:** Write the new file to disk.
3. Record all injections in `ycs-manifest.json` under the new entry.
4. If new assets were imported (textures, sounds), register them in the `assets` section with `usedBy` pointing to this entry.

### 7.2 Deleting an Entry

1. Look up the entry in `ycs-manifest.json`.
2. For each injection (in reverse order):
   a. **java-marker:** Read the file, find and remove the `content` lines between the markers, save.
   b. **json-key:** Read the JSON, remove the key, write back.
   c. **created-file:** Delete the file from disk.
3. For each asset in `assets[]`:
   a. Remove this entry's id from the asset's `usedBy` array.
   b. If `usedBy` is now empty, **warn the user** that the asset is orphaned and offer to delete it.
4. Remove the entry from `ycs-manifest.json`.

### 7.3 Renaming an Entry

1. Perform deletion of the old id (§7.2) but **retain** the `properties` and `assets`.
2. Perform creation with the new id (§7.1) using the retained data.
3. Update all `usedBy` references in the `assets` section.

### 7.4 Asset Dependency Check

Before deleting any asset (texture, sound, model):
1. Look up `assets.<id>.usedBy` in the manifest.
2. If `usedBy` has entries, **block deletion** and show: "This asset is used by: [list]. Remove those references first."
3. If `usedBy` is empty, safe to delete.

## 8. File Engine Architecture

The file engine lives in `electron/engine/` and provides all file I/O through IPC. React components call `window.electronAPI.fileEngine.*` directly.

### Module Layout

```
electron/engine/
├── files.js        — File CRUD, directory scanning, path resolution, mod root config
├── json-ops.js     — JSON read/write/key operations (flat + nested)
├── markers.js      — Generic marker scanning, reading, writing, appending, removing
├── manifest.js     — Manifest CRUD, entry/asset management, dependency tracing
└── ipc-bridge.js   — IPC handler registration with uniform error wrapping
```

### IPC Channel Namespace

All channels use `ipcMain.handle` / `ipcRenderer.invoke` (Promise-based). Every response returns `{ ok: true, data }` or `{ ok: false, error: string }`.

| Namespace | Channels |
|-----------|----------|
| `ycs:config:*` | `getModRoot`, `setModRoot` |
| `ycs:files:*` | `read`, `write`, `copy`, `delete`, `deleteDir`, `list`, `exists`, `pickDirectory` |
| `ycs:json:*` | `read`, `write`, `getKey`, `setKey`, `deleteKey` |
| `ycs:markers:*` | `scan`, `read`, `write`, `append`, `remove` |
| `ycs:manifest:*` | `load`, `save`, `addEntry`, `updateEntry`, `removeEntry`, `addAsset`, `removeAsset`, `trace`, `listEntries`, `orphanedAssets` |

### Path Resolution

- All file paths from the renderer are **relative to `<modRoot>/src/main/`**.
- The IPC bridge resolves them to absolute paths server-side with a path traversal guard.
- Mod root is stored in `app.getPath('userData')/ycs-config.json`, configured once via `ycs:config:setModRoot`.

### React Consumption

```js
const result = await window.electronAPI.fileEngine.markers.scan('java/.../ModItems.java');
if (result.ok) console.log(result.data);
```

## 9. Complete Marker Inventory

The engine generically handles **any** marker pair — it is not limited to these. This is the current inventory:

### Registry Classes (9 files)
| File | Marker | Status |
|------|--------|--------|
| `ModItems.java` | `YCS_Mod_Items` | Active |
| `ModBlocks.java` | `YCS_Mod_Blocks` | Active |
| `ModEntities.java` | `YCS_Entities` | Active |
| `ModSounds.java` | `YCS_Sounds` | Active |
| `ModEffects.java` | `YCS_Effects` | Active |
| `ModDataComponents.java` | `YCS_DataComponents` | Active |
| `ModAttributes.java` | `YCS_Attributes` + `YCS_Attributes_IMPORTS` | Active |
| `ModCreativeModeTabs.java` | `YCS_Mod_Creative_Tabs` | Active |

### Client Classes (2 files)
| File | Markers | Status |
|------|---------|--------|
| `ModKeybinds.java` | `YCS_Mod_Keybinds` + `YCS_Mod_Keybinds_Register` | Active |
| `GeoItemRegistry.java` | `YCS_Geo_Items` + `YCS_Geo_Collect` | Active |

### Datagen Providers (6 files)
| File | Marker | Status |
|------|--------|--------|
| `ModBlockStateProvider.java` | `YCS_Mod_Block_State` | Active |
| `ModBlockTagProvider.java` | `YCS_Mod_Block_Tags` | Active |
| `ModBlockLootTableProvider.java` | `YCS_Mod_Block_Loot` | Active |
| `ModItemModelProvider.java` | `YCS_Mod_Item_Model` | Active |
| `ModItemTagProvider.java` | `YCS_Mod_Item_Tags` | Active |
| `ModRecipeProvider.java` | `YCS_Mod_Recipe_Provider` | Active |

### Custom Classes (1 file)
| File | Markers | Format |
|------|---------|--------|
| `YasuoKatanaItem.java` | `YCS_Import` + `YCS:use` | Primary + colon variant |
