package net.ye6isu.yebisuRPG.mixin;

import net.minecraft.client.Minecraft;
import net.minecraft.client.model.HumanoidModel;
import net.minecraft.client.model.PlayerModel;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.world.entity.LivingEntity;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.animation.AnimationLoopMode;
import net.ye6isu.yebisuRPG.animation.client.AnimationBlender;
import net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead;
import net.ye6isu.yebisuRPG.animation.client.ClientAnimationEngine;
import net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader;
import net.ye6isu.yebisuRPG.animation.client.TorsoRotationHolder;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Drives all PlayerModel bones from the ENTITY_THIRD_PERSON animation category,
 * using HandAnimationLoader JSON keyframes (same pipeline as first-person).
 *
 * Injection point: first copyFrom inside PlayerModel.setupAnim (ordinal 0 =
 * leftPants.copyFrom(leftLeg)), which fires after HumanoidModel.setupAnim has
 * fully written every bone field. We overwrite bones with absolute values so
 * vanilla walk/swing does not bleed through.
 *
 * Supported bone names (JSON key → HumanoidModel field):
 *   root      → PoseStack offset (position + scale only; rotation via head)
 *   head      → head
 *   torso     → body
 *   right_arm → rightArm
 *   left_arm  → leftArm
 *   right_leg → rightLeg
 *   left_leg  → leftLeg
 *
 * All three channels (rotation X/Y/Z, position X/Y/Z, scale X/Y/Z) are
 * applied per bone, matching what HandAnimationLoader already exports.
 */
@OnlyIn(Dist.CLIENT)
@Mixin(value = PlayerModel.class, priority = 900)
public abstract class MixinPlayerModel<T extends LivingEntity> extends HumanoidModel<T> {

    protected MixinPlayerModel(ModelPart root) { super(root); }

    @Inject(
        method = "setupAnim(Lnet/minecraft/world/entity/LivingEntity;FFFFF)V",
        at = @At("HEAD")
    )
    private void yebisurpg$suppressVanillaSwing(
            T entity, float limbSwing, float limbSwingAmount,
            float ageInTicks, float netHeadYaw, float headPitch,
            CallbackInfo ci) {

        if (!(entity instanceof net.minecraft.client.player.AbstractClientPlayer)) return;

        // Reset so a player with no active third-person anim doesn't inherit a stale
        // torso rotation from whichever entity rendered last on this thread.
        TorsoRotationHolder.X_ROT.set(0f);
        TorsoRotationHolder.Y_ROT.set(0f);
        TorsoRotationHolder.Z_ROT.set(0f);

        // Always reset scale to 1 so a finished animation doesn't leave stale scale values.
        this.head.xScale     = 1f; this.head.yScale     = 1f; this.head.zScale     = 1f;
        this.body.xScale     = 1f; this.body.yScale     = 1f; this.body.zScale     = 1f;
        this.rightArm.xScale = 1f; this.rightArm.yScale = 1f; this.rightArm.zScale = 1f;
        this.leftArm.xScale  = 1f; this.leftArm.yScale  = 1f; this.leftArm.zScale  = 1f;
        this.rightLeg.xScale = 1f; this.rightLeg.yScale = 1f; this.rightLeg.zScale = 1f;
        this.leftLeg.xScale  = 1f; this.leftLeg.yScale  = 1f; this.leftLeg.zScale  = 1f;

        ClientAnimationEngine engine = ClientAnimationEngine.INSTANCE;
        AnimationPlayhead playhead = engine.getPlayhead(entity.getId(), AnimationCategory.ENTITY_THIRD_PERSON);
        AnimationBlender  blender  = engine.getBlender(entity.getId(), AnimationCategory.ENTITY_THIRD_PERSON);
        HandAnimationLoader.AnimData poseAnimHead = (playhead == null)
                ? engine.getThirdPersonPose(entity.getId()) : null;
        if (playhead == null && blender == null && poseAnimHead == null) return;

        HandAnimationLoader.AnimData anim = null;
        if (playhead != null) {
            anim = playhead.filePath() != null
                    ? HandAnimationLoader.INSTANCE.get(playhead.animId(), playhead.filePath())
                    : HandAnimationLoader.INSTANCE.get(playhead.animId());
        }
        if (anim == null && poseAnimHead != null) anim = poseAnimHead;
        if (anim == null && blender == null) return;

        net.ye6isu.yebisuRPG.network.animation.ThirdPersonPosePayload tpPoseHead =
                (playhead == null && poseAnimHead != null) ? engine.getThirdPersonPosePayload(entity.getId()) : null;
        int vanMask  = playhead != null ? playhead.vanillaMask()
                     : (tpPoseHead != null) ? tpPoseHead.vanillaMask() : 0;
        int moveMask = playhead != null ? playhead.vanillaMoveMask()
                     : (tpPoseHead != null) ? tpPoseHead.vanillaMoveMask() : 0;
        boolean isMoving = entity.getDeltaMovement().horizontalDistanceSqr() > 0.0001;

        boolean rArmVan = vanActive(vanMask, moveMask, AnimationPlayhead.VAN_RIGHT_ARM,
                AnimationPlayhead.MOVE_RARM_MOVING, AnimationPlayhead.MOVE_RARM_STILL, isMoving);
        boolean lArmVan = vanActive(vanMask, moveMask, AnimationPlayhead.VAN_LEFT_ARM,
                AnimationPlayhead.MOVE_LARM_MOVING, AnimationPlayhead.MOVE_LARM_STILL, isMoving);

        // Suppress arm swing if EITHER arm is animation-driven (attackTime is global).
        if (!rArmVan || !lArmVan) this.attackTime = 0f;
    }

