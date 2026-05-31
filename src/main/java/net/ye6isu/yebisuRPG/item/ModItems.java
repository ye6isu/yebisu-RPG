package net.ye6isu.yebisuRPG.item;

import net.minecraft.network.chat.Component;
import net.minecraft.world.item.*;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.item.custom.*;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.List;

public class ModItems {
    public static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(yebisuRPG.MODID);

    //Normal Items
    public static final DeferredItem<Item> PLANK = ITEMS.register("plank",   () -> new Item(new Item.Properties()));

    //Custom Items

    public static final DeferredItem<Item> RAW_YE6ISU = ITEMS.register("raw_ye6isu",   () -> new RawYe6isuItem(new Item.Properties()));

    public static final DeferredItem<Item> YE6ISU  = ITEMS.register("ye6isu",  () -> new Ye6isuItem(new Item.Properties()));

    public static final DeferredItem<Item> WALKMAN = ITEMS.register("walkman", () -> new WalkmanItem(new Item.Properties()));

    //Foods with Tooltip
    public static final DeferredItem<Item> SUKUNA_FINGER = ITEMS.register("sukuna_finger",
            () -> new Item(new Item.Properties().food(ModFoodProperties.SUKUNA_FINGER)) {
                @Override
                public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltipComponents, TooltipFlag tooltipFlag) {
                    tooltipComponents.add(Component.translatable("tooltip.yebisurpg.sukuna_finger.tooltip"));
                    super.appendHoverText(stack, context, tooltipComponents, tooltipFlag);
                }
            });

    //Fuels
    public static final DeferredItem<Item> MOTHER_FLAME = ITEMS.register("mother_flame",
            () -> new FuelItem(new Item.Properties(), 40000));

    //Tools
    public static final DeferredItem<SwordItem> YE6ISU_SWORD = ITEMS.register("ye6isu_sword",
            () -> new SwordItem(ModToolTiers.YE6ISU, new Item.Properties()
                    .attributes(SwordItem.createAttributes(ModToolTiers.YE6ISU, 5, -2.4f))));

    public static final DeferredItem<PickaxeItem> YE6ISU_PICKAXE = ITEMS.register("ye6isu_pickaxe",
            () -> new PickaxeItem(ModToolTiers.YE6ISU, new Item.Properties()
                    .attributes(PickaxeItem.createAttributes(ModToolTiers.YE6ISU, 1.0f, -2.8f))));

    public static final DeferredItem<ShovelItem> YE6ISU_SHOVEL = ITEMS.register("ye6isu_shovel",
            () -> new ShovelItem(ModToolTiers.YE6ISU, new Item.Properties()
                    .attributes(ShovelItem.createAttributes(ModToolTiers.YE6ISU, 1.5f, -3.0f))));

    public static final DeferredItem<AxeItem> YE6ISU_AXE = ITEMS.register("ye6isu_axe",
            () -> new AxeItem(ModToolTiers.YE6ISU, new Item.Properties()
                    .attributes(AxeItem.createAttributes(ModToolTiers.YE6ISU, 6.0f, -3.2f))));

    public static final DeferredItem<HoeItem> YE6ISU_HOE = ITEMS.register("ye6isu_hoe",
            () -> new HoeItem(ModToolTiers.YE6ISU, new Item.Properties()
                    .attributes(HoeItem.createAttributes(ModToolTiers.YE6ISU, 5.5f, -2.8f))));

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

    //Items from creator




    public static void register(IEventBus eventBus) {
        ITEMS.register(eventBus);
    }
}
