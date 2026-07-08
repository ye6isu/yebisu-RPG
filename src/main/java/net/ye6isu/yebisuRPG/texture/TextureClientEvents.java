package net.ye6isu.yebisuRPG.texture;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.ClientPlayerNetworkEvent;
import net.ye6isu.yebisuRPG.client.renderer.EntityTextureCompositor;
import net.ye6isu.yebisuRPG.yebisuRPG;

@EventBusSubscriber(modid = yebisuRPG.MODID, value = Dist.CLIENT)
public final class TextureClientEvents {

    private TextureClientEvents() {}

    @SubscribeEvent
    public static void onClientDisconnect(ClientPlayerNetworkEvent.LoggingOut event) {
        TextureOverlayManager.INSTANCE.clearAll();
        EntityTextureCompositor.INSTANCE.releaseAll();
    }
}
