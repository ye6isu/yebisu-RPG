package net.ye6isu.yebisuRPG.item;

import net.neoforged.neoforge.event.BuildCreativeModeTabContentsEvent;

public class ModCreativeTabContents {

    public static void buildTabContents(BuildCreativeModeTabContentsEvent event) {
        if (event.getTabKey() == ModCreativeModeTabs.YEBISURPG.getKey()) event.accept(ModItems.AEEEE.get());
        if (event.getTabKey() == ModCreativeModeTabs.YEBISURPG.getKey()) event.accept(ModItems.AXER.get());
        // YCS_Tab_Contents
    }
}
