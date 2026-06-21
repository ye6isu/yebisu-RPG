# YCS Blocky Editor — Complete Guide

---

## 1. The Visual Canvas (Background & Navigation)
- **Background Dots**: CSS `radial-gradient(circle, #1a1a1e 1px, transparent 1px)`, spaced `24px`.
- **Zoom**: Mouse wheel, `0.4x`–`2.0x`. Recalculates pan using cursor as `transformOrigin` anchor.
- **Pan**: Click-drag on `.canvas-bg`.
- **Empty State**: When only the "Start" node exists with no children, a faded watermark displays `</>`, "drag blocks here", and "connect to Start to run".

---

## 2. Block Colors

Colors signal category at a glance. All blocks in the same category share one color — never add per-opcode overrides.

| Category | Opcode pattern | Hex | Description |
|---|---|---|---|
| Start | `isSt` | `#1e293b` | Dark Blue |
| Animation | `anim.*` | `#3a5c3a` | All FP anim blocks (play, stop, pause, resume, handpose) |
| Logic / Control | `logic.*`, `entity.is_crouching`, `control.if` | `#6494a4` | Conditionals and boolean values |
| Effects | `effect.apply` | `#c46c94` | Potion / mob effect blocks |
| Text value | `linkType === "text"` | `#5ba558` | Text literal nodes |
| Entity value | `linkType === "entity"` | `#30e1b9` | Entity reference nodes |
| Number value | `linkType === "number"` | `#4d65b4` | Number literal and number link nodes |
| Item Stack value | `linkType === "itemstack"` | `#945d66` | Item stack reference nodes |
| Disconnected | — | `#4a4a5a` | Dimmed Grey, opacity `0.6` |

### Block Color Rule — Return Type Determines Color

Data blocks (getters) use the color of the **type they return**, not the category they operate on. For example, a block that reads an item stack property but returns a number uses the number color (`#4d65b4`), not the item stack color (`#945d66`). The block's `color` field in `blockDefs.js` must match its `linkType`.

### Dynamic Block Colors

Blocks with `dynamicLinkType` (variable.get/set, datacomp.get/set) change their color based on the selected type field. The `_typeColor` helper maps: `bool`/`logic` → `#6494a4`, `string`/`text` → `#5ba558`, `entity` → `#30e1b9`, `itemstack` → `#945d66`, default → `#4d65b4`. This is resolved automatically for JSON-defined blocks via `dynamicLinkType.field`.

### Dropdown Selection Must Not Disconnect Valid Slots

When a dropdown selection changes a block's type (e.g. picking a different variable or data component), only clear connected slots if the type actually changed. Never unconditionally clear slots — check `oldType !== newType` before calling `__clearSlot`.

### Dropdown Style

All dropdowns in block rendering use `PortalSelect` — a portal-based dropdown matching the search dropdown style (dark trigger button with `▾`, portaled list with hover highlighting). Never use native `<select>` elements in blocks. For dropdowns that need search, use `AttrDropdown`/`EffectDropdown`/`VarDropdown`/`DataCompDropdown`. For simple option lists, use `PortalSelect` with an `options` array.

When adding a new block:
- For JSON blocks, set `color` in the block definition. For dynamic-color blocks, use `dynamicLinkType`.
- For hardcoded blocks, add to the `_dynColor` check or `isAnimBlock`/`isLogicBlock` group in `CanvasNode`.

---

## 3. Block Width

Action blocks use `width: "fit-content"` with `minWidth: 50` — they shrink to their content. Never set a large fixed `minWidth` (e.g. 300) as it adds empty right padding on blocks with few slots.

---

## 4. Shape Dimensions & Inline Variable Injection

### Action Blocks (Sequential Control Flow)
- **Height**: Base `50px`. Border radius `10px`.
- **Z-Index**: Connected blocks use `node.depth`; disconnected at `z-index: 50`; value blocks at `z-index: 100`.
- **Visual Warning**: Floating action blocks get opacity `0.6` and a red warning badge (`#e11d48`).

### Value / Link Blocks (Inline Variables & Data)
- **Floating**: Auto height, `10px` border radius, `8px 10px` padding.
- **Inline (Slotted)**: Height collapses to `30px`, no border radius, no padding, `box-shadow: 0 2px 6px rgba(0,0,0,.3)`.
- **Render Delegation**: Slotted value blocks skip main canvas rendering — `SlotConn` renders them inline.

---

## 5. The "Puzzle Nub" System & Text Spacing

