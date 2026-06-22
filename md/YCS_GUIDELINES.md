# YCS (Yebisu Creator Studio) — Guidelines

## Overview

YCS is a visual mod creator for NeoForge. It manages items and blocks by generating and patching Java source files using sentinel comment markers. Everything YCS touches is delimited by `//YCS_*` sentinels so it never corrupts hand-written code.

---

## Sentinel Format

### The universal sentinel pattern

Every YCS-managed region in a Java file uses paired `//YCS_*_START` / `//YCS_*_END` comment markers. All sentinel pairs follow the same server-side conventions:

1. **Registration**: Add both marker strings to the `YCS_MARKERS` array in `server.js`. This enables `wf()` (the write-file helper) to auto-format any file containing these markers via `formatYCSSection()`.
2. **Reading**: Find markers with `src.indexOf(startMarker)` / `src.indexOf(endMarker)`. Never use regex to find markers — `indexOf` is line-ending agnostic and handles `\r\n` (Windows) and `\n` (Unix) transparently.
3. **Writing**: Splice new content between markers: `src = before + '\n' + entries.join('\n\n') + '\n' + after`. Then call `wf(filePath, src)` — this auto-runs `formatYCSSection` which ensures one blank line inside on both sides, trims excessive blank lines, and preserves indentation.
4. **Cleanup**: To empty a block, write with no entries: `src = before + '\n' + after`. `formatYCSSection` collapses it to two blank lines between the markers.

**Never use regex with `\n` to match line boundaries in Java files** — Windows `\r\n` breaks it. Use `indexOf` for markers, string slicing for content replacement.

### Existing sentinel pairs

| Marker pair | File | Content |
|---|---|---|
| `YCS_Mod_Items_START/END` | `ModItems.java` | Item field declarations |
| `YCS_Mod_Blocks_START/END` | `ModBlocks.java` | Block field declarations |
| `YCS_Import_START/END` | Custom class files | Import statements |
| `YCS:methodKey:start/end` | Custom class files | Method overrides |
| `YCS:food/fuel/tooltip:start/end` | Custom class files | Feature overrides |
| `YCS_DataComponents_START/END` | `ModDataComponents.java` | Data component registrations |
| `YCS_Mod_Keybinds_START/END` | `ModKeybinds.java` | Keybind declarations |
| `YCS_Mod_Keybinds_Register_START/END` | `ModKeybinds.java` | Keybind registrations |
| `YCS_Effects_START/END` | `ModEffects.java` | Effect registrations |
| `YCS_Mod_Item_Model_START/END` | `ModItemModelProvider.java` | Model provider lines |
| `YCS_Mod_Creative_Tabs_START/END` | `ModCreativeTabEvents.java` | Creative tab entries |
| `YCS_Mod_Recipe_Provider_START/END` | `ModRecipeProvider.java` | Recipe code |
| `YCS_Mod_Item_Tags_START/END` | `ModItemTagProvider.java` | Item tag entries |
| `YCS_Mod_Block_Tags_START/END` | `ModBlockTagProvider.java` | Block tag entries |
| `YCS_Mod_Block_State_START/END` | `ModBlockStateProvider.java` | Blockstate lines |
| `YCS_Mod_Block_Loot_START/END` | `ModBlockLootTableProvider.java` | Loot table lines |

### ModItems.java / ModBlocks.java registration block
```java
//YCS_Mod_Items_START

public static final DeferredItem<Item> MY_ITEM = ITEMS.register("my_item",
        () -> new MyItemItem(new Item.Properties()));

//YCS_Mod_Items_END
```

- One blank line inside the block on both sides when populated.
- YCS only touches the region between `_START` and `_END`.
- Never place hand-written items inside the YCS block.

### Custom class import block
```java
//YCS_Import_START
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.entity.player.Player;
// ... other imports
//YCS_Import_END
```

- Always injected right after the `package` declaration.
- YCS rebuilds this block entirely on every save/toggle.
- Base imports (`Item`, `ItemStack`, `Level`, `Player`) are always included.

### Method override block (inside custom class)
```java
//YCS:hurtEnemy:start
    @Override
    public boolean hurtEnemy(ItemStack stack, LivingEntity target, LivingEntity attacker) {
        //YCS:hurtEnemy:body   ← replaced with compiled blocks on Save
        return super.hurtEnemy(stack, target, attacker);
    }
//YCS:hurtEnemy:end
```

