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
            .build());

    public static final Supplier<CreativeModeTab> YEBISURPG_BLOCK_TAB = CREATIVE_MODE_TAB_DEFERRED_REGISTER.register("yebisurpg_blocks_tab", () -> CreativeModeTab.builder()
            .icon(() -> new ItemStack(ModBlocks.YE6ISU_BLOCK.get()))
            .withTabsBefore(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID,"yebisurpg_items_tab"))
            .title(Component.translatable("creativetab.yebisurpg.yebisurpg_blocks"))
            .build());

    //YCS_Mod_Creative_Tabs_START

    public static final Supplier<CreativeModeTab> YEBISURPG_TAB = CREATIVE_MODE_TAB_DEFERRED_REGISTER.register("yebisurpg_tab", () -> CreativeModeTab.builder()
            .icon(() -> new ItemStack(ModBlocks.CRATE_BLOCK.get()))
            .title(Component.translatable("creativetab.yebisurpg.yebisurpg_tab"))
            .build());

    //YCS_Mod_Creative_Tabs_END

    public static void register(IEventBus eventBus) {
        CREATIVE_MODE_TAB_DEFERRED_REGISTER.register(eventBus);
    }
}
