package net.ye6isu.yebisulib.network;

import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.network.event.RegisterPayloadHandlersEvent;
import net.neoforged.neoforge.network.registration.PayloadRegistrar;
import net.ye6isu.yebisuRPG.data.network.VarSyncPayload;
import net.ye6isu.yebisuRPG.yebisuRPG;
import net.ye6isu.yebisulib.texture.network.TextureSyncPayload;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/network/NetworkRegistry.class */
@EventBusSubscriber(modid = yebisuRPG.MODID)
public final class NetworkRegistry {
    static final String NETWORK_VERSION = "1";

    private NetworkRegistry() {
    }

    @SubscribeEvent
    public static void register(RegisterPayloadHandlersEvent event) {
        PayloadRegistrar registrar = event.registrar(NETWORK_VERSION);
        registrar.playToClient(TextureSyncPayload.TYPE, TextureSyncPayload.STREAM_CODEC, ClientHandlerProxy::onTextureSync);
        registrar.playToClient(VarSyncPayload.TYPE, VarSyncPayload.STREAM_CODEC, ClientHandlerProxy::onVarSync);
    }

    public static String getNetworkVersion() {
        return NETWORK_VERSION;
    }
}
