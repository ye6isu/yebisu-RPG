# WIP: Data Components (Global + Item-Specific)

> Status as of latest session: **Item Editor UI reworked (single-page picker, grouped rows) and Blocky editor wiring added (Get/Set, itemstack slot blocks). Builds clean (Java + Rust + frontend). Still NOT manually tested in the running app.** Next session should start by actually exercising this in YCS before moving on.

## Item Editor UI (this session)

The inline "Data Components" section in the item editor was replaced with a single button (`FieldIconButton`, same "set"/"edit" style used for method blocks) that opens a dedicated full-page editor (`DataComponentsPage` in `ItemEditor.jsx`):

- Header has "+ Attach Global" / "+ New Item-Specific" buttons plus Back.
- Rows are grouped into two `FieldGroup` sections ("Global" / "Item-Specific") using the same left-border-line pattern as the rest of the item editor.
- Each component is a single row: name/global-dropdown, type dropdown (item-specific only, equal width with name), default/override-default value, remove button.
- Global picker uses `DropdownField` (searchable combobox) instead of a plain readonly dropdown, and expands to fill the row when there's no type-dropdown column next to it (so the value field still lines up between Global and Item-Specific rows).
- Remove button uses `.ycs-tiny-button` with a visible border.

`ComponentsLanding.jsx`, `TagsLanding.jsx` (landing pages) also had their list rows unified to match `ItemsLanding.jsx`'s style (icon left, single-line title, secondary info inline to the right instead of stacked below). `ComponentsLanding` additionally groups rows by type using the same left-border-line pattern. `RecipesLanding.jsx` was deleted — it was dead code, never wired into `App.jsx`'s sidebar/tabs.

## Blocky Editor Wiring (this session)

**Root bug found and fixed:** `datacomp.get`/`datacomp.set` in `codegen/visual/compiler.js` computed the Java constant name as `"YCS_" + compName.toUpperCase()...` — a fabricated scheme that never matched how components are actually registered (`componentConstName(name)` for global, `componentConstName(itemId_name)` for item-specific, no `YCS_` prefix). Any use of these blocks would have compiled to a reference to a nonexistent Java field. Also fixed `compType` values used `"bool"` instead of `"boolean"` in `blockDefs.js`'s `dynamicLinkType`/`dynamicAccepts` maps, mismatching `DATA_COMPONENT_TYPES`.

**Dropdown wiring:** `dropdown.dataComponents` (referenced in `Get/Set Data Component` block labels) was never populated — `BlockEditor.jsx`'s `DROPDOWN_SOURCES` had no `dataComponents` key, so the dropdown silently rendered empty. Fixed by:
- `BlockEditor.jsx` now loads all global components (`ycs-data/components/*`) plus the current item's own `inline` components on mount/`itemId` change, building `{ value, label, compType, constName }` options. Global options are labeled `"<name> (Global)"`; item-specific options show just the name.
- Selecting an option now also writes hidden `compType` + `compConstName` fields onto the node (needed by codegen, not user-facing).
- Options are exposed via a module-level `dynamicDataComponentOptions` (same pattern as the existing `window.__hoveredSlot` hack) rather than threaded as props through `CanvasBlock`/`BlockContent`/`SegmentItem`.

**Itemstack-typed components:** previously excluded from working entirely — the scalar Get/Set blocks only handle `double`/`boolean`/`string`. Since an itemstack component is really a `List<ItemStack>` (e.g. a "power slot" or backpack), added four new opcodes instead of overloading the scalar blocks:
- `datacomp.get_slot` / `datacomp.set_slot` — get/set the `ItemStack` at a given index (set auto-grows the list with `ItemStack.EMPTY` padding).
- `datacomp.slot_count` — current list length.
- `datacomp.find_empty_slot` — index of first empty/missing slot, or `-1`.

These are intentionally array-shaped (index-based get/set) so they'll compose cleanly with a future inventory-style GUI (drag from player inventory into a custom screen) — the component is already a real `List<ItemStack>`, network-synced automatically by NeoForge, so a future GUI can render each slot as a clickable cell against the same list without a data-model change. The actual GUI/`Screen`/`AbstractContainerMenu` for that does not exist yet and is a separate, unstarted feature.

