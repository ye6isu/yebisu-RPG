package net.ye6isu.yebisuRPG.client.renderer;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.CameraType;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.player.RemotePlayer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.EntityRenderDispatcher;
import net.minecraft.world.entity.LivingEntity;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.RenderLevelStageEvent;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead;
import net.ye6isu.yebisuRPG.animation.client.ClientAnimationEngine;
import net.ye6isu.yebisuRPG.animation.client.TorsoRotationHolder;
import net.ye6isu.yebisuRPG.network.animation.ThirdPersonPosePayload;
import net.ye6isu.yebisuRPG.yebisuRPG;

/**
 * Renders a partial extra player body ("mannequin") fixed in front of the camera when the local
 * player's {@code ENTITY_THIRD_PERSON} animation/pose has any first-person limb enabled
 * ({@link AnimationPlayhead#firstPersonLimbMask()} / {@link ThirdPersonPosePayload#firstPersonLimbMask()}).
 * Only the selected limbs (right/left arm, right/left leg) render — head and torso are always
 * hidden (see {@link TorsoRotationHolder#RENDERING_MANNEQUIN}).
 *
 * <p>Uses a dedicated, fake, purely client-side {@link RemotePlayer} instance (never added to any
 * level's entity tracker, never ticked, never network-synced) as the render target instead of the
 * real local player entity — this guarantees the mannequin is always in a neutral standing pose
 * (never crouching/sitting/swimming/gliding), since those are all just synced-data fields that
 * default to their neutral values on a freshly constructed entity that nothing ever tells
 * otherwise. Rendered via {@link EntityRenderDispatcher#render}, the same mechanism vanilla itself
 * uses to draw any entity — confirmed safe to call on an untracked entity (it reads plain fields
 * off the object, no level/tracker lookups). Never being added to the level's entity tracker also
 * means vanilla's shadow pass (which iterates only tracked entities) never draws one for it. The
 * mannequin reuses the real local player's {@code GameProfile} so it resolves the same skin.</p>
 *
 * <p>Position/yaw/pitch are recomputed every frame from the camera's CURRENT position and look
 * direction (a fixed offset directly in front, via camera yaw/pitch) rather than any entity's real
 * world position, so the mannequin stays pinned in the same spot in your view no matter which way
 * you look. The pivot for pitch is the mannequin's EYES (the anchor point), not its feet, so
 * looking up/down rotates the whole rendered body around eye level.</p>
 */
@EventBusSubscriber(modid = yebisuRPG.MODID, value = Dist.CLIENT)
public final class ForceRenderCameraEntity {

    private ForceRenderCameraEntity() {}

    /** Distance in front of the camera, in blocks, that the mannequin is anchored at.
     *  Kept near zero so the mannequin's eyes sit at (not in front of) the camera, aligning
     *  its limbs with where the real first-person body would be. */
    private static final double ANCHOR_DISTANCE = 0.0;

    private static RemotePlayer mannequin;
    private static ClientLevel mannequinLevel;

    private static RemotePlayer getOrCreateMannequin(Minecraft mc, ClientLevel level) {
        if (mannequin == null || mannequinLevel != level) {
            mannequin = new RemotePlayer(level, mc.player.getGameProfile());
            mannequinLevel = level;
        }
        // MixinPlayerModel looks up the playing animation by entity.getId() — the mannequin must
        // report the SAME id as the real local player for that lookup to find the animation the
        // player actually triggered on themselves.
        mannequin.setId(mc.player.getId());
        return mannequin;
    }

