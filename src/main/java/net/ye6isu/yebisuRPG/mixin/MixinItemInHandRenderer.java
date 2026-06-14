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
import net.ye6isu.yebisuRPG.animation.AnimationLoopMode;
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

    // Smoothed look-lag offsets — yaw and pitch lag that decays toward zero each frame.
    private static float yebisu$lagYaw   = 0f;
    private static float yebisu$lagPitch = 0f;
    private static float yebisu$prevYaw   = Float.NaN;
    private static float yebisu$prevPitch = Float.NaN;

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

        // Fall back to the persistent hand pose when no animation is playing.
        HandAnimationLoader.AnimData handPoseAnim = playhead == null
                ? ClientAnimationEngine.INSTANCE.getHandPose(entityId)
                : null;

        if (playhead == null && handPoseAnim == null && !HandDebugState.debugMode) return;

        String animId = playhead != null ? playhead.animId() : null;
        HandAnimationLoader.AnimData anim = animId != null
                ? (playhead.filePath() != null
                        ? HandAnimationLoader.INSTANCE.get(animId, playhead.filePath())
                        : HandAnimationLoader.INSTANCE.get(animId))
                : handPoseAnim;
        if (anim == null && !HandDebugState.debugMode) return;

        Minecraft mc = Minecraft.getInstance();

        CompositeSkinManager.INSTANCE.update(player);

        var entityRenderer = mc.getEntityRenderDispatcher().getRenderer(player);
        if (!(entityRenderer instanceof PlayerRenderer playerRenderer)) return;
        PlayerModel<AbstractClientPlayer> playerModel = playerRenderer.getModel();

        float timeSecs;
        if (playhead == null) {
            // Hand pose: sample at last frame to show the idle/hold position.
            timeSecs = anim != null ? anim.length() : 0f;
        } else {
            float raw = playhead.getCurrentTimeSecs();
            if (anim != null && playhead.effectiveLoopMode(anim) == AnimationLoopMode.HOLD_LAST) {
                timeSecs = Math.min(raw, anim.length());
            } else {
                timeSecs = raw;
            }
        }

        float rootRX = 0f, rootRY = 0f, rootRZ = 0f;
        float rootPX = 0f, rootPY = 0f, rootPZ = 0f;
        float rightRX, rightRY, rightRZ, leftRX, leftRY, leftRZ;
        float rightPX = 0f, rightPY = 0f, rightPZ = 0f;
        float leftPX  = 0f, leftPY  = 0f, leftPZ  = 0f;
        if (HandDebugState.debugMode) {
            rightRX = HandDebugState.rightRX; rightRY = HandDebugState.rightRY; rightRZ = HandDebugState.rightRZ;
            leftRX  = HandDebugState.leftRX;  leftRY  = HandDebugState.leftRY;  leftRZ  = HandDebugState.leftRZ;
        } else {
            HandAnimationLoader.BonePose root = anim != null ? anim.bone("root") : HandAnimationLoader.EMPTY_POSE_PUBLIC;
            HandAnimationLoader.BonePose r    = anim != null ? anim.bone("right_arm") : HandAnimationLoader.EMPTY_POSE_PUBLIC;
            HandAnimationLoader.BonePose l    = anim != null ? anim.bone("left_arm")  : HandAnimationLoader.EMPTY_POSE_PUBLIC;
            rootRX = root.rotation().evalX(timeSecs); rootRY = root.rotation().evalY(timeSecs); rootRZ = root.rotation().evalZ(timeSecs);
            rootPX = root.position().evalX(timeSecs); rootPY = root.position().evalY(timeSecs); rootPZ = root.position().evalZ(timeSecs);
            rightRX = r.rotation().evalX(timeSecs); rightRY = r.rotation().evalY(timeSecs); rightRZ = r.rotation().evalZ(timeSecs);
            leftRX  = l.rotation().evalX(timeSecs); leftRY  = l.rotation().evalY(timeSecs); leftRZ  = l.rotation().evalZ(timeSecs);
            rightPX = r.position().evalX(timeSecs); rightPY = r.position().evalY(timeSecs); rightPZ = r.position().evalZ(timeSecs);
            leftPX  = l.position().evalX(timeSecs); leftPY  = l.position().evalY(timeSecs); leftPZ  = l.position().evalZ(timeSecs);
        }

        var window = mc.getWindow();
        float aspect = (float) window.getWidth() / (float) window.getHeight();
        RenderSystem.setProjectionMatrix(
            new Matrix4f().perspective((float) Math.toRadians(87.0), aspect, 0.001f, 100f),
            VertexSorting.DISTANCE_TO_ORIGIN);

        // Bob: dampen translation, keep rotation at full strength.
        var bobMat = poseStack.last().pose();
        float bobTX = bobMat.m30();
        float bobTY = bobMat.m31();
        float bobTZ = bobMat.m32();
        var dampedBob = new Matrix4f(bobMat);
        dampedBob.m30(bobTX * 0.05f);
        dampedBob.m31(bobTY * 0.05f);
        dampedBob.m32(bobTZ * 0.05f);

        // Look-around lag: accumulate yaw/pitch delta each frame, decay toward zero.
        // This makes the arms trail behind camera turns and spring back smoothly.
        float currentYaw   = player.getViewYRot(partialTick);
        float currentPitch = player.getViewXRot(partialTick);
        if (Float.isNaN(yebisu$prevYaw)) {
            yebisu$prevYaw   = currentYaw;
            yebisu$prevPitch = currentPitch;
        }
        float rawYawDelta   = currentYaw   - yebisu$prevYaw;
        float rawPitchDelta = currentPitch - yebisu$prevPitch;
        // Wrap yaw delta to [-180, 180] to avoid teleport jumps.
        while (rawYawDelta >  180f) rawYawDelta -= 360f;
        while (rawYawDelta < -180f) rawYawDelta += 360f;
        // Accumulate into lag (scale controls strength) then decay (0.08 = fast spring).
        yebisu$lagYaw   = (yebisu$lagYaw   - rawYawDelta   * -0.15f) * 0.925f;
        yebisu$lagPitch = (yebisu$lagPitch - rawPitchDelta * -0.15f) * 0.925f;
        yebisu$prevYaw   = currentYaw;
        yebisu$prevPitch = currentPitch;

        // Root pivot from Blockbench geometry [0,21,-8], camera pivot [0,27,4].
        // Conversion: x=0-0, y=-(21-27)=6, z=-8-4=-12, all divided by 16.
        final float ROOT_PIVOT_X =   0f / 16f;
        final float ROOT_PIVOT_Y =   -0.43f / 16f;
        final float ROOT_PIVOT_Z = -0.4f / 16f;
        // Same scale used for arm position (BB_TO_GAME).
        final float ROOT_POS_RATIO = 0.0821f / 19.87f;

        var mvStack = RenderSystem.getModelViewStack();
        mvStack.pushMatrix();
        mvStack.mul(dampedBob);
        mvStack.rotate(com.mojang.math.Axis.YP.rotationDegrees(yebisu$lagYaw));
        mvStack.rotate(com.mojang.math.Axis.XP.rotationDegrees(yebisu$lagPitch));
        // Root bone: translate to pivot, rotate, translate back, then apply position offset.
        if (rootRX != 0f || rootRY != 0f || rootRZ != 0f || rootPX != 0f || rootPY != 0f || rootPZ != 0f) {
            mvStack.translate( ROOT_PIVOT_X,  ROOT_PIVOT_Y,  ROOT_PIVOT_Z);
            if (rootRZ != 0f) mvStack.rotate(com.mojang.math.Axis.ZP.rotationDegrees(rootRZ));
            if (rootRY != 0f) mvStack.rotate(com.mojang.math.Axis.YP.rotationDegrees(-rootRY));
            if (rootRX != 0f) mvStack.rotate(com.mojang.math.Axis.XP.rotationDegrees(-rootRX));
            mvStack.translate(-ROOT_PIVOT_X, -ROOT_PIVOT_Y, -ROOT_PIVOT_Z);
            mvStack.translate(-rootPX * ROOT_POS_RATIO, rootPY * ROOT_POS_RATIO, rootPZ * ROOT_POS_RATIO);
        }
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

        // Read item-socket bones from the animation (right_item_socket / left_item_socket).
        float rightIPX = 0f, rightIPY = 0f, rightIPZ = 0f;
        float rightIRX = 0f, rightIRY = 0f, rightIRZ = 0f;
        float leftIPX  = 0f, leftIPY  = 0f, leftIPZ  = 0f;
        float leftIRX  = 0f, leftIRY  = 0f, leftIRZ  = 0f;
        if (anim != null) {
            HandAnimationLoader.BonePose ri = anim.bone("right_item_socket");
            HandAnimationLoader.BonePose li = anim.bone("left_item_socket");
            rightIPX = ri.position().evalX(timeSecs); rightIPY = ri.position().evalY(timeSecs); rightIPZ = ri.position().evalZ(timeSecs);
            rightIRX = ri.rotation().evalX(timeSecs); rightIRY = ri.rotation().evalY(timeSecs); rightIRZ = ri.rotation().evalZ(timeSecs);
            leftIPX  = li.position().evalX(timeSecs); leftIPY  = li.position().evalY(timeSecs); leftIPZ  = li.position().evalZ(timeSecs);
            leftIRX  = li.rotation().evalX(timeSecs); leftIRY  = li.rotation().evalY(timeSecs); leftIRZ  = li.rotation().evalZ(timeSecs);
        }

        // Render held items using vanilla renderRightHand / renderLeftHand on our calibrated pose.
        // Set arm rotations first so the vanilla method sees our animation pose, then pass our
        // pose stack — vanilla internally calls arm.translateAndRotate + ItemInHandLayer.
        renderHandWithItem(
                rRX, rightRY, rightRZ, rTX, rTY, rTZ, rightPX, rightPY, rightPZ,
                rightIPX, rightIPY, rightIPZ, rightIRX, rightIRY, rightIRZ,
                player, bufferSource, packedLight, true);
        renderHandWithItem(
                lRX, leftRY, leftRZ, lTX, lTY, lTZ, leftPX, leftPY, leftPZ,
                leftIPX, leftIPY, leftIPZ, leftIRX, leftIRY, leftIRZ,
                player, bufferSource, packedLight, false);

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
     * Renders the held item parented to the custom arm's pivot so the item
     * moves exactly with the arm's animation rotation and position.
     *
     * Instead of using vanilla arm.translateAndRotate (which uses the vanilla
     * PlayerModel arm pivot), we manually enter the coordinate space of our
     * FirstPersonHandModel arm pivot:
     *   right_arm: partOffset = (-5, 5, -4) in model units → (-5/16, 5/16, -4/16) after scale
     *   left_arm:  partOffset = ( 5, 5, -4) in model units → ( 5/16, 5/16, -4/16) after scale
     * Y is negated by the -1 Y scale already baked into buildArmPose.
     *
     * We translate to the arm pivot, rotate there, then place the item at the
     * bottom of the arm (hand tip) using the same offset vanilla uses relative
     * to the arm pivot in third-person.
     */
    /**
     * Ratio that converts Blockbench position units (item-socket bone) to game-space units.
     * The arm uses BB_TO_GAME = 0.0821f / 19.87f ≈ 0.00413. Item-socket values are in the
     * same BB units, but the item lives in arm-local space after the 1/16 scale in buildArmPose,
     * so the effective scale is 1/16. Adjust ITEM_SOCKET_RATIO to calibrate how far one BB unit
     * moves the item in the rendered scene.
     */
    private static final float ITEM_SOCKET_RATIO = 1f / 16f;

    private static void renderHandWithItem(
            float rx, float ry, float rz,
            float tx, float ty, float tz,
            float px, float py, float pz,
            float socketPX, float socketPY, float socketPZ,
            float socketRX, float socketRY, float socketRZ,
            AbstractClientPlayer player,
            MultiBufferSource.BufferSource bufferSource, int packedLight,
            boolean isRightHand) {

        ItemStack heldItem = isRightHand ? player.getMainHandItem() : player.getOffhandItem();
        if (heldItem.isEmpty()) return;

        boolean leftHand = !isRightHand;

        // Build the base arm pose (camera origin, scaled model space).
        PoseStack pose = buildArmPose(rx, ry, rz, tx, ty, tz, px, py, pz);

        // 1. Enter arm's shoulder pivot (replicating ModelPart.translateAndRotate).
        //    Must match the vanilla PlayerModel (HumanoidModel) pivot that renderArmSkin uses:
        //    rightArm=(-5, 2, 0), leftArm=(5, 2, 0). Divided by 16 as ModelPart does internally.
        float armPivotX = (isRightHand ? -5f : 5f) / 16f;
        float armPivotY = 2f / 16f;
        float armPivotZ = 0f;
        pose.translate(armPivotX, armPivotY, armPivotZ);

        // 2. Arm rotation at shoulder (ZYX, same order as ModelPart).
        if (rz != 0f) pose.mulPose(com.mojang.math.Axis.ZP.rotationDegrees(rz));
        if (ry != 0f) pose.mulPose(com.mojang.math.Axis.YP.rotationDegrees(ry));
        if (rx != 0f) pose.mulPose(com.mojang.math.Axis.XP.rotationDegrees(rx));

        // 3. Item orientation fix — same for both hands.
        // The scale(-1,1,1) in buildArmPose already mirrors X for both arms,
        // so the left arm is already the mirror image of the right. No extra
        // flip needed — applying the same rotations and offset as the right hand
        // gives a symmetrical result through the mirror.
        pose.mulPose(com.mojang.math.Axis.XP.rotationDegrees(-90f));
        pose.mulPose(com.mojang.math.Axis.YP.rotationDegrees(180f));

        // 4. Default hand-tip offset (wrist position in arm-local space).
        // scale(-1,1,1) mirrors X, so the left hand needs a negated X to land correctly.
        pose.translate((leftHand ? -1f : 1f) / 16f, 0.125f, -0.625f);

        // 5. Item socket — animation position + rotation for right_item_socket / left_item_socket.
        //    Position units from Blockbench are scaled by ITEM_SOCKET_RATIO.
        //    Debug mode overrides with HandDebugState sliders on top.
        float finalSocketPX = socketPX, finalSocketPY = socketPY, finalSocketPZ = socketPZ;
        float finalSocketRX = socketRX, finalSocketRY = socketRY, finalSocketRZ = socketRZ;
        if (HandDebugState.debugMode) {
            if (isRightHand) {
                finalSocketPX += HandDebugState.rightITX; finalSocketPY += HandDebugState.rightITY; finalSocketPZ += HandDebugState.rightITZ;
                finalSocketRX += HandDebugState.rightIRX; finalSocketRY += HandDebugState.rightIRY; finalSocketRZ += HandDebugState.rightIRZ;
            } else {
                finalSocketPX += HandDebugState.leftITX; finalSocketPY += HandDebugState.leftITY; finalSocketPZ += HandDebugState.leftITZ;
                finalSocketRX += HandDebugState.leftIRX; finalSocketRY += HandDebugState.leftIRY; finalSocketRZ += HandDebugState.leftIRZ;
            }
        }
        if (finalSocketPX != 0f || finalSocketPY != 0f || finalSocketPZ != 0f)
            pose.translate(-finalSocketPX * ITEM_SOCKET_RATIO, -finalSocketPZ * ITEM_SOCKET_RATIO, finalSocketPY * ITEM_SOCKET_RATIO);
        if (finalSocketRX != 0f) pose.mulPose(com.mojang.math.Axis.XP.rotationDegrees(-finalSocketRX));
        if (finalSocketRZ != 0f) pose.mulPose(com.mojang.math.Axis.YP.rotationDegrees(-finalSocketRZ));
        if (finalSocketRY != 0f) pose.mulPose(com.mojang.math.Axis.ZP.rotationDegrees(-finalSocketRY));

        // For the left hand, mirror X around the item's pivot so asymmetric items
        // (shield, sword, bow, crossbow, trident) face the correct direction.
        // scale(-1,1,1) flips winding order, so cull is disabled for the render.
        if (leftHand) pose.scale(-1f, 1f, 1f);

        ItemDisplayContext ctx = ItemDisplayContext.THIRD_PERSON_RIGHT_HAND;
        if (leftHand) RenderSystem.disableCull();
        Minecraft.getInstance().getItemRenderer().renderStatic(
                player, heldItem, ctx, false, pose, bufferSource,
                Minecraft.getInstance().level, packedLight, OverlayTexture.NO_OVERLAY, 0);
        bufferSource.endBatch();
        if (leftHand) RenderSystem.enableCull();
    }
}
