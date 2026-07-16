package net.ye6isu.yebisuRPG.entity.custom;

import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.AgeableMob;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.PathfinderMob;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.neoforged.neoforge.entity.PartEntity;
import net.minecraft.world.entity.ai.goal.AvoidEntityGoal;
import net.minecraft.world.entity.ai.goal.BreedGoal;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.MeleeAttackGoal;
import net.minecraft.world.entity.ai.goal.PanicGoal;
import net.minecraft.world.entity.ai.goal.RandomLookAroundGoal;
import net.minecraft.world.entity.ai.goal.RangedAttackGoal;
import net.minecraft.world.entity.ai.goal.TemptGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.ai.goal.target.HurtByTargetGoal;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.entity.monster.RangedAttackMob;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.projectile.Arrow;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;

import java.util.List;

/**
 * Generic mob used by every YCS-authored entity. Look (model/texture/
 * animation) and stats (attributes/hitbox/hostility/goals) are entirely
 * data-driven — see {@code ycs-data/entities/&lt;id&gt;.json},
 * {@link net.ye6isu.yebisuRPG.entity.client.ModEntityRendererRegistry}, and
 * {@link YcsMobData} — so a single Java class covers every mob YCS creates.
 *
 * <p>Extends {@link Animal} (not just {@code PathfinderMob}) so any YCS mob can
 * opt into breeding via the Goal Builder — {@code Animal extends AgeableMob
 * extends PathfinderMob}, a strict superset, so mobs that don't use breeding
 * are unaffected. Implements {@link RangedAttackMob} unconditionally for the
 * same "one shared class" reason; {@link #performRangedAttack} is a no-op
 * unless the mob's {@link YcsMobData.Config} actually has a ranged attack
 * configured.</p>
 *
 * <p>Everything else (death/hurt/attack animations, sounds, loot, Blocky
 * attack/hurt/death hooks) is still explicitly deferred — see
 * {@code YCS_V3_TODO.md}.</p>
 */
public class YcsMobEntity extends Animal implements RangedAttackMob {

    /** Built directly in the constructor, NOT lazily on first tick — {@code
     * getType()} is already safe to call here (see {@code registerGoals()}'s own
     * javadoc on {@code YcsMobData} registration timing: {@code Entity}'s
     * constructor sets {@code this.type} before this constructor's body runs).
     * This timing matters: {@code ServerLevel}'s tracking-start callback (which
     * registers each part's id into the level so hit-detection/network id lookups
     * can ever resolve them — see {@code dragonParts} in vanilla's {@code
     * ServerLevel}) reads {@link #getParts()} exactly once, when this entity is
     * first added to the level — before any {@code tick()} ever runs. Building
     * the array lazily on first tick left it empty at that moment, so parts were
     * visible/renderable (isMultipartEntity was still true once built) but never
     * actually hit-detectable — confirmed live: attacking a part's box never
     * forwarded damage to the parent. {@code EnderDragon} builds its own {@code
     * subEntities} the same way, directly in its constructor. */
    private final YcsMobPartEntity[] hitboxParts;

    public YcsMobEntity(EntityType<? extends Animal> type, Level level) {
        super(type, level);
        List<YcsMobData.HitboxPart> configured = YcsMobData.get(getType()).hitboxParts();
        hitboxParts = new YcsMobPartEntity[configured.size()];
        for (int i = 0; i < configured.size(); i++) {
            YcsMobData.HitboxPart p = configured.get(i);
            hitboxParts[i] = new YcsMobPartEntity(this, p.name(), p.width(), p.height());
        }
    }

    @Override
    public void setId(int id) {
        super.setId(id);
        if (hitboxParts == null) return;
        for (int i = 0; i < hitboxParts.length; i++) {
            hitboxParts[i].setId(id + i + 1);
        }
    }

    @Override
    public PartEntity<?>[] getParts() {
        return hitboxParts;
    }

    /** NeoForge's {@code IEntityExtension.isMultipartEntity()} — separate from {@link
     * #getParts()} and defaults to {@code false}. Both the F3+B hitbox debug renderer
     * ({@code EntityRenderDispatcher.renderHitbox}) and vanilla's own part-aware entity
     * lookups ({@code ServerLevel}/{@code ClientLevel}'s {@code getEntities}) gate on
     * this flag, not just on whether {@code getParts()} returns anything — {@code
     * EnderDragon} overrides it the same way. Omitting this override means parts are
     * invisible in the hitbox debug view AND never actually reachable by hit-detection,
     * not merely a cosmetic gap. */
    @Override
    public boolean isMultipartEntity() {
        return hitboxParts.length > 0;
    }

