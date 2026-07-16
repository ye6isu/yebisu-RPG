# Ongoing Work

## Multi-Hitbox Parts feature (this session)

Added the ability for a YCS entity to have extra, independently-hittable hitboxes
("parts") that track a named bone every tick — the same mechanism vanilla's Ender
Dragon uses (`EnderDragonPart`/NeoForge's `PartEntity<T>`). Full design/architecture
is documented in `YCS_V3_Injection_and_Lifecycle.md`'s "Multi-Hitbox Parts" section
under Entities — read that first for the mechanism (server-safe bone solver,
`YcsMobPartEntity`, the "On Part Hit" Blocky hook). This file only tracks
session-to-session state/bugs found via live testing.

### Bugs found and fixed via live testing this session
1. **Parts invisible in F3+B and never hit-detectable at all** — `YcsMobEntity` never
   overrode NeoForge's `isMultipartEntity()` (defaults to `false`, separate from
   `getParts()`). Both the hitbox debug renderer and vanilla's part-aware entity
   lookups gate on this flag, not just on `getParts()` returning something. Fixed:
   `isMultipartEntity()` now returns `hitboxParts.length > 0`, matching `EnderDragon`.
2. **`ConcurrentModificationException` crash on `runClient`** — `ServerGeoModelLoader`/
   `ServerAnimationSampler`'s caches were plain `HashMap`/`HashSet`. In a `runClient`/
   singleplayer setup, the client tick thread and the integrated server's own tick
   thread both call `YcsMobEntity.tick()` concurrently, so these are genuinely
   multi-threaded. Fixed: switched both to `ConcurrentHashMap`/`ConcurrentHashMap.newKeySet()`.
3. **Parts visually "teleported" every tick instead of smoothly tracking their bone** —
   a `PartEntity` is never itself ticked by the level, so `Entity.setPos()` never
   updates its `xOld`/`yOld`/`zOld`. The F3+B debug renderer interpolates every
   entity's rendered position via `Mth.lerp(partialTick, xOld, getX())`, so a stale
   `xOld` made each tick's fresh position look like a jump. Fixed: `YcsMobEntity.
   tickHitboxParts()` now snapshots each part's pre-move position and restores it
   into `xOld`/`yOld`/`zOld` *after* moving all parts, exactly mirroring
   `EnderDragon.aiStep`'s own snapshot/restore dance around its `tickPart(...)` calls.
4. **Attacking a part's hitbox never forwarded damage to the parent entity** — root
   cause was a *timing* bug, not a forwarding-logic bug: `hitboxParts` was being
   built lazily on the first `tick()`, but vanilla registers a multipart entity's
   parts into the level's id-lookup table (`ServerLevel.dragonParts`, which combat/
   network entity-id resolution actually consults) exactly once — when the entity
   is first added to the level, via the tracking-start callback, before any tick
   ever runs. The array was still empty at that moment, so parts rendered fine but
   were never actually reachable by hit-detection. Fixed: `hitboxParts` is now built
   directly in `YcsMobEntity`'s constructor (matching exactly how `EnderDragon`
   builds its own `subEntities` array in its constructor), not lazily.

### Current known limitation — hard to position by hand
Right now a part is a plain axis-aligned box (`EntityDimensions.scalable(width,
height)`) centered on the tracked bone's **pivot point** — width/height are typed
numbers in the Hitbox Parts sub-page, with no offset field. This makes it genuinely
hard to line a part up with the actual mesh by hand (confirmed by the user directly
— "its hard for me to get the hitbox at the position as it is right now"), since a
bone's pivot is often at a joint (e.g. top of a leg), not the visual center of the
limb the part is meant to cover, and there's no way to nudge the box off-pivot.

## Not yet done / next session

1. **Blockbench-authored hitbox shape/offset (the actual next task, explicitly
   requested)** — instead of typing width/height + implicitly centering on the
   bone's raw pivot, let the user author the hitbox's size AND offset visually in
   Blockbench as a cube on the tracked bone/group, then have YCS read that cube's
   `origin`/`size` straight out of the already-imported `.geo.json` instead of
   free-typed numbers. Concretely:
   - Still fundamentally one axis-aligned `EntityDimensions` box at runtime — Minecraft
     has no rotated-hitbox concept, so this doesn't change *what* a part physically
     is, only *how it's specified* (removes the guesswork of manually typing an
     offset-less width/height).
   - Need a convention for *which* cube on the bone is "the hitbox" — e.g. first cube
     on the bone, or a specifically-named cube (like a cube literally named `hitbox`
     in Blockbench) so a bone can have both visible mesh cubes and a separate,
     invisible-in-game hitbox-defining cube.
   - Width/height derive from the cube's `size`; the offset is the cube's `origin`
     relative to the bone's own `pivot` — `BonePoseSolver.resolveBoneWorldPos` needs
     to add this local offset (still just a translation, no rotation) on top of the
     bone's resolved world position.
   - `EntityPartsPage.jsx` would drop the manual width/height fields (or keep them as
     a fallback/override) in favor of just picking the bone — the cube itself defines
     the box.
   - User explicitly deferred this to next session rather than doing it now — this is
     the concrete next task, not just a backlog idea.
2. Everything in `YCS_V3_TODO.md`'s Entities — Follow-up list for parts is still
   accurate/outstanding (no per-part rotation, no attacker-entity context in On Part
   Hit, no usage-scanner before delete) — this session's fixes were all bugs found
   via live testing, not new scope.
