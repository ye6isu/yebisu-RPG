# YCS VFX Current State

This is the implementation handoff for the YCS VFX system as of 2026-07-27. Read this before continuing VFX work. The reference-mod analysis and longer-term design rationale remain in `VFX_Decompiled_Architecture_Study.md`.

## Status Summary

The first vertical slice is implemented and compiles:

- YCS can create, edit, rename, save, and delete VFX definitions.
- A VFX definition is a flat composition of removable plane objects on a shared timeline.
- YCS provides a Three.js preview with camera orbit, grid/axes, activation-aware visibility, texture animation, selection outline, play/pause, timeline scrubbing, and editable Position/Rotation/Scale/Opacity animation curves.
- Saving generates client resource JSON, effect-owned texture copies, and a common-side duration registration.
- Blocky has `Play VFX` and `Remove VFX` action blocks.
- The server validates and starts finite instances, then sends compact clientbound start/remove payloads.
- Clients render translucent textured quads directly, without GeckoLib, Specter, Satin, or another Minecraft runtime dependency.

This is a plane-rendering foundation, not yet a complete VFX creator. Position, Rotation, Scale, and Opacity are keyframeable with cubic Bézier temporal easing; other material properties, models, beams, trails, emitters, particles, advanced materials, and post-processing are not implemented.

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
      "positionKeyframes": [
        {
          "id": "position_1",
          "tick": "0",
          "value": { "x": "0", "y": "1", "z": "0" }
        }
      ],
      "opacity": "1",
      "opacityKeyframes": [
        {
          "id": "opacity_1",
          "tick": "0",
          "value": "1"
        }
      ],
      "rotation": { "x": "0", "y": "0", "z": "0" },
      "scale": { "x": "1", "y": "1", "z": "1" },
      "width": "1",
      "height": "1",
      "billboard": true,
      "fullBright": true,
      "color": "#ffffff",
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
- Layer timing is not clamped to the effect composition. A clip may start before tick 0 or end after `durationTicks`; only its intersection with the visible composition is drawn, while `endTick - startTick` preserves the full source length. Authoring/export/loading apply only a broad `-12000..24000` safety bound.
- Position, Rotation, Scale, and Opacity keyframes use stable per-plane IDs and continuous global effect-tick times stored to thousandth-tick precision. Each outgoing key stores an easing object. Cubic easing uses normalized Bézier controls (`x1`, `y1`, `x2`, `y2`) and defaults to linear; schema v4 also supports typed Elastic and Bounce `in`, `out`, and `inOut` equations, with Elastic carrying an `amount` from 0 through 4. The editor and runtime evaluate the same eased progress. With no keys for a property, the plane uses its static value and keyed tracks hold their first/last value outside the keyed range. Opacity values are clamped to 0 through 1 during runtime export/loading.
- Position, Rotation, and Scale default to combined XYZ vector tracks. Their `separatePositionDimensions`, `separateRotationDimensions`, and `separateScaleDimensions` flags switch authoring/runtime to independent per-axis scalar keyframe arrays such as `positionXKeyframes`, `rotationYKeyframes`, or `scaleZKeyframes`; each XYZ toggle performs an explicit conversion in either direction.
- The object list is flat. It is not yet a parent/child transform hierarchy and cannot be reordered.
- Empty effects are currently allowed.

## Save And Injection Lifecycle

Saving follows the standard V3 authoritative re-injection flow:

1. Load the previous authoring JSON when editing an existing effect.
2. Remove every previous `_injections` entry in reverse order.
3. Normalize numeric fields, clamp only the total effect duration and broad timing safety bounds, and preserve layer/keyframe ticks outside the visible composition.
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
  "version": 4,
  "durationTicks": 40,
  "objects": []
}
```

New saves write `version: 4` for typed Elastic/Bounce easing plus the version-3 separate Position/Rotation/Scale dimensions and cubic Bézier tracks. Version 3 remains valid for cubic-only transform tracks, version 2 remains valid for fractional linear Position/Opacity keys, and version 1 remains valid for static-property effects. The client loader explicitly accepts versions 1 through 4 and rejects unknown versions rather than silently misreading them.

## Editor Behavior

The VFX page currently provides:

- searchable effect list plus New, Edit, Save, Remove, and Delete flows;
- a resizable left hierarchy, right inspector, and bottom timeline whose dimensions persist as editor preferences in `localStorage`;
- effect ID, name, and total duration above the left-side object list, plus add-plane and remove-selected-object actions;
- per-plane name, shared texture, position, Euler rotation, animatable transform scale, base width/height (`Base Size`), color, opacity, billboard, full bright, vertical frame count, ticks per frame, frame looping, and active tick range;
- Three.js perspective preview with camera orbit, grid, axes, a grid-level origin-to-`+Z` front guide ending in a keyframe-style diamond at the grid boundary, activation-aware object/outline visibility, Position/Rotation/Scale/Opacity curve evaluation, double-sided planes, nearest texture magnification, spritesheet playback, selected-object outline, and camera/target preservation while inspector edits rebuild the scene;
- icon-based previous-tick, play/pause, next-tick, and selected-key Graph controls grouped on the left side of the toolbar, a directly editable current-tick field, a full-width scrubber aligned to the activation-track start/end bounds, one directly editable Active clip on every main object row, and a disclosure expansion containing Position, Rotation, Scale, and Opacity keyframe tracks.

The timeline controls preview time, object activation, and Position/Rotation/Scale/Opacity keyframes. Space toggles playback outside free-text controls; when a numeric value field remains focused after editing, Space blurs it and toggles playback instead of becoming inert. Previous/next moves exactly one tick from fractional time, direct tick entry accepts fractions, and Shift scrubbing snaps to whole ticks. Timeline scrubbing updates live values without clearing the selected keys. Delete or Backspace removes every selected keyframe unless focus is in a text-entry control. The Graph toggle remains with the left-side transport controls so its time scale and the full-width scrubber align with every track. Active clips stay directly draggable/resizable, preserve off-composition source length, shift every property key with the clip body, and never create horizontal timeline overflow. Position, Rotation, and Scale each have an `XYZ` Separate Dimensions toggle in their timeline row, outside Graph mode. Off keeps one combined vector track; on converts it into independently keyframeable X, Y, and Z child tracks. Recombining samples the separated tracks at their union of key times and creates a combined vector track, so toggling is explicit and may simplify distinct per-axis curve information just as in After Effects. Opacity remains scalar. Every property/axis track permits only one keyframe at each thousandth-tick timestamp; loading older duplicate data keeps the most recently authored entry, while live state updates reject rather than merge a collision. During timeline or graph dragging, an occupied timestamp resolves to the nearest free timestamp on the pointer's current side, so the key sits immediately before the occupied time and skips immediately after it as the pointer crosses. Dragging a key that is already part of a multi-key selection translates every selected key by the same time delta across objects and tracks; the group shares bounds and collision resolution, so it cannot collapse onto unselected keys. Every track supports fractional creation, continuous dragging, Shift whole-tick snapping, additive selection, marquee selection, direct inspector editing, apply, and delete. Graph mode filters All, Position, Rotation, Scale, or Opacity and preserves selection while interacting. Dragging a graph key moves its time and selected component value; Shift snaps graph time to whole ticks, while Ctrl on Windows or Command on macOS temporarily snaps time/value to nearby selected keys, the playhead, zero, and composition bounds. Adjacent cubic keys expose two Bézier direction handles. Elastic and Bounce segments render as sampled multi-turn curves and are edited through their presets rather than fake cubic handles. Multi-key value scaling/transform boxes, per-key numeric time fields, speed-graph mode, and Blocky property events are not implemented yet.

Graph presentation defaults to a square, non-stretched plotting canvas with a square 24-pixel grid. Square mode auto-fits selected key times and values, while its `Square` toggle switches to a full-width timeline-style graph with the exact tick-0-through-duration horizontal domain. Full-width mode reserves the same hierarchy column as timeline rows, fills the complete remaining track column, and uses the same left/right track inset as the Active row. Both modes retain an outer overscan gutter for captured key and Bézier-handle drags. Graph keys and handle knobs use non-scaling round markers, so the full-width graph cannot turn them into ellipses. Axis colors are red X, amber Y, and blue Z; no green graph styling remains. Space is reserved for Play/Pause outside text-entry controls—even while a graph button has focus—and neither Space nor the transport Play/Pause button clears selected timeline or graph keys, so the editable curve remains visible while previewing.

Square and Full Graph modes both use the same full-height Easing Presets panel in the left hierarchy column. Linear has one button; Ease, Sine, Quad, Cubic, Quart, Quint, Expo, Circ, Back, Elastic, and Bounce each use one compact family row with `[In] [Out] [In/Out]` buttons. A preset applies to every selected keyframe's outgoing curve without clearing selection. Elastic Amount accepts editable values from 0 (linear) through 1 (standard) to 4 (strong overshoot). `Read Selected` copies an independent snapshot of the complete easing object. When a visible graph segment is selected, it resolves the segment's left keyframe because that key owns the outgoing curve; for a single selected key it reads that key directly. `Apply Copied` writes the snapshot to the current target selection so custom handles and typed easing settings can be transferred or restored after further curve edits.

The preview approximates the runtime but is not renderer-identical. In particular, it uses an unlit `MeshBasicMaterial`, so the runtime meaning of `fullBright` is not visually compared against world lighting in YCS.

## Blocky Contract

`vfx.play` compiles to the spawn-point-aware overload:

```java
VfxService.playAtEntity(effectId, instanceName, entity, anchorMode, spawnPoint, followYaw, followPitch, viewSway, offsetX, offsetY, offsetZ);
```

The block keeps the saved-effect dropdown, instance name, entity input, and world-axis XYZ origin offsets on its face. Its existing gear popup contains anchor mode (`FIXED` or `FOLLOW_ENTITY`), spawn point (`RAW_POSITION` or `EYE_LEVEL`), Follow Yaw, Follow Pitch, and First-Person View Sway. Fixed captures the origin and enabled rotations at start. Follow Entity resolves the entity's vanilla-synchronized position every rendered frame and also resolves whichever rotation axes are enabled, so authored local `+Z` positions remain forward relative to the owner. For the anchored local player in first person, Eye Level uses the exact active camera position and enabled camera rotations instead of reconstructing an eye position from entity feet/pose state; this keeps the effect stable through crouch and eye-height interpolation. First-Person View Sway is off by default, which removes vanilla walking view bob in camera space and conjugates that inverse through the current camera rotation so no yaw/pitch-dependent residual remains. Enabling it deliberately keeps the same walking sway seen on first-person hands. Other observers continue resolving the normal synchronized entity eye transform. Reusing the same instance name for the same owner first removes the previous instance and then starts the replacement. `main` is only the default instance-slot name; it has no rendering meaning and may be replaced with another name when several independently removable effects are needed for one owner.

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
5. Resolves one instance transform: fixed uses the captured values; entity-following uses the interpolated vanilla client entity position/current eye height and enabled view rotations, except the anchored local first-person Eye Level case uses the exact active camera transform for screen stability and removes vanilla walking view bob in camera space when First-Person View Sway is disabled.
6. Evaluates the plane's static values or schema-v4 combined/separated Position, Rotation, Scale, and Opacity tracks at the authoritative fractional elapsed effect tick, using the same cubic Bézier, Elastic, or Bounce evaluator as YCS.
7. Rotates the evaluated local position by instance pitch then yaw so local `+Z` maps to the resolved forward direction, adds it to the resolved origin, and uses the evaluated opacity for quad alpha.
8. Uses camera rotation plus evaluated Z rotation for billboard planes; non-billboards apply instance yaw/pitch followed by evaluated authored rotation order Y, X, then Z. Evaluated Scale is applied before drawing.
9. Selects a vertical spritesheet frame through the existing `TextureFrameClock`.
10. Draws one `RenderType.entityTranslucent` quad with color/opacity and either full-bright or boundary-safe sampled world light. Non-full-bright planes combine the brightest block/sky light at their center and six immediate neighbors, preventing the whole plane from darkening when its center overlaps a solid block while retaining normal world depth occlusion.
11. Ends each render-type batch after all active instances are visited.

Changing or losing the client level clears all active client instances. If a start arrives for a missing definition, the orphan client instance is discarded after 200 ticks.

## Current Generated Example

The workspace currently contains `ycs-data/vfx/yesss.json` and its generated `assets/yebisurpg/vfx/yesss.json`, with this injected registration:

```java
VfxRegistry.register("yesss", 40);
```

`yesss` currently contains three plane objects covering consecutive activation ranges. It predates property keyframes and remains a valid version-1 static-property definition until it is re-saved through YCS, which will export it as version 2.

## Known Limitations And Risks

- The implementation has compiled but has not been launch-tested in Minecraft.
- No two-client dedicated-server test has been performed.
- Fixed finite effects are sent only to players in range at trigger time. Follow Entity effects additionally resend on start-tracking, but login/dimension-change behavior still needs real multi-client validation.
- There is no general persistent/looping authority or fixed-instance login/start-tracking resynchronization; the new resend path is scoped to finite Follow Entity instances.
- Entity following is supported; block and bone anchors are not.
- Explicit remove targets every recorded recipient, including players added through Follow Entity start-tracking resends.
- There are no global/per-owner active-instance caps beyond finite duration and same-name replacement.
- No blend-mode choice, additive material, depth-test controls, soft particles, model renderer, beam, trail, emitter, collision, curves, gradients, or random seed exists.
- Position, Rotation, Scale, and Opacity are keyframed and use editable value-graph keys plus cubic Bézier direction handles. Position alone supports Separate Dimensions. There is no speed graph, group movement/transform box, copy/paste, per-key numeric tick field, easing presets, or separated Rotation/Scale yet.
- Runtime definitions reload through Minecraft's normal client resource reload. YCS Save does not push a live cache-refresh command into a running game.
- Duplicate object IDs are not explicitly rejected. Sanitized duplicates would target the same generated texture path.
- Texture export always uses a `.png` destination and assumes the selected shared texture is valid for that extension.
- The Three.js dependency substantially increases the main YCS bundle; the build currently reports a large-chunk warning.
- There are no automated VFX tests. Both `./gradlew build` and `npm run build` passed on 2026-07-27.

## Recommended Continuation Order

1. Create a non-empty test effect with one visible plane and validate editor preview, generated texture, runtime JSON, Blocky compilation, and in-game rendering.
2. Run a real dedicated server with two independent clients. Verify start timing, radius selection, same-name replacement, explicit removal, natural expiry, disconnect, and dimension-change behavior.
3. Validate the implemented Fixed/Follow Entity anchor modes, then decide whether block and bone anchors are required.
4. Add schema validation for unique IDs, supported texture files, valid nonzero source ranges, broad timing safety bounds, and finite Bézier controls. Extend the version-1/version-2/version-3 loader boundary with explicit migrations when a future schema change cannot remain optional and backward-compatible.
5. Generalize the Position/Rotation/Scale/Opacity tracks for other material properties, then extend existing multi-selection and editable value graph with copy/paste, group value scaling, per-key numeric tick editing, easing presets, and optional speed-graph controls. Keep Active directly editable on the main row, use stable object/keyframe IDs, and keep playback a pure function of authoritative start tick plus definition data.
6. Add the next render object type through the existing typed `objects` array. A 3D model object is the most direct next proof that the composition is not plane-specific; beams and trails can follow.
7. Define renderer and instance budgets before adding particle emitters or unrestricted looping effects.
8. Add persistent server authority and login/start-tracking synchronization before exposing indefinite effects in YCS or Blocky.

Do not pull GeckoLib, Specter, Satin, Photon, Veil, or Fabric APIs into the mod. Continue using the decompiled projects only as architectural references and preserve the zero Minecraft runtime-dependency rule.
