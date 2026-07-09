package net.ye6isu.yebisuRPG.animation.client;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.neoforged.neoforge.network.handling.IPayloadContext;
import net.ye6isu.yebisuRPG.network.animation.AnimPausePayload;
import net.ye6isu.yebisuRPG.network.animation.AnimStopPayload;
import net.ye6isu.yebisuRPG.network.animation.AnimTriggerPayload;
import net.ye6isu.yebisuRPG.network.animation.HandPosePayload;
import net.ye6isu.yebisuRPG.network.animation.ItemAnimPosePayload;
import net.ye6isu.yebisuRPG.network.animation.ThirdPersonPosePayload;

/**
 * CLIENT-ONLY entry point for incoming animation packets.
 *
 * Routed here from {@link net.ye6isu.yebisuRPG.network.ClientHandlerProxy} via reflective
 * dispatch so this class is never loaded on a dedicated server — the same isolation pattern
 * used by {@code TextureSyncClientHandler}.
 *
 * All handlers schedule their work on the main client thread via
 * {@link IPayloadContext#enqueueWork(Runnable)} so they are safe to call from
 * the Netty I/O thread without synchronisation concerns.
 */
@OnlyIn(Dist.CLIENT)
public final class AnimClientHandler {

    private AnimClientHandler() {}

    public static void onTrigger(AnimTriggerPayload payload, IPayloadContext ctx) {
        ctx.enqueueWork(() -> ClientAnimationEngine.INSTANCE.trigger(payload));
    }

    public static void onStop(AnimStopPayload payload, IPayloadContext ctx) {
        ctx.enqueueWork(() -> ClientAnimationEngine.INSTANCE.stop(payload));
    }

    public static void onAnimPause(AnimPausePayload payload, IPayloadContext ctx) {
        ctx.enqueueWork(() -> ClientAnimationEngine.INSTANCE.pause(payload));
    }

    public static void onHandPose(HandPosePayload payload, IPayloadContext ctx) {
        ctx.enqueueWork(() -> ClientAnimationEngine.INSTANCE.setHandPose(payload));
    }

    public static void onThirdPersonPose(ThirdPersonPosePayload payload, IPayloadContext ctx) {
        ctx.enqueueWork(() -> ClientAnimationEngine.INSTANCE.setThirdPersonPose(payload));
    }

    public static void onItemAnimPose(ItemAnimPosePayload payload, IPayloadContext ctx) {
        ctx.enqueueWork(() -> ClientAnimationEngine.INSTANCE.setItemAnimPose(payload));
    }
}