- The `//YCS:methodKey:body` marker is replaced with compiled block code on every Save.
- If the body marker is missing (previous save compiled it), YCS strips and re-injects the stub before compiling.

### Feature override block (food / fuel / tooltip)
```java
//YCS:food:start
    @Override
    public FoodProperties getFoodProperties(ItemStack stack, LivingEntity entity) {
        return new FoodProperties.Builder().nutrition(3).saturationModifier(0.3f).build();
    }
//YCS:food:end
```

Feature keys: `food`, `fuel`, `tooltip`

---

## Item Architecture

### Registration (ModItems.java)
- All YCS-managed items are registered with `new MyItemClass(new Item.Properties())`.
- No `FuelItem` wrapper class, no `ModFoodProperties` — everything lives in the custom class.
- When no custom class exists, food/fuel/tooltip are inlined as anonymous overrides in ModItems.

### Custom class (e.g. SukunaFingerItem.java)
- Extends `Item` (or `SwordItem` etc. for tools).
- All YCS features (food, fuel, tooltip, method overrides) are injected/removed via sentinels.
- The file is auto-created when you click "edit methods" on an item with an ID set.

### Properties flags (in YCS form)
| Flag | Effect |
|------|--------|
| `isTool` | Uses `SwordItem`/`PickaxeItem` etc. with `.createAttributes(tier, dmg, spd)` |
| `isFood` | Injects `getFoodProperties()` override into custom class (or inline `.food()` if no class) |
| `isFuel` | Injects `getBurnTime()` override into custom class (or inline anonymous class if no class) |
| `hasDurability` | Adds `.durability(N)` to `Item.Properties()`. Hidden when `isTool` is checked. |
| `hasTooltip` | Injects `appendHoverText()` override into custom class (or inline anonymous class if no class) |

---

## Available Override Methods

| Key | Java signature |
|-----|----------------|
| `useOn` | `InteractionResult useOn(UseOnContext context)` |
| `use` | `InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand)` |
| `continuousUse` | `void onUseTick(Level, LivingEntity, ItemStack, int)` + `void releaseUsing(ItemStack, Level, LivingEntity, int)` |
| `finishUsingItem` | `ItemStack finishUsingItem(ItemStack stack, Level level, LivingEntity livingEntity)` |
| `inventoryTick` | `void inventoryTick(ItemStack stack, Level level, Entity entity, int slotId, boolean isSelected)` |
| `hurtEnemy` | `boolean hurtEnemy(ItemStack stack, LivingEntity target, LivingEntity attacker)` |
| `interactLivingEntity` | `InteractionResult interactLivingEntity(ItemStack stack, Player player, LivingEntity interactionTarget, InteractionHand usedHand)` |

---

## Import Management

YCS generates Java imports via `ycsSyncImports` (items) and `ycsEffectSyncImports` (effects). The system follows strict rules to keep classes clean:

### Only-what-you-use principle
- **Base imports**: Only `net.minecraft.world.item.Item` is always included (the class extends it). Everything else — `ItemStack`, `Level`, `Player`, `LivingEntity` — is content-scanned.
- **Method definition imports**: Only include imports required by the method **signature** (return type, parameter types not covered by content scan). Never include block-specific imports like `MobEffectInstance` or `AnimationAPI` — those are handled by the content scan.
- **Content scan**: Runs on `codeBody` — the class source with the import block stripped out. This prevents self-referential loops where an import's own text triggers its re-inclusion.
- **Block definition imports**: Each block in `blockDefs.js` declares its `codegen.imports`. These are injected into the compiled code, which the content scan then detects.

### How it works
1. Start with base imports (`Item` only)
2. Add imports from enabled method definitions (signature-only imports)
3. Add imports from enabled YCS features (`food`, `fuel`, `tooltip`)
4. Strip the import block from the code → `codeBody`
5. Content-scan `codeBody` for patterns (`MobEffectInstance`, `AnimationAPI`, `DashUtil.`, etc.)
6. Rebuild the `//YCS_Import_START...END` block with only the needed imports
7. Remove any stray imports outside the block

