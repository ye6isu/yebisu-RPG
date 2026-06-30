package net.ye6isu.yebisuRPG.item;

import net.minecraft.world.food.FoodProperties;
import net.minecraft.world.item.*;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.yebisuRPG;
import net.ye6isu.yebisuRPG.item.custom.TestItem;
import net.minecraft.world.item.DiggerItem;
// YCS_Mod_Item_Imports

public class ModItems {
    public static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(yebisuRPG.MODID);

    public static final DeferredItem<AxeItem> TEST = ITEMS.register("test",
            () -> new TestItem(Tiers.NETHERITE, new Item.Properties().stacksTo(16).attributes(DiggerItem.createAttributes(Tiers.NETHERITE, 180f, 10f))));
    // YCS_Mod_Items

    public static void register(IEventBus eventBus) {
        ITEMS.register(eventBus);
    }
}
