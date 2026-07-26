# YCS VFX Current State

This is the implementation handoff for the YCS VFX system as of 2026-07-26. Read this before continuing VFX work. The reference-mod analysis and longer-term design rationale remain in `VFX_Decompiled_Architecture_Study.md`.

## Status Summary

The first vertical slice is implemented and compiles:

- YCS can create, edit, rename, save, and delete VFX definitions.
- A VFX definition is a flat composition of removable plane objects on a shared timeline.
- YCS provides a Three.js preview with camera orbit, grid/axes, activation-aware visibility, texture animation, selection outline, play/pause, and timeline scrubbing.
- Saving generates client resource JSON, effect-owned texture copies, and a common-side duration registration.
- Blocky has `Play VFX` and `Remove VFX` action blocks.
- The server validates and starts finite instances, then sends compact clientbound start/remove payloads.
- Clients render translucent textured quads directly, without GeckoLib, Specter, Satin, or another Minecraft runtime dependency.

This is a plane-rendering foundation, not yet a complete VFX creator. It has no property keyframes, curves, models, beams, trails, emitters, particles, advanced materials, or post-processing.

## Implemented File Map

### YCS editor

- `ycs/src/components/VfxLanding.jsx`: list/editor UI, plane inspector, Three.js preview, timeline, save/delete lifecycle, and runtime export.
- `ycs/src/components/VfxLanding.css`: VFX workspace, hierarchy, viewport, inspector, timeline, and responsive styling.
- `ycs/src/App.jsx`: adds the VFX page and Assets > VFX navigation entry.
- `ycs/package.json`: adds `three`; this is an editor dependency only, not a Minecraft runtime dependency.

### Blocky

- `ycs/src/codegen/visual/blockDefs.js`: defines `vfx.play` and `vfx.remove`.
- `ycs/src/components/BlockEditor.jsx`: loads `ycs-data/vfx` and exposes saved effects in the Play VFX searchable dropdown.

### Common/server runtime

- `src/main/java/net/ye6isu/yebisuRPG/vfx/VfxRegistry.java`: injected effect ID and duration registry; `bootstrap()` contains marker `YCS_Vfx_Definitions`.
- `src/main/java/net/ye6isu/yebisuRPG/vfx/VfxService.java`: server authority, named instance replacement/removal, recipient selection, and finite-instance cleanup.
- `src/main/java/net/ye6isu/yebisuRPG/vfx/network/VfxStartPayload.java`: compact start payload.
- `src/main/java/net/ye6isu/yebisuRPG/vfx/network/VfxRemovePayload.java`: UUID-only removal payload.
- `src/main/java/net/ye6isu/yebisuRPG/network/NetworkRegistry.java`: registers both payloads as play-to-client.
- `src/main/java/net/ye6isu/yebisuRPG/network/ClientHandlerProxy.java`: distribution-safe reflective dispatch to client-only VFX handlers.

### Client runtime

- `src/main/java/net/ye6isu/yebisuRPG/vfx/client/VfxDefinition.java`: immutable parsed definition and plane records.
- `src/main/java/net/ye6isu/yebisuRPG/vfx/client/VfxDefinitionLoader.java`: resource reload listener for `assets/yebisurpg/vfx/*.json`.
- `src/main/java/net/ye6isu/yebisuRPG/vfx/client/VfxClientPayloadHandler.java`: queues start/remove handling on the client thread.
- `src/main/java/net/ye6isu/yebisuRPG/vfx/client/ClientVfxManager.java`: active client instances, lifetime evaluation, frustum culling, and direct quad rendering.
- `src/main/java/net/ye6isu/yebisuRPG/yebisuRPG.java`: bootstraps the registry and registers client reload/render listeners.

## Authoring Data

The complete editable source is one file per effect:

```text
ycs-data/vfx/<effect-id>.json
```

The editor currently stores number inputs as strings so values round-trip through the form without maintaining a second persistent representation. A typical authored plane has this shape:

