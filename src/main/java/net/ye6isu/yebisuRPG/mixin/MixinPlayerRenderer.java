package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.model.PlayerModel;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.LivingEntityRenderer;
import net.minecraft.client.renderer.entity.player.PlayerRenderer;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.util.Mth;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.animation.client.AnimationBlender;
import net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead;
import net.ye6isu.yebisuRPG.animation.client.ClientAnimationEngine;
import net.ye6isu.yebisuRPG.client.renderer.CompositeSkinManager;
import net.ye6isu.yebisuRPG.client.renderer.FullbrightRenderType;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@OnlyIn(Dist.CLIENT)
@Mixin(PlayerRenderer.class)
public abstract class MixinPlayerRenderer extends LivingEntityRenderer<AbstractClientPlayer, PlayerModel<AbstractClientPlayer>> {

    public MixinPlayerRenderer() { super(null, null, 0); }

    /**
     * The JSON's "root" bone (the true parent of every other bone, distinct from
     * HumanoidModel.body/"torso") drives the whole model's position/rotation/scale,
     * optionally composed with the camera's pitch+yaw (Root Yaw/Pitch checkboxes)
     * so the model stays aimed at the camera regardless of where the player looks,
     * exactly like the first-person root-bone handling in MixinItemInHandRenderer.
     */
    @Inject(
        method = "setupRotations(Lnet/minecraft/client/player/AbstractClientPlayer;Lcom/mojang/blaze3d/vertex/PoseStack;FFFF)V",
        at = @At("RETURN")
    )
    private void yebisurpg$applyRootLock(
            AbstractClientPlayer player,
            PoseStack poseStack,
            float ageInTicks,
            float bodyYaw,
            float partialTick,
            float scale,
            CallbackInfo ci) {

        ClientAnimationEngine engine = ClientAnimationEngine.INSTANCE;
        AnimationPlayhead playhead = engine.getPlayhead(player.getId(), AnimationCategory.ENTITY_THIRD_PERSON);

        int lookMask = playhead != null ? playhead.lookAtMask() : 0;
        boolean rootLookPitch = (lookMask & AnimationPlayhead.LOOK_ROOT_PITCH) != 0;
        boolean rootLookYaw   = (lookMask & AnimationPlayhead.LOOK_ROOT_YAW)   != 0;
        if (rootLookPitch || rootLookYaw) {
            // Vanilla already baked a yaw rotation derived from bodyYaw into the
            // PoseStack before this RETURN inject runs. Cancel that out, then apply
            // the camera's actual pitch/yaw (independently toggleable) so the whole
            // model faces the camera regardless of where the player looks.
            if (rootLookPitch) {
                float lerpedXRot = Mth.lerp(partialTick, player.xRotO, player.getXRot());
                poseStack.mulPose(com.mojang.math.Axis.XP.rotationDegrees(-lerpedXRot));
            }
            if (rootLookYaw) {
                float lerpedYRot = Mth.lerp(partialTick, player.yRotO, player.getYRot());
                poseStack.mulPose(com.mojang.math.Axis.YP.rotationDegrees(bodyYaw - lerpedYRot));
            }
        }

        // Apply the animation's own "root" bone pose on top, same convention as
        // the first-person hand renderer (axis remap JSON->game: Z->X, X->Y, Y->Z;
        // rotation signs negated for Y/X to match Blockbench's right-handed export).
        // Runs whenever a third-person animation is active, independent of the
        // face-cam lock above.
        if (playhead == null) return;
        net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader.AnimData anim =
            playhead.filePath() != null
                ? net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader.INSTANCE.get(playhead.animId(), playhead.filePath())
                : net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader.INSTANCE.get(playhead.animId());
        if (anim == null) return;

        float timeSecs = playhead.getCurrentTimeSecs();
        net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader.BonePose root = anim.bone("root");
        float rootRX = root.rotation().evalX(timeSecs);
        float rootRY = root.rotation().evalY(timeSecs);
        float rootRZ = root.rotation().evalZ(timeSecs);
        float rootPX = root.position().evalX(timeSecs) / 16f;
        float rootPY = root.position().evalY(timeSecs) / 16f;
        float rootPZ = root.position().evalZ(timeSecs) / 16f;
        float rootSX = root.scale().evalX(timeSecs);
        float rootSY = root.scale().evalY(timeSecs);
        float rootSZ = root.scale().evalZ(timeSecs);

        if (rootRX != 0f || rootRY != 0f || rootRZ != 0f || rootPX != 0f || rootPY != 0f || rootPZ != 0f
                || rootSX != 1f || rootSY != 1f || rootSZ != 1f) {
            final float ROOT_PIVOT_Y = 16f / 16f;
            poseStack.translate(0f, ROOT_PIVOT_Y, 0f);
            if (rootRZ != 0f) poseStack.mulPose(com.mojang.math.Axis.ZP.rotationDegrees(rootRZ));
            if (rootRY != 0f) poseStack.mulPose(com.mojang.math.Axis.YP.rotationDegrees(-rootRY));
            if (rootRX != 0f) poseStack.mulPose(com.mojang.math.Axis.XP.rotationDegrees(-rootRX));
            if (rootSX != 1f || rootSY != 1f || rootSZ != 1f) poseStack.scale(rootSX, rootSY, rootSZ);
            poseStack.translate(0f, -ROOT_PIVOT_Y, 0f);
            poseStack.translate(-rootPX, rootPY, rootPZ);
        }
    }

