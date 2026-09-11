# YCS4 Node Editor

## Purpose

The node editor authors method-specific gameplay behavior inside an Item editor tab. It is currently a UI and interaction prototype. The durable architectural direction and production requirements remain in `md/skills/YCS4_NODE_EDITOR_DIRECTION.md`.

## Entry and save boundaries

- Item > Custom Class lists the methods enabled for that Item.
- A method's Edit button replaces the Item form in the same tab with the node workspace.
- Cancel discards the open method draft and returns to the Item editor.
- Save persists only that method's graph and returns to the Item editor.
- Saving an Item does not implicitly save an open or discarded method draft.
- Prototype method graphs are stored separately in local storage under the Item identifier and method key.

## Workspace controls

- `Ctrl+Space` opens node search at the current canvas position.
- Dragging a compatible connection and pressing `Ctrl+Space` opens contextual node search while retaining the preview wire.
- The search uses the shared dialogue window texture, with its search field in the titlebar and exactly five persistent result rows. Scrolling replaces the definitions shown in those rows instead of adding or moving row elements.
- Dragging empty canvas creates a marquee selection.
- Dragging one selected node moves the complete node selection.
- `Delete` removes selected movable nodes or a selected connection. Removing a node also removes its connections.
- Right-clicking a connection or one of its endpoint pins disconnects it.
- Holding Space and left-dragging anywhere in the canvas pans the graph, including when the pointer starts over a node, pin, or field.
- The mouse wheel zooms around the pointer position through 50%, 100%, 150%, 200%, and 250% steps. Screen translation is snapped to physical pixels.

Home and Assets also support drag-marquee selection, using scale-aware workspace coordinates.

## Nodes

### Execute start

- Every method graph has one fixed start node.
- It cannot be selected for movement or deleted.
- It exposes only a `Then` execution output.
- A gameplay node is considered active only when reachable from this start through execution-flow connections.

### Test Node

- Temporary general-purpose prototype node.
- Exposes `Execute` and `Then` flow pins.
- Exposes numeric Input and Output data pins.
- Its numeric input may be hardcoded while disconnected and is disabled when connected.

### Migrated Boolean node

- True and False are represented by one compact Boolean node with mutually exclusive True/False buttons and one Boolean output.
- The selected value retains the corresponding YCS3 `logic.true` or `logic.false` opcode.
- Number and String literals remain inline input textboxes rather than separate nodes. Obsolete prototype Number and Text literal nodes are removed when a graph is opened.

### Migrated Entity nodes

- Event Entity, Target Entity, and Iterator Entity are represented by one compact Entity node with a type dropdown and one Entity output. The selection retains its corresponding YCS3 opcode.
- `entity.position` accepts one Entity input and exposes separate Number outputs for X, Y, and Z.
- `entity.look_dir` follows the same Entity-input and X/Y/Z Number-output shape.
- `entity.is_crouching`, `entity.get_health`, and `entity.is_dashing` are migrated unary Entity queries.
- `entity.part_hit_name` and `entity.part_hit_damage` are migrated compact method-context values.
- Contextual search filters these nodes by the concrete data type of the dragged connection.

`logic.not` is also migrated as a Boolean input-to-Boolean return node.

## Connections

- Execution and data connections are stored separately by connection type.
- Matching directions are `Then -> Execute` and `Output -> Input`.
- Each input accepts one connection. Reconnecting replaces its previous incoming connection.
- Each execution output accepts one outgoing activation connection.
- Data outputs may feed multiple compatible inputs.
- Dragging an already-connected input reroutes that incoming connection.
- Pins and wires are selectable. Wires use a wider invisible pointer target than their visible pixel line.
- Pressing `Ctrl+Space` with a wire selected and choosing a compatible node inserts that node between the existing endpoints.

## Typed-node behavior

### Data connection types and colors

YCS4 supports four typed data connections. The node catalog and graph UI preserve the YCS3 Blocky colors:

| YCS4 type | YCS3 type | Color |
| --- | --- | --- |
| Number | `number` | `#4d65b4` |
| String | `text` | `#5ba558` |
| Boolean | `logic` | `#6494a4` |
| Entity | `entity` | `#30e1b9` |

Pins and wires use their data-type color. Execution flow remains visually distinct from every data type. Connections are valid only between matching types and compatible directions. Existing untyped prototype data connections are interpreted as Number connections.

### Connected and hardcoded inputs

- Number and String inputs show their normal shared textbox while disconnected.
- Connecting a compatible output hides that input's textbox rather than merely disabling it.
- Disconnecting restores the textbox and its previous hardcoded value.
- The same connected-versus-hardcoded rule should be extended to other inline value controls where a meaningful literal editor exists.
- A node stores the hardcoded value independently from the connection so reconnecting does not destroy author input.

### Content-sized node width

Node width is determined by body content instead of a global fixed width. For every body row, measure the complete left group and right group, including labels, pins, controls, and gaps. The node uses the widest required row.

The space between the left and right groups is one standard textbox width. A representative row is:

```text
[Input pin + label] [textbox] [one textbox-width separation] [Output label + pin]
```

The textbox itself is included in the left or right group's measured width; the separation is additional. Long labels or compound controls may therefore widen the node. Title text may also establish the minimum width when it is longer than every body row.

### Conditional node

The If node is a compound flow node adapted from YCS3 `control.if`:

