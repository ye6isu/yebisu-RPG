# YCS Blocky Editor — Block Style Guide

## Block Colors

Colors signal category at a glance. All blocks in the same category share one color — never add per-opcode overrides.

| Category | Opcode pattern | Hex | Description |
|---|---|---|---|
| Animation | `anim.*` | `#3a5c3a` | All FP anim blocks (play, stop, pause, resume, handpose) |
| Logic / Control | `logic.*`, `entity.is_crouching`, `control.if` | `#6494a4` | Conditionals and boolean values |
| Effects | `effect.apply` | `#c46c94` | Potion / mob effect blocks |
| Text value | `linkType === "text"` | `#5ba558` | Text literal and text link nodes |
| Entity value | `linkType === "entity"` | `#30e1b9` | Entity reference nodes |
| Number value | `linkType === "number"` | `#4d65b4` | Number literal and number link nodes |

When adding a new block:
- Add it to an existing `isAnimBlock` / `isLogicBlock` group check in `CanvasNode`, or define a new group constant.
- Also update the **palette sidebar** row background and dot color to match (`LINK_TEXT` → `#182a1e` bg, `#5ba558` dot).
- Also update `const cc=` (connector pip) if introducing a new `linkType`.

## Block Width

Action blocks use `width: "fit-content"` with `minWidth: 50` — they shrink to their content. Never set a large fixed `minWidth` (e.g. 300) as it adds empty right padding on blocks with few slots.

## Adding a New Action Block

1. Define the block in `PALETTE_BLOCKS` with `isAction: true` and `slotDefs`.
2. Add codegen in `generateLines()`.
3. Add an `is<Name>` boolean and a `{is<Name>&&<>...<SlotConn>...</>}` render section in `CanvasNode` for each slot.
4. Add a label string in the `lblStr` ternary chain.
5. Color is handled automatically by the group check — no extra `bg` entry needed.
