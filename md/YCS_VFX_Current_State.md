# YCS VFX Current State

This is the implementation handoff for the YCS VFX system as of 2026-08-12. Read this before continuing VFX work. The reference-mod analysis and longer-term design rationale remain in `VFX_Decompiled_Architecture_Study.md`.

## Status Summary

The first vertical slice is implemented and compiles:

- YCS can create, edit, rename, save, and delete VFX definitions.
- A VFX definition is a flat composition of removable plane objects on a shared timeline.
- YCS provides a Three.js preview with camera orbit, grid/front guide, activation-aware visibility, texture animation, selection outline, play/pause, timeline scrubbing, and Position/Rotation/Scale/Opacity keyframe editing.
- Saving generates client resource JSON, effect-owned texture copies, and a common-side duration registration.
- Blocky has `Play VFX` and `Remove VFX` action blocks.
- The server validates and starts finite instances, then sends compact clientbound start/remove payloads.
- Clients render translucent textured quads directly, without GeckoLib, Specter, Satin, or another Minecraft runtime dependency.

This is a plane-rendering foundation, not yet a complete VFX creator. The version-4 runtime and promoted Three.js preview evaluate Position, Rotation, Scale, and Opacity keyframes with custom cubic Bézier curves plus the animation system's Step, Sine, Quad, Cubic, Quart, Quint, Expo, Circ, Back, Elastic, and Bounce easing formulas. The promoted editor can add or remove a linear key at the current playhead, edit its value through the inspector, and read/apply its outgoing easing through the graph editor. Other material properties, models, beams, trails, emitters, particles, advanced materials, and post-processing are not implemented.

## Implemented File Map

### YCS editor

