package net.ye6isu.yebisuRPG.item;

import net.minecraft.core.registries.Registries;
import net.minecraft.world.item.CreativeModeTab;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.yebisuRPG;
// YCS_Mod_Creative_Tab_Imports

public class ModCreativeModeTabs {
    public static final DeferredRegister<CreativeModeTab> CREATIVE_MODE_TABS =
            DeferredRegister.create(Registries.CREATIVE_MODE_TAB, yebisuRPG.MODID);

    public static final net.neoforged.neoforge.registries.DeferredHolder<net.minecraft.world.item.CreativeModeTab, net.minecraft.world.item.CreativeModeTab> YEBISURPG = CREATIVE_MODE_TABS.register("yebisurpg",
            () -> net.minecraft.world.item.CreativeModeTab.builder()
                    .title(net.minecraft.network.chat.Component.translatable("itemGroup.yebisurpg.yebisurpg"))
                    .icon(() -> new net.minecraft.world.item.ItemStack(net.minecraft.core.registries.BuiltInRegistries.ITEM.get(net.minecraft.resources.ResourceLocation.fromNamespaceAndPath("yebisurpg", "test"))))
                    .build());
    // YCS_Mod_Creative_Tabs

    public static void register(IEventBus eventBus) {
        CREATIVE_MODE_TABS.register(eventBus);
    }
}
