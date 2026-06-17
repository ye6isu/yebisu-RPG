package net.ye6isu.yebisuRPG.animation.client;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.neoforged.neoforge.network.handling.IPayloadContext;
import net.ye6isu.yebisuRPG.network.animation.AnimPausePayload;
import net.ye6isu.yebisuRPG.network.animation.AnimStopPayload;
import net.ye6isu.yebisuRPG.network.animation.AnimTriggerPayload;
import net.ye6isu.yebisuRPG.network.animation.HandPosePayload;
import net.ye6isu.yebisuRPG.network.animation.ThirdPersonPosePayload;

/**
 * CLIENT-ONLY entry point for incoming animation packets.
 *
 * Routed here from {@link net.ye6isu.yebisuRPG.network.ClientHandlerProxy} via a
 * Runnable lambda so this class is never loaded on a dedicated server — the same
 * isolation pattern used by {@code TextureSyncClientHandler} and {@code VarSyncClientHandler}.
 *
 * Both handlers schedule their work on the main client thread via
 * {@link IPayloadContext#enqueueWork(Runnable)} so they are safe to call from
 * the Netty I/O thread without synchronisation concerns.
 */
@OnlyIn(Dist.CLIENT)
public final class AnimClientHandler {

    private AnimClientHandler() {}

    /**
     * Handles an incoming {@link AnimTriggerPayload}.
     *
     * Delegates to {@link ClientAnimationEngine#trigger(AnimTriggerPayload)}, which
     * creates or replaces the playhead for the given entity/category slot and
     * fast-forwards it if {@code progressTicks > 0} (late-joiner catch-up case).
     */
    public static void onTrigger(AnimTriggerPayload payload, IPayloadContext ctx) {
        ctx.enqueueWork(() -> ClientAnimationEngine.INSTANCE.trigger(payload));
    }

    /**
     * Handles an incoming {@link AnimStopPayload}.
     *
     * Delegates to {@link ClientAnimationEngine#stop(AnimStopPayload)}, which
     * transitions the playhead to {@code BLENDING_OUT} and begins the 2-tick
     * linear blend-out back to the default pose via {@link AnimationBlender}.
     */
    public static void onStop(AnimStopPayload payload, IPayloadContext ctx) {
        ctx.enqueueWork(() -> ClientAnimationEngine.INSTANCE.stop(payload));
    }

    public static void onHandPose(HandPosePayload payload, IPayloadContext ctx) {
        ctx.enqueueWork(() -> ClientAnimationEngine.INSTANCE.setHandPose(payload));
    }

    public static void onAnimPause(AnimPausePayload payload, IPayloadContext ctx) {
        ctx.enqueueWork(() -> ClientAnimationEngine.INSTANCE.pause(payload));
    }

    public static void onThirdPersonPose(ThirdPersonPosePayload payload, IPayloadContext ctx) {
        ctx.enqueueWork(() -> ClientAnimationEngine.INSTANCE.setThirdPersonPose(payload));
    }
}
