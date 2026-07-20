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
| `YCS_Entity_Attachments` | `ModAttachments.java` | `AttachmentType` field declarations for Entity Variables, owned by `ycs-data/entityvars/` |
| `YCS_Attributes` | `ModAttributes.java` | `Attribute` field declarations for custom Attributes, owned by `ycs-data/attributes/` |
| `YCS_Mod_Keybinds` | `ModKeybinds.java` | `KeyMapping` field declarations, owned by `ycs-data/keybinds/` |
| `YCS_Mod_Keybinds_Register` | `ModKeybinds.java` | `event.register(<NAME>);` calls in `register(RegisterKeyMappingsEvent)` |
| `YCS_Keybind_Register` | `ClientKeybindRegistry.java` | `ClientKeybindRegistry.register("<id>", ModKeybinds.<NAME>);` calls |
| `YCS_Keybind_Press_Dispatch` / `YCS_Keybind_Release_Dispatch` | `KeybindHandlers.java` | Per-keybind compiled Blocky dispatch case bodies (`case "<id>" -> { ...compiled Java...; }`) |
| `YCS_Keybind_Handler_Imports` | `KeybindHandlers.java` | Import statements collected from every keybind's compiled Blocky graphs |
| `YCS_Hud_Layouts` | `ModHud.java` | `HudOverlayRenderer.registerLayout("<name>");` calls, one per saved HUD layout |
| `YCS_Hud_Value_Sources` | `HudValueSources.java` | `register("<layout>_w<i>_value", player -> (double)(...));` / `..._max` calls, one per bound value/max link |
| `YCS_Mod_Entities` | `ModEntities.java` | `EntityType` `DeferredHolder` declarations, owned by `ycs-data/entities/` |
| `YCS_Mod_Entity_Imports` | `ModEntities.java` | Import statements (reserved for future use) |
| `YCS_Entity_Attributes` | `ModEntityEvents.java` | `event.put(ModEntities.<NAME>.get(), LivingEntity.createLivingAttributes()...add(...).build());` calls inside the `EntityAttributeCreationEvent` listener — the `.add(...)` chain is generated directly from the entity's open-ended attribute list |
| `YCS_Entity_Renderer_Collect` | `ModEntityRendererRegistry.java` | `tryRegister(...)` calls in `collectGeoEntities()`, one per entity |
| `YCS_Entity_Hostility` | `ModEntityEvents.java` | `YcsMobData.register(...)` calls, one per entity, registering its hostility mode, goals, idle/walk animation names, and hitbox parts against `YcsMobData`'s static `EntityType`-keyed config map |
| `YCS_Entity_Part_Hit_Dispatch` / `YCS_Entity_Part_Hit_Imports` | `EntityPartHitHandlers.java` | Per-entity compiled "On Part Hit" Blocky dispatch case bodies / collected imports |

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

