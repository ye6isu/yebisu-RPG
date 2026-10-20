package net.ye6isu.yebisuRPG.mixin;

import com.llamalad7.mixinextras.injector.ModifyReturnValue;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Holder;
import net.minecraft.core.particles.ParticleOptions;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.MoverType;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.projectile.AbstractArrow;
import net.minecraft.world.entity.projectile.Projectile;
import net.minecraft.world.entity.projectile.ThrowableProjectile;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Explosion;
import net.minecraft.world.level.ExplosionDamageCalculator;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.Vec3;
import net.ye6isu.yebisuRPG.attribute.ModAttributes;
import org.jetbrains.annotations.Nullable;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Mutable;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Coerce;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyVariable;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

public class MixinScaleAttributes {

    // ── LivingEntity hooks ────────────────────────────────────────────────────

    @Mixin(LivingEntity.class)
    public abstract static class Living {

        @Unique
        private float yebisurpg$attr(Holder<Attribute> attr) {
            AttributeInstance inst = ((LivingEntity)(Object)this).getAttribute(attr);
            return inst != null ? (float) inst.getValue() : 1.0f;
        }

        @Unique
        private static float attrOf(LivingEntity e, Holder<Attribute> attr) {
            AttributeInstance inst = e.getAttribute(attr);
            return inst != null ? (float) inst.getValue() : 1.0f;
        }

        @ModifyReturnValue(method = "getJumpPower()F", at = @At("RETURN"))
        private float yebisurpg$jumpPower(float original) {
            float s = yebisurpg$attr(ModAttributes.SCALE_JUMP_HEIGHT);
            return s != 1.0f ? original * s : original;
        }

        @ModifyReturnValue(method = "maxUpStep()F", at = @At("RETURN"))
        private float yebisurpg$stepHeight(float original) {
            float s = yebisurpg$attr(ModAttributes.SCALE_STEP_HEIGHT);
            return s != 1.0f ? original * s : original;
        }

        @ModifyReturnValue(method = "getMaxHealth()F", at = @At("RETURN"))
        private float yebisurpg$maxHealth(float original) {
            float s = yebisurpg$attr(ModAttributes.SCALE_HEALTH);
            return s != 1.0f ? original * s : original;
        }

        @ModifyReturnValue(method = "getVisibilityPercent(Lnet/minecraft/world/entity/Entity;)D", at = @At("RETURN"))
        private double yebisurpg$visibility(double original) {
            float s = yebisurpg$attr(ModAttributes.SCALE_VISIBILITY);
            return s != 1.0f ? original * s : original;
        }

        @ModifyVariable(
            method = "getDamageAfterArmorAbsorb(Lnet/minecraft/world/damagesource/DamageSource;F)F",
            at = @At("HEAD"), argsOnly = true, index = 2
        )
        private float yebisurpg$armorDamage(float value, DamageSource source, float amount) {
            Entity attacker = source.getEntity();
            float atkScale = attacker instanceof LivingEntity le ? attrOf(le, ModAttributes.SCALE_ATTACK) : 1.0f;
            float defScale = yebisurpg$attr(ModAttributes.SCALE_DEFENSE);
            if (atkScale != 1.0f || defScale != 1.0f) value = (atkScale * value) / defScale;
            return value;
        }
    }

    // ── Entity hooks (motion, gravity) ────────────────────────────────────────

    @Mixin(Entity.class)
    public abstract static class EntityScale {

        @Unique
        private float yebisurpg$motionScale() {
            if (!((Entity)(Object)this instanceof LivingEntity le)) return 1.0f;
            AttributeInstance inst = le.getAttribute(ModAttributes.SCALE_MOTION);
            return inst != null ? (float) inst.getValue() : 1.0f;
        }

        @ModifyVariable(
            method = "move(Lnet/minecraft/world/entity/MoverType;Lnet/minecraft/world/phys/Vec3;)V",
            at = @At("HEAD"), argsOnly = true, index = 2
        )
        private Vec3 yebisurpg$move(Vec3 movement, MoverType type) {
            if (type == MoverType.SELF || type == MoverType.PLAYER) {
                float s = yebisurpg$motionScale();
                if (s != 1.0f) return movement.scale(s);
            }
            return movement;
        }

        @ModifyReturnValue(method = "getGravity()D", at = @At("RETURN"))
        private double yebisurpg$gravity(double original) {
            if (original == 0.0) return 0.0;
            float s = yebisurpg$motionScale();
            return s != 1.0f ? original * s : original;
        }
    }

    // ── Player hooks ──────────────────────────────────────────────────────────

    @Mixin(Player.class)
    public abstract static class PlayerScale {

        @Unique
        private float yebisurpg$pattr(Holder<Attribute> attr) {
            AttributeInstance inst = ((Player)(Object)this).getAttribute(attr);
            return inst != null ? (float) inst.getValue() : 1.0f;
        }

