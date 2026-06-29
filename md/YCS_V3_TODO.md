# YCS V3 TODO

## Item Properties (Next Up)
- [ ] Attack Damage — float field, adds `ATTACK_DAMAGE` attribute modifier to `Item.Properties`
- [ ] Attack Speed — float field, adds `ATTACK_SPEED` attribute modifier to `Item.Properties`
- [ ] Food — toggle + fields (nutrition, saturation, canAlwaysEat, fastFood), uses `Item.Properties.food()`
- [ ] Fuel — int field (burn time in ticks), registers via `FurnaceFuelBurnTimeEvent`
- [ ] Tool Type — dropdown (sword, pickaxe, axe, shovel, hoe, none), sets tool tier and mining behavior
- [ ] Tooltip — text field(s), adds custom tooltip lines via `appendHoverText` override (requires custom class)

## Creative Tabs
- [ ] Plan out creative tab system — decide on approach (custom tabs vs vanilla tab injection vs both)
- [ ] Tab registration in mod (custom `CreativeModeTab` instances)
- [ ] Tab assignment per item (dropdown in item editor)
- [ ] Tab ordering / icon selection

## Blocks
- [ ] Block editor (similar lifecycle to items)
- [ ] Block properties (hardness, resistance, sound, material, etc.)
- [ ] Block model/texture support
- [ ] Block item generation
- [ ] Loot table generation

## Polish
- [ ] Drag-and-drop for 3D model files — verify accuracy across DPI scales
- [ ] Texture preview in item editor (inline preview of selected texture)
- [ ] Bulk operations (delete multiple items)
- [ ] Search/filter on items landing page

## Networking (Brought Over, Not Connected)
- [ ] Wire up animation payloads to client animation engine when animation system is added
- [ ] `ClientHandlerProxy` stub methods need real implementations

## Documentation
- [ ] Keep `YCS_V3_Injection_and_Lifecycle.md` updated as new object types are added
