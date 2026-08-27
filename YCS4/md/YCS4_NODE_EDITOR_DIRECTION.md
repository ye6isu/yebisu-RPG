# YCS4 Gameplay Editor Direction

## Status

This document records the proposed direction for YCS as a standalone NeoForge mod-creation tool. It is an architectural direction, not a claim that the node editor has already been implemented.

YCS currently targets NeoForge for Minecraft 1.21.1. Supporting additional Minecraft versions or loaders is deferred because mappings, registration APIs, lifecycle hooks, generated Java, and injection targets can change independently between targets. Saved projects should nevertheless declare their schema and target explicitly so future generators can be introduced without making the visual graph itself version-dependent.

```json
{
  "ycsSchema": 1,
  "platform": "neoforge",
  "minecraftVersion": "1.21.1"
}
```

## Recommendation

YCS should evolve gameplay authoring from the YCS3 Blocky presentation into a typed, Blueprint-style node graph. It should not replace every editor with nodes.

Use the editor appropriate to the authored content:

- Forms and inspectors for declarative objects such as Items, Blocks, Entities, textures, attributes, and configuration.
- Node graphs for gameplay behavior, events, conditions, abilities, entity logic, and reusable functions.
- Timelines and curves for animation, VFX, and other time-based content.
- Hierarchies, inspectors, and live previews for HUDs, models, and composed visual objects.

This makes YCS a multi-editor creation environment rather than forcing asset data, behavior, animation, and composition into one interaction model.

## Why the Existing Architecture Can Evolve

YCS3 Blocky is already graph-shaped internally. A saved node has a stable ID, opcode, fields, canvas position, action-chain connection (`nextId`), and typed value slots. The compiler already separates action statements from typed expressions and resolves types such as number, logic, text, entity, iterator, and item stack.

The first node-editor milestone should therefore replace the visual interaction layer without simultaneously rewriting injection or Java generation. Existing concepts map directly:

| YCS3 Blocky concept | Node-editor concept |
| --- | --- |
| `opcode` | Node type |
| `fields` | Inline node controls/properties |
| `nextId` | Execution output connection |
| `slots` | Typed data input connections |
| `linkType` | Pin type |
| Start/event block | Event/root node |
| Block category/subcategory | Search and palette grouping |

The compiler must consume a UI-independent, versioned graph representation. The canvas renderer must not become the source of code-generation behavior.

```text
Visual editor
    -> versioned YCS graph/IR
    -> NeoForge 1.21.1 compiler
    -> Java/resources
    -> injection manifest
```

During migration, the old Blocky renderer and the new node renderer may both target the same intermediate representation. Existing graphs can be migrated by translating `nextId` into execution edges and slot references into typed data edges.

## Gameplay Graph Model

Gameplay nodes need explicit execution flow, similar to Unreal Blueprint, rather than using the unrestricted dataflow model of a shader editor.

```text
[On Item Use] -> [Check Cooldown] -> [Branch]
                                        | true  -> [Apply Motion] -> [Set Cooldown]
                                        | false -> [End]
```

Values travel through typed data pins independently of execution flow:

```text
[Event Entity] -----------------> Entity input
[Get Attribute: Movement Speed] -> Number input
[Multiply] ---------------------> Number input
```

Execution connections and data connections must be visibly distinct. Incompatible pin types should be rejected while dragging, not deferred until Java compilation.

## Required Usability Features

A node editor becomes harder to read than Blocky if unrestricted wiring is allowed without organization tools. The first production-ready version should include:

- Typed pin colors and connection compatibility checks.
- Visually distinct execution and data wires.
- Search-to-add, including contextual search after dragging from a pin.
- Reroute nodes.
- Frames, comments, and named graph regions.
- Collapsible nodes and reusable subgraphs/functions.
- Multi-select, duplication, alignment, and automatic layout for a selection.
- Stable node IDs that survive rearrangement and schema migration.
- Compile and validation errors attached directly to the responsible node or connection.
- Prevention or explicit modeling of execution cycles.
- Graph-level copy/paste that remaps internal IDs without breaking external references.

## Execution Domains and Dedicated Servers

YCS is used for real dedicated servers, so execution authority must be part of the graph type system rather than a compiler footnote. Nodes should declare one of these domains:

- **Server:** authoritative gameplay, world mutation, damage, inventory, entity state, and persistent state.
- **Client:** local rendering, UI, sound presentation, and other purely cosmetic work.
- **Shared/Pure:** deterministic calculations that do not access side-specific state.
- **Synchronized:** operations whose dynamic existence or state requires explicit server authority and network synchronization.

The editor must diagnose invalid flows, such as client-only state feeding server-authoritative gameplay. Cosmetic state that rides on vanilla-synchronized entity, stack, or block state should say so. Dynamic per-instance state must generate or call an explicit authority-and-sync mechanism, including login and start-tracking synchronization where the feature can remain active long enough for late observers.

## Compiler and Injector Boundary

The graph describes behavior; it does not directly edit Java files. Compilation should produce a structured result containing generated source fragments, imports, resources, diagnostics, and ownership metadata. The existing injection lifecycle remains authoritative for applying and reversing those outputs.

Every generated artifact must continue to be recorded in the owning object's `_injections` manifest. Node rearrangement alone must not change generated behavior, and deleting or renaming a graph-owning object must clean its generated outputs through the normal reverse lifecycle.

Platform-specific knowledge belongs below the graph IR. For now, the only backend is NeoForge 1.21.1. A future version backend should translate the same supported IR where possible and emit a clear unsupported-node diagnostic where it cannot.

## Suggested Migration Order

1. Define and version the UI-independent graph schema/IR.
2. Add schema validation and migration for existing YCS3 Blocky graphs.
3. Adapt the current compiler to consume normalized IR without changing generated behavior.
4. Prototype a node canvas using a small vertical slice: one event, one branch, action nodes, and typed value nodes.
5. Add execution-domain metadata and validation before expanding the palette.
6. Add organization and navigation features before large graphs become normal.
7. Migrate existing block definitions incrementally, keeping opcode and code-generation compatibility where practical.
8. Retire the old Blocky renderer only after representative Item, Entity, HUD, Keybind, Ability, and VFX graphs round-trip and compile equivalently.

## Decision Summary

YCS should adopt nodes for visual gameplay programming while retaining specialized editors for other content. The change should be an evolution of the existing typed graph and compiler architecture, not a simultaneous UI, compiler, and injector rewrite. NeoForge 1.21.1 remains the only supported generation target until the backend boundary is stable enough to justify another version or loader.