    /** Forwarded from {@link YcsMobPartEntity#hurt} — applies the hit to this mob's
     * normal health/damage handling (so hitting a part counts as damaging the whole
     * mob through vanilla combat, matching {@code EnderDragonPart}), then fires
     * {@link #onPartHit} so ability-style Blocky logic (e.g. "did this attack hit
     * the tail?") can react to which specific part was struck. */
    public boolean hurtFromPart(YcsMobPartEntity part, DamageSource source, float amount) {
        boolean result = this.hurt(source, amount);
        onPartHit(part.partName(), source, amount);
        return result;
    }

    /** Fires the "On Part Hit" Blocky graph (if any) for this entity's own type —
     * see {@link net.ye6isu.yebisuRPG.entity.EntityPartHitHandlers}. A mob type
     * with no such graph attached simply hits the dispatcher's {@code default} case,
     * so parts work mechanically even before any graph is authored. */
    protected void onPartHit(String partName, DamageSource source, float amount) {
        String entityId = BuiltInRegistries.ENTITY_TYPE.getKey(getType()).getPath();
        net.ye6isu.yebisuRPG.entity.EntityPartHitHandlers.dispatch(entityId, partName, this, source, amount);
    }

    /** Repositions every configured hitbox part to its tracked bone's current
     * world-space position — mirrors {@code EnderDragon.aiStep}'s own {@code
     * tickPart(...)} calls, just driven by an arbitrary named bone via {@link
     * BonePoseSolver} instead of hand-coded per-part offsets. A part whose bone
     * can't be resolved (missing geo model, typo'd bone name, no animation
     * configured) simply stays wherever it last was — same "silently no-op on
     * misconfiguration" behavior as idle/walk animation name lookups elsewhere
     * in this class.
     *
     * <p>A {@link YcsMobPartEntity} is never itself ticked by the level (it only
     * exists via {@link #getParts()}), so {@code Entity.setPos}/{@code setPosRaw}
     * never touches its {@code xOld}/{@code yOld}/{@code zOld} the way a normal
     * entity's own {@code tick()} would. Every partial-tick interpolated read of a
     * part's position (the F3+B hitbox debug renderer, and any future render code)
     * lerps from {@code xOld} to {@code getX()} — leaving {@code xOld} stale made
     * every part visibly "teleport" each tick instead of smoothly following its
     * bone (confirmed live). {@code EnderDragon.aiStep} solves this by snapshotting
     * each part's pre-move position and restoring it into {@code xOld}/{@code yOld}/
     * {@code zOld} <em>after</em> every part has moved for this tick — replicated
     * here identically.</p> */
    private void tickHitboxParts() {
        if (hitboxParts.length == 0) return;
        double[] oldX = new double[hitboxParts.length];
        double[] oldY = new double[hitboxParts.length];
        double[] oldZ = new double[hitboxParts.length];
        for (int i = 0; i < hitboxParts.length; i++) {
            oldX[i] = hitboxParts[i].getX();
            oldY[i] = hitboxParts[i].getY();
            oldZ[i] = hitboxParts[i].getZ();
        }

        List<YcsMobData.HitboxPart> configured = YcsMobData.get(getType()).hitboxParts();
        for (int i = 0; i < hitboxParts.length && i < configured.size(); i++) {
            YcsMobPartEntity part = hitboxParts[i];
            YcsMobData.HitboxPart cfg = configured.get(i);
            AABB box = BonePoseSolver.resolveBoneWorldBox(this, cfg.boneName());
            if (box != null) {
                part.moveToBox(box);
            } else {
                Vec3 pos = BonePoseSolver.resolveBoneWorldPos(this, cfg.boneName(), cfg.offsetX(), cfg.offsetY(), cfg.offsetZ());
                if (pos != null) part.setPos(pos.x, pos.y, pos.z);
            }
        }

        for (int i = 0; i < hitboxParts.length; i++) {
            hitboxParts[i].xOld = oldX[i];
            hitboxParts[i].yOld = oldY[i];
            hitboxParts[i].zOld = oldZ[i];
        }
    }

    @Override
    public void tick() {
        super.tick();
        tickHitboxParts();
    }

    @Override
    public boolean isFood(ItemStack stack) {
        String breedingItem = YcsMobData.get(getType()).breedingItem();
        if (breedingItem == null) return false;
        return stack.is(BuiltInRegistries.ITEM.get(ResourceLocation.parse(breedingItem)));
    }

