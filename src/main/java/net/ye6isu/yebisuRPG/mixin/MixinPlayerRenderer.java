package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.model.PlayerModel;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
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
import net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader;
import net.ye6isu.yebisuRPG.animation.client.TorsoRotationHolder;
import net.ye6isu.yebisuRPG.client.renderer.EntityTextureCompositor;
import net.ye6isu.yebisuRPG.client.renderer.FullbrightRenderType;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyVariable;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Combines two independent concerns on {@link PlayerRenderer}:
 * <ol>
 *   <li><b>First-person emissive glow / composite skin</b> — a confirmed-working,
 *       previously-shipped implementation (see git history: "First person emissive
 *       texture" commit), restored here because the equivalent NeoForge-event-based
 *       approach ({@code RenderArmEvent}) does not fire in the same context and never
 *       actually drew anything. Third-person emissive glow still uses
 *       {@code EmissiveEntityLayer}, a real render layer registered via
 *       {@code EntityRenderersEvent.AddLayers} — only first-person needs a mixin, since
 *       {@code ItemInHandRenderer}'s first-person hand path has no render-layer equivalent.</li>
 *   <li><b>Third-person custom animation</b> — cancels/overrides vanilla
 *       {@code setupRotations} (swim/elytra/sleep tilt) so the player stays upright
 *       during a custom {@code ENTITY_THIRD_PERSON} animation, applies the animation's
 *       own "root" bone pose, and layers per-armor-slot animation transforms.</li>
 * </ol>
 * Both concerns share the same {@code renderRightHand}/{@code renderLeftHand} injection
 * points, so they are combined into one mixin class rather than two, to avoid two
 * separate {@code @Mixin(PlayerRenderer.class)} classes racing on the same methods.
 */
@OnlyIn(Dist.CLIENT)
@Mixin(PlayerRenderer.class)
public abstract class MixinPlayerRenderer extends LivingEntityRenderer<AbstractClientPlayer, PlayerModel<AbstractClientPlayer>> {

    protected MixinPlayerRenderer(EntityRendererProvider.Context context, PlayerModel<AbstractClientPlayer> model, float shadowRadius) {
        super(context, model, shadowRadius);
    }

    // -------------------------------------------------------------------------
    // First-person composite skin / emissive glow
    // -------------------------------------------------------------------------

    /**
     * Cancels vanilla's first-person arm render entirely for whichever hand has the
     * "Hide Vanilla Arm" gate active (see {@link AnimationPlayhead#hideVanillaRightArm()}/
     * {@code hideVanillaLeftArm()}) — the mannequin ({@link ForceRenderCameraEntity}) is
     * already drawing that arm, so vanilla's own {@code renderRightHand}/{@code renderLeftHand}
     * (called from {@code ItemInHandRenderer.renderPlayerArm} when the hand is empty) must not
     * also draw it, or the arm would render twice. Only applies to the empty-hand vanilla arm
     * path — a held item's own first-person model is unaffected, since this gate is meant for
     * "replace my bare vanilla arm with the mannequin's," not for hiding held items.
     */
    @Inject(method = "renderRightHand", at = @At("HEAD"), cancellable = true)
    private void yebisurpg$hideVanillaFirstPersonRightArm(
            PoseStack poseStack, MultiBufferSource buffer, int combinedLight,
            AbstractClientPlayer player, CallbackInfo ci) {
        if (yebisurpg$shouldHideVanillaArm(player, true)) ci.cancel();
    }

    @Inject(method = "renderLeftHand", at = @At("HEAD"), cancellable = true)
    private void yebisurpg$hideVanillaFirstPersonLeftArm(
            PoseStack poseStack, MultiBufferSource buffer, int combinedLight,
            AbstractClientPlayer player, CallbackInfo ci) {
        if (yebisurpg$shouldHideVanillaArm(player, false)) ci.cancel();
    }

    private static boolean yebisurpg$shouldHideVanillaArm(AbstractClientPlayer player, boolean right) {
        ClientAnimationEngine engine = ClientAnimationEngine.INSTANCE;
        int entityId = player.getId();
        AnimationPlayhead playhead = engine.getPlayhead(entityId, AnimationCategory.ENTITY_THIRD_PERSON);
        if (playhead != null) {
            return right ? playhead.hideVanillaRightArm() : playhead.hideVanillaLeftArm();
        }
        var tpPose = engine.getThirdPersonPosePayload(entityId);
        if (tpPose == null) return false;
        return right ? tpPose.effectiveHideVanillaRightArm(player) : tpPose.effectiveHideVanillaLeftArm(player);
    }

    @ModifyVariable(method = "renderHand", at = @At("STORE"), ordinal = 0)
    private ResourceLocation yebisurpg$useCompositeFirstPersonHandTexture(
            ResourceLocation original,
            PoseStack poseStack,
            MultiBufferSource buffer,
            int combinedLight,
            AbstractClientPlayer player,
            ModelPart rendererArm,
            ModelPart rendererArmwear) {
        EntityTextureCompositor.INSTANCE.update(player);
        ResourceLocation composite = EntityTextureCompositor.INSTANCE.getCompositeLocation(player.getId());
        return composite != null ? composite : original;
    }

    // -------------------------------------------------------------------------
    // Third-person custom animation — upright override during prone/crouch
    // -------------------------------------------------------------------------

    // How far down (in blocks) to shift the upright model during prone states
    // (swimming, elytra, crawling). Tune this value to align with water surface.
    // Positive = lower, negative = higher. 1 block = 1.0f.
    private static final float PRONE_Y_OFFSET = -1.21f;

    /**
     * Cancels vanilla setupRotations (swim tilt, elytra tilt, sleep, death spin)
     * and applies only the Y-axis body yaw so the player always renders upright.
     * When a custom animation is active, falls through to let the RETURN injects
     * handle root transforms.
     */
    @Inject(
        method = "setupRotations(Lnet/minecraft/client/player/AbstractClientPlayer;Lcom/mojang/blaze3d/vertex/PoseStack;FFFF)V",
        at = @At("HEAD"),
        cancellable = true
    )
    private void yebisurpg$cancelProneRotation(
            AbstractClientPlayer player,
            PoseStack poseStack,
            float ageInTicks,
            float bodyYaw,
            float partialTick,
            float scale,
            CallbackInfo ci) {

        ClientAnimationEngine engine = ClientAnimationEngine.INSTANCE;
        int entityId = player.getId();
        AnimationPlayhead playhead = engine.getPlayhead(entityId, AnimationCategory.ENTITY_THIRD_PERSON);
        AnimationBlender  blender  = engine.getBlender(entityId, AnimationCategory.ENTITY_THIRD_PERSON);

        HandAnimationLoader.AnimData tpPoseAnim =
                (playhead == null) ? engine.getThirdPersonPose(entityId) : null;

        if (playhead != null || blender != null || tpPoseAnim != null) {
            boolean prone = player.isVisuallySwimming() || player.isFallFlying();
            int vanMask = 0;
            if (playhead != null) vanMask = playhead.vanillaMask();
            else if (tpPoseAnim != null) {
                var tpPose = engine.getThirdPersonPosePayload(entityId);
                if (tpPose != null) vanMask = tpPose.vanillaMask();
            }
            boolean disableProne = (vanMask & AnimationPlayhead.DISABLE_PRONE) != 0;
            boolean disableCrouch = (vanMask & AnimationPlayhead.VAN_CROUCH) != 0;
            if (player.isCrouching() && (disableCrouch || (prone && disableProne))) {
                poseStack.translate(0.0, 0.125, 0.0);
            }
            if (prone && disableProne) {
                poseStack.mulPose(com.mojang.math.Axis.YP.rotationDegrees(180f - bodyYaw));
                poseStack.translate(0.0, PRONE_Y_OFFSET, 0.0);
                int lookMask;
                if (playhead != null) {
                    lookMask = playhead.lookAtMask();
                } else {
                    var tpPose = engine.getThirdPersonPosePayload(entityId);
                    lookMask = tpPose != null ? tpPose.lookAtMask() : 0;
                }
                boolean rootYaw   = (lookMask & AnimationPlayhead.LOOK_ROOT_YAW)   != 0;
                boolean rootPitch = (lookMask & AnimationPlayhead.LOOK_ROOT_PITCH) != 0;
                if (rootYaw) {
                    float lerpedYRot = Mth.lerp(partialTick, player.yRotO, player.getYRot());
                    poseStack.mulPose(com.mojang.math.Axis.YP.rotationDegrees(bodyYaw - lerpedYRot));
                }
                if (rootPitch) {
                    float lerpedXRot = Mth.lerp(partialTick, player.xRotO, player.getXRot());
                    poseStack.mulPose(com.mojang.math.Axis.XP.rotationDegrees(-lerpedXRot));
                }
                ci.cancel();
            }
            return;
        }

        // No custom animation — let vanilla setupRotations handle everything.
    }

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
        int entityId = player.getId();
        AnimationPlayhead playhead = engine.getPlayhead(entityId, AnimationCategory.ENTITY_THIRD_PERSON);
        var tpPose = playhead == null ? engine.getThirdPersonPosePayload(entityId) : null;

        int lookMask = playhead != null ? playhead.lookAtMask() : (tpPose != null ? tpPose.lookAtMask() : 0);
        int vanMask  = playhead != null ? playhead.vanillaMask() : (tpPose != null ? tpPose.vanillaMask() : 0);
        boolean rootLookPitch = (lookMask & AnimationPlayhead.LOOK_ROOT_PITCH) != 0;
        boolean rootLookYaw   = (lookMask & AnimationPlayhead.LOOK_ROOT_YAW)   != 0;
        // When swimming/flying without Disable Prone, vanilla already tilts the body
        // to match pitch — skip Root Pitch to avoid double-rotation.
        boolean prone = player.isVisuallySwimming() || player.isFallFlying();
        boolean disableProne = (vanMask & AnimationPlayhead.DISABLE_PRONE) != 0;
        if (prone && !disableProne) rootLookPitch = false;
        if (rootLookPitch || rootLookYaw) {
            if (rootLookYaw) {
                float lerpedYRot = Mth.lerp(partialTick, player.yRotO, player.getYRot());
                poseStack.mulPose(com.mojang.math.Axis.YP.rotationDegrees(bodyYaw - lerpedYRot));
            }
            if (rootLookPitch) {
                float lerpedXRot = Mth.lerp(partialTick, player.xRotO, player.getXRot());
                poseStack.mulPose(com.mojang.math.Axis.XP.rotationDegrees(-lerpedXRot));
            }
        }

        // Apply the animation's own "root" bone pose on top, same convention as
        // the first-person hand renderer (axis remap JSON->game: Z->X, X->Y, Y->Z;
        // rotation signs negated for Y/X to match Blockbench's right-handed export).
        if (playhead == null) return;
        HandAnimationLoader.AnimData anim =
            playhead.filePath() != null
                ? HandAnimationLoader.INSTANCE.get(playhead.animId(), playhead.filePath())
                : HandAnimationLoader.INSTANCE.get(playhead.animId());
        if (anim == null) return;

        float timeSecs = playhead.getCurrentTimeSecs();
        HandAnimationLoader.BonePose root = anim.bone("root");
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
            final float ROOT_PIVOT_Y = 24f / 16f;
            poseStack.translate(0f, ROOT_PIVOT_Y, 0f);
            if (rootRZ != 0f) poseStack.mulPose(com.mojang.math.Axis.ZP.rotationDegrees(rootRZ));
            if (rootRY != 0f) poseStack.mulPose(com.mojang.math.Axis.YP.rotationDegrees(-rootRY));
            if (rootRX != 0f) poseStack.mulPose(com.mojang.math.Axis.XP.rotationDegrees(-rootRX));
            if (rootSX != 1f || rootSY != 1f || rootSZ != 1f) poseStack.scale(rootSX, rootSY, rootSZ);
            poseStack.translate(0f, -ROOT_PIVOT_Y, 0f);
            poseStack.translate(-rootPX, rootPY, rootPZ);
        }
    }

    // -------------------------------------------------------------------------
    // Combined renderRightHand / renderLeftHand injects
    // -------------------------------------------------------------------------

    /**
     * HEAD: flags that this render pass is drawing a first-person hand, so
     * {@code MixinPlayerModel} skips applying the third-person pose to the same
     * shared {@code PlayerModel} instance (avoids corrupting FP arms — see
     * {@code TorsoRotationHolder.RENDERING_FP_HAND}).
     */
    @Inject(method = "renderRightHand", at = @At("HEAD"))
    private void yebisurpg$fpHandFlagRight(PoseStack poseStack, MultiBufferSource buffer,
            int combinedLight, AbstractClientPlayer player, CallbackInfo ci) {
        TorsoRotationHolder.RENDERING_FP_HAND.set(true);
    }

    @Inject(method = "renderLeftHand", at = @At("HEAD"))
    private void yebisurpg$fpHandFlagLeft(PoseStack poseStack, MultiBufferSource buffer,
            int combinedLight, AbstractClientPlayer player, CallbackInfo ci) {
        TorsoRotationHolder.RENDERING_FP_HAND.set(true);
    }

    /**
     * TAIL: clears the first-person-hand flag, then draws the emissive glow pass
     * for the first-person arm using whichever composite/emissive texture is
     * currently active for this player (skin-layer emissive from
     * {@link EntityTextureCompositor}).
     */
    @Inject(method = "renderRightHand", at = @At("TAIL"))
    private void yebisurpg$tailRightHand(
            PoseStack poseStack, MultiBufferSource buffer,
            int combinedLight, AbstractClientPlayer player, CallbackInfo ci) {
        TorsoRotationHolder.RENDERING_FP_HAND.set(false);
        ResourceLocation emissiveLoc = EntityTextureCompositor.INSTANCE.getEmissiveLocation(player.getId());
        if (emissiveLoc == null || FullbrightRenderType.shader == null) return;
        var model = getModel();
        var vb = buffer.getBuffer(FullbrightRenderType.get(emissiveLoc));
        model.rightArm.render(poseStack, vb, combinedLight, OverlayTexture.NO_OVERLAY);
        model.rightSleeve.render(poseStack, vb, combinedLight, OverlayTexture.NO_OVERLAY);
        if (buffer instanceof MultiBufferSource.BufferSource bs) {
            bs.endBatch(FullbrightRenderType.get(emissiveLoc));
        }
    }

    @Inject(method = "renderLeftHand", at = @At("TAIL"))
    private void yebisurpg$tailLeftHand(
            PoseStack poseStack, MultiBufferSource buffer,
            int combinedLight, AbstractClientPlayer player, CallbackInfo ci) {
        TorsoRotationHolder.RENDERING_FP_HAND.set(false);
        ResourceLocation emissiveLoc = EntityTextureCompositor.INSTANCE.getEmissiveLocation(player.getId());
        if (emissiveLoc == null || FullbrightRenderType.shader == null) return;
        var model = getModel();
        var vb = buffer.getBuffer(FullbrightRenderType.get(emissiveLoc));
        model.leftArm.render(poseStack, vb, combinedLight, OverlayTexture.NO_OVERLAY);
        model.leftSleeve.render(poseStack, vb, combinedLight, OverlayTexture.NO_OVERLAY);
        if (buffer instanceof MultiBufferSource.BufferSource bs) {
            bs.endBatch(FullbrightRenderType.get(emissiveLoc));
        }
    }

    // -------------------------------------------------------------------------
    // Custom armor slot animation
    // -------------------------------------------------------------------------

    /**
     * Injects armor-slot bone transforms into the player render call before the
     * armor layer compositing occurs, enabling custom 3D armor geometry
     * (helmet visors, chestplate fans, etc.) to be independently keyframed
     * per equipment slot without touching vanilla armor rendering.
     *
     * <p>Each armor category is checked independently — having an active helmet
     * animation does not affect the chestplate slot and vice versa. Only the
     * blend-out (interrupted-animation) case renders a real transform here — the
     * old_mod reference implementation's "live playing" default (a sine-wave spin
     * standing in for a per-armor renderer, per its own comments) was placeholder-only
     * demo code and is intentionally not ported; a real per-armor renderer should query
     * {@link ClientAnimationEngine#getPlayhead} directly and drive its own keyframed
     * {@code ModelPart} rotations instead of relying on a generic fallback here.</p>
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

        for (AnimationCategory category : ARMOR_CATEGORIES) {
            AnimationBlender blender = engine.getBlender(entityId, category);
            if (blender == null || !blender.isActive()) continue;

            poseStack.pushPose();
            AnimationBlender.PoseSnapshot snap = blender.snapshot();
            for (int i = 0; i < snap.boneCount(); i++) {
                float rx = blender.lerpToRest(snap.rotationsX()[i], partialTick);
                float ry = blender.lerpToRest(snap.rotationsY()[i], partialTick);
                float rz = blender.lerpToRest(snap.rotationsZ()[i], partialTick);
                if (rx != 0f) poseStack.mulPose(com.mojang.math.Axis.XP.rotationDegrees(rx));
                if (ry != 0f) poseStack.mulPose(com.mojang.math.Axis.YP.rotationDegrees(ry));
                if (rz != 0f) poseStack.mulPose(com.mojang.math.Axis.ZP.rotationDegrees(rz));
            }
            poseStack.popPose();
        }
    }

    /** The four armor slot categories, iterated per-entity-render. */
    private static final AnimationCategory[] ARMOR_CATEGORIES = {
        AnimationCategory.ARMOR_HELMET,
        AnimationCategory.ARMOR_CHEST,
        AnimationCategory.ARMOR_LEGS,
        AnimationCategory.ARMOR_BOOTS
    };
}
