# YCS Blocky Editor — v2 Implementation Guide

---

## 1. Architecture Overview

The v2 block editor lives in a single file: `src/components/BlockEditorPage.jsx`. It exports two components:
- `BlockEditorPage` (default) — the main canvas tile
- `BlockPalettePage` — the palette sidebar tile

Block definitions come from `src/codegen/visual/blockDefs.js` via `BLOCK_DEFS` array and `blockDefRegistry` Map. Label parsing via `src/codegen/visual/labelParser.js` (`parseLabel`, `extractSlotDefs`).

No separate renderer file — all rendering, drag/drop, snapping, settings, and palette are in `BlockEditorPage.jsx`.

---

## 2. Key Constants

```js
const BLOCK_H = 50;         // action block minHeight
const BLOCK_RADIUS = 10;    // border-radius for all blocks
const SNAP_THRESHOLD = 60;  // px distance for chain and body-slot snapping
```

---

## 3. Core Helper Functions

### `evalCondition(cond, fields)`
Evaluates `showIf` expressions on fields and settings. Supports:
- `"fieldName"` — bare field check (truthy)
- `"field == 'value'"` — equality
- `"field != 'value'"` — inequality

### `getBodyKeys(node, bdef)`
Returns all body slot keys for a node. Centralized logic — use this everywhere instead of ad-hoc `bdef.body`/`bdef.bodyConfig` checks.
- `bdef.body` → keys from body object (e.g. `['do0']`)
- `bdef.bodyConfig` → adds `'do0'` if not already present
- `entity.dash` → conditional `do0` (collision) and `do1` (then) based on toggle fields
- `control.if` → dynamic `do1..doN` (else-if) and `doElse` based on `elseIfCount` and `hasElse`

### `isBodyBlock(node, bdef)`
Returns `true` if the node has `body` or `bodyConfig`. Used for chain tracking, slotted ID computation, and rendering decisions.

### `getDynamicAccepts(bdef, node, slotKey)`
Resolves dynamic slot acceptance type for blocks with `dynamicAccepts`. Returns the resolved type string or null.

### `getDescendants(nId, nodes)`
Recursively collects all descendant node IDs (via `nextId` chains and slot connections).

---

## 4. Block Colors

Defined in `BLOCK_COLORS` object. Color is resolved by `getBlockColor(node, bdef, inChain)`:

| Priority | Condition | Color |
|---|---|---|
| 1 | `node.id === 'start'` | `#1e293b` |
| 2 | Disconnected action | `#4a4a5a` (opacity 0.6) |
| 3 | `bdef.color` set | Use it directly |
| 4 | `node.linkType` | entity=`#30e1b9`, number=`#4d65b4`, text=`#5ba558`, logic=`#6494a4`, itemstack=`#945d66` |
| 5 | Fallback | `#5a9a6a` |

**Rule**: data blocks use the color of the **type they return**, not the category. Set `color` in blockDef to match `linkType`.

---

## 5. Block Dimensions

### Action Blocks
- `minHeight: 50px`, `width: fit-content`, `border-radius: 10px`
- Z-index: connected = `node.depth || 1`, disconnected = `50`, value = `100`
- Disconnected: opacity `0.6` + red `!` badge (`#e11d48`)

### Value / Link Blocks
- **Floating**: auto height, `10px` radius, `8px 10px` padding
- **Inline (slotted)**: `minHeight: 30px`, no radius, `0 10px` padding, `box-shadow: 0 2px 6px rgba(0,0,0,.3)`
- Slotted blocks are rendered inline by `SlotConn`, skipped in main canvas render via `slottedIds` Set

### Puzzle Nub
- **Key** (on value block): `10px` wide, `20px` high, left side, `radius: 10px 0 0 10px`
- **Lock** (on slot): `30px` high, `min-width: 50px`, cutout at `left: -8px`, `8px × 16px`

---

## 6. Component Hierarchy

### `CanvasBlock`
Main block renderer. Receives `node, nodes, inChain, selected, onSelect, onBlockMouseDown, onFieldChange, inline, bodyInline`. Four rendering paths:

