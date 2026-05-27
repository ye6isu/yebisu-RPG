package net.ye6isu.yebisuRPG.item;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.event.BuildCreativeModeTabContentsEvent;
import net.ye6isu.yebisuRPG.block.ModBlocks;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.lang.reflect.Type;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

public final class YCSTabRegistry {

    private static final Map<String, ResourceLocation> TAB_LOCATIONS = Map.of(
        "yebisurpg_items_tab",  ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "yebisurpg_items_tab"),
        "yebisurpg_blocks_tab", ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "yebisurpg_blocks_tab"),
        "combat",               ResourceLocation.fromNamespaceAndPath("minecraft", "combat"),
        "tools_and_utilities",  ResourceLocation.fromNamespaceAndPath("minecraft", "tools_and_utilities"),
        "food_and_drinks",      ResourceLocation.fromNamespaceAndPath("minecraft", "food_and_drinks"),
        "ingredients",          ResourceLocation.fromNamespaceAndPath("minecraft", "ingredients"),
        "building_blocks",      ResourceLocation.fromNamespaceAndPath("minecraft", "building_blocks"),
        "redstone_blocks",      ResourceLocation.fromNamespaceAndPath("minecraft", "redstone_blocks"),
        "natural_blocks",       ResourceLocation.fromNamespaceAndPath("minecraft", "natural_blocks")
    );

    private YCSTabRegistry() {}

    public static void register(IEventBus modBus) {
        modBus.addListener(YCSTabRegistry::onBuildTabContents);
    }

    private static void onBuildTabContents(BuildCreativeModeTabContentsEvent event) {
        Map<String, String> assignments = loadJson();
        ResourceLocation currentTab = event.getTabKey().location();

        System.out.println("[YCSTabRegistry] Building tab: " + currentTab + " | assignments: " + assignments.size());

        for (Map.Entry<String, String> entry : assignments.entrySet()) {
            String entryId = entry.getKey();
            String tabKey  = entry.getValue();

            ResourceLocation targetTab = TAB_LOCATIONS.get(tabKey);
            if (targetTab == null || !targetTab.equals(currentTab)) continue;

            if (entryId.startsWith("block:")) {
                String bid = entryId.substring(6);
                ModBlocks.BLOCKS.getEntries().stream()
                    .filter(h -> h.getId().getPath().equals(bid))
                    .findFirst()
                    .ifPresent(h -> {
                        System.out.println("[YCSTabRegistry] Adding block " + bid + " to " + currentTab);
                        event.accept(h.get().asItem());
                    });
            } else {
                ModItems.ITEMS.getEntries().stream()
                    .filter(h -> h.getId().getPath().equals(entryId))
                    .findFirst()
                    .ifPresent(h -> {
                        System.out.println("[YCSTabRegistry] Adding item " + entryId + " to " + currentTab);
                        event.accept(h.get());
                    });
            }
        }
    }

    private static Map<String, String> loadJson() {
        // Walk up from working dir to find project root (run/ -> project root)
        try {
            Path cwd = Path.of("").toAbsolutePath();
            for (int i = 0; i <= 3; i++) {
                Path candidate = cwd.resolve("src/main/resources/assets/yebisurpg/ycs_tabs.json");
                if (Files.exists(candidate)) {
                    String json = Files.readString(candidate);
                    Type type = new TypeToken<Map<String, String>>(){}.getType();
                    Map<String, String> result = new Gson().fromJson(json, type);
                    System.out.println("[YCSTabRegistry] Loaded " + (result != null ? result.size() : 0) + " entries from " + candidate);
                    return result != null ? result : Map.of();
                }
                if (cwd.getParent() == null) break;
                cwd = cwd.getParent();
            }
            System.out.println("[YCSTabRegistry] ycs_tabs.json not found, cwd=" + Path.of("").toAbsolutePath());
        } catch (Exception e) {
            System.err.println("[YCSTabRegistry] Error: " + e.getMessage());
        }
        return Map.of();
    }
}
