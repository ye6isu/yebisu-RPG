# Ongoing Work

## Entity Creator (new this session)
Added a bare-minimum "Entity Creator" to YCS — custom mobs with id, display name, texture, geo model, `.animation.json`, idle/walk animation names, and max health/movement speed/hitbox stats. Verified working in-game (`/summon yebisurpg:testerent` renders and animates correctly as of this session).

**Scope, deliberately narrow:** passive wander + look-at-player AI only (no combat/targeting), no death/hurt/attack animations, no sounds, no loot table, no breeding/taming, no spawn egg (test via `/summon`). Full writeup: `YCS_V3_Injection_and_Lifecycle.md`'s new `## Entities` section. Follow-up gaps tracked in `YCS_V3_TODO.md`'s `## Entities — Follow-up`.

**Architecture, one generic class per concern (not one class per mob):**
- `net.ye6isu.yebisuRPG.entity.custom.YcsMobEntity` — the single `PathfinderMob` subclass every YCS mob shares.
- `net.ye6isu.yebisuRPG.entity.ModEntities` / `ModEntityEvents` — `EntityType` registration + `EntityAttributeCreationEvent` attribute wiring (a **separate mechanism** from the existing custom-`Attribute`-type system in `attribute/ModAttributes.java`).
- `net.ye6isu.yebisuRPG.entity.client.GeoEntityModelLoader` / `GeoEntityModel` / `GeoEntityRenderer` / `ModEntityRendererRegistry` — geo model parsing + rendering.
- New YCS frontend page: `ycs/src/components/EntitiesLanding.jsx`, wired into `App.jsx`'s Registry sidebar group.
- New Tauri commands (`ycs/src-tauri/src/lib.rs`): `import_animation_file`/`load_animation_file_path`/`delete_animation_file`/`copy_animation_file_to_mod`/`rename_animation_file`, mirroring the existing geo-model commands.

**Two real bugs hit and fixed during this session, both worth remembering:**
1. **`PathfinderMob` requires `Attributes.FOLLOW_RANGE`** — its constructor builds a `GroundPathNavigation` immediately, before any data-driven config runs, and that reads `FOLLOW_RANGE` off the attribute map. Omitting it threw `IllegalArgumentException: Can't find attribute minecraft:generic.follow_range` *during entity construction*, which vanilla's `EntityType.loadStaticEntity`/`SummonCommand` catch silently and surface only as a generic "Unable to summon entity" in chat — the real stack trace only ever appears in the server log (`"Exception loading entity: "`). Fixed by hardcoding `FOLLOW_RANGE` (16.0) into `YcsMobEntity.createAttributes`, not exposing it as a YCS field. **Lesson: for any future "silently fails to spawn/load" symptom, check the log first, not the chat message.**
2. **Bedrock geo models don't fit vanilla's `ModelPart`/`CubeListBuilder` API** — vanilla's cube builder only supports the single classic "box UV" layout (one `[u,v]` origin), with no public API for Bedrock's per-face UV objects (`"uv": {"north": {...}, "east": {...}, ...}`), which is exactly what `uploaded/tester.geo.json` uses. Solved by **not** using `ModelPart` at all — `GeoEntityModelLoader` now parses into the same `BakedGeoModel`/`BakedBone`/`BakedCube` records `GeoItemRenderer` already uses for items (promoted from private to shared public types), and `GeoEntityModel.renderToBuffer` does manual per-face vertex emission ported from `GeoItemRenderer.renderBone`/`renderCube`/`quad`/`emitPerFace`, correctly handling both UV layouts.
3. **Reusing that item-pipeline math inside the entity pipeline rendered mobs upside down** — `LivingEntityRenderer.render` (vanilla's mob path) already applies its own `poseStack.scale(-1,-1,1)` before calling into the model, a flip `GeoItemRenderer`'s own pipeline (`renderByItem`) never applies. Fixed with one extra compensating `poseStack.scale(1,-1,1)` in `GeoEntityModel.renderToBuffer`. **Lesson: when porting PoseStack/geometry math between the item and entity render pipelines, check what transform the calling pipeline already applied — don't assume it transfers as-is.**

**Not yet done / next session:**
- Broader launch-testing beyond the one `testerent` test entity (different bone counts/hierarchies, box-UV-only cubes, multi-cube bones).
- Everything in `YCS_V3_TODO.md`'s Entities Follow-up list (no usage-scanner before delete, no animation-name validation in the editor, etc).
- Not reconciled into a "Chopping Block" or scoped-out item yet — Entities is now a real, working YCS category, not a stub.