### Rules for clean imports

1. **No bundled imports**: Never add an import just because a related import is present. Each import must be independently justified by its own content-scan trigger. Example: `MobEffectInstance` does NOT auto-include `MobEffects` — they have separate triggers (`MobEffectInstance` and `MobEffects.`).
2. **FQN-aware scanning**: When generated code uses fully qualified names (e.g. `net.minecraft.server.level.ServerLevel`), the content scan must NOT match the class name as a substring. Use negative lookbehind: `(?<!\.)ClassName\b` instead of `includes('ClassName')`. This prevents importing a class that's already referenced by FQN.
3. **Block `codegen.imports`**: Only declare imports that the generated code uses as **short names**. If the template uses FQN (like `net.minecraft.core.component.DataComponents.CUSTOM_MODEL_DATA`), set `imports: []` — no import needed.
4. **Method definition imports**: Only signature-required imports (return type, parameter types). Never include block-specific imports like `MobEffectInstance`, `AnimationAPI`, `AnimationCategory` — the content scan handles those when they actually appear in compiled block code.
5. **Total cleanup on save**: Every save rebuilds imports from scratch. When all blocks are removed from a method, all their imports disappear. When a method is disabled, its signature imports disappear. Only what the code body actually references survives.

### Adding a new content-scan trigger
When adding a new utility/API that blocks might use:
1. Add the pattern check to both `ycsSyncImports` and `ycsEffectSyncImports` in `ycs.js`
2. Scan `codeBody` (import block stripped), never raw `code`
3. Use `(?<!\.)ClassName\b` regex if the class might appear as FQN in generated code; use `codeBody.includes('ClassName.')` (with dot) for mod-specific classes that are always short names
4. Each class gets its own independent trigger — never bundle unrelated imports together
5. Add corresponding `codegen.imports` to block definitions only if the template uses short class names

---

## Visual Block Editor (Canvas)

- Free-floating 2D canvas. Drag blocks from the left palette onto the canvas.
- Pan by dragging on empty canvas space.
- Move placed blocks by dragging them.
- Edit field values directly on the block.
- `$param` chips (blue) come from the Parameters section — drag them into block field slots.
- Click **Save** to compile all canvas blocks into the method body on disk.

### Block palette categories
- **Universal Flow & Logic** — If/Do, Delay, Repeat, Math, Logic, Boolean, Return
- **Context Data Blocks** — Get Level, Get Player, Get Entity, Get Item (dynamic getters)
- **World Actions** — set block, get block, spawn particle, play sound, strike lightning
- **Entity & Movement** — deal damage, apply effect, set velocity, get health
- **Item Actions** — damage stack, shrink stack, return interaction result

### Container blocks (blocks with child body slots)

Container blocks are blocks that hold other action blocks inside them (like `control.if` holds its "do" body). When creating a new block that needs child actions, **always** reuse the `control.if` container pattern — stripped down without else/elseif if not needed:

1. **Palette definition**: include `isAction:true` and a `slotDefs` array for any header slots (conditions, values). Default fields **must** include `elseIfCount:0, hasElse:false` so the shared container snap/layout code works.
2. **Code generation** (`compileBlock`): use `compileChain(node.slots.do0, ...)` for the body, same as `control.if`.
3. **Layout** (`getH` / `layoutChain`): add an `else if (n.opcode === "your.opcode")` branch identical to `control.if` but without the elseIf/else loop — just `do0`.
4. **Drop/snap logic**: the shared `else` branch already handles any opcode listed in the `control.if || control.delay` checks. Add your opcode to those checks (`n.opcode==="control.if" || n.opcode==="control.delay" || n.opcode==="your.opcode"`).
5. **Rendering** (`CanvasNode`): add an `if (isYourBlock)` return that copies the `isIf` return structure — header div + `do0` gap div — without the elseIf/else sections or settings panel.

The key invariant: container blocks must appear in **every** place `control.if` is checked in the snap/layout code, or child blocks won't snap inside them.

---

## Keybinds