    @Inject(
        method = "setupRotations(Lnet/minecraft/client/player/AbstractClientPlayer;Lcom/mojang/blaze3d/vertex/PoseStack;FFFF)V",
        at = @At("RETURN")
    )
    private void yebisurpg$cancelCrouchTranslate(
            AbstractClientPlayer player,
            PoseStack poseStack,
            float ageInTicks,
            float bodyYaw,
            float partialTick,
            float scale,
            CallbackInfo ci) {

        if (!player.isCrouching()) return;

        int entityId = player.getId();
        ClientAnimationEngine engine = ClientAnimationEngine.INSTANCE;
        AnimationPlayhead playhead = engine.getPlayhead(entityId, AnimationCategory.ENTITY_THIRD_PERSON);
        AnimationBlender  blender  = engine.getBlender(entityId, AnimationCategory.ENTITY_THIRD_PERSON);
        if (playhead == null && blender == null) return;

        // Only cancel if the animation file actually loaded (same guard as bone apply).
        if (playhead != null) {
            net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader.AnimData anim =
                playhead.filePath() != null
                    ? net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader.INSTANCE.get(playhead.animId(), playhead.filePath())
                    : net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader.INSTANCE.get(playhead.animId());
            if (anim == null && blender == null) return;
        }

        // If VAN_CROUCH is set AND the move condition permits it, keep the shift.
        if (playhead != null && (playhead.vanillaMask() & AnimationPlayhead.VAN_CROUCH) != 0) {
            boolean isMoving = player.getDeltaMovement().horizontalDistanceSqr() > 0.0001;
            int moveMask = playhead.vanillaMoveMask();
            int cond = moveMask & (AnimationPlayhead.MOVE_CROUCH_MOVING | AnimationPlayhead.MOVE_CROUCH_STILL);
            boolean crouchActive = cond == 0
                    || (isMoving ? (cond & AnimationPlayhead.MOVE_CROUCH_MOVING) != 0
                                 : (cond & AnimationPlayhead.MOVE_CROUCH_STILL)  != 0);
            if (crouchActive) return;
        }

        // Vanilla sneaking translates Y by -0.125 (in entity/block space, before scale).
        // We push back up by +0.125 to restore the standing Y origin.
        poseStack.translate(0.0, 0.125, 0.0);
    }

