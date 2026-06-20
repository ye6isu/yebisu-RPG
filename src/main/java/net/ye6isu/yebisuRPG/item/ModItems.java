package net.ye6isu.yebisuRPG.item;

import net.minecraft.network.chat.Component;
import net.minecraft.world.item.*;
import net.minecraft.world.food.FoodProperties;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.common.DeferredSpawnEggItem;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.entity.ModEntities;
import net.ye6isu.yebisuRPG.item.custom.*;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.List;

public class ModItems {
    public static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(yebisuRPG.MODID);

    //Normal Items
    public static final DeferredItem<Item> PLANK = ITEMS.register("plank",
                () -> new PlankItem(new Item.Properties()));

    public static final DeferredItem<Item> YE6ISU = ITEMS.register("ye6isu",
                () -> new Item(new Item.Properties()));

    public static final DeferredItem<Item> WALKMAN = ITEMS.register("walkman",
                () -> new Item(new Item.Properties()));

    //Tools
    public static final DeferredItem<SwordItem> YE6ISU_SWORD = ITEMS.register("ye6isu_sword",
                () -> new SwordItem(ModToolTiers.YE6ISU, new Item.Properties()
                        .attributes(SwordItem.createAttributes(ModToolTiers.YE6ISU, 5, -2.4f))));

    public static final DeferredItem<PickaxeItem> YE6ISU_PICKAXE = ITEMS.register("ye6isu_pickaxe",
                () -> new PickaxeItem(ModToolTiers.YE6ISU, new Item.Properties()
                        .attributes(PickaxeItem.createAttributes(ModToolTiers.YE6ISU, 1.0F, -2.8f))));

    public static final DeferredItem<ShovelItem> YE6ISU_SHOVEL = ITEMS.register("ye6isu_shovel",
                () -> new ShovelItem(ModToolTiers.YE6ISU, new Item.Properties()
                        .attributes(ShovelItem.createAttributes(ModToolTiers.YE6ISU, 1.5F, -3.0f))));

    public static final DeferredItem<AxeItem> YE6ISU_AXE = ITEMS.register("ye6isu_axe",
                () -> new AxeItem(ModToolTiers.YE6ISU, new Item.Properties()
                        .attributes(AxeItem.createAttributes(ModToolTiers.YE6ISU, 6.0F, -3.2f))));

    public static final DeferredItem<HoeItem> YE6ISU_HOE = ITEMS.register("ye6isu_hoe",
                () -> new HoeItem(ModToolTiers.YE6ISU, new Item.Properties()
                        .attributes(HoeItem.createAttributes(ModToolTiers.YE6ISU, 0F, -3.0f))));

    //Armors
    public static final DeferredItem<ArmorItem> PLANK_HELMET = ITEMS.register("plank_helmet",
            () -> new ArmorItem(ModArmorMaterials.PLANK_ARMOR_MATERIAL, ArmorItem.Type.HELMET,
                    new Item.Properties().durability(ArmorItem.Type.HELMET.getDurability(19))));

    public static final DeferredItem<ArmorItem> PLANK_CHESTPLATE = ITEMS.register("plank_chestplate",
            () -> new ArmorItem(ModArmorMaterials.PLANK_ARMOR_MATERIAL, ArmorItem.Type.CHESTPLATE,
                    new Item.Properties().durability(ArmorItem.Type.CHESTPLATE.getDurability(19))));

    public static final DeferredItem<ArmorItem> PLANK_LEGGINGS = ITEMS.register("plank_leggings",
            () -> new ArmorItem(ModArmorMaterials.PLANK_ARMOR_MATERIAL, ArmorItem.Type.LEGGINGS,
                    new Item.Properties().durability(ArmorItem.Type.LEGGINGS.getDurability(19))));

    public static final DeferredItem<ArmorItem> PLANK_BOOTS = ITEMS.register("plank_boots",
            () -> new ArmorItem(ModArmorMaterials.PLANK_ARMOR_MATERIAL, ArmorItem.Type.BOOTS,
                    new Item.Properties().durability(ArmorItem.Type.BOOTS.getDurability(19))));


    public static final DeferredItem<Item> JOE_SPAWN_EGG = ITEMS.register("joe_spawn_egg",
            () -> new DeferredSpawnEggItem(ModEntities.JOE, 0xffffff, 0xffffff,
                    new Item.Properties()));

    //YCS_Mod_Items_START

    public static final DeferredItem<Item> TEST_ITEM = ITEMS.register("test_item",
                () -> new TestItemItem(new Item.Properties().stacksTo(1)));

    //YCS_Mod_Items_END

    public static void register(IEventBus eventBus) {
        ITEMS.register(eventBus);
    }
}
