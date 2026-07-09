package net.ye6isu.yebisuRPG.network;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.fml.loading.FMLEnvironment;
import net.neoforged.neoforge.network.handling.IPayloadContext;
import net.ye6isu.yebisuRPG.network.animation.*;
import net.ye6isu.yebisuRPG.texture.network.TextureSyncPayload;

public final class ClientHandlerProxy {

    private ClientHandlerProxy() {}

    public static void onAnimTrigger(AnimTriggerPayload payload, IPayloadContext ctx) {
        dispatchAnim("onTrigger", AnimTriggerPayload.class, payload, ctx);
    }

    public static void onAnimStop(AnimStopPayload payload, IPayloadContext ctx) {
        dispatchAnim("onStop", AnimStopPayload.class, payload, ctx);
    }

    public static void onAnimPause(AnimPausePayload payload, IPayloadContext ctx) {
        dispatchAnim("onAnimPause", AnimPausePayload.class, payload, ctx);
    }

    public static void onHandPose(HandPosePayload payload, IPayloadContext ctx) {
        dispatchAnim("onHandPose", HandPosePayload.class, payload, ctx);
    }

    public static void onThirdPersonPose(ThirdPersonPosePayload payload, IPayloadContext ctx) {
        dispatchAnim("onThirdPersonPose", ThirdPersonPosePayload.class, payload, ctx);
    }

    public static void onItemAnimPose(ItemAnimPosePayload payload, IPayloadContext ctx) {
        dispatchAnim("onItemAnimPose", ItemAnimPosePayload.class, payload, ctx);
    }

    private static <T> void dispatchAnim(String method, Class<T> payloadType, T payload, IPayloadContext ctx) {
        if (FMLEnvironment.dist != Dist.CLIENT) return;
        try {
            Class<?> handler = Class.forName("net.ye6isu.yebisuRPG.animation.client.AnimClientHandler");
            handler.getMethod(method, payloadType, IPayloadContext.class).invoke(null, payload, ctx);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Failed to dispatch " + method + " payload on client", e);
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
