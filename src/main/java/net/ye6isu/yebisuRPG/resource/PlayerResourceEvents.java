package net.ye6isu.yebisuRPG.resource;

import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.tick.ServerTickEvent;
import net.ye6isu.yebisuRPG.yebisuRPG;

/** Applies configured player-resource regeneration once every 20 server ticks. */
@EventBusSubscriber(modid = yebisuRPG.MODID)
public final class PlayerResourceEvents {

    private PlayerResourceEvents() {}

    @SubscribeEvent
    public static void onServerTick(ServerTickEvent.Post event) {
        if (event.getServer().overworld().getGameTime() % 20L != 0L) return;
        event.getServer().getPlayerList().getPlayers().forEach(PlayerResourceRegistry::regenerate);
    }
}
