package net.ye6isu.yebisuRPG.item;

import net.minecraft.world.food.FoodProperties;
import net.minecraft.world.item.*;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.yebisuRPG;
import net.minecraft.world.entity.EquipmentSlotGroup;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.item.component.ItemAttributeModifiers;
// YCS_Mod_Item_Imports

public class ModItems {
    public static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(yebisuRPG.MODID);

    public static final DeferredItem<Item> CAT = ITEMS.register("cat",
            () -> new Item(new Item.Properties().stacksTo(32).attributes(ItemAttributeModifiers.builder().add(Attributes.ATTACK_SPEED, new AttributeModifier(Item.BASE_ATTACK_SPEED_ID, 6, AttributeModifier.Operation.ADD_VALUE), EquipmentSlotGroup.MAINHAND).build())));
    // YCS_Mod_Items

    public static void register(IEventBus eventBus) {
        ITEMS.register(eventBus);
    }
}
