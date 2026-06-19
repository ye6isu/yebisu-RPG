package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.math.Axis;
import net.minecraft.client.model.ElytraModel;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.layers.ElytraLayer;
import net.minecraft.world.entity.LivingEntity;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead;
import net.ye6isu.yebisuRPG.animation.client.ClientAnimationEngine;
import net.ye6isu.yebisuRPG.animation.client.TorsoRotationHolder;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * ElytraModel has no body ModelPart, so it can't inherit torso rotation via
 * copyPropertiesTo the way armor (HumanoidModel-based) does. Re-applies the
 * torso's look-at/crouch rotation (stashed by MixinPlayerModel) directly to
 * the PoseStack so the elytra stays attached to the body instead of facing
 * the entity's base yaw.
 */
@OnlyIn(Dist.CLIENT)
@Mixin(ElytraLayer.class)
public abstract class MixinElytraLayer<T extends LivingEntity> {

    @org.spongepowered.asm.mixin.Shadow
    private ElytraModel<T> elytraModel;

    @Inject(method = "render", at = @At("HEAD"))
    private void yebisurpg$followTorsoRotation(
            PoseStack poseStack, MultiBufferSource buffer, int packedLight,
            T entity, float limbSwing, float limbSwingAmount, float partialTick,
            float ageInTicks, float netHeadYaw, float headPitch,
            CallbackInfo ci) {

        float xRot = TorsoRotationHolder.X_ROT.get();
        float yRot = TorsoRotationHolder.Y_ROT.get();
        float zRot = TorsoRotationHolder.Z_ROT.get();
        if (xRot == 0f && yRot == 0f && zRot == 0f) return;

        poseStack.mulPose(Axis.ZP.rotation(zRot));
        poseStack.mulPose(Axis.YP.rotation(yRot));
        poseStack.mulPose(Axis.XP.rotation(xRot));
    }

    private static final ThreadLocal<float[]> yebisurpg$savedElytraRot = ThreadLocal.withInitial(() -> new float[3]);

    @Inject(
        method = "render",
        at = @At(
            value = "INVOKE",
            target = "Lnet/minecraft/client/model/ElytraModel;setupAnim(Lnet/minecraft/world/entity/LivingEntity;FFFFF)V"
        )
    )
    private void yebisurpg$saveElytraRotBeforeSetup(
            PoseStack poseStack, MultiBufferSource buffer, int packedLight,
            T entity, float limbSwing, float limbSwingAmount, float partialTick,
            float ageInTicks, float netHeadYaw, float headPitch,
            CallbackInfo ci) {

        if (entity instanceof AbstractClientPlayer acp) {
            float[] saved = yebisurpg$savedElytraRot.get();
            saved[0] = acp.elytraRotX;
            saved[1] = acp.elytraRotY;
            saved[2] = acp.elytraRotZ;
        }
    }

    @Inject(
        method = "render",
        at = @At(
            value = "INVOKE",
            target = "Lnet/minecraft/client/model/ElytraModel;setupAnim(Lnet/minecraft/world/entity/LivingEntity;FFFFF)V",
            shift = At.Shift.AFTER
        )
    )
    private void yebisurpg$undoCrouchWingSpread(
            PoseStack poseStack, MultiBufferSource buffer, int packedLight,
            T entity, float limbSwing, float limbSwingAmount, float partialTick,
            float ageInTicks, float netHeadYaw, float headPitch,
            CallbackInfo ci) {

        if (!entity.isCrouching()) return;
        if (!(entity instanceof AbstractClientPlayer acp)) return;

        ClientAnimationEngine engine = ClientAnimationEngine.INSTANCE;
        int entityId = entity.getId();
        AnimationPlayhead playhead = engine.getPlayhead(entityId, AnimationCategory.ENTITY_THIRD_PERSON);

        int vanMask = 0;
        if (playhead != null) {
            vanMask = playhead.vanillaMask();
        } else {
            var tpPose = engine.getThirdPersonPosePayload(entityId);
            if (tpPose != null) vanMask = tpPose.vanillaMask();
        }
        if (playhead == null && engine.getThirdPersonPose(entityId) == null
                && engine.getBlender(entityId, AnimationCategory.ENTITY_THIRD_PERSON) == null) return;

        boolean disableCrouch = (vanMask & AnimationPlayhead.VAN_CROUCH) != 0;
        boolean prone = entity.isVisuallySwimming() || entity.isFallFlying();
        boolean disableProne = (vanMask & AnimationPlayhead.DISABLE_PRONE) != 0;
        if (!disableCrouch && !(prone && disableProne)) return;

        // Restore pre-setupAnim elytraRot values (before vanilla corrupted them with crouch).
        float[] saved = yebisurpg$savedElytraRot.get();
        acp.elytraRotX = saved[0];
        acp.elytraRotY = saved[1];
        acp.elytraRotZ = saved[2];

        // Now apply the correct lerp (what vanilla would have done without isCrouching).
        float targetX, targetZ, targetYR, targetY;
        if (entity.isFallFlying()) {
            float f4 = 1.0f;
            net.minecraft.world.phys.Vec3 vel = entity.getDeltaMovement();
            if (vel.y < 0.0) {
                net.minecraft.world.phys.Vec3 norm = vel.normalize();
                f4 = 1.0f - (float) Math.pow(-norm.y, 1.5);
            }
            targetX = f4 * 0.34906584f + (1.0f - f4) * 0.2617994f;
            targetZ = f4 * (-1.5707964f) + (1.0f - f4) * (-0.2617994f);
            targetYR = 0f;
            targetY = 0f;
        } else {
            targetX = 0.2617994f;
            targetZ = -0.2617994f;
            targetYR = 0f;
            targetY = 0f;
        }

        acp.elytraRotX += (targetX - acp.elytraRotX) * 0.1f;
        acp.elytraRotY += (targetYR - acp.elytraRotY) * 0.1f;
        acp.elytraRotZ += (targetZ - acp.elytraRotZ) * 0.1f;

        // Rewrite wing model parts with corrected values.
        AccessorElytraModel acc = (AccessorElytraModel) (Object) this.elytraModel;
        net.minecraft.client.model.geom.ModelPart left = acc.getLeftWing();
        net.minecraft.client.model.geom.ModelPart right = acc.getRightWing();
        left.y = targetY;
        left.xRot = acp.elytraRotX;
        left.yRot = acp.elytraRotY;
        left.zRot = acp.elytraRotZ;
        right.y = targetY;
        right.xRot = acp.elytraRotX;
        right.yRot = -acp.elytraRotY;
        right.zRot = -acp.elytraRotZ;
    }
}
