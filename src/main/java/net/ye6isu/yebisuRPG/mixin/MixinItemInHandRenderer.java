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
import net.ye6isu.yebisuRPG.client.debug.HandArmCalibration;
import net.ye6isu.yebisuRPG.client.renderer.EntityTextureCompositor;
import net.ye6isu.yebisuRPG.client.renderer.FullbrightRenderType;
import org.joml.Matrix4f;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(ItemInHandRenderer.class)
@OnlyIn(Dist.CLIENT)
public abstract class MixinItemInHandRenderer {

    @org.spongepowered.asm.mixin.Shadow private ItemStack mainHandItem;
    @org.spongepowered.asm.mixin.Shadow private ItemStack offHandItem;
    @org.spongepowered.asm.mixin.Shadow private float mainHandHeight;
    @org.spongepowered.asm.mixin.Shadow private float oMainHandHeight;
    @org.spongepowered.asm.mixin.Shadow private float offHandHeight;
    @org.spongepowered.asm.mixin.Shadow private float oOffHandHeight;

    @org.spongepowered.asm.mixin.gen.Invoker("renderArmWithItem")
    abstract void invokeRenderArmWithItem(net.minecraft.client.player.AbstractClientPlayer player,
        float partialTicks, float pitch, net.minecraft.world.InteractionHand hand,
        float swingProgress, ItemStack stack, float equippedProgress,
        PoseStack poseStack, MultiBufferSource buffer, int combinedLight);

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

        // Allow Vanilla Actions: when the hand pose has this flag and the player is
        // using an item or swinging, skip the pose so vanilla hand animations play.
        if (playhead == null && handPoseAnim != null) {
            var hpPayload = ClientAnimationEngine.INSTANCE.getHandPosePayload(entityId);
            if (hpPayload != null && hpPayload.allowVanillaActions()
                    && (player.isUsingItem() || player.swinging)) return;
        }

        if (playhead == null && handPoseAnim == null) return;

        String animId = playhead != null ? playhead.animId() : null;
        HandAnimationLoader.AnimData anim = animId != null
                ? (playhead.filePath() != null
                        ? HandAnimationLoader.INSTANCE.get(animId, playhead.filePath())
                        : HandAnimationLoader.INSTANCE.get(animId))
                : handPoseAnim;
        if (anim == null) return;

        Minecraft mc = Minecraft.getInstance();

        EntityTextureCompositor.INSTANCE.update(player);

        var entityRenderer = mc.getEntityRenderDispatcher().getRenderer(player);
        if (!(entityRenderer instanceof PlayerRenderer playerRenderer)) return;
        PlayerModel<AbstractClientPlayer> playerModel = playerRenderer.getModel();

