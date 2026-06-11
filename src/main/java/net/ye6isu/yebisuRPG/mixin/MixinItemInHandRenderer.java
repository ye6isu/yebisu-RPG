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
import net.minecraft.world.item.ItemDisplayContext;
import net.minecraft.world.item.ItemStack;
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

        CompositeSkinManager.INSTANCE.update(player);

        var entityRenderer = mc.getEntityRenderDispatcher().getRenderer(player);
        if (!(entityRenderer instanceof PlayerRenderer playerRenderer)) return;
        PlayerModel<AbstractClientPlayer> playerModel = playerRenderer.getModel();

        float timeSecs = playhead != null ? playhead.getCurrentTimeSecs() : 0f;

        float rightRX, rightRY, rightRZ, leftRX, leftRY, leftRZ;
        float rightPX = 0f, rightPY = 0f, rightPZ = 0f;
        float leftPX  = 0f, leftPY  = 0f, leftPZ  = 0f;
        if (HandDebugState.debugMode) {
            rightRX = HandDebugState.rightRX; rightRY = HandDebugState.rightRY; rightRZ = HandDebugState.rightRZ;
            leftRX  = HandDebugState.leftRX;  leftRY  = HandDebugState.leftRY;  leftRZ  = HandDebugState.leftRZ;
        } else {
            HandAnimationLoader.BonePose r = anim.bone("right_arm");
            HandAnimationLoader.BonePose l = anim.bone("left_arm");
            rightRX = r.rotation().evalX(timeSecs); rightRY = r.rotation().evalY(timeSecs); rightRZ = r.rotation().evalZ(timeSecs);
            leftRX  = l.rotation().evalX(timeSecs); leftRY  = l.rotation().evalY(timeSecs); leftRZ  = l.rotation().evalZ(timeSecs);
            rightPX = r.position().evalX(timeSecs); rightPY = r.position().evalY(timeSecs); rightPZ = r.position().evalZ(timeSecs);
            leftPX  = l.position().evalX(timeSecs); leftPY  = l.position().evalY(timeSecs); leftPZ  = l.position().evalZ(timeSecs);
        }

        var window = mc.getWindow();
        float aspect = (float) window.getWidth() / (float) window.getHeight();
        RenderSystem.setProjectionMatrix(
            new Matrix4f().perspective((float) Math.toRadians(87.0), aspect, 0.01f, 100f),
            VertexSorting.DISTANCE_TO_ORIGIN);

        var mvStack = RenderSystem.getModelViewStack();
        mvStack.pushMatrix();
        mvStack.identity();
        RenderSystem.applyModelViewMatrix();

        ResourceLocation skinTex     = player.getSkin().texture();
        ResourceLocation emissiveTex = CompositeSkinManager.INSTANCE.getEmissiveLocation(player.getUUID());

        RenderSystem.disableCull();

        float rRX = HandDebugState.BASE_RIGHT_RX + rightRX;
        float rTX = HandDebugState.BASE_RIGHT_TX + (HandDebugState.debugMode ? HandDebugState.rightTX : 0f);
        float rTY = HandDebugState.BASE_RIGHT_TY + (HandDebugState.debugMode ? HandDebugState.rightTY : 0f);
        float rTZ = HandDebugState.BASE_RIGHT_TZ + (HandDebugState.debugMode ? HandDebugState.rightTZ : 0f);

        float lRX = HandDebugState.BASE_LEFT_RX + leftRX;
        float lTX = HandDebugState.BASE_LEFT_TX + (HandDebugState.debugMode ? HandDebugState.leftTX : 0f);
        float lTY = HandDebugState.BASE_LEFT_TY + (HandDebugState.debugMode ? HandDebugState.leftTY : 0f);
        float lTZ = HandDebugState.BASE_LEFT_TZ + (HandDebugState.debugMode ? HandDebugState.leftTZ : 0f);

        // Render arm skin + sleeve + emissive.
        renderArmSkin(playerModel.rightArm, playerModel.rightSleeve,
                rRX, rightRY, rightRZ, rTX, rTY, rTZ, rightPX, rightPY, rightPZ,
                skinTex, emissiveTex, bufferSource, packedLight);
        renderArmSkin(playerModel.leftArm, playerModel.leftSleeve,
                lRX, leftRY, leftRZ, lTX, lTY, lTZ, leftPX, leftPY, leftPZ,
                skinTex, emissiveTex, bufferSource, packedLight);

        // Render held items using vanilla renderRightHand / renderLeftHand on our calibrated pose.
        // Set arm rotations first so the vanilla method sees our animation pose, then pass our
        // pose stack — vanilla internally calls arm.translateAndRotate + ItemInHandLayer.
        renderHandWithItem(playerModel.rightArm, playerModel.rightSleeve,
                rRX, rightRY, rightRZ, rTX, rTY, rTZ, rightPX, rightPY, rightPZ,
                playerRenderer, player, bufferSource, packedLight, true);
        renderHandWithItem(playerModel.leftArm, playerModel.leftSleeve,
                lRX, leftRY, leftRZ, lTX, lTY, lTZ, leftPX, leftPY, leftPZ,
                playerRenderer, player, bufferSource, packedLight, false);

        RenderSystem.enableCull();

        mvStack.popMatrix();
        RenderSystem.applyModelViewMatrix();
        RenderSystem.setProjectionMatrix(
            new Matrix4f().perspective((float) Math.toRadians(87.0), aspect, 0.05f, 100f),
            VertexSorting.DISTANCE_TO_ORIGIN);

        ci.cancel();
    }

    private static PoseStack buildArmPose(
            float rx, float ry, float rz,
            float tx, float ty, float tz,
            float px, float py, float pz) {
        PoseStack pose = new PoseStack();
        final float BB_TO_GAME = 0.0821f / 19.87f;
        pose.translate(tx - px * BB_TO_GAME, ty + py * BB_TO_GAME, tz + pz * BB_TO_GAME);
        pose.scale(1f / 16f, -1f / 16f, 1f / 16f);
        pose.translate(0f, 27f, -4f);
        pose.scale(-1f, 1f, 1f);
        return pose;
    }

    private static void renderArmSkin(
            ModelPart arm, ModelPart sleeve,
            float rx, float ry, float rz,
            float tx, float ty, float tz,
            float px, float py, float pz,
            ResourceLocation skinTex, ResourceLocation emissiveTex,
            MultiBufferSource.BufferSource bufferSource, int packedLight) {

        float origX = arm.xRot, origY = arm.yRot, origZ = arm.zRot;
        float origSX = sleeve.xRot, origSY = sleeve.yRot, origSZ = sleeve.zRot;

        arm.xRot    = (float) Math.toRadians(rx);
        arm.yRot    = (float) Math.toRadians(ry);
        arm.zRot    = (float) Math.toRadians(rz);
        sleeve.xRot = (float) Math.toRadians(rx);
        sleeve.yRot = (float) Math.toRadians(ry);
        sleeve.zRot = (float) Math.toRadians(rz);

        PoseStack pose = buildArmPose(rx, ry, rz, tx, ty, tz, px, py, pz);

        arm.render(pose, bufferSource.getBuffer(RenderType.entitySolid(skinTex)), packedLight, OverlayTexture.NO_OVERLAY);
        bufferSource.endBatch(RenderType.entitySolid(skinTex));
        sleeve.render(pose, bufferSource.getBuffer(RenderType.entityTranslucent(skinTex)), packedLight, OverlayTexture.NO_OVERLAY);
        bufferSource.endBatch(RenderType.entityTranslucent(skinTex));

        if (emissiveTex != null && FullbrightRenderType.shader != null) {
            var vcEmissive = bufferSource.getBuffer(FullbrightRenderType.get(emissiveTex));
            arm.render(pose, vcEmissive, packedLight, OverlayTexture.NO_OVERLAY);
            sleeve.render(pose, vcEmissive, packedLight, OverlayTexture.NO_OVERLAY);
            bufferSource.endBatch(FullbrightRenderType.get(emissiveTex));
        }

        arm.xRot = origX; arm.yRot = origY; arm.zRot = origZ;
        sleeve.xRot = origSX; sleeve.yRot = origSY; sleeve.zRot = origSZ;
    }

    /**
     * Renders the held item using the exact same transform that vanilla ItemInHandLayer uses:
     * arm.translateAndRotate → rotateX(-90) → rotateY(180) → translate(±1/16, 0.125, -0.625)
     * → ItemInHandRenderer.renderItem.
     * This is extracted from the ItemInHandLayer bytecode so it matches third-person exactly.
     */
    private static void renderHandWithItem(
            ModelPart arm, ModelPart sleeve,
            float rx, float ry, float rz,
            float tx, float ty, float tz,
            float px, float py, float pz,
            PlayerRenderer playerRenderer, AbstractClientPlayer player,
            MultiBufferSource.BufferSource bufferSource, int packedLight,
            boolean isRightHand) {

        ItemStack heldItem = isRightHand ? player.getMainHandItem() : player.getOffhandItem();
        if (heldItem.isEmpty()) return;

        float origX = arm.xRot, origY = arm.yRot, origZ = arm.zRot;
        arm.xRot = (float) Math.toRadians(rx);
        arm.yRot = (float) Math.toRadians(ry);
        arm.zRot = (float) Math.toRadians(rz);

        PoseStack pose = buildArmPose(rx, ry, rz, tx, ty, tz, px, py, pz);

        // Apply item debug offsets.
        if (HandDebugState.debugMode) {
            if (isRightHand) {
                pose.translate(HandDebugState.rightITX, HandDebugState.rightITY, HandDebugState.rightITZ);
                pose.mulPose(com.mojang.math.Axis.XP.rotationDegrees(HandDebugState.rightIRX));
                pose.mulPose(com.mojang.math.Axis.YP.rotationDegrees(HandDebugState.rightIRY));
                pose.mulPose(com.mojang.math.Axis.ZP.rotationDegrees(HandDebugState.rightIRZ));
            } else {
                pose.translate(HandDebugState.leftITX, HandDebugState.leftITY, HandDebugState.leftITZ);
                pose.mulPose(com.mojang.math.Axis.XP.rotationDegrees(HandDebugState.leftIRX));
                pose.mulPose(com.mojang.math.Axis.YP.rotationDegrees(HandDebugState.leftIRY));
                pose.mulPose(com.mojang.math.Axis.ZP.rotationDegrees(HandDebugState.leftIRZ));
            }
        }

        boolean leftHand = !isRightHand;

        // Replicate ItemInHandLayer.renderArmWithItem exactly (from bytecode):
        // 1. Enter arm's local space.
        arm.translateAndRotate(pose);
        // 2. Vanilla item orientation fix.
        pose.mulPose(com.mojang.math.Axis.XP.rotationDegrees(-90f));
        pose.mulPose(com.mojang.math.Axis.YP.rotationDegrees(180f));
        // 3. For left hand, mirror the item to match how vanilla third-person renders it.
        if (leftHand) pose.mulPose(com.mojang.math.Axis.YP.rotationDegrees(180f));
        // 4. Hand position offset — right = +1/16, left = -1/16.
        pose.translate((leftHand ? -1f : 1f) / 16f, 0.125f, -0.625f);

        ItemDisplayContext ctx = isRightHand
                ? ItemDisplayContext.THIRD_PERSON_RIGHT_HAND
                : ItemDisplayContext.THIRD_PERSON_LEFT_HAND;
        Minecraft.getInstance().getItemRenderer().renderStatic(
                heldItem, ctx, packedLight, OverlayTexture.NO_OVERLAY,
                pose, bufferSource, Minecraft.getInstance().level, 0);
        bufferSource.endBatch();

        arm.xRot = origX; arm.yRot = origY; arm.zRot = origZ;
    }
}
