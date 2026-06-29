# YCS V3 Injection & Object Lifecycle

> **AI META-INSTRUCTION FOR UPDATING THIS DOCUMENT:**
> When adding new rules or guidelines to this file:
> 1. **Categorize:** Always place new rules into an appropriate existing category, or create a clearly defined new category if one doesn't exist.
> 2. **Integrate Harmoniously:** **DO NOT** simply append a new line to the bottom of lists. Carefully read the existing content and integrate your new rule. Rephrase or restructure sections if necessary to keep the document clean, highly readable, and logically organized.

This document defines how YCS V3 creates, edits, and deletes objects, and how the injection/manifest system works for any object type.

---

## Data Storage Layout

```
ycs-data/                          # Isolated from mod source (V3 Principle #3)
├── items/                         # One JSON per item
│   └── ruby_sword.json
├── textures/                      # Shared texture pool
│   ├── ruby_sword.json            # Metadata (id, label, fileName)
│   └── ruby_sword.png             # Actual image file
└── models/                        # Per-item 3D model files
    ├── ruby_sword.geo.json        # Bedrock geometry
    └── ruby_sword.display.json    # Vanilla display transforms
```

Key rules:
- **Textures** are shared assets — any item can reference any texture by ID. Stored as separate PNG + metadata JSON.
- **Models** (geo + display) are per-item, keyed by item ID. Not shared across items.
- **Object JSONs** (items, blocks, etc.) contain all field data plus an `_injections` manifest array.

---

## The `_injections` Manifest

Every object JSON embeds an `_injections` array that tracks exactly what was written into the mod. This is the core of V3's cleanup system.

### Injection Types

| Type | Fields | What It Tracks |
|------|--------|----------------|
| `java-marker` | `file`, `marker`, `content` | A line inserted above a `// MARKER` comment in a Java file |
| `json-key` | `file`, `key` | A key set in a JSON file (e.g., lang entry) |
| `created-file` | `file` | A file written to the mod (texture, model, etc.) |

### Example Manifest

```json
{
  "id": "ruby_sword",
  "displayName": "Ruby Sword",
  "holdingMode": "3d",
  "_injections": [
    { "type": "java-marker", "file": "java/.../ModItems.java", "marker": "YCS_Mod_Items", "content": "    public static final ..." },
    { "type": "json-key", "file": "resources/.../lang/en_us.json", "key": "item.yebisurpg.ruby_sword" },
    { "type": "created-file", "file": "resources/.../geo/item/ruby_sword.geo.json" },
    { "type": "created-file", "file": "resources/.../textures/geo/item/ruby_sword.png" },
    { "type": "java-marker", "file": "java/.../GeoItemRegistry.java", "marker": "YCS_Geo_Collect", "content": "        tryRegister(items, ..." },
    { "type": "created-file", "file": "resources/.../models/item/ruby_sword.json" }
  ]
}
```

---

## Object Lifecycle

### 1. Creation (New Item)

1. User fills in fields in the editor
2. User clicks **Save**
3. YCS injects all content into the mod (see Injection Targets below)
4. Each injection is recorded in the `_injections` array
5. The full object JSON (fields + `_injections`) is saved to `ycs-data/<category>/<id>.json`
6. Editor auto-closes

### 2. Editing (Re-opening a Saved Item)

1. YCS loads the object JSON from `ycs-data/`
2. All fields are populated from JSON, including `_injections` (stored in React state as `currentInjections`)
3. `lastSavedId` tracks the current ID for detecting ID changes
4. User modifies any field(s)
5. User clicks **Save** — the **full re-inject** cycle runs:
   - `removeExistingInjections()` walks `currentInjections` **in reverse**, removing each injection from the mod
   - If the ID changed, the old `ycs-data` JSON and old model files are deleted
   - Fresh injections are written using current field values
   - New `_injections` array is saved

**This means every save is idempotent** — it doesn't matter what changed, the entire injection set is rebuilt from scratch.

### 3. Removal (Delete Item)

1. `removeExistingInjections()` cleans up all mod files
2. Per-item model files (`ycs-data/models/<id>.geo.json`, `<id>.display.json`) are deleted
3. The object JSON (`ycs-data/items/<id>.json`) is deleted
4. Editor auto-closes

### 4. ID Change During Edit

When the item ID changes between saves:
1. Old injections are removed (they reference the old ID in file paths and content)
2. Old `ycs-data/<category>/<oldId>.json` is deleted
3. Old `ycs-data/models/<oldId>.geo.json` and `<oldId>.display.json` are deleted
4. Everything is re-injected under the new ID
5. New JSON is saved as `ycs-data/<category>/<newId>.json`

---

## Injection Targets by Holding Mode

### Flat (Generated) / Handheld Items

| Target | Marker/Path | Content |
|--------|-------------|---------|
| Item registration | `ModItems.java` → `YCS_Mod_Items` | `DeferredItem<Item>` field declaration |
| Lang key | `lang/en_us.json` → key | `item.yebisurpg.<id>` |
| Model provider | `ModItemModelProvider.java` → `YCS_Mod_Item_Model` | `basicItem()` or `handheldItem()` call |
| Texture file | `textures/item/<id>.png` | Copied from `ycs-data/textures/` |
| Creative tab | `ycs/ycs_tabs.json` → key | Tab assignment |

### 3D Model Items