        float timeSecs;
        if (playhead == null) {
            // Hand pose: looping anims play continuously, others hold last frame.
            if (anim != null && anim.loopMode() == AnimationLoopMode.LOOP && anim.length() > 0f) {
                float elapsed = ClientAnimationEngine.INSTANCE.getPoseElapsedSecs(entityId, false);
                timeSecs = elapsed % anim.length();
            } else {
                timeSecs = anim != null ? anim.length() : 0f;
            }
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
        float rootSX = 1f, rootSY = 1f, rootSZ = 1f;
        float rightRX = 0f, rightRY = 0f, rightRZ = 0f;
        float leftRX  = 0f, leftRY  = 0f, leftRZ  = 0f;
        float rightPX = 0f, rightPY = 0f, rightPZ = 0f;
        float leftPX  = 0f, leftPY  = 0f, leftPZ  = 0f;
        float rightSX = 1f, rightSY = 1f, rightSZ = 1f;
        float leftSX  = 1f, leftSY  = 1f, leftSZ  = 1f;
        float rightLegRX = 0f, rightLegRY = 0f, rightLegRZ = 0f;
        float leftLegRX  = 0f, leftLegRY  = 0f, leftLegRZ  = 0f;
        float rightLegPX = 0f, rightLegPY = 0f, rightLegPZ = 0f;
        float leftLegPX  = 0f, leftLegPY  = 0f, leftLegPZ  = 0f;
        float rightLegSX = 1f, rightLegSY = 1f, rightLegSZ = 1f;
        float leftLegSX  = 1f, leftLegSY  = 1f, leftLegSZ  = 1f;
        boolean rightVanilla = false, leftVanilla = false;

        // Hand filter: when an animation is playing with HAND_SKIP_RIGHT/LEFT,
        // the skipped hand keeps the pose values instead of the animation values.
        boolean skipRight = playhead != null && (playhead.vanillaMask() & AnimationPlayhead.HAND_SKIP_RIGHT) != 0;
        boolean skipLeft  = playhead != null && (playhead.vanillaMask() & AnimationPlayhead.HAND_SKIP_LEFT)  != 0;

        // First, read from the active source (animation or pose) for root + legs
        HandAnimationLoader.BonePose root = anim != null ? anim.bone("root") : HandAnimationLoader.EMPTY_POSE_PUBLIC;
        rootRX = root.rotation().evalX(timeSecs); rootRY = root.rotation().evalY(timeSecs); rootRZ = root.rotation().evalZ(timeSecs);
        rootPX = root.position().evalX(timeSecs); rootPY = root.position().evalY(timeSecs); rootPZ = root.position().evalZ(timeSecs);
        rootSX = root.scale().evalX(timeSecs);    rootSY = root.scale().evalY(timeSecs);    rootSZ = root.scale().evalZ(timeSecs);

        HandAnimationLoader.BonePose rl = anim != null ? anim.bone("right_leg") : HandAnimationLoader.EMPTY_POSE_PUBLIC;
        HandAnimationLoader.BonePose ll = anim != null ? anim.bone("left_leg")  : HandAnimationLoader.EMPTY_POSE_PUBLIC;
        rightLegRX = rl.rotation().evalX(timeSecs); rightLegRY = rl.rotation().evalY(timeSecs); rightLegRZ = rl.rotation().evalZ(timeSecs);
        leftLegRX  = ll.rotation().evalX(timeSecs); leftLegRY  = ll.rotation().evalY(timeSecs); leftLegRZ  = ll.rotation().evalZ(timeSecs);
        rightLegPX = rl.position().evalX(timeSecs); rightLegPY = rl.position().evalY(timeSecs); rightLegPZ = rl.position().evalZ(timeSecs);
        leftLegPX  = ll.position().evalX(timeSecs); leftLegPY  = ll.position().evalY(timeSecs); leftLegPZ  = ll.position().evalZ(timeSecs);
        rightLegSX = rl.scale().evalX(timeSecs);    rightLegSY = rl.scale().evalY(timeSecs);    rightLegSZ = rl.scale().evalZ(timeSecs);
        leftLegSX  = ll.scale().evalX(timeSecs);    leftLegSY  = ll.scale().evalY(timeSecs);    leftLegSZ  = ll.scale().evalZ(timeSecs);

        // For each hand: use animation values unless skipped, in which case fall back to pose.
        // If skipped and no pose exists, that hand uses null source → won't be rendered.
        HandAnimationLoader.AnimData rightSource = anim;
        HandAnimationLoader.AnimData leftSource  = anim;
        float rightT = timeSecs, leftT = timeSecs;
        if (skipRight || skipLeft) {
            HandAnimationLoader.AnimData poseAnim = handPoseAnim != null ? handPoseAnim
                : ClientAnimationEngine.INSTANCE.getHandPose(entityId);
            float poseT = 0f;
            if (poseAnim != null && poseAnim.loopMode() == AnimationLoopMode.LOOP && poseAnim.length() > 0f) {
                poseT = ClientAnimationEngine.INSTANCE.getPoseElapsedSecs(entityId, false) % poseAnim.length();
            } else if (poseAnim != null) {
                poseT = poseAnim.length();
            }
            if (skipRight) {
                if (poseAnim != null) { rightSource = poseAnim; rightT = poseT; }
                else rightVanilla = true;
            }
            if (skipLeft) {
                if (poseAnim != null) { leftSource = poseAnim; leftT = poseT; }
                else leftVanilla = true;
            }
            // If both hands should be vanilla, don't take over — let vanilla render.
            if (rightVanilla && leftVanilla) return;
        }

        HandAnimationLoader.BonePose r = rightSource != null ? rightSource.bone("right_arm") : HandAnimationLoader.EMPTY_POSE_PUBLIC;
        HandAnimationLoader.BonePose l = leftSource  != null ? leftSource.bone("left_arm")   : HandAnimationLoader.EMPTY_POSE_PUBLIC;
        rightRX = r.rotation().evalX(rightT); rightRY = r.rotation().evalY(rightT); rightRZ = r.rotation().evalZ(rightT);
        leftRX  = l.rotation().evalX(leftT);  leftRY  = l.rotation().evalY(leftT);  leftRZ  = l.rotation().evalZ(leftT);
        rightPX = r.position().evalX(rightT); rightPY = r.position().evalY(rightT); rightPZ = r.position().evalZ(rightT);
        leftPX  = l.position().evalX(leftT);  leftPY  = l.position().evalY(leftT);  leftPZ  = l.position().evalZ(leftT);
        rightSX = r.scale().evalX(rightT);    rightSY = r.scale().evalY(rightT);    rightSZ = r.scale().evalZ(rightT);
        leftSX  = l.scale().evalX(leftT);     leftSY  = l.scale().evalY(leftT);     leftSZ  = l.scale().evalZ(leftT);

        var window = mc.getWindow();
        float aspect = (float) window.getWidth() / (float) window.getHeight();
        Matrix4f savedProjection = new Matrix4f(RenderSystem.getProjectionMatrix());
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
        // Root bone: translate to pivot, rotate + scale, translate back, then apply position offset.
        if (rootRX != 0f || rootRY != 0f || rootRZ != 0f || rootPX != 0f || rootPY != 0f || rootPZ != 0f
                || rootSX != 1f || rootSY != 1f || rootSZ != 1f) {
            mvStack.translate( ROOT_PIVOT_X,  ROOT_PIVOT_Y,  ROOT_PIVOT_Z);
            if (rootRZ != 0f) mvStack.rotate(com.mojang.math.Axis.ZP.rotationDegrees(rootRZ));
            if (rootRY != 0f) mvStack.rotate(com.mojang.math.Axis.YP.rotationDegrees(-rootRY));
            if (rootRX != 0f) mvStack.rotate(com.mojang.math.Axis.XP.rotationDegrees(-rootRX));
            // Axis remap JSON→game: Z→X, X→Y, Y→Z
            if (rootSX != 1f || rootSY != 1f || rootSZ != 1f) mvStack.scale(rootSX, rootSY, rootSZ);
            mvStack.translate(-ROOT_PIVOT_X, -ROOT_PIVOT_Y, -ROOT_PIVOT_Z);
            mvStack.translate(-rootPX * ROOT_POS_RATIO, rootPY * ROOT_POS_RATIO, rootPZ * ROOT_POS_RATIO);
        }
        RenderSystem.applyModelViewMatrix();

        ResourceLocation baseSkinTex = player.getSkin().texture();
        ResourceLocation composite   = EntityTextureCompositor.INSTANCE.getCompositeLocation(player.getId());
        ResourceLocation skinTex     = composite != null ? composite : baseSkinTex;
        ResourceLocation emissiveTex = EntityTextureCompositor.INSTANCE.getEmissiveLocation(player.getId());

        RenderSystem.disableCull();

        float rRX = HandArmCalibration.BASE_RIGHT_RX + rightRX;
        float rTX = HandArmCalibration.BASE_RIGHT_TX;
        float rTY = HandArmCalibration.BASE_RIGHT_TY;
        float rTZ = HandArmCalibration.BASE_RIGHT_TZ;

        float lRX = HandArmCalibration.BASE_LEFT_RX + leftRX;
        float lTX = HandArmCalibration.BASE_LEFT_TX;
        float lTY = HandArmCalibration.BASE_LEFT_TY;
        float lTZ = HandArmCalibration.BASE_LEFT_TZ;

        // Render arm skin + sleeve + emissive (skip vanilla-owned hands).
        if (!rightVanilla) renderArmSkin(playerModel.rightArm, playerModel.rightSleeve,
                rRX, rightRY, rightRZ, rTX, rTY, rTZ, rightPX, rightPY, rightPZ,
                rightSX, rightSY, rightSZ,
                skinTex, emissiveTex, bufferSource, packedLight);
        if (!leftVanilla) renderArmSkin(playerModel.leftArm, playerModel.leftSleeve,
                lRX, leftRY, leftRZ, lTX, lTY, lTZ, leftPX, leftPY, leftPZ,
                leftSX, leftSY, leftSZ,
                skinTex, emissiveTex, bufferSource, packedLight);

        // Render leg skin + pants overlay + emissive.
        renderArmSkin(playerModel.rightLeg, playerModel.rightPants,
                rightLegRX, rightLegRY, rightLegRZ,
                HandArmCalibration.BASE_RIGHT_LEG_TX, HandArmCalibration.BASE_RIGHT_LEG_TY, HandArmCalibration.BASE_RIGHT_LEG_TZ,
                rightLegPX, rightLegPY, rightLegPZ,
                rightLegSX, rightLegSY, rightLegSZ,
                skinTex, emissiveTex, bufferSource, packedLight);
        renderArmSkin(playerModel.leftLeg, playerModel.leftPants,
                leftLegRX, leftLegRY, leftLegRZ,
                HandArmCalibration.BASE_LEFT_LEG_TX, HandArmCalibration.BASE_LEFT_LEG_TY, HandArmCalibration.BASE_LEFT_LEG_TZ,
                leftLegPX, leftLegPY, leftLegPZ,
                leftLegSX, leftLegSY, leftLegSZ,
                skinTex, emissiveTex, bufferSource, packedLight);

        // Read item-socket bones from the animation (right_item_socket / left_item_socket).
        float rightIPX = 0f, rightIPY = 0f, rightIPZ = 0f;
        float rightIRX = 0f, rightIRY = 0f, rightIRZ = 0f;
        float rightISX = 1f, rightISY = 1f, rightISZ = 1f;
        float leftIPX  = 0f, leftIPY  = 0f, leftIPZ  = 0f;
        float leftIRX  = 0f, leftIRY  = 0f, leftIRZ  = 0f;
        float leftISX  = 1f, leftISY  = 1f, leftISZ  = 1f;
        if (anim != null) {
            HandAnimationLoader.BonePose ri = anim.bone("right_item_socket");
            HandAnimationLoader.BonePose li = anim.bone("left_item_socket");
            rightIPX = ri.position().evalX(timeSecs); rightIPY = ri.position().evalY(timeSecs); rightIPZ = ri.position().evalZ(timeSecs);
            rightIRX = ri.rotation().evalX(timeSecs); rightIRY = ri.rotation().evalY(timeSecs); rightIRZ = ri.rotation().evalZ(timeSecs);
            rightISX = ri.scale().evalX(timeSecs);    rightISY = ri.scale().evalY(timeSecs);    rightISZ = ri.scale().evalZ(timeSecs);
            leftIPX  = li.position().evalX(timeSecs); leftIPY  = li.position().evalY(timeSecs); leftIPZ  = li.position().evalZ(timeSecs);
            leftIRX  = li.rotation().evalX(timeSecs); leftIRY  = li.rotation().evalY(timeSecs); leftIRZ  = li.rotation().evalZ(timeSecs);
            leftISX  = li.scale().evalX(timeSecs);    leftISY  = li.scale().evalY(timeSecs);    leftISZ  = li.scale().evalZ(timeSecs);
        }

        // Render held items using vanilla renderRightHand / renderLeftHand on our calibrated pose.
        if (!rightVanilla) renderHandWithItem(
                rRX, rightRY, rightRZ, rTX, rTY, rTZ, rightPX, rightPY, rightPZ,
                rightSX, rightSY, rightSZ,
                rightIPX, rightIPY, rightIPZ, rightIRX, rightIRY, rightIRZ,
                rightISX, rightISY, rightISZ,
                player, bufferSource, packedLight, true);
        if (!leftVanilla) renderHandWithItem(
                lRX, leftRY, leftRZ, lTX, lTY, lTZ, leftPX, leftPY, leftPZ,
                leftSX, leftSY, leftSZ,
                leftIPX, leftIPY, leftIPZ, leftIRX, leftIRY, leftIRZ,
                leftISX, leftISY, leftISZ,
                player, bufferSource, packedLight, false);

        RenderSystem.enableCull();

        mvStack.popMatrix();
        RenderSystem.applyModelViewMatrix();
        RenderSystem.setProjectionMatrix(savedProjection, VertexSorting.DISTANCE_TO_ORIGIN);

        // If any hand should be vanilla, don't ci.cancel() — let vanilla render after us.
        // Set flags so the per-hand inject (yebisurpg$cancelAnimatedHand) cancels only
        // the hands we already rendered, letting vanilla render the rest.
        if (rightVanilla || leftVanilla) {
            yebisu$skipVanillaRight = !rightVanilla;  // skip vanilla right if WE rendered it
            yebisu$skipVanillaLeft  = !leftVanilla;   // skip vanilla left if WE rendered it
            // Don't ci.cancel() — vanilla renderHandsWithItems will run after us
            return;
        }

        ci.cancel();
    }