    @Inject(
        method = "setupAnim(Lnet/minecraft/world/entity/LivingEntity;FFFFF)V",
        at = @At(
            value = "INVOKE",
            target = "Lnet/minecraft/client/model/geom/ModelPart;copyFrom(Lnet/minecraft/client/model/geom/ModelPart;)V",
            ordinal = 0
        )
    )
    private void yebisurpg$applyThirdPersonAnim(
            T entity, float limbSwing, float limbSwingAmount,
            float ageInTicks, float netHeadYaw, float headPitch,
            CallbackInfo ci) {

        if (!(entity instanceof net.minecraft.client.player.AbstractClientPlayer)) return;

        int entityId = entity.getId();
        ClientAnimationEngine engine = ClientAnimationEngine.INSTANCE;

        AnimationPlayhead playhead = engine.getPlayhead(entityId, AnimationCategory.ENTITY_THIRD_PERSON);
        AnimationBlender  blender  = engine.getBlender(entityId, AnimationCategory.ENTITY_THIRD_PERSON);

        HandAnimationLoader.AnimData poseAnim = (playhead == null)
                ? engine.getThirdPersonPose(entityId)
                : null;

        if (playhead == null && blender == null && poseAnim == null) return;

        float partialTick = Minecraft.getInstance().getTimer().getGameTimeDeltaPartialTick(true);

        HandAnimationLoader.AnimData anim = null;
        if (playhead != null) {
            anim = playhead.filePath() != null
                    ? HandAnimationLoader.INSTANCE.get(playhead.animId(), playhead.filePath())
                    : HandAnimationLoader.INSTANCE.get(playhead.animId());
        }
        if (anim == null && poseAnim != null) anim = poseAnim;

        if (anim == null && blender == null) return;

        boolean isPoseMode = (playhead == null && poseAnim != null);

        float timeSecs = 0f;
        if (isPoseMode && anim != null) {
            if (anim.loopMode() == AnimationLoopMode.LOOP && anim.length() > 0f) {
                float elapsed = engine.getPoseElapsedSecs(entityId, true);
                timeSecs = elapsed % anim.length();
            } else {
                timeSecs = anim.length();
            }
        } else if (playhead != null && anim != null) {
            float raw = playhead.getCurrentTimeSecs();
            timeSecs = (playhead.effectiveLoopMode(anim) == AnimationLoopMode.HOLD_LAST)
                    ? Math.min(raw, anim.length())
                    : raw;
        }

        float weight = 1.0f;
        if (playhead != null) {
            weight *= playhead.getBlendInWeight(partialTick);
        }
        if (blender != null && blender.isActive()) {
            weight *= 1.0f - blender.getBlendAlpha(partialTick);
        }
        if (weight <= 0f) weight = 0.001f;

        net.ye6isu.yebisuRPG.network.animation.ThirdPersonPosePayload tpPose =
                isPoseMode ? engine.getThirdPersonPosePayload(entityId) : null;
        int lookMask = (playhead != null) ? playhead.lookAtMask()
                     : (tpPose != null) ? tpPose.lookAtMask() : 0;
        int vanMask  = (playhead != null) ? playhead.vanillaMask()
                     : (tpPose != null) ? tpPose.vanillaMask() : 0;
        int moveMask = (playhead != null) ? playhead.vanillaMoveMask()
                     : (tpPose != null) ? tpPose.vanillaMoveMask() : 0;
        // Use actual velocity for immediate response rather than smoothed limbSwingAmount.
        boolean isMoving = entity.getDeltaMovement().horizontalDistanceSqr() > 0.0001;
        boolean crouching = entity instanceof net.minecraft.client.player.AbstractClientPlayer cp && cp.isCrouching();
        boolean crouchPose = crouching && vanActive(vanMask, moveMask, AnimationPlayhead.VAN_CROUCH,
                AnimationPlayhead.MOVE_CROUCH_MOVING, AnimationPlayhead.MOVE_CROUCH_STILL, isMoving);
        boolean sitting = entity.isPassenger();
        boolean sittingPose = sitting && vanActive(vanMask, moveMask, AnimationPlayhead.VAN_SITTING,
                AnimationPlayhead.MOVE_SITTING_MOVING, AnimationPlayhead.MOVE_SITTING_STILL, isMoving);

        boolean headVan  = vanActive(vanMask, moveMask, AnimationPlayhead.VAN_HEAD,
                AnimationPlayhead.MOVE_HEAD_MOVING,  AnimationPlayhead.MOVE_HEAD_STILL,  isMoving);
        boolean torsoVan = vanActive(vanMask, moveMask, AnimationPlayhead.VAN_TORSO,
                AnimationPlayhead.MOVE_TORSO_MOVING, AnimationPlayhead.MOVE_TORSO_STILL, isMoving);
        boolean rArmVan  = vanActive(vanMask, moveMask, AnimationPlayhead.VAN_RIGHT_ARM,
                AnimationPlayhead.MOVE_RARM_MOVING,  AnimationPlayhead.MOVE_RARM_STILL,  isMoving);
        boolean lArmVan  = vanActive(vanMask, moveMask, AnimationPlayhead.VAN_LEFT_ARM,
                AnimationPlayhead.MOVE_LARM_MOVING,  AnimationPlayhead.MOVE_LARM_STILL,  isMoving);
        boolean rLegVan  = vanActive(vanMask, moveMask, AnimationPlayhead.VAN_RIGHT_LEG,
                AnimationPlayhead.MOVE_RLEG_MOVING,  AnimationPlayhead.MOVE_RLEG_STILL,  isMoving);
        boolean lLegVan  = vanActive(vanMask, moveMask, AnimationPlayhead.VAN_LEFT_LEG,
                AnimationPlayhead.MOVE_LLEG_MOVING,  AnimationPlayhead.MOVE_LLEG_STILL,  isMoving);

        float yawRad   = (float) Math.toRadians(netHeadYaw);
        float pitchRad = (float) Math.toRadians(headPitch);

        HandAnimationLoader.BonePose headP  = pose(anim, "head");
        HandAnimationLoader.BonePose torsoP = pose(anim, "torso");
        HandAnimationLoader.BonePose rArmP  = pose(anim, "right_arm");
        HandAnimationLoader.BonePose lArmP  = pose(anim, "left_arm");
        HandAnimationLoader.BonePose rLegP  = pose(anim, "right_leg");
        HandAnimationLoader.BonePose lLegP  = pose(anim, "left_leg");

        // Snapshot vanilla pose deltas for crouch/sitting BEFORE resetPose() wipes them.
        // We re-apply them after our animation via quaternion composition (for xRot lean)
        // or direct addition (for y/z position shifts).
        // Vanilla rest positions: head.y=0, body.y=0, arms.y=2, legs.y=12, legs.z=0.
        float cvHeadY  = 0f, cvHeadXR  = 0f;
        float cvBodyY  = 0f, cvBodyXR  = 0f;
        float cvRArmY  = 0f, cvRArmXR  = 0f;
        float cvLArmY  = 0f, cvLArmXR  = 0f;
        float cvRLegY  = 0f, cvRLegXR  = 0f, cvRLegYR   = 0f, cvRLegZR   = 0f, cvRLegZ = 0f;
        float cvLLegY  = 0f, cvLLegXR  = 0f, cvLLegYR   = 0f, cvLLegZR   = 0f, cvLLegZ = 0f;
        if (crouchPose) {
            if (!headVan)  { cvHeadY = this.head.y;            cvHeadXR = this.head.xRot; }
            if (!torsoVan) { cvBodyY = this.body.y;            cvBodyXR = this.body.xRot; }
            if (!rArmVan)  { cvRArmY = this.rightArm.y - 2f;  cvRArmXR = this.rightArm.xRot; }
            if (!lArmVan)  { cvLArmY = this.leftArm.y  - 2f;  cvLArmXR = this.leftArm.xRot; }
            if (!rLegVan)  { cvRLegY = this.rightLeg.y - 12f; cvRLegZ  = this.rightLeg.z; }
            if (!lLegVan)  { cvLLegY = this.leftLeg.y  - 12f; cvLLegZ  = this.leftLeg.z; }
        }
        if (sittingPose) {
            // Sitting (riding): arms pulled back (xRot delta), legs splayed (xRot/yRot/zRot).
            if (!rArmVan)  { cvRArmXR = this.rightArm.xRot; }
            if (!lArmVan)  { cvLArmXR = this.leftArm.xRot; }
            if (!rLegVan)  { cvRLegXR = this.rightLeg.xRot; cvRLegYR = this.rightLeg.yRot; cvRLegZR = this.rightLeg.zRot; }
            if (!lLegVan)  { cvLLegXR = this.leftLeg.xRot;  cvLLegYR = this.leftLeg.yRot;  cvLLegZR = this.leftLeg.zRot; }
        }

        // Head yaw: when torso also has a yaw look-at, body.yRot already rotates the body
        // in world-space. head.yRot is body-relative, so pass 0 for head yaw in that case —
        // the torso rotation handles the world-space turn. If only head yaw is set, use yawRad.
        boolean torsoHasYaw = (lookMask & AnimationPlayhead.LOOK_TORSO_YAW) != 0 && !torsoVan;
        float headLookYaw   = (lookMask & AnimationPlayhead.LOOK_HEAD_YAW) != 0 ? yawRad : 0f;
        float headLookPitch = (lookMask & AnimationPlayhead.LOOK_HEAD_PITCH) != 0 ? pitchRad : 0f;

        if (!headVan)  { this.head.resetPose();     applyBone(this.head,     headP,  timeSecs, weight, headLookYaw, headLookPitch); }
        if (!torsoVan) { this.body.resetPose();     applyBone(this.body,     torsoP, timeSecs, weight,
            (lookMask & AnimationPlayhead.LOOK_TORSO_YAW)   != 0 ? yawRad : 0f,
            (lookMask & AnimationPlayhead.LOOK_TORSO_PITCH) != 0 ? pitchRad : 0f, 1f); }
        if (!rArmVan)  { this.rightArm.resetPose(); applyBone(this.rightArm, rArmP,  timeSecs, weight,
            (lookMask & AnimationPlayhead.LOOK_RARM_YAW)   != 0 ? yawRad : 0f,
            (lookMask & AnimationPlayhead.LOOK_RARM_PITCH) != 0 ? pitchRad : 0f); }
        if (!lArmVan)  { this.leftArm.resetPose();  applyBone(this.leftArm,  lArmP,  timeSecs, weight,
            (lookMask & AnimationPlayhead.LOOK_LARM_YAW)   != 0 ? yawRad : 0f,
            (lookMask & AnimationPlayhead.LOOK_LARM_PITCH) != 0 ? pitchRad : 0f); }
        if (!rLegVan)  { this.rightLeg.resetPose(); applyBone(this.rightLeg, rLegP,  timeSecs, weight,
            (lookMask & AnimationPlayhead.LOOK_RLEG_YAW)   != 0 ? yawRad : 0f,
            (lookMask & AnimationPlayhead.LOOK_RLEG_PITCH) != 0 ? pitchRad : 0f); }
        if (!lLegVan)  { this.leftLeg.resetPose();  applyBone(this.leftLeg,  lLegP,  timeSecs, weight,
            (lookMask & AnimationPlayhead.LOOK_LLEG_YAW)   != 0 ? yawRad : 0f,
            (lookMask & AnimationPlayhead.LOOK_LLEG_PITCH) != 0 ? pitchRad : 0f); }

        // Re-apply vanilla pose deltas on top of our animation via quaternion composition.
        if (crouchPose) {
            if (!headVan)  { this.head.y = lerp(this.head.y, cvHeadY, weight); }
            if (!torsoVan) {
                this.body.y = lerp(this.body.y, cvBodyY, weight);
                // Compose crouch lean (xRot) with animation rotation via quaternion so
                // the yRot spins around the tilted spine axis rather than world-Y.
                float[] q  = eulerToQuat(this.body.xRot, this.body.yRot, this.body.zRot);
                float[] ql = eulerToQuat(cvBodyXR * weight, 0f, 0f);
                float[] euler = quatToEuler(quatMul(ql, q));
                this.body.xRot = euler[0]; this.body.yRot = euler[1]; this.body.zRot = euler[2];
            }
            if (!rArmVan)  { this.rightArm.y   += cvRArmY * weight;
                             this.rightArm.xRot += cvRArmXR * weight; }
            if (!lArmVan)  { this.leftArm.y    += cvLArmY * weight;
                             this.leftArm.xRot  += cvLArmXR * weight; }
            if (!rLegVan)  { this.rightLeg.y   += cvRLegY * weight; this.rightLeg.z += cvRLegZ * weight; }
            if (!lLegVan)  { this.leftLeg.y    += cvLLegY * weight; this.leftLeg.z  += cvLLegZ * weight; }
        }
        if (sittingPose) {
            if (!rArmVan)  { this.rightArm.xRot += cvRArmXR * weight; }
            if (!lArmVan)  { this.leftArm.xRot  += cvLArmXR * weight; }
            if (!rLegVan)  { composeRotation(this.rightLeg, cvRLegXR * weight, cvRLegYR * weight, cvRLegZR * weight); }
            if (!lLegVan)  { composeRotation(this.leftLeg,  cvLLegXR * weight, cvLLegYR * weight, cvLLegZR * weight); }
        }

        // When vanilla owns legs but pose condition is not met, vanilla already wrote
        // the crouch z/y shifts — undo them so legs sit at normal standing position.
        if (crouching && !crouchPose) {
            if (rLegVan) { this.rightLeg.y = 12f; this.rightLeg.z = 0f; }
            if (lLegVan) { this.leftLeg.y  = 12f; this.leftLeg.z  = 0f; }
        }

        // When the torso has a yaw look-at rotation, rotate only the shoulder rest pivot
        // around the body Y axis to keep arms attached. We separate the anim delta from
        // the rest offset so only the pivot orbits, not the animation-driven position.
        if (torsoHasYaw) {
            float cosT = (float) Math.cos(this.body.yRot);
            float sinT = (float) Math.sin(this.body.yRot);
            // Right arm rest: x=-5, z=0. Left arm rest: x=5, z=0.
            if (!rArmVan) {
                float animDX = this.rightArm.x - (-5f);
                float animDZ = this.rightArm.z;
                this.rightArm.x = -5f * cosT + animDX;
                this.rightArm.z = -(-5f) * sinT + animDZ;
            }
            if (!lArmVan) {
                float animDX = this.leftArm.x - 5f;
                float animDZ = this.leftArm.z;
                this.leftArm.x = 5f * cosT + animDX;
                this.leftArm.z = -(5f) * sinT + animDZ;
            }
        }

        this.hat.copyFrom(this.head);

        // ElytraModel has no body part, so it can't inherit torso rotation via
        // copyPropertiesTo like armor (HumanoidModel-based) does. Stash the torso's
        // final rotation here so MixinElytraLayer can apply the same rotation to the
        // PoseStack directly, keeping the elytra attached during torso look-at and crouch.
        TorsoRotationHolder.X_ROT.set(this.body.xRot);
        TorsoRotationHolder.Y_ROT.set(this.body.yRot);
        TorsoRotationHolder.Z_ROT.set(this.body.zRot);
    }

