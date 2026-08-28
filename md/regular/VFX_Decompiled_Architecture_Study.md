# YCS4 VFX Architecture Study

This document records the external VFX architecture findings that remain useful for YCS4 and defines how a future V4 VFX Creator fits the current object-container, folder, persistence, injection, and dedicated-server model. It is a design boundary, not a claim that VFX has been ported to YCS4.

## Current YCS4 status

YCS4 currently has no VFX editor, VFX domain object, node-graph playback integration, runtime definition generator, or VFX renderer. The V3 implementation and documentation are archived under `old_mod/tools/V3 YCS/` and `old_mod/tools/old md/V3/`.

The current V4 foundations relevant to a future port are:

- complete saved objects under `ycs-data/<category>/<id>.json`;
- reversible `_injections` ownership for generated Java and resources;
- visual workspace containers that reference saved IDs without owning their data;
- recursive, cycle-safe folders stored as visual `localStorage` layout;
- dedicated page modules rather than page-specific logic in the application shell;
- a proposed typed gameplay-node graph described in `md/skills/YCS4_NODE_EDITOR_DIRECTION.md`.

## Reference set

| Reference | Version | Location | Useful boundary |
| --- | ---: | --- | --- |
| Photon | 2.2.0 | `Decompiled/VFX/Photon/` | Hierarchical effect authoring, timeline, typed objects, reloadable definitions |
| Veil/Quasar | 4.3.0 | `Decompiled/VFX/Veil/` | Registry-backed emitters, shapes, particle modules, budgets, client runtime ownership |
| ProjectJJK | 1.2.0 | `Decompiled/ProjectJJK/` | Production synchronization patterns, textured planes, following effects, animated models |
| YCS V3 | archived | `old_mod/tools/V3 YCS/` | Existing dependency-free plane milestone, Blocky playback, injection paths, server start/remove authority |

Photon depends on LDLib2 and KilaGraph. Veil is a broad rendering framework rather than only a particle library. ProjectJJK bundles GeckoLib, Satin, Specter, and Fabric APIs. None may become a Yebisu RPG runtime dependency; reuse architecture concepts only.

Decompiler output is evidence, not authoritative source. Inspect callers, codecs, metadata, and resources before relying on suspicious or incomplete bodies.

## Durable findings

### Authoring model

Photon's hierarchy, inspector, preview, and timeline are the strongest editor reference. Its typed objects and stable IDs allow tracks and runtime bindings to survive reordering. YCS4 should retain those concepts while using inspectable JSON rather than compressed NBT.

Recommended authoring boundaries:

- one complete VFX JSON per effect;
- stable IDs for every object, emitter, track, and key;
- typed objects in one composition hierarchy;
- immutable saved definitions separated from mutable preview/runtime instances;
- schema version and explicit migration from the first V4 format;
- shared textures referenced by ID from `ycs-data/textures/`.

### Runtime model

Photon and Quasar both separate definitions from instances. A suitable native runtime would have:

```text
definition cache
  -> effect instance
    -> typed object/emitter instances
      -> particles or render primitives
```

Client resource reload should parse generated definitions into a replacement immutable cache. Runtime managers should own mutable instances, enforce global/per-effect/per-emitter budgets, and discard them when the client level changes.

### Rendering scope

The first V4 port should restore a narrow dependency-free renderer before adding a framework-sized feature set. A sensible order is:

1. textured plane objects;
2. transform and opacity tracks;
3. fixed and entity-follow anchors;
4. model objects;
5. billboard particle emitters with explicit budgets;
6. beams and trails.

Shader graphs, arbitrary expressions, post-processing, dynamic lights, vector fields, mesh particles, and unrestricted looping should remain deferred until the base lifecycle is tested.

## Fit with YCS4 object containers

A saved VFX and its workspace container are separate:

- domain data: `ycs-data/vfx/<id>.json`;
- visual reference: `.workspace-object-shell[data-object-type="VFX"]` with `data-workspace-reference-id="<id>"`;
- generated runtime definition: `src/main/resources/assets/yebisurpg/vfx/<id>.json`;
- copied effect-owned textures: `src/main/resources/assets/yebisurpg/textures/vfx/<id>/`;
- common registration: an owned marker injection in the mod runtime.

