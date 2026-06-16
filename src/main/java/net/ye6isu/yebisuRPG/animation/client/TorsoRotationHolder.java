package net.ye6isu.yebisuRPG.animation.client;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

/**
 * Per-render-thread torso rotation, written by MixinPlayerModel and read by
 * MixinElytraLayer so the elytra (which has no body ModelPart to inherit
 * rotation via copyPropertiesTo) stays attached during torso look-at and crouch.
 */
@OnlyIn(Dist.CLIENT)
public final class TorsoRotationHolder {
    private TorsoRotationHolder() {}

    public static final ThreadLocal<Float> X_ROT = ThreadLocal.withInitial(() -> 0f);
    public static final ThreadLocal<Float> Y_ROT = ThreadLocal.withInitial(() -> 0f);
    public static final ThreadLocal<Float> Z_ROT = ThreadLocal.withInitial(() -> 0f);
}
