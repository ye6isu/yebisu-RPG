# VFX Decompiled Architecture Study

This note records the architecture study behind the YCS VFX Creator suite and Blocky-triggered in-game playback. It is analysis, not the current implementation contract. The exact implemented behavior, file map, limitations, and continuation order are documented in `YCS_VFX_Current_State.md`.

## Reference Set

| Reference | Version | Location | Role |
|---|---:|---|---|
| Photon | 2.2.0 | `Decompiled/VFX/Photon/` | Full VFX authoring suite, effect scene/timeline, emitters, runtime playback, materials, and post-processing |
| Veil | 4.3.0 | `Decompiled/VFX/Veil/` | General rendering framework; its Quasar subsystem provides data-driven particle emitters and modules |
| ProjectJJK | 1.2.0 (Fabric, Minecraft 1.21.1) | `Decompiled/ProjectJJK/` | Production examples built from synchronized VFX entities, GeckoLib planes/models, frame textures, particles, and post-processing |

Photon's metadata also declares LDLib2 and KilaGraph as required dependencies. Its editor and serialization helpers therefore cannot be treated as standalone Photon code. Veil is similarly much larger than Quasar and installs broad renderer, shader, framebuffer, resource, mixin, and compatibility infrastructure.

The source trees are decompiler output. Obfuscated package names such as `p000fx` and the incomplete body of `FXRuntime.emit(...)` are artifacts that must not be copied as authoritative source.

## Architectural Comparison

| Concern | Photon | Veil / Quasar | Direction for YCS |
|---|---|---|---|
| Authoring model | Hierarchical scene objects plus a multi-track timeline | Inspector editing of registry-backed particle data | Use a YCS hierarchy and timeline, backed by ordinary JSON |
| Persistent format | `.fxproj` and exported compressed-NBT `.fx`; separate `.fxpack` assets | Multiple JSON dynamic registries loaded from client resources | Keep one complete YCS JSON per effect; generate runtime JSON/resources |
| Composition | Polymorphic FX objects: empty/group, particle, beam, trail, Ara trail, force field | One emitter references shapes, particle settings, particle data, and reusable modules | Use typed emitters/nodes with modular settings and stable IDs |
| Animation | Timeline tracks, clips, curves, gradients, expressions, signals, speed/control/post-process tracks | Per-particle modules and Molang expressions; no equivalent effect-wide hierarchy/timeline in Quasar | Start with curves/gradients and emitter activation tracks; add expressions only where needed |
| Runtime | `FXRuntime` copies effect data into a UUID object tree and drives it through a root executor | `ParticleSystemManager` owns emitters; each emitter owns and ticks its particles | Separate immutable definitions from mutable effect/emitter/particle instances |
| Rendering | Minecraft particle host plus custom render-pass pipelines, materials, meshes, bloom, and post-FX | Veil render stages, cached buffers, registered render styles, trails, shaders, and lights | Build a narrow renderer for supported VFX; do not reproduce an entire rendering framework |
| Playback anchor | Entity and block executors with transform offset/rotation/scale | World position or attached entity | Support world/entity anchors explicitly in the runtime schema and payloads |
| Reload | Effect cache and mesh/resource reload hooks | Dynamic client-resource registries and reload listener | Add a client resource reload listener that atomically rebuilds the VFX definition cache |

## Photon Findings

### Authoring Surface

`FXEditor` composes three primary work areas:
- a draggable hierarchy of FX objects on the left;
- a live 3D scene preview in the center;
- a timeline across the bottom.

Selection drives a generated inspector. The hierarchy supports parent/child transforms, reordering, multi-selection, visibility toggles, and transform gizmos. The preview owns an isolated particle manager with play, pause, reset, time scrubbing, draw modes, bloom, and post-effect preview.

The timeline is not merely an emitter start list. It supports grouped tracks, activation/control, animation properties, clips, curves, gradients, expressions, signals, audio, speed, and post-process tracks. Runtime bindings expose selected emitter properties to animation tracks.

This is the strongest reference for YCS editor ergonomics, but most of the UI implementation comes from LDLib2 and cannot be reused directly in the Tauri/React YCS frontend.

### Data And Serialization