    @Override
    public AgeableMob getBreedOffspring(ServerLevel level, AgeableMob otherParent) {
        return (AgeableMob) getType().create(level);
    }

    @Override
    public void performRangedAttack(LivingEntity target, float distanceFactor) {
        YcsMobData.RangedAttackConfig cfg = YcsMobData.get(getType()).rangedAttack();
        if (cfg == null) return;
        Arrow arrow = new Arrow(level(), this, ItemStack.EMPTY, null);
        double dx = target.getX() - getX();
        double dy = target.getY(0.3333) - arrow.getY();
        double dz = target.getZ() - getZ();
        double horizontalDist = Math.sqrt(dx * dx + dz * dz);
        arrow.shoot(dx, dy + horizontalDist * 0.2, dz, 1.6F, 14 - level().getDifficulty().getId() * 4);
        arrow.setBaseDamage(cfg.damage());
        level().addFreshEntity(arrow);
    }

    /**
     * {@code FOLLOW_RANGE} isn't a YCS-exposed field — it's baked in at a sensible
     * default because {@code PathfinderMob}'s constructor builds a {@code
     * GroundPathNavigation} that reads this attribute immediately, before any
     * Blocky/data-driven config has a chance to run; omitting it throws
     * {@code IllegalArgumentException: Can't find attribute minecraft:generic.follow_range}
     * at entity construction, which vanilla's summon/load path swallows into a
     * silent "Unable to summon entity" with the real stack trace only in the log.
     * Every other attribute (max health, movement speed, combat stats, scale,
     * any mod-defined attribute) is entirely data-driven — see the open-ended
     * {@code attributes} list built directly into {@code ModEntityEvents.java}'s
     * generated {@code event.put(...)} line, since a fixed-arity Java helper
     * can't represent an open-ended per-entity attribute list.
     */
    @Override
    protected void registerGoals() {
        YcsMobData.Config cfg = YcsMobData.get(getType());

        // No goal is added unless the entity's Goal Builder list actually includes it —
        // a brand-new YCS mob does nothing at all (no wander, no look-around) until the
        // user explicitly adds goals, matching every other YCS field being opt-in data.
        for (YcsMobData.GoalEntry g : cfg.extraGoals()) {
            switch (g.type()) {
                case FLOAT -> this.goalSelector.addGoal(0, new FloatGoal(this));
                case WANDER -> this.goalSelector.addGoal(1, new WaterAvoidingRandomStrollGoal(this, g.speedModifier()));
                case LOOK_AT_PLAYER -> this.goalSelector.addGoal(2, new LookAtPlayerGoal(this, Player.class, g.maxDistance()));
                case LOOK_AROUND -> this.goalSelector.addGoal(3, new RandomLookAroundGoal(this));
                case AVOID_ENTITY -> this.goalSelector.addGoal(1,
                    new AvoidEntityGoal<>(this, Monster.class, g.maxDistance(), g.speedModifier(), g.sprintSpeedModifier()));
                case PANIC -> this.goalSelector.addGoal(1, new PanicGoal(this, g.speedModifier()));
                case TEMPT -> this.goalSelector.addGoal(2,
                    new TemptGoal(this, g.speedModifier(), stack -> isTemptItem(stack, g.itemId()), g.canScare()));
                case BREED -> this.goalSelector.addGoal(2, new BreedGoal(this, g.speedModifier()));
            }
        }

        YcsMobData.Hostility hostility = cfg.hostility();
        if (hostility == YcsMobData.Hostility.HOSTILE || hostility == YcsMobData.Hostility.NEUTRAL) {
            this.goalSelector.addGoal(1, new MeleeAttackGoal(this, 1.0D, false));
        }
        switch (hostility) {
            case HOSTILE -> this.targetSelector.addGoal(1, new NearestAttackableTargetGoal<>(this, Player.class, true));
            case NEUTRAL -> this.targetSelector.addGoal(1, new HurtByTargetGoal(this));
            case PASSIVE -> {}
        }

        if (cfg.rangedAttack() != null) {
            YcsMobData.RangedAttackConfig ranged = cfg.rangedAttack();
            this.goalSelector.addGoal(1,
                new RangedAttackGoal(this, ranged.speedModifier(), ranged.attackInterval(), ranged.attackRadius()));
        }
    }

    private static boolean isTemptItem(ItemStack stack, String itemId) {
        if (itemId == null) return false;
        return stack.is(BuiltInRegistries.ITEM.get(ResourceLocation.parse(itemId)));
    }
}
