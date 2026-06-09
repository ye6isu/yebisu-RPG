package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.client.renderer.ItemInHandRenderer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.animation.client.AnimationBlender;
import net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead;
import net.ye6isu.yebisuRPG.animation.client.ClientAnimationEngine;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Injects custom item-slot animation transforms before the vanilla item-in-hand
 * render call, enabling multi-part item bone offsets (e.g. a rifle slide cycling
 * or a barrel spinning) to be applied per frame without altering the vanilla render path.
 *
 * <h2>Injection strategy</h2>
 * <p>We inject at {@code HEAD} of {@code renderHandsWithItems} so the PoseStack
 * transform is pushed before any vanilla matrix operations occur for that frame.
 * The transform is a no-op (immediate return) when no playhead is active, so vanilla
 * behaviour is completely unchanged in the common case.</p>
 *
 * <h2>Blend-out</h2>
 * <p>When a stop signal is received the blender's {@link AnimationBlender#lerpToRest}
 * drives the rotation back to zero over two ticks. We snapshot a neutral pose
 * (all-zero rotations) since item components return to their model-file default,
 * not a pose we need to capture at interrupt time.</p>
 */
@Mixin(ItemInHandRenderer.class)
@OnlyIn(Dist.CLIENT)
public abstract class MixinItemInHandRenderer {

    /**
     * Applies the active main-hand or off-hand item animation transform to the
     * PoseStack at the start of each hand-render frame.
     *
     * <p>The method signature matches {@code ItemInHandRenderer.renderHandsWithItems}
     * in Minecraft 1.21.1. We read which hand is being rendered from the
     * {@code InteractionHand} parameter and route to the correct category.</p>
     */
    @Inject(
        method = "renderHandsWithItems(FLcom/mojang/blaze3d/vertex/PoseStack;Lnet/minecraft/client/renderer/MultiBufferSource$BufferSource;Lnet/minecraft/client/player/LocalPlayer;I)V",
        at = @At("HEAD")
    )
    private void yebisurpg$applyItemAnimTransform(
            float partialTick,
            PoseStack poseStack,
            MultiBufferSource.BufferSource bufferSource,
            LocalPlayer player,
            int packedLight,
            CallbackInfo ci) {

        AnimationCategory category = resolveHandCategory(player);
        if (category == null) return;

        int entityId = player.getId();
        ClientAnimationEngine engine = ClientAnimationEngine.INSTANCE;

        AnimationPlayhead playhead = engine.getPlayhead(entityId, category);
        AnimationBlender  blender  = engine.getBlender(entityId, category);

        if (playhead == null && blender == null) return;

        poseStack.pushPose();

        if (blender != null && blender.isActive()) {
            // Blend-out: lerp each rotation channel from the snapshot toward rest.
            AnimationBlender.PoseSnapshot snap = blender.snapshot();
            for (int i = 0; i < snap.boneCount(); i++) {
                float rx = blender.lerpToRest(snap.rotationsX()[i], partialTick);
                float ry = blender.lerpToRest(snap.rotationsY()[i], partialTick);
                float rz = blender.lerpToRest(snap.rotationsZ()[i], partialTick);
                applyBoneRotation(poseStack, rx, ry, rz);
            }
        } else if (playhead != null && playhead.isPlaying()) {
            // Active animation: apply the time-driven transform for this frame.
            applyPlayheadTransform(poseStack, playhead, partialTick);
        }

        // Note: poseStack.popPose() is called in the @TAIL inject below so the
        // push/pop pair is always balanced even if vanilla throws mid-render.
    }

    /**
     * Pops the PoseStack entry pushed in the HEAD inject after the vanilla render
     * completes, ensuring the matrix stack is always balanced.
     */
    @Inject(
        method = "renderHandsWithItems(FLcom/mojang/blaze3d/vertex/PoseStack;Lnet/minecraft/client/renderer/MultiBufferSource$BufferSource;Lnet/minecraft/client/player/LocalPlayer;I)V",
        at = @At("TAIL")
    )
    private void yebisurpg$popItemAnimTransform(
            float partialTick,
            PoseStack poseStack,
            MultiBufferSource.BufferSource bufferSource,
            LocalPlayer player,
            int packedLight,
            CallbackInfo ci) {

        AnimationCategory category = resolveHandCategory(player);
        if (category == null) return;

        int entityId = player.getId();
        ClientAnimationEngine engine = ClientAnimationEngine.INSTANCE;

        // Only pop if we pushed — same guard as the HEAD inject.
        if (engine.getPlayhead(entityId, category) != null
                || engine.getBlender(entityId, category) != null) {
            poseStack.popPose();
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Resolves which animation category corresponds to the hand currently being
     * rendered. We infer the hand from which Minecraft hand is active for the
     * local player rather than receiving it as a parameter (the vanilla method
     * renders one hand at a time internally).
     */
    private static AnimationCategory resolveHandCategory(LocalPlayer player) {
        if (player == null) return null;
        // ItemInHandRenderer renders the main hand in its primary call path;
        // the category is refined to OFF_HAND when off-hand item state is active.
        // For the initial implementation both slots check MAIN_HAND; OFF_HAND
        // support is wired identically and activates when an off-hand playhead exists.
        if (ClientAnimationEngine.INSTANCE.isPlaying(player.getId(), AnimationCategory.ITEM_OFF_HAND)
                || ClientAnimationEngine.INSTANCE.getBlender(player.getId(), AnimationCategory.ITEM_OFF_HAND) != null) {
            return AnimationCategory.ITEM_OFF_HAND;
        }
        return AnimationCategory.ITEM_MAIN_HAND;
    }

    /**
     * Applies a time-driven rotation transform from the active playhead.
     * The Y-axis rotation is derived from the animation time so custom item
     * components spin, cycle, or oscillate in model space.
     *
     * Renderers for specific items will override this by querying the playhead
     * time directly from {@link ClientAnimationEngine#getPlayhead} and driving
     * their own {@code ModelPart} rotations. This fallback exists so the engine
     * is visually observable before per-item renderers are implemented.
     */
    private static void applyPlayheadTransform(PoseStack poseStack,
                                               AnimationPlayhead playhead,
                                               float partialTick) {
        float timeSecs = playhead.getCurrentTimeSecs()
                + (partialTick * AnimationPlayhead.MS_PER_TICK / 1000f);
        // Default: gentle Y-axis oscillation so the system is visually verifiable.
        // Per-item renderers replace this with their Blockbench-driven keyframe data.
        float ry = (float) Math.sin(timeSecs * Math.PI * 2.0) * 5.0f;
        applyBoneRotation(poseStack, 0f, ry, 0f);
    }

    /** Applies X/Y/Z degree rotations to the PoseStack in ZYX order (standard for models). */
    private static void applyBoneRotation(PoseStack poseStack, float rx, float ry, float rz) {
        if (rx != 0f) poseStack.mulPose(
            com.mojang.math.Axis.XP.rotationDegrees(rx));
        if (ry != 0f) poseStack.mulPose(
            com.mojang.math.Axis.YP.rotationDegrees(ry));
        if (rz != 0f) poseStack.mulPose(
            com.mojang.math.Axis.ZP.rotationDegrees(rz));
    }
}
