package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.systems.RenderSystem;
import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.client.renderer.ItemInHandRenderer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead;
import net.ye6isu.yebisuRPG.animation.client.ClientAnimationEngine;
import net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader;
import net.ye6isu.yebisuRPG.client.debug.HandDebugState;
import net.ye6isu.yebisuRPG.client.renderer.firstperson.FirstPersonHandModel;
import net.ye6isu.yebisuRPG.client.renderer.firstperson.FirstPersonHandRenderer;
import com.mojang.blaze3d.vertex.VertexSorting;
import net.minecraft.client.Minecraft;
import org.joml.Matrix4f;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(ItemInHandRenderer.class)
@OnlyIn(Dist.CLIENT)
public abstract class MixinItemInHandRenderer {

    @Inject(
        method = "renderHandsWithItems(FLcom/mojang/blaze3d/vertex/PoseStack;Lnet/minecraft/client/renderer/MultiBufferSource$BufferSource;Lnet/minecraft/client/player/LocalPlayer;I)V",
        at = @At("HEAD"),
        cancellable = true
    )
    private void yebisurpg$renderFirstPersonHands(
            float partialTick, PoseStack poseStack,
            MultiBufferSource.BufferSource bufferSource,
            LocalPlayer player, int packedLight,
            CallbackInfo ci) {

        int entityId = player.getId();
        AnimationPlayhead playhead = ClientAnimationEngine.INSTANCE.getPlayhead(entityId, AnimationCategory.ENTITY);
        if (playhead == null && !HandDebugState.debugMode) return;

        String animId = playhead != null ? playhead.animId() : null;
        HandAnimationLoader.AnimData anim = animId != null ? HandAnimationLoader.INSTANCE.get(animId) : null;
        if (anim == null && !HandDebugState.debugMode) return;

        FirstPersonHandModel model = FirstPersonHandRenderer.getOrBakeModel();
        if (model == null) return;

        float timeSecs = playhead != null ? playhead.getCurrentTimeSecs() : 0f;

        float rightRX, rightRY, rightRZ, leftRX, leftRY, leftRZ;
        if (HandDebugState.debugMode) {
            rightRX = HandDebugState.rightRX; rightRY = HandDebugState.rightRY; rightRZ = HandDebugState.rightRZ;
            leftRX  = HandDebugState.leftRX;  leftRY  = HandDebugState.leftRY;  leftRZ  = HandDebugState.leftRZ;
        } else {
            HandAnimationLoader.BoneChannel r = anim.bone("right_arm");
            HandAnimationLoader.BoneChannel l = anim.bone("left_arm");
            rightRX = r != null ? r.evalX(timeSecs) : 0f; rightRY = r != null ? r.evalY(timeSecs) : 0f; rightRZ = r != null ? r.evalZ(timeSecs) : 0f;
            leftRX  = l != null ? l.evalX(timeSecs) : 0f; leftRY  = l != null ? l.evalY(timeSecs) : 0f; leftRZ  = l != null ? l.evalZ(timeSecs) : 0f;
        }

        model.rightArm.xRot = (float) Math.toRadians(rightRX);
        model.rightArm.yRot = (float) Math.toRadians(rightRY);
        model.rightArm.zRot = (float) Math.toRadians(rightRZ);
        model.leftArm.xRot  = (float) Math.toRadians(leftRX);
        model.leftArm.yRot  = (float) Math.toRadians(leftRY);
        model.leftArm.zRot  = (float) Math.toRadians(leftRZ);

        // Push a custom projection with near=0.01 so close geometry isn't clipped.
        // Hand FOV is 87°; aspect from window size.
        var window = Minecraft.getInstance().getWindow();
        float aspect = (float) window.getWidth() / (float) window.getHeight();
        Matrix4f handProj = new Matrix4f().perspective(
            (float) Math.toRadians(87.0), aspect, 0.01f, 100f);
        RenderSystem.setProjectionMatrix(handProj, VertexSorting.DISTANCE_TO_ORIGIN);

        // Replace the world-space modelview with identity so geometry
        // is in camera space, not world space.
        var mvStack = RenderSystem.getModelViewStack();
        mvStack.pushMatrix();
        mvStack.identity();
        RenderSystem.applyModelViewMatrix();

        // Build pose in camera space.
        // +X = right, +Y = down (Java model convention), -Z = forward into screen.
        PoseStack pose = new PoseStack();

        float dtx = HandDebugState.BASE_TX + (HandDebugState.debugMode ? HandDebugState.tx : 0f);
        float dty = HandDebugState.BASE_TY + (HandDebugState.debugMode ? HandDebugState.ty : 0f);
        float dtz = HandDebugState.BASE_TZ + (HandDebugState.debugMode ? HandDebugState.tz : 0f);
        pose.translate(dtx, dty, dtz);

        // Scale: Bedrock pixel → block (1/16). Flip Y: Bedrock Y-up, Java model Y-down.
        pose.scale(1f / 16f, -1f / 16f, 1f / 16f);

        // Offset so Camera bone pivot [0,27,4] sits at the pose origin.
        // In Java pixel space (after Y-flip): [0, -27, 4] → negate to bring to origin.
        pose.translate(0f, 27f, -4f);

        RenderSystem.disableCull();
        var vc = bufferSource.getBuffer(RenderType.entitySolid(player.getSkin().texture()));
        model.renderToBuffer(pose, vc, packedLight, OverlayTexture.NO_OVERLAY, 0xFFFFFFFF);
        bufferSource.endBatch(RenderType.entitySolid(player.getSkin().texture()));
        RenderSystem.enableCull();

        mvStack.popMatrix();
        RenderSystem.applyModelViewMatrix();

        // Restore a standard hand projection (vanilla will re-set it anyway after we cancel, but be clean).
        RenderSystem.setProjectionMatrix(
            new Matrix4f().perspective((float) Math.toRadians(87.0), aspect, 0.05f, 100f),
            VertexSorting.DISTANCE_TO_ORIGIN);

        ci.cancel();
    }
}