    // Per-hand flags: when true, the per-hand inject cancels vanilla for that hand
    private static boolean yebisu$skipVanillaRight = false;
    private static boolean yebisu$skipVanillaLeft  = false;

    @Inject(
        method = "renderArmWithItem",
        at = @At("HEAD"),
        cancellable = true
    )
    private void yebisurpg$cancelAnimatedHand(
            net.minecraft.client.player.AbstractClientPlayer player,
            float partialTicks, float pitch, net.minecraft.world.InteractionHand hand,
            float swingProgress, ItemStack stack, float equippedProgress,
            PoseStack poseStack, MultiBufferSource buffer, int combinedLight,
            CallbackInfo ci) {
        boolean isMain = (hand == net.minecraft.world.InteractionHand.MAIN_HAND);
        if (isMain && yebisu$skipVanillaRight) {
            yebisu$skipVanillaRight = false;
            ci.cancel();
        } else if (!isMain && yebisu$skipVanillaLeft) {
            yebisu$skipVanillaLeft = false;
            ci.cancel();
        }
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
            float sx, float sy, float sz,
            ResourceLocation skinTex, ResourceLocation emissiveTex,
            MultiBufferSource.BufferSource bufferSource, int packedLight) {

        float origX = arm.xRot, origY = arm.yRot, origZ = arm.zRot;
        float origPosX = arm.x, origPosY = arm.y, origPosZ = arm.z;
        float origScaleX = arm.xScale, origScaleY = arm.yScale, origScaleZ = arm.zScale;
        float origSX = sleeve.xRot, origSY = sleeve.yRot, origSZ = sleeve.zRot;
        float origSPosX = sleeve.x, origSPosY = sleeve.y, origSPosZ = sleeve.z;
        float origSScaleX = sleeve.xScale, origSScaleY = sleeve.yScale, origSScaleZ = sleeve.zScale;

        arm.resetPose();
        sleeve.resetPose();
        arm.xRot    = (float) Math.toRadians(rx);
        arm.yRot    = (float) Math.toRadians(ry);
        arm.zRot    = (float) Math.toRadians(rz);
        sleeve.xRot = (float) Math.toRadians(rx);
        sleeve.yRot = (float) Math.toRadians(ry);
        sleeve.zRot = (float) Math.toRadians(rz);

        PoseStack pose = buildArmPose(rx, ry, rz, tx, ty, tz, px, py, pz);

        if (sx != 1f || sy != 1f || sz != 1f) {
            // Apply scale in the arm's local bone space (after pivot+rotation) so scale axes
            // follow the bone and don't shift with rotation.
            arm.translateAndRotate(pose);
            // Axis remap JSON→game: Z→X, X→Y, Y→Z
            pose.scale(sx, sy, sz);
            // Zero arm + sleeve transforms so their internal translateAndRotate is a no-op.
            float savedAX = arm.x, savedAY = arm.y, savedAZ = arm.z;
            float savedSX2 = sleeve.x, savedSY2 = sleeve.y, savedSZ2 = sleeve.z;
            arm.x = 0; arm.y = 0; arm.z = 0;
            arm.xRot = 0; arm.yRot = 0; arm.zRot = 0;
            sleeve.x = 0; sleeve.y = 0; sleeve.z = 0;
            sleeve.xRot = 0; sleeve.yRot = 0; sleeve.zRot = 0;

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

            arm.x = savedAX; arm.y = savedAY; arm.z = savedAZ;
            sleeve.x = savedSX2; sleeve.y = savedSY2; sleeve.z = savedSZ2;
        } else {
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
        }

        arm.xRot = origX; arm.yRot = origY; arm.zRot = origZ;
        arm.x = origPosX; arm.y = origPosY; arm.z = origPosZ;
        arm.xScale = origScaleX; arm.yScale = origScaleY; arm.zScale = origScaleZ;
        sleeve.xRot = origSX; sleeve.yRot = origSY; sleeve.zRot = origSZ;
        sleeve.x = origSPosX; sleeve.y = origSPosY; sleeve.z = origSPosZ;
        sleeve.xScale = origSScaleX; sleeve.yScale = origSScaleY; sleeve.zScale = origSScaleZ;
    }