**Codegen rule — always explicitly unbox typed getters:** any codegen path that reads a value out of a boxed Java source (`DataComponentType<Double>.getOrDefault(...)`, `AttachmentType<Double>` via `entity.getData(...)`, or anything else returning a boxed wrapper type rather than a primitive) **must** wrap the result in an explicit cast to the primitive/target type — `((double)(...))`, `((boolean)(...))`, `((String)(...))` — inside `compiler.js`, not just return the raw boxed expression. A plain `Double` cannot be narrowed directly to `float` (`(float)(myDoubleExpr)` is a compile error, "incompatible types: Double cannot be converted to float") the way a primitive `double` can — this bit `entityvar.get`/`datacomp.get` in practice when their output was fed into a block expecting a `float` (e.g. `Deal Damage`'s `livingTarget.hurt(source, (float)(...))`). Every new value-returning ("get"-style) block added to `blockDefs.js`/`compiler.js` must follow this pattern from the start.

### Attaching a Global Component to an Item

An item can also reference an existing global component without creating a new registration: `dataComponents: [{ kind: 'ref', ref: '<globalName>', overrideDefault }]`. No Java injection happens for `ref` entries — only the reference (and optional per-item default override) is stored in the item's JSON. An item's `dataComponents` array may freely mix `inline` and `ref` entries.

---

## Entity Variables

Entity Variables are named typed values attached to **entities** (players/mobs), not `ItemStack`s — the entity-scoped counterpart to Global Data Components. Supported types are the same three scalars: `double`, `boolean`, `string`. (An earlier `item`-typed variable / spatial entity-storage concept — a llama-style inventory attached without a physical item — was considered but explicitly descoped; revisit as its own feature if needed.)

- Stored as `ycs-data/entityvars/<name>.json`: `{ name, type, defaultValue, _injections }` — always global, no per-item inline/ref split (entities aren't items).
- Registered as `ModAttachments.<NAME>` via `ModAttachments.registerDouble/registerBoolean/registerString(name, defaultValue)`, injected above the `YCS_Entity_Attachments` marker in `ModAttachments.java`.
- **Storage mechanism:** a NeoForge `AttachmentType<T>` (`net.ye6isu.yebisuRPG.entityvar.ModAttachments`), *not* an `ItemStack` `DataComponentType`. Each `registerX` helper calls `AttachmentType.builder(() -> defaultValue).serialize(Codec.X).sync(ByteBufCodecs.X).build()` — the `.sync(...)` builder call means NeoForge automatically pushes the value to every client tracking that entity (and to the entity's own player on join) whenever it changes, with **zero custom networking code** required. This satisfies the dedicated-server-sync checklist for free: it's vanilla-adjacent, NeoForge-guaranteed sync, not a hand-rolled payload.
- Read/write in generated Java via `entity.getData(ModAttachments.NAME.get())` / `entity.setData(ModAttachments.NAME.get(), value)`.

### Blocky Wiring (Get/Set Entity Variable)

`entityvar.get` / `entityvar.set` in `blockDefs.js` mirror `datacomp.get`/`datacomp.set` exactly, with an entity-scoped receiver instead of an item-stack one:
- `varName` field uses `source: "entityVariables"`, a searchable dropdown populated by `BlockEditor.jsx` from `ycs-data/entityvars/*` (global list, no item-context filtering needed).
- Selecting an option writes hidden `varType`/`varConstName` fields on the node — same mechanism as `compType`/`compConstName` for Data Components — consumed by `compiler.js`'s `entityVariableConstName(node)` for the Java constant reference and `varType` to pick numeric/boolean/string codegen.
- Both blocks take an `[entity:entity]` slot (same pattern as the Attribute blocks), resolved via `resolveSlotValue(node.slots?.entity, nodes, methodKey) || resolveEntityVar("entity.event", methodKey)` — the same entity-resolution helper used throughout the rest of `compiler.js`.
- `dynamicAccepts`/`dynamicLinkType` (boolean→logic, string→text, else→number) follow the identical pattern used by the Data Component blocks. Both are now actually dispatched: selecting a dropdown option also fires a `__linkType` field update (`BlockEditor.jsx`'s `getBlockColor`/`resolveDynamicLinkType`), so the Get block's socket type/color and the Set block's accepted-input type both react live to the variable's real type — this also retroactively fixed the same latent gap for Data Components, since they share the identical `dynamicLinkType`/`dynamicAccepts` mechanism.
- **Codegen unboxing rule:** `entityvar.get` explicitly casts NeoForge's boxed `AttachmentType<Double>`/`<Boolean>`/`<String>` return value to the primitive/target Java type (`((double)(...))`, `((boolean)(...))`, `((String)(...))`) before returning it — a boxed `Double` cannot be implicitly narrowed to `float` the way a primitive `double` can, which broke early usages feeding a Get Entity Variable value into blocks expecting `float` (e.g. Deal Damage). Every value-returning ("get"-style) block must follow this same explicit-unboxing pattern; see `datacomp.get`, which has the identical fix.

### Codegen Rule — Unique Pattern-Match Binding Names

Any codegen that generates a Java `instanceof` pattern-match binding (e.g. `if (entity instanceof LivingEntity livingTarget)`) must use `compiler.js`'s `bindingName(node, base)` helper (native `handler`-style codegen) or the `{{bind:name}}` interpolation token (`template`-style codegen in `blockDefs.js`) instead of hardcoding the binding name. `bindingName` suffixes the base name with the node's own id, guaranteeing every node gets a distinct binding.

**Why this matters:** Java forbids redeclaring the same pattern-match binding name in a scope where both could be in effect ("illegal attempt to redefine an existing match binding") — this isn't a hypothetical edge case, it broke in practice the first time a `Get Attribute` node (which binds `livingTarget`) was plugged into a value slot of another block that also bound `livingTarget` in the same generated `if` (e.g. an early version of `Set Health`'s `amount` slot fed a `Get Attribute` value). Any two blocks sharing a hardcoded binding name can collide the moment one's value slot feeds into the other, and since nesting is entirely up to the Blocky graph author, this can't be ruled out by block *type* alone — every occurrence must be made unique, not just the ones that have already been observed to collide. All existing `livingTarget`/`livingAttacker`/`playerAttacker`/`chatPlayer`/`cooldownPlayer` bindings across `compiler.js` and `blockDefs.js` were converted to this pattern; any new block introducing a fresh `instanceof` binding must follow suit from the start.

### Codegen Rule — Determining "Raw Text" vs. "Java Expression" by Opcode, Not String-Sniffing

`chat.send`'s codegen combines multiple `text{i}` slots into a single `Component.literal(...).append(...)` chain, and each slot's resolved value needs different handling depending on what produced it: `text.literal` (a plain typed-in string, or an unconnected/empty slot) resolves to **raw, unquoted** text that must be wrapped in a Java string literal before use; every other connected block (`Convert to Text`, `Get Entity Variable`, etc.) resolves to an **already-valid Java expression** that must NOT be re-quoted.

An earlier version of this decided which case applied by pattern-matching the *generated code string* itself (checking if it started with `"`, `String.valueOf(`, or `(`). This broke the first time a new value block (`Convert to Text`'s `String.format(...)`) produced valid code that didn't happen to start with one of the guessed prefixes — it got misclassified as raw text and wrapped in quotes, so the chat message printed the literal source code instead of running it.

The fix: check the **connected node's `opcode`** directly (`nodes.find(n => n.id === slotId)`), not the shape of its resolved output string — `isRawText = !connectedNode || connectedNode.opcode === "text.literal"`. This is robust to any future value block regardless of what Java it generates, since the decision is based on which block produced the value, not on guessing from a string prefix. Any other codegen that needs to distinguish "raw literal" from "connected expression" for a slot should follow this same pattern — check the opcode of the node at the other end of the slot, never sniff the resolved string.

### Codegen Rule — Server-Set Velocity Must Set `hurtMarked = true`

Any codegen that calls `Entity.setDeltaMovement(...)` directly (as opposed to `Entity.push(...)`, which already sets NeoForge/vanilla's own `hasImpulse` flag internally) must also emit `<entity>.hurtMarked = true;` immediately after it. `setDeltaMovement()` alone only changes server-side state — a client is authoritative over its own reported position/velocity during normal gravity-affected movement, so without `hurtMarked` the client is never told the velocity changed and the new velocity gets silently overwritten by the client's next movement packet, making the effect invisible in practice (this is exactly why `entity.apply_motion`'s "Set" mode block visibly did nothing when used from a Keybind's On Press graph — confirmed against `DashUtil.java`, the mod's own known-working velocity-based movement system, which sets `hurtMarked = true` on every tick it calls `setDeltaMovement`).

**Where the fix actually had to go — a lesson in the two codegen paths:** `entity.apply_motion` is compiled entirely through `blockDefs.js`'s declarative `codegen.template`/`variants`, NOT through a `compiler.js` native handler — `compileActionNode` checks `blockDefRegistry.get(node.opcode)` first and calls `compileFromDef` (the template path) for *any* block whose def lacks `codegen.handler`, before ever reaching the `if (node.opcode === "...")` chain further down in `compiler.js`. An initial fix was mistakenly added to `compiler.js`'s (nonexistent, since this block never declares `codegen.handler`) native-handler branch for this opcode — it silently never ran, and re-saving the keybind kept generating the old unfixed line. The real fix belongs in `blockDefs.js`'s `"mode == 'set'"` variant template itself: `` "{{entity}}.setDeltaMovement((double)({{x}}), (double)({{y}}), (double)({{z}})); {{entity}}.hurtMarked = true;" ``. **Before editing any block's codegen, check `blockDefs.js` first for a `codegen.template`/`variants` entry for that opcode** — only add/edit a `compiler.js` branch if the block genuinely declares `codegen.handler: true` (meaning it opts out of the template path entirely).

### Label Convention — Entity Slot Ordering

Any block that takes an `[entity:entity]` slot must place it **last** in the label — `"... to [amount:number] for [entity:entity]"`, not `"... of [entity:entity] to [amount:number]"`. This matches the dominant convention already used by the Attribute, Entity Variable, and texture-overlay blocks (`for [entity:entity]` at the end) and keeps the canvas block's rightmost/last socket consistently the entity being acted on, regardless of how many other value slots the block has. A handful of older blocks (`effect.apply`, `entity.apply_motion`, the animation blocks) predate this convention and have entity mid-label — leave those as-is (not worth the churn of re-touching every existing graph that plugs into them), but every new block must follow entity-last.

---

## Attributes

Attributes let users define custom NeoForge/vanilla-style `Attribute`s (min/base/max ranged stats, e.g. "Mana Regen", "Crit Chance") in addition to reading/modifying vanilla ones — separate from the `yebisurpg:scale.*` Pehkui-style multiplier attributes carried over from old_mod (explicitly out of scope for this system; those remain hand-authored, not YCS-managed).

- Stored as `ycs-data/attributes/<name>.json`: `{ name, titleText, min, base, max, syncToClient, _injections }`. Always global (attributes aren't per-item).
- Registered as `ModAttributes.<NAME>` via `ModAttributes.registerAttribute(name, min, base, max, syncable)`, injected above the `YCS_Attributes` marker in `ModAttributes.java` (`net.ye6isu.yebisuRPG.attribute.ModAttributes`) — a `DeferredRegister<Attribute>` against vanilla's own `Registries.ATTRIBUTE`, the same registry vanilla attributes live in (not a separate custom registry). Each registered attribute is a `RangedAttribute` with an id of `yebisurpg.<name>`.
- Editor enforces `min <= base <= max` client-side before allowing Save (old_mod only validated this server-side).

### Blocky Wiring (Get/Set/Modify Attribute)

`attribute.get`, `attribute.modifier.add`, `attribute.modifier.remove`, `attribute.base.reset` in `blockDefs.js` are unchanged from old_mod (ported forward as-is, ﻿see below) — only the `attrId` dropdown wiring was newly completed:
- `attrId` field now uses `source: "attributes"`, resolved in `BlockEditor.jsx` as a merge of a static `VANILLA_ATTRIBUTES` list (~29 hardcoded vanilla ids, mirroring `VANILLA_ATTR_CONST` in `compiler.js`) plus a dynamic list loaded from `ycs-data/attributes/*`, each mod attribute labeled `"<titleText> (mod)"` — the same visual convention old_mod's `AttrDropdown` used. Previously this dropdown didn't exist at all (`attrId` silently fell back to a free-text input), since old_mod's own `ModAttributes.java`/save pipeline was broken/orphaned (see project history) and never actually finished.
- `compiler.js`'s `attrRegistryRef(attrId)` (pre-existing, unchanged) maps vanilla ids through `VANILLA_ATTR_CONST` and falls back to `ModAttributes.<ID_UPPERCASED>` for anything else — this is why the dropdown's mod-attribute `value` must exactly equal the attribute's `name` field, so the derived constant matches what `ModAttributes.java` actually declares.
- `collectBlockImports` conditionally adds the `net.ye6isu.yebisuRPG.attribute.ModAttributes` import whenever any attribute-opcode node's `attrId` isn't a recognized vanilla id — vanilla-only graphs don't get an unnecessary import.
- **Base / Bonus / Total** (`attribute.get`'s `layer` field): `Base` = `getAttributeBaseValue(attr)` (raw, no modifiers); `Total` = `getAttributeValue(attr)` (fully computed); `Bonus` = `Total − Base` (combined modifier contribution). This works identically for vanilla and custom attributes since both go through the same vanilla `AttributeInstance` API.
- **Modifiers** (`attribute.modifier.add`): Flat Bonus / % Multiplier compile to a transient, removeModifier-then-addOrUpdateTransientModifier pair under a fixed `yebisurpg:<modifierName>` id (idempotent re-apply, no "already applied" exceptions); Set Base calls `setBaseValue(...)` directly. The UI only exposes 3 of the 5 operations the compiler supports — `base_add`/`base_multiply` exist in `compiler.js` but have no way to be selected from the block's dropdown (inherited as-is from old_mod; not fixed since it wasn't in scope for this pass).

### Raising Vanilla Attribute Ceilings (`AttributeRangeFix`)

Vanilla hardcodes low max values on several `RangedAttribute`s (e.g. `generic.max_health` caps at 1024) which is too low for RPG/roguelike-scale numbers. `net.ye6isu.yebisuRPG.attribute.AttributeRangeFix.apply()` (called once from `commonSetup` in `yebisuRPG.java`) raises the ceiling on a fixed set of vanilla attributes (`max_health`→100k, `armor`→10k, `armor_toughness`→10k, `attack_damage`→100k, `attack_knockback`→100, `movement_speed`→10) by mutating each `RangedAttribute`'s private `maxValue` field via a `@Mutable @Accessor` mixin (`net.ye6isu.yebisuRPG.mixin.AccessorRangedAttribute`, registered as a **common** mixin in `yebisurpg.mixins.json` — this must run on both logical sides since attribute ranges are server-authoritative). This only raises the sanitization ceiling (`Attribute#sanitizeValue`); it does not touch the damage formula or HUD rendering, both of which still assume vanilla-scale numbers if fed values that large. Ported verbatim from old_mod; ceilings are a fixed hardcoded set, not user-configurable from the YCS tool.

---

## Keybinds

Keybinds are a single key + at most one modifier (Ctrl/Alt/Shift) — deliberately matching NeoForge's own `KeyMapping`/`KeyModifier` ceiling (a true multi-key simultaneous combo was attempted first but abandoned: subclassing vanilla's package-private `KeyBindsList.Entry` from mod code to inject custom combo rows hit a hard Java module-system violation — "Module yebisurpg contains package net.minecraft.client.gui.screens.options.controls, module minecraft exports package ... to yebisurpg" — a fatal split-package error at game launch, confirmed by actually running the client). Single-key-plus-modifier rides entirely on vanilla's Controls screen for free: real `KeyMapping` rows, native rebind/reset/collision detection, no custom screen needed.

- Stored as `ycs-data/keybinds/<name>.json`: `{ name, titleText, bindCode, _injections }`. `bindCode` uses the same encoding V1 YCS used: `"KEY_R"`, `"MOUSE_0"`, `"KEY_R+CTRL"`, or `"NONE"` (base + at most one of `CTRL`/`ALT`/`SHIFT`).
- Editor UI (`KeybindsLanding.jsx`) reuses V1's exact capture flow: a "Record" button arms a one-shot `keydown`/`mousedown` listener (modifier-only keydowns are ignored as the base key, but their `ctrlKey`/`altKey`/`shiftKey` flags derive the modifier), plus manual key/modifier dropdowns as a fallback.
- **Java side** — three files, each with their own marker:
  - `ModKeybinds.java` (`YCS_Mod_Keybinds` marker for `public static final KeyMapping <NAME> = bind(...)` field declarations, `YCS_Mod_Keybinds_Register` marker for `event.register(<NAME>);` calls inside `@SubscribeEvent register(RegisterKeyMappingsEvent)`) — real `KeyMapping`s, so vanilla's Controls screen lists them automatically under the `key.categories.yebisurpg` category.
  - `ClientKeybindRegistry.java` (`YCS_Keybind_Register` marker for `ClientKeybindRegistry.register("<id>", ModKeybinds.<NAME>);` calls) — maps each keybind's string id to its `KeyMapping`, so `ClientKeybindTracker` (a `ClientTickEvent.Post` listener) knows which mapping to poll per id.
  - `KeybindHandlers.java` (`YCS_Keybind_Press_Dispatch`/`YCS_Keybind_Release_Dispatch` markers, inside `switch (keybindId)` arrow-switch statements — content is injected on the line above the marker, which lands each `case "<id>" -> { ... }` right before the trailing `default -> {}`) — dispatch target for each keybind's compiled Blocky press/release methods.
- **Blocky wiring**: the Keybind editor (`KeybindsLanding.jsx`) embeds two small "set"/"edit" buttons — On Press / On Release — following the exact same `FieldIconButton` + overlay-`BlockEditor` pattern `ItemsLanding.jsx` uses for per-item methods. Graphs are stored in `localStorage` as `ycs-blocky::keybind::<id>::keybindPress` / `::keybindRelease` (the keybind-scoped analog of `ycs-blocky::item::<itemId>::<methodKey>`). `BlockEditor` itself gained an optional `keybindId` prop specifically for this — when present, its internal storage key switches to the `keybind::` scope instead of `item::`, and its method label falls back to a small `keybindPress`/`keybindRelease` → "On Press"/"On Release" entry in `METHOD_LABELS`. At Save time, `KeybindsLanding.jsx` compiles both graphs via the same `compileChain`/`collectBlockImports` compiler entry points `ItemEditor.jsx` uses, injecting one `case "<id>" -> { ... }` line per graph and any needed imports. No changes were needed to `resolveEntityVar`/`resolveStackExpr` for a new methodKey — the existing `entity.event` fallback (`return "player"`) already resolves correctly, since `KeybindHandlers`'s dispatch methods take a `ServerPlayer player` parameter directly, so every existing entity-scoped block (Get/Set Entity Variable, Get Attribute, Deal Damage, etc.) works inside a keybind graph with no extra plumbing.
- **Networking**: `ClientKeybindTracker.tick()` edge-detects `KeyMapping.isDown()` transitions per tick and sends a `KeybindTriggerPayload(keybindId, pressed)` (`playToServer`) to `ServerKeybindHandler`, which enqueues work on the main server thread and calls `KeybindHandlers.dispatch(...)`. This is the client→server direction of the same `NetworkRegistry`/`BasePayload` pattern used elsewhere in the mod (see Data Storage Layout's networking notes) — no reflective `ClientHandlerProxy`-style indirection needed here since the receiving handler is server-side, not client-only.
- Lang key (`key.yebisurpg.<name>`) is injected the same way as any other translatable label; `key.categories.yebisurpg` (the Controls-screen group header) is a static, non-per-keybind lang entry added once.

---

## HUD (Overlay Only)

HUD covers only the read-only, non-interactive overlay half of "GUI/HUD" — always-on-screen elements drawn every frame with no click handling (bars, text readouts, icons). A clickable interactive screen/menu (its own `Screen` + likely `AbstractContainerMenu` for server-authoritative slot sync) is a separate, not-yet-built system — see `YCS_V3_TODO.md`.

- Stored as `ycs-data/hud/<name>.json`: `{ name, widgets: [...], previewW, previewH, gridSize, _injections }`. Each widget: `{ type, anchor, x, y, width, height, color, valueSourceId, maxSourceId, icon, barFilled, barEmpty, multiState, stateSourceId, stateLiteral, states: [...] }`.
  - `type` ∈ `bar | text | icon`.
  - `anchor` is one of 9 screen-relative positions (`top_left` … `bottom_right`) — `x`/`y` are pixel offsets from that anchor's origin, not absolute screen coordinates, so a widget lands correctly at any real screen resolution (matches `GuiGraphics.guiWidth()`/`guiHeight()` at render time, not the YCS canvas's own — user-adjustable, default 960×540 — preview size).
  - `icon`/`barFilled`/`barEmpty` are `{ id, rows, animatedOnUse, ticksPerFrame, defaultFrame }` texture refs pulled from the **shared YCS texture pool** (same picker/source as everything else in YCS, not a free-typed texture id) — carrying the same spritesheet metadata items use, so a bar-fill or icon texture can be an animated spritesheet exactly like an item texture. `color` is only a fallback for Bar (when no `barFilled`/`barEmpty` is set) and the text color for Text.
  - `previewW`/`previewH`/`gridSize` are purely YCS-editor state (remembered per layout so reopening it restores your canvas size/grid) — they have no runtime effect; the actual anchor math always uses the real screen's `guiWidth()`/`guiHeight()` regardless of what preview size was used to author it.
  - **Multi-State (Bar/Icon only, mirrors items' own Multi-State concept):** a "Multiple States" checkbox on Bar/Icon widgets (not Text — a bar-style texture-set swap doesn't apply to plain text) opts a widget into `states: [{ icon, barFilled, barEmpty }]`, a list of fully independent texture sets (each entry carries the same texture-ref slots as the widget itself — Bar's `barFilled`/`barEmpty`, Icon's `icon`) selected as a whole by a `LinkableValueField`-style **State Index** (`stateLiteral` hardcoded fallback, or a Blocky link compiled into `HudValueSources` exactly like Value/Max/per-slot Frame — `stateSourceId`). Index 0 is "the first state"; the resolved index is clamped into range at render time (`HudOverlayRenderer.currentState`). When `multiState` is on, the widget's own base `icon`/`barFilled`/`barEmpty` fields are ignored entirely — `states` takes over — so a mana bar can visually swap between "calm"/"charging"/"overheated" fill+empty texture pairs driven by, say, a Get Entity Variable condition, without any extra codegen beyond the existing per-slot Frame mechanism. Each state's texture slots support the same optional spritesheet Frame link individually (keyed `state_<i>_icon`/`state_<i>_barFilled`/`state_<i>_barEmpty` in both `localStorage` and the compiled `frameSourceId`), so an individual state's texture can itself be an animated spritesheet. The canvas preview can't evaluate a bound State Index Blocky link (same limitation as the per-slot Frame preview) — but the hardcoded literal fallback CAN, so it illustrates whichever state the literal points at (clamped into range), falling back to State 0 only while the literal is unset, matching the same "unrunnable link, show the literal" convention `spriteStyle()` already uses for Frame.
- **Both Bar's current value AND its max are single connectable number slots** — not a fixed dropdown or a plain numeric field. Reuses the same value-node picker Blocky graphs use (Get Entity Variable, Get Attribute, math blocks, literals, anything number-producing) for both, so e.g. a mana bar can plug "Get Entity Variable: mana" into Value and "Get Attribute: max_mana" into Max, rather than hardcoding a static max number. This is a deliberate departure from the rest of HUD's "no codegen" design (see below) in exchange for full flexibility. Text widgets only have a Value slot (no Max — a bar-style fraction doesn't apply).
- **The value-link graph has a real, visible root block**: `hud.return_value` (palette category "HUD", label "Return Value", one `[value:number]` slot) is placed in the chain right after the normal `start` node — the graph reads `Start → Return Value`, exactly like any other Blocky action chain, not a hidden/fixed anchor. `HudLanding.jsx`'s `compileValueGraph(nodes, methodKey)` helper finds whichever node has `opcode === "hud.return_value"` and reads only its `value` slot; `Return Value` itself is never compiled as a statement (its `codegen.template` is empty) since a HUD binding only ever needs the one expression, not a sequence of actions.
- **Partial Java codegen — layout/textures are pure JSON, but each bound value/max is compiled:**
  - The widget layout (position/size/anchor/texture refs) is copied as-is into `assets/yebisurpg/hud/<name>.json` (a `created-file` injection) and read directly at render time by `HudLayoutLoader` via `Minecraft.getResourceManager()` — editing positions/textures and re-saving takes effect on the next resource-pack reload, no rebuild needed for that part.
  - Each Bar/Text widget's bound value, and each Bar's bound max, is separately compiled: at Save time, YCS reads whichever value-block graph is stored for that binding (`ycs-blocky::hudwidget::<layoutId>::<widgetIndex>::value` / `::max` in `localStorage`) and compiles just the single expression connected to the `Return Value` node's `value` slot (via the same `resolveSlotValue` compiler entry point every other Blocky graph uses) into one generated lambda in `net.ye6isu.yebisuRPG.hud.client.HudValueSources` — `register("<layout>_w<i>_value", player -> (double)(<compiled expression>));` (and `..._max` analogously), injected above the `YCS_Hud_Value_Sources` marker. The widget's JSON only stores the resulting `valueSourceId`/`maxSourceId` strings, which `HudOverlayRenderer` looks up in `HudValueSources`'s registry every frame — no reflection, no per-frame string parsing. An unset Max defaults to `1.0` at render time.
  - The **only** other actual Java injection is a one-line `HudOverlayRenderer.registerLayout("<name>")` call (marker `YCS_Hud_Layouts` in `ModHud.java`) so the renderer knows which layout files exist.
- **The value-node picker itself reuses `BlockEditor` wholesale**, rather than building a separate mini-canvas: `BlockEditor` gained a `hudWidgetId` prop (switches its localStorage scope to `hudwidget::<layoutId>::<widgetIndex>::<value|max>`, mirroring the `keybindId` prop's `keybind::` scope). The root node is a plain `start` block same as any other Blocky graph — `Return Value` is a normal chained block the user drags in from the palette, not a special root, so no `rootOpcode` override or hidden/internal-only category was needed after all.
- **Entity context**: HUD rendering has a new `methodKey`, `"hudRender"`, needed nowhere in `compiler.js` beyond what already existed — `resolveEntityVar`'s existing default fallback (`return "player"` for `entity.event`) already matches the generated lambda's parameter name (`player -> ...`), so every existing entity-scoped block (Get/Set Entity Variable, Get Attribute, etc.) works inside a HUD value-link with zero new resolver code, the same trick that made Keybind wiring trivial. HUD bindings are **local-player-only** by design — `player` is always `Minecraft.getInstance().player`, purely client-side, never a server round-trip or an arbitrary target entity (deferred: binding to a looked-at/targeted entity, e.g. a boss bar, for a future pass).
- **Resolution independence is architectural, not a preview trick**: `HudOverlayRenderer.resolveAnchor` recomputes every widget's screen position from `GuiGraphics.guiWidth()`/`guiHeight()` fresh every frame — this is already **logical, GUI-Scale-adjusted** space (the same coordinate system vanilla's own hotbar/health bar render in), not raw physical pixels. A widget lands in the same visual spot at any physical resolution as long as GUI Scale is the same; if a widget looks proportionally bigger/smaller across different real screens, that's GUI Scale differing between them (normal, matches vanilla), not a HUD bug.
- **YCS canvas — fixed-size pannable/zoomable viewport, toolbar moved out of the way**: the `PannableCanvas` viewport box itself (the visible editing area on screen) never changes size — it's a fixed pane, matching `BlockEditor`'s own canvas interaction model exactly: scroll wheel zooms centered on the cursor (`0.2×`–`3×`), dragging empty space (or middle-mouse) pans. What *does* change is the reference-resolution rectangle drawn **inside** that fixed viewport, sized to `previewW`×`previewH` and transformed by the current pan/zoom — so picking a bigger reference resolution makes the rectangle itself bigger/zoomed-out-relative-to-the-viewport, not the editing pane. All authoring controls (Add Bar/Text/Icon buttons, Resolution, GUI Scale, Preview W/H, Grid W/H, Grid Offset X/Y, Snap to Grid) live in a toolbar strip above the viewport, not inside/overlapping it.
  - The preview area's width/height, grid cell width/height (independent, not a single shared size), and grid offset X/Y (where the grid's first line sits, not forced to start at 0,0 — e.g. for aligning to a HUD element that isn't flush with the screen edge) are all user-editable fields, remembered per-layout (`previewW`/`previewH`/`gridW`/`gridH`/`gridOffsetX`/`gridOffsetY` in the saved JSON — editor-only state, no runtime effect, see below).
  - Resolution and GUI Scale are two **independent** dropdowns (matching vanilla's own Video Settings — GUI Scale is its own axis, not baked into a resolution choice) — picking either recomputes `previewW`/`previewH` as `physicalWidth / scale`, `physicalHeight / scale`, the resulting **logical** `guiWidth`×`guiHeight` a player at that combination would actually see.
  - A CSS grid overlay (two repeating linear gradients, sized/offset per the grid W/H/offset fields) is drawn under the widgets, inside the reference rectangle; "Snap to Grid" rounds drag/resize deltas to the nearest grid line (`snap(value, gridSize, offset)` subtracts the offset before rounding, so snapped positions land on the *visible* grid lines, not an implicit 0-based one).
  - Widget boxes render their *actual* referenced texture images (fetched via the same `load_texture_image` command `TextureManager`/`BlockEditor` use, not colored placeholder rectangles), correctly sliced to one spritesheet row/frame the same way `HudOverlayRenderer` does at runtime (`background-size`/`background-position` math mirroring the Java `blit`'s `v0 = frame * frameHeight` offset) — a Bar shows its real empty/filled textures (or flat colors if unset) with an illustrative fixed 65%-full sample fill (not the true bound value, which only exists in-game), and an Icon shows the real icon image. Animated (`animatedOnUse`) textures actually **play** in the canvas via a generated CSS `@keyframes` + `steps(rows)` animation (duration derived from `ticksPerFrame` at ~50ms/tick) rather than showing one static frame — a real ticking preview, not just a frame snapshot.
  - **Resizing a widget** uses one of 4 corner handles (not a single fixed bottom-right handle) — dragging any corner keeps the *opposite* corner visually anchored in screen space (Photoshop's own resize behavior), independently resizing width/height by default; holding **Shift** locks the aspect ratio, driven by whichever axis moved further. This math is done in absolute screen space (not the widget's anchor-relative `x`/`y` directly) because `anchorOrigin()` itself shifts with width/height for center/right/bottom-anchored widgets — doing the corner-lock in screen space sidesteps having to separately compensate for that shift.
- **Rendering** (`net.ye6isu.yebisuRPG.hud.client.HudOverlayRenderer`): implements vanilla's `LayeredDraw.Layer` (the modern 1.21.1 GUI-layer interface — NOT the older `IGuiOverlay`, which doesn't exist in this NeoForge version), registered via `RegisterGuiLayersEvent.registerAboveAll(...)` in `ModHud.onRegisterGuiLayers`. Draws Bar (textured or flat-color background + filled portion, the filled portion clipped via `GuiGraphics.enableScissor`/`disableScissor` rather than resizing the source rect, so an animated spritesheet fill still plays correctly even when partially clipped), Text (`GuiGraphics.drawString`), and Icon (`GuiGraphics.blit`) widgets every frame, skipping entirely if `Minecraft.options.hideGui` is set (F1). Animated texture refs use the same stateless `TextureFrameClock.frameAt(...)` clock items already use for spritesheet playback — no new animation system.
- **YCS editor** (`HudLanding.jsx`): a purpose-built lightweight canvas for layout/position (not a reuse of `BlockEditor`'s pan/zoom/node-graph machinery for *that* part, since widget boxes have no connections between each other — just position+size) — a fixed 480×270 reference-screen preview, draggable/resizable widget boxes, a Photoshop-style layer list panel (select/reorder-by-drag/delete), and a right-side property inspector (name, type, anchor, offset, size, texture pickers, value-link button). Verified end-to-end by actually launching the client with a hand-written test layout before building the canvas — confirms `RegisterGuiLayersEvent`/`LayeredDraw.Layer` registration works and the game doesn't crash, since Mixin/registration-event errors like this only surface at actual launch, not at `compileJava` time (same lesson learned the hard way during Keybinds' aborted combo-row mixin attempt).

---

## Entities

Custom mob creation: id, display name, texture, geo model, an **Animations sub-page** (head bone name, idle/walk animation names — see below), an open-ended per-entity **attribute list** (Attribute Picker sub-page, see below), hitbox width/height/eye height, an open-ended list of **extra bone-tracking hitboxes** ("parts" — Hitbox Parts sub-page, see below), a hostility mode (passive / hostile / neutral), and an open-ended **Goal Builder** list of AI behaviors — a brand-new entity has *zero* goals by default, including wander/look-around, so nothing is added unless explicitly opted into. Still deliberately narrow beyond that — no death/hurt/attack animations, no sounds, no loot table, no spawn egg (test via `/summon yebisurpg:<id>`), no Blocky On Attack/On Hurt/On Death hooks (there is an On Part Hit hook, but only for hits on a configured extra part — see below), no Brain-based AI (see "Goal system vs. Brain system" below). See `YCS_V3_TODO.md` for what's explicitly deferred.

- Stored as `ycs-data/entities/<id>.json`: `{ id, displayName, texture, hostility, attributes, goals, hitboxParts, headBone, hitboxWidth, hitboxHeight, eyeHeight, idleAnim, walkAnim, _injections }`. Geo model and animation file live alongside item geo models in `ycs-data/models/<id>.geo.json` / `<id>.animation.json` (same `import_geo_model`/`import_animation_file` Tauri commands, animation file mirrors the geo model's own lifecycle — imported, copied into the mod, deleted/renamed alongside it).
- **`eyeHeight`** (optional float, `null`/unset = vanilla default of 75% of hitbox height) — passed straight to `EntityType.Builder.eyeHeight(float)` when set, only emitted in the generated registration line at all when a value is present (a mob author who doesn't care leaves vanilla's own default alone rather than the UI forcing a number in). There is deliberately no separate "eye forward/backward offset" field — vanilla only exposes a single vertical eye-height value; a horizontal offset (e.g. a mob whose head/eyes sit further forward than its hitbox center) would require overriding `Entity.getEyePosition()` to add a look-direction-relative offset, which hasn't been built (would affect ranged-attack spawn origin and any future raytrace-from-eyes logic — revisit if a real use case comes up).
- **`hostility`** (`passive | hostile | neutral`) drives whether `YcsMobEntity.registerGoals()` adds a `MeleeAttackGoal` plus a target goal — `NearestAttackableTargetGoal<>(this, Player.class, true)` for `hostile` (always targets nearby players), `HurtByTargetGoal(this)` for `neutral` (only retaliates once hit — no anger timer, simpler than vanilla's full `NeutralMob`), nothing for `passive` (unchanged from before this field existed). See "Hostility, Attributes & Goals" below for why this needs its own static registry rather than being passed straight into the entity.

### Animations sub-page (`headBone`, `idleAnim`, `walkAnim`)

A dedicated sub-page (`ycs/src/components/EntityAnimationsPage.jsx`, same full-screen navigation pattern as Attributes/Goals), opened via a "Manage Animations" button in the main editor's Animations group:

- **Head Bone Name** (`headBone`, nullable) — the bone in the entity's geo model that should visually rotate toward whatever a Look At Player goal is tracking, mirroring vanilla `HumanoidModel` applying `head.yRot`/`head.xRot` directly onto the head `ModelPart`. See "Look At Player head-bone rotation" below.
- **Idle Animation Name** (`idleAnim`) and **Walk Animation Name** (`walkAnim`, optional — an entity with no walk animation just holds its idle pose while moving) — unchanged in behavior from before this sub-page existed, just moved out of the main editor's flat field list.

### Look At Player head-bone rotation

`GeoEntityModel.setupAnim(entity, limbSwing, limbSwingAmount, ageInTicks, netHeadYaw, headPitch)` already receives vanilla's computed head yaw/pitch every frame (populated by whatever look-control goal is active, e.g. `LookAtPlayerGoal` calling `mob.getLookControl().setLookAt(...)` each tick — no override needed, this is how vanilla's own `HumanoidModel.setupAnim` reads `netHeadYaw`/`headPitch` too). `GeoEntityModel` stores these (converted to radians, matching `HumanoidModel`'s exact `* 0.017453292f` conversion) and `renderBone` applies an extra local rotation on top of the bone's animated pose when the bone's name matches the entity's configured `headBone` — the same "additional rotation layered on the animated pose" relationship vanilla has between `head.yRot`/`head.xRot` and the head `ModelPart`'s own animation-driven pose.

### Attribute Picker (`attributes`)

Rather than a fixed set of hardcoded stat fields, an entity's attributes are an **open-ended list**, each `{ id, value }` — `id` is a vanilla attribute id (e.g. `generic.max_health`) or a mod-defined attribute's `name` (from `ycs-data/attributes/*`), `value` is this entity's single value for it. Edited via a dedicated **Attribute Picker sub-page** (`ycs/src/components/EntityAttributesPage.jsx`), opened from a "Manage Attributes" button in the main editor's Attributes group (same full-screen sub-page navigation pattern used for the Goal Builder below — not a Blocky-graph overlay, since this is plain structured data committed at the entity's own Save time, not a user-authored graph).

- Pre-populated on a new entity (or one saved before this system existed) with a **minimum set**: Max Health (20), Movement Speed (0.25), Attack Damage (2), Armor (0), Armor Toughness (0), Knockback Resistance (0), Scale (1.0) — `DEFAULT_ENTITY_ATTRIBUTES` in `EntityAttributesPage.jsx`. All are ordinary removable/re-addable rows **except Max Health and Movement Speed**, which the picker won't let you remove (value-edit only) — vanilla's `AttributeSupplier` construction can hard-crash if certain attributes are missing at entity-construction time, the same class of failure `FOLLOW_RANGE` already taught this system to guard against (see below), so these two are locked defensively.
- "Add Attribute" merges vanilla attributes (`BlockEditor.jsx`'s exported `VANILLA_ATTRIBUTES` list — the same list the Attribute Blocky blocks use) with mod-defined ones (`ycs-data/attributes/*`, loaded via `list_ycs_data`/`load_ycs_data` the same way every other cross-reference in YCS works).
- **`scale`** (as a `generic.scale` row in this same list, not a separate field) maps directly to vanilla's `Attributes.SCALE` — both hitbox and render size are already scaled automatically by vanilla (`LivingEntity.getDimensions()`/`LivingEntityRenderer.render()`), so no renderer changes were needed to support "this entity is bigger in-game."
- **Java-side codegen**: `ModEntityEvents.java`'s injected line builds the whole `.add(...)` chain directly from this list — `LivingEntity.createLivingAttributes().add(Attributes.FOLLOW_RANGE, 16.0).add(<attrRegistryRef(id)>, <value>D)...build()` — rather than calling a fixed-arity Java helper, since an open-ended attribute set can't be represented by one. `attrRegistryRef` (imported from `codegen/visual/compiler.js`, the same function the Attribute Blocky blocks already use) maps a vanilla id to its `Attributes.CONST` and falls back to `ModAttributes.<NAME>` for mod-defined ones.

### Hostility, Attributes & Goals — the `registerGoals()` timing problem

Hostility mode and Goal Builder entries decide which `Goal`s `YcsMobEntity.registerGoals()` adds, but `registerGoals()` runs *inside* `Mob`'s own constructor — before any per-instance setter could ever run, and the entity factory passed to `EntityType.Builder.of(YcsMobEntity::new, ...)` only ever receives `(EntityType, Level)`, with no channel for extra per-mob data. All of this is static per mob *type* (exactly like `maxHealth`/`hitboxWidth` already are, just not baked into the `EntityType.Builder` call itself), so it's registered into a small static type-keyed registry, **`net.ye6isu.yebisuRPG.entity.custom.YcsMobData`**, at the same lifecycle stage as attribute registration (`EntityAttributeCreationEvent`, mod-bus, fires at mod-init — well before any entity is ever constructed):

```java
YcsMobData.register(ModEntities.<NAME>.get(), new YcsMobData.Config(YcsMobData.Hostility.<HOSTILITY>)
    .withGoal(new YcsMobData.GoalEntry(...))...
    .withBreedingItem("...")
    .withRangedAttack(new YcsMobData.RangedAttackConfig(...)));
```

`registerGoals()` then reads it back via `YcsMobData.get(getType())` — safe because `Entity`'s own constructor sets `this.type` as one of its first field assignments, strictly before `Mob`'s constructor body ever calls `registerGoals()`. `YcsMobData.Config` is a small mutable builder (`withGoal`/`withBreedingItem`/`withRangedAttack`, each returning `this`) rather than a fixed-arity `record`, since an open-ended goal list can't be represented by fixed constructor params — mirrors the same "can't use a fixed-arity helper for open-ended data" reasoning as the attribute list above.

- `HOSTILE` or `NEUTRAL` → adds `new MeleeAttackGoal(this, 1.0D, false)` to the `goalSelector`.
- `HOSTILE` → also adds `NearestAttackableTargetGoal<>(this, Player.class, true)` to the `targetSelector`.
- `NEUTRAL` → adds `HurtByTargetGoal(this)` instead (retaliate-only once hurt by a player — no anger timer, a deliberately simpler subset of vanilla's full `NeutralMob` behavior).
- `PASSIVE` → no target goal, identical to the mob's original bare-minimum behavior.

### Goal Builder (`goals`)

An open-ended list of AI behaviors, edited via `ycs/src/components/EntityGoalsPage.jsx` (same full-screen sub-page pattern as Attributes above), opened from a "Manage Goals" button in the main editor. List order is priority (index 0 = highest, matching `goalSelector.addGoal(priority, ...)` semantics) with drag-to-reorder.

- **Nothing runs by default** — a brand-new entity has an empty `goals` list, so `YcsMobEntity.registerGoals()` adds zero goals until the user explicitly adds some. This includes what used to be hardcoded baseline behavior (float, wander, look-at-player, look-around) — those are now ordinary removable/addable palette entries like everything else, not special-cased.
- **Hostility-driven goals** (`MeleeAttackGoal`, `NearestAttackableTargetGoal`, `HurtByTargetGoal`) stay driven by the Hostility field in Combat, not this list — avoids two UIs fighting over the same goal slots.
- **Palette entries** (`{ type, params }` per entry): **Float** (swim/avoid drowning, no params), **Wander** (random walking — speed modifier), **Look At Player** (look distance; also drives the head-bone rotation described above if `headBone` is set on the Animations page), **Look Around** (idle head-turning, no params), **Avoid Entity** (flee `Monster`-type entities — speed/sprint-speed modifiers, max distance), **Panic** (flee when hurt — speed modifier), **Tempt** (follow a player holding a configured item — speed modifier, item id, can-scare flag), **Breed** (speed modifier + breeding item id), **Ranged Attack** (speed modifier, attack interval in ticks, attack radius, damage — fires plain vanilla `Arrow`s, no custom projectile entity).
- **Breed and Ranged Attack required base-class changes** — see "`YcsMobEntity` becomes `Animal`-based" below.

### Goal system vs. Brain system

Minecraft 1.21.1 has two separate mob-AI mechanisms. **Goal system** (`GoalSelector`/`Goal`, `net.minecraft.world.entity.ai.goal.*`) — a priority queue of independent behaviors (wander, flee, attack, breed), used by every vanilla mob from `Zombie` to `Cow` to `Wolf`; this is what `YcsMobEntity`/Goal Builder use. **Brain system** (`Brain<T>`, `net.minecraft.world.entity.ai.behavior`/`memory`/`sensing`) — a much heavier declarative "activity schedule" (memories + sensors + named activities like CORE/IDLE/WORK/REST) used only by villagers, piglins, allays, and similar mobs with complex scheduled/social behavior; it requires a `Brain.Provider`-based entity, not `PathfinderMob`. Goal Builder deliberately stays on the Goal system — it already fits `YcsMobEntity`'s base class and every behavior asked for so far (wander, flee, attack, breed) is naturally Goal-shaped. A Brain Builder would need `YcsMobEntity` (or a parallel class) to move off `PathfinderMob` entirely — tracked as a distinct, much larger future item, not attempted in this pass; see `YCS_V3_TODO.md`.

### `YcsMobEntity` becomes `Animal`-based

`YcsMobEntity` now `extends Animal implements RangedAttackMob` (previously `extends PathfinderMob`). This is a **strict behavioral superset, not a breaking change** — `Animal extends AgeableMob extends PathfinderMob` in vanilla, so every existing passive/hostile/neutral mob is completely unaffected; only mobs that opt into a Breed or Ranged Attack goal actually exercise the new surface. Since `YcsMobEntity` is the single shared class every YCS mob uses (see below), this base-class change had to be unconditional — there's no per-entity "sometimes extends Animal" in a one-shared-class architecture.

- **`isFood(ItemStack)`** (required override, `Animal`'s only abstract method beyond what `PathfinderMob` already supplies) — returns true when the stack matches `YcsMobData.get(getType()).breedingItem()` (a vanilla item id string, `null` if the mob has no Breed goal, in which case it can never be fed/bred).
- **`getBreedOffspring(ServerLevel, AgeableMob)`** (`AgeableMob`'s only abstract method) — trivially generic: `return (AgeableMob) getType().create(level);` — every YCS mob's baby is just a scaled instance of the same `EntityType`/model (no separate baby-variant model concept), so no per-mob override is ever needed. Everything else breeding-related (love mode, heart particles, `mobInteract` feeding, `canMate`, child spawning/positioning) is concrete in `Animal`/`AgeableMob` and works with zero extra code once these two overrides exist.
- **`performRangedAttack(LivingEntity target, float distanceFactor)`** (`RangedAttackMob`'s only method) — a no-op when `YcsMobData.get(getType()).rangedAttack()` is `null` (mob has no Ranged Attack goal); otherwise spawns a plain vanilla `Arrow` and shoots it at the target with the same arc-aiming math `AbstractSkeleton.performRangedAttack` uses, tagged with the entity's configured damage via `arrow.setBaseDamage(...)`. No custom projectile `Entity` subclass was needed — vanilla's `Arrow` is directly instantiable and configurable.

### Geo model → manual bone/cube rendering (not vanilla `ModelPart`)

Mobs need a real `EntityModel<T>` so vanilla's `LivingEntityRenderer.render` drives `setupAnim`/`renderToBuffer` at the right time with all the correct positioning/scale/rotation/shadow/nametag/glow machinery already applied — there is no generic "any mob, any bone count" model in vanilla the way `PlayerModel` is fixed, and the mod's existing player/item/armor animation Mixins (`MixinPlayerModel`, `MixinItemInHandRenderer`, `MixinPlayerRenderer`) are hardcoded to those specific vanilla model shapes, not reusable for arbitrary mobs. However, the actual bone/cube *geometry* is **not** built as a vanilla `ModelPart`/`CubeListBuilder` tree — `CubeListBuilder` only supports the single classic "box UV" layout (one `[u, v]` origin, all six faces auto-laid-out around it) with no public API for Bedrock's independent per-face UV rects (`"uv": {"north": {...}, "east": {...}, ...}`), which is exactly the format real exported models use (see `uploaded/tester.geo.json`). `ModelPart.Cube`'s own per-face `Polygon`/`Vertex` machinery that *could* express this is private/package-private and unreachable from mod code.

- **`net.ye6isu.yebisuRPG.entity.client.GeoEntityModelLoader`** parses the same Bedrock `.geo.json` format, and produces the **exact same baked data shape** `GeoItemRenderer.loadModel` already builds for items — `BakedGeoModel(texWidth, texHeight, List<BakedBone> bones)`, `BakedBone(name, pivot, rotation, cubes, children)`, `BakedCube(origin, size, pivot, rotation, inflate, uvX, uvY, perFaceUV)` — these records were promoted from `GeoItemRenderer`'s private inner types to `GeoEntityModelLoader`'s public ones so both renderers share one parsing/data-model implementation.
- **`net.ye6isu.yebisuRPG.entity.client.GeoEntityModel<T extends YcsMobEntity>`** (`EntityModel<T>`) stores the `BakedGeoModel` directly (no `ModelPart` tree at all). `setupAnim` builds a fixed-priority layer stack for the frame — idle at 0, walk at 100, and the active third-person action at 200 — while the actual pose application and rendering happen together in `renderToBuffer`. The renderer walks the bone tree recursively and emits vertices per cube exactly the way `GeoItemRenderer.renderBone`/`renderCube`/`quad`/`emitPerFace` do for items: pivot-centered quaternion rotation per bone, then either six box-UV quads or six independently-UV'd `emitPerFace` quads. Both UV layouts are handled correctly.
  - **Coordinate-space gotcha — the two pipelines disagree about Y.** `GeoItemRenderer`'s `renderBone`/`renderCube` math was written for `renderByItem`'s own pipeline, which does a plain `poseStack.translate(0.5,0.5,0.5); poseStack.scale(1/16,1/16,1/16);` with no Y-flip. Mob rendering goes through vanilla's `LivingEntityRenderer.render`, which — before ever calling `model.setupAnim`/`renderToBuffer` — already applies its own `poseStack.scale(-1, -1, 1)` (vanilla `ModelPart` geometry is authored expecting that flip). Reusing the item pipeline's bone/cube math unchanged inside the entity pipeline rendered every mob upside down. Fix: `GeoEntityModel.renderToBuffer` pushes one extra `poseStack.scale(1, -1, 1)` before walking the bone tree, canceling out the inherited flip so Bedrock's Y-up cube coordinates read correctly again. Any other geometry code ported between the item and entity renderers must account for this same difference — check which pipeline's `PoseStack` setup it's landing in before assuming the math transfers as-is.
  - Animation sampling reuses the **exact same `HandAnimationLoader`** the player/item animation system uses — same easing/Bezier/Catmull-Rom interpolation, same `AnimData`/`BonePose`/`BoneChannel` data model, just evaluated against arbitrary named bones instead of `PlayerModel`'s fixed six. `HandAnimationLoader.get(animName, filePath)` loads through Minecraft's resource manager, so the entity's `.animation.json` must be a real resource under `assets/yebisurpg/animations/entity/<id>.animation.json` (copied there at Save time, see below) — not read from an arbitrary ycs-data path at runtime.
  - **Layers resolve independently per bone.** The highest-priority active layer that explicitly contains a bone owns it. Therefore a walk clip's arm animation plays when no action owns that arm; an active action can override only its authored arm bones while the walk layer continues driving the legs; omitted bones fall through to idle. Idle/walk are computed from vanilla-synced `ageInTicks`/`limbSwing`; action state reuses `AnimationRegistry` and the existing trigger/catch-up payloads.
- **`net.ye6isu.yebisuRPG.entity.client.GeoEntityRenderer<T extends YcsMobEntity>`** (`MobRenderer<T, GeoEntityModel<T>>`) only needs to implement `getTextureLocation`, returning the entity's own copied texture. All the positioning/scale/rotation setup, walk-animation timing (`limbSwing`/`limbSwingAmount`), shadow, glow, and nametag-layer handling still comes from vanilla's own `LivingEntityRenderer.render`/`MobRenderer` unchanged — only the actual mesh emission (`EntityModel.renderToBuffer`) is custom.
- **`net.ye6isu.yebisuRPG.entity.client.ModEntityRendererRegistry`** — analogous to `GeoItemRegistry`, but hooks a different vanilla event: `EntityRenderersEvent.RegisterRenderers#registerEntityRenderer` (there's no per-item-style `IClientItemExtensions` equivalent for mobs). `collectGeoEntities()` builds one `EntitySpec` per mob (geo/texture `ResourceLocation`s derived from the id, animation file path, idle/walk names) via a `tryRegister(...)` call injected above `YCS_Entity_Renderer_Collect`; `onRegisterRenderers` loads the `BakedGeoModel` (via `GeoEntityModelLoader.load`, using the render context's own `ResourceManager`) and constructs the `GeoEntityModel`/`GeoEntityRenderer` pair per spec. A failed/missing geo model load returns `null`, which `GeoEntityModel.renderToBuffer` handles gracefully (renders nothing) rather than crashing — same fallback behavior `GeoItemRenderer` has for items.

### Multi-Hitbox Parts (`hitboxParts`) — bone-tracking extra hitboxes

A YCS mob can declare an open-ended list of extra, independently-hittable hitboxes ("parts") that each track a **named bone** from the mob's own geo model every tick — a boss's tail, head, or wings each being separately hittable, the same mechanism vanilla's Ender Dragon uses (`EnderDragonPart`, driven by NeoForge's generic `PartEntity<T>` type, not something Ender-Dragon-specific). Edited via a dedicated **Hitbox Parts sub-page** (`ycs/src/components/EntityPartsPage.jsx`, opened from an "Extra Hitbox Parts" row in the main editor's Hitbox group): each entry is `{ name, boneName, width, height }` — `name` is how a Blocky graph identifies which part was hit (see below), `boneName` must exactly match a bone in the imported `.geo.json`.

**Why this needs its own server-side animation math (the hard part):** every existing bone-pose sampler (`HandAnimationLoader`, `GeoEntityModelLoader.load(ResourceManager, ...)`) is `@OnlyIn(Dist.CLIENT)` or reads through `Minecraft.getInstance().getResourceManager()` — a resource-pack layer that doesn't exist on a dedicated server. A part's hitbox has to be positioned server-side every tick (hit-detection is server-authoritative), so this required porting the same math into server-safe counterparts rather than reusing the renderer directly:

- **`net.ye6isu.yebisuRPG.entity.custom.ServerGeoModelLoader`** — same `.geo.json` bone-tree parsing as `GeoEntityModelLoader` (reuses its `BakedGeoModel`/`BakedBone`/`BakedCube` records directly), but reads the file straight off the **classpath** (`assets/yebisurpg/geo/entity/<id>.geo.json`, the same packaged asset path, just read via `ClassLoader.getResourceAsStream` instead of a client resource pack) — works identically in a dev environment and inside a built/dedicated-server jar since it's an ordinary packaged mod asset, not something client-pack-specific.
- **`net.ye6isu.yebisuRPG.entity.custom.ServerAnimationSampler`** — a byte-for-byte port of `HandAnimationLoader`'s keyframe/easing/Bezier/Catmull-Rom evaluation math (same `AnimData`/`BonePose`/`BoneChannel` shapes), reading `.animation.json` the same classpath way. Kept in exact sync with the client sampler deliberately — if the two ever drift, a part's hitbox will visibly disagree with where the rendered mesh actually is.
- **`net.ye6isu.yebisuRPG.entity.custom.BonePoseSolver`** — the server-safe pose counterpart to `GeoEntityModel`. It applies the same per-bone idle/walk/action priorities, reads action state from the authoritative server `AnimationRegistry`, and uses a guarded client proxy only for the client-side debug-part copy. World conversion uses `yBodyRot`, matching `LivingEntityRenderer`'s body orientation instead of `getYRot()`/look direction; the configured head bone additionally receives relative `yHeadRot - yBodyRot` yaw and entity pitch so child hitbox bones follow look-at motion exactly. It then rotates the resolved local position and translates it by the entity's world position.
- Idle/walk animation names, previously living only in `ModEntityRendererRegistry.EntitySpec` (client-render-only data), are now **also** mirrored into `YcsMobData.Config` (`withAnimNames(idleAnim, walkAnim)`) purely so `BonePoseSolver` can pick the right animation server-side without depending on any client class.

**Part entity — `net.ye6isu.yebisuRPG.entity.custom.YcsMobPartEntity`** (`extends PartEntity<YcsMobEntity>`): a direct analogue of vanilla's `EnderDragonPart` — configurable `EntityDimensions` (width/height), `isPickable() == true`, `shouldBeSaved() == false`, `getAddEntityPacket` throws (parts are never spawned/tracked as their own synced entity on the client — vanilla's own entity-selection queries, e.g. melee/projectile hit-detection and `Level.getEntities(...)`, already consult `Entity.getParts()` for the parent automatically, so no client-side networking of the part itself is needed for hit-detection to work). `hurt(source, amount)` forwards to `YcsMobEntity.hurtFromPart(this, source, amount)`.

**Parent-side wiring (`YcsMobEntity`):**
- `hitboxParts` (a `YcsMobPartEntity[]`) is built in the parent constructor, matching `EnderDragon`'s own `subEntities` lifecycle. Multipart parts must already exist when the level first registers the parent; building them lazily on the first tick leaves the level's one-time part-id lookup empty and makes the boxes unhittable. A mob with no configured parts keeps the shared empty-array sentinel.
- `getParts()` override returns this array — the one piece vanilla/NeoForge needs to route hit-detection to parts automatically.
- Every `tick()`, `BonePoseSolver.resolveBoneWorldPos(this, boneName)` is called per part and `part.setPos(...)` repositions it — mirrors `EnderDragon.aiStep`'s own `tickPart(part, offsetX, offsetY, offsetZ)` calls, just driven by an arbitrary named bone instead of hand-coded per-part offsets. A part whose bone can't be resolved (missing geo model, typo'd bone name, no animation configured) simply stays wherever it last was — same silent-no-op convention as a typo'd idle/walk animation name elsewhere in this class.
- `hurtFromPart(part, source, amount)` calls `this.hurt(source, amount)` (so hitting a part counts as damaging the whole mob through vanilla's normal combat/health system, exactly like `EnderDragonPart`/`EnderDragon.hurt(EnderDragonPart, ...)`), then calls `onPartHit(part.partName(), source, amount)` to fire the Blocky hook below.

**"On Part Hit" Blocky hook** — lets ability-style logic react to *which* part was struck (e.g. a tailswipe ability that only cares about a hit on the "tail" part), following the exact same pattern as Keybinds' On Press/On Release:
- `net.ye6isu.yebisuRPG.entity.EntityPartHitHandlers` (marker `YCS_Entity_Part_Hit_Dispatch`, plus `YCS_Entity_Part_Hit_Imports` for collected imports) — one `case "<entityId>" -> { ... }` per entity that has a graph attached, `dispatch(entityId, partName, self, source, damageAmount)` static method, mirrors `KeybindHandlers.dispatch` exactly except keyed by entity id rather than keybind id. There is deliberately **no separate case per part** — which part was hit is exposed to the graph itself as a value block (`entity.part_hit_name`, "Hit Part Name", resolves to the generated method's own `partName` parameter) so one graph can branch on it via an ordinary text-equality check, plus `entity.part_hit_damage` ("Hit Part Damage Amount") for the amount.
- Graph stored in `localStorage` as `ycs-blocky::entity::<id>::entityPartHit` (new `entityId` prop added to `BlockEditor`, switching its storage scope the same way `keybindId`/`hudWidgetId` already do) — compiled at Save time via the same `compileChain`/`collectBlockImports` entry points every other Blocky graph uses, requires the entity to have been saved once already (same "save once first" gap noted for Keybinds' On Press/On Release).
- `compiler.js`'s `resolveEntityVar("entity.event", "entityPartHit")` resolves to `"self"` — the generated dispatch method's own mob parameter — so every existing entity-scoped block (Get/Set Entity Variable, Get Attribute, Deal Damage, etc.) works inside an On Part Hit graph with zero extra plumbing, the same trick used for Keybinds (`"player"`) and HUD (`"player"`).
- ID-rename carries the graph over under the new id the same way Keybinds do; Remove deletes the `localStorage` entry alongside the usual injection cleanup.

**Known limitations** (tracked in `YCS_V3_TODO.md`): parts are axis-aligned boxes only (no per-part rotation to match an angled bone — matches vanilla's own `EnderDragonPart`, which is also AABB-only); no usage-scanner before deleting a part whose name a graph still references; a part's hitbox silently freezes (rather than erroring) if its bone name is mistyped or the entity has no animation configured, mirroring every other "silent no-op on misconfiguration" convention already established for idle/walk animation names.

### Injection targets

| Target | Marker/Path | Content |
|--------|-------------|---------|
| Entity type registration | `ModEntities.java` → `YCS_Mod_Entities` | `DeferredHolder<EntityType<?>, EntityType<YcsMobEntity>>` field |
| Attribute registration | `ModEntityEvents.java` → `YCS_Entity_Attributes` | `event.put(...)` call inside the `EntityAttributeCreationEvent` listener |
| Hostility/goals/parts registration | `ModEntityEvents.java` → `YCS_Entity_Hostility` | `YcsMobData.register(...)` call inside the same `EntityAttributeCreationEvent` listener — also carries `.withAnimNames(...)` and one `.withPart(...)` per configured hitbox part |
| Renderer registration | `ModEntityRendererRegistry.java` → `YCS_Entity_Renderer_Collect` | `tryRegister(...)` call in `collectGeoEntities()` |
| On Part Hit dispatch | `EntityPartHitHandlers.java` → `YCS_Entity_Part_Hit_Dispatch` (+ `YCS_Entity_Part_Hit_Imports`) | `case "<id>" -> { ... }` compiled from the entity's On Part Hit Blocky graph, if any |
| Geo model file | `geo/entity/<id>.geo.json` | Copied from `ycs-data/models/` |
| Texture file | `textures/entity/<id>.png` | Copied from the shared YCS texture pool |
| Animation file | `animations/entity/<id>.animation.json` | Copied from `ycs-data/models/` — must land as a real resource since `HandAnimationLoader` reads through Minecraft's resource manager, not an arbitrary file path |
| Lang key | `lang/en_us.json` → key | `entity.yebisurpg.<id>` |

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

**Attaching an overlay layer at all — `Set/Remove Texture Overlay` blocks:** previously, `TextureServerEvents.apply(...)` (the only method that ever puts a layer list into `TextureAuthority` in the first place) had zero callers anywhere in the codebase — `overlay.play`/`overlay.stop` could only ever modify playback state of layers that already existed, so there was no way to attach an overlay to an entity through any exposed path. This is now fixed:
- `Set Texture Overlay [texture] at Layer [layer] for [entity]` (`overlay.set` in `blockDefs.js`) picks a texture from the same global pool used everywhere else in YCS (`dropdown.textures` source, loaded/populated the same way as `dropdown.dataComponents` — see `BlockEditor.jsx`'s `dynamicTextureOptions`), and compiles to `TextureServerEvents.setLayer(entity, LayerData.<factory>(...))` — a new server-side method that adds or replaces **one layer only**, keyed by `zIndex` (the "Layer" number), leaving every other active layer on that entity untouched. This is the piece that makes "layer number" meaningful: multiple independent `overlay.set` calls with different layer numbers compose (e.g. a hat at layer 1 and a cape at layer 2), and calling it again with the same layer number replaces just that one.
- `Remove Texture Overlay at Layer [layer] for [entity]` (`overlay.remove`) compiles to `TextureServerEvents.removeLayer(entity, layer)` — removes whichever layer currently occupies that slot, leaving others alone.
- The picked texture's mask/emissive/spritesheet-rows metadata (read once at Blocky-editor time, not re-derived at compile time since `compiler.js` has no async file I/O) decides which `LayerData` factory the codegen emits: `restFrameSpritesheet`/`restFrameCutoutWithMask` for `rows` > 1, `cutoutWithMask`/`cutoutWithMaskAndEmissive`/`simpleWithEmissive`/`simple` otherwise. `LayerData.simpleWithEmissive` is a new factory (emissive-only, no mask) added alongside this — no prior factory covered that combination.
- **Texture must physically exist in the mod at a fixed path** (`compiler.js` hardcodes `yebisurpg:textures/overlay/<id>.png`, since generated Java can't reference the YCS texture pool directly) — `ItemEditor.jsx`'s Save flow scans every enabled method's compiled Blocky graph for `overlay.set` nodes, collects the referenced texture IDs, and copies each one (+ `_mask`/`_emissive` siblings if attached) via `copy_texture_to_mod` into `textures/overlay/`, tracked as ordinary `created-file` injections in the item's own `_injections` array — cleaned up automatically on re-save/removal like everything else.
- Old_mod's `OverlayProvider`/`OverlaySync` pattern (a functional-interface registry any item can add itself to, recomputing the *combined* active layer list from all registered providers and pushing one full `TextureServerEvents.apply` call) was ported into the current mod as-is at `net.ye6isu.yebisuRPG.item.custom.OverlayProvider`/`OverlaySync` — this is the right mechanism for an item that needs its own bespoke, stateful overlay logic (bitflags, toggles, etc., see `ModDataComponents.OVERLAY_FLAGS` for a reusable bitflag component), separate from the simpler Blocky-block path above, which is meant for one-shot/scripted "turn this overlay on/off" logic without a custom item class.

---

## Dedicated Server Compatibility

This mod ships **no runtime dependencies** and must work correctly on a real dedicated server with multiple independent clients — not just singleplayer/LAN, where a client and "server" happen to share the same tick clock in-process and sync bugs are easy to miss. Every feature that has any cross-client visual or gameplay state must be checked against this before being considered done. The two mechanisms already in the mod that get this right are the reference pattern for anything new:

- **Plain vanilla `DataComponent` state on an `ItemStack`** (e.g. `CustomModelData`, used by `Set/Get/Reset Item Texture Frame`) — needs **zero custom sync code**. Vanilla's own inventory/container sync re-sends the full stack (including all its components) to every client that can see it whenever it changes, and to newly-joining/newly-tracking clients as a matter of course. This is why static item texture-frame switching (flat items' `custom_model_data` overrides, and 3D geo items' `CustomModelData`-driven `vFrameOffset`) is dedicated-server-correct with no extra plumbing — it rides entirely on mechanisms vanilla already guarantees.
- **Tick-derived animation with no per-instance network state** (`TextureFrameClock.frameAt(tick, ticksPerFrame, frameCount, mode)`, used by both `GeoItemRenderer`'s `animated` StateAnim path and, with an explicit `startTick`, the entity texture overlay system) — every client computes the same frame from the same input, because `tick` (`level.getGameTime()`) is itself kept in sync with the server by vanilla, not by this mod. No packet is sent per frame, and a client joining mid-animation lands on the correct frame immediately just by evaluating the same pure function against whatever tick it currently has. This is why 3D item animation (and the entity overlay system, which additionally re-sends its `startTick` playhead on login/start-tracking via `TextureAuthority`, since *when* it started is real state a late joiner can't otherwise derive) both work correctly for late joiners and players who were previously out of tracking range.

**The one system that requires (and has) explicit server authority** is the entity texture overlay system (`TextureAuthority`/`TextureServerEvents`/`TextureSyncPayload`) — because *which* layers are attached to an entity at all is real state that can't be derived from a pure function of tick alone, it's stored server-side and pushed to clients on change/login/start-tracking. Contrast this with `animatedOnUse` on a texture: whether an item's texture animates is baked into the mod's assets at Save time (same for every client that has the resource pack), not toggleable per-instance at runtime, so it needs no sync system at all — it's not state, it's content.

**Checklist for anything new that touches visuals/behavior across clients:**
1. Is the varying piece stored as vanilla state on an entity/stack/block entity that vanilla already syncs (a `DataComponent`, standard NBT, etc.)? If so, no custom sync is needed — but verify the mechanism is a real vanilla one, not something read only client-side (e.g. reading `Minecraft.getInstance()` client-only state is never valid on server-authoritative behavior).
2. If it's animation/ticking, can it be expressed as a pure function of the shared, already-synced game tick (`level.getGameTime()`), with any "when did this start"/"what layers are active" state pushed explicitly on change and on login/start-tracking (mirroring `TextureAuthority`)? If the animation's *existence* is itself dynamic per-instance (started/stopped at runtime, not baked into assets), it needs its own server-authoritative store + sync payload, not just a shared clock function.
3. Keep payload registration and any other common/server-loaded setup free of direct references to client-only classes. Register clientbound payloads through a common proxy (`ClientHandlerProxy` style) and only resolve the real client handler after checking `FMLEnvironment.dist == Dist.CLIENT`; otherwise a dedicated server can crash during mod loading before any gameplay code runs (for example, a method reference to a `@OnlyIn(Dist.CLIENT)` payload handler in `NetworkRegistry.register` will force that class to load on `DEDICATED_SERVER`).
4. Never gate gameplay-relevant logic behind a client-only check (`Dist.CLIENT`-only classes, `Minecraft.getInstance()`) unless the entire feature is purely cosmetic/client-rendering, as `GeoItemRenderer`/`EntityTextureCompositor` correctly are.

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