- Its left side begins with the Execute input and the initial Boolean condition input.
- The initial left-side input is `Condition 1`. Optional inputs are `Condition 2`, `Condition 3`, and so on, paired with right-side outputs `If`, `If Else 2`, `If Else 3`, and so on.
- Dialog-style `-` and `+` controls sit at the right of the title bar. Plus appends a condition; minus removes the last optional condition and its connections. The initial condition cannot be removed.
- The unconditional Then output shares the Execute row. Else remains below all condition branches.
- Adding or removing conditions updates branch labels and output identity without silently reconnecting a branch to a different condition.
- The graph representation should store an ordered condition array rather than making the rendered row index the durable identity.

The YCS3 implementation represented this with `elseIfCount`, `hasElse`, body keys such as `do0`, `do1`, and `doElse`, and the `control.if` compound compiler handler. YCS4 should preserve the behavior while using stable branch IDs in its graph schema.

### YCS3 Blocky migration scope

All YCS3 definitions in `old_mod/tools/V3 YCS/src/codegen/visual/blockDefs.js` are the source inventory for the initial YCS4 node catalog. Migration means adapting their opcodes, fields, slots, dynamic link types, defaults, compound bodies, and code-generation metadata into the YCS4 graph schema. It does not mean copying the old Blocky visual renderer.

Each migrated definition must declare:

- Stable node type and legacy opcode mapping
- Search category and display label
- Execution inputs and outputs
- Typed data inputs and outputs
- Inline hardcoded controls and defaults
- Dynamic type rules where applicable
- Compound branch/body behavior
- Compiler handler or expression metadata
- Execution domain and dedicated-server validity

Migration should be incremental and validated against representative saved YCS3 graphs before the old renderer is retired.

The YCS3 inventory currently contains 85 definitions. Straightforward single-row value and action nodes are not blocked by product questions; they require the YCS4 renderer to support named multiple pins, multiple inline controls, and execution pins from catalog data. The remaining structural groups are:

The active prototype catalog now includes Apply Effect, Set Health, Apply Motion, Fire Projectile, Dash, Deal Damage, and a visual If node. These action nodes preserve their YCS3 opcode, typed input identities, inline numeric defaults, and ordinary execution flow. Advanced selector/compound settings retain their YCS3 defaults but are not exposed by the prototype renderer yet. Prototype Test, Hit Part Name, and Hit Part Damage were removed; HUD Return Number/Bool/Text nodes are intentionally deferred. Search results are alphabetized by display label.

- The If prototype starts with one Boolean condition, provides an Add button below the last condition, exposes one execution output per condition (`If`, `If Else`, then numbered `If Else` outputs), and keeps `Else` at the bottom. Its visual branch structure is persisted in the method-editor draft, but compiler semantics remain pending. Other compound behavior (`control.delay`, `aoe.each`, and dash collision/continuation bodies) still needs stable branch/body pin identities and execution storage.
- Dynamic data components, entity variables, resources, attributes, animation assets, item stacks, overlays, and VFX need project-backed dropdown providers and dynamic output-type resolution.
- Context values such as Event Entity, Target Entity, Iterator Entity, hit-part values, and item-stack sources need method-context availability validation; their basic node shapes can still be migrated before compilation.
- Client-only animation/look-direction/VFX operations and gameplay/server actions need explicit execution-domain metadata and validation before generated behavior is considered production-ready.
- Compiler templates and method variants can be carried from YCS3, but YCS4 still needs its graph compiler and diagnostics boundary before those nodes execute.

## Visual structure

- `YCS4/assets/sprite/node.png` contains separate 16x16 title and body source frames.
- Sprite preparation emits `node_title.png` and `node_body.png` at the shared 2x baseline.
- Both node regions preserve two source pixels on each structural edge.
- Title color uses a multiply overlay while preserving one source pixel on the top, left, and right and no bottom inset.
- The title height and text treatment reuse the shared dialogue titlebar measurements.
- Body rows reuse the shared dialogue line height and control sizing.
- Selection highlighting sizes itself to the node's rendered content rather than a fixed node height.

## Current graph data

The prototype method state contains:

```json
{
  "version": 1,
  "method": "use",
  "content": {
    "nodes": [],
    "connections": []
  }
}
```

Node records currently carry an ID, catalog kind, legacy opcode, graph position, title color, and optional hardcoded value. Data connection records additionally carry their concrete data type.

This shape is provisional. Production graph schema, pin identities, node definitions, validation, compiler integration, migrations, and execution-domain metadata still need to be specified.

## Implementation location

- Interaction and prototype state: `YCS4/src/item-editor.js`
- Migrated node definitions and YCS3 type colors: `YCS4/src/node-catalog.js`
- Shared node and search styling: `YCS4/src/styles.css`
- Sprite slicing: `YCS4/slice-button.mjs`
- Source texture: `YCS4/assets/sprite/node.png`

## Design details to define next

Use this section to integrate the forthcoming complete behavior description. Replace provisional prototype decisions where necessary instead of keeping parallel or historical rules.

- Production node catalog and categories
- Pin types, shapes, colors, labels, multiplicity, and compatibility
- Search ranking, filtering, context, and keyboard navigation
- Selection, movement, duplication, clipboard, alignment, and organization
- Canvas navigation, bounds, zoom levels, minimap, and coordinate persistence
- Connection creation, rerouting, insertion, deletion, and invalid-drop behavior
- Node field controls and connected-versus-hardcoded value behavior
- Execution roots, branching, sequencing, cycles, and validation
- Method graph persistence and Item/project save boundaries
- Graph IR, compiler output, diagnostics, and schema migration
- Client, server, shared, and synchronized execution domains