The scalar Get/Set dropdown now excludes itemstack-typed components (`dropdownExcludesCompType: "itemstack"`); the four new slot blocks only show itemstack-typed components (`dropdownRequiresCompType: "itemstack"`).

## Known gaps — Blocky + Data Components integration

1. **Renaming a global component doesn't update existing Blocky blocks.** A block that already selected the old name keeps referencing it — the generated Java constant reference goes stale. No scanner exists for this.
2. **Deleting a global component doesn't warn about Blocky usage.** `find_component_usage` (Rust/Tauri) only scans item JSONs on disk; it has no visibility into Blocky graphs, which live in browser `localStorage` (`ycs-blocky::item::<itemId>::<methodKey>`). Fixing this needs a frontend-side scan of those localStorage keys, not a backend change — deferred, not started.
3. **No validation that a referenced component still exists at compile time.** If `dynamicDataComponentOptions` was stale, or the component was deleted between opening the Blocky editor and saving, nothing catches the mismatch — it'll just compile a reference to a nonexistent constant.

## Full Blocky wiring audit (this session)

Cross-referenced all block opcodes in `blockDefs.js` against `compiler.js` dispatch. **17 blocks are defined in the palette but have no compiler handler at all** — dragging them into a chain compiles to a silently broken/placeholder result (empty expression, `"0"`, or a dropped action line), not a build error:

| Opcode | Category / Sub | Type | Note |
|---|---|---|---|
| `entity.deal_damage` | Entity / actions | action | no handler — silently no-ops |
| `entity.is_dashing` | Entity / data | value | no handler |
| `entity.cancel_dash` | Entity / actions | action | no handler |
| `itemstack.literal` | Item / data | value | no handler |
| `itemstack.mainhand` | Item / data | value | no handler |
| `itemstack.offhand` | Item / data | value | no handler |
| `itemstack.use_duration` | Item / data | value | no handler |
| `itemstack.set_state` | Item / actions | action | no handler |
| `itemstack.reset_state` | Item / actions | action | no handler |
| `itemstack.get_state` | Item / data | value | no handler |
| `itemstack.set_texture_frame` | Item / actions | action | no handler |
| `itemstack.reset_texture_frame` | Item / actions | action | no handler |
| `itemstack.get_texture_frame` | Item / data | value | no handler |
| `logic.not` | Logic / data | value | no handler |
| `itemstack.compare` | Logic / Flow Control | value | no handler |
| `logic.compare_string` | Logic / Flow Control | value | `logic.compare`'s handler only does numeric ops, doesn't branch for this opcode |
| `logic.compare_bool` | Logic / Flow Control | value | same — no dedicated handling |

Everything else audited (~51 top-level blocks, including all `anim.*` families — first/third person, hand pose, item animation "play" blocks are wired) has a working handler. Not fixed this session — flagged for the next pass.

## What this is

Added the ability to create Minecraft `DataComponentType`s (typed values stored on an `ItemStack`, network-synced automatically) from within YCS, in two flavors:

- **Global components** — defined once on the new **Data → Data Components** sidebar tab, referenced by name from any number of items. Use case: `max_ammo` / `current_ammo` / `attachment_slots` shared identically across all gun items so generic code (reload handler, ammo HUD) doesn't need to special-case each gun.
- **Item-specific components** — declared inline inside a single item's own editor (Item Editor → Data Components section), owned only by that item. Use case: a legendary weapon's unique one-off mechanic that doesn't generalize.

An item's `dataComponents` array can mix both kinds freely (`{ kind: 'ref', ref: '<globalName>', overrideDefault }` and `{ kind: 'inline', name, type, defaultValue, slotCount }`).

## Supported types

| Type | Java Type | Notes |
|------|-----------|-------|
| `double` | `Double` | chosen over separate int/float/double to avoid bloating the type dropdown — ints/floats fit fine in a double for item-scale data |
| `boolean` | `Boolean` | |
| `string` | `String` | **not length-capped** — see Known Gaps below |
| `itemstack` | `List<ItemStack>` | designed as a list from day one (not a single slot) so today's "power slot" (slotCount=1) and a future backpack (slotCount=N) use the same type/codec — no rework needed later. `slotCount` is currently a **UI-only hint, not enforced** by the codec — see Known Gaps |