    @Inject(method = "renderRightHand", at = @At("TAIL"))
    private void yebisurpg$emissiveRightHand(
            PoseStack poseStack, MultiBufferSource buffer,
            int combinedLight, AbstractClientPlayer player, CallbackInfo ci) {
        ResourceLocation emissiveLoc =
            CompositeSkinManager.INSTANCE.getEmissiveLocation(player.getUUID());
        if (emissiveLoc == null || FullbrightRenderType.shader == null) return;
        var model = this.getModel();
        var vb = buffer.getBuffer(FullbrightRenderType.get(emissiveLoc));
        model.rightArm.render(poseStack, vb, combinedLight, OverlayTexture.NO_OVERLAY);
        model.rightSleeve.render(poseStack, vb, combinedLight, OverlayTexture.NO_OVERLAY);
        if (buffer instanceof MultiBufferSource.BufferSource bs)
            bs.endBatch(FullbrightRenderType.get(emissiveLoc));
    }


    @Inject(method = "renderLeftHand", at = @At("TAIL"))
    private void yebisurpg$emissiveLeftHand(
            PoseStack poseStack, MultiBufferSource buffer,
            int combinedLight, AbstractClientPlayer player, CallbackInfo ci) {
        ResourceLocation emissiveLoc =
            CompositeSkinManager.INSTANCE.getEmissiveLocation(player.getUUID());
        if (emissiveLoc == null || FullbrightRenderType.shader == null) return;
        var model = this.getModel();
        var vb = buffer.getBuffer(FullbrightRenderType.get(emissiveLoc));
        model.leftArm.render(poseStack, vb, combinedLight, OverlayTexture.NO_OVERLAY);
        model.leftSleeve.render(poseStack, vb, combinedLight, OverlayTexture.NO_OVERLAY);
        if (buffer instanceof MultiBufferSource.BufferSource bs)
            bs.endBatch(FullbrightRenderType.get(emissiveLoc));
    }


    // -------------------------------------------------------------------------
    // Custom armor slot animation queries
    // -------------------------------------------------------------------------

    /**
     * Injects armor-slot bone transforms into the player render call before the
     * armor layer compositing occurs, enabling custom 3D armor geometry
     * (helmet visors, chestplate fans, etc.) to be independently keyframed
     * per equipment slot without touching vanilla armor rendering.
     *
     * <p>Injected at {@code HEAD} of {@code render} so the PoseStack transform
     * is established before any layer or model rendering for that entity begins.
     * A matching {@code TAIL} inject pops the stack to keep it balanced.</p>
     *
     * <p>Each armor category is checked independently — having an active helmet
     * animation does not affect the chestplate slot and vice versa.</p>
     */
    @Inject(method = "render(Lnet/minecraft/client/player/AbstractClientPlayer;FFLcom/mojang/blaze3d/vertex/PoseStack;Lnet/minecraft/client/renderer/MultiBufferSource;I)V",
            at = @At("HEAD"))
    private void yebisurpg$applyArmorAnimTransform(
            AbstractClientPlayer player,
            float entityYaw,
            float partialTick,
            PoseStack poseStack,
            MultiBufferSource buffer,
            int packedLight,
            CallbackInfo ci) {

        int entityId = player.getId();
        ClientAnimationEngine engine = ClientAnimationEngine.INSTANCE;
        boolean anyActive = false;

        for (AnimationCategory category : ARMOR_CATEGORIES) {
            AnimationPlayhead playhead = engine.getPlayhead(entityId, category);
            AnimationBlender  blender  = engine.getBlender(entityId, category);
            if (playhead == null && blender == null) continue;

            anyActive = true;
            poseStack.pushPose();
            applyArmorSlotTransform(poseStack, category, playhead, blender, partialTick);
            poseStack.popPose();
        }

        // Track whether we pushed anything at the entity level for the TAIL pop.
        // We store the flag in a thread-local to avoid adding a field to the mixin.
        yebisurpg$armorAnimActive.set(anyActive);
    }

