package net.ye6isu.yebisuRPG.animation.client;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.ClientPlayerNetworkEvent;
import net.ye6isu.yebisuRPG.yebisuRPG;

/**
 * Wipes all client-side animation state on disconnect so stale playheads/poses from a
 * previous session never bleed into a new connection — mirrors {@code TextureClientEvents}.
 */
@EventBusSubscriber(modid = yebisuRPG.MODID, value = Dist.CLIENT)
public final class AnimationClientEvents {

    private AnimationClientEvents() {}

    @SubscribeEvent
    public static void onClientDisconnect(ClientPlayerNetworkEvent.LoggingOut event) {
        ClientAnimationEngine.INSTANCE.clearAll();
    }
}
