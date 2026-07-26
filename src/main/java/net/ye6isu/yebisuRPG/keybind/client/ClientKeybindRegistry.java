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
        ClientKeybindRegistry.register("main_slot_2", ModKeybinds.MAIN_SLOT_2);
        ClientKeybindRegistry.register("main_slot_4", ModKeybinds.MAIN_SLOT_4);
        ClientKeybindRegistry.register("main_slot_5", ModKeybinds.MAIN_SLOT_5);
        ClientKeybindRegistry.register("main_slot_6", ModKeybinds.MAIN_SLOT_6);
        ClientKeybindRegistry.register("main_slot_3", ModKeybinds.MAIN_SLOT_3);
        ClientKeybindRegistry.register("debug", ModKeybinds.DEBUG);
        ClientKeybindRegistry.register("main_slot_1", ModKeybinds.MAIN_SLOT_1);
        ClientKeybindRegistry.register("alt_slot_1", ModKeybinds.ALT_SLOT_1);
        ClientKeybindRegistry.register("alt_slot_2", ModKeybinds.ALT_SLOT_2);
        ClientKeybindRegistry.register("alt_slot_3", ModKeybinds.ALT_SLOT_3);
        ClientKeybindRegistry.register("alt_slot_4", ModKeybinds.ALT_SLOT_4);
        ClientKeybindRegistry.register("alt_slot_5", ModKeybinds.ALT_SLOT_5);
        ClientKeybindRegistry.register("alt_slot_6", ModKeybinds.ALT_SLOT_6);
        ClientKeybindRegistry.register("alt_slot_7", ModKeybinds.ALT_SLOT_7);
        ClientKeybindRegistry.register("alt_slot_8", ModKeybinds.ALT_SLOT_8);
        ClientKeybindRegistry.register("alt_slot_9", ModKeybinds.ALT_SLOT_9);
        ClientKeybindRegistry.register("toggle_ability_bar", ModKeybinds.TOGGLE_ABILITY_BAR);
        ClientKeybindRegistry.register("tester", ModKeybinds.TESTER);
        // YCS_Keybind_Register
    }

    public static Map<String, KeyMapping> all() {
        return DEFS;
    }
}
