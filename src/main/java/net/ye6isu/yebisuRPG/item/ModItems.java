package net.ye6isu.yebisuRPG.item;

import net.minecraft.world.food.FoodProperties;
import net.minecraft.world.item.*;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.yebisuRPG;
import net.ye6isu.yebisuRPG.item.custom.AeeeeItem;
import net.ye6isu.yebisuRPG.item.custom.AxerItem;
import net.ye6isu.yebisuRPG.component.ModDataComponents;
// YCS_Mod_Item_Imports

public class ModItems {
    public static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(yebisuRPG.MODID);

    public static final DeferredItem<Item> AEEEE = ITEMS.register("aeeee",
            () -> new AeeeeItem(new Item.Properties().stacksTo(1)));
    public static final DeferredItem<Item> AXER = ITEMS.register("axer",
            () -> new AxerItem(new Item.Properties().stacksTo(1).component(ModDataComponents.ITEM_HAS_ABILITIES.get(), true).component(ModDataComponents.ITEM_ABILITY_SLOT_6.get(), "wap")));
    // YCS_Mod_Items

    public static void register(IEventBus eventBus) {
        ITEMS.register(eventBus);
    }
}
