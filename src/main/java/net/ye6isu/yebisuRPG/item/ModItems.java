package net.ye6isu.yebisuRPG.item;

import net.minecraft.network.chat.Component;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.item.custom.FuelItem;
import net.ye6isu.yebisuRPG.item.custom.WalkmanItem;
import net.ye6isu.yebisuRPG.item.custom.Ye6isuItem;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.List;

public class ModItems {

    public static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(yebisuRPG.MODID);

    public static final DeferredItem<Item> YE6ISU  = ITEMS.register("ye6isu",  () -> new Ye6isuItem(new Item.Properties()));
    public static final DeferredItem<Item> WALKMAN = ITEMS.register("walkman", () -> new WalkmanItem(new Item.Properties()));
    public static final DeferredItem<Item> PLANK = ITEMS.register("plank",   () -> new Item(new Item.Properties()));

    //Food
    public static final DeferredItem<Item> SUKUNA_FINGER = ITEMS.register("sukuna_finger",   () -> new Item(new Item.Properties().food(ModFoodProperties.SUKUNA_FINGER)) {
        @Override
        public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltipComponents, TooltipFlag tooltipFlag) {
            tooltipComponents.add(Component.translatable("tooltip.yebisurpg.sukuna_finger.tooltip"));
            super.appendHoverText(stack, context, tooltipComponents, tooltipFlag);
        }
    });

    //Fuel
    public static final DeferredItem<Item> MOTHER_FLAME = ITEMS.register("mother_flame", () -> new FuelItem(new Item.Properties(), 40000));

    public static void register(IEventBus eventBus) {
        ITEMS.register(eventBus);
    }

}