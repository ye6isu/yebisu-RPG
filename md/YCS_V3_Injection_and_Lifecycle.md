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

All items (regardless of holding mode) also inject their declared **Data Components** — see `Data Components` below.

### Flat (Generated) / Handheld Items

| Target | Marker/Path | Content |
|--------|-------------|---------|
| Item registration | `ModItems.java` → `YCS_Mod_Items` | `DeferredItem<Item>` field declaration |
| Lang key | `lang/en_us.json` → key | `item.yebisurpg.<id>` |
| Model provider | `ModItemModelProvider.java` → `YCS_Mod_Item_Model` | `basicItem()` or `handheldItem()` call — **only used when the item's texture is not a static frame-sheet** (see below); this path relies on Gradle's `runData` task to actually produce the model JSON, unlike everything else YCS injects. |
| Texture file | `textures/item/<id>.png` | Copied from `ycs-data/textures/`. Still copied even for static frame-sheets (see below), though unused by the model in that case — harmless, tracked/cleaned up like any other injection. |
| Animation metadata | `textures/item/<id>.png.mcmeta` | Only written when the item's `texture` references a texture with `rows` > 1 and `animatedOnUse` true — `{ animation: { frametime: <ticksPerFrame> } }`, vanilla's own animated-texture format (no code needed, the resource pack system splits/plays the vertical strip automatically). Tracked as a `created-file` injection like the PNG itself, so it's cleaned up/rewritten on every re-inject the same way. |
| Creative tab | `ycs/ycs_tabs.json` → key | Tab assignment |

**Static (non-animated) frame-sheets — `rows` > 1 and `animatedOnUse` false:** rather than going through Gradle's `ModItemModelProvider` datagen (which only runs on an explicit `runData` task, breaking YCS's "Save is immediately live" guarantee), YCS writes real model/texture files directly, mirroring how 3D items' display model is handled:
- `write_item_frame_textures` (Tauri/Rust, uses the `image` crate) slices the source spritesheet into one PNG per row, written to `textures/item/<id>_frame<N>.png`.
- One tiny model JSON is written per frame — `models/item/<id>_frame<N>.json` — `{ parent: "minecraft:item/generated" (or "minecraft:item/handheld"), textures: { layer0: "<modid>:item/<id>_frame<N>" } }`.
- The base model — `models/item/<id>.json` — points `layer0` at the **`defaultFrame`** slice, plus an `overrides` list using the old-style integer `predicate.custom_model_data` mechanism: `{ predicate: { custom_model_data: row + 1 }, model: "<modid>:item/<id>_frame<row>" }` for every row. The `+ 1` offset matches the existing `Set/Get/Reset Item Texture Frame` Blocky blocks' convention (0 = no override/default, so real frames start at CustomModelData 1) — see `itemstack.set_texture_frame`/`get_texture_frame`/`reset_texture_frame` in `blockDefs.js`, which already write/read this exact component and required no changes.
- All per-frame PNGs and model JSONs are tracked as ordinary `created-file` injections in the item's own `_injections` array — full cleanup/re-inject on every save works automatically, no special-casing needed in `removeExistingInjections()`.
- This intentionally does **not** use 1.21.1's newer `range_dispatch`/float `custom_model_data` model format — that would require rewriting the already-working Blocky blocks to write a different, incompatible data component for no real benefit here.

### 3D Model Items

| Target | Marker/Path | Content |
|--------|-------------|---------|
| Item registration | `ModItems.java` → `YCS_Mod_Items` | `DeferredItem<Item>` field declaration |
| Lang key | `lang/en_us.json` → key | `item.yebisurpg.<id>` |
| Geo model file | `geo/item/<id>.geo.json` | Copied from `ycs-data/models/` |
| Geo texture file | `textures/geo/item/<id>.png` | Copied from `ycs-data/textures/` |
| Geo registry | `GeoItemRegistry.java` → `YCS_Geo_Collect` | `tryRegister(items, ModItems.XX, "xx")`, or the 7-arg overload (`..., rows, animated, ticksPerFrame, defaultFrame`) when `geoTexture` is a frame-sheet (`rows` > 1) — see below. |
| Display model | `models/item/<id>.json` | Copied from `ycs-data/models/` or generated as `builtin/entity` fallback |
| Creative tab | `ycs/ycs_tabs.json` → key | Tab assignment |

