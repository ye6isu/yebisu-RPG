# YCS ProjectJJK Burst Dash

This note records the ProjectJJK dash study and the separate YCS Blocky implementation added from it. The existing `entity.dash` block and `DashUtil` are unchanged.

## ProjectJJK Source Behavior

The reusable movement is `PlayerManager.dashPlayer(LivingEntity, int blocksTravel)`. The Dash ability calls it with `blocksTravel = 12`.

The movement method captures normalized look direction once, then runs four scheduled movement steps:

1. Two burst steps set velocity to `direction * (blocksTravel / 2) * 0.5`.
2. Two deceleration steps multiply current velocity by `1.0`, then `0.5`.
3. The completion step keeps `20%` of the remaining velocity.
4. Every active step marks the entity airborne and marks its movement dirty for synchronization.

ProjectJJK schedules those steps every 20 milliseconds, independently of Minecraft's 50-millisecond server tick. YCS preserves the phase behavior but runs it on the authoritative server tick so movement stays deterministic and does not mutate an entity from an asynchronous scheduler.

The ProjectJJK `Dash` ability wrapper also adds behavior that is not part of `dashPlayer`:

- a start Flash VFX at player position plus 0.5 Y, scale 3;
- two crossed Impact VFX 150 milliseconds later at 1.5 blocks along the captured direction, scale 4;
- two sounds;
- a 60-tick status effect with amplifier 4, identified by the source's `speedBuff` constants as its Speed buff;
- ability cooldown 10, damage 0, and cost 0 from `AbilityRegistry`.

Those extras were not folded into the movement block. They should be composed explicitly with VFX, sound, status-effect, and ability cooldown blocks so the new dash remains reusable.

## Independent YCS Implementation

Blocky opcode: `entity.projectjjk_dash`

Palette label: `JJK Burst Dash`

Runtime: `net.ye6isu.yebisuRPG.util.ProjectJjkDashUtil`

The runtime owns its own active-state map and tick listener. It does not call, cancel, query, or share state with `DashUtil`. Consequently:

- `Is Dashing?` reports only the existing smooth `DashUtil` state;
- `Cancel Dash` cancels only the existing smooth dash;
- starting a JJK Burst Dash does not cancel an active smooth dash;
- running both on the same entity at once is unsupported because both systems write entity velocity.

## Editable Block Fields

| Field | Default | Runtime bounds | Meaning |
|---|---:|---:|---|
| Entity | Event Entity | Any server-side entity | Entity whose velocity is controlled |
| Direction X | 0 | Normalized with Y/Z | Custom direction component |
| Direction Y | 0 | Normalized with X/Z | Custom direction component; look-direction fallback includes pitch |
| Direction Z | 0 | Normalized with X/Y | Custom direction component |
| Travel | 12 | -256 to 256 | ProjectJJK's `blocksTravel` value; negative values reverse direction |
| Burst Ticks | 2 | 1 to 200 | Number of ticks that repeatedly set burst velocity |
| Deceleration Ticks | 2 | 0 to 200 | Number of linear multiplicative slowdown steps |
| End Momentum | 0.2 | 0 to 1 | Fraction of current velocity retained when the burst finishes |
| Force Airborne | On | Boolean | Calls `setOnGround(false)` during active steps, matching ProjectJJK |

The default zero vector makes the runtime use the entity's look direction, matching ProjectJJK without nesting extra default blocks in Blocky. Authors can link Look Direction or Direction value blocks when they need explicit components. The ProjectJJK `0.5` burst multiplier remains an internal compatibility constant. With defaults, burst speed is `12 / 2 * 0.5 = 3` blocks of velocity per server tick before collision/physics effects.

## Synchronization Category

This movement **rides on vanilla entity movement synchronization, no extra payload is needed**. The block runs on the logical server, calls `setDeltaMovement`, and sets `hurtMarked` on every active step and at completion so vanilla sends the changed motion to clients.

The active phase state itself is server-only and short-lived. It is removed when the phase completes, the entity is removed, or a player logs in/out. No client-side gameplay decision depends on the local phase state.

## Verification Still Needed

- Confirm the default burst feel against ProjectJJK in a real client; server-tick scheduling is intentionally safer but cannot exactly reproduce its 20-millisecond asynchronous timing.
- Test player and non-player entities against walls, slopes, air movement, and high latency.
- Test on a dedicated server with two independent clients.
- Decide later whether this separate family needs its own `Is JJK Burst Dashing?` and `Cancel JJK Burst Dash` blocks.
