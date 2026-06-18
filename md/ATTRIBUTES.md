# Attribute Reference

All attributes available in the mod. YCS block uses the constant name (e.g. `ModAttributes.SCALE_JUMP_HEIGHT`).

## Vanilla vs. yebisurpg scale attributes

Vanilla attributes store an **absolute value** — the game reads the number directly (e.g. `movement_speed = 0.3` means 0.3 units/tick). The `yebisurpg:scale.*` attributes are **multipliers applied on top** of whatever vanilla returns. If vanilla `movement_speed` is `0.3` and `yebisurpg:scale.motion` is `2.0`, the effective speed is `0.6`.

Where both a vanilla attribute and a yebisurpg scale attribute cover the same stat, the rows below note the overlap explicitly. In general: **use vanilla to set the base, use yebisurpg scale to multiply it**.

`minecraft:scale` (added in 1.20.5) is the only vanilla attribute that is itself a multiplier — it scales the entity's model, hitbox, shadow, and eye height all together in one value. The yebisurpg scale attributes let you do that same thing but **individually per dimension** (e.g. tall hitbox, normal-sized model).

---

## Vanilla Attributes (`net.minecraft.world.entity.ai.attributes.Attributes`)

These exist on all `LivingEntity` types by default. Use via `Attributes.CONSTANT_NAME`.