    @SubscribeEvent
    public static void onRenderLevelStage(RenderLevelStageEvent event) {
        if (event.getStage() != RenderLevelStageEvent.Stage.AFTER_ENTITIES) return;

        Minecraft mc = Minecraft.getInstance();
        if (mc.options.getCameraType() != CameraType.FIRST_PERSON) return;
        if (mc.player == null || mc.level == null) return;

        int entityId = mc.player.getId();
        ClientAnimationEngine engine = ClientAnimationEngine.INSTANCE;
        AnimationPlayhead playhead = engine.getPlayhead(entityId, AnimationCategory.ENTITY_THIRD_PERSON);

        int limbMask;
        if (playhead != null) {
            limbMask = playhead.firstPersonLimbMask();
        } else {
            ThirdPersonPosePayload pose = engine.getThirdPersonPosePayload(entityId);
            limbMask = pose != null ? pose.firstPersonLimbMask() : 0;
        }
        if (limbMask == 0) return;

        LivingEntity mannequin = getOrCreateMannequin(mc, mc.level);

        // Mirror the real player's held items so the mannequin's arms show the same items it
        // would in third person (RemotePlayer starts with an empty inventory otherwise).
        mannequin.setItemInHand(net.minecraft.world.InteractionHand.MAIN_HAND, mc.player.getMainHandItem());
        mannequin.setItemInHand(net.minecraft.world.InteractionHand.OFF_HAND, mc.player.getOffhandItem());

        var camera = event.getCamera();
        var camPos = camera.getPosition();
        float camYaw = camera.getYRot();
        float camPitch = camera.getXRot();

        // Fixed offset directly in front of the camera's CURRENT look direction — recomputed
        // every frame from the camera's live yaw/pitch, not from any entity's real position.
        double yawRad = Math.toRadians(camYaw);
        double pitchRad = Math.toRadians(camPitch);
        double dirX = -Math.sin(yawRad) * Math.cos(pitchRad);
        double dirY = -Math.sin(pitchRad);
        double dirZ =  Math.cos(yawRad) * Math.cos(pitchRad);

        // Anchor point is where the mannequin's HEAD should sit, ANCHOR_DISTANCE in front of the
        // camera. render()/setPos() place the entity at its FEET, so shift down by eye height to
        // land the head (not the feet) at the anchor point.
        double headWorldX = camPos.x + dirX * ANCHOR_DISTANCE;
        double headWorldY = camPos.y + dirY * ANCHOR_DISTANCE;
        double headWorldZ = camPos.z + dirZ * ANCHOR_DISTANCE;

        double eyeHeight = mannequin.getEyeHeight();
        double worldX = headWorldX;
        double worldY = headWorldY - eyeHeight;
        double worldZ = headWorldZ;

        // Keep the mannequin's own position/rotation fields in sync (some render paths read
        // these directly rather than only the args passed to render()). Facing the SAME direction
        // as the camera (not back toward it) is what makes this read as "fixed in your view."
        mannequin.setPos(worldX, worldY, worldZ);
        float yaw = camYaw;
        mannequin.setYRot(yaw);
        mannequin.yRotO = yaw;
        mannequin.yBodyRot = yaw;
        mannequin.yBodyRotO = yaw;
        mannequin.yHeadRot = yaw;
        mannequin.yHeadRotO = yaw;
        mannequin.setXRot(0f);
        mannequin.xRotO = 0f;

        // Render position is camera-relative (world anchor point minus camera position).
        double x = worldX - camPos.x;
        double y = worldY - camPos.y;
        double z = worldZ - camPos.z;

        EntityRenderDispatcher dispatcher = mc.getEntityRenderDispatcher();
        int packedLight = dispatcher.getPackedLightCoords(mannequin, 1f);

        PoseStack poseStack = event.getPoseStack();
        MultiBufferSource.BufferSource bufferSource = mc.renderBuffers().bufferSource();

        // Pitch the WHOLE model (not just the head) to follow the camera's up/down look,
        // pivoting around the head/eye point rather than the feet — done here at the
        // PoseStack level (not via entity.setXRot, which only drives vanilla's per-bone head
        // tilt) so the entire body rotates as one rigid unit around the anchor.
        poseStack.pushPose();
        poseStack.translate(x, y + eyeHeight, z);
        // Rotate into the mannequin's own facing direction first so the pitch axis is
        // relative to ITS yaw (not world space) — otherwise pitch only reads correctly
        // when facing south, since Axis.XP is a fixed world axis. Entity render applies
        // -yaw internally, so undo our yaw rotation afterward to avoid double-rotating.
        poseStack.mulPose(com.mojang.math.Axis.YP.rotationDegrees(-yaw));
        poseStack.mulPose(com.mojang.math.Axis.XP.rotationDegrees(camPitch));
        poseStack.mulPose(com.mojang.math.Axis.YP.rotationDegrees(yaw));
        poseStack.translate(-x, -y - eyeHeight, -z);
        TorsoRotationHolder.RENDERING_MANNEQUIN.set(true);
        TorsoRotationHolder.MANNEQUIN_LIMB_MASK.set(limbMask);
        try {
            dispatcher.render(mannequin, x, y, z, yaw, 1f, poseStack, bufferSource, packedLight);
        } finally {
            TorsoRotationHolder.RENDERING_MANNEQUIN.set(false);
            TorsoRotationHolder.MANNEQUIN_LIMB_MASK.set(0);
        }
        poseStack.popPose();
        bufferSource.endBatch();
    }
}
