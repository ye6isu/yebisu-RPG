package net.ye6isu.yebisuRPG.entity.custom;

import net.minecraft.world.entity.EntityType;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Static per-{@link EntityType} config for YCS mobs that {@link YcsMobEntity#registerGoals()}
 * needs but can't receive directly — {@code registerGoals()} runs inside {@code Mob}'s own
 * constructor, before any per-instance setter could run, and the entity factory passed to
 * {@code EntityType.Builder.of(...)} only ever receives {@code (EntityType, Level)}. Hostility,
 * breeding, ranged attack, and extra Goal Builder entries are all static per mob type (like max
 * health/movement speed already are), so they're registered here during
 * {@code EntityAttributeCreationEvent} — the same lifecycle stage as attribute registration —
 * and read back via {@code getType()}, which {@code Entity}'s constructor sets before {@code
 * Mob}'s constructor body ever calls {@code registerGoals()}.
 */
public final class YcsMobData {

    public enum Hostility { PASSIVE, HOSTILE, NEUTRAL }

    public enum GoalType { FLOAT, WANDER, LOOK_AT_PLAYER, LOOK_AROUND, AVOID_ENTITY, PANIC, TEMPT, BREED }

    public record GoalEntry(GoalType type, double speedModifier, double sprintSpeedModifier,
            float maxDistance, boolean canScare, String itemId) {}

    public record RangedAttackConfig(double speedModifier, int attackInterval, float attackRadius, double damage) {}

    /**
     * {@code breedingItem} (a vanilla item id, e.g. {@code "minecraft:wheat"}) drives {@link
     * YcsMobEntity#isFood}; {@code null} means this mob can't be fed/bred even if a Breed goal
     * entry exists in {@code extraGoals}.
     */
    public static final class Config {
        private final Hostility hostility;
        private final List<GoalEntry> extraGoals = new ArrayList<>();
        private String breedingItem;
        private RangedAttackConfig rangedAttack;
        private String headBone;
        private String idleAnim;
        private String walkAnim;
        private final List<HitboxPart> hitboxParts = new ArrayList<>();

        public Config(Hostility hostility) {
            this.hostility = hostility;
        }

        public Config withGoal(GoalEntry entry) {
            extraGoals.add(entry);
            return this;
        }

        public Config withBreedingItem(String itemId) {
            this.breedingItem = itemId;
            return this;
        }

        public Config withRangedAttack(RangedAttackConfig config) {
            this.rangedAttack = config;
            return this;
        }

        /** Name of the bone {@link YcsMobEntity}'s Look At Player goal (if present) should
         * visually rotate toward the tracked entity, mirroring vanilla's head-bone tracking
         * for a {@code ModelPart}-based model. {@code null} if the mob has no head bone set. */
        public Config withHeadBone(String boneName) {
            this.headBone = boneName;
            return this;
        }

        /** Idle/walk animation names — mirrored here (in addition to {@code
         * ModEntityRendererRegistry.EntitySpec}, which is client-render-only) so
         * server-side code ({@link BonePoseSolver}, for multi-hitbox mob parts) can
         * sample the exact same active animation without depending on any client class. */
        public Config withAnimNames(String idleAnim, String walkAnim) {
            this.idleAnim = idleAnim;
            this.walkAnim = walkAnim;
            return this;
        }

        /** Adds one extra hitbox ("part") that tracks a named bone's world position
         * every tick — see {@link YcsMobPartEntity}. */
        public Config withPart(String name, String boneName, float width, float height) {
            return withPart(name, boneName, width, height, 0.0F, 0.0F, 0.0F);
        }

        public Config withPart(String name, String boneName, float width, float height,
                               float offsetX, float offsetY, float offsetZ) {
            hitboxParts.add(new HitboxPart(name, boneName, width, height, offsetX, offsetY, offsetZ));
            return this;
        }

        public Hostility hostility() { return hostility; }
        public List<GoalEntry> extraGoals() { return extraGoals; }
        public String breedingItem() { return breedingItem; }
        public RangedAttackConfig rangedAttack() { return rangedAttack; }
        public String headBone() { return headBone; }
        public String idleAnim() { return idleAnim; }
        public String walkAnim() { return walkAnim; }
        public List<HitboxPart> hitboxParts() { return hitboxParts; }
    }

    /** One extra tracked hitbox on a mob, following a named bone's animated world
     * position every tick — see {@link YcsMobPartEntity}/{@link BonePoseSolver}. */
    public record HitboxPart(String name, String boneName, float width, float height,
                             float offsetX, float offsetY, float offsetZ) {}

    private static final Map<EntityType<?>, Config> CONFIGS = new HashMap<>();

    public static void register(EntityType<?> type, Config config) {
        CONFIGS.put(type, config);
    }

    public static Config get(EntityType<?> type) {
        return CONFIGS.getOrDefault(type, new Config(Hostility.PASSIVE));
    }

    private YcsMobData() {}
}