1. **`inline`** — value block slotted inside a parent's `SlotConn`. Minimal wrapper, 30px height.
2. **`showBody && !bodyInline`** — compound C-shape block (if/delay/dash/forEach). Renders header + body slots + bottom cap. Mouse guard: `if (e.target.closest('[data-bodyslotkey]')) return;` prevents parent drag when clicking inside body.
3. **`bodyInline`** — action block rendered inside a `BodySlot`. No absolute positioning, just flows in DOM.
4. **Standard** — normal action or value block, absolutely positioned.

### `BlockContent`
Renders the label segments + settings gear + repeatable slots. Handles multiline mode. Props: `bdef, node, nodes, onFieldChange, nodeId, onSelect, selected, onBlockMouseDown, settingsGear, inline`.

### `SegmentItem`
Renders a single parsed label segment. Types: `text`, `slot` (→ `SlotConn`), `input`, `dropdown` (→ `PortalDropdown`), `checkbox`. Respects `bdef.transparent` for input backgrounds and `showIf` on field definitions.

### `SlotConn`
Scratch-like value slot connector. If `connId` exists, renders the connected block inline via `CanvasBlock inline`. Otherwise renders the empty slot with cutout nub. Has `.slot-conn` class + `data-nodeid` + `data-sk` for snap detection.

### `BodySlot`
Indented body region for compound blocks. Walks the `slotId → nextId` chain to render all children as `CanvasBlock bodyInline`. Has `data-bodyslotkey` and `data-parentid` attributes for snap detection.

### `PortalDropdown`
Portal-based dropdown that escapes the zoom transform. Dark trigger with `▾`, portaled list at `position: fixed`. Supports `compact` (no arrow) and `transparent` (no dark bg) modes.

### `SettingsPortal`
Portal-based popup for block settings. Renders via `createPortal(document.body)` at `position: fixed`, positioned above the gear icon. `var(--ycs-accent-solid)` background, `var(--ycs-foreground)` border. Closes on outside mousedown. Header with "Settings" label and ✕ close button.

### `BlockSettingsPopup`
Generic settings renderer. Iterates `bdef.settings` entries (skipping `_`-prefixed and `hidden` type). Renders:
- `checkbox` — `ycs-checkbox` class, click toggles value
- `number` — `ycs-input inline` class, min/max
- `dropdown` — `ycs-select inline` class
- `_actions` — button array with increment/decrement/toggle logic. Toggle labels: `cur ? labelOn : labelOff`

### `AnimationSettingsPopup`
Custom bitmask table for animation blocks. Triggered by `ANIM_OPCODES` set:
```js
const ANIM_OPCODES = new Set([
  'anim.firstperson.play',    // FP play: handMask table (2 rows)
  'anim.thirdperson.play',    // TP play: full table (Hand/Yaw/Pitch/Animation/FP View)
  'anim.tppose.set',          // TP pose: full table + Allow Act + Keep Pos columns
  'anim.handpose.set',        // Hand pose: single "Allow Vanilla Actions" checkbox
]);
```

**IMPORTANT**: The opcodes in `ANIM_OPCODES` must exactly match the `opcode` strings in `blockDefs.js`. If they don't match, settings won't show.

---

## 7. Drag & Drop System

### Palette Drag
`onItemMouseDown` creates a ghost div on `mousemove`, fires `ycs-blocky-drop` CustomEvent on `mouseup`. `BlockEditorPage` listens for this event and calls `addBlock()`.

### Canvas Drag
`handleBlockMouseDown` → `setDragging({ id, offX, offY })`. Also auto-detaches the block from any parent `nextId` or `slots`. If the block was slotted inline, computes world position from mouse coords.

`handleCanvasMouseMove` updates the dragged block's position (and all descendants).

### Snap Logic (`handleCanvasMouseUp`)

Three snap types, checked in priority order:

#### 1. Body-slot snapping
Queries all `[data-bodyslotkey]` DOM elements. Uses **edge distance** (0 if mouse is inside the rect, otherwise distance to nearest edge). Threshold: `SNAP_THRESHOLD`. If the slot already has a child chain, snaps to the end of that chain instead.

#### 2. Chain snapping
Loops all action blocks with no `nextId`. Measures distance from mouse to block's bottom edge. Threshold: `SNAP_THRESHOLD`. Snaps the dragged block below the target, repositioning the entire dragged subtree.

#### 3. Value-slot snapping
Queries all `.slot-conn` DOM elements. Distance from mouse to slot center. Threshold: `50px`. Type-matched: `accepts === dragNode.linkType`. Acceptance is resolved from:
- `getDynamicAccepts()` for dynamic slots
- Regex `condition\d+` → `'logic'`
- Regex `col(Radius|Width|Height|Depth)` → `'number'`
- `repeatableSlots` key match → `repeatableSlots.accepts`
- `parseLabel` segments (including `shapeSlots` and `suffixLabel`)

### Chain Relayout (`relayoutChains`)
Called after field changes and after snaps via `requestAnimationFrame`. Walks chains from `start`, measures each block's DOM height via `getBoundingClientRect`, and repositions following blocks to `prevRect.bottom + 4px`. Also walks body-slot sub-chains via `getBodyKeys`.

---

## 8. State Management

All block state is in a single `nodes` array (React state). Each node:
```js
{
  id: 'n...',           // unique ID ('start' for the start node)
  opcode: 'entity.dash',
  x: 100, y: 200,       // world position (for absolutely positioned blocks)
  nextId: 'n...',        // next action in chain, or null
  linkType: 'number',    // for data blocks, null for actions
  isAction: true,
  fields: { ... },       // field values (dropdowns, inputs, hidden state)
  slots: { ... },        // slot connections: { slotKey: childNodeId }
}
```

### Special field keys
- `'__linkType'` — changes `node.linkType` (for dynamic-type blocks)
- `'__clearSlot'` — clears `node.slots[value]` (when type changes invalidate connected blocks)

### Persistence
Saved to `localStorage` under `'ycs-blocky::' + stableId` on every change.

### `slottedIds` (useMemo)
Determines which nodes render inline vs standalone. Walks all nodes' slots. Body-slot children (identified via `getBodyKeys`) are added as chains. Non-body slot children are added directly. Any node in `slottedIds` is skipped in the main canvas render — it's rendered inline by its parent's `SlotConn` or `BodySlot`.

### `chain` / `getChain`
Tracks which blocks are reachable from `start` via `nextId` + body-slot children. Connected blocks render at full opacity; disconnected action blocks at opacity 0.6.

---

## 9. Compound / Body Blocks (C-Shapes)

### How body blocks work
A block is a body block if `bdef.body` or `bdef.bodyConfig` is defined. The `showBody` flag also checks toggle fields — for blocks like `entity.dash`, the body only renders when at least one toggle (`hasCollision`/`hasThen`) is active.

### Rendering structure
```
┌─ Header (minHeight: 50, rounded top corners) ─┐
│  ⚙ [label segments]                           │
├─ Body Wrap (semi-transparent bg, 3px borders) ─┤
│  BodySlot (paddingLeft: 30, minHeight: 36)     │
│    └─ [bodyInline children chain]              │
├─ [Additional sections: Else If / Else / Then] ─┤
│  ... more BodySlots ...                        │
└─ Bottom cap (height: 12, rounded bottom) ──────┘
```

### Dash-specific rendering
When `hasCollision` is toggled on:
- "On Collision" header row with `collisionShape` dropdown (Sphere/Box) and shape-conditional slots:
  - Sphere: `colRadius` slot
  - Box: `colWidth`, `colHeight`, `colDepth` slots
- Body slot `do0` for collision actions

When `hasThen` is toggled on:
- "Then" header row
- Body slot `do1` (if collision active) or `do0` (if collision inactive)

### If-specific rendering
- Primary body slot `do0`
- Dynamic else-if branches: `condition{i+1}` slot + `do{i+1}` body slot, for `i` in `0..elseIfCount-1`
- Optional else branch: `doElse` body slot