```json
{
  "id": "flash",
  "name": "Flash",
  "durationTicks": 40,
  "objects": [
    {
      "id": "plane_1",
      "name": "Plane 1",
      "type": "plane",
      "texture": "shared_texture_id",
      "position": { "x": "0", "y": "1", "z": "0" },
      "rotation": { "x": "0", "y": "0", "z": "0" },
      "scale": { "x": "1", "y": "1", "z": "1" },
      "width": "1",
      "height": "1",
      "billboard": true,
      "fullBright": true,
      "color": "#ffffff",
      "opacity": "1",
      "rows": "1",
      "ticksPerFrame": "2",
      "textureLoop": true,
      "startTick": "0",
      "endTick": "40"
    }
  ],
  "_injections": []
}
```

Important current semantics:

- Effect IDs and plane IDs are sanitized to lowercase `a-z`, digits, and underscores by the editor.
- Duration is clamped to 1 through 12,000 ticks.
- Every plane must select a shared YCS texture before save.
- `rows` means vertically stacked spritesheet frames. Horizontal grids are not supported.
- `startTick` is inclusive and `endTick` is exclusive.
- The object list is flat. It is not yet a parent/child transform hierarchy and cannot be reordered.
- Empty effects are currently allowed.

## Save And Injection Lifecycle

Saving follows the standard V3 authoritative re-injection flow:

1. Load the previous authoring JSON when editing an existing effect.
2. Remove every previous `_injections` entry in reverse order.
3. Normalize numeric fields and clamp duration/activation bounds.
4. Copy each selected shared texture to:

```text
src/main/resources/assets/yebisurpg/textures/vfx/<effect-id>/<plane-id>.png
```

5. Generate the runtime definition at:

```text
src/main/resources/assets/yebisurpg/vfx/<effect-id>.json
```

6. Inject this common-side registration before `YCS_Vfx_Definitions`:

```java
VfxRegistry.register("<effect-id>", <durationTicks>);
```

7. Save the complete authoring JSON and new `_injections` manifest to `ycs-data/vfx/<effect-id>.json`.
8. If the ID changed, delete the old authoring JSON after the new save succeeds.

Deleting an effect removes the generated definition, texture copies, and registry line described by `_injections`, then deletes its authoring JSON.

The runtime JSON uses numeric values and replaces shared texture IDs with resource locations such as `yebisurpg:textures/vfx/flash/plane_1.png`. Its top-level format is currently:

```json
{
  "version": 1,
  "durationTicks": 40,
  "objects": []
}
```

`version` is written but no migration system exists yet.

## Editor Behavior

The VFX page currently provides:

- searchable effect list plus New, Edit, Save, Remove, and Delete flows;
- a resizable left hierarchy, right inspector, and bottom timeline whose dimensions persist as editor preferences in `localStorage`;
- effect ID, name, and total duration above the left-side object list, plus add-plane and remove-selected-object actions;
- per-plane name, shared texture, position, Euler rotation, scale, width/height, color, opacity, billboard, full bright, vertical frame count, ticks per frame, frame looping, and active tick range;
- Three.js perspective preview with orbit controls, grid, axes, a grid-level origin-to-`+Z` front guide ending in a keyframe-style diamond at the grid boundary, activation-aware object/outline visibility, double-sided planes, nearest texture magnification, spritesheet playback, selected-object outline, and camera/target preservation while inspector edits rebuild the scene;
- play/pause transport, numeric tick display, a scrubber aligned to the activation-track start/end bounds, and collapsible layer rows with a summary clip plus an expanded `Active` property track whose body moves the range and whose edge handles resize its start/end ticks.

The timeline controls preview time and object activation. Each object is a disclosure-style parent layer row, establishing the hierarchy that later keyframe properties can join without implementing keyframes in this pass. Its existing `Active` child track is draggable and resizable with integer-tick snapping and updates the same typed `startTick`/`endTick` fields shown in the inspector. It does not yet contain keyframes, curve handles, transform/material property tracks, or Blocky events.

The preview approximates the runtime but is not renderer-identical. In particular, it uses an unlit `MeshBasicMaterial`, so the runtime meaning of `fullBright` is not visually compared against world lighting in YCS.

