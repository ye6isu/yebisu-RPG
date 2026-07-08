package net.ye6isu.yebisuRPG.network;

import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.network.event.RegisterPayloadHandlersEvent;
import net.neoforged.neoforge.network.registration.PayloadRegistrar;
import net.ye6isu.yebisuRPG.network.animation.*;
import net.ye6isu.yebisuRPG.texture.network.TextureSyncClientHandler;
import net.ye6isu.yebisuRPG.texture.network.TextureSyncPayload;
import net.ye6isu.yebisuRPG.yebisuRPG;

@EventBusSubscriber(modid = yebisuRPG.MODID)
public final class NetworkRegistry {

    private static final String NETWORK_VERSION = "1";

    private NetworkRegistry() {}

    @SubscribeEvent
    public static void register(final RegisterPayloadHandlersEvent event) {
        final PayloadRegistrar registrar = event.registrar(NETWORK_VERSION);

        registrar.playToClient(
                AnimTriggerPayload.TYPE,
                AnimTriggerPayload.STREAM_CODEC,
                ClientHandlerProxy::onAnimTrigger);

        registrar.playToClient(
                AnimStopPayload.TYPE,
                AnimStopPayload.STREAM_CODEC,
                ClientHandlerProxy::onAnimStop);

        registrar.playToClient(
                AnimPausePayload.TYPE,
                AnimPausePayload.STREAM_CODEC,
                ClientHandlerProxy::onAnimPause);

        registrar.playToClient(
                HandPosePayload.TYPE,
                HandPosePayload.STREAM_CODEC,
                ClientHandlerProxy::onHandPose);

        registrar.playToClient(
                ThirdPersonPosePayload.TYPE,
                ThirdPersonPosePayload.STREAM_CODEC,
                ClientHandlerProxy::onThirdPersonPose);

        registrar.playToClient(
                ItemAnimPosePayload.TYPE,
                ItemAnimPosePayload.STREAM_CODEC,
                ClientHandlerProxy::onItemAnimPose);

        registrar.playToClient(
                TextureSyncPayload.TYPE,
                TextureSyncPayload.STREAM_CODEC,
                TextureSyncClientHandler::handle);
    }
}
