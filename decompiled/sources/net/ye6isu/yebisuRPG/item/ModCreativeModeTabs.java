package net.ye6isu.yebisuRPG.item;

import java.util.function.Supplier;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.ItemLike;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.block.ModBlocks;
import net.ye6isu.yebisuRPG.yebisuRPG;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/item/ModCreativeModeTabs.class */
public class ModCreativeModeTabs {
    public static final DeferredRegister<CreativeModeTab> CREATIVE_MODE_TAB_DEFERRED_REGISTER = DeferredRegister.create(Registries.CREATIVE_MODE_TAB, yebisuRPG.MODID);
    public static final Supplier<CreativeModeTab> YEBISURPG_ITEMS_TAB = CREATIVE_MODE_TAB_DEFERRED_REGISTER.register("yebisurpg_items_tab", () -> {
        return CreativeModeTab.builder().icon(() -> {
            return new ItemStack((ItemLike) ModItems.YE6ISU.get());
        }).title(Component.translatable("creativetab.yebisurpg.yebisurpg_items")).displayItems((itemDisplayParameters, output) -> {
            output.accept(ModItems.YE6ISU);
            output.accept(ModItems.WALKMAN);
            output.accept(ModItems.PLANK);
        }).build();
    });
    public static final Supplier<CreativeModeTab> YEBISURPG_BLOCK_TAB = CREATIVE_MODE_TAB_DEFERRED_REGISTER.register("yebisurpg_blocks_tab", () -> {
        return CreativeModeTab.builder().icon(() -> {
            return new ItemStack((ItemLike) ModBlocks.YE6ISU_BLOCK.get());
        }).withTabsBefore(new ResourceLocation[]{ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "yebisurpg_items_tab")}).title(Component.translatable("creativetab.yebisurpg.yebisurpg_blocks")).displayItems((itemDisplayParameters, output) -> {
            output.accept(ModBlocks.YE6ISU_BLOCK);
            output.accept(ModBlocks.CRATE_BLOCK);
        }).build();
    });

    public static void register(IEventBus eventBus) {
        CREATIVE_MODE_TAB_DEFERRED_REGISTER.register(eventBus);
    }
}