**3D items do NOT inject into `ModItemModelProvider`** — datagen doesn't handle geo models.

**3D frame-sheets/animation — `rows` > 1 on the item's `geoTexture`:** unlike flat items, `GeoItemRenderer` already natively supports both static frame selection and true looping animation entirely at render time — no per-frame texture slicing, no per-frame model files, nothing extra written to disk. It reads UV `vFrameOffset` off the single spritesheet texture directly, so wiring this up was purely a matter of passing the right arguments through the existing (already built, previously unused) machinery:
- `GeoItemRenderer.StateAnim(frames, animated, ticksPerFrame, defaultFrame)` — `defaultFrame` is a newly added 4th field (a 3-arg legacy constructor still exists, defaulting `defaultFrame` to 0, so old call sites/registrations aren't broken).
- Frame selection in `renderByItem`: if `animated`, the frame comes from `TextureFrameClock.frameAt(...)` (ticking, server-authoritative-agnostic — purely client render-time, same as before). If not animated, the frame is `CustomModelData - 1` when `CustomModelData` is set (non-zero) — i.e. the exact same `Set/Get/Reset Item Texture Frame` Blocky blocks used for flat items work identically here, no changes needed there — otherwise it falls back to `defaultFrame` instead of always defaulting to frame 0.
- `GeoItemRegistry.tryRegister` gained a `defaultFrame` parameter (7-arg overload); the 6-arg and 3-arg overloads still exist and default it to 0.
- YCS's `ItemEditor.jsx` looks up the referenced `geoTexture`'s metadata (`rows`, `animatedOnUse`, `ticksPerFrame`, `defaultFrame` — the exact same texture metadata fields flat items use) and emits the 7-arg `tryRegister(...)` call when `rows` > 1, or the plain 3-arg call otherwise. Frame-count auto-detection (`detectFrameCount`, comparing PNG dimensions against the geo model's declared `texture_width`/`texture_height`) still runs as a fallback if `frames` isn't passed, but YCS always passes an explicit `frames` (= `rows`) now to avoid relying on auto-detection guessing wrong.

### Multi-State Items

**"State" here means a completely independent look** (a different 3D model, a different flat icon, or both mixed on the same item) — switched at runtime via `CustomModelData` as a state index — distinct from spritesheet frames above, which vary UV within one single model. Opt-in per item (a new "Multiple States" checkbox in the item editor's Appearance section); items that don't use it are completely unaffected, since single-state code paths are untouched.

**Core architectural constraint:** vanilla decides *once per Item* (not per state) whether it's custom-rendered (3D, base model = `builtin/entity`, routed to `GeoItemRenderer`) or flat-rendered (vanilla's own baked-quad + `custom_model_data` override system) — this decision happens before `renderByItem` is ever called. So an item mixing 3D and flat states must have its base model set to `builtin/entity` (to get *any* state routed through the custom renderer at all), and `GeoItemRenderer` itself manually renders the flat states' baked quads (via `Minecraft.getInstance().getItemRenderer().render(stack, ctx, false, poseStack, buffer, light, overlay, bakedModel)`, with the model resolved directly by `ResourceLocation` rather than through vanilla's own model-resolution/override dispatch, avoiding any recursion back into the custom renderer).

| Case | Registration | Rendering |
|------|--------------|-----------|
| At least one state is 3D | `GeoItemRegistry.tryRegisterMixedStates(items, deferred, List<StateSpec>)` under `YCS_Geo_Collect`, one call covering all states | Custom renderer registered for the whole Item; `GeoItemRenderer.renderByItem` branches per state on `ItemStateEntry.kind()` — `GEO` states use the existing bone-rendering path, `FLAT` states render baked quads directly |
| All states are flat | Reuses the existing static-frame-sheet mechanism (one base model + `custom_model_data` overrides, "state index" and "frame index" share the same dispatch), no custom renderer registered at all | Stays entirely on vanilla's own dispatch |

Java-side additions (`GeoItemRenderer.java`):
- `enum StateKind { GEO, FLAT }` and `record ItemStateEntry(StateKind kind, ResourceLocation geoLoc, ResourceLocation texture, StateAnim stateAnim, ResourceLocation flatModelLoc, ResourceLocation displayModelLoc)` — **per-state display model** (each state can have its own holding pose/transform, not one shared pose for the whole item).
- `GeoItemEntry` is now `record GeoItemEntry(List<ItemStateEntry> states)` (previously three parallel lists) — all existing `register(...)` overloads still work, internally building single/multi-entry all-`GEO` state lists, so old call sites and the plain single-model/multi-geo-model registration paths are unaffected.
- `GeoItemRegistry.tryRegisterMixedStates(items, deferred, List<StateSpec>)` replaces the two previously-dead `tryRegisterStates` overloads. `StateSpec(kind, id, frames, animated, ticksPerFrame, defaultFrame)` — `kind` is `"geo"` or `"flat"`; `id` names the per-state files (`<itemId>_state<i>`); the frame/anim fields are geo-only (ignored for flat states, which get their own spritesheet handling via the existing static-frame-sheet path instead).

File namespacing: every per-state asset (geo model, geo texture, display model, flat model, flat texture) is written under `<itemId>_state<i>` instead of bare `<itemId>`, tracked as ordinary `created-file`/`java-marker` injections in the item's own `_injections` array — full cleanup/re-inject/ID-rename works automatically via the existing generic `removeExistingInjections()` cycle, no special-casing needed.

**Known limitation:** Item State and Item Texture Frame (`Set/Get/Reset Item Texture Frame` Blocky blocks) both write the same underlying `CustomModelData` integer — an item can use one mechanism or the other, not both simultaneously (setting a texture frame would overwrite whatever state was set, and vice versa). Not a bug; just don't combine multi-state items with texture-frame-driven items.

### Creative Tabs

| Target | Marker/Path | Content |
|--------|-------------|---------|
| Tab registration | `ModCreativeModeTabs.java` → `YCS_Mod_Creative_Tabs` | `DeferredHolder<CreativeModeTab>` field |
| Lang key | `lang/en_us.json` → key | `itemGroup.yebisurpg.<id>` |

Tab-to-item assignment is handled per-item: each item's `creativeTab` field injects one conditional line into `ModCreativeTabContents.java` → `YCS_Tab_Contents`. This means tab assignment is tracked in the **item's** `_injections` array, not the tab's.

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
| `YCS_Mod_Item_Imports` | `ModItems.java` | Import statements for custom item classes |
| `YCS_Mod_Item_Model` | `ModItemModelProvider.java` | Datagen model calls (flat/handheld only) |
| `YCS_Geo_Collect` | `GeoItemRegistry.java` | 3D item registration in `collectGeoItems()` |
| `YCS_Mod_Fuel` | `ModFuelEvents.java` | Fuel burn time entries via `FurnaceFuelBurnTimeEvent` |
| `YCS_Mod_Creative_Tabs` | `ModCreativeModeTabs.java` | `DeferredHolder<CreativeModeTab>` declarations |
| `YCS_Mod_Creative_Tab_Imports` | `ModCreativeModeTabs.java` | Import statements (reserved for future use) |
| `YCS_Tab_Contents` | `ModCreativeTabContents.java` | Item-to-tab assignments via `BuildCreativeModeTabContentsEvent` |
| `YCS_Cycler_Register` | `TabIconCycler.java` | `ENTRIES.add(...)` calls for tabs with icon cycling enabled |
| `YCS_Data_Components` | `ModDataComponents.java` | `DataComponentType` field declarations — global (`<name>`, owned by `ycs-data/components/`) and item-specific (`<itemId>_<name>`, owned by the item) |

---

## Data Components

Data components (`DataComponentType`s stored on an `ItemStack`) come in two flavors, both editable via YCS. Supported `type` values for either flavor:

| Type | Java Type | Codec |
|------|-----------|-------|
| `double` | `Double` | `Codec.DOUBLE` |
| `boolean` | `Boolean` | `Codec.BOOL` |
| `string` | `String` | `Codec.STRING` |

Only these three scalar types are supported. An earlier `itemstack` (`List<ItemStack>`) type existed for socketed/held-item use cases but was removed — it was never wired into a real inventory UI and added complexity (per-block `dropdownRequiresCompType`/`dropdownExcludesCompType` filtering, a dedicated `ITEMSTACK_STREAM_CODEC`, four extra Blocky opcodes) for a feature nobody used yet. Revisit as a fresh addition if a real use case comes up.

### Global Components (`ycs-data/components/`)

Defined once on the **Data Components** page, independent of any item — the right choice when many items should share the exact same `DataComponentType` (e.g. `max_ammo` used identically by every gun item, so shared code can do `stack.get(ModDataComponents.MAX_AMMO.get())` regardless of which gun it is).

- Stored as `ycs-data/components/<name>.json`: `{ name, type, defaultValue }`.
- Registered as `ModDataComponents.<NAME>` via `ModDataComponents.register*(name)`, injected above `YCS_Data_Components` — owned by the component's own `_injections`, not by any item.
- Deleting a global component checks `find_component_usage` for items that reference it (via `dataComponents[].ref`) and warns before deleting; referencing items are **not** auto-updated and will keep a dangling `ref` until re-saved.

### Item-Specific Components

Declared inline in an item's own editor — the right choice for one-off mechanics that don't generalize to other items (e.g. a legendary weapon's unique cooldown).

- Stored in the item's own JSON as `dataComponents: [{ kind: 'inline', name, type, defaultValue }]`.
- Registered as `<itemId>_<name>` (uppercased for the constant name), injected above `YCS_Data_Components`, and tracked in **that item's** `_injections` — cleaned up automatically like any other item injection.

### Blocky Wiring (Get/Set Data Component)

The `Get Data Component` / `Set Data Component` blocks (`datacomp.get` / `datacomp.set` in `blockDefs.js`) use a `compName` field with `source: "dataComponents"` and `searchable: true`, rendered as a searchable dropdown (not free text) by `BlockEditor.jsx`'s `SegmentItem`. Options are loaded on mount/`itemId` change from both `ycs-data/components/*` (labeled `"<name> (Global)"`) and the current item's own inline `dataComponents`. Selecting an option also writes hidden `compType`/`compConstName` fields onto the node, which `compiler.js` uses to pick the right codegen (`dataComponentConstName(node)` for the Java constant reference, `compType` to decide numeric/boolean/string handling).

**Dropdown rendering note:** a dropdown's data source is resolved from `fieldDef.source` (declared in the block's `fields` entry) with a fallback to the label-parsed `seg.source` (from the `[key:dropdown.sourceName]` token) — either is sufficient, but blocks that skip declaring `fields` entirely still need the label token for the fallback to kick in.

### Attaching a Global Component to an Item

An item can also reference an existing global component without creating a new registration: `dataComponents: [{ kind: 'ref', ref: '<globalName>', overrideDefault }]`. No Java injection happens for `ref` entries — only the reference (and optional per-item default override) is stored in the item's JSON. An item's `dataComponents` array may freely mix `inline` and `ref` entries.

---

## Shared Assets vs Per-Item Assets

| Asset | Storage | Sharing | Cleanup |
|-------|---------|---------|---------|
| Textures | `ycs-data/textures/<id>.png` + `.json` | Shared — any item can reference by ID | Warning prompt if in use; user decides |
| Geo models | `ycs-data/models/<itemId>.geo.json` | Per-item — keyed by item ID | Auto-deleted when item is removed |
| Display models | `ycs-data/models/<itemId>.display.json` | Per-item — keyed by item ID | Auto-deleted when item is removed |

### Texture Metadata (`ycs-data/textures/<id>.json`)

Beyond `id`/`label`/`fileName`, a texture's metadata JSON carries optional fields used by the runtime texture overlay/spritesheet system (`net.ye6isu.yebisuRPG.texture.*` in the mod):

| Field | Values | Purpose |
|-------|--------|---------|
| `rows` | integer, default `1` | Spritesheet frame count — one frame per row, single column, read top-to-bottom. Only defines the frame grid — playback (loop mode/speed) is set separately, see below. |
| `defaultFrame` | integer, default `0` | Which row/frame an item using this texture displays when not actively animated. UI-only value — not enforced anywhere at runtime yet. |
| `animatedOnUse` | boolean, absent = false | Opt-in flag: "this spritesheet always animates on any item that uses it" — the simple, unsynced case (e.g. a torch-like flicker on a held item). Only present when `rows` > 1. Distinct from the server-synced entity overlay system below. |
| `ticksPerFrame` | integer, default `4` | Playback speed for `animatedOnUse` — only present when `animatedOnUse` is true. Once an item is wired to consume an `animatedOnUse` texture, this is the value that drives its actual in-game playback speed (not just the editor preview). This is the client-side unsynced counterpart to the `ticksPerFrame` argument passed to `overlay.play`; the two are independent settings for two independent systems. |
| `hasMask` | boolean, absent = false | Whether a shape-cutout mask image is attached (`MaskMode.CUTOUT_BELOW`) — stored as its own image file at `ycs-data/textures/<id>_mask.<ext>`, imported/dropped directly in the texture editor (not picked from the pool). Additive, not a separate texture type — a texture can have a mask, an emissive, both, or neither. |
| `hasEmissive` | boolean, absent = false | Whether a full-brightness glow image is attached, stored at `ycs-data/textures/<id>_emissive.<ext>` the same way. |

The texture editor also has an animation **preview** (play/pause + the `ticksPerFrame` field when `animatedOnUse` is checked, canvas-based, using `rows` from the current image) purely so the artist can eyeball how a spritesheet will read at a given speed.

`rows`/`defaultFrame`/`animatedOnUse`/`ticksPerFrame` are now consumed on both item paths when an item's texture/`geoTexture` references a frame-sheet:
- **Flat/handheld items** — see the frame-sheet override-model writeup under "Flat (Generated) / Handheld Items" above (`ItemEditor.jsx` slices the sheet into per-frame PNGs + writes model JSON with `custom_model_data` overrides at Save time; `animatedOnUse` still goes through the vanilla `.mcmeta` path instead).
- **3D geo items** — see the writeup under "3D Model Items" above (`GeoItemRenderer`'s `StateAnim`/`TextureFrameClock.frameAt`, fed directly from this same texture metadata via the `tryRegister(..., rows, animated, ticksPerFrame, defaultFrame)` overload — no extra files, frame selection happens purely via UV offset at render time).

**Two independent animation systems, by design:**
- **`animatedOnUse` (this section)** — simple and unsynced. Whenever any item is set to use this texture, it just always plays back at `ticksPerFrame`, no Blocky wiring needed, no network sync. Good for decorative/cosmetic flicker that doesn't need to look identical across clients.
- **The Blocky `overlay.play`/`overlay.stop` system** (see Data Components → Blocky Wiring section, and `TextureAuthority`/`TextureServerEvents`) — server-authoritative and synced for late joiners and players outside view distance. This system can also **override** an item that's already showing an `animatedOnUse` (or static) texture: while a Blocky-triggered overlay is playing on that item/entity, it takes visual precedence, and once the overlay is stopped or finishes, the item reverts to showing its own animated/original texture again.

**No animation config lives on the texture itself.** Playback (loop / play once / hold-last-frame, speed, ticks-per-frame) is chosen in the **Blocky editor** via the `Play Texture Overlay Animation` / `Stop Texture Overlay Animation` blocks (`overlay.play` / `overlay.stop` in `blockDefs.js`), which call `TextureServerEvents.play(entity, mode, ticksPerFrame, speed)` / `.stop(entity, restFrame)`. This mirrors how bone/pose animation triggers work — one texture asset can be played back differently by different Blocky graphs, rather than baking a single animation choice into the imported asset.

**Sync model** (see `TextureComponent`/`TextureFrameClock`/`TextureServerEvents` in the mod): there is exactly one animation model, and it is always server-synced — `play()` sends one message carrying a `startTick` + `speed` (the same playhead-origin approach as bone/pose `AnimationPlayhead`), and every client computes the identical current frame from that shared origin, with no per-frame network traffic. Late joiners and newly-tracking players get the same playhead via `TextureAuthority`'s re-send on login/start-tracking, so there is no cosmetic/desyncable animation mode to choose between — only "playing" vs. "stopped at a fixed rest frame." The two mask modes (`CUTOUT_BELOW` via the attached mask image, `ALPHA_FROM_BASE` — conforms to whatever's already opaque beneath it) apply to entity overlays generally (players and mobs alike, via `EntityTextureCompositor`), not just items.

---

## Dedicated Server Compatibility

This mod ships **no runtime dependencies** and must work correctly on a real dedicated server with multiple independent clients — not just singleplayer/LAN, where a client and "server" happen to share the same tick clock in-process and sync bugs are easy to miss. Every feature that has any cross-client visual or gameplay state must be checked against this before being considered done. The two mechanisms already in the mod that get this right are the reference pattern for anything new:

- **Plain vanilla `DataComponent` state on an `ItemStack`** (e.g. `CustomModelData`, used by `Set/Get/Reset Item Texture Frame`) — needs **zero custom sync code**. Vanilla's own inventory/container sync re-sends the full stack (including all its components) to every client that can see it whenever it changes, and to newly-joining/newly-tracking clients as a matter of course. This is why static item texture-frame switching (flat items' `custom_model_data` overrides, and 3D geo items' `CustomModelData`-driven `vFrameOffset`) is dedicated-server-correct with no extra plumbing — it rides entirely on mechanisms vanilla already guarantees.
- **Tick-derived animation with no per-instance network state** (`TextureFrameClock.frameAt(tick, ticksPerFrame, frameCount, mode)`, used by both `GeoItemRenderer`'s `animated` StateAnim path and, with an explicit `startTick`, the entity texture overlay system) — every client computes the same frame from the same input, because `tick` (`level.getGameTime()`) is itself kept in sync with the server by vanilla, not by this mod. No packet is sent per frame, and a client joining mid-animation lands on the correct frame immediately just by evaluating the same pure function against whatever tick it currently has. This is why 3D item animation (and the entity overlay system, which additionally re-sends its `startTick` playhead on login/start-tracking via `TextureAuthority`, since *when* it started is real state a late joiner can't otherwise derive) both work correctly for late joiners and players who were previously out of tracking range.

**The one system that requires (and has) explicit server authority** is the entity texture overlay system (`TextureAuthority`/`TextureServerEvents`/`TextureSyncPayload`) — because *which* layers are attached to an entity at all is real state that can't be derived from a pure function of tick alone, it's stored server-side and pushed to clients on change/login/start-tracking. Contrast this with `animatedOnUse` on a texture: whether an item's texture animates is baked into the mod's assets at Save time (same for every client that has the resource pack), not toggleable per-instance at runtime, so it needs no sync system at all — it's not state, it's content.

**Checklist for anything new that touches visuals/behavior across clients:**
1. Is the varying piece stored as vanilla state on an entity/stack/block entity that vanilla already syncs (a `DataComponent`, standard NBT, etc.)? If so, no custom sync is needed — but verify the mechanism is a real vanilla one, not something read only client-side (e.g. reading `Minecraft.getInstance()` client-only state is never valid on server-authoritative behavior).
2. If it's animation/ticking, can it be expressed as a pure function of the shared, already-synced game tick (`level.getGameTime()`), with any "when did this start"/"what layers are active" state pushed explicitly on change and on login/start-tracking (mirroring `TextureAuthority`)? If the animation's *existence* is itself dynamic per-instance (started/stopped at runtime, not baked into assets), it needs its own server-authoritative store + sync payload, not just a shared clock function.
3. Never gate gameplay-relevant logic behind a client-only check (`Dist.CLIENT`-only classes, `Minecraft.getInstance()`) unless the entire feature is purely cosmetic/client-rendering, as `GeoItemRenderer`/`EntityTextureCompositor` correctly are.

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
