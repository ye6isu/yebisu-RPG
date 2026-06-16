package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.math.Axis;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.layers.ElytraLayer;
import net.minecraft.world.entity.LivingEntity;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
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
}
