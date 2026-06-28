package net.ye6isu.yebisuRPG.item;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.ItemStack;
import net.ye6isu.yebisuRPG.mixin.AccessorCreativeModeTab;

import java.util.*;
import java.util.function.Supplier;

public final class TabIconCycler {

    private record CycleEntry(Supplier<CreativeModeTab> tab, long intervalMs, List<ItemStack> items) {}

    private static final List<CycleEntry> entries = new ArrayList<>();
    private static boolean initialized = false;

    private TabIconCycler() {}

    public static void init() {
        if (initialized) return;
        initialized = true;
        try (var stream = TabIconCycler.class.getResourceAsStream("/assets/yebisurpg/ycs/ycs_custom_tabs.json")) {
            if (stream == null) return;
            String json = new String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            java.lang.reflect.Type listType = new TypeToken<List<Map<String, String>>>(){}.getType();
            List<Map<String, String>> tabs = new Gson().fromJson(json, listType);
            if (tabs == null) return;
            for (var tabData : tabs) {
                String key = tabData.get("key");
                String iconRef = tabData.get("iconRef");
                if (key == null || iconRef == null || !iconRef.startsWith("cycle:")) continue;
                long ms = 2000;
                try { ms = Math.max(500, Long.parseLong(iconRef.substring(6))); } catch (Exception ignored) {}
                try {
                    var field = ModCreativeModeTabs.class.getField(key.toUpperCase());
                    @SuppressWarnings("unchecked")
                    Supplier<CreativeModeTab> supplier = (Supplier<CreativeModeTab>) field.get(null);
                    if (supplier != null) {
                        entries.add(new CycleEntry(supplier, ms, new ArrayList<>()));
                    }
                } catch (Exception ignored) {}
            }
        } catch (Exception e) {
            System.err.println("[YCS] TabIconCycler init error: " + e.getMessage());
        }
    }

    public static void onClientTick() {
        if (entries.isEmpty()) return;
        long now = System.currentTimeMillis();
        for (var entry : entries) {
            CreativeModeTab tab = entry.tab.get();
            if (tab == null) continue;
            if (entry.items.isEmpty()) {
                tab.getDisplayItems().forEach(stack -> entry.items.add(stack.copy()));
                if (entry.items.isEmpty()) continue;
                Collections.shuffle(entry.items);
            }
            int idx = (int) ((now / entry.intervalMs) % entry.items.size());
            ((AccessorCreativeModeTab) tab).yebisurpg$setIconItemStack(entry.items.get(idx));
        }
    }
}
