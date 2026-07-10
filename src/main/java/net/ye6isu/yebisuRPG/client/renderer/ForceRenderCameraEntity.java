package net.ye6isu.yebisuRPG.client.renderer;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.CameraType;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.player.RemotePlayer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.EntityRenderDispatcher;
import net.minecraft.world.entity.LivingEntity;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead;
import net.ye6isu.yebisuRPG.animation.client.ClientAnimationEngine;
import net.ye6isu.yebisuRPG.animation.client.TorsoRotationHolder;
import net.ye6isu.yebisuRPG.network.animation.ThirdPersonPosePayload;

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
 * <p>Fixed rigidly to the camera's view — no yaw or pitch rotation is applied to the mannequin
 * at all, matching how vanilla's own first-person hand/held item never tilts as you look
 * around. This is drawn directly in the render space {@code renderHandsWithItems} already
 * operates in (see below), whose forward axis is permanently the camera's current look
 * direction by construction — there is no world rotation baked into that space at all, so no
 * yaw/pitch math is needed (or even meaningful) here.</p>
 *
 * <p><b>Render timing/occlusion:</b> the actual draw is invoked from
 * {@code MixinItemInHandRenderer.yebisurpg$renderMannequin}, injected into
 * {@code ItemInHandRenderer.renderHandsWithItems} — the same method vanilla's own
 * first-person hand/held-item render runs through, called from
 * {@code GameRenderer.renderItemInHand} AFTER {@code GameRenderer.render} clears the depth
 * buffer (see {@code RenderSystem.clear(GL_DEPTH_BUFFER_BIT, ...)} right before
 * {@code renderItemInHand} is called). Drawing here — rather than at any
 * {@code RenderLevelStageEvent.Stage} inside {@code renderLevel} — is what makes the
 * mannequin immune to world-geometry occlusion, matching vanilla's own hand: two earlier
 * attempts at a {@code RenderLevelStageEvent} stage failed because every stage inside
 * {@code renderLevel} runs before that depth clear, no matter how late (a plain
 * {@code disableDepthTest()} wrap doesn't help either, since {@code PlayerModel}'s own
 * {@code RenderType}s force depth-testing back on via their {@code DepthTestStateShard} at
 * flush time). Unlike {@code RenderLevelStageEvent}'s PoseStack (true world axes, only
 * camera-relative in position), the {@code poseStack} passed into {@code renderHandsWithItems}
 * is built from the inverse projection matrix only ({@code GameRenderer.renderItemInHand}) and
 * has no world rotation baked in — an earlier version of this class ported the original
 * yaw/pitch-following math over unchanged and only worked correctly while facing world north
 * (where the two conventions happened to coincide); it's since been replaced with the
 * fixed-to-camera behavior described above.</p>
 */
public final class ForceRenderCameraEntity {

    private ForceRenderCameraEntity() {}

    private static RemotePlayer mannequin;
    private static ClientLevel mannequinLevel;

    // Reflective access to Player.DATA_PLAYER_MODE_CUSTOMISATION — protected, no public
    // getter/setter for the raw synced byte exists (only the per-part isModelPartShown query).
    private static final net.minecraft.network.syncher.EntityDataAccessor<Byte> MODE_CUSTOMISATION_ACCESSOR;
    static {
        net.minecraft.network.syncher.EntityDataAccessor<Byte> accessor = null;
        try {
            var field = net.minecraft.world.entity.player.Player.class.getDeclaredField("DATA_PLAYER_MODE_CUSTOMISATION");
            field.setAccessible(true);
            //noinspection unchecked
            accessor = (net.minecraft.network.syncher.EntityDataAccessor<Byte>) field.get(null);
        } catch (ReflectiveOperationException e) {
            org.slf4j.LoggerFactory.getLogger(ForceRenderCameraEntity.class)
                    .error("Failed to reflect DATA_PLAYER_MODE_CUSTOMISATION", e);
        }
        MODE_CUSTOMISATION_ACCESSOR = accessor;
    }

    private static void copyModelPartCustomisation(LivingEntity from, LivingEntity to) {
        if (MODE_CUSTOMISATION_ACCESSOR == null) return;
        to.getEntityData().set(MODE_CUSTOMISATION_ACCESSOR, from.getEntityData().get(MODE_CUSTOMISATION_ACCESSOR));
    }

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

