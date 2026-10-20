package net.ye6isu.yebisuRPG.item;

import net.minecraft.world.item.*;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.item.custom.*;
import net.ye6isu.yebisuRPG.yebisuRPG;

public class ModItems {
    public static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(yebisuRPG.MODID);

    public static void register(IEventBus eventBus) {
        ITEMS.register(eventBus);
    }
}