### Key (On the Value Block)
- `10px` wide, `20px` high, center-left, `border-radius: 10px 0 0 10px`.

### Lock (On the Target Slot)
- `30px` high, min `50px` wide, `marginLeft: 10px`.
- Cutout half-circle at `left: -8px` — fits inside the `10px` margin, leaving a `2px` visual gap.

---

## 6. Advanced Control Flow (C-Shapes)
- `If` block header: `50px` row with condition slot.
- **Gap Spacers**: Transparent `<div>` with height bound to `node.gapHeights?.do0`, pushing content down.

### Settings Popups

All settings popups use `SettingsPortal` — a portal-based overlay that:
- Uses `ReactDOM.createPortal` with `position:"fixed"` to escape the block's stacking context
- Matches dropdown visual style: `#1e1e1e` background, `1px solid #3a3a3c` border, `boxShadow: "0 4px 16px rgba(0,0,0,0.8)"`
- Positions above the gear icon that triggered it (anchored via `settingsAnchorRef`)
- Has a fixed close button (✕) in the top-right of the header
- Closes on outside click (mousedown listener on document)
- Never use `position: "absolute"` with hardcoded `top` offsets for settings — always use `SettingsPortal`

---

## 7. Drag & Drop Architecture
- **Sequential Snapping**: Distance to other block bottoms, threshold `60px`.
- **Value Snapping**: `document.querySelectorAll('.slot-conn')`, bounding rect hypotenuse, threshold `50px`, type-matched.
- **Hover Flags**: `window.__hoveredSlot = { nodeId, sk }`.
- **Context Menu**: Right-click → `window.__showYcsCtx(node.id, e.clientX, e.clientY)`.

---

## 8. Scroll Behavior — Canvas Zoom vs. Panel Scroll

Stop wheel propagation on any scrollable element over the canvas:
```js
onWheel={e => e.stopPropagation()}
```
Apply to: palette sidebar, `AttrDropdown` list, any scrollable panel/popover.

---

## 9. Dropdown Portaling — Escaping Block Stacking Contexts

Use `ReactDOM.createPortal` to render dropdown lists under `document.body`:
```js
const rect = anchorRef.current.getBoundingClientRect();
ReactDOM.createPortal(
  <div style={{ position:"fixed", top: rect.bottom+2, left: rect.left, zIndex: 99999 }}>
    {/* list items */}
  </div>,
  document.body
)
```
- Use `position: fixed`, capture `rect` at open time.
- Close on outside `mousedown`; `stopPropagation` on the portaled list itself.
- `AttrDropdown` is the reference implementation.

---

## 10. Typography & Form Inputs
- **Font**: Sans-serif, `16px`, bold (`700`).
- **Inputs**: Floating bg `rgba(0,0,0,0.3)`, inline bg `transparent`. Width: `Math.max(50, text.length * 10 + 20)`. No borders, `5px 10px` padding.

---

## 11. Palette Sidebar Structure

Rendered by `PaletteSidebar`. Each category is collapsible. Two subcategories per category:

| Subcategory | Contains | Shape |
|---|---|---|
| **DATA** | Link/value blocks with a `linkType` | No `isAction` flag |
| **ACTIONS** | Action blocks in the execution chain | `isAction: true` |

`PALETTE_BLOCKS` entries use `{ category, data: [...], actions: [...] }`.

---

## 12. Adding a New Block (JSON-Driven)

All new blocks are defined in `blockDefs.js` as a single JS object. No other files need editing for simple blocks.

### Block Definition Schema