## Files touched

- **New:** `src/main/java/net/ye6isu/yebisuRPG/component/ModDataComponents.java` — registry class with `registerDouble/registerBoolean/registerString/registerItemStackList(name)` helpers + `YCS_Data_Components` marker. Registered in `yebisuRPG.java`.
- **New:** `ycs/src/components/ComponentsLanding.jsx` — global registry landing page + editor (list/create/edit/delete). Exports `DATA_COMPONENT_TYPES` and `componentConstName()`, reused by `ItemEditor.jsx`.
- **Modified:** `ycs/src/components/ItemEditor.jsx` — `DataComponentsGroup` now has two add buttons ("+ Attach Global" / "+ New Item-Specific"), loads global list via `loadGlobalComponents()`, injects only `inline`-kind rows into `ModDataComponents.java` (ref rows just store a reference, no injection).
- **Modified:** `ycs/src-tauri/src/lib.rs` — added `find_component_usage` Tauri command (mirrors `find_texture_usage`, scans item JSONs for `dataComponents[].ref` matches). Also fixed a pre-existing bug in `find_texture_usage`: it only checked the `texture` field, never `geoTexture`, so 3D items' geo textures could be silently deleted with no "in use" warning — now checks both.
- **Modified:** `ycs/src/App.jsx` — new **Data** sidebar group (separate from Registry), currently containing only "Data Components". Intentionally split out so Variables and Attributes tabs can join it later without another reshuffle.
- **Modified:** `md/YCS_V3_Injection_and_Lifecycle.md` — documented the `YCS_Data_Components` marker and the global-vs-item-specific data model.

## Known gaps / things to verify next session

1. **Not manually tested yet.** Need to actually open YCS, create a global component, attach it to an item, save, and confirm `ModDataComponents.java` gets the right injected line and the item JSON has the right `ref` shape.
2. **Global component delete-while-in-use:** `find_component_usage` + `window.confirm` warns now, but referencing items are **not** auto-cleaned — they'll keep a dangling `ref` after the global component is deleted, until that item is re-saved (at which point the ref just silently does nothing since the constant no longer exists — this could produce broken generated Java on next re-save of that item and needs a real fix, not just a warning).
3. **String component has no length cap** on the network codec (`ByteBufCodecs.STRING_UTF8` — unbounded). Should switch to `ByteBufCodecs.stringUtf8(maxLength)` for a proper multiplayer/dedicated-server hardening pass.
4. **Itemstack list has no enforced slot cap** — `slotCount` is UI-only. The codec should enforce max list length server-side (`ByteBufCodecs.list(maxSize)`-style) so a corrupted/hacked stack can't carry an arbitrary-length list.
5. **Rename handling untested:** `ComponentEditor` has logic to remove the old injection line and re-inject under a new id when a global component's name changes, but this hasn't been exercised — worth confirming no duplicate/orphaned lines land in `ModDataComponents.java`.
6. Blocky editor's `datacomp.get`/`datacomp.set` blocks are **still unaware** of this new system — deliberately deferred (see below).

## Explicitly NOT done yet (deferred per user)

- Blocky editor integration (`datacomp.get`/`datacomp.set` blocks don't know about global vs item-specific components, or the new `ModDataComponents` registry shape).
- Porting `DashUtil` and the animation system from `old_mod` into `src/main` — planned as the phase after blocky editor blocks are refined.
- Variables and Attributes tabs (mentioned as "also coming" to the new Data sidebar group, not started).

## Next session should start with

1. Launch YCS (`cd ycs && npm run tauri dev` or similar — check `ycs/README.md`), manually create a global component and an item-specific one, verify generated Java compiles and looks right.
2. Decide how to actually fix gap #2 (dangling ref on delete) — likely need to scan-and-strip the `ref` from referencing items' JSON at delete time, not just warn.
3. Decide whether to harden string/itemstack codecs now (gaps #3/#4) or ship as-is and revisit later.