    /**
     * Draws the mannequin, if applicable. Called from
     * {@code MixinItemInHandRenderer.yebisurpg$renderMannequin} — see the class javadoc for why
     * this specific call site (inside {@code renderHandsWithItems}, post depth-clear) was chosen.
     *
     * @param poseStack   the render-space PoseStack {@code renderHandsWithItems} itself received
     *                    (see class javadoc — camera yaw/pitch are NOT read here, since the space
     *                    this PoseStack is in already has no world rotation baked into it)
     * @param bufferSource buffer source to draw into; flushed (via {@code endBatch()}) by this
     *                    method before returning
     * @param packedLight packed light coords for the draw (caller already has these computed for
     *                    its own hand render, so no need to recompute)
     */
    public static void render(PoseStack poseStack, MultiBufferSource.BufferSource bufferSource, int packedLight) {
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
            // An arm currently yielding to a vanilla action (Allow Vanilla Actions checked +
            // eating/swinging/using item) is masked out here so the mannequin doesn't keep
            // showing a frozen limb while vanilla's own first-person hand plays for real.
            limbMask = pose != null ? pose.effectiveFirstPersonLimbMask(mc.player) : 0;
        }
        if (limbMask == 0) return;

        LivingEntity mannequin = getOrCreateMannequin(mc, mc.level);

        // Mirror the real player's held items so the mannequin's arms show the same items it
        // would in third person (RemotePlayer starts with an empty inventory otherwise).
        mannequin.setItemInHand(net.minecraft.world.InteractionHand.MAIN_HAND, mc.player.getMainHandItem());
        mannequin.setItemInHand(net.minecraft.world.InteractionHand.OFF_HAND, mc.player.getOffhandItem());

        // Mirror the real player's skin-layer visibility (jacket/sleeves/pants/hat/cape toggles
        // from the skin customization screen). A freshly constructed RemotePlayer's synced
        // DATA_PLAYER_MODE_CUSTOMISATION byte defaults to 0 (all layers hidden per
        // Player.isModelPartShown), so without this every second-skin-layer part on the
        // mannequin is invisible regardless of ModelPart scale.
        copyModelPartCustomisation(mc.player, mannequin);

        // NOTE on coordinate space: unlike RenderLevelStageEvent's PoseStack (true world axes,
        // just camera-relative in position), the poseStack passed into renderHandsWithItems is
        // built from the INVERSE PROJECTION matrix only (GameRenderer.renderItemInHand) — it has
        // no world rotation baked in at all. "Forward" in this space is always -Z, permanently
        // aligned with wherever the camera is currently looking, regardless of camera yaw OR
        // pitch. So the mannequin needs no rotation handling at all here — it's fixed rigidly to
        // the camera's view (no yaw or pitch tilt applied), the same way vanilla's own
        // first-person hand/held item never tilts as you look around.
        double eyeHeight = mannequin.getEyeHeight();

        // Keep the mannequin's own position/rotation fields at sane neutral values (some render
        // paths read these directly rather than only the args passed to render()); world
        // position doesn't matter here since the draw itself is done entirely in camera-relative
        // hand-space, not from the entity's real world transform.
        //
        // LivingEntityRenderer.setupRotations applies mulPose(YP.rotationDegrees(180 - yBodyRot))
        // — at yBodyRot=0 the model is rotated 180° and faces the opposite of this space's -Z
        // "into the screen" forward axis. Using 180° here cancels that flip so the mannequin
        // faces the same way the camera is looking, matching vanilla's own first-person arms.
        mannequin.setPos(0, 0, 0);
        mannequin.setYRot(180f);
        mannequin.yRotO = 180f;
        mannequin.yBodyRot = 180f;
        mannequin.yBodyRotO = 180f;
        mannequin.yHeadRot = 180f;
        mannequin.yHeadRotO = 180f;
        mannequin.setXRot(0f);
        mannequin.xRotO = 0f;

        EntityRenderDispatcher dispatcher = mc.getEntityRenderDispatcher();

        // Fixed rigidly to the camera view — no yaw or pitch rotation applied at all, so the
        // mannequin never tilts as you look around, matching vanilla's own first-person arms.
        poseStack.pushPose();
        TorsoRotationHolder.RENDERING_MANNEQUIN.set(true);
        TorsoRotationHolder.MANNEQUIN_LIMB_MASK.set(limbMask);
        try {
            dispatcher.render(mannequin, 0, -eyeHeight, 0, 0f, 1f, poseStack, bufferSource, packedLight);
        } finally {
            TorsoRotationHolder.RENDERING_MANNEQUIN.set(false);
            TorsoRotationHolder.MANNEQUIN_LIMB_MASK.set(0);
        }
        poseStack.popPose();
        bufferSource.endBatch();
    }
}
