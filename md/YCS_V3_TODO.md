# YCS V3 TODO

## Creative Tabs
- [x] Plan out creative tab system — pure Java injection, no JSON in mod resources
- [x] Tab registration in mod (`ModCreativeModeTabs.java` + `YCS_Mod_Creative_Tabs` marker)
- [x] Tab assignment per item (dropdown in item editor, injects into `ModCreativeTabContents.java`)
- [x] Vanilla tab support in item editor dropdown
- [x] Icon selection (searchable item combobox — vanilla + mod items)
- [x] Tab ordering / item arrangement (drag-and-drop in tab editor)
- [x] Icon cycler (`TabIconCycler.java` + `AccessorCreativeModeTab` mixin, toggle + interval in tab editor)

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