- Managed in `client/ModKeybinds.java`, the existing keybind home (not a new file).
- Field declarations live in `//YCS_Mod_Keybinds_START ... END`, using the `bind(name, InputConstants.Type, code, KeyModifier, category)` overload so keyboard/mouse/unbound defaults, a single modifier, and an arbitrary category are all supported:
  ```java
  public static final KeyMapping MY_ACTION = bind("my_action", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_K, KeyModifier.NONE, CATEGORY);
  public static final KeyMapping MY_MOUSE_ACTION = bind("my_mouse_action", InputConstants.Type.MOUSE, GLFW.GLFW_MOUSE_BUTTON_4, KeyModifier.CONTROL, "key.categories.misc");
  public static final KeyMapping MY_UNBOUND_ACTION = bind("my_unbound_action", InputConstants.Type.KEYSYM, InputConstants.UNKNOWN.getValue(), KeyModifier.NONE, CATEGORY);
  ```
- Registration calls live in `//YCS_Mod_Keybinds_Register_START ... END` inside `register(RegisterKeyMappingsEvent)`:
  ```java
  event.register(MY_ACTION);
  ```
- Stored as an ordered list in `ycs_keybinds.json` (`{key, bindCode, category}`); list order = declaration/registration order. `bindCode` is `"NONE"` (no default), or a base of `"KEY_<glfw name>"` (keyboard) / `"MOUSE_<button index>"` (mouse), optionally followed by **at most one** of `+CTRL`, `+ALT`, `+SHIFT` (e.g. `"KEY_K+CTRL"`).
- In the YCS UI, the default binding is set via a "Record" button (captures the next keydown/mousedown) *and* a dropdown listing every key/mouse button — either can set the base key. A second dropdown picks the single modifier (None/Ctrl/Alt/Shift). Defaults to no key (`"NONE"`) for new keybinds.
- **Single modifier only, wired into NeoForge's native `KeyModifier` — no mixin needed.** `KeyMapping`/`KeyModifier` only support one modifier at a time (Ctrl, Alt, Shift, or None), not combinations. Passing it through the `bind(...)` overload makes `KeyMapping.getTranslatedKeyMessage()` automatically render e.g. "Ctrl + F" in the vanilla Controls screen for free. An in-game hint while actually playing (JEI-Ctrl+F style) was explicitly deferred — there's no action/GUI context yet for it to attach to.
- **Category** can be this mod's own (`CATEGORY`, shown as "yebisu RPG (this mod)"), an existing vanilla category (`key.categories.movement|gameplay|inventory|creative|multiplayer|ui|misc`), or a custom modded string (`key.categories.<anything>`) typed in via the UI's "+ New custom category…" option. `server.js`'s `/keybinds/list` returns `{own, ownLabel, vanilla, custom}` (custom = categories already in use that aren't `CATEGORY` or vanilla) so the editor's `CategoryPicker` can offer them as a dropdown.
- Lang key: `key.yebisurpg.<key>`.
- What a keybind *does* when pressed is intentionally not wired up by YCS yet — only declaration/registration/lang plumbing exists until that action design (e.g. wiring into the visual block-scripting system) is decided.

## UI Conventions

