package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.systems.RenderSystem;
import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexSorting;
import net.minecraft.client.Minecraft;
import net.minecraft.client.model.PlayerModel;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.client.renderer.ItemInHandRenderer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.entity.player.PlayerRenderer;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead;
import net.ye6isu.yebisuRPG.animation.client.ClientAnimationEngine;
import net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader;
import net.ye6isu.yebisuRPG.client.debug.HandDebugState;
import net.ye6isu.yebisuRPG.client.renderer.CompositeSkinManager;
import net.ye6isu.yebisuRPG.client.renderer.FullbrightRenderType;
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

        Minecraft mc = Minecraft.getInstance();

        // Advance the animated/emissive texture for this player.
        CompositeSkinManager.INSTANCE.update(player);

        // Get the actual PlayerModel — handles slim/wide arm type automatically.
        var entityRenderer = mc.getEntityRenderDispatcher().getRenderer(player);
        if (!(entityRenderer instanceof PlayerRenderer playerRenderer)) return;
        PlayerModel<AbstractClientPlayer> playerModel = playerRenderer.getModel();

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

        // Push projection with near=0.01 to avoid clipping close geometry.
        var window = mc.getWindow();
        float aspect = (float) window.getWidth() / (float) window.getHeight();
        Matrix4f handProj = new Matrix4f().perspective((float) Math.toRadians(87.0), aspect, 0.01f, 100f);
        RenderSystem.setProjectionMatrix(handProj, VertexSorting.DISTANCE_TO_ORIGIN);

        // Identity modelview — strips world rotation, puts us in camera space.
        var mvStack = RenderSystem.getModelViewStack();
        mvStack.pushMatrix();
        mvStack.identity();
        RenderSystem.applyModelViewMatrix();

        ResourceLocation skinTex     = player.getSkin().texture();
        ResourceLocation emissiveTex = CompositeSkinManager.INSTANCE.getEmissiveLocation(player.getUUID());

        RenderSystem.disableCull();

        // Render each arm separately so we can apply the correct X-mirror per arm.
        // PlayerModel geometry: rightArm is mirrored (box at negative X), leftArm is normal.
        // We un-mirror rightArm by rendering it inside a scale(-1,1,1) scope.
        renderArm(playerModel.rightArm, playerModel.rightSleeve, rightRX, rightRY, rightRZ,
                  skinTex, emissiveTex, bufferSource, packedLight);
        renderArm(playerModel.leftArm,  playerModel.leftSleeve,  leftRX,  leftRY,  leftRZ,
                  skinTex, emissiveTex, bufferSource, packedLight);

        RenderSystem.enableCull();

        mvStack.popMatrix();
        RenderSystem.applyModelViewMatrix();
        RenderSystem.setProjectionMatrix(
            new Matrix4f().perspective((float) Math.toRadians(87.0), aspect, 0.05f, 100f),
            VertexSorting.DISTANCE_TO_ORIGIN);

        ci.cancel();
    }

    private static void renderArm(
            ModelPart arm, ModelPart sleeve,
            float rx, float ry, float rz,
            ResourceLocation skinTex, ResourceLocation emissiveTex,
            MultiBufferSource.BufferSource bufferSource, int packedLight) {

        // Save original rotations — PlayerModel is shared/reused.
        float origX = arm.xRot, origY = arm.yRot, origZ = arm.zRot;
        float origSX = sleeve.xRot, origSY = sleeve.yRot, origSZ = sleeve.zRot;

        arm.xRot    = (float) Math.toRadians(rx);
        arm.yRot    = (float) Math.toRadians(ry);
        arm.zRot    = (float) Math.toRadians(rz);
        sleeve.xRot = (float) Math.toRadians(rx);
        sleeve.yRot = (float) Math.toRadians(ry);
        sleeve.zRot = (float) Math.toRadians(rz);

        PoseStack pose = new PoseStack();

        float dtx = HandDebugState.BASE_TX + (HandDebugState.debugMode ? HandDebugState.tx : 0f);
        float dty = HandDebugState.BASE_TY + (HandDebugState.debugMode ? HandDebugState.ty : 0f);
        float dtz = HandDebugState.BASE_TZ + (HandDebugState.debugMode ? HandDebugState.tz : 0f);
        pose.translate(dtx, dty, dtz);
        pose.scale(1f / 16f, -1f / 16f, 1f / 16f);
        pose.translate(0f, 27f, -4f);

        // Both arm geometries in PlayerModel are stored mirrored — flip X for both.
        pose.scale(-1f, 1f, 1f);

        // Layer 1: base skin.
        arm.render(pose, bufferSource.getBuffer(RenderType.entitySolid(skinTex)), packedLight, OverlayTexture.NO_OVERLAY);
        bufferSource.endBatch(RenderType.entitySolid(skinTex));

        // Layer 2: jacket/sleeve overlay.
        sleeve.render(pose, bufferSource.getBuffer(RenderType.entityTranslucent(skinTex)), packedLight, OverlayTexture.NO_OVERLAY);
        bufferSource.endBatch(RenderType.entityTranslucent(skinTex));

        // Layer 3: emissive/animated texture.
        if (emissiveTex != null && FullbrightRenderType.shader != null) {
            var vcEmissive = bufferSource.getBuffer(FullbrightRenderType.get(emissiveTex));
            arm.render(pose, vcEmissive, packedLight, OverlayTexture.NO_OVERLAY);
            sleeve.render(pose, vcEmissive, packedLight, OverlayTexture.NO_OVERLAY);
            bufferSource.endBatch(FullbrightRenderType.get(emissiveTex));
        }

        // Restore original rotations.
        arm.xRot = origX; arm.yRot = origY; arm.zRot = origZ;
        sleeve.xRot = origSX; sleeve.yRot = origSY; sleeve.zRot = origSZ;
    }
}