## Blocky Contract

`vfx.play` compiles to the spawn-point-aware overload:

```java
VfxService.playAtEntity(effectId, instanceName, entity, anchorMode, spawnPoint, followYaw, followPitch, viewSway, offsetX, offsetY, offsetZ);
```

The block keeps the saved-effect dropdown, instance name, entity input, and world-axis XYZ origin offsets on its face. Its existing gear popup contains anchor mode (`FIXED` or `FOLLOW_ENTITY`), spawn point (`RAW_POSITION` or `EYE_LEVEL`), Follow Yaw, Follow Pitch, and First-Person View Sway. Fixed captures the origin and enabled rotations at start. Follow Entity resolves the entity's vanilla-synchronized position every rendered frame and also resolves whichever rotation axes are enabled, so authored local `+Z` positions remain forward relative to the owner. For the anchored local player in first person, Eye Level uses the exact active camera position and enabled camera rotations instead of reconstructing an eye position from entity feet/pose state; this keeps the effect stable through crouch and eye-height interpolation. First-Person View Sway is off by default, which inverses vanilla walking view bob for this local first-person eye anchor. Enabling it deliberately keeps the same walking sway seen on first-person hands. Other observers continue resolving the normal synchronized entity eye transform. Reusing the same instance name for the same owner first removes the previous instance and then starts the replacement. `main` is only the default instance-slot name; it has no rendering meaning and may be replaced with another name when several independently removable effects are needed for one owner.

`vfx.remove` compiles to:

```java
VfxService.remove(instanceName, entity);
```

Named instances are keyed by owner entity UUID plus the trimmed instance name. A blank name becomes `main`; names are capped at 64 characters. Instance names are currently case-sensitive.

Follow Entity is an instance-level client anchor, not one spawned Minecraft entity per plane. The server-authoritative start payload carries the anchor entity ID and transform flags once; clients reuse vanilla entity position/rotation synchronization with no per-frame custom packet. When the anchor is temporarily not tracked, the effect is skipped rather than rendered as a ghost at its fallback origin.

## Server And Network Lifecycle

This system **needs explicit server authority + sync**, and that authority is implemented for finite one-shot effects:

1. Blocky invokes `VfxService` on the logical server.
2. The service normalizes and validates the effect ID against `VfxRegistry`.
3. It removes an existing instance in the same owner/name slot.
4. It allocates a random instance UUID and captures the server level game tick.
5. It sends one start payload to players in the same dimension within 192 blocks of the sampled origin.
6. It stores the full start payload, instance UUID, dimension, end tick, and recipient UUIDs. Follow Entity instances are resent idempotently when another player starts tracking the anchor, allowing that client to reconstruct elapsed time from the original start tick.
7. The server drops its active record at the registered duration. No natural-expiry packet is needed because clients use the same duration and shared tick.
8. An explicit Remove or same-slot replacement sends a UUID-only remove payload to every recorded recipient that is still connected.

The start payload contains:

```text
instance UUID, bounded effect ID (codec limit 128), fallback X/Y/Z, captured yaw/pitch, anchor entity ID, packed follow/eye/rotation/view-sway flags, XYZ offsets, server start tick
```

There are no per-plane, per-frame, or per-particle packets. The full effect definition and textures are client resources. There is no random simulation yet, so a deterministic seed is not part of the current payload.

## Client Rendering Lifecycle

The client resource reload listener scans only the `yebisurpg` namespace under `vfx/*.json`, parses supported plane objects, and atomically replaces the immutable definition map.

On a start payload, `ClientVfxManager` stores effect ID, fallback transform, optional entity-anchor fields, and start tick under the instance UUID. During `RenderLevelStageEvent.Stage.AFTER_PARTICLES` it:

1. Computes elapsed time from `ClientLevel.getGameTime()` plus partial tick and the server-provided start tick.
2. Removes instances whose definition duration has elapsed.
3. Skips planes outside their activation range.
4. Frustum-culls a bounds estimate around each plane.
5. Resolves one instance transform: fixed uses the captured values; entity-following uses the interpolated vanilla client entity position/current eye height and enabled view rotations, except the anchored local first-person Eye Level case uses the exact active camera transform for screen stability and optionally inverses vanilla walking view bob when First-Person View Sway is disabled.
6. Rotates each authored local offset by instance pitch then yaw, so local `+Z` maps to the resolved forward direction, and adds it to the resolved origin.
7. Uses camera rotation for billboard planes; the instance transform affects their position, while billboard X/Y rotation is ignored and only authored Z rotation is added.
8. Applies instance yaw/pitch followed by authored fixed rotation order Y, X, then Z for non-billboard planes.
9. Selects a vertical spritesheet frame through the existing `TextureFrameClock`.
10. Draws one `RenderType.entityTranslucent` quad with color/opacity and either full-bright or sampled world light.
11. Ends each render-type batch after all active instances are visited.

Changing or losing the client level clears all active client instances. If a start arrives for a missing definition, the orphan client instance is discarded after 200 ticks.

## Current Generated Example

The workspace currently contains `ycs-data/vfx/yesss.json` and its generated `assets/yebisurpg/vfx/yesss.json`, with this injected registration:

```java
VfxRegistry.register("yesss", 40);
```

`yesss` has no objects and therefore renders nothing. It only proves that the authoring file, runtime file, injection manifest, and registry insertion path work. Keep it as a placeholder or delete it through YCS once a real plane effect is saved.

## Known Limitations And Risks

- The implementation has compiled but has not been launch-tested in Minecraft.
- No two-client dedicated-server test has been performed.
- Fixed finite effects are sent only to players in range at trigger time. Follow Entity effects additionally resend on start-tracking, but login/dimension-change behavior still needs real multi-client validation.
- There is no general persistent/looping authority or fixed-instance login/start-tracking resynchronization; the new resend path is scoped to finite Follow Entity instances.
- Entity following is supported; block and bone anchors are not.
- Explicit remove targets every recorded recipient, including players added through Follow Entity start-tracking resends.
- There are no global/per-owner active-instance caps beyond finite duration and same-name replacement.
- No blend-mode choice, additive material, depth-test controls, soft particles, model renderer, beam, trail, emitter, collision, curves, gradients, or random seed exists.
- Runtime definitions reload through Minecraft's normal client resource reload. YCS Save does not push a live cache-refresh command into a running game.
- Duplicate object IDs are not explicitly rejected. Sanitized duplicates would target the same generated texture path.
- Texture export always uses a `.png` destination and assumes the selected shared texture is valid for that extension.
- The Three.js dependency substantially increases the main YCS bundle; the build currently reports a large-chunk warning.
- There are no automated VFX tests. Both `./gradlew build` and `npm run build` passed on 2026-07-26.

## Recommended Continuation Order

1. Create a non-empty test effect with one visible plane and validate editor preview, generated texture, runtime JSON, Blocky compilation, and in-game rendering.
2. Run a real dedicated server with two independent clients. Verify start timing, radius selection, same-name replacement, explicit removal, natural expiry, disconnect, and dimension-change behavior.
3. Validate the implemented Fixed/Follow Entity anchor modes, then decide whether block and bone anchors are required.
4. Add schema validation for unique IDs, supported texture files, activation bounds, and runtime `version`; then add a migration boundary before expanding the format.
5. Add transform/material keyframe tracks beneath the existing disclosure-style layer rows using stable object IDs. Keep playback a pure function of authoritative start tick plus definition data.
6. Add the next render object type through the existing typed `objects` array. A 3D model object is the most direct next proof that the composition is not plane-specific; beams and trails can follow.
7. Define renderer and instance budgets before adding particle emitters or unrestricted looping effects.
8. Add persistent server authority and login/start-tracking synchronization before exposing indefinite effects in YCS or Blocky.

Do not pull GeckoLib, Specter, Satin, Photon, Veil, or Fabric APIs into the mod. Continue using the decompiled projects only as architectural references and preserve the zero Minecraft runtime-dependency rule.
