# yebisuRPG — Design Plan

## Vision

An anime/roguelike/MMORPG-inspired RPG overhaul mod for NeoForge 1.21.1, built with **zero
dependency on other mods**. Combat, stats, and resource systems are inspired by League of
Legends/ARAM-style itemization and ARPGs (PoE/Diablo/Risk of Rain 2), skinned with
anime-flavored kits (One Piece, Bleach, Naruto, JJK, Demon Slayer, etc.) and roguelike/MMO
mechanics (Ember Knights, Vellum, Wizard of Legends, Genshin, Deadlock, etc. — referenced for
mechanic ideas, not ported wholesale).

Mobs and players both scale into very large stat ranges (PoE/Diablo-style numbers), which is
why `AttributeRangeFix` (native, no AttributeFix dependency) raises vanilla's attribute ceilings
— see `src/main/java/net/ye6isu/yebisuRPG/attribute/AttributeRangeFix.java`.

---

## Core architectural rule: pick the right tool per stat

The single biggest risk to a multiplayer server here is treating every stat the same way.
Three different update patterns exist, and mixing them up is the classic cause of attachment-
sync lag on a busy server:

| Stat shape | Example | Mechanism | Why |
|---|---|---|---|
| **Modifier-stack value**, recalculated only when a modifier is added/removed | Armor, AD, AP, Crit Chance, Pen, Haste, Movement Speed | Vanilla `Attribute` + `AttributeModifier` | Vanilla already caches the computed value and only re-syncs on change — proven at scale, free engine support. Equipment/buffs/abilities add/remove named modifiers; never recomputed on a timer. |
| **Regenerating resource pool**, needs HUD visibility + persistence | Vigor, Spirit, Mana (see below) | `EntityVarMap` (existing custom system), but regen must be throttled — see "Resource pools" below | Needs to be synced (so the bar updates client-side) and persisted (NBT), but naive per-tick `setInt` floods the sync channel. Regen must accumulate locally and only push a synced update when the *displayed* value changes, or on a fixed slow interval — not every tick. |
| **One-time roll at spawn**, never (or rarely) recomputed | Random ability + scaling value rolled when a mob spawns | `EntityVarMap.define(...)` once on spawn | Cheapest possible case — a single write, no tick cost, already synced/persisted by the existing system for free. |
| **Stack-counter with threshold payoff** | Elemental passives (Burn stacks, Frostbite stacks, Charges, Marks, Grace, etc.) | Own small subsystem (see "Elemental passives" below) — *not* `EntityVarMap` and *not* a generic Attribute | Short-lived, gain-on-event, decay-over-time, trigger-at-max-stack. Different lifecycle from both of the above; deserves dedicated code rather than overloading either system. |

**Rule of thumb:** if a value is an *input to a formula* (damage calc, defense calc), it's an
Attribute. If a value is a *resource the player spends and watches drain/refill on a bar*, it's
a throttled `EntityVar`. If it's *rolled once and read many times*, it's a one-time `EntityVar`
define. If it's a *short-lived stacking counter that pays off at a threshold*, it's its own
subsystem.

---

## Combat stats (League-of-Legends-style sheet)

All of the following are modifier-stack values — implemented as custom `Attribute`s registered
alongside vanilla's (`ATTACK_DAMAGE`, `ARMOR`, `MOVEMENT_SPEED` already exist; the rest are new):

- Attack Damage (AD), Ability Power (AP)
- Attack Speed, Critical Chance, Critical Damage
- Armor Penetration, Magic Penetration
- Ability Haste
- Range
- Max Health, Health Regeneration
- Armor, Magic Resistance (MR)
- Tenacity (CC duration reduction %)
- Evasion (dodge chance %)
- Lifesteal, Spellvamp, Omnivamp
- Movement Speed
- Luck (drop rate / crit nudge)

Equipment, buffs, and abilities attach/detach named `AttributeModifier`s. The damage/defense
formula reads the *cached* attribute value at hit-time — never recomputed on a timer, never
synced as a side value; only the resulting HP change (already a vanilla-synced field) reaches
clients. This is the same mechanism vanilla uses for thousands of mobs in survival servers
today, so it's the safe default for "always being calculated, must not lag in multiplayer."

`AttributeRangeFix` raises the ceiling on these (see that file) so PoE/Diablo-scale numbers
don't get silently clamped by vanilla's conservative defaults.

---

## Resource pools

Each IP-flavored resource (Chakra, Reiryoku, Cursed Energy, Nen, etc.) is its own
**mechanically distinct pool** — not a relabeled copy of a shared bucket. They will differ in
regen rules, modifiers that affect them, and in-game behavior.

**Starting point:** Stamina and Mana are the first two pools to implement. These nail the
pattern (regen rate, max size, current value, HUD sync) so every future pool can be stamped
from the same template without redesigning anything.

### Pool anatomy (applies to every pool)

Each pool has three independent values:

| Value | Shape | Mechanism |
|---|---|---|
| **Max pool size** | Modifier-stack input | Custom `Attribute` — gear/buffs/debuffs add/remove named modifiers, vanilla caches it, never recomputed on a timer |
| **Regen rate** | Modifier-stack input | Custom `Attribute` — same as above; items/effects that "increase regen rate" attach a modifier here |
| **Current amount** | Throttled synced resource | `EntityVar` (int or float) — accumulates locally, only pushes a sync when the displayed value changes or a slow fallback interval fires |

The current amount drains on ability/action use and refills via the regen rate attribute.
Max size caps the current amount. The regen rule (when/how fast it ticks up) is the thing
that will differ per pool as the IP roster expands.

### Starting pools