| Target | Marker/Path | Content |
|--------|-------------|---------|
| Item registration | `ModItems.java` → `YCS_Mod_Items` | `DeferredItem<Item>` field declaration |
| Lang key | `lang/en_us.json` → key | `item.yebisurpg.<id>` |
| Geo model file | `geo/item/<id>.geo.json` | Copied from `ycs-data/models/` |
| Geo texture file | `textures/geo/item/<id>.png` | Copied from `ycs-data/textures/` |
| Geo registry | `GeoItemRegistry.java` → `YCS_Geo_Collect` | `tryRegister(items, ModItems.XX, "xx")` |
| Display model | `models/item/<id>.json` | Copied from `ycs-data/models/` or generated as `builtin/entity` fallback |
| Creative tab | `ycs/ycs_tabs.json` → key | Tab assignment |

**3D items do NOT inject into `ModItemModelProvider`** — datagen doesn't handle geo models.

---

## Marker Format

V3 uses single-line markers (not START/END pairs from V1):

```java
// YCS_Mod_Items
```

Content is inserted on the line **above** the marker. Removal searches for the exact content string and deletes the matching line(s).

### Active Markers

| Marker | File | Purpose |
|--------|------|---------|
| `YCS_Mod_Items` | `ModItems.java` | Item DeferredItem declarations |
| `YCS_Mod_Item_Model` | `ModItemModelProvider.java` | Datagen model calls (flat/handheld only) |
| `YCS_Geo_Collect` | `GeoItemRegistry.java` | 3D item registration in `collectGeoItems()` |

---

## Shared Assets vs Per-Item Assets

| Asset | Storage | Sharing | Cleanup |
|-------|---------|---------|---------|
| Textures | `ycs-data/textures/<id>.png` + `.json` | Shared — any item can reference by ID | Warning prompt if in use; user decides |
| Geo models | `ycs-data/models/<itemId>.geo.json` | Per-item — keyed by item ID | Auto-deleted when item is removed |
| Display models | `ycs-data/models/<itemId>.display.json` | Per-item — keyed by item ID | Auto-deleted when item is removed |

---

## Tauri Backend Commands

### YCS Data CRUD
- `save_ycs_data(category, id, content)` — write object JSON
- `load_ycs_data(category, id)` — read object JSON
- `delete_ycs_data(category, id)` — delete object JSON
- `list_ycs_data(category)` — list all IDs in a category

### Textures (Shared Pool)
- `save_texture(id, metadata)` — save texture metadata JSON
- `import_texture_image(id, sourcePath)` — copy image file into ycs-data
- `load_texture(id)` / `load_texture_image(id)` — read metadata / image as data URL
- `delete_texture(id)` — delete both metadata and image
- `list_textures()` — list all texture IDs
- `find_texture_usage(textureId)` — find items using this texture
- `rename_texture_image(oldId, newId)` — rename image file on ID change
- `copy_texture_to_mod(textureId, destFile)` — copy texture into mod resources

### Models (Per-Item)
- `import_geo_model(id, sourcePath)` — copy .geo.json into ycs-data/models/
- `import_display_model(id, sourcePath)` — copy display JSON into ycs-data/models/
- `load_geo_model_path(id)` — get path to stored geo model
- `load_display_model(id)` — read display model JSON content
- `delete_geo_model(id)` — delete both .geo.json and .display.json for an ID
- `list_geo_models()` — list all stored geo model IDs
- `copy_geo_model_to_mod(modelId, destFile)` — copy geo model into mod resources
- `copy_display_model_to_mod(modelId, destFile)` — copy display model into mod resources
- `rename_geo_model(oldId, newId)` — rename geo model file

### Injection Engine
- `inject_marker(file, marker, content)` — insert content above a marker comment
- `remove_marker_content(file, marker, content)` — remove a previously injected line
- `set_json_key(file, key, value)` — set a key in a JSON file
- `delete_json_key(file, key)` — remove a key from a JSON file
- `write_mod_file(file, content)` — write a text file to mod resources
- `write_mod_file_base64(file, data)` — write a binary file to mod resources
- `delete_mod_file(file)` — delete a file from mod resources

### Utility
- `get_mod_root()` — return the mod project root path
- `read_image_base64(path)` — read any image file as a data URL

---

## Editor UI Pattern

Every object editor follows this pattern:

### Footer Buttons (left to right)
`[status message]` — `Remove` — `Cancel` — `Save`

- **Save** — runs full re-inject cycle, auto-closes
- **Cancel** — discards unsaved changes, goes back
- **Remove** — removes all injections + deletes ycs-data, goes back (only shown for previously saved items)

### State Management
- `currentInjections` — the `_injections` array from the loaded JSON (used for cleanup)
- `lastSavedId` — tracks the last-saved ID to detect ID changes and clean up orphans
- `injected` — boolean flag, true if the item has been saved at least once

### Adding a New Object Type

When creating a new object type (blocks, tabs, etc.), follow this pattern:

1. Create `ycs-data/<category>/` storage via `save_ycs_data` / `load_ycs_data`
2. Define which markers and files the object injects into
3. Build the `_injections` array during save, tracking every file touched
4. Use `removeExistingInjections()` before every re-inject
5. On remove, walk `_injections` in reverse + delete any per-item asset files + delete the object JSON
6. On ID change, delete old JSON + old per-item assets before re-injecting under the new ID