| Constant | Registry ID | Default | Description |
|---|---|---|---|
| `MAX_HEALTH` | `minecraft:max_health` | 20 | Maximum health points (half-hearts). **Overlap:** `yebisurpg:scale.health` multiplies the value this returns. |
| `FOLLOW_RANGE` | `minecraft:follow_range` | 32 | Distance at which mobs track their target. |
| `KNOCKBACK_RESISTANCE` | `minecraft:knockback_resistance` | 0 | Reduces knockback taken (0–1, 1 = immune). |
| `MOVEMENT_SPEED` | `minecraft:movement_speed` | 0.7 | Base walk speed in units/tick. **Overlap:** `yebisurpg:scale.motion` multiplies the movement vector after this value is applied — both can be set independently. |
| `FLYING_SPEED` | `minecraft:flying_speed` | 0.4 | Base flying speed for mobs that fly (bees, parrots, etc.). **Overlap:** `yebisurpg:scale.flight` (not yet hooked) would multiply this. |
| `ATTACK_DAMAGE` | `minecraft:attack_damage` | 2 | Absolute damage per melee hit (half-hearts). **Overlap:** `yebisurpg:scale.attack` multiplies the incoming damage value after armor, not this attribute directly — they stack. |
| `ATTACK_KNOCKBACK` | `minecraft:attack_knockback` | 0 | Extra knockback force applied on melee hit. **Overlap:** `yebisurpg:scale.knockback` (not yet hooked) would multiply the knockback applied to the target. |
| `ATTACK_SPEED` | `minecraft:attack_speed` | 4 | Attacks per second for the player attack cooldown. **Overlap:** `yebisurpg:scale.attack_speed` divides the cooldown delay on top of this — setting vanilla to 8 and scale to 2.0 gives 16 effective attacks/second. |
| `ARMOR` | `minecraft:armor` | 0 | Flat armor points (damage reduction formula). |
| `ARMOR_TOUGHNESS` | `minecraft:armor_toughness` | 0 | Reduces armor penetration from high-damage hits. |
| `LUCK` | `minecraft:luck` | 0 | Affects loot table bonus rolls. |
| `MAX_ABSORPTION` | `minecraft:max_absorption` | 0 | Max absorption hearts that can be granted. |
| `JUMP_STRENGTH` | `minecraft:jump_strength` | 0.42 | Absolute jump impulse (horses only by default). **Overlap:** `yebisurpg:scale.jump_height` multiplies `getJumpPower()` which reads this for horses but is a fixed 0.42 for players — both adjust the final jump height. |
| `SPAWN_REINFORCEMENTS_CHANCE` | `minecraft:spawn_reinforcements_chance` | 0 | Chance for zombie to call reinforcements on damage. |
| `BLOCK_INTERACTION_RANGE` | `minecraft:block_interaction_range` | 4.5 | Absolute block reach in blocks (player). **Overlap:** `yebisurpg:scale.block_reach` × `yebisurpg:scale.reach` multiply this value. |
| `ENTITY_INTERACTION_RANGE` | `minecraft:entity_interaction_range` | 3 | Absolute entity reach/attack range in blocks (player). **Overlap:** `yebisurpg:scale.entity_reach` × `yebisurpg:scale.reach` multiply this value. |
| `BLOCK_BREAK_SPEED` | `minecraft:block_break_speed` | 1 | Base mining speed multiplier. **Overlap:** `yebisurpg:scale.mining_speed` multiplies `getDigSpeed()` on top of this — both active simultaneously. |
| `MINING_EFFICIENCY` | `minecraft:mining_efficiency` | 0 | Bonus mining speed when using the correct tool for the block. |
| `SNEAKING_SPEED` | `minecraft:sneaking_speed` | 0.3 | Speed multiplier while sneaking (fraction of MOVEMENT_SPEED). |
| `SUBMERGED_MINING_SPEED` | `minecraft:submerged_mining_speed` | 0.2 | Mining speed penalty multiplier underwater (Aqua Affinity removes this). |
| `SWEEPING_DAMAGE_RATIO` | `minecraft:sweeping_damage_ratio` | 0 | Fraction of attack damage applied in sword sweep AoE. |
| `TEMPT_RANGE` | `minecraft:tempt_range` | 10 | Range at which mobs follow players holding tempting food. |
| `GRAVITY` | `minecraft:gravity` | 0.08 | Downward acceleration per tick. **Overlap:** `yebisurpg:scale.motion` also multiplies gravity via the `getGravity()` hook — setting both changes gravity twice multiplicatively. |
| `SAFE_FALL_DISTANCE` | `minecraft:safe_fall_distance` | 3 | Blocks of fall before damage begins. |
| `FALL_DAMAGE_MULTIPLIER` | `minecraft:fall_damage_multiplier` | 1 | Multiplies fall damage taken. |
| `STEP_HEIGHT` | `minecraft:step_height` | 0.6 | Absolute max ledge height (blocks) walkable without jumping. **Overlap:** `yebisurpg:scale.step_height` multiplies `maxUpStep()` which returns this value — e.g. vanilla 0.6 × scale 2.0 = 1.2 blocks step height. |
| `SCALE` | `minecraft:scale` | 1 | Vanilla unified scale multiplier added in 1.20.5. Resizes model, hitbox, shadow, and eye height all at once. **Overlap:** `yebisurpg:scale.hitbox_width/height` apply on top of the dimensions this produces — they stack multiplicatively. Prefer yebisurpg scale attributes when you need per-dimension control; prefer vanilla `scale` for uniform resizing. |
| `BURNING_TIME` | `minecraft:burning_time` | 1 | Duration multiplier for fire damage ticks. |
| `EXPLOSION_KNOCKBACK_RESISTANCE` | `minecraft:explosion_knockback_resistance` | 0 | Reduces knockback from explosions (0–1, 1 = immune). |
| `MOVEMENT_EFFICIENCY` | `minecraft:movement_efficiency` | 0 | Reduces speed penalty on slow blocks (soul sand, honey, etc.). |
| `OXYGEN_BONUS` | `minecraft:oxygen_bonus` | 0 | Adds extra air supply ticks underwater. |
| `WATER_MOVEMENT_EFFICIENCY` | `minecraft:water_movement_efficiency` | 0 | Reduces swimming speed penalty in water. |
| `CAMERA_DISTANCE` | `minecraft:camera_distance` | 1 | Third-person camera pull-back distance multiplier. **Overlap:** `yebisurpg:scale.third_person` (not yet hooked) would multiply this further. |

