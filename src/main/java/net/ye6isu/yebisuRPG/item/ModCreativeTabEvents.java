package net.ye6isu.yebisuRPG.item;

import net.minecraft.world.item.CreativeModeTabs;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.BuildCreativeModeTabContentsEvent;
import net.ye6isu.yebisuRPG.yebisuRPG;

/**
 * Adds items/blocks to vanilla creative tabs.
 * The Content Studio writes event.accept() lines inside buildTabContents.
 * DO NOT add manual content between the YCS markers — the studio manages that section.
 */
@EventBusSubscriber(modid = yebisuRPG.MODID)
public final class ModCreativeTabEvents {

    private ModCreativeTabEvents() {}

    @SubscribeEvent
    public static void buildTabContents(BuildCreativeModeTabContentsEvent event) {
        // YCS_VANILLA_TAB_START
        // YCS_VANILLA_TAB_END
    
        if (event.getTabKey() == CreativeModeTabs.COMBAT) {
            }
    
        if (event.getTabKey() == CreativeModeTabs.FOOD_AND_DRINKS) {
            event.accept(ModItems.RODAROLA);
        }
    }
}
