package net.ye6isu.yebisulib.texture;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.ClientPlayerNetworkEvent;
import net.neoforged.neoforge.client.event.ClientTickEvent;

/**
 * Client-side tick and lifecycle hooks for the texture and variable systems.
 *
 * <ul>
 *   <li>Advances all texture animations every tick.</li>
 *   <li>Clears all client-side caches on disconnect so stale entries from the
 *       previous session never bleed into the next one.</li>
 * </ul>
 */
@EventBusSubscriber(modid = "yebisurpg", value = Dist.CLIENT)
public final class TextureTickHandler {

    private TextureTickHandler() {}

    @SubscribeEvent
    public static void onClientTick(ClientTickEvent.Post event) {
        TextureManager.INSTANCE.clientTick();
        ItemTextureState.INSTANCE.tickAll();
    }

    @SubscribeEvent
    public static void onClientDisconnect(ClientPlayerNetworkEvent.LoggingOut event) {
        // Clear texture overlays
        TextureManager.INSTANCE.clearAll();
        // Clear variable mirror — will be refilled by join-sync on next login
        net.ye6isu.yebisuRPG.data.network.VarSyncClientCache.clearAll();
    }
}