`FXData` contains a list of `IFXObject` instances plus a `Timeline`. Each object serializes through a registry-dispatched codec whose wrapper stores the object type and its data. `FXObjectType` supplies construction, version migration, animatable properties, and runtime bindings.

The project is versioned (`FXProject.VERSION = 5`). Editor projects serialize through NBT, while exported effects are compressed `.fx` files under `assets/<namespace>/fx/<path>.fx`. `FXHelper` loads those client resources, applies data fixers, and caches definitions. Newer asset packaging is separated into `.fxpack` files rather than embedding resources inside every effect.

Useful concepts for YCS:
- stable typed object identifiers;
- per-object format versions/migrations;
- definition cache invalidated on resource reload;
- resources separated from effect structure;
- deep-copy definitions into mutable runtime instances.

YCS should not adopt compressed NBT as its authoring source. It conflicts with the V3 rule that complete, inspectable JSON under `ycs-data/` is the source of truth.

### Object And Emitter Model

Photon registers these effect object families: group/empty, particle emitter, beam emitter, trail emitter, Ara trail emitter, and force field. Every object has a transform and inherited active, visible, and time-scale state.

The particle emitter uses a large `ParticleConfig` split into focused settings:
- duration, looping, delay, lifetime, speed, size, rotation, color, simulation space, and maximum particle count;
- emission rate and distance emission;
- shape;
- renderer/material/model;
- physics and collision;
- velocity, inherited velocity, forces, gravity, and noise;
- color/size/rotation/light over lifetime or by speed;
- UV animation, trails, sub-emitters, and custom GPU data.

Scalar values are not limited to constants. Photon models constants, random ranges, curves, random curves, gradients, and expressions behind common number/color functions. That type pattern is directly useful for YCS fields, even if the initial implementation supports only constants, ranges, curves, and gradients.

### Runtime And Playback

`FXRuntime` creates a root object, indexes all objects by UUID, restores the transform hierarchy, and owns a `TimelinePlayer`. On emission, every object receives an effect executor and delay, while the root updates the timeline.

Entity and block executors create runtime instances, apply offsets/rotation/scale, and keep static caches to prevent duplicates unless `allowMulti` is enabled. Entity effects update their root transform from the attached entity each frame. Block effects terminate when the target block unloads or changes. A generation/tick-host check invalidates runtimes after particle-manager resets or missed host ticks.

Photon sends clientbound start and remove payloads for entity- and block-bound effects. The actual effect simulation remains client-side. This is a useful trigger boundary, but YCS must use its existing common/client proxy pattern so payload registration never directly loads client-only handlers on a dedicated server.

### Rendering

Photon integrates its FX objects with a particle manager and custom render passes. It supports sprite and texture materials, block atlases, custom shaders, shader graphs, JSON/OBJ meshes, instanced rendering, beams, trails, bloom, masks, and post-processing graphs.

That breadth is not a sensible first milestone for YCS. Shader graphs, post-processing, mesh particles, and GPU custom-data streams multiply renderer and editor complexity and should remain later phases.

## Veil / Quasar Findings

### Resource Composition

Quasar is built around five client-resource dynamic registries:
- modules;
- particle data;
- particle settings;
- emitter shape settings;
- emitters.

An emitter definition contains maximum lifetime, looping, rate, burst count, particle cap, emitter settings, and a particle-data reference. Emitter settings reference one or more shapes plus particle settings. Particle data contains collision/velocity-facing/render-style flags, sprite data, blend mode, and a list of modules.

The separation allows reuse but creates many cross-file references. For YCS authoring, one complete JSON per VFX object remains preferable. The injection/export step can normalize or split runtime assets later if profiling or reuse justifies it.

### Extension Registries

Quasar registers emitter shapes (point, hemisphere, cylinder, sphere, cube, torus, disc, and plane), render styles (billboard and cube), and module types. Module data dispatches by a registered `module` type and adds one or more runtime modules to a `ParticleModuleSet`.

The available module families include:
- initialization: initial velocity, size, random rotation, block appearance, light/lightmap, and sub-emitter;
- update/render: color, size, trail, and timed sub-emitter;
- collision: die or spawn a sub-emitter;
- forces: gravity, drag, wind, point force/attractor, vortex, and vector field.

This typed-module registry is the strongest reference for making YCS VFX extensible without a monolithic particle class.

### Runtime Lifecycle

