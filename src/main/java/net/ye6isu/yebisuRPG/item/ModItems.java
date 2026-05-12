package net.ye6isu.yebisuRPG.item;

import net.minecraft.world.item.Item;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.yebisuRPG;

public class ModItems {

    public static final DeferredRegister.Items ITEMS =  DeferredRegister.createItems(yebisuRPG.MODID);

    public static final DeferredItem<Item> YE6ISU = ITEMS.register("ye6isu", () -> new Item(new Item.Properties()));
    public static final DeferredItem<Item> WALKMAN = ITEMS.register("walkman", () -> new Item(new Item.Properties()));

    public static void register(IEventBus eventBus) {
        ITEMS.register(eventBus);
    }

}