        @ModifyReturnValue(method = "blockInteractionRange()D", at = @At("RETURN"))
        private double yebisurpg$blockReach(double original) {
            float s = yebisurpg$pattr(ModAttributes.SCALE_BLOCK_REACH) * yebisurpg$pattr(ModAttributes.SCALE_REACH);
            return s != 1.0f ? original * s : original;
        }

        @ModifyReturnValue(method = "entityInteractionRange()D", at = @At("RETURN"))
        private double yebisurpg$entityReach(double original) {
            float s = yebisurpg$pattr(ModAttributes.SCALE_ENTITY_REACH) * yebisurpg$pattr(ModAttributes.SCALE_REACH);
            return s != 1.0f ? original * s : original;
        }

        @Inject(method = "getDigSpeed(Lnet/minecraft/world/level/block/state/BlockState;Lnet/minecraft/core/BlockPos;)F",
                at = @At("RETURN"), cancellable = true)
        private void yebisurpg$miningSpeed(BlockState block, BlockPos pos, CallbackInfoReturnable<Float> cir) {
            float s = yebisurpg$pattr(ModAttributes.SCALE_MINING_SPEED);
            if (s != 1.0f) cir.setReturnValue(cir.getReturnValue() * s);
        }

        @ModifyReturnValue(method = "getCurrentItemAttackStrengthDelay()F", at = @At("RETURN"))
        private float yebisurpg$attackSpeed(float original) {
            float s = yebisurpg$pattr(ModAttributes.SCALE_ATTACK_SPEED);
            return s != 1.0f ? original / s : original;
        }
    }

    // ── Explosion radius ──────────────────────────────────────────────────────

    @Mixin(Explosion.class)
    public abstract static class ExplosionScale {

        @Shadow @Mutable @Final float radius;

        @Inject(at = @At("RETURN"),
                method = "<init>(Lnet/minecraft/world/level/Level;Lnet/minecraft/world/entity/Entity;Lnet/minecraft/world/damagesource/DamageSource;Lnet/minecraft/world/level/ExplosionDamageCalculator;DDDFZLnet/minecraft/world/level/Explosion$BlockInteraction;Lnet/minecraft/core/particles/ParticleOptions;Lnet/minecraft/core/particles/ParticleOptions;Lnet/minecraft/core/Holder;)V")
        private void yebisurpg$scaleExplosion(
                Level level, @Nullable Entity entity, @Nullable DamageSource source,
                @Nullable ExplosionDamageCalculator calc,
                double x, double y, double z, float power, boolean fire,
                Explosion.BlockInteraction mode, ParticleOptions particle, ParticleOptions emitter,
                @Coerce Object sound, CallbackInfo ci) {
            if (entity instanceof LivingEntity le) {
                AttributeInstance inst = le.getAttribute(ModAttributes.SCALE_EXPLOSIONS);
                if (inst != null && inst.getValue() != 1.0) {
                    this.radius *= (float) inst.getValue();
                }
            }
        }
    }

    // ── Arrow / persistent projectile spawn offset ────────────────────────────
    // Corrects spawn Y when eye height is scaled, and scales projectile entity.

    @Mixin(AbstractArrow.class)
    public abstract static class ArrowScale {

        @Inject(at = @At("RETURN"),
                method = "<init>(Lnet/minecraft/world/entity/EntityType;Lnet/minecraft/world/entity/LivingEntity;Lnet/minecraft/world/level/Level;Lnet/minecraft/world/item/ItemStack;Lnet/minecraft/world/item/ItemStack;)V")
        private void yebisurpg$arrowSpawn(EntityType<? extends Projectile> type, LivingEntity owner,
                Level level, ItemStack stack, ItemStack shotFrom, CallbackInfo ci) {
            AttributeInstance scaleInst = owner.getAttribute(ModAttributes.SCALE_PROJECTILES);
            if (scaleInst != null && scaleInst.getValue() != 1.0) {
                float s = (float) scaleInst.getValue();
                Entity self = (Entity)(Object)this;
                // Scale velocity already applied — also scale the entity bounding box.
                self.setDeltaMovement(self.getDeltaMovement().scale(s));
            }
        }
    }

    // ── Thrown projectile (snowball, egg, ender pearl, etc.) ──────────────────

    @Mixin(ThrowableProjectile.class)
    public abstract static class ThrownScale {

        @Inject(at = @At("RETURN"),
                method = "<init>(Lnet/minecraft/world/entity/EntityType;Lnet/minecraft/world/entity/LivingEntity;Lnet/minecraft/world/level/Level;)V")
        private void yebisurpg$thrownSpawn(EntityType<? extends ThrowableProjectile> type,
                LivingEntity owner, Level level, CallbackInfo ci) {
            AttributeInstance scaleInst = owner.getAttribute(ModAttributes.SCALE_PROJECTILES);
            if (scaleInst != null && scaleInst.getValue() != 1.0) {
                float s = (float) scaleInst.getValue();
                Entity self = (Entity)(Object)this;
                self.setDeltaMovement(self.getDeltaMovement().scale(s));
            }
        }
    }
}
