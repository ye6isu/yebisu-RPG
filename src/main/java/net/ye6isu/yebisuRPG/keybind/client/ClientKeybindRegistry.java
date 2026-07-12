package net.ye6isu.yebisuRPG.keybind.client;

import net.minecraft.client.KeyMapping;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.client.ModKeybinds;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Maps each YCS keybind's id to its real {@link KeyMapping}, so {@link ClientKeybindTracker}
 * knows which mapping to poll for edge-detection per id. YCS injects one
 * {@code register(id, ModKeybinds.FIELD)} call per declared keybind above the
 * {@code YCS_Keybind_Register} marker below.
 */
@OnlyIn(Dist.CLIENT)
public final class ClientKeybindRegistry {

    private static final Map<String, KeyMapping> DEFS = new LinkedHashMap<>();

    private ClientKeybindRegistry() {}

    public static void register(String id, KeyMapping mapping) {
        DEFS.put(id, mapping);
    }

    static {
        // YCS_Keybind_Register
    }

    public static Map<String, KeyMapping> all() {
        return DEFS;
    }
}
