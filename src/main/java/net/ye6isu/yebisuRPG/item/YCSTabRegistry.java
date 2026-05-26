package net.ye6isu.yebisuRPG.item;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.CreativeModeTabs;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.BuildCreativeModeTabContentsEvent;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.ye6isu.yebisuRPG.block.ModBlocks;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.io.*;
import java.lang.reflect.Type;
import java.nio.file.*;
import java.util.*;

/**
 * Data-driven creative tab registry managed by the yebisu Content Studio.
 *
 * Tab assignments are stored in src/main/resources/assets/yebisurpg/ycs_tabs.json
 * as a simple map of "item_id" -> "tab_key".
 *
 * Tab key format:
 *   "yebisurpg_items_tab"   → mod items tab
 *   "yebisurpg_blocks_tab"  → mod blocks tab
 *   "combat"                → vanilla combat tab
 *   "tools_and_utilities"   → vanilla tools tab
 *   "food_and_drinks"       → vanilla food tab
 *   "ingredients"           → vanilla ingredients tab
 *   "building_blocks"       → vanilla building blocks tab
 *   "redstone"              → vanilla redstone tab
 *   "natural_blocks"        → vanilla natural blocks tab
 */
@EventBusSubscriber(modid = yebisuRPG.MODID)
public final class YCSTabRegistry {

    private static final String JSON_PATH =
        "src/main/resources/assets/yebisurpg/ycs_tabs.json";

    private static Map<String, String> tabAssignments = new HashMap<>();

    static {
        load();
    }

    private YCSTabRegistry() {}

    public static void load() {
        try {
            Path p = Path.of(JSON_PATH);
            if (!Files.exists(p)) {
                tabAssignments = new HashMap<>();
                return;
            }
            Type type = new TypeToken<Map<String, String>>(){}.getType();
            tabAssignments = new Gson().fromJson(Files.readString(p), type);
            if (tabAssignments == null) tabAssignments = new HashMap<>();
        } catch (Exception e) {
            tabAssignments = new HashMap<>();
            System.err.println("[YCSTabRegistry] Failed to load ycs_tabs.json: " + e.getMessage());
        }
    }

    @SubscribeEvent
    public static void onBuildTabContents(BuildCreativeModeTabContentsEvent event) {
        ResourceLocation tabKey = event.getTabKey().location();

        for (Map.Entry<String, String> entry : tabAssignments.entrySet()) {
            String itemId   = entry.getKey();   // e.g. "tess" or "block:crate_block"
            String tabValue = entry.getValue(); // e.g. "yebisurpg_blocks_tab" or "combat"

            ResourceLocation targetTab = resolveTab(tabValue);
            if (targetTab == null || !targetTab.equals(tabKey)) continue;

            // Resolve the item/block
            if (itemId.startsWith("block:")) {
                String bid = itemId.substring(6);
                var block = ModBlocks.BLOCKS.getEntries().stream()
                    .filter(h -> h.getId().getPath().equals(bid))
                    .findFirst().orElse(null);
                if (block != null) event.accept(block.get().asItem());
            } else {
                var item = ModItems.ITEMS.getEntries().stream()
                    .filter(h -> h.getId().getPath().equals(itemId))
                    .findFirst().orElse(null);
                if (item != null) event.accept(item.get());
            }
        }
    }

    private static ResourceLocation resolveTab(String tabValue) {
        return switch (tabValue) {
            case "yebisurpg_items_tab"  -> ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "yebisurpg_items_tab");
            case "yebisurpg_blocks_tab" -> ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "yebisurpg_blocks_tab");
            case "combat"               -> CreativeModeTabs.COMBAT.location();
            case "tools_and_utilities"  -> CreativeModeTabs.TOOLS_AND_UTILITIES.location();
            case "food_and_drinks"      -> CreativeModeTabs.FOOD_AND_DRINKS.location();
            case "ingredients"          -> CreativeModeTabs.INGREDIENTS.location();
            case "building_blocks"      -> CreativeModeTabs.BUILDING_BLOCKS.location();
            case "redstone"             -> CreativeModeTabs.REDSTONE_BLOCKS.location();
            case "natural_blocks"       -> CreativeModeTabs.NATURAL_BLOCKS.location();
            default                     -> null;
        };
    }
}