---

## yebisu RPG Scale Attributes (`net.ye6isu.yebisuRPG.attribute.ModAttributes`)

All registered under the `yebisurpg` namespace. Use via `ModAttributes.CONSTANT_NAME`. Default value is `1.0` for all (neutral/no effect).

### Dimension & Visual Size

| Constant | Registry ID | Hook Status | Description |
|---|---|---|---|
| `SCALE_BASE` | `yebisurpg:scale.base` | Not hooked | Intended master multiplier; width/height/motion would inherit from this. Currently just a data field — set it and read it in logic blocks, but it has no automatic effect. |
| `SCALE_WIDTH` | `yebisurpg:scale.width` | Not hooked | Combined visual + hitbox width (combines base × width). No mixin yet — use `SCALE_HITBOX_WIDTH` + `SCALE_MODEL_WIDTH` separately. |
| `SCALE_HEIGHT` | `yebisurpg:scale.height` | Not hooked | Combined visual + hitbox height. Same note as SCALE_WIDTH. |
| `SCALE_HITBOX_WIDTH` | `yebisurpg:scale.hitbox_width` | **Hooked** | Scales entity AABB collision width only. No visual change. Applied via `MixinEntityDimensions` → `getDimensions()`. Refreshes on `aiStep`. |
| `SCALE_HITBOX_HEIGHT` | `yebisurpg:scale.hitbox_height` | **Hooked** | Scales entity AABB collision height only. No visual change. Same mixin as above. |
| `SCALE_MODEL_WIDTH` | `yebisurpg:scale.model_width` | Not hooked | Visual render width only — no hitbox change. Needs renderer mixin. |
| `SCALE_MODEL_HEIGHT` | `yebisurpg:scale.model_height` | Not hooked | Visual render height only. Needs renderer mixin. |
| `SCALE_EYE_HEIGHT` | `yebisurpg:scale.eye_height` | Not hooked | Camera/eye position height offset. Hook point removed in 1.20.5+; no equivalent in 1.21.1 `LivingEntity`. |
| `SCALE_THIRD_PERSON` | `yebisurpg:scale.third_person` | Not hooked | Third-person camera pull-back distance. Needs `GameRenderer` mixin. |

### Movement

| Constant | Registry ID | Hook Status | Description |
|---|---|---|---|
| `SCALE_MOTION` | `yebisurpg:scale.motion` | **Hooked** | Multiplies `move()` vector (SELF/PLAYER) and `getGravity()`. Affects walk speed, gravity, and minimum velocity threshold. |
| `SCALE_FALLING` | `yebisurpg:scale.falling` | Not hooked | Falling speed / gravity specifically during falls. Separate from SCALE_MOTION. Needs `travel()` mixin. |
| `SCALE_JUMP_HEIGHT` | `yebisurpg:scale.jump_height` | **Hooked** | Multiplies `getJumpPower()` on `LivingEntity`. |
| `SCALE_STEP_HEIGHT` | `yebisurpg:scale.step_height` | **Hooked** | Multiplies `maxUpStep()` on `LivingEntity`. |
| `SCALE_FLIGHT` | `yebisurpg:scale.flight` | Not hooked | Elytra / creative flight speed. Needs `travel()` hook inside the elytra branch. |
| `SCALE_VIEW_BOBBING` | `yebisurpg:scale.view_bobbing` | **Hooked** | Scales camera bob translation in `bobView()` via `GameRenderer` mixin. Client-only. |

### Reach / Interaction

| Constant | Registry ID | Hook Status | Description |
|---|---|---|---|
| `SCALE_REACH` | `yebisurpg:scale.reach` | **Hooked** | Base reach multiplier applied to both block and entity reach. Stacks multiplicatively with SCALE_BLOCK_REACH / SCALE_ENTITY_REACH. Player only. |
| `SCALE_BLOCK_REACH` | `yebisurpg:scale.block_reach` | **Hooked** | Multiplies `blockInteractionRange()`. Stacks with SCALE_REACH. Player only. |
| `SCALE_ENTITY_REACH` | `yebisurpg:scale.entity_reach` | **Hooked** | Multiplies `entityInteractionRange()`. Stacks with SCALE_REACH. Player only. |

