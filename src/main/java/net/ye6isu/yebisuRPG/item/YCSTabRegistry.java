package net.ye6isu.yebisuRPG.item;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.event.BuildCreativeModeTabContentsEvent;
import net.ye6isu.yebisuRPG.block.ModBlocks;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.lang.reflect.Type;
import java.util.LinkedHashMap;
import java.util.Map;

public final class YCSTabRegistry {

    private static final Map<String, ResourceLocation> STATIC_TAB_LOCATIONS = Map.of(
        "yebisurpg_items_tab",  ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "yebisurpg_items_tab"),
        "yebisurpg_blocks_tab", ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "yebisurpg_blocks_tab"),
        "combat",               ResourceLocation.fromNamespaceAndPath("minecraft", "combat"),
        "tools_and_utilities",  ResourceLocation.fromNamespaceAndPath("minecraft", "tools_and_utilities"),
        "food_and_drinks",      ResourceLocation.fromNamespaceAndPath("minecraft", "food_and_drinks"),
        "ingredients",          ResourceLocation.fromNamespaceAndPath("minecraft", "ingredients"),
        "building_blocks",      ResourceLocation.fromNamespaceAndPath("minecraft", "building_blocks"),
        "redstone_blocks",      ResourceLocation.fromNamespaceAndPath("minecraft", "redstone"),
        "natural_blocks",       ResourceLocation.fromNamespaceAndPath("minecraft", "natural_blocks")
    );

    private static Map<String, ResourceLocation> buildTabLocations() {
        Map<String, ResourceLocation> map = new LinkedHashMap<>(STATIC_TAB_LOCATIONS);
        try (var stream = YCSTabRegistry.class.getResourceAsStream("/assets/yebisurpg/ycs/ycs_custom_tabs.json")) {
            if (stream != null) {
                String json = new String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                Type listType = new TypeToken<java.util.List<java.util.Map<String, String>>>(){}.getType();
                java.util.List<java.util.Map<String, String>> tabs = new Gson().fromJson(json, listType);
                if (tabs != null) {
                    for (var tab : tabs) {
                        String key = tab.get("key");
                        if (key != null && !map.containsKey(key)) {
                            map.put(key, ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, key));
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("[YCSTabRegistry] Error loading custom tabs: " + e.getMessage());
        }
        return map;
    }

    private YCSTabRegistry() {}

    public static void register(IEventBus modBus) {
        modBus.addListener(YCSTabRegistry::onBuildTabContents);
    }

    private static void onBuildTabContents(BuildCreativeModeTabContentsEvent event) {
        Map<String, String> assignments = loadJson();
        Map<String, ResourceLocation> tabLocations = buildTabLocations();
        ResourceLocation currentTab = event.getTabKey().location();

        for (Map.Entry<String, String> entry : assignments.entrySet()) {
            String entryId = entry.getKey();
            String tabKey  = entry.getValue();

            ResourceLocation targetTab = tabLocations.get(tabKey);
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
        try (var stream = YCSTabRegistry.class.getResourceAsStream("/assets/yebisurpg/ycs/ycs_tabs.json")) {
            if (stream == null) {
                System.out.println("[YCSTabRegistry] ycs_tabs.json not found in jar");
                return Map.of();
            }
            String json = new String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            Type type = new TypeToken<LinkedHashMap<String, String>>(){}.getType();
            Map<String, String> result = new Gson().fromJson(json, type);
            System.out.println("[YCSTabRegistry] Loaded " + (result != null ? result.size() : 0) + " entries");
            return result != null ? result : Map.of();
        } catch (Exception e) {
            System.err.println("[YCSTabRegistry] Error: " + e.getMessage());
            return Map.of();
        }
    }
}