    /**
     * Returns true if vanilla should own this part given the current move state.
     * vanBit must be set, AND the relevant move bit(s) must permit the current state.
     * If neither move bit is set the vanilla allowance is unconditional (both states).
     */
    private static boolean vanActive(int vanMask, int moveMask, int vanBit,
                                     int movingBit, int stillBit, boolean isMoving) {
        if ((vanMask & vanBit) == 0) return false;
        int cond = moveMask & (movingBit | stillBit);
        if (cond == 0) return true; // no condition set → always active
        return isMoving ? (cond & movingBit) != 0 : (cond & stillBit) != 0;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static HandAnimationLoader.BonePose pose(HandAnimationLoader.AnimData anim, String name) {
        return anim != null ? anim.bone(name) : HandAnimationLoader.EMPTY_POSE_PUBLIC;
    }

    /**
     * Applies rotation, position, and scale from a BonePose to a ModelPart.
     * At weight=1 the bone is fully animation-driven (vanilla values are
     * overwritten). At weight<1 values lerp back toward whatever vanilla wrote.
     *
     * Rotation: degrees from JSON → radians. Positive Y in Bedrock/JSON is
     * game -Y, so we negate Y rotation to match the HumanoidModel convention.
     *
     * Position: JSON units are in 1/16th block (model units). Divide by 16 to
     * convert to block units, negate Y (JSON up = model down).
     *
     * Scale: multiplied onto xScale/yScale/zScale fields (1.0 = no change).
     */
    private static void applyBone(ModelPart bone, HandAnimationLoader.BonePose pose,
                                   float t, float weight, float lookYaw, float lookPitch) {
        applyBone(bone, pose, t, weight, lookYaw, lookPitch, -1f);
    }

    private static void applyBone(ModelPart bone, HandAnimationLoader.BonePose pose,
                                   float t, float weight, float lookYaw, float lookPitch, float ySign) {
        // Build animation rotation as quaternion (XYZ intrinsic).
        float arx = (float) Math.toRadians(pose.rotation().evalX(t));
        float ary = (float) Math.toRadians(ySign * pose.rotation().evalY(t));
        float arz = (float) Math.toRadians(pose.rotation().evalZ(t));
        float[] qAnim = eulerToQuat(arx, ary, arz);

        // Compose look-at on top: first yaw (around Y), then pitch (around X).
        // Done in quaternion space so the axes are properly orthogonal regardless
        // of what the animation rotation is doing.
        if (lookYaw != 0f || lookPitch != 0f) {
            float[] qYaw   = eulerToQuat(0f, lookYaw, 0f);
            float[] qPitch = eulerToQuat(lookPitch, 0f, 0f);
            qAnim = quatMul(qYaw, quatMul(qPitch, qAnim));
        }

        // Slerp from identity (rest) toward the composed rotation by weight.
        // Look-at is baked into qAnim so it scales with weight too — keeps
        // blend-out clean (look fades with the animation, not snapping to world).
        float[] q = quatSlerp(QUAT_IDENTITY, qAnim, weight);
        float[] euler = quatToEuler(q);
        bone.xRot = euler[0];
        bone.yRot = euler[1];
        bone.zRot = euler[2];

        // Position: rotate the anim delta by the look-at orientation so it
        // tracks correctly when the bone is aimed at the camera.
        float dx =  pose.position().evalX(t) * weight;
        float dy = -pose.position().evalY(t) * weight;
        float dz =  pose.position().evalZ(t) * weight;
        if (lookYaw != 0f || lookPitch != 0f) {
            float cosY = (float) Math.cos(lookYaw),  sinY = (float) Math.sin(lookYaw);
            float cosP = (float) Math.cos(lookPitch), sinP = (float) Math.sin(lookPitch);
            bone.x += dx * cosY        + dy * sinY * sinP + dz * sinY * cosP;
            bone.y +=                    dy * cosP         - dz * sinP;
            bone.z += dx * (-sinY)     + dy * cosY * sinP + dz * cosY * cosP;
        } else {
            bone.x += dx;
            bone.y += dy;
            bone.z += dz;
        }

        // Scale — assigned directly since resetPose() already set to 1.
        bone.xScale = lerp(1f, pose.scale().evalX(t), weight);
        bone.yScale = lerp(1f, pose.scale().evalY(t), weight);
        bone.zScale = lerp(1f, pose.scale().evalZ(t), weight);
    }

    // Quaternion-compose an XYZ Euler delta onto a bone's current rotation in-place.
    private static void composeRotation(ModelPart bone, float dx, float dy, float dz) {
        float[] q  = eulerToQuat(bone.xRot, bone.yRot, bone.zRot);
        float[] qd = eulerToQuat(dx, dy, dz);
        float[] r  = quatToEuler(quatMul(qd, q));
        bone.xRot = r[0]; bone.yRot = r[1]; bone.zRot = r[2];
    }

    private static final float[] QUAT_IDENTITY = { 0f, 0f, 0f, 1f };

    // Spherical linear interpolation between two quaternions.
    private static float[] quatSlerp(float[] a, float[] b, float t) {
        float dot = a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3];
        // Ensure shortest path.
        float[] bb = dot < 0f ? new float[]{ -b[0], -b[1], -b[2], -b[3] } : b;
        dot = Math.abs(dot);
        if (dot > 0.9995f) {
            // Quats nearly identical — linear interpolate and normalise.
            float[] r = { a[0]+t*(bb[0]-a[0]), a[1]+t*(bb[1]-a[1]), a[2]+t*(bb[2]-a[2]), a[3]+t*(bb[3]-a[3]) };
            float inv = 1f / (float) Math.sqrt(r[0]*r[0]+r[1]*r[1]+r[2]*r[2]+r[3]*r[3]);
            return new float[]{ r[0]*inv, r[1]*inv, r[2]*inv, r[3]*inv };
        }
        float theta0 = (float) Math.acos(dot);
        float theta  = theta0 * t;
        float sinT0  = (float) Math.sin(theta0);
        float sa = (float) Math.sin(theta0 - theta) / sinT0;
        float sb = (float) Math.sin(theta)           / sinT0;
        return new float[]{
            sa*a[0]+sb*bb[0], sa*a[1]+sb*bb[1], sa*a[2]+sb*bb[2], sa*a[3]+sb*bb[3]
        };
    }

