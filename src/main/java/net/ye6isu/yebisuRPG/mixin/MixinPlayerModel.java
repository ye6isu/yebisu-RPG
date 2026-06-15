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


    /**
     * Fired at the very start of setupAnim, before HumanoidModel writes anything.
     * When a third-person animation is active we zero the fields that drive vanilla
     * swing, walk, and crouch so none of those motions bleed into our bones.
     *
     * attackTime  — drives the arm-swing arc
     * swimAmount  — tilts the whole body forward when swimming
     * The limbSwing/limbSwingAmount params drive leg/arm walking; we leave those
     * because applyBone overwrites the bones with absolute values anyway.
     */
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
        // Vanilla setupAnim never writes xScale/yScale/zScale, so they persist across frames.
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

        // Only suppress vanilla if the animation file actually loaded.
        HandAnimationLoader.AnimData anim = null;
        if (playhead != null) {
            anim = playhead.filePath() != null
                    ? HandAnimationLoader.INSTANCE.get(playhead.animId(), playhead.filePath())
                    : HandAnimationLoader.INSTANCE.get(playhead.animId());
        }
        if (anim == null && blender == null) return;

        // Zero all vanilla pose modifiers so nothing bleeds through.
        this.attackTime = 0f;  // arm swing arc
        this.swimAmount = 0f;  // forward body tilt while swimming
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

        // Resolve animation data from the JSON loader.
        HandAnimationLoader.AnimData anim = null;
        if (playhead != null) {
            anim = playhead.filePath() != null
                    ? HandAnimationLoader.INSTANCE.get(playhead.animId(), playhead.filePath())
                    : HandAnimationLoader.INSTANCE.get(playhead.animId());
        }

        // If file didn't load and there's no blend-out in progress, nothing to do.
        if (anim == null && blender == null) return;

        // Compute time with HOLD_LAST clamping.
        float timeSecs = 0f;
        if (playhead != null && anim != null) {
            float raw = playhead.getCurrentTimeSecs();
            timeSecs = (playhead.effectiveLoopMode(anim) == AnimationLoopMode.HOLD_LAST)
                    ? Math.min(raw, anim.length())
                    : raw;
        }

        // Blend weight: 1 = fully animation-driven, 0 = vanilla (during blend-out).
        float weight = 1.0f;
        if (blender != null && blender.isActive()) {
            weight = 1.0f - blender.getBlendAlpha(partialTick);
        }
        if (weight <= 0f) return;

        // Reset all bones to their constructor rest pose — resetPose() restores the
        // initial x/y/z/xRot/yRot/zRot/xScale/yScale/zScale that ModelPart stores
        // internally when first built. This undoes ALL vanilla crouch/walk/swim offsets.
        this.head.resetPose();
        this.body.resetPose();
        this.rightArm.resetPose();
        this.leftArm.resetPose();
        this.rightLeg.resetPose();
        this.leftLeg.resetPose();

        // Sample every bone channel from the JSON.
        HandAnimationLoader.BonePose head    = pose(anim, "head");
        HandAnimationLoader.BonePose torso   = pose(anim, "torso");
        HandAnimationLoader.BonePose rArm    = pose(anim, "right_arm");
        HandAnimationLoader.BonePose lArm    = pose(anim, "left_arm");
        HandAnimationLoader.BonePose rLeg    = pose(anim, "right_leg");
        HandAnimationLoader.BonePose lLeg    = pose(anim, "left_leg");

        applyBone(this.head,     head,  timeSecs, weight);
        applyBone(this.body,     torso, timeSecs, weight);
        applyBone(this.rightArm, rArm,  timeSecs, weight);
        applyBone(this.leftArm,  lArm,  timeSecs, weight);
        applyBone(this.rightLeg, rLeg,  timeSecs, weight);
        applyBone(this.leftLeg,  lLeg,  timeSecs, weight);
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
                                   float t, float weight) {
        // Rotation (radians) — lerp from current vanilla value toward anim value.
        float rx = (float) Math.toRadians(pose.rotation().evalX(t));
        float ry = (float) Math.toRadians(-pose.rotation().evalY(t)); // negate Y
        float rz = (float) Math.toRadians(pose.rotation().evalZ(t));
        bone.xRot = lerp(bone.xRot, rx, weight);
        bone.yRot = lerp(bone.yRot, ry, weight);
        bone.zRot = lerp(bone.zRot, rz, weight);

        // Position: scale factor converts Blockbench model units to HumanoidModel space.
        // Increase this to make position keyframes move bones further, decrease to shrink.
        final float POS_SCALE = 16f / 16f;
        bone.x += pose.position().evalX(t) * POS_SCALE * weight;
        bone.y += -pose.position().evalY(t) * POS_SCALE * weight;
        bone.z += pose.position().evalZ(t) * POS_SCALE * weight;

        // Scale — lerp from rest (1) toward anim value, assigned directly.
        // resetPose() already set xScale/yScale/zScale to 1, so *= would compound.
        bone.xScale = lerp(1f, pose.scale().evalX(t), weight);
        bone.yScale = lerp(1f, pose.scale().evalY(t), weight);
        bone.zScale = lerp(1f, pose.scale().evalZ(t), weight);
    }

    private static float lerp(float a, float b, float t) {
        return a + (b - a) * t;
    }
}
