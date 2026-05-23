package net.ye6isu.yebisulib.texture;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.ClientPlayerNetworkEvent;
import net.neoforged.neoforge.client.event.ClientTickEvent;
import net.ye6isu.yebisuRPG.data.network.VarSyncClientCache;
import net.ye6isu.yebisuRPG.yebisuRPG;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/texture/TextureTickHandler.class */
@EventBusSubscriber(modid = yebisuRPG.MODID, value = {Dist.CLIENT})
public final class TextureTickHandler {
    private TextureTickHandler() {
    }

    @SubscribeEvent
    public static void onClientTick(ClientTickEvent.Post event) {
        TextureManager.INSTANCE.clientTick();
        ItemTextureState.INSTANCE.tickAll();
    }

    @SubscribeEvent
    public static void onClientDisconnect(ClientPlayerNetworkEvent.LoggingOut event) {
        TextureManager.INSTANCE.clearAll();
        VarSyncClientCache.clearAll();
    }
}