- Pages do not display their own title heading (e.g. "VARIABLES", "KEYBINDS"). The sidebar tab already identifies which page is active — a redundant page title wastes vertical space. This applies to all pages: Tabs, Keybinds, Textures, Attributes, Variables, Interfaces, and any future pages. Items, Blocks, and Effects already follow this pattern.
- Input fields should not have placeholder text or hint text. Labels above or beside the field are sufficient. Do not use `placeholder` attributes on inputs in editor forms.
- **Property grouping:** When a checkbox or dropdown reveals child fields (e.g. Tool properties under a "Tool" checkbox, pillar textures under a "Pillar" orientation), group the child fields with `paddingLeft:10, borderLeft: 2px solid C.inpB`. Never use `borderTop` separators or colored `borderLeft` values (`#1a3040`, `#3a2a10`, etc.) — always use the theme's `C.inpB` for the border color. This grouping pattern is the standard for all conditional/nested property sections.
- "Add new" is always the floating "+" button (bottom-right FAB), shared across every top-level tab (Textures, Items, Blocks, Tabs, Keybinds) — never a page-local "+ New ..." button. A page-local button duplicates the FAB and is inconsistent with the rest of the app.
- A page opts into the FAB by reporting its own "currently editing/viewing a single entry" state up to `App` (via an `onEditingChange` callback) so the FAB hides while a form/detail view is open, and by accepting a `newTrigger` prop (an incrementing counter) that it watches to open its "new entry" form when the FAB is clicked.
- Switching top-level tabs (Textures/Items/Blocks/Tabs/Keybinds) must preserve whatever state you left a tab in — e.g. if you were mid-edit on an item, switching to Blocks and back to Items returns you to that same open edit form, not the list view. Textures/Items/Blocks already do this via `savedEdState` in `App`; any new page should follow the same pattern rather than resetting to its list view on every tab switch.
- New editor panels must reuse the shared theme primitives (`C` color table, `Lbl`, `SI.inp`/`SI.lbl`, `Btn`) instead of inventing one-off font sizes or colors. Section labels use `Lbl` (11px uppercase dim), row titles are 13px, secondary/signature text is 11px — not arbitrary 10/12px values.
- Editor left panels (`TabEditor`, `KeybindEditor`, `ItemLeft`, `BlockLeft`) fill the available flex space (`flex:1`, no `maxWidth` cap) so every editor panel is the same size regardless of which tab it's on. Don't add a `maxWidth` to a single editor panel — it makes that page look inconsistent with the others.
- Single-pane list views (Textures/Items/Blocks card grid, Tabs list, Keybinds list) use only `background:C.panel,borderRadius:C.r` — no `border`. The `border:1px solid C.pb` is reserved for two-panel editor layouts, where each of the two side-by-side panels gets the border (see Textures' edit view: left = `TexLeft`, right = `TexRight`, each wrapped in its own bordered `flex:1` box).
- A page that edits a single entry should mirror that two-panel editor layout instead of a single bordered box: a left panel with the form fields and a right panel with a live preview/info view, both same-size (`flex:1`) bordered boxes side by side. `KeybindsPage` follows this via `KeybindEditor` (left) + `KeybindPreviewPanel` (right).
- Editor/preview header titles (`"Edit X"` / `"New X"`) are plain text — `fontSize:14,fontWeight:500`, no explicit `color` (defaults to `C.text`) — and carry no status pill next to them. Don't use `color:C.accent` on these titles or add an `editing` badge; that was tried for Items/Keybinds and reverted for being inconsistent with the rest of the app.
- Preview-panel "current value" cards (e.g. `KeybindPreviewPanel`, `InterfacePreviewPanel`) use the same neutral card styling as everything else: `background:C.card`, `border:1px solid C.inpB`, and `Pill` color `C.inp`. Don't hardcode blue tints like `#1a2438`/`#0e2030`/`#2a3f5a` for these — those hex values are reserved for actual *selected/active-state* highlighting elsewhere in the app (drag targets, active list rows, selected texture swatches), not for a page's default chrome.
- **Method list rows** (in the visual block editor's right panel) use input field styling — `background:C.inp`, `border:1px solid C.inpB`, `borderRadius:4` — matching normal form fields. Do not highlight active/enabled methods with blue tints or use `C.card` background. Do not show a "compiled" pill/badge next to the method name. The checkbox alone indicates enabled state. This applies to both `RightPaneShell.jsx` and `VisualEditor.jsx`'s `MethodListPanel`.
- The top-level tab strip supports drag-to-reorder (each tab button is `draggable`, reordering writes the new id order to `tabOrder`) and mouse-wheel horizontal scrolling (the tab strip container listens for `onWheel` and applies `deltaY` to `scrollLeft`) for when there are more tabs than fit the window. Tab order is persisted across reloads via `useLS("ycs_tab_order", ...)`; new tabs are appended automatically by reconciling the canonical tab list against the saved order, so you don't need to touch this when adding a new top-level tab — just add it to the canonical list.

## Scope for New Feature Categories

When a new feature needs to touch a file/path not already listed under "Files YCS Manages", YCS does not assume a location or create a new file on its own — it checks for an existing class/file that can house it first (as was done for keybinds, reusing `ModKeybinds.java`) and asks the project owner before creating anything new.

## Cleanup Rules

**Principle: zero leftovers.** Deleting an item through YCS must remove every file and code injection it created, as if it never existed. No orphaned textures, models, geo files, or registry lines should remain.

When you delete an item, YCS removes:

**Java code injections:**
- `ModItems.java` — registration field from `//YCS_Mod_Items_START...END`
- `ModItemModelProvider.java` — model line from `//YCS_Mod_Item_Model_START...END`
- `ModItemTagProvider.java` — tag lines referencing `ModItems.CONST`
- `ModRecipeProvider.java` — recipe code
- `ModCreativeTabEvents.java` — creative tab line
- `ModFoodProperties.java` — food properties field (if exists)
- `GeoItemRegistry.java` — `tryRegister`/`tryRegisterStates` line from `//YCS_Geo_Collect_START...END`
- Custom class file `item/custom/XxxItem.java`

**Resource files:**
- `textures/item/${id}.png` + `.mcmeta`
- `textures/item/${id}_frame_*.png` (spritesheet frames)
- `textures/item/${id}_state_*.png` + `.mcmeta` (per-state textures)
- `textures/item/${id}_state_*_frame_*.png` (per-state spritesheet frames)
- `models/item/${id}.json` (manual model)
- `models/item/${id}_frame_*.json` (spritesheet frame models)
- `models/item/${id}_state_*.json` (per-state models)
- `models/item/${id}_state_*_frame_*.json` (per-state frame models)
- `geo/item/${id}.geo.json` (3D geo model)
- `textures/geo/item/${id}.png` (3D texture)
- `geo/item/${id}_state_*.geo.json` (per-state 3D geo models)
- `textures/geo/item/${id}_state_*.png` (per-state 3D textures)

**Data files:**
- `en_us.json` — item name + tooltip lang keys
- `ycs_tabs.json` — creative tab assignment
- `ycs_vanilla_items.json` — item list entry

When you uncheck a feature (Food / Fuel / Tooltip) on an item with a custom class:
- The corresponding `//YCS:featureKey:start ... //YCS:featureKey:end` block is removed from the class file.
- Imports are re-synced to remove unused ones.

When you disable a method override:
- The `//YCS:methodKey:start ... //YCS:methodKey:end` block is removed.
- Imports are re-synced.

---

## Server Compatibility

- Always wrap world-mutation code in `if (!level.isClientSide)` — use the **Server Side Only** block.
- Particle spawning uses `ServerLevel.sendParticles()` — already server-side safe.
- Never access client-only classes (anything in `net.minecraft.client.*`) in item method overrides — these will crash dedicated servers. The `appendHoverText` tooltip method is `@OnlyIn(Dist.CLIENT)` implicitly; NeoForge handles this correctly for `Item` subclasses.
- The existing `NetworkingClass` should be used for any custom data sync — do not create new packet types without confirming with the project owner.

---

## Naming Conventions

| Thing | Convention |
|-------|------------|
| Item ID | `snake_case`, e.g. `sukuna_finger` |
| Const name | `UPPER_SNAKE`, e.g. `SUKUNA_FINGER` |
| Custom class | `PascalCase` + `Item` suffix, e.g. `SukunaFingerItem` |
| Method key | `camelCase`, matches Java method name |
| Feature key | `food`, `fuel`, `tooltip` (fixed) |

---

## Files YCS Manages

| File | What YCS touches |
|------|-----------------|
| `item/ModItems.java` | `//YCS_Mod_Items_START ... END` block |
| `item/custom/MyItemItem.java` | Entire file (auto-created), sentinel blocks inside |
| `resources/assets/.../textures/item/` | Texture PNG files |
| `resources/assets/.../lang/en_us.json` | Item display name keys |
| `resources/assets/.../models/item/` | Model JSON files |
| `resources/data/.../loot_table/` | Loot table JSON files |
| `resources/data/.../tags/` | Tag JSON files |

For any new feature/file category not already in this table, YCS does not assume a path or create a new file on its own — it asks the project owner whether an existing file/class can house it before creating anything new.

---

## UI Component Standards

### Module Structure
YCS is split into modules under `tools/Yebisu Creator Studio/src/`:
- `constants.js` / `theme.js` / `context.js` / `api.js` — foundation
- `components/ui.jsx` — shared primitives (Lbl, Btn, Inp, Sel, Chk, SearchSel, AImg, FormActions, etc.)
- `components/` — shared complex components (TexSel, ItemPicker, CardGrid, EditRow, IngredientPicker, VisualEditor)
- `panels/` — right-pane panels (Recipe, Tags, Tooltip, Variants, TexturePicker, Code, CustomClass, RightPaneShell)
- `pages/` — one file per tab (Textures, Items, Blocks, Tabs, Keybinds, Interfaces, Variables, Attributes, Effects)
- `codegen/` — Java code generation (items, blocks, ycs method injection, visual scripting)

### List Views
- **Items, Blocks**: Use `CardGrid` (200×267px cards with texture preview, name, and ID).
- **Effects**: Use `CardGrid` with same dimensions. Card layout: texture preview (180px), name + color swatch (right-aligned) on first line, ID + category pill (right-aligned) on second line.
- **Keybinds, Tabs**: Use row layout (height 40px, card background, border-radius 6).
- **Variables, Attributes**: Use row layout with inline editing.

### Field Row Pattern (EditRow)
For fields that open a right-side panel (Texture, Methods, Tags, Tooltip, Recipe, Variants):
- Use `EditRow` component or the same pattern: label left, summary text, button right.
- Button text: **"set"** when nothing is configured, **"edit"** when something is configured.
- Summary shows current state (e.g. tag count, recipe types, tooltip text, method count).

### Texture Fields
- **Texture tab** (TexturesPage): File upload fields use `FileField` pattern — `[Preview] [Filename] [replace (if set)] [set/remove]`. Consistent height and layout for Texture File, Shape File, and Emissive File.
- **Item/Block editors**: Texture field opens the Texture right panel. Button says "set"/"edit". No inline remove — the panel handles selection.
- **Door/Trapdoor** (VariantsPanel): Uses `VariantTexRow` — same field appearance with inline dropdown picker, remove/set buttons.

### Searchable Dropdowns (SearchSel)
- `SearchSel` is the unified searchable dropdown component.
- Default mode: strict pick from list (used for Sounds, block orientation, etc.).
- `freeform={true}`: text input with autocomplete suggestions, allows custom values (used for food status effects).

### Item Pickers (ItemPicker)
- `ItemPicker` is the unified item selection component.
- `showCount={true}` (default): shows count field alongside item selector.
- `allowEmpty={true}`: adds "(empty)" option at top of list.
- Used for: effect item stacks, variable defaults, recipe drop items.

### Block Drop
- Drop type options: "Self" (drops itself) or "Custom" (drops a different item).
- Custom shows: searchable item picker (freeform), Fortune checkbox, XP field (only when Fortune checked).
- Fortune = uses `DropExperienceBlock` + `createOreDrop()` (gives XP + Fortune enchantment bonus).
- No Fortune = uses `createSingleItemTableWithSilkTouch()` (Silk Touch only, no Fortune).

### Holding Mode Labels
- "Default" (value: "none") — flat item rendering
- "Handheld" (value: "handheld") — tool/handheld rendering

### Recipe Summary (Left Pane)
- Shows comma-separated names of what's checked: "Crafting", "Smelting", "Smoking", "Blasting", "Campfire".
- No inline details (type, count, XP) — those are in the right panel.

### Tooltip Lang Cleanup
- When tooltip is unchecked during edit, the lang entries (`tooltip.MODID.id.normal`, `.shift_hint`, `.hidden`) are deleted via `/api/lang/delete` with `{keys: [...]}`.

### Visual Block Editor
- When a block is dropped, its slots are auto-populated with default data blocks:
  - Entity slots → "Event Entity" block
  - Number slots → "Number" literal block (value: 1)
  - Text slots → "Text" literal block (value: "")
- The user can then swap these defaults for different blocks if needed.
- No placeholder text shown on empty canvas.

### Creative Tabs
- Built-in tabs (yebisu RPG Items/Blocks) were removed. Only custom tabs (via Tabs editor) and vanilla tabs remain.
- Category labels in keybinds: "yebisu RPG" (no "(this mod)" suffix).

### Keybind Mouse Buttons
- Dropdown includes Mouse 1-5. Labels: "Mouse 1", "Mouse 2", "Mouse 3", "Mouse 4", "Mouse 5".
- Browser button remapping: left=Mouse 1, right=Mouse 2, middle=Mouse 3 (browser gives 0=left, 1=middle, 2=right; we remap {0→0, 1→2, 2→1}).