```js
{
  opcode: "my.block",           // unique identifier
  category: "Effects",          // palette sidebar category
  sub: "actions",               // "data" or "actions"
  linkType: "number",           // for data blocks: "entity"|"number"|"text"|"logic". null for actions
  isAction: true,               // true for action blocks
  paletteLabel: "My Block",     // optional — overrides label for palette sidebar display
  label: "Do thing to [entity:entity] with [amount:number]",  // inline label format
  hint: "Tooltip text",
  color: "#c46c94",             // block color hex
  transparent: false,           // if true, dropdowns/inputs between slots have no dark bg (for math/comparators)

  // Fields (dropdowns, inputs — referenced from label tokens or settings)
  fields: {
    mode: {
      type: "dropdown",         // "dropdown" | "input" | "hidden"
      options: [{value:"a",label:"A"},{value:"b",label:"B"}],
      default: "a",
      compact: false,           // if true, dropdown trigger has no ▾ arrow (for operator symbols)
      showIf: "other != 'x'",   // conditional visibility based on another field value
      minWidth: 100,            // optional minimum width for dropdown trigger
    },
    count: { type: "hidden", default: 0 },  // hidden fields don't render but hold state
  },

  // Settings (gear popup — portal-based, consistent style)
  settings: {
    los: { type: "checkbox", label: "Line of Sight", default: true, showIf: "..." },
    losOrigin: { type: "dropdown", label: "Origin", options: [...], default: "caller" },
    // Action buttons (add/remove operations)
    _actions: [
      { label: "+ Item", onClick: { field: "count", action: "increment", max: 10 } },
      { label: "− Item", onClick: { field: "count", action: "decrement", min: 0 } },
      { label: "+ Toggle", labelOn: "− Toggle", labelOff: "+ Toggle",
        onClick: { field: "flag", action: "toggle" } },
    ],
  },

  // Code generation
  codegen: {
    type: "value",              // "value" | "action" | "compound"
    expr: "({{entity}}.getX())",     // for value blocks — expression to return
    template: "...",            // for action blocks — Java code (\n for multiline)

    // Context-sensitive expressions (value blocks that resolve differently per method)
    methodVariants: {
      "useOn": "context.getPlayer()",
      "hurtEnemy": "attacker",
      "*": "player",            // fallback
    },

    // Conditional codegen based on field values
    variants: {
      "mode == 'set'": { template: "..." },
      "mode == 'add'": { template: "..." },
    },

    // Compound blocks (C-shape with body)
    compoundTemplate: {
      before: "TickScheduler.INSTANCE.schedule((int)({{ticks}}), () -> {",
      after: "});",
    },

    imports: ["net.minecraft.world.entity.LivingEntity"],
    // Conditional imports based on field values
    conditionalImports: {
      "effect contains 'ModEffects.'": ["net.ye6isu.yebisuRPG.effect.ModEffects"],
    },
    slotDefaults: { entity: { opcode: "entity.event" } },

    handler: "control.if",      // falls through to hardcoded compiler (rare)
  },

  // Dynamic link type (output type changes based on a field)
  dynamicLinkType: { field: "varType", map: { bool: "logic", string: "text", "*": "number" } },

  // Dynamic slot acceptance (input slot type changes based on a field)
  dynamicAccepts: {
    value: { field: "varType", map: { bool: "logic", string: "text", "*": "number" } },
  },

  // Repeatable slots (dynamically add/remove slot instances)
  repeatableSlots: {
    key: "text",              // base key — creates text0, text1, text2...
    accepts: "text",          // link type each slot accepts
    countField: "textCount",  // field that tracks count
    default: 1, min: 1, max: 10,
    separator: "+",           // text shown between repeated slots
  },

  // Compound block bodies (C-shapes)
  body: { do0: { label: null } },   // simple body
  bodyConfig: { type: "if" },       // complex body (If block with else-if/else)

  // Multiline rendering — wraps each line after a slot connector
  multiline: false,              // default; if true, block renders one slot per line
  // fields.multiline can be a hidden field with default true, combined with
  // settings.multiline as a checkbox to let users toggle it per instance

  // Shape-switching slots (e.g., AoE block changes slots based on shape dropdown)
  shapeSlots: {
    sphere: "radius [radius:number]",
    box: "width [width:number] height [height:number] depth [depth:number]",
  },
  suffixLabel: "offset x [offX:number] y [offY:number] z [offZ:number]",  // always appended after shapeSlots
}
```

### Multiline Mode

When `multiline: true` (or toggled via settings), the block renders one line per slot connector:
- Each line ends AFTER a slot link
- Each line ends AFTER a slot connector — line breaks come after links, not before
- Each line uses `minHeight: 50` (action blocks) or `minHeight: 30` (data blocks) — grows if a child is taller
- Layout system (`recalcLayout`) accounts for the taller header when positioning child blocks in compound bodies
- Use `fields.multiline: { type: "hidden", default: false }` and `settings.multiline: { type: "checkbox", label: "New Line per Link" }` to let users toggle it
- Default to `false` unless the block is unwieldy in single-line (6+ slots)

Example: A block with 6 slots toggled to multiline renders as:
```
⚙ Dir X from x1 [number]
y1 [number]
z1 [number]
to x2 [number]
y2 [number]
z2 [number]
```

### Multiline Inline Blocks

When a multiline data block is slotted inline inside another block:

**Single-line parent + multiline child:**
- The inline multiline block gets `padding: 10px` top and bottom, matching the centering gap a single-line child gets in a 50px action row (30px child + 10px top + 10px bottom = 50px)
- The parent row uses `minHeight` (not fixed `height`) so it grows to fit the multiline child
- The inline block switches to `flexDirection: column` so its lines stack vertically

**Multiline parent + multiline child:**
- Each line row in the parent uses `minHeight` — when one line contains a multiline child, that specific row grows to fit it
- Other lines remain at their normal height

**Toggling off:**
- When multiline is unchecked, the block shrinks back to single-line (30px inline, 50px floating)
- All block header divs use `minHeight` instead of fixed `height` to support dynamic resizing

### Height Rules
- All block headers use `minHeight`, never fixed `height` — allows growth for multiline children
- `commonHeader` uses `minHeight: 50` instead of `height: 100%`
- Compound block (C-shape) headers use `minHeight: _headerH` where `_headerH` accounts for the block's own multiline state
- Normal action blocks use `minHeight: 50` with `display: flex` so flex children push the height

### Layout Height Measurement (DOM-based)

The layout system (`recalcLayout`) cannot know the exact rendered height of an action block when it contains a multiline inline child — the height depends on CSS flex layout, padding, and the child's slot count. Instead of estimating, the system uses **DOM measurement with a post-render correction pass**:

1. **`getActionH(n, ns)`** — called by `getH` and `layoutChain` to determine how much vertical space an action block occupies. It first checks `measuredRef.current[n.id]` for a previously measured DOM height. If found (and > 50), it returns that. Otherwise it falls back to estimation (scanning label slots for multiline children).
2. **`getInlineH(nodeId, ns)`** — estimates the height of a multiline data block when slotted inline: `slotCount * 40` pixels. Used as fallback when no DOM measurement exists yet.
3. **Post-render `useEffect`** — after every render, measures `offsetHeight` of all action block DOM elements via `document.getElementById("node-" + n.id)`. If any measurement differs from the stored value by > 5px, it stores the new height in `measuredRef` and triggers `recalcLayout` once. The second layout uses the measured heights, producing pixel-perfect positioning. Subsequent renders find no mismatch and don't re-layout.
4. **Snap logic (`onMU`)** — also calls `getActionH`, so drag-snap targets use the same measured heights.

**When adding new blocks**: no extra work needed — the measurement system handles any block automatically. Just ensure action blocks have `id={"node-"+node.id}` on their root DOM element (already set in `CanvasNode`).

### Shape-Switching Blocks

