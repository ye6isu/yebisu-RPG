package net.ye6isu.yebisuRPG.network;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.fml.loading.FMLEnvironment;
import net.neoforged.neoforge.network.handling.IPayloadContext;
import net.ye6isu.yebisuRPG.texture.network.TextureSyncPayload;

public final class ClientHandlerProxy {

    private ClientHandlerProxy() {}

    public static void onTextureSync(TextureSyncPayload payload, IPayloadContext ctx) {
        if (FMLEnvironment.dist == Dist.CLIENT) {
            Runnable call = () ->
                net.ye6isu.yebisuRPG.texture.network.TextureSyncClientHandler.handle(payload, ctx);
            call.run();
        }
    }

    public static void onVarSync(net.ye6isu.yebisuRPG.data.network.VarSyncPayload payload,
                                 IPayloadContext ctx) {
        if (FMLEnvironment.dist == Dist.CLIENT) {
            Runnable call = () ->
                net.ye6isu.yebisuRPG.data.network.VarSyncClientHandler.handle(payload, ctx);
            call.run();
        }
    }

    public static void onAnimTrigger(net.ye6isu.yebisuRPG.network.animation.AnimTriggerPayload payload,
                                     IPayloadContext ctx) {
        if (FMLEnvironment.dist == Dist.CLIENT) {
            Runnable call = () ->
                net.ye6isu.yebisuRPG.animation.client.AnimClientHandler.onTrigger(payload, ctx);
            call.run();
        }
    }

    public static void onAnimStop(net.ye6isu.yebisuRPG.network.animation.AnimStopPayload payload,
                                  IPayloadContext ctx) {
        if (FMLEnvironment.dist == Dist.CLIENT) {
            Runnable call = () ->
                net.ye6isu.yebisuRPG.animation.client.AnimClientHandler.onStop(payload, ctx);
            call.run();
        }
    }

    public static void onHandPose(net.ye6isu.yebisuRPG.network.animation.HandPosePayload payload,
                                  IPayloadContext ctx) {
        if (FMLEnvironment.dist == Dist.CLIENT) {
            Runnable call = () ->
                net.ye6isu.yebisuRPG.animation.client.AnimClientHandler.onHandPose(payload, ctx);
            call.run();
        }
    }

    public static void onAnimPause(net.ye6isu.yebisuRPG.network.animation.AnimPausePayload payload,
                                   IPayloadContext ctx) {
        if (FMLEnvironment.dist == Dist.CLIENT) {
            Runnable call = () ->
                net.ye6isu.yebisuRPG.animation.client.AnimClientHandler.onAnimPause(payload, ctx);
            call.run();
        }
    }
}
