package net.ye6isu.yebisuRPG.item;

import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.ItemStack;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.ye6isu.yebisuRPG.mixin.AccessorCreativeModeTab;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class TabIconCycler {

    private record CycleEntry(DeferredHolder<CreativeModeTab, CreativeModeTab> holder, long intervalMs, List<ItemStack> items) {}

    private static final List<CycleEntry> ENTRIES = new ArrayList<>();

    private TabIconCycler() {}

    static {
        ENTRIES.add(new CycleEntry(ModCreativeModeTabs.YEBISURPG, 2000L, new java.util.ArrayList<>()));
        // YCS_Cycler_Register
    }

    public static void onClientTick() {
        if (ENTRIES.isEmpty()) return;
        long now = System.currentTimeMillis();
        for (var entry : ENTRIES) {
            if (!entry.holder().isBound()) continue;
            CreativeModeTab tab = entry.holder().get();
            if (entry.items().isEmpty()) {
                tab.getDisplayItems().forEach(stack -> entry.items().add(stack.copy()));
                if (entry.items().isEmpty()) continue;
                Collections.shuffle(entry.items());
            }
            int idx = (int) ((now / entry.intervalMs()) % entry.items().size());
            ((AccessorCreativeModeTab) (Object) tab).yebisurpg$setIconItemStack(entry.items().get(idx));
        }
    }
}
