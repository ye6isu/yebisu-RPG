# YCS V3 TODO

## Blocks
- [ ] Block registry (landing + editor, similar lifecycle to items)
- [ ] Block properties (hardness, resistance, sound, material, etc.)
- [ ] Block model/texture support
- [ ] Block item generation
- [ ] Loot table generation
- [ ] Custom tool tier support (ModTiers + ModTags.Blocks for needs/incorrect block tags — only relevant once blocks are in)

## Polish
- [ ] Drag-and-drop for 3D model files — verify accuracy across DPI scales
- [ ] Bulk operations (delete multiple items)

## Data Components
- [ ] Global component delete-while-in-use doesn't auto-clean referencing items — they keep a dangling `ref` (silently breaks on that item's next re-save, since the constant no longer exists). `find_component_usage` + `window.confirm` only warns today.
- [ ] String component has no length cap on the network codec (`ByteBufCodecs.STRING_UTF8` — unbounded). Should switch to `ByteBufCodecs.stringUtf8(maxLength)` for dedicated-server hardening.
- [ ] Rename handling untested: `ComponentEditor` removes the old injection line and re-injects under a new id when a global component's name changes, but this hasn't been exercised — verify no duplicate/orphaned lines land in `ModDataComponents.java`.
- [ ] Blocky editor's `datacomp.get`/`datacomp.set` blocks are unaware of global-vs-item-specific components or the `ModDataComponents` registry shape (deferred per user).
- [ ] Renaming a global component doesn't update existing Blocky blocks — a block referencing the old name goes stale, no scanner exists.
- [ ] Deleting a global component doesn't warn about Blocky usage — `find_component_usage` only scans item JSONs on disk, has no visibility into Blocky graphs (stored in browser `localStorage`, key pattern `ycs-blocky::item::<itemId>::<methodKey>`).
- [ ] No validation that a referenced component still exists at compile time — a stale/deleted component compiles to a reference to a nonexistent Java constant with no error.

## Blocky Wiring
- [ ] 14 block opcodes defined in the palette have no compiler handler in `compiler.js` — compiles to a silently broken/placeholder result (empty expression, `"0"`, or a dropped action line), not a build error: `entity.deal_damage`, `entity.is_dashing`, `entity.cancel_dash`, `itemstack.literal`, `itemstack.mainhand`, `itemstack.offhand`, `itemstack.use_duration`, `logic.not`, `itemstack.compare`, `logic.compare_string`, `logic.compare_bool`. (Note: `itemstack.set_texture_frame`/`get_texture_frame`/`reset_texture_frame` and `itemstack.set_state`/`get_state`/`reset_state` were previously listed here too — all six are confirmed working via `compiler.js`'s generic `def.codegen`-driven dispatcher; the state blocks additionally had broken codegen (referenced a nonexistent `ModDataComponents.ITEM_STATE` field) which has since been fixed to use `CustomModelData` directly.)
- [ ] The same `dropdown.attributes`/`dropdown.effects` blocks (`attribute.get`, `attribute.modifier.add`, etc.) likely have the same missing-`fields.attrId`/`fields.effect` dropdown-source bug that was fixed for `dropdown.dataComponents` — not yet audited/fixed.

## Networking (Brought Over, Not Connected)
- [ ] Wire up animation payloads to client animation engine when animation system is added
- [ ] `ClientHandlerProxy` stub methods need real implementations

## Future / Deferred
- [ ] Variables and Attributes tabs (planned to join the Data sidebar group alongside Data Components)
- [ ] Porting `DashUtil` and the animation system from `old_mod` into `src/main` — planned after Blocky editor blocks are refined

## Documentation
- [ ] Keep `YCS_V3_Injection_and_Lifecycle.md` updated as new object types/injection targets are added