| Pool | Regen rule | Notes |
|---|---|---|
| **Stamina** | Flat passive regen (constant, no action-pause to start) | Physical activities (sprinting, melee, dodging) will drain it; regen rate and max are Attribute-driven |
| **Mana** | Flat passive regen; primary recovery via potions/passives | Spellcasting drains it; same Attribute-driven regen/max shape as Stamina |

Both will eventually gain more nuanced regen rules (e.g. Stamina pausing during sprint, Mana
spiking on hit) — but starting with flat passive regen keeps the first implementation simple
and correct, and the rule change is isolated to the regen-tick logic without touching the
sync/attribute plumbing.

### Who has pools — players AND mobs

All `LivingEntity` instances (players and mobs) carry the pool system. Reasons:

- Abilities are resource-gated for players. If the same ability on a mob is free, mobs
  become infinitely oppressive (unlimited uptime) — a real balance problem once abilities
  have any real power budget.
- `EntityVarMap` / `EntityVarCapability` already work on any `LivingEntity`, so there is no
  architectural cost to giving mobs a pool.
- Only players need a HUD bar. Mobs just need the number server-side so the cost-check works.

Mob pool values (max size, regen rate) are assigned at spawn — fixed per-mob-type or scaled to
mob level — rather than driven by gear modifiers. The underlying mechanism is identical; only
the source of the modifier values differs.

### Throttling rule (applies to all pools)

Never call the synced `EntityVar` setter every tick. Accumulate regen in a plain server-side
(unsynced) field; push to the synced var only when:
- the displayed/rounded value actually changes, **or**
- a fixed slow fallback interval elapses (e.g. every 5–10 ticks).

This turns "20 syncs/sec/entity" into roughly "1 sync per visible bar-tick" — the difference
between fine and laggy on a populated server.

---

## Elemental passives

Ten elements, each with a build-up-stack passive that pays off at max stacks:

| Element | Stack mechanic | Payoff at max stacks |
|---|---|---|
| Fire | Burn stacks (DoT, extends other debuffs) | — |
| Water | Fluidity stacks on self | Next ability free + cooldown reset |
| Earth | Stability stacks on self | Next attack: guaranteed Armor Break + Stun |
| Air | Momentum stacks on successful evade | Next attack: massive range + penetration |
| Ice | Frostbite stacks on target (via Slow/Root) | Full Freeze + Shatter damage |
| Lightning | Charges on target | Consume for burst/chain damage |
| Light | Grace stacks (on shield/debuff-cleanse) | Purify nearby allies + temp CC immunity |
| Dark | Shadow Marks on target | Execute damage + self Omnivamp |
| Metal | Hardening stacks on self (on dealing physical dmg) | Pierce armor + temp invulnerability |
| Life | Vigor-charge stacks (on damage or healing) | Strong HoT + restore target's resource pool |

**Open design question:** whether one entity can have multiple elements' stack-counters live
simultaneously (multi-element builds) or commits to one element at a time (single-element
kit/class choice). Affects whether the subsystem needs to track N independent stack-counters
per entity or just one.

Implementation should be its own small system: a per-entity map of `element -> stack count`
with decay-over-time and an event hook that fires the payoff and resets the counter at max
stacks. Not `EntityVarMap` (wrong lifecycle — these are short-lived and decay, not persistent
resource pools) and not `Attribute` (the payoff is a triggered effect, not a continuous
modifier).

---

## Mob spawn randomization

Mobs may be granted a random ability (e.g. a Devil-Fruit-style power or an ability-infused
weapon) at spawn, with a randomized scaling value (e.g. bonus AD feeding that ability). This is
a **one-time roll**: decide the ability + roll the scaling value once in the mob's spawn hook,
write it via `EntityVarMap.define(...)` (idempotent, safe, cheap), and never touch it again
unless the design calls for re-rolling. No tick cost, already covered by the existing
sync/persistence system for free.

---

## Existing infrastructure already in place

- `EntityVarMap` / `EntityVarCapability` / `EntityVar` (`data/` package) — per-entity typed
  key-value store (int/float/bool/string/item), dirty-tracked sync to clients, NBT-persisted.
  Use for resource pools (throttled) and one-time spawn rolls. **Do not** use for combat-stat
  inputs (armor/AD/etc.) or elemental stack-counters — wrong tool for those, see table above.
- `AttributeRangeFix` (`attribute/` package) — Mixin-based raise of vanilla `RangedAttribute`
  ceilings (max_health, armor, armor_toughness, attack_damage, attack_knockback,
  movement_speed), native implementation (no AttributeFix dependency).
- YCS (`ycs/` — the visual mod-creator app) — has a "Variables" tab that manages `EntityVar`
  declarations visually, and the block-script canvas has Get/Set Variable blocks wired to
  whichever type the variable is. Useful for one-time-roll-style variables and prototyping;
  combat Attributes and elemental stack-counters are out of YCS's current scope and would need
  hand-written Java (or new YCS tooling, not yet built).

---

## Open decisions to resolve before implementation

1. **Elemental multi-build** — single element per entity, or stackable multi-element kits?
   Determines whether the stack-counter subsystem needs to support N concurrent counters per
   entity or just one.
2. **Kit/class system shape** — how a player's chosen anime-flavored kit maps to (a) which
   resource pool they use, (b) which elemental passive(s) they have access to, (c) which
   combat-stat modifiers their kit's abilities grant. Not yet designed.
3. **Mob pool assignment** — fixed values per mob type (e.g. Zombie always spawns with 50 max
   Stamina, 2/s regen), or scaled to mob level, or randomized at spawn the same way abilities
   are? Resolve before implementing mob-side pool initialization.
