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
| Disconnected | — | `#4a4a5a` | Dimmed Grey, opacity `0.6`, red warning badge |

When adding a new block:
- Add it to an existing `isAnimBlock` / `isLogicBlock` group check in `CanvasNode`, or define a new group constant.
- Also update the **palette sidebar** row background and dot color to match (`LINK_TEXT` → `#182a1e` bg, `#5ba558` dot).
- Also update `const cc=` (connector pip) if introducing a new `linkType`.

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
- **Settings Gear (⚙)**: Spawns `z-index: 100` popover at `top: -45px` for adding `Else If` / `Else` rows.

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

## 12. Adding a New Action Block

1. Define in `PALETTE_BLOCKS` → category's `actions` array with `isAction: true` and `slotDefs`.
2. Add codegen in `generateLines()`.
3. Add `is<Name>` boolean + render section with `<SlotConn>` in `CanvasNode`.
4. Add label in `lblStr` ternary chain.
5. Color handled automatically by group check.

## 13. Adding a New Data (Link) Block

1. Define in `PALETTE_BLOCKS` → category's `data` array with `linkType` (no `isAction`).
2. Add codegen in `generateLines()`.
3. Dot/row colors assigned automatically by `PaletteBlock`.

---

## 14. Backend Code Generation

### Uniform "Event Entity" Variable (`eventEntity`)
The "Event Entity" link always compiles to `eventEntity`. The compiler's auto-cleanup injects a mapping at the method top:
- `useOn`: `Player eventEntity = context.getPlayer();`
- `hurtEnemy`: `LivingEntity eventEntity = attacker;`
- `continuousUse`: `LivingEntity eventEntity = livingEntity;`

If `eventEntity` is not referenced, the definition is omitted.

### Import Injection (`ycsSyncImports`)

Imports live in `//YCS_Import_START` / `//YCS_Import_END`. Rebuilt on every save/toggle from:
1. `YCS_BASE_IMPORTS` — always-on (Item, ItemStack, Level, Player)
2. Each enabled method's `imports` array in `ITEM_METHODS`
3. Each active YCS feature's `imports` array in `YCS_FEATURES`
4. **Content scan** — pattern-matched imports from compiled code

**When adding a new block that needs an import:** add a content-scan check in `ycsSyncImports`:
```js
if (code.includes('YourGeneratedPattern')) {
  needed.add('com.example.YourClass');
}
```
Do **not** add it to one method's `imports` array only. Do **not** use FQNs in generated code.

**Rule:** any function that writes Java to disk must call `ycsSyncImports` before writing.

**Current content-scan triggers:**

| Detected pattern | Imports added |
|---|---|
| `instanceof LivingEntity` or `LivingEntity ` | `LivingEntity` |
| `instanceof Entity` or `Entity ` | `Entity` |
| `MobEffectInstance` or `.addEffect(` | `MobEffectInstance`, `MobEffects` |
| `AnimationAPI` or `AnimationCategory` | `AnimationAPI`, `AnimationCategory` |
| `EntityVarCapability` or `EntityVar.` | `EntityVarCapability`, `EntityVar` |
| `AttributeModifier` or `getAttributeValue` or `getAttributeBaseValue` | `Attributes`, `AttributeModifier`, `ResourceLocation` |
| `ModAttributes.` | `ModAttributes` |

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