- `ycs/src/components/VfxLanding.jsx`: searchable effect landing/list plus the legacy editor implementation retained as reference; create/edit routes now open the promoted new editor.
- `ycs/src/components/VfxNewLanding.jsx` and `VfxNewLanding.css`: primary plane editor, resizable hierarchy/inspector/timeline workspace, save/delete lifecycle, and runtime export.
- `ycs/src/components/ThreeDViewport.jsx`, `VfxKeyframes.js`, and `ThreeDViewport.css`: primary editor preview, including textures, base size, animated transforms/opacity, selection outline, activation ranges, and spritesheet playback.
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
      "position": { "x": "0", "y": "0", "z": "0" },
      "pivot": { "x": "0", "y": "0", "z": "0" },
      "baseRotation": { "x": "0", "y": "0", "z": "0" },
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
      "billboard": false,
      "fullBright": false,
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
- `startTick` and `endTick` are both inclusive. A composition with `durationTicks: 20` therefore exposes and renders authored ticks 0 through 20; the runtime keeps that last sampled tick visible for its complete tick interval before expiring.
- Layer timing is not clamped to the effect composition. A clip may start before tick 0 or end after `durationTicks`; only its intersection with the visible composition is drawn, while `endTick - startTick + 1` preserves the inclusive source length. Authoring/export/loading apply only a broad `-12000..24000` safety bound.
- Position, Rotation, Scale, and Opacity keyframes use stable per-plane IDs and continuous global effect-tick times stored to thousandth-tick precision. Each outgoing key stores an easing object. Custom cubic easing uses normalized Bézier controls (`x1`, `y1`, `x2`, `y2`) and defaults to linear. Schema v4 also accepts typed Step, Sine, Quad, Cubic power, Quart, Quint, Expo, Circ, Back, Elastic, and Bounce easing with `in`, `out`, and `inOut` modes where applicable. Their formulas mirror `HandAnimationLoader`: Step uses an adjustable 2-through-64 step count, Back uses its 0-through-10 overshoot argument, and Elastic uses its 0-through-4 oscillation multiplier. Bounce strength blends from linear at 0 to the animation system's exact bounce at 1 and permits stronger values through 4. The promoted editor preview and Minecraft runtime evaluate these types with matching math. With no keys for a property, the plane uses its static value and keyed tracks hold their first/last value outside the keyed range. Opacity values are clamped to 0 through 1 during runtime export/loading.
- Position, Rotation, and Scale default to combined XYZ vector tracks. Their `separatePositionDimensions`, `separateRotationDimensions`, and `separateScaleDimensions` flags switch runtime evaluation to independent per-axis scalar keyframe arrays such as `positionXKeyframes`, `rotationYKeyframes`, or `scaleZKeyframes`. The retained legacy editor's XYZ toggle performs explicit conversion in either direction; the promoted editor does not expose that toggle yet.
- Pivot is a static, non-keyframed local transform origin matching Blockbench animation behavior. Evaluated Position translates the Pivot and attached plane together. Plane Rotation is a second static field that gives the plane its base orientation around that Pivot; animated Rotation is added relative to it, and animated Scale uses the same Pivot. For a plane centered at local zero, the transform is `Position + Pivot + (Plane Rotation + Rotation)(Scale(-Pivot + vertex))`. Missing Pivot or Plane Rotation data defaults to `0, 0, 0`, preserving legacy definitions. The selected plane's translated Pivot is shown in the YCS viewport with a non-occluded XYZ axis marker.
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
- a combined per-plane `Name / Object ID` field that keeps the display name and sanitized runtime ID synchronized when edited, plus searchable shared texture and the transform controls ordered Pivot, Scale, Plane Rotation, Position, then Rotation. Pivot and Plane Rotation are static; Position, Rotation, and Scale retain their animation tracks. Plane Rotation establishes the plane's orientation around the Pivot before animated Rotation is applied relative to it. The inspector also exposes base width/height (`Base Size`), opacity, billboard, full bright, and active tick range. New planes start at Position `0, 0, 0`, Rotation `0, 0, 0`, Pivot `0, 0, 0`, and Plane Rotation `0, 0, 0`, with Billboard and Full Bright unchecked. Color and spritesheet frame/timing/loop values remain preserved in authoring JSON and runtime export but are not exposed in the promoted inspector;
- Three.js perspective preview with camera orbit, grid, a grid-level origin-to-`+Z` front guide ending in a diamond, activation-aware object/outline visibility including the authored final boundary frame, eased Position/Rotation/Scale/Opacity evaluation, double-sided planes, nearest texture magnification, spritesheet playback, selected-object outline, and camera/target preservation while inspector edits rebuild the scene;
- a directly editable current-tick field, frame-synchronized 20-ticks-per-second playback, centered play/pause control, full-width scrubber, draggable/resizable activation clips, Ctrl-wheel zoom, and Shift-wheel horizontal timeline panning. Each layer retains a disclosure arrow with Position, Rotation, Scale, and Opacity property rows plus a right-aligned keyframe diamond. The diamond uses the same transparent background as an unchecked inspector checkbox, adds a linear key at the playhead when clicked, turns solid white while that property is keyed at the current tick, and removes that key when clicked again. Added keys also render on the property track as solid white diamonds, including keys on the composition's final tick. Track diamonds and the playhead share the exact same buffered track width. Track diamonds support persistent click selection, Ctrl/Command/Shift additive selection, marquee selection, and group horizontal dragging snapped exclusively to whole tick values; clicking an already-selected marker never toggles it off. Clicking either the property label background or empty space on its timeline track preserves key selection because both remain part of the selected element's editing surface; dragging that track space still begins a replacement marquee, while modifier-dragging adds to the current selection. Inspector interactions also preserve key selection. Clicking an already-selected layer row or activation clip keeps it selected instead of toggling it off. The playhead is rendered only when its tick lies inside the visible zoom window, so an off-screen playhead no longer sticks to the first or last visible tick;
- inspector number fields that remain directly typeable and also support horizontal drag adjustment, Item Editor-style highlighted checkboxes, and an overlay horizontal scrollbar when fixed-width controls exceed the resized inspector width;
- an explicitly stacked right-side inspector above a vertically resizable graph editor, both using the same 36px section-title styling. The graph remains one responsive square easing graph with pointer- and keyboard-adjustable cubic handles, horizontal Apply/Read controls, and a three-column preset grid ordered Linear, Step, Sine, Quad, Cubic, Quart, Quint, Expo, Circ, Back, Elastic, and Bounce. The complete control block is bottom-anchored, while the square graph consumes the remaining space and sizes itself from the smaller available width or height, so resizing either pane axis changes the graph without stretching it. Choosing a preset or shared In/Out/In-Out mode applies it immediately. Named preset curves still expose editable handles; dragging one converts the displayed draft to a custom cubic, and Apply writes that adjustment. When the selected family has a numeric property, its standard 90px draggable number field appears below the mode row and Apply writes the adjustment. Read resolves the active selected segment's left key and loads its outgoing easing into the graph draft. With two or more selected keys on one track, Apply writes the normalized draft only to each left key whose immediate next key is also selected, so selections 1/2/3 affect segments 1-to-2 and 2-to-3 but not the unused outgoing curve on key 3. A single selected key still edits its own outgoing easing. All graph interactions preserve key selection. The graph editor height persists in `localStorage` and its content uses the shared overlay scrollbar.