### Mouse guard
All compound blocks share the same mouseDown guard:
```js
if (e.target.closest('[data-bodyslotkey]')) return;
```
This prevents dragging the parent when clicking inside a body slot. Children inside body slots handle their own drag via `onBlockMouseDown`.

---

## 10. Block Content Rendering

### Label Parsing
`parseLabel(bdef.label)` produces segments: `text`, `slot`, `input`, `dropdown`, `checkbox`.

### Shape Slots
If `bdef.shapeSlots` exists, additional segments from `bdef.shapeSlots[node.fields?.shape]` are appended after the main label segments. `bdef.suffixLabel` segments are appended after shape slots.

### Repeatable Slots
If `bdef.repeatableSlots` exists, renders `key0`, `key1`, ... `key{count-1}` slots with optional separator between them. Count is from `node.fields[countField]`.

### Multiline Mode
When `node.fields?.multiline || bdef.multiline` is true (and NOT inline), segments are split into lines after each slot connector. Each line gets `minHeight: 30px`. Multiline is **disabled** when a block is rendered inline (slotted inside another block).

### Transparent Mode
When `bdef.transparent` is true, inline inputs and dropdowns use `background: transparent` instead of `rgba(0,0,0,0.3)`. Used for math/comparator blocks.

---

## 11. Settings System

### When the gear icon shows
```js
const isAnimBlock = ANIM_OPCODES.has(node.opcode);
const hasSettings = isAnimBlock || (bdef?.settings && Object.keys(bdef.settings).some(
  k => !k.startsWith('_') ? bdef.settings[k].type !== 'hidden' : k === '_actions'
));
```

The gear shows if: the block is an animation block, OR its settings contain at least one non-hidden field or `_actions`.

### Settings popup dispatch
- Animation blocks → `AnimationSettingsPopup` (custom bitmask table)
- All others → `BlockSettingsPopup` (generic from `bdef.settings`)

### Settings `showIf`
Settings entries support `showIf` expressions evaluated by `evalCondition`. Example: `showIf: "operation != 'base_set'"` hides the field when operation equals base_set.

### Toggle labels in _actions
When `action === 'toggle'`:
- Field is truthy (on) → show `labelOn` (e.g. "− Else")
- Field is falsy (off) → show `labelOff` (e.g. "+ Else")

---

## 12. Palette Structure

`buildPaletteFromDefs()` groups `BLOCK_DEFS` by `category` and `sub`:
- `sub: "actions"` → **ACTIONS** subcategory
- `sub: "data"` or starting with "data" → **DATA** subcategory
- Any other `sub` value → custom named subcategory (e.g. "Third Person Animations")

Each palette entry uses `paletteLabel` if set, otherwise `stripBrackets(label)` to remove `[key:type]` tokens.

---

## 13. Block Definition Schema

All blocks are defined in `blockDefs.js`. The full schema:

```js
{
  opcode: "my.block",           // unique ID — MUST match any hardcoded references
  category: "Effects",          // palette sidebar category
  sub: "actions",               // "data", "actions", or custom subcategory name
  linkType: "number",           // data blocks: "entity"|"number"|"text"|"logic"|"itemstack". null for actions
  isAction: true,               // true for action blocks (sequential chain)
  paletteLabel: "My Block",     // optional — overrides label for palette display
  label: "Do thing to [entity:entity] with [amount:number]",
  hint: "Tooltip text",
  color: "#c46c94",             // block color hex — match linkType for data blocks
  transparent: false,           // inputs/dropdowns use transparent bg (math/comparators)

  fields: {
    mode: {
      type: "dropdown",         // "dropdown" | "input" | "hidden" | "checkbox"
      options: [{value:"a",label:"A"},{value:"b",label:"B"}],
      default: "a",
      compact: false,           // no ▾ arrow on dropdown trigger
      showIf: "other != 'x'",  // conditional visibility
      minWidth: 100,
    },
    count: { type: "hidden", default: 0 },
    particles: { type: "checkbox", default: true },
  },

  settings: {
    los: { type: "checkbox", label: "Line of Sight", default: true, showIf: "..." },
    losOrigin: { type: "dropdown", label: "Origin", options: [...], default: "caller" },
    _actions: [
      { label: "+ Item", onClick: { field: "count", action: "increment", max: 10 } },
      { label: "− Item", onClick: { field: "count", action: "decrement", min: 0 } },
      { label: "+ Toggle", labelOn: "− Toggle", labelOff: "+ Toggle",
        onClick: { field: "flag", action: "toggle" } },
    ],
  },

  codegen: {
    type: "value",              // "value" | "action" | "compound"
    expr: "({{entity}}.getX())",
    template: "...",
    methodVariants: { "useOn": "context.getPlayer()", "*": "player" },
    variants: { "mode == 'set'": { template: "..." } },
    compoundTemplate: { before: "...", after: "..." },
    imports: ["net.minecraft.world.entity.LivingEntity"],
    conditionalImports: { "effect contains 'ModEffects.'": ["..."] },
    slotDefaults: { entity: { opcode: "entity.event" } },
    handler: "control.if",      // falls through to hardcoded compiler
  },

  dynamicLinkType: { field: "varType", map: { bool: "logic", string: "text", "*": "number" } },
  dynamicAccepts: {
    value: { field: "varType", map: { bool: "logic", string: "text", "*": "number" } },
  },

  repeatableSlots: {
    key: "text", accepts: "text", countField: "textCount",
    default: 1, min: 1, max: 10, separator: "+",
  },

  body: { do0: { label: null } },
  bodyConfig: { type: "if" },

  multiline: false,
  shapeSlots: {
    sphere: "radius [radius:number]",
    box: "width [width:number] height [height:number] depth [depth:number]",
  },
  suffixLabel: "offset x [offX:number] y [offY:number] z [offZ:number]",
}
```

### Label Format Tokens

| Token | Renders as |
|---|---|
| `plain text` | Bold white label span (14px) |
| `[key:entity]` | Entity slot connector |
| `[key:number]` | Number slot connector |
| `[key:text]` | Text slot connector |
| `[key:logic]` | Logic slot connector |
| `[key:dropdown]` | Dropdown from `fields[key].options` |
| `[key:dropdown.effects]` | Search dropdown for mob effects |
| `[key:dropdown.attributes]` | Search dropdown for attributes |
| `[key:dropdown.variables]` | Search dropdown for variables |
| `[key:dropdown.dataComponents]` | Search dropdown for data components |
| `[key:input.number]` | Inline number input |
| `[key:input.text]` | Inline text input |
| `[key:checkbox]` | Inline checkbox toggle |

### Template Interpolation

| Token | Result |
|---|---|
| `{{key}}` | Resolved slot value or field value |
| `{{quote:key}}` | Java string quotes with escaping |
| `{{float:key}}` | Value with `f` suffix |
| `{{attr:key}}` | Attribute registry reference |
| `{{stack}}` | Stack expression for method context |
| `{{modName:key}}` | Sanitized to `[a-z0-9_]` |
| `{{dcConst:key}}` | `YCS_UPPER_CASE` constant name |
| `{{varGet:_}}` | Variable getter expression |
| `{{varSet:_}}` | Variable setter statement |

---

## 14. Adding a New Block

### Simple block (1 file)

1. Open `src/codegen/visual/blockDefs.js`
2. Add object to `BLOCK_DEFS` array with `opcode`, `category`, `sub`, `label`, `color`
3. Set `codegen.expr` (data) or `codegen.template` (action)
4. Set `codegen.imports` and `codegen.slotDefaults`
5. Done — auto-appears in palette, renders, and compiles

### Block with settings

Add `settings` object to the block definition. The `BlockSettingsPopup` renders it automatically. For `_actions` with toggle behavior, add corresponding `type: "hidden"` fields.

### Block with body (compound / C-shape)

Add `body: { do0: { label: null } }` for a simple body. The rendering, body-slot snapping, and chain tracking are all automatic via `getBodyKeys` and `isBodyBlock`.