    // Euler XYZ (intrinsic, radians) → quaternion [x, y, z, w]
    private static float[] eulerToQuat(float rx, float ry, float rz) {
        float cx = (float) Math.cos(rx * 0.5f), sx = (float) Math.sin(rx * 0.5f);
        float cy = (float) Math.cos(ry * 0.5f), sy = (float) Math.sin(ry * 0.5f);
        float cz = (float) Math.cos(rz * 0.5f), sz = (float) Math.sin(rz * 0.5f);
        return new float[] {
            sx * cy * cz - cx * sy * sz,
            cx * sy * cz + sx * cy * sz,
            cx * cy * sz - sx * sy * cz,
            cx * cy * cz + sx * sy * sz
        };
    }

    // Quaternion multiply: a * b
    private static float[] quatMul(float[] a, float[] b) {
        return new float[] {
            a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
            a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
            a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
            a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]
        };
    }

    // Quaternion [x, y, z, w] → Euler XYZ (intrinsic, radians)
    private static float[] quatToEuler(float[] q) {
        float x = q[0], y = q[1], z = q[2], w = q[3];
        float rx = (float) Math.atan2(2f * (w*x + y*z), 1f - 2f * (x*x + y*y));
        float sinP = 2f * (w*y - z*x);
        float ry = Math.abs(sinP) >= 1f ? (float) Math.copySign(Math.PI / 2, sinP) : (float) Math.asin(sinP);
        float rz = (float) Math.atan2(2f * (w*z + x*y), 1f - 2f * (y*y + z*z));
        return new float[] { rx, ry, rz };
    }

    private static float lerp(float a, float b, float t) {
        return a + (b - a) * t;
    }
}
