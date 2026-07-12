package net.ye6isu.yebisuRPG.entity.custom;

import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.RandomLookAroundGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.PathfinderMob;
import net.minecraft.world.level.Level;

/**
 * Generic passive mob used by every YCS-authored entity. Look (model/texture/
 * animation) and stats (attributes/hitbox) are entirely data-driven — see
 * {@code ycs-data/entities/&lt;id&gt;.json} and
 * {@link net.ye6isu.yebisuRPG.entity.client.ModEntityRendererRegistry} — so a
 * single Java class covers every mob YCS creates.
 *
 * <p>Bare-minimum scope: wander + look-at-player only, no combat/targeting AI,
 * no sounds, no loot, no breeding. See {@code YCS_V3_TODO.md} for what's
 * explicitly deferred.</p>
 */
public class YcsMobEntity extends PathfinderMob {

    public YcsMobEntity(EntityType<? extends PathfinderMob> type, Level level) {
        super(type, level);
    }

    /**
     * {@code FOLLOW_RANGE} isn't a YCS-exposed field — it's baked in at a sensible
     * default because {@code PathfinderMob}'s constructor builds a {@code
     * GroundPathNavigation} that reads this attribute immediately, before any
     * Blocky/data-driven config has a chance to run; omitting it throws
     * {@code IllegalArgumentException: Can't find attribute minecraft:generic.follow_range}
     * at entity construction, which vanilla's summon/load path swallows into a
     * silent "Unable to summon entity" with the real stack trace only in the log.
     */
    public static AttributeSupplier.Builder createAttributes(double maxHealth, double movementSpeed) {
        return LivingEntity.createLivingAttributes()
            .add(Attributes.MAX_HEALTH, maxHealth)
            .add(Attributes.MOVEMENT_SPEED, movementSpeed)
            .add(Attributes.FOLLOW_RANGE, 16.0);
    }

    @Override
    protected void registerGoals() {
        this.goalSelector.addGoal(0, new FloatGoal(this));
        this.goalSelector.addGoal(1, new WaterAvoidingRandomStrollGoal(this, 1.0));
        this.goalSelector.addGoal(2, new LookAtPlayerGoal(this, net.minecraft.world.entity.player.Player.class, 8.0F));
        this.goalSelector.addGoal(3, new RandomLookAroundGoal(this));
    }
}