    /**
     * Renders the held item parented to the custom arm's pivot so the item
     * moves exactly with the arm's animation rotation and position.
     */
    private static final float ITEM_SOCKET_RATIO = 1f / 16f;

    // ── Slim model first-person item offset ──────────────────────────────────
    // Tune these to align the held item for slim (3px arm) skins.
    // Wide model uses: X = 1/16f, Y = 0.125f, Z = -0.625f
    private static final float SLIM_ITEM_OFFSET_X = 0.5f / 16f;   // left/right
    private static final float SLIM_ITEM_OFFSET_Y = 0.125f;     // up/down
    private static final float SLIM_ITEM_OFFSET_Z = -0.625f;    // forward/back

    private static void renderHandWithItem(
            float rx, float ry, float rz,
            float tx, float ty, float tz,
            float px, float py, float pz,
            float sx, float sy, float sz,
            float socketPX, float socketPY, float socketPZ,
            float socketRX, float socketRY, float socketRZ,
            float socketSX, float socketSY, float socketSZ,
            AbstractClientPlayer player,
            MultiBufferSource.BufferSource bufferSource, int packedLight,
            boolean isRightHand) {

        ItemStack heldItem = isRightHand ? player.getMainHandItem() : player.getOffhandItem();
        if (heldItem.isEmpty()) return;

        boolean leftHand = !isRightHand;

        // Build the base arm pose (camera origin, scaled model space).
        PoseStack pose = buildArmPose(rx, ry, rz, tx, ty, tz, px, py, pz);

        // 1. Enter arm's shoulder pivot (replicating ModelPart.translateAndRotate).
        float armPivotX = (isRightHand ? -5f : 5f) / 16f;
        float armPivotY = 2f / 16f;
        float armPivotZ = 0f;
        pose.translate(armPivotX, armPivotY, armPivotZ);

        // 2. Arm rotation at shoulder (ZYX, same order as ModelPart).
        if (rz != 0f) pose.mulPose(com.mojang.math.Axis.ZP.rotationDegrees(rz));
        if (ry != 0f) pose.mulPose(com.mojang.math.Axis.YP.rotationDegrees(ry));
        if (rx != 0f) pose.mulPose(com.mojang.math.Axis.XP.rotationDegrees(rx));

        // Scale in the arm's local bone space (after rotation) so the item position stays
        // consistent regardless of arm rotation angle.
        if (sx != 1f || sy != 1f || sz != 1f) pose.scale(sx, sy, sz);

        // 3. Item orientation fix — same for both hands.
        pose.mulPose(com.mojang.math.Axis.XP.rotationDegrees(-90f));
        pose.mulPose(com.mojang.math.Axis.YP.rotationDegrees(180f));

        // 4. Default hand-tip offset — already in scaled space because scale was applied above.
        boolean slim = player.getSkin().model() == net.minecraft.client.resources.PlayerSkin.Model.SLIM;
        if (slim) {
            pose.translate((leftHand ? -1f : 1f) * SLIM_ITEM_OFFSET_X, SLIM_ITEM_OFFSET_Y, SLIM_ITEM_OFFSET_Z);
        } else {
            pose.translate((leftHand ? -1f : 1f) / 16f, 0.125f, -0.625f);
        }

        // 5. Item socket — animation position + rotation for right_item_socket / left_item_socket.
        float finalSocketPX = socketPX, finalSocketPY = socketPY, finalSocketPZ = socketPZ;
        float finalSocketRX = socketRX, finalSocketRY = socketRY, finalSocketRZ = socketRZ;
        float finalSocketSX = socketSX, finalSocketSY = socketSY, finalSocketSZ = socketSZ;
        if (finalSocketPX != 0f || finalSocketPY != 0f || finalSocketPZ != 0f)
            pose.translate(-finalSocketPX * ITEM_SOCKET_RATIO, -finalSocketPZ * ITEM_SOCKET_RATIO, finalSocketPY * ITEM_SOCKET_RATIO);
        if (finalSocketRX != 0f) pose.mulPose(com.mojang.math.Axis.XP.rotationDegrees(-finalSocketRX));
        if (finalSocketRZ != 0f) pose.mulPose(com.mojang.math.Axis.YP.rotationDegrees(-finalSocketRZ));
        if (finalSocketRY != 0f) pose.mulPose(com.mojang.math.Axis.ZP.rotationDegrees(-finalSocketRY));
        // Item socket scale — multiplicative on top of the arm scale already in the stack.
        if (finalSocketSX != 1f || finalSocketSY != 1f || finalSocketSZ != 1f)
            pose.scale(finalSocketSX, finalSocketSZ, finalSocketSY);

        // For the left hand, mirror X around the item's pivot so asymmetric items
        // (shield, sword, bow, crossbow, trident) face the correct direction.
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
