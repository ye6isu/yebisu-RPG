package net.ye6isu.yebisuRPG.item;

import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.furnace.FurnaceFuelBurnTimeEvent;
import net.ye6isu.yebisuRPG.yebisuRPG;

@EventBusSubscriber(modid = yebisuRPG.MODID)
public class ModFuelEvents {

    @SubscribeEvent
    public static void onFuelBurnTime(FurnaceFuelBurnTimeEvent event) {
        // YCS_Mod_Fuel
    }
}