The VFX editor should be a dedicated page module. Saving binds or updates its visual reference only after the backend save succeeds. Startup reconciliation should collapse duplicate VFX references and restore a missing reference for each valid saved effect, as Items do now.

### Folder behavior

Folders remain visual organization only:

- a VFX container can be moved into any Home folder without changing the effect ID or JSON;
- nested folders are allowed, but cycle-producing moves are rejected;
- search results resolve to the canonical nested VFX container;
- deleting a folder unwraps its direct children and does not delete VFX data or generated files;
- deleting a saved VFX container must call the VFX backend cleanup first and remove matching visual references only after success.

Do not store folder paths in VFX JSON or infer generated resource paths from visual placement.

## V4 save and injection lifecycle

A future V4 VFX save should follow the active lifecycle in `YCS4_Injection_and_Lifecycle.md`:

1. Load the prior JSON using `lastSavedId`.
2. Validate the new ID, schema, stable object IDs, texture references, numeric bounds, and rename collision.
3. Remove the prior owned injections in reverse.
4. Preserve unsupported fields and active injections during an incremental port.
5. Copy referenced shared textures to effect-owned runtime paths.
6. Write the versioned runtime definition.
7. inject the common-side registry entry.
8. Save complete authoring state plus the refreshed `_injections` manifest.
9. Delete the old JSON only during a successful rename transition.
10. Update the visual container only after backend success.

Delete must load the saved manifest, remove all generated outputs in reverse, delete the authoring JSON, and only then remove every visual reference for that effect ID.

The V3 VFX definition and UI must not be copied wholesale. V4 should explicitly migrate the fields it supports and preserve or reject unsupported data rather than silently dropping it.

## Node-editor boundary

The VFX composition editor should remain a hierarchy/timeline/preview tool. Gameplay nodes should trigger or stop saved effects; they should not embed the effect composition inside the gameplay graph.

Expected graph operations:

- Play VFX by saved effect ID and named instance slot;
- Remove VFX by named instance slot;
- provide entity/world anchor inputs and explicit playback parameters;
- carry execution-domain metadata so gameplay triggers run on the logical server.

The graph compiler should call a server-safe VFX service. It must not generate direct references to client rendering classes.

## Dedicated-server contract

Dynamic effect existence, identity, anchor, and start/stop time need explicit server authority and synchronization even when drawing is cosmetic.

The server should:

- validate the saved effect and target;
- allocate an instance UUID;
- record owner/name slot, dimension, start tick, duration, anchor, parameters, and recipients;
- send compact start/remove payloads;
- resend sufficiently long-lived instances on login or start-tracking;
- clean records on expiry, explicit removal, disconnect, entity removal, and dimension changes as appropriate.

Clients should load the definition from resources and evaluate playback from the authoritative server start tick. Individual planes or particles are not network-synchronized. Entity-follow effects should reuse vanilla entity transform synchronization each rendered frame rather than receiving per-frame transform packets.

Finite one-shot effects may use bounded active records. Persistent or looping effects require durable server-side active-instance storage and late-observer synchronization before being exposed in the editor.

This category therefore **needs explicit server authority and sync**.

## Initial V4 milestone

A contained first milestone is:

- create/edit/delete one saved VFX domain object;
- create and reconcile its visual workspace container;
- support folder movement without changing domain data;
- author stable plane objects with texture, transform, opacity, billboard, lighting, and active range;
- preview from a pure function of composition time;
- generate a versioned runtime JSON and tracked texture copies;
- trigger finite fixed or entity-follow effects through server start/remove payloads;
- render dependency-free textured quads on clients;
- clean every generated artifact through the manifest.

This milestone should be validated with a real dedicated server and two independent clients before expanding object types.

## Risks and unresolved decisions

- YCS4 does not yet have a generic transactional generation layer; partial failure rollback must be designed before complex multi-file VFX saves.
- Workspace layout is local browser state rather than portable project metadata.
- The V3 schema needs an explicit import/migration boundary.
- Renderer, active-instance, and particle budgets must be defined before emitters or loops.
- Client resource reload remains the likely definition refresh mechanism; live editor-to-running-game refresh is undecided.
- Block and bone anchors are not part of the initial boundary.
- Real multi-client timing, tracking, login, disconnect, and dimension-change behavior must be tested rather than inferred from singleplayer.