The promoted timeline supports add/remove, selection, time dragging, and outgoing-easing editing for the four transform/opacity property rows. Once a property has at least one key, changing its inspector value at an unkeyed playhead automatically creates a linear key there from the currently evaluated value plus the user's edit. A key added on an existing Separate Dimensions track creates the missing axis keys together, and inspector edits at that playhead update those keys. Graph key-value dragging and Separate Dimensions controls are not exposed yet. When an existing version-2/3/4 effect is loaded, all recognized keyframe, easing, and Separate Dimensions fields remain attached to the plane object and pass through the authoring and runtime exports unchanged.

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
7. The server drops its active record after the registered final tick's complete interval. No natural-expiry packet is needed because clients use the same inclusive duration and shared tick.
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
2. Removes instances after the inclusive definition duration's final tick interval has elapsed.
3. Skips planes outside their inclusive activation range.
4. Frustum-culls a bounds estimate around each plane.
5. Resolves one instance transform: fixed uses the captured values; entity-following uses the interpolated vanilla client entity position/current eye height and enabled view rotations, except the anchored local first-person Eye Level case uses the exact active camera transform for screen stability and removes vanilla walking view bob in camera space when First-Person View Sway is disabled.
6. Evaluates the plane's static values or schema-v4 combined/separated Position, Rotation, Scale, and Opacity tracks at the authoritative fractional elapsed effect tick, using the same cubic Bézier, Elastic, or Bounce evaluator as YCS.
7. Rotates the evaluated local position by instance pitch then yaw so local `+Z` maps to the resolved forward direction, adds it to the resolved origin, and uses the evaluated opacity for quad alpha.
8. Adds static Plane Rotation to evaluated animated Rotation, then applies the combined Y, X, Z orientation around the translated Pivot. Billboard planes apply that local orientation after camera rotation; non-billboards apply it after instance yaw/pitch. Evaluated Scale uses the same Pivot and is applied before drawing.
9. Selects a vertical spritesheet frame through the existing `TextureFrameClock`.
10. Draws one `RenderType.entityTranslucent` quad with color/opacity and either full-bright or boundary-safe sampled world light. Non-full-bright planes combine the brightest block/sky light at their center and six immediate neighbors, preventing the whole plane from darkening when its center overlaps a solid block while retaining normal world depth occlusion.
11. Ends each render-type batch after all active instances are visited.

Changing or losing the client level clears all active client instances. If a start arrives for a missing definition, the orphan client instance is discarded after 200 ticks.

## Current Generated Example

The workspace currently contains `ycs-data/vfx/yesss.json` and its generated `assets/yebisurpg/vfx/yesss.json`, with this injected registration:

```java
VfxRegistry.register("yesss", 20);
```

`yesss` currently contains one plane and is a version-4 definition with preserved transform keyframes.

## Known Limitations And Risks

- The implementation has compiled but has not been launch-tested in Minecraft.
- No two-client dedicated-server test has been performed.
- Fixed finite effects are sent only to players in range at trigger time. Follow Entity effects additionally resend on start-tracking, but login/dimension-change behavior still needs real multi-client validation.
- There is no general persistent/looping authority or fixed-instance login/start-tracking resynchronization; the new resend path is scoped to finite Follow Entity instances.
- Entity following is supported; block and bone anchors are not.
- Explicit remove targets every recorded recipient, including players added through Follow Entity start-tracking resends.
- There are no global/per-owner active-instance caps beyond finite duration and same-name replacement.
- No blend-mode choice, additive material, depth-test controls, soft particles, model renderer, beam, trail, emitter, collision, curves, gradients, or random seed exists.
- The promoted editor supports Position, Rotation, Scale, and Opacity key creation/removal, visible selectable and time-draggable timeline markers, inspector auto-key editing, custom cubic graph editing, and named easing presets, but still has no graph key-value dragging or Separate Dimensions toggle.
- Runtime definitions reload through Minecraft's normal client resource reload. YCS Save does not push a live cache-refresh command into a running game.
- Save rejects duplicate sanitized object IDs before generated texture paths can collide.
- Texture export always uses a `.png` destination and assumes the selected shared texture is valid for that extension.
- The Three.js dependency substantially increases the main YCS bundle; the build currently reports a large-chunk warning.
- There are no automated VFX tests. Both `npm run build` for YCS and `./gradlew build` for the mod passed on 2026-08-12.

## Recommended Continuation Order

1. Create a non-empty test effect with one visible plane and validate editor preview, generated texture, runtime JSON, Blocky compilation, and in-game rendering.
2. Run a real dedicated server with two independent clients. Verify start timing, radius selection, same-name replacement, explicit removal, natural expiry, disconnect, and dimension-change behavior.
3. Validate the implemented Fixed/Follow Entity anchor modes, then decide whether block and bone anchors are required.
4. Add schema validation for supported texture files, valid nonzero source ranges, broad timing safety bounds, and finite Bézier controls. Extend the version-1-through-version-4 loader boundary with explicit migrations when a future schema change cannot remain optional and backward-compatible.
5. Extend graph editing from outgoing easing into key values and optional speed-graph controls, then generalize those tracks for other material properties and add copy/paste, group value scaling, and per-key numeric tick editing. Keep Active directly editable on the main row, use stable object/keyframe IDs, and keep playback a pure function of authoritative start tick plus definition data.
6. Add the next render object type through the existing typed `objects` array. A 3D model object is the most direct next proof that the composition is not plane-specific; beams and trails can follow.
7. Define renderer and instance budgets before adding particle emitters or unrestricted looping effects.
8. Add persistent server authority and login/start-tracking synchronization before exposing indefinite effects in YCS or Blocky.

Do not pull GeckoLib, Specter, Satin, Photon, Veil, or Fabric APIs into the mod. Continue using the decompiled projects only as architectural references and preserve the zero Minecraft runtime-dependency rule.
