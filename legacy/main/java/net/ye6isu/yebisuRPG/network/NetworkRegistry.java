package net.ye6isu.yebisuRPG.network;

import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.network.event.RegisterPayloadHandlersEvent;
import net.neoforged.neoforge.network.registration.PayloadRegistrar;
import net.ye6isu.yebisuRPG.yebisuRPG;

@EventBusSubscriber(modid = yebisuRPG.MODID)
public final class NetworkRegistry {

    static final String NETWORK_VERSION = "1";

    private NetworkRegistry() {}

    @SubscribeEvent
    public static void register(final RegisterPayloadHandlersEvent event) {
        final PayloadRegistrar registrar = event.registrar(NETWORK_VERSION);

        registrar.playToClient(
            net.ye6isu.yebisuRPG.texture.network.TextureSyncPayload.TYPE,
            net.ye6isu.yebisuRPG.texture.network.TextureSyncPayload.STREAM_CODEC,
            net.ye6isu.yebisuRPG.network.ClientHandlerProxy::onTextureSync
        );

        registrar.playToClient(
            net.ye6isu.yebisuRPG.data.network.VarSyncPayload.TYPE,
            net.ye6isu.yebisuRPG.data.network.VarSyncPayload.STREAM_CODEC,
            net.ye6isu.yebisuRPG.network.ClientHandlerProxy::onVarSync
        );

        registrar.playToClient(
            net.ye6isu.yebisuRPG.network.animation.AnimTriggerPayload.TYPE,
            net.ye6isu.yebisuRPG.network.animation.AnimTriggerPayload.STREAM_CODEC,
            net.ye6isu.yebisuRPG.network.ClientHandlerProxy::onAnimTrigger
        );

        registrar.playToClient(
            net.ye6isu.yebisuRPG.network.animation.AnimStopPayload.TYPE,
            net.ye6isu.yebisuRPG.network.animation.AnimStopPayload.STREAM_CODEC,
            net.ye6isu.yebisuRPG.network.ClientHandlerProxy::onAnimStop
        );

        registrar.playToClient(
            net.ye6isu.yebisuRPG.network.animation.HandPosePayload.TYPE,
            net.ye6isu.yebisuRPG.network.animation.HandPosePayload.STREAM_CODEC,
            net.ye6isu.yebisuRPG.network.ClientHandlerProxy::onHandPose
        );

        registrar.playToClient(
            net.ye6isu.yebisuRPG.network.animation.AnimPausePayload.TYPE,
            net.ye6isu.yebisuRPG.network.animation.AnimPausePayload.STREAM_CODEC,
            net.ye6isu.yebisuRPG.network.ClientHandlerProxy::onAnimPause
        );

        registrar.playToClient(
            net.ye6isu.yebisuRPG.network.animation.ThirdPersonPosePayload.TYPE,
            net.ye6isu.yebisuRPG.network.animation.ThirdPersonPosePayload.STREAM_CODEC,
            net.ye6isu.yebisuRPG.network.ClientHandlerProxy::onThirdPersonPose
        );

        registrar.playToClient(
            net.ye6isu.yebisuRPG.network.animation.ItemAnimPosePayload.TYPE,
            net.ye6isu.yebisuRPG.network.animation.ItemAnimPosePayload.STREAM_CODEC,
            net.ye6isu.yebisuRPG.network.ClientHandlerProxy::onItemAnimPose
        );

    }

    public static String getNetworkVersion() { return NETWORK_VERSION; }
}
