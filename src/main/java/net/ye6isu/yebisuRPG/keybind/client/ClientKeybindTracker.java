package net.ye6isu.yebisuRPG.keybind.client;

import net.minecraft.client.KeyMapping;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
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

    public void tick() {
        for (Map.Entry<String, KeyMapping> entry : ClientKeybindRegistry.all().entrySet()) {
            String id = entry.getKey();
            boolean down = entry.getValue().isDown();
            boolean wasDown = lastDown.getOrDefault(id, false);
            if (down != wasDown) {
                lastDown.put(id, down);
                NetworkUtils.sendToServer(new KeybindTriggerPayload(id, down));
            }
        }
    }
}
