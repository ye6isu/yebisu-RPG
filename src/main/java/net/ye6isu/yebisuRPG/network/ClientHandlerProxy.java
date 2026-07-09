package net.ye6isu.yebisuRPG.network;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.fml.loading.FMLEnvironment;
import net.neoforged.neoforge.network.handling.IPayloadContext;
import net.ye6isu.yebisuRPG.network.animation.*;
import net.ye6isu.yebisuRPG.texture.network.TextureSyncPayload;

public final class ClientHandlerProxy {

    private ClientHandlerProxy() {}

    public static void onAnimTrigger(AnimTriggerPayload payload, IPayloadContext ctx) {
        if (FMLEnvironment.dist == Dist.CLIENT) {
            // TODO: wire to ClientAnimationEngine.INSTANCE.trigger(payload)
        }
    }

    public static void onAnimStop(AnimStopPayload payload, IPayloadContext ctx) {
        if (FMLEnvironment.dist == Dist.CLIENT) {
            // TODO: wire to ClientAnimationEngine.INSTANCE.stop(payload)
        }
    }

    public static void onAnimPause(AnimPausePayload payload, IPayloadContext ctx) {
        if (FMLEnvironment.dist == Dist.CLIENT) {
            // TODO: wire to ClientAnimationEngine.INSTANCE.pause(payload)
        }
    }

    public static void onHandPose(HandPosePayload payload, IPayloadContext ctx) {
        if (FMLEnvironment.dist == Dist.CLIENT) {
            // TODO: wire to ClientAnimationEngine.INSTANCE.setHandPose(payload)
        }
    }

    public static void onThirdPersonPose(ThirdPersonPosePayload payload, IPayloadContext ctx) {
        if (FMLEnvironment.dist == Dist.CLIENT) {
            // TODO: wire to ClientAnimationEngine.INSTANCE.setThirdPersonPose(payload)
        }
    }

    public static void onItemAnimPose(ItemAnimPosePayload payload, IPayloadContext ctx) {
        if (FMLEnvironment.dist == Dist.CLIENT) {
            // TODO: wire to ClientAnimationEngine.INSTANCE.setItemAnimPose(payload)
        }
    }

    public static void onTextureSync(TextureSyncPayload payload, IPayloadContext ctx) {
        if (FMLEnvironment.dist != Dist.CLIENT) return;
        try {
            Class<?> handler = Class.forName("net.ye6isu.yebisuRPG.texture.network.TextureSyncClientHandler");
            handler.getMethod("handle", TextureSyncPayload.class, IPayloadContext.class).invoke(null, payload, ctx);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Failed to dispatch texture sync payload on client", e);
        }
    }
}
