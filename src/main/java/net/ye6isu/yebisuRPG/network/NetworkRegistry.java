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
    }

    public static String getNetworkVersion() { return NETWORK_VERSION; }
}