### Combat

| Constant | Registry ID | Hook Status | Description |
|---|---|---|---|
| `SCALE_ATTACK` | `yebisurpg:scale.attack` | **Hooked** | Multiplies outgoing damage in `getDamageAfterArmorAbsorb()`. Applied when this entity is the attacker. |
| `SCALE_DEFENSE` | `yebisurpg:scale.defense` | **Hooked** | Divides incoming damage in `getDamageAfterArmorAbsorb()`. Higher = tankier. Applied on the entity being hit. |
| `SCALE_KNOCKBACK` | `yebisurpg:scale.knockback` | Not hooked | Knockback multiplier on hit targets. Needs `Player.attack()` mixin (player-specific). |
| `SCALE_ATTACK_SPEED` | `yebisurpg:scale.attack_speed` | **Hooked** | Divides `getCurrentItemAttackStrengthDelay()` → higher value = faster cooldown refill. Player only. |
| `SCALE_HEALTH` | `yebisurpg:scale.health` | **Hooked** | Multiplies `getMaxHealth()` on `LivingEntity`. |

### Utility / Gameplay

| Constant | Registry ID | Hook Status | Description |
|---|---|---|---|
| `SCALE_MINING_SPEED` | `yebisurpg:scale.mining_speed` | **Hooked** | Multiplies `getDigSpeed()`. Player only. |
| `SCALE_VISIBILITY` | `yebisurpg:scale.visibility` | **Hooked** | Multiplies `getVisibilityPercent()`. Controls how easily mobs detect this entity (higher = easier to spot). |
| `SCALE_HELD_ITEM` | `yebisurpg:scale.held_item` | **Hooked (3rd person only)** | Scales `ItemRenderer.renderStatic` PoseStack for `THIRD_PERSON_*` contexts. First-person item scale is controlled by the `right_item_socket` / `left_item_socket` animation bone scale instead — animating that bone does not conflict with this attribute. |
| `SCALE_DROPS` | `yebisurpg:scale.drops` | Not hooked | Drop count multiplier. Requires a loot modifier / `LootingLevelEvent`, not a mixin. |

### Projectiles & Explosions

| Constant | Registry ID | Hook Status | Description |
|---|---|---|---|
| `SCALE_PROJECTILES` | `yebisurpg:scale.projectiles` | **Hooked** | Scales launch velocity of `AbstractArrow` (arrows, tridents) and `ThrowableProjectile` (snowballs, eggs, potions, ender pearls) when fired by this entity. |
| `SCALE_EXPLOSIONS` | `yebisurpg:scale.explosions` | **Hooked** | Multiplies explosion `radius` when this entity causes an explosion. Applied in `Explosion` constructor. |

---

## Notes

- **Stacking order**: `SCALE_REACH` × `SCALE_BLOCK_REACH` (both multiply the vanilla base). Same pattern for entity reach.
- **Players only**: reach, mining speed, attack speed hooks target `Player`. They have no effect on mobs.
- **All living entities**: jump, step, health, visibility, attack, defense, motion hooks target `LivingEntity` and apply to players and mobs alike.
- **Modpack compatibility**: these attributes are registered on every `LivingEntity` via `EntityAttributeModificationEvent`. Other mods that also add attributes this way coexist fine. Mods that read vanilla attributes directly (e.g. a damage mod reading `ATTACK_DAMAGE`) are unaffected by the yebisurpg scale attributes — the scale attributes are a separate layer on top.
- **Animation compatibility**: `SCALE_HELD_ITEM` is intentionally skipped for first-person — use `right_item_socket` / `left_item_socket` bone scale in the animation instead. Both systems can be active simultaneously without conflict.
