package net.ye6isu.yebisuRPG.item;

import net.minecraft.world.item.*;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.yebisuRPG;
import net.ye6isu.yebisuRPG.item.custom.CutitItem;
// YCS_Mod_Item_Imports

public class ModItems {
    public static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(yebisuRPG.MODID);

    public static final DeferredItem<Item> CUTIT = ITEMS.register("cutit",
            () -> new CutitItem(new Item.Properties().stacksTo(1)));
    // YCS_Mod_Items

    public static void register(IEventBus eventBus) {
        ITEMS.register(eventBus);
    }
}
