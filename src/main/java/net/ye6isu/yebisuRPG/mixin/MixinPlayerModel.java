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
        if (playhead == null && blender == null) return;

        HandAnimationLoader.AnimData anim = null;
        if (playhead != null) {
            anim = playhead.filePath() != null
                    ? HandAnimationLoader.INSTANCE.get(playhead.animId(), playhead.filePath())
                    : HandAnimationLoader.INSTANCE.get(playhead.animId());
        }
        if (anim == null && blender == null) return;

        int vanMask  = playhead != null ? playhead.vanillaMask()     : 0;
        int moveMask = playhead != null ? playhead.vanillaMoveMask() : 0;
        boolean isMoving = limbSwingAmount > 0.01f;

        boolean rArmVan = vanActive(vanMask, moveMask, AnimationPlayhead.VAN_RIGHT_ARM,
                AnimationPlayhead.MOVE_RARM_MOVING, AnimationPlayhead.MOVE_RARM_STILL, isMoving);
        boolean lArmVan = vanActive(vanMask, moveMask, AnimationPlayhead.VAN_LEFT_ARM,
                AnimationPlayhead.MOVE_LARM_MOVING, AnimationPlayhead.MOVE_LARM_STILL, isMoving);

        // Suppress arm swing if EITHER arm is animation-driven (attackTime is global).
        if (!rArmVan || !lArmVan) this.attackTime = 0f;

        // Crouch: swimAmount drives body-forward tilt in vanilla — always suppress it.
        // The PoseStack -0.125 Y shift is handled separately in MixinPlayerRenderer.
        this.swimAmount = 0f;
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

        if (playhead == null && blender == null) return;

        float partialTick = Minecraft.getInstance().getTimer().getGameTimeDeltaPartialTick(true);

        HandAnimationLoader.AnimData anim = null;
        if (playhead != null) {
            anim = playhead.filePath() != null
                    ? HandAnimationLoader.INSTANCE.get(playhead.animId(), playhead.filePath())
                    : HandAnimationLoader.INSTANCE.get(playhead.animId());
        }

        if (anim == null && blender == null) return;

        float timeSecs = 0f;
        if (playhead != null && anim != null) {
            float raw = playhead.getCurrentTimeSecs();
            timeSecs = (playhead.effectiveLoopMode(anim) == AnimationLoopMode.HOLD_LAST)
                    ? Math.min(raw, anim.length())
                    : raw;
        }

        float weight = 1.0f;
        if (blender != null && blender.isActive()) {
            weight = 1.0f - blender.getBlendAlpha(partialTick);
        }
        if (weight <= 0f) return;

        int lookMask = (playhead != null) ? playhead.lookAtMask()      : 0;
        int vanMask  = (playhead != null) ? playhead.vanillaMask()     : 0;
        int moveMask = (playhead != null) ? playhead.vanillaMoveMask() : 0;
        boolean isMoving  = limbSwingAmount > 0.01f;
        boolean crouching = entity instanceof net.minecraft.client.player.AbstractClientPlayer cp && cp.isCrouching();
        boolean crouchPose = (vanMask & AnimationPlayhead.VAN_CROUCH) != 0 && crouching;

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

        // When VAN_CROUCH is active, vanilla has already written the full crouch pose into
        // the bones (before our inject). Snapshot every channel we care about BEFORE
        // resetPose() wipes them, then re-apply them after our animation.
        // Vanilla crouch sets: body.xRot=0.5, head/body/arms y shifts, legs y+z shifts.
        float cvHeadY  = 0f, cvHeadXR  = 0f;
        float cvBodyY  = 0f, cvBodyXR  = 0f;
        float cvRArmY  = 0f, cvRArmXR  = 0f;
        float cvLArmY  = 0f, cvLArmXR  = 0f;
        float cvRLegY  = 0f, cvRLegZ   = 0f;
        float cvLLegY  = 0f, cvLLegZ   = 0f;
        if (crouchPose) {
            // Snapshot deltas relative to vanilla rest positions so we can ADD them
            // on top of applyBone's result rather than overwriting the anim position.
            // Vanilla rest: head.y=0, body.y=0, arms.y=2, legs.y=12, legs.z=0.
            if (!headVan)  { cvHeadY = this.head.y;            cvHeadXR = this.head.xRot; }
            if (!torsoVan) { cvBodyY = this.body.y;            cvBodyXR = this.body.xRot; }
            if (!rArmVan)  { cvRArmY = this.rightArm.y - 2f;  cvRArmXR = this.rightArm.xRot; }
            if (!lArmVan)  { cvLArmY = this.leftArm.y  - 2f;  cvLArmXR = this.leftArm.xRot; }
            if (!rLegVan)  { cvRLegY = this.rightLeg.y - 12f; cvRLegZ  = this.rightLeg.z; }
            if (!lLegVan)  { cvLLegY = this.leftLeg.y  - 12f; cvLLegZ  = this.leftLeg.z; }
        }

        // Head yaw: when torso also has a yaw look-at, body.yRot already rotates the body
        // in world-space. head.yRot is body-relative, so pass 0 for head yaw in that case —
        // the torso rotation handles the world-space turn. If only head yaw is set, use yawRad.
        boolean torsoHasYaw = (lookMask & AnimationPlayhead.LOOK_TORSO_YAW) != 0 && !torsoVan;
        float headLookYaw   = (lookMask & AnimationPlayhead.LOOK_HEAD_YAW)   != 0
                ? (torsoHasYaw ? 0f : yawRad) : 0f;
        float headLookPitch = (lookMask & AnimationPlayhead.LOOK_HEAD_PITCH) != 0 ? pitchRad : 0f;

        if (!headVan)  { this.head.resetPose();     applyBone(this.head,     headP,  timeSecs, weight, headLookYaw, headLookPitch); }
        if (!torsoVan) { this.body.resetPose();     applyBone(this.body,     torsoP, timeSecs, weight,
            (lookMask & AnimationPlayhead.LOOK_TORSO_YAW)   != 0 ? yawRad : 0f,
            (lookMask & AnimationPlayhead.LOOK_TORSO_PITCH) != 0 ? pitchRad : 0f); }
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

        // Re-apply crouch pose on top of our animation — the full set of y/z/xRot shifts
        // that vanilla wrote before our inject. This gives 1:1 crouched static pose
        // without any walk/swing animation leaking through.
        if (crouchPose) {
            // head/body: snapshot was absolute (rest y=0), add directly.
            // arms/legs: snapshot was delta from rest, add on top of anim position.
            if (!headVan)  { this.head.y    = lerp(this.head.y,    cvHeadY,              weight);
                             this.head.xRot = lerp(this.head.xRot, this.head.xRot + cvHeadXR, weight); }
            if (!torsoVan) { this.body.y    = lerp(this.body.y,    cvBodyY,              weight);
                             this.body.xRot = lerp(this.body.xRot, this.body.xRot + cvBodyXR, weight); }
            if (!rArmVan)  { this.rightArm.y   += cvRArmY * weight;
                             this.rightArm.xRot = lerp(this.rightArm.xRot, this.rightArm.xRot + cvRArmXR, weight); }
            if (!lArmVan)  { this.leftArm.y    += cvLArmY * weight;
                             this.leftArm.xRot  = lerp(this.leftArm.xRot,  this.leftArm.xRot  + cvLArmXR,  weight); }
            if (!rLegVan)  { this.rightLeg.y   += cvRLegY * weight;
                             this.rightLeg.z    += cvRLegZ * weight; }
            if (!lLegVan)  { this.leftLeg.y    += cvLLegY * weight;
                             this.leftLeg.z     += cvLLegZ * weight; }
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
        // Look-at offsets applied at full strength (not scaled by weight) — stays live
        // during blend-out, vanishes cleanly once vanilla takes over after blend completes.
        float rx = (float) Math.toRadians(pose.rotation().evalX(t)) + lookPitch;
        float ry = (float) Math.toRadians(-pose.rotation().evalY(t)) + lookYaw;
        float rz = (float) Math.toRadians(pose.rotation().evalZ(t));
        bone.xRot = lerp(bone.xRot, rx, weight);
        bone.yRot = lerp(bone.yRot, ry, weight);
        bone.zRot = lerp(bone.zRot, rz, weight);

        // Position: re-express the body-local delta in camera space.
        final float POS_SCALE = 16f / 16f;
        float dx =  pose.position().evalX(t) * POS_SCALE * weight;
        float dy = -pose.position().evalY(t) * POS_SCALE * weight;
        float dz =  pose.position().evalZ(t) * POS_SCALE * weight;
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

    private static float lerp(float a, float b, float t) {
        return a + (b - a) * t;
    }
}
