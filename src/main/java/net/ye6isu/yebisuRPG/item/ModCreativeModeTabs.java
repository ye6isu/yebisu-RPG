package net.ye6isu.yebisuRPG.item;

import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.ItemStack;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.block.ModBlocks;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.function.Supplier;

public class ModCreativeModeTabs {
    public static final DeferredRegister<CreativeModeTab> CREATIVE_MODE_TAB_DEFERRED_REGISTER = DeferredRegister.create(Registries.CREATIVE_MODE_TAB, yebisuRPG.MODID);

    public static final Supplier<CreativeModeTab> YEBISURPG_ITEMS_TAB = CREATIVE_MODE_TAB_DEFERRED_REGISTER.register("yebisurpg_items_tab", () -> CreativeModeTab.builder()
            .icon(() -> new ItemStack(ModItems.YE6ISU.get()))
            .title(Component.translatable("creativetab.yebisurpg.yebisurpg_items"))
            .displayItems((itemDisplayParameters, output) -> {
                output.accept(ModItems.YE6ISU);
                output.accept(ModItems.WALKMAN);
                output.accept(ModItems.PLANK);
                output.accept(ModItems.SUKUNA_FINGER);
                output.accept(ModItems.MOTHER_FLAME);

                output.accept(ModItems.YE6ISU_SWORD);
                output.accept(ModItems.YE6ISU_PICKAXE);
                output.accept(ModItems.YE6ISU_SHOVEL);
                output.accept(ModItems.YE6ISU_AXE);
                output.accept(ModItems.YE6ISU_HOE);

            })
            .build());

    public static final Supplier<CreativeModeTab> YEBISURPG_BLOCK_TAB = CREATIVE_MODE_TAB_DEFERRED_REGISTER.register("yebisurpg_blocks_tab", () -> CreativeModeTab.builder()
            .icon(() -> new ItemStack(ModBlocks.YE6ISU_BLOCK.get()))
            .withTabsBefore(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID,"yebisurpg_items_tab"))
            .title(Component.translatable("creativetab.yebisurpg.yebisurpg_blocks"))
            .displayItems((itemDisplayParameters, output) -> {
                output.accept(ModBlocks.YE6ISU_BLOCK);
                output.accept(ModBlocks.CRATE_BLOCK);

                output.accept(ModBlocks.CRATE_STAIRS);
                output.accept(ModBlocks.CRATE_SLAB);
                output.accept(ModBlocks.CRATE_PRESSURE_PLATE);
                output.accept(ModBlocks.CRATE_BUTTON);
                output.accept(ModBlocks.CRATE_FENCE);
                output.accept(ModBlocks.CRATE_FENCE_GATE);
                output.accept(ModBlocks.CRATE_WALL);
                output.accept(ModBlocks.CRATE_DOOR);
                output.accept(ModBlocks.CRATE_TRAPDOOR);
            })
            .build());

    public static void register(IEventBus eventBus) {
        CREATIVE_MODE_TAB_DEFERRED_REGISTER.register(eventBus);
    }
}
