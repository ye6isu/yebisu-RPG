package net.ye6isu.yebisuRPG.item;

import net.minecraft.world.item.Item;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.item.custom.WalkmanItem;
import net.ye6isu.yebisuRPG.item.custom.Ye6isuItem;
import net.ye6isu.yebisuRPG.yebisuRPG;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/item/ModItems.class */
public class ModItems {
    public static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(yebisuRPG.MODID);
    public static final DeferredItem<Item> YE6ISU = ITEMS.register("ye6isu", () -> {
        return new Ye6isuItem(new Item.Properties());
    });
    public static final DeferredItem<Item> WALKMAN = ITEMS.register("walkman", () -> {
        return new WalkmanItem(new Item.Properties());
    });
    public static final DeferredItem<Item> PLANK = ITEMS.register("plank", () -> {
        return new Item(new Item.Properties());
    });

    public static void register(IEventBus eventBus) {
        ITEMS.register(eventBus);
    }
}
