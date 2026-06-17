# YCS Blocky Editor — Visual & Interactive Architecture Guide

This is the comprehensive documentation detailing the UI, interaction layers, spacing logic, rendering quirks, and internal logic for the YCS Visual Block Editor (`App.jsx`).

---

## 1. The Visual Canvas (Background & Navigation)
- **Background Dots**: The canvas grid is rendered purely via CSS `radial-gradient(circle, #1a1a1e 1px, transparent 1px)`.
- **Grid Size**: The dots are spaced by `24px`, scaling seamlessly with the camera zoom.
- **Zoom Mechanic**: Using the mouse wheel alters the zoom (between `0.4x` and `2.0x`). It recalculates `pan.x` and `pan.y` during the zoom using the mouse position as the `transformOrigin` anchor, ensuring the screen zooms precisely towards the cursor.
- **Pan Mechanic**: Clicking and dragging the `.canvas-bg` shifts the camera's coordinates.
- **Empty State**: When only the "Start" node exists with no children, a faded watermark displays `</>`, "drag blocks here", and "connect to Start to run".

---

## 2. Block Types & Background Colors
The editor dynamically assigns specific colors to blocks based on their opcode and state:
- **Start Block** (`isSt`): `#1e293b` (Dark Blue)
- **If / Control Flow** (`control.if`): `#6494a4` (Muted Teal)
- **Add Effect** (`effect.apply`): `#c46c94` (Muted Pink)
- **Entity Value Link**: `#30e1b9` (Bright Cyan/Green)
- **Number Value Link**: `#4d65b4` (Blue)
- **Disconnected Action Blocks**: `#4a4a5a` (Dimmed Grey)
- **Default Action Block**: `#5a9a6a` (Green)

---

## 3. Shape Dimensions & Inline Variable Injection

### Action Blocks (Sequential Control Flow)
- **Height**: Base height is `50px`. 
- **Border Radius**: `10px` on all corners.
- **Z-Index Layers**: 
  - Connected action blocks use a `node.depth` variable for stacking.
  - Disconnected action blocks sit slightly above them at `z-index: 50`.
  - Value blocks always float above everything at `z-index: 100`.
- **Visual Warning**: Action blocks that are floating outside the `Start` execution chain have their opacity dropped to `0.6` and receive a red warning badge (`background: #e11d48`) with a `!` inside.

### Value / Link Blocks (Inline Variables & Data)
- **Floating**: Floating value blocks have an auto height, `10px` border radius, and `8px 10px` padding.
- **Inline (Slotted)**: When a value block snaps into an action block's slot, the `CanvasNode` uses an `inline` flag. This collapses its height to `30px`, removes the border radius (`0`), strips the padding, and grants it a subtle 3D pop via `box-shadow: 0 2px 6px rgba(0,0,0,.3)`.
- **Render Delegation**: If the editor detects a value block is bound to a slot (`isSlottedVal = true`), it skips rendering it on the main canvas layer. Instead, it delegates the rendering of that node to the parent block's `SlotConn` component, creating true visual nesting.

---

## 4. The "Puzzle Nub" System & Text Spacing
Value blocks connect to action blocks via a puzzle-piece metaphor. To keep the UI pristine, strict margin mathematics govern how these pieces interlock without overlapping text.

### The Key (On the Value Block)
Floating value blocks project a half-circle on their left edge:
- **Width / Height**: `10px` wide, `20px` high.
- **Position**: Center-left (`top: 50%`, `transform: translateY(-50%)`, `left: -10px`).
- **Radius**: `10px 0 0 10px` (curves out to the left).

### The Lock (On the Target Slot)
Input slots (`SlotConn`) are empty `rgba(0,0,0,0.3)` spaces inside action blocks waiting for a value:
- **Height**: `30px` high, minimum `50px` wide.
- **Text Spacing**: To avoid overlapping with the text label to its left, the slot itself sets `marginLeft: 10px`.
- **The Cutout Hole**: Inside the slot, a darker half-circle nub is overlaid via `position: absolute` with `left: -8px`. 
- **The Magic Math**: Because the slot has a `10px` margin, the `8px` absolute projection of the cutout fits *inside* that margin space. This perfectly creates a `2px` visual gap between the text label and the very tip of the puzzle nub!

