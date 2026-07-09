package net.ye6isu.yebisuRPG.animation.client;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

/**
 * Per-render-thread torso rotation, written by MixinPlayerModel and read by
 * the elytra layer mixin so the elytra (which has no body ModelPart to inherit
 * rotation via copyPropertiesTo) stays attached during torso look-at and crouch.
 */
@OnlyIn(Dist.CLIENT)
public final class TorsoRotationHolder {
    private TorsoRotationHolder() {}

    public static final ThreadLocal<Float> X_ROT = ThreadLocal.withInitial(() -> 0f);
    public static final ThreadLocal<Float> Y_ROT = ThreadLocal.withInitial(() -> 0f);
    public static final ThreadLocal<Float> Z_ROT = ThreadLocal.withInitial(() -> 0f);

    public static final ThreadLocal<Boolean> RENDERING_FP_HAND = ThreadLocal.withInitial(() -> false);

    /** True while {@link net.ye6isu.yebisuRPG.client.renderer.ForceRenderCameraEntity} is
     *  drawing the camera-anchored first-person mannequin — read by MixinPlayerModel to hide
     *  the head/torso bones. */
    public static final ThreadLocal<Boolean> RENDERING_MANNEQUIN = ThreadLocal.withInitial(() -> false);

    /** Bitmask (AnimationPlayhead.FP_* bits) of which limbs the mannequin should render this frame. */
    public static final ThreadLocal<Integer> MANNEQUIN_LIMB_MASK = ThreadLocal.withInitial(() -> 0);
}