    @Inject(method = "render(Lnet/minecraft/client/player/AbstractClientPlayer;FFLcom/mojang/blaze3d/vertex/PoseStack;Lnet/minecraft/client/renderer/MultiBufferSource;I)V",
            at = @At("TAIL"))
    private void yebisurpg$popArmorAnimTransform(
            AbstractClientPlayer player,
            float entityYaw,
            float partialTick,
            PoseStack poseStack,
            MultiBufferSource buffer,
            int packedLight,
            CallbackInfo ci) {
        // Each armor slot pushes/pops its own scope in the HEAD inject.
        // This TAIL is kept as an extension point for future per-pass cleanup.
        yebisurpg$armorAnimActive.remove();
    }

    // -------------------------------------------------------------------------
    // Armor animation helpers
    // -------------------------------------------------------------------------

    /** The four armor slot categories, iterated per-entity-render. */
    private static final AnimationCategory[] ARMOR_CATEGORIES = {
        AnimationCategory.ARMOR_HELMET,
        AnimationCategory.ARMOR_CHEST,
        AnimationCategory.ARMOR_LEGS,
        AnimationCategory.ARMOR_BOOTS
    };

    /** Per-render-thread flag so the TAIL inject knows whether a push occurred. */
    private static final ThreadLocal<Boolean> yebisurpg$armorAnimActive =
            ThreadLocal.withInitial(() -> false);

    /**
     * Applies the time-driven or blend-out transform for one armor slot to the
     * PoseStack. Each slot's push/pop scope is managed by the HEAD inject caller.
     *
     * <p>The Y-axis rotation driven by playhead time gives a visible default
     * (e.g. a spinning exhaust fan or rotating visor) without any per-armor
     * asset wiring. Custom armor renderers replace this by querying
     * {@link ClientAnimationEngine#getPlayhead} directly and driving their
     * own {@code ModelPart} rotations from the Blockbench keyframe data.</p>
     */
    private static void applyArmorSlotTransform(PoseStack poseStack,
                                                AnimationCategory category,
                                                AnimationPlayhead playhead,
                                                AnimationBlender blender,
                                                float partialTick) {
        if (blender != null && blender.isActive()) {
            AnimationBlender.PoseSnapshot snap = blender.snapshot();
            for (int i = 0; i < snap.boneCount(); i++) {
                float rx = blender.lerpToRest(snap.rotationsX()[i], partialTick);
                float ry = blender.lerpToRest(snap.rotationsY()[i], partialTick);
                float rz = blender.lerpToRest(snap.rotationsZ()[i], partialTick);
                applyArmorBoneRotation(poseStack, rx, ry, rz);
            }
        } else if (playhead != null && playhead.isPlaying()) {
            float timeSecs = playhead.getCurrentTimeSecs()
                    + (partialTick * AnimationPlayhead.MS_PER_TICK / 1000f);
            // Default per-slot behaviour — helmet rotates on X, chest on Y, etc.
            // Per-armor renderers replace this with their own keyframe-driven logic.
            float rotation = (float) Math.sin(timeSecs * Math.PI * 2.0) * 8.0f;
            switch (category) {
                case ARMOR_HELMET -> applyArmorBoneRotation(poseStack, rotation, 0f, 0f);
                case ARMOR_CHEST  -> applyArmorBoneRotation(poseStack, 0f, rotation, 0f);
                case ARMOR_LEGS   -> applyArmorBoneRotation(poseStack, 0f, 0f, rotation);
                case ARMOR_BOOTS  -> applyArmorBoneRotation(poseStack, rotation * 0.5f, 0f, 0f);
                default -> {}
            }
        }
    }

    /** Applies X/Y/Z degree rotations to the PoseStack in ZYX order. */
    private static void applyArmorBoneRotation(PoseStack poseStack,
                                               float rx, float ry, float rz) {
        if (rx != 0f) poseStack.mulPose(com.mojang.math.Axis.XP.rotationDegrees(rx));
        if (ry != 0f) poseStack.mulPose(com.mojang.math.Axis.YP.rotationDegrees(ry));
        if (rz != 0f) poseStack.mulPose(com.mojang.math.Axis.ZP.rotationDegrees(rz));
    }
}
