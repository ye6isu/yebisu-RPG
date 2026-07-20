package net.ye6isu.yebisuRPG.keybind.client;

import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.client.AbilitySlotDebugScreen;
import net.ye6isu.yebisuRPG.client.ModKeybinds;
import net.ye6isu.yebisuRPG.keybind.KeybindTriggerPayload;
import net.ye6isu.yebisuRPG.network.util.NetworkUtils;

import java.util.HashMap;
import java.util.Map;

/**
 * Client-side per-tick edge detector for YCS keybinds. Each YCS keybind is a real
 * {@link KeyMapping} (single key + at most one modifier, same as vanilla) — this just
 * watches {@code isDown()} each tick and fires {@link KeybindTriggerPayload} to the
 * server whenever a mapping's down-state changes.
 */
@OnlyIn(Dist.CLIENT)
public final class ClientKeybindTracker {

    public static final ClientKeybindTracker INSTANCE = new ClientKeybindTracker();

    private final Map<String, Boolean> lastDown = new HashMap<>();

    private ClientKeybindTracker() {}

    public void preTick() {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || !AbilityBarClientState.isAltBarActive()) return;

        for (int slot = 1; slot <= 9; slot++) {
            KeyMapping altMapping = ClientKeybindRegistry.all().get("alt_slot_" + slot);
            if (altMapping != null && altMapping.isDown()) {
                suppressVanillaHotbarSlot(mc, slot - 1);
            }
        }
    }

    public void tick() {
        Minecraft mc = Minecraft.getInstance();
        while (ModKeybinds.DEBUG.consumeClick()) {
            if (mc.screen == null) mc.setScreen(new AbilitySlotDebugScreen());
        }
        while (ModKeybinds.TOGGLE_ABILITY_BAR.consumeClick()) {
            AbilityBarClientState.toggleAltBar();
        }

        for (Map.Entry<String, KeyMapping> entry : ClientKeybindRegistry.all().entrySet()) {
            String id = entry.getKey();
            if ("debug".equals(id) || "toggle_ability_bar".equals(id)) continue;
            if (id.startsWith("alt_slot_") && !AbilityBarClientState.isAltBarActive()) {
                if (lastDown.getOrDefault(id, false)) {
                    lastDown.put(id, false);
                    NetworkUtils.sendToServer(new KeybindTriggerPayload(id, false));
                }
                continue;
            }
            boolean down = entry.getValue().isDown();
            boolean wasDown = lastDown.getOrDefault(id, false);
            if (down != wasDown) {
                lastDown.put(id, down);
                NetworkUtils.sendToServer(new KeybindTriggerPayload(id, down));
            }
        }
    }

    private static void suppressVanillaHotbarSlot(Minecraft mc, int hotbarSlot) {
        if (hotbarSlot < 0 || hotbarSlot >= mc.options.keyHotbarSlots.length) return;
        KeyMapping vanillaHotbar = mc.options.keyHotbarSlots[hotbarSlot];
        while (vanillaHotbar.consumeClick()) {}
        vanillaHotbar.setDown(false);
    }
}