---

## 5. Advanced Control Flow (C-Shapes)
The `If` block (`control.if`) simulates a classic programming "C-shape" container dynamically:
- **Header Rows**: The top bar of an `If` block is a standard `50px` header row holding the logic condition slot.
- **Gap Spacers**: A transparent `<div>` is inserted directly below the header. Its height is mathematically bound to `node.gapHeights?.do0`. This physically pushes the rest of the block (or `Else` rows) down, wrapping around the blocks dropped "inside" the gap.
- **Settings Gear (⚙)**: Control blocks feature a gear icon. Clicking it spawns a `z-index: 100` popover at `top: -45px`. This popover modifies the JSON structure to spawn new `Else If` rows (each generating their own `50px` header and `gapHeights.doX` transparent spacer) or toggle an `Else` footer row.

---

## 6. Drag & Drop Architecture & Event Bubbling
- **Sequential Snapping**: When dragging an action block, the mouse calculates distance relative to other block bottoms. If within `60px` (`md = 60`), it snaps to the `nextId` or C-shape gaps.
- **Value Snapping**: Dragging a value uses `document.querySelectorAll('.slot-conn')` to find all available slots on the screen. It checks the bounding client rect of each slot and calculates the hypotenuse distance. If the distance is `< 50px` (`md = 50`) and types match, it snaps!
- **Hover Flags**: While dragging, `onMouseEnter` on a `.slot-conn` writes to a global variable: `window.__hoveredSlot = { nodeId, sk }`.
- **Context Menu Hijacking**: Right-clicking (`e.button === 2`) on any block calls `e.preventDefault()` to stop the browser's context menu, instead spawning the custom `window.__showYcsCtx(node.id, e.clientX, e.clientY)`.

---

## 7. Typography & Form Inputs
- **Font**: Sans-serif, size `16px`, bold (`fontWeight: 700`).
- **Text Inputs (e.g., Numbers)**:
  - Inside a floating block, input backgrounds are `rgba(0,0,0,0.3)`. Inside an inline block, they become `transparent` to avoid doubling the background-darkening effect.
  - The width expands dynamically: `Math.max(50, text.length * 10 + 20)`.
  - Borders are removed entirely, utilizing padding (`5px 10px`) for breathing room.


## 8. Backend Code Generation Quirks

### Uniform "Event Entity" Variable (`eventEntity`)
To keep the generated code uniform and predictable regardless of which method is being compiled, the "Event Entity" link always compiles to the variable name `eventEntity`.
Since different Minecraft override methods provide different native parameter names (e.g., `useOn` gives `context`, `hurtEnemy` gives `attacker`, `continuousUse` gives `livingEntity`), the block compiler's **auto-cleanup** handles the mapping seamlessly:
- It scans the compiled block body for any reference to `eventEntity`.
- If a reference is found, it automatically injects a mapping at the top of the method matching the context. For example:
  - In `useOn`: `Player eventEntity = context.getPlayer();`
  - In `hurtEnemy`: `LivingEntity eventEntity = attacker;`
  - In `continuousUse`: `LivingEntity eventEntity = livingEntity;`
- If the "Event Entity" link is removed or `eventEntity` is no longer referenced, this definition is automatically omitted, keeping the source code perfectly clean.

### Import Injection (`ycsSyncImports`)
Imports are written into a single `//YCS_Import_START` / `//YCS_Import_END` block at the top of the file. `ycsSyncImports` runs on every save and on method enable/disable. It rebuilds the import set from three sources:
1. `YCS_BASE_IMPORTS` — always-on baseline (Item, ItemStack, Level, Player)
2. The `imports` array of every enabled method in `ITEM_METHODS`
3. A **content scan** of the compiled code — if specific generated patterns are present, their required imports are added. This is how blocks that can appear in any method get their imports without duplicating the list across every method entry.

**Symptom when a block's import is missing:** the generated Java file compiles with "cannot find symbol" on the first save after dragging the block in. Fix: add a content-scan check for a distinctive string the block emits (see `BLOCKY_GUIDE.md` → Imports section for the pattern).