For blocks that change their slots based on a dropdown (like AoE's shape selector):
- `shapeSlots` maps dropdown values to label format strings with slot tokens
- `suffixLabel` is always appended after the shape-specific slots
- All possible slot keys from all shapes should be listed in `codegen.slotDefaults`
- When the shape changes, only the relevant slots render; others stay in the node data but are hidden
```

### Template Interpolation

| Token | Result |
|---|---|
| `{{key}}` | Resolved slot value or field value |
| `{{quote:key}}` | Value wrapped in Java string quotes with escaping |
| `{{float:key}}` | Value with `f` suffix if not already present |
| `{{attr:key}}` | Attribute registry reference via `attrRegistryRef()` |
| `{{stack}}` | Stack expression for the current method context |
| `{{modName:key}}` | Modifier name sanitized to lowercase `[a-z0-9_]` |
| `{{dcConst:key}}` | Data component constant name `YCS_UPPER_CASE` |
| `{{varGet:_}}` | Full variable getter expression |
| `{{varSet:_}}` | Full variable setter statement |

### Label Format Tokens

The `label` string defines inline rendering. Tokens in `[key:type]` format:

| Token | Renders as |
|---|---|
| `plain text` | Bold white label span |
| `[key:entity]` | Entity slot connector (cyan) |
| `[key:number]` | Number slot connector (blue) |
| `[key:text]` | Text slot connector (green) |
| `[key:logic]` | Logic slot connector (steel blue) |
| `[key:dropdown]` | Simple dropdown from `fields[key].options` |
| `[key:dropdown.effects]` | Search dropdown for mob effects |
| `[key:dropdown.attributes]` | Search dropdown for attributes |
| `[key:dropdown.variables]` | Search dropdown for variables |
| `[key:dropdown.dataComponents]` | Search dropdown for data components |
| `[key:input.number]` | Inline number input |
| `[key:input.text]` | Inline text input |

### Codegen Templates

- `{{slotKey}}` — resolved slot value (calls resolveSlotValue for connected blocks)
- `{{fieldKey}}` — raw field value from node.fields
- Use `\n` for multiline Java output
- `variants` object maps `"field == 'value'"` conditions to alternative templates

### Import Handling

Each block declares its required imports in `codegen.imports`. The existing content-scan system in `ycsSyncImports` also covers imports by detecting patterns in generated code. Both systems work together — declare imports in the block def for clarity, and content-scanning acts as a safety net.

### Adding a Basic Block

Only 1 file needed:

1. Open `src/codegen/visual/blockDefs.js`
2. Add an object to `BLOCK_DEFS` array
3. Set `opcode`, `category`, `sub`, `label` with inline tokens, `color`
4. Set `codegen.expr` (data blocks) or `codegen.template` (action blocks) with `{{key}}` interpolation
5. Set `codegen.imports` for any Java imports the generated code needs
6. Set `codegen.slotDefaults` for slots that should auto-populate when dragged from palette
7. Done — the block auto-appears in the palette, renders, and compiles generically

Example — simple data block:
```js
{
  opcode: "entity.pos_x",
  category: "Numbers", sub: "data",
  linkType: "number",
  label: "Pos X of [entity:entity]",
  color: "#4d65b4",
  codegen: {
    type: "value",
    expr: "({{entity}}.getX())",
    slotDefaults: { entity: { opcode: "entity.event" } },
  },
}
```

Example — action block with dropdown variant:
```js
{
  opcode: "entity.apply_motion",
  category: "Effects", sub: "actions",
  isAction: true,
  label: "Apply Motion to [entity:entity] X [x:number] Y [y:number] Z [z:number] [mode:dropdown]",
  color: "#c46c94",
  fields: {
    mode: { type: "dropdown", options: [{value:"add",label:"Add"},{value:"set",label:"Set"}], default: "add" },
  },
  codegen: {
    type: "action",
    variants: {
      "mode == 'set'": { template: "{{entity}}.setDeltaMovement((double)({{x}}), (double)({{y}}), (double)({{z}}));" },
      "mode == 'add'": { template: "{{entity}}.push((double)({{x}}), (double)({{y}}), (double)({{z}}));" },
    },
    slotDefaults: { entity: { opcode: "entity.event" }, x: { opcode: "number.literal", fields: { value: "0" } }, y: { opcode: "number.literal", fields: { value: "0" } }, z: { opcode: "number.literal", fields: { value: "0" } } },
  },
}
```

### Adding an Advanced Block

For blocks with complex codegen that can't be expressed as a simple template (e.g., context-sensitive expressions, complex Java patterns, dynamic body management):

**Files needed:**

| File | What to add | When needed |
|---|---|---|
| `src/codegen/visual/blockDefs.js` | Block definition object | Always |
| `src/codegen/visual/compiler.js` | Handler in `compileActionNode()` or `resolveSlotValue()` | When codegen can't be a template |
| `src/components/VisualEditor.jsx` | Custom settings UI (e.g., animation mask table) | When settings need custom UI beyond checkboxes/dropdowns |

**Steps:**

1. Add the block definition in `blockDefs.js` with `codegen.handler: "my.opcode"` (or no `expr`/`template` — the generic compiler returns null and falls through)
2. Add a handler in `compiler.js`:
   - For data blocks: add `if (node.opcode === "my.opcode") { ... return expr; }` in `resolveSlotValue()`
   - For action blocks: add `if (node.opcode === "my.opcode") { ... return [lines]; }` in `compileActionNode()`
3. If the block needs custom settings UI (beyond what `GenericSettingsPopup` handles), add the settings popup in `VisualEditor.jsx` with `showSettings && node.opcode === "my.opcode"` — the gear icon is already rendered by `GenericActionContent`/`GenericDataContent`

**The rendering is still generic** even for advanced blocks — the JSON label format drives the block's visual layout. Only the codegen and optionally the settings UI are hardcoded.

### All Files Reference

| File | Path | Purpose |
|---|---|---|
| **blockDefs.js** | `src/codegen/visual/blockDefs.js` | All block definitions — the single source of truth for block schema, labels, fields, settings, codegen, colors, categories |
| **labelParser.js** | `src/codegen/visual/labelParser.js` | `parseLabel()` tokenizer — converts label format strings into renderable segment arrays |
| **blockCompiler.js** | `src/codegen/visual/blockCompiler.js` | Generic compiler — `resolveFromDef()` for data blocks, `compileFromDef()` for action blocks, template interpolation, variant selection |
| **blockRenderer.jsx** | `src/codegen/visual/blockRenderer.jsx` | Generic renderer — `GenericDataContent`, `GenericActionContent`, `GenericSettingsPopup`, `RepeatableSlots`, `Segments` |
| **compiler.js** | `src/codegen/visual/compiler.js` | Hardcoded codegen handlers — `compileActionNode()`, `resolveSlotValue()`, link types, variable/attribute helpers. Entry point checks `blockDefRegistry` first, falls through to hardcoded |
| **VisualEditor.jsx** | `src/components/VisualEditor.jsx` | Block canvas renderer — `CanvasNode`, `SlotConn`, `PortalSelect`, `SettingsPortal`, palette sidebar, drag/drop, C-shape layout. Checks `_useGeneric` flag to choose between generic and hardcoded rendering |
| **palette.js** | `src/codegen/visual/palette.js` | `buildPalette()` — merges block definitions into palette categories. `PALETTE_BLOCKS` is empty; all blocks come from `blockDefs.js` |
| **ycs.js** | `src/codegen/ycs.js` | `ycsSyncImports()` — content-scan import injection. Blocks declare imports in `codegen.imports`; content-scanning acts as safety net |
| **methods.js** | `src/codegen/visual/methods.js` | `ITEM_METHODS` and `EFFECT_METHODS` — method definitions with signatures, stubs, and imports |
| **YCS_BLOCKY.md** | `md/YCS_BLOCKY.md` | This file — complete reference for the block system |

---

## 13. Legacy Block System (Hardcoded)

Some blocks still use hardcoded codegen handlers because their Java output is too complex for templates (AoE shape queries, variable/attribute API calls, data component naming). Their rendering is fully generic — only the codegen falls through to `compiler.js`.

The coexistence strategy:

- `blockDefRegistry.has(opcode)` + no `handler` + has `expr`/`template` → fully generic (JSON-driven)
- `blockDefRegistry.has(opcode)` + has `handler` → generic palette/rendering, hardcoded codegen
- Not in registry → fully hardcoded (legacy)

---

## 14. Backend Code Generation

### Import Injection (`ycsSyncImports`)

Imports live in `//YCS_Import_START` / `//YCS_Import_END`. Rebuilt on every save/toggle from:
1. `YCS_BASE_IMPORTS` — always-on (Item, ItemStack, Level, Player)
2. Each enabled method's `imports` array in `ITEM_METHODS`
3. Each active YCS feature's `imports` array in `YCS_FEATURES`
4. **Content scan** — pattern-matched imports from compiled code
5. **Block definitions** — `codegen.imports` from JSON block defs (via content-scan of generated code)

**Rule:** any function that writes Java to disk must call `ycsSyncImports` before writing.

**Content-scan triggers:**

| Detected pattern | Imports added |
|---|---|
| `instanceof LivingEntity` or `LivingEntity ` | `LivingEntity` |
| `instanceof Entity` or `Entity ` | `Entity` |
| `MobEffectInstance` or `.addEffect(` | `MobEffectInstance`, `MobEffects` |
| `AnimationAPI` or `AnimationCategory` | `AnimationAPI`, `AnimationCategory` |
| `EntityVarCapability` or `EntityVar.` | `EntityVarCapability`, `EntityVar` |
| `AttributeModifier` or `getAttributeValue` or `getAttributeBaseValue` | `Attributes`, `AttributeModifier`, `ResourceLocation` |
| `ModAttributes.` | `ModAttributes` |
| `Component.literal` | `Component` |
| `ModDataComponents.` | `ModDataComponents` |

---

## 15. Variable Blocks — Generic Picker

One generic `Get Variable` (data) and one `Set Variable` (action) — not one per variable. Selection via `VarDropdown` (portal combo like `AttrDropdown`).

On pick: `fields.varName`, `fields.varType`, `fields.varDefault` are updated. `node.linkType` updated via `__linkType` field key.

`__variablesCache` is a module-level array for `VarDropdown`.

---

## 16. Attribute Base Reset Block

`attribute.base.reset` renders `AttrDropdown` + entity slot. Codegen:
```java
if (<ent> instanceof LivingEntity _abrst) {
    var _abrsti = _abrst.getAttribute(<attrRef>);
    if (_abrsti != null) _abrsti.setBaseValue(_abrsti.getAttribute().getDefaultValue());
}
```

---

## 17. Modpack Compatibility

No runtime dependencies, but assume modpack usage. Design for `ResourceLocation`-based lookups (registry IDs) rather than hardcoded `MobEffects.*` / `Attributes.*` constants. Vanilla constants are fine as defaults, never the only path.