For complex body behavior (like if/dash), add `bodyConfig` or toggle-conditional body display. The compound rendering in `CanvasBlock` handles if and dash as special cases.

### Block with custom settings UI

If `BlockSettingsPopup` isn't enough (e.g. animation bitmask tables):
1. Add the opcode to the relevant opcode set (e.g. `ANIM_OPCODES`)
2. Add rendering logic in the custom popup component
3. The `CanvasBlock` dispatches to the custom popup when the opcode matches

**Critical**: opcode strings in the Set must **exactly match** the `opcode` field in `blockDefs.js`.

### Block with shape slots

Add `shapeSlots` mapping dropdown values to label strings with slot tokens. Add `suffixLabel` for always-visible suffix. All possible slot keys should be in `codegen.slotDefaults`.

### Block with repeatable slots

Add `repeatableSlots` config. Add `_actions` in settings for increment/decrement buttons. The decrement action auto-clears removed slots.

---

## 15. Codegen

### Strategy

- `blockDefRegistry.has(opcode)` + has `expr`/`template` → fully generic (JSON-driven)
- `blockDefRegistry.has(opcode)` + has `handler` → generic rendering, hardcoded codegen
- Not in registry → fully hardcoded (legacy)

### Import injection (`ycsSyncImports`)

Rebuilds `//YCS_Import_START` / `//YCS_Import_END` from:
1. `YCS_BASE_IMPORTS`
2. Method-specific imports
3. Feature imports
4. Content-scan pattern matching
5. Block definition `codegen.imports`

---

## 16. All Files Reference

| File | Path | Purpose |
|---|---|---|
| **BlockEditorPage.jsx** | `src/components/BlockEditorPage.jsx` | All rendering, drag/drop, snapping, settings, palette |
| **blockDefs.js** | `src/codegen/visual/blockDefs.js` | All block definitions — single source of truth |
| **labelParser.js** | `src/codegen/visual/labelParser.js` | `parseLabel()` tokenizer |
| **MethodEditorPage.jsx** | `src/components/MethodEditorPage.jsx` | Method enable/disable, gating, opens Block Editor tiles |
| **YCS_BLOCKY.md** | `md/YCS_BLOCKY.md` | This file |

> **Not yet ported to v2:** `blockCompiler.js`, `compiler.js`, `ycs.js`, `methods.js` — these exist in old v1 (`tools/Yebisu Creator Studio/src/codegen/`) but have no v2 equivalents yet. Codegen will be wired up as part of the injection/manifest system.

---

## 17. Common Pitfalls

1. **Opcode mismatch**: If `ANIM_OPCODES` or any hardcoded check uses a different string than the `opcode` in `blockDefs.js`, the feature silently fails. Always verify exact opcode strings.

2. **Body blocks need both `body`/`bodyConfig` AND proper `getBodyKeys` coverage**: If a new body block type is added, `getBodyKeys` must return its slot keys. Currently handles: `bdef.body` keys, `bdef.bodyConfig` → `do0`, `entity.dash` conditional keys, `control.if` dynamic else-if/else keys.

3. **Snap distance for body slots uses edge distance, not center distance**: A body slot 300px tall would fail center-distance checks. The edge-distance algorithm returns 0 when the mouse is inside the rect.

4. **`relayoutChains` must be called after snaps**: Body slot content changes the compound block's height, which shifts blocks chained below it. The `relayoutChains` function walks from `start` and also enters body-slot sub-chains via `getBodyKeys`.

5. **Multiline disabled when inline**: `isMultiline = !inline && (node.fields?.multiline || bdef?.multiline)`. This prevents inline data blocks from expanding their parent's height unpredictably.

6. **Toggle labels**: `cur ? labelOn : labelOff`. When the toggle is active (on), show `labelOn` (usually "− Remove"). When inactive (off), show `labelOff` (usually "+ Add").

7. **`showIf` on settings uses `evalCondition`**, not just boolean field check. This supports expressions like `"operation != 'base_set'"`.
