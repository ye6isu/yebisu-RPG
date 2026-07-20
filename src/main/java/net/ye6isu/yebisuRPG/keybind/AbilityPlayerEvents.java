package net.ye6isu.yebisuRPG.keybind;

import net.minecraft.server.level.ServerPlayer;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.entity.player.PlayerEvent;
import net.ye6isu.yebisuRPG.yebisuRPG;

/** Keeps player ability cooldowns paused while that player is offline. */
@EventBusSubscriber(modid = yebisuRPG.MODID)
public final class AbilityPlayerEvents {

    private AbilityPlayerEvents() {}

    @SubscribeEvent
    public static void onPlayerLogout(PlayerEvent.PlayerLoggedOutEvent event) {
        if (event.getEntity() instanceof ServerPlayer player) {
            PlayerAbilities.freezeCooldowns(player);
        }
    }

    @SubscribeEvent
    public static void onPlayerLogin(PlayerEvent.PlayerLoggedInEvent event) {
        if (event.getEntity() instanceof ServerPlayer player) {
            PlayerAbilities.resumeCooldowns(player);
        }
    }
}
