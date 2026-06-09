package net.ye6isu.yebisuRPG.mixin;

import net.minecraft.client.Minecraft;
import net.minecraft.client.model.HumanoidModel;
import net.minecraft.client.model.PlayerModel;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.world.entity.LivingEntity;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.animation.client.AnimationBlender;
import net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead;
import net.ye6isu.yebisuRPG.animation.client.ClientAnimationEngine;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Drives all PlayerModel bones from the ENTITY animation category.
 *
 * Injection point: first copyFrom inside PlayerModel.setupAnim (ordinal 0 =
 * leftPants.copyFrom(leftLeg)), which fires after HumanoidModel.setupAnim has
 * fully written every bone field. We overwrite the bones with absolute values
 * (not += deltas) so vanilla walk/swing accumulation does not bleed through.
 * The overlay sleeve/pants copies that follow pick up our values automatically.
 *
 * Bone name mapping (JSON key → HumanoidModel field):
 *   torso     → body
 *   right_arm → rightArm
 *   left_arm  → leftArm
 *   right_leg → rightLeg
 *   left_leg  → leftLeg
 */
@OnlyIn(Dist.CLIENT)
@Mixin(value = PlayerModel.class, priority = 900)
public abstract class MixinPlayerModel<T extends LivingEntity> extends HumanoidModel<T> {

    protected MixinPlayerModel(ModelPart root) { super(root); }

    @Inject(
        method = "setupAnim(Lnet/minecraft/world/entity/LivingEntity;FFFFF)V",
        at = @At(
            value = "INVOKE",
            target = "Lnet/minecraft/client/model/geom/ModelPart;copyFrom(Lnet/minecraft/client/model/geom/ModelPart;)V",
            ordinal = 0
        )
    )
    private void yebisurpg$applyEntityAnim(
            T entity, float limbSwing, float limbSwingAmount,
            float ageInTicks, float netHeadYaw, float headPitch,
            CallbackInfo ci) {

        if (!(entity instanceof net.minecraft.client.player.AbstractClientPlayer)) return;

        int entityId = entity.getId();
        ClientAnimationEngine engine = ClientAnimationEngine.INSTANCE;

        AnimationPlayhead playhead = engine.getPlayhead(entityId, AnimationCategory.ENTITY);
        AnimationBlender  blender  = engine.getBlender(entityId, AnimationCategory.ENTITY);

        if (playhead == null && blender == null) return;

        float partialTick = Minecraft.getInstance().getTimer().getGameTimeDeltaPartialTick(true);

        float timeSecs = playhead != null
                ? playhead.getCurrentTimeSecs() + partialTick * (AnimationPlayhead.MS_PER_TICK / 1000f)
                : 0f;

        // weight: 1.0 while playing, lerps to 0 during blend-out so bones
        // smoothly return to wherever vanilla left them.
        float weight = 1.0f;
        if (blender != null && blender.isActive()) {
            weight = 1.0f - blender.getBlendAlpha(partialTick);
        }
        if (weight <= 0.0f) return;

        // Evaluate every keyframe channel from the JSON as absolute radians,
        // then lerp toward the vanilla value using (1 - weight) so that at
        // weight=1 the bone is fully animation-driven, at weight=0 it's vanilla.
        applyBoneX(this.rightArm, RAD_RIGHT_ARM_X, timeSecs, weight);
        applyBoneX(this.leftArm,  RAD_LEFT_ARM_X,  timeSecs, weight);
        applyBoneX(this.body,     RAD_TORSO_X,     timeSecs, weight);
        applyBoneZ(this.rightLeg, RAD_RIGHT_LEG_Z, timeSecs, weight);
        applyBoneX(this.leftLeg,  RAD_LEFT_LEG_X,  timeSecs, weight);
    }

    // -------------------------------------------------------------------------
    // Keyframe tables — direct transcription of animations.json test_anim.
    // Each row: { timeSeconds, xRot or zRot degrees }.
    // Linear interpolation between rows; value clamps to last keyframe after end.
    // -------------------------------------------------------------------------

    // right_arm xRot: 0.0→0°, 1.0→-90°
    private static final float[][] RAD_RIGHT_ARM_X = {
        { 0.0f,      0.0f },
        { 1.0f,    -90.0f }
    };

    // left_arm xRot: 0.0→0°, 0.9167→41.52°, 0.9583→-150°
    private static final float[][] RAD_LEFT_ARM_X = {
        { 0.0f,       0.0f   },
        { 0.9167f,   41.52f  },
        { 0.9583f, -150.0f   }
    };

    // torso xRot: 0.0→0°, 0.9583→-57.5°
    private static final float[][] RAD_TORSO_X = {
        { 0.0f,     0.0f   },
        { 0.9583f, -57.5f  }
    };

    // right_leg zRot: 0.0→0°, 0.75→92.5°
    private static final float[][] RAD_RIGHT_LEG_Z = {
        { 0.0f,   0.0f  },
        { 0.75f, 92.5f  }
    };

    // left_leg xRot: 0.0→0°, 0.875→-72.5°
    private static final float[][] RAD_LEFT_LEG_X = {
        { 0.0f,    0.0f   },
        { 0.875f, -72.5f  }
    };

    private static void applyBoneX(ModelPart bone, float[][] keys, float t, float weight) {
        float animRad = (float) Math.toRadians(evalKeyframes(keys, t));
        bone.xRot = bone.xRot + (animRad - bone.xRot) * weight;
    }

    private static void applyBoneZ(ModelPart bone, float[][] keys, float t, float weight) {
        float animRad = (float) Math.toRadians(evalKeyframes(keys, t));
        bone.zRot = bone.zRot + (animRad - bone.zRot) * weight;
    }

    /** Linear interpolation over a keyframe table. Returns degrees. */
    private static float evalKeyframes(float[][] keys, float t) {
        if (t <= keys[0][0]) return keys[0][1];
        for (int i = 1; i < keys.length; i++) {
            if (t <= keys[i][0]) {
                float span  = keys[i][0] - keys[i - 1][0];
                float alpha = (t - keys[i - 1][0]) / span;
                return keys[i - 1][1] + (keys[i][1] - keys[i - 1][1]) * alpha;
            }
        }
        // Past last keyframe — hold last value.
        return keys[keys.length - 1][1];
    }
}
