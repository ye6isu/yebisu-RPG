# YCS Blocky Editor — Block Style Guide

## Block Colors

Colors signal category at a glance. All blocks in the same category share one color — never add per-opcode overrides.

| Category | Opcode pattern | Hex | Description |
|---|---|---|---|
| Animation | `anim.*` | `#3a5c3a` | All FP anim blocks (play, stop, pause, resume, handpose) |
| Logic / Control | `logic.*`, `entity.is_crouching`, `control.if` | `#6494a4` | Conditionals and boolean values |
| Effects | `effect.apply` | `#c46c94` | Potion / mob effect blocks |
| Text value | `linkType === "text"` | `#5ba558` | Text literal nodes (label: "Text") |
| Entity value | `linkType === "entity"` | `#30e1b9` | Entity reference nodes |
| Number value | `linkType === "number"` | `#4d65b4` | Number literal and number link nodes |

When adding a new block:
- Add it to an existing `isAnimBlock` / `isLogicBlock` group check in `CanvasNode`, or define a new group constant.
- Also update the **palette sidebar** row background and dot color to match (`LINK_TEXT` → `#182a1e` bg, `#5ba558` dot).
- Also update `const cc=` (connector pip) if introducing a new `linkType`.

## Block Width

Action blocks use `width: "fit-content"` with `minWidth: 50` — they shrink to their content. Never set a large fixed `minWidth` (e.g. 300) as it adds empty right padding on blocks with few slots.

## Palette Sidebar Structure

The sidebar is rendered by `PaletteSidebar`. Each category is **collapsible** (click the header to toggle). Inside each category there are two collapsible **subcategories**:

| Subcategory | Contains | Shape |
|---|---|---|
| **DATA** | Link/value blocks — blocks with a `linkType` that produce a value to plug into a slot | No `isAction` flag |
| **ACTIONS** | Action blocks — blocks that do something in the execution chain | `isAction: true` |

`PALETTE_BLOCKS` entries use `{ category, data: [...], actions: [...] }` — not a flat `blocks` array. When adding a new block, put it in `data` if it has a `linkType`, or `actions` if it has `isAction: true`.

## Adding a New Action Block

1. Define the block in `PALETTE_BLOCKS` under the appropriate category's `actions` array with `isAction: true` and `slotDefs`.
2. Add codegen in `generateLines()`.
3. Add an `is<Name>` boolean and a `{is<Name>&&<>...<SlotConn>...</>}` render section in `CanvasNode` for each slot.
4. Add a label string in the `lblStr` ternary chain.
5. Color is handled automatically by the group check — no extra `bg` entry needed.

## Adding a New Data (Link) Block

1. Define the block in `PALETTE_BLOCKS` under the appropriate category's `data` array with a `linkType` (no `isAction`).
2. Add codegen in `generateLines()` if it computes a value.
3. Dot and row background colors are assigned automatically by `PaletteBlock` based on `linkType`.

## Imports — How They Work and What To Do When a Block Needs One

`ycsSyncImports` runs automatically when a method stub is injected or a YCS feature is toggled. It builds a `Set` of required imports from:
1. `YCS_BASE_IMPORTS` — always present (Item, ItemStack, Level, Player)
2. Each enabled method's `imports` array in `ITEM_METHODS`
3. Each active YCS feature's `imports` array in `YCS_FEATURES`
4. A **content scan** — if the compiled code contains specific patterns (e.g. `AttributeModifier`, `getAttributeValue`), the matching imports are added automatically

**When you add a new block that needs an import:**
- If the import is always needed when that block is used, add a content-scan check inside `ycsSyncImports` after the YCS features loop:
  ```js
  if (code.includes('YourGeneratedPattern')) {
    needed.add('com.example.YourClass');
  }
  ```
- Do **not** add it only to one method's `imports` array — that only covers that specific method, not all methods the block might be used in.
- Do **not** use fully-qualified names in generated code as a workaround for missing imports — it makes the output harder to read. Fix the import instead.

**Current content-scan triggers in `ycsSyncImports`:**

| Detected pattern | Imports added |
|---|---|
| `MobEffectInstance` or `.addEffect(` | `LivingEntity`, `MobEffectInstance`, `MobEffects` |
| `AnimationAPI` or `AnimationCategory` | `AnimationAPI`, `AnimationCategory` |
| `EntityVarCapability` or `EntityVar.` | `EntityVarCapability`, `EntityVar` |
| `AttributeModifier` or `getAttributeValue` or `getAttributeBaseValue` | `Attributes`, `AttributeModifier`, `ResourceLocation` |

When adding a new block, pick a distinctive string it emits and add a new scan entry here and in `ycsSyncImports`.
