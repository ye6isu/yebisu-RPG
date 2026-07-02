# WIP: Data Components (Global + Item-Specific)

> Status as of this session: **implemented, builds clean (Java + Rust + frontend), NOT yet manually tested in the running app.** Next session should start by actually exercising this in YCS before moving on.

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