`ParticleSystemManager` is client-level scoped. It owns emitter instances, schedules ticks, caps the system at 10,000 particles, trims distant non-forced emitters under pressure, sorts emitters by camera distance, and renders them through Veil's render stage.

Each `ParticleEmitter` copies values from its definition, schedules repeated spawning, follows either a world offset or attached entity, ticks owned particles, and stays alive until both the emitter and its particles finish. Spawning samples every configured shape, builds a phase-sorted `ParticleModuleSet`, initializes the particle, and enforces per-emitter/global caps.

Each `QuasarParticle` owns mutable position, velocity, rotation, radius, age, bounding box, render state, and a memoized Molang environment. Its tick order is:
1. update render interpolation state;
2. refresh enabled render modules;
3. run update modules;
4. apply force modules;
5. move and resolve collision;
6. age and expire.

Rendering then runs enabled render modules and the selected render style. Trails are rendered as separate per-particle geometry.

### Editor And Rendering Framework

Veil's particle inspector creates a mutable preview emitter and exposes its emitter, shape, particle, module, and render settings through ImGui. It can restart spawn scheduling when rate or lifetime changes and renders debug shape/direction guides.

This validates live preview and mutable working-copy editing, but YCS should implement those ideas with its existing React component system and styling masterlist. Pulling Veil's editor would also pull ImGuiMC and Veil's resource-editor environment.

Veil registers Quasar rendering after weather through its own event abstraction and cached buffer source. It also owns shader programs, dynamic buffers, framebuffers, post-processing, lighting, Sodium/Iris compatibility, and many mixins. Reproducing that framework is outside the VFX Creator's required boundary.

## ProjectJJK Findings

ProjectJJK's reusable VFX base is `VFXEntity`. Each concrete effect is a real server-spawned entity whose tracked data includes model type, color, scale, lifetime, repetition count, movement target/speed, scale speed, spin, animation resource, rotation, and position. Vanilla entity tracking therefore supplies its cross-client synchronization and lifecycle.

The common `VFXRenderer` and `VFXModel` are GeckoLib renderers. The basic `PLANE32` model is a thin 16x16 Bedrock cube with only its up/down faces mapped; `PLANE32_FOURWAY` crosses four rotated planes. Concrete effects such as `Flash32VFX` provide arrays of separate frame textures and advance the current frame during entity ticks. `LaserBeamVFX` switches to a 3D Bedrock model and GeckoLib animation controllers.

ProjectJJK also uses a separate Specter particle-behavior path for lightweight following. Particle effect codecs carry a behavior identifier plus a target entity ID. `FollowEntityBehavior` resolves that already-tracked client entity and moves the particle to its position each client tick; `FollowEyePlayerOnAbilityHoldBehavior` additionally preserves the initial eye-relative distance, recomputes position from the target's current eye/view vector, and updates yaw/pitch. This avoids per-tick custom position packets, but the implementation belongs to the bundled Specter runtime and clones behavior state per particle.

This confirms that textured planes, crossed planes, and animated models can share one transform/lifetime system. It is not a dependency-free implementation reference:
- plane/model baking and rendering come from the bundled GeckoLib 4.6.6 jar;
- post-processing comes from the bundled Satin 2.0.0 jar;
- the larger custom-particle library comes from the bundled Specter 0.1.0 jar;
- Fabric API supplies platform registration/networking, while BossBarLib, MidnightLib, and SmartBrainLib serve unrelated systems.

For YCS, using one synchronized entity per cosmetic plane would be simple but unnecessarily expensive for effects that need many objects. The implemented runtime instead sends one compact effect-instance payload and renders all child planes directly on each client. Its Follow Entity mode applies the useful Specter boundary once per whole effect: the payload carries one anchor entity ID, and the client resolves one vanilla-synchronized entity transform per effect per rendered frame before drawing every child. This avoids GeckoLib, Specter, per-object entity tracking, per-child behavior clones, and per-tick custom transform packets.

## Proposed YCS Boundary

The first YCS implementation should combine Photon's authoring model with Quasar's typed runtime modules while remaining native to this repository:

1. `ycs-data/vfx/<id>.json` is the complete editor source of truth, including `_injections`.
2. Shared texture assets continue to live in `ycs-data/textures/`; effect JSON references them by ID.
3. Save generates a runtime effect definition under mod resources and tracks it as a `created-file` injection.
4. Client resource reload parses all generated definitions into an immutable cache.
5. A client `VfxManager` owns mutable `VfxInstance` objects; each instance owns typed emitters, which own particles.
6. Definitions use stable node/emitter IDs so timeline tracks and Blocky parameters do not depend on array indexes.
7. The editor provides hierarchy, inspector, live 3D preview, transport controls, and an activation/property timeline without copying either reference UI.

Recommended first renderer scope:
- billboard sprite particles;
- alpha and additive blending;
- point, box, sphere, circle/disc, and cone shapes;
- rate and burst emission;
- lifetime, speed/direction, local/world simulation space, gravity, drag, and basic collision;
- constant/random/curve size and color/alpha over lifetime;
- spritesheet animation;
- world-position and entity anchors;
- multiple emitters activated on a shared effect timeline.

Defer beams, trails, mesh particles, force fields, sub-emitters, dynamic lights, shader graphs, post-processing, vector fields, and arbitrary expression execution until the base definition/runtime/editor loop is tested in-game.

## Initial Plane Milestone

The first implementation uses `ycs-data/vfx/<id>.json` as its complete editor source. Its `objects` array currently accepts `plane` objects with stable IDs, transform, width/height, billboard/fixed orientation, color/opacity, full-bright mode, texture spritesheet settings, and an activation range inside the effect duration.

Save copies each plane's selected shared texture into an effect-owned runtime path, writes `assets/yebisurpg/vfx/<id>.json`, injects the common duration registration into `VfxRegistry`, and records every output in `_injections`. The editor already treats planes as objects in a hierarchy/list rather than making the whole effect a plane-specific template, so later object types can join the same array and timeline.

At runtime, `VfxService` validates the authored effect on the server, allocates one instance UUID, records a named per-owner handle for Blocky removal/replacement, and sends one start payload to nearby players. The payload contains instance/effect identity, fallback origin/rotation, optional entity-anchor information, and authoritative start tick. Clients load the full definition from resources, derive texture frames from the shared tick, optionally resolve the vanilla-synchronized anchor transform, render child planes in `AFTER_PARTICLES`, and expire them locally from the registered duration. Explicit removal sends only the instance UUID to every recorded recipient.

This milestone intentionally supports finite one-shot instances only. Persistent/looping effects still require login/start-tracking resynchronization and a durable active-instance store before they are exposed in YCS.

## Blocky And Dedicated-Server Contract

In-game VFX are cosmetic on clients, but the existence, identity, anchor, and start/stop time of an effect instance are dynamic cross-client state. This category **needs explicit server authority and sync**.

Blocky must call a server-safe VFX service, not a client renderer. The service should validate the effect ID and target, allocate an instance ID, and send a clientbound payload containing at least:
- effect ID and instance ID;
- anchor kind and position/entity ID;
- transform parameters;
- deterministic seed;
- authoritative server game-time start tick;
- playback flags/parameters.

Clients simulate particles locally from that definition, seed, and shared start tick; individual particles are never network-synchronized.

One-shot effects can be sent to the players tracking the anchor when triggered. Persistent or looping effects require a server-side active-instance store plus start/stop payloads and resynchronization on login/start-tracking, following the `TextureAuthority`/`TextureServerEvents` pattern. A late client can reconstruct the correct elapsed time from the authoritative start tick and deterministic seed or fast-forward within a defined budget.

Payload registration must remain in common code and resolve rendering handlers only after a client distribution check. No Blocky compiler output or gameplay path may reference `Minecraft.getInstance()` or a client-only VFX class.

## Risks To Resolve Before Implementation

- Define hard per-effect, per-emitter, and global particle budgets before exposing unrestricted counts in YCS.
- Decide whether resource-pack reload is sufficient after YCS Save or whether the development client needs an explicit cache refresh command.
- Specify deterministic random sampling and catch-up behavior so two clients starting on different frames see acceptably equivalent playback.
- Design persistent-effect cleanup for entity removal, dimension changes, disconnects, and Blocky stop calls.
- Keep the runtime schema versioned and migratable from its first checked-in format.
- Treat the reference licenses and decompiled output conservatively: reuse architecture concepts, not copied implementation bodies.
