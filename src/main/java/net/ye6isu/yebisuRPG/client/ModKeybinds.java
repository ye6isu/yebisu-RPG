package net.ye6isu.yebisuRPG.client;

import com.mojang.blaze3d.platform.InputConstants;
import net.minecraft.client.KeyMapping;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.RegisterKeyMappingsEvent;
import net.neoforged.neoforge.client.settings.KeyConflictContext;
import net.neoforged.neoforge.client.settings.KeyModifier;
import net.ye6isu.yebisuRPG.yebisuRPG;
import org.lwjgl.glfw.GLFW;

/**
 * Registers all client-side key bindings for yebisu RPG (YCS "Keybinds"). A YCS keybind is
 * a single key + at most one modifier (Ctrl/Alt/Shift) — the same ceiling NeoForge's own
 * {@link KeyMapping}/{@link KeyModifier} imposes — so binds ride entirely on vanilla's
 * Controls-screen integration: real KeyMapping rows, native rebind/reset/collision
 * detection, no custom screen needed.
 *
 * <p>YCS injects new keybind field declarations above {@code YCS_Mod_Keybinds} and their
 * {@code event.register(...)} calls above {@code YCS_Mod_Keybinds_Register}.</p>
 */
@EventBusSubscriber(modid = yebisuRPG.MODID, value = Dist.CLIENT)
public final class ModKeybinds {

    /** Controls-screen category label. Translation key defined in en_us.json. */
    public static final String CATEGORY = "key.categories.yebisurpg";

    public static final KeyMapping MAIN_SLOT_2 = bind("main_slot_2", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_X, KeyModifier.NONE, CATEGORY);
    public static final KeyMapping MAIN_SLOT_4 = bind("main_slot_4", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_V, KeyModifier.NONE, CATEGORY);
    public static final KeyMapping MAIN_SLOT_5 = bind("main_slot_5", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_B, KeyModifier.NONE, CATEGORY);
    public static final KeyMapping MAIN_SLOT_6 = bind("main_slot_6", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_N, KeyModifier.NONE, CATEGORY);
    public static final KeyMapping MAIN_SLOT_3 = bind("main_slot_3", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_C, KeyModifier.NONE, CATEGORY);
    public static final KeyMapping DEBUG = bind("debug", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_APOSTROPHE, KeyModifier.NONE, CATEGORY);
    public static final KeyMapping MAIN_SLOT_1 = bind("main_slot_1", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_Z, KeyModifier.NONE, CATEGORY);
    public static final KeyMapping ALT_SLOT_1 = bind("alt_slot_1", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_1, KeyModifier.NONE, CATEGORY);
    public static final KeyMapping ALT_SLOT_2 = bind("alt_slot_2", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_2, KeyModifier.NONE, CATEGORY);
    public static final KeyMapping ALT_SLOT_3 = bind("alt_slot_3", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_3, KeyModifier.NONE, CATEGORY);
    public static final KeyMapping ALT_SLOT_4 = bind("alt_slot_4", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_4, KeyModifier.NONE, CATEGORY);
    public static final KeyMapping ALT_SLOT_5 = bind("alt_slot_5", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_5, KeyModifier.NONE, CATEGORY);
    public static final KeyMapping ALT_SLOT_6 = bind("alt_slot_6", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_6, KeyModifier.NONE, CATEGORY);
    public static final KeyMapping ALT_SLOT_7 = bind("alt_slot_7", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_7, KeyModifier.NONE, CATEGORY);
    public static final KeyMapping ALT_SLOT_8 = bind("alt_slot_8", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_8, KeyModifier.NONE, CATEGORY);
    public static final KeyMapping ALT_SLOT_9 = bind("alt_slot_9", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_9, KeyModifier.NONE, CATEGORY);
    public static final KeyMapping TOGGLE_ABILITY_BAR = bind("toggle_ability_bar", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_LEFT_ALT, KeyModifier.NONE, CATEGORY);
    // YCS_Mod_Keybinds

    private ModKeybinds() {}

    @SubscribeEvent
    public static void register(RegisterKeyMappingsEvent event) {
        event.register(MAIN_SLOT_2);
        event.register(MAIN_SLOT_4);
        event.register(MAIN_SLOT_5);
        event.register(MAIN_SLOT_6);
        event.register(MAIN_SLOT_3);
        event.register(DEBUG);
        event.register(MAIN_SLOT_1);
        event.register(ALT_SLOT_1);
        event.register(ALT_SLOT_2);
        event.register(ALT_SLOT_3);
        event.register(ALT_SLOT_4);
        event.register(ALT_SLOT_5);
        event.register(ALT_SLOT_6);
        event.register(ALT_SLOT_7);
        event.register(ALT_SLOT_8);
        event.register(ALT_SLOT_9);
        event.register(TOGGLE_ABILITY_BAR);
        // YCS_Mod_Keybinds_Register
    }

    /**
     * Creates a {@link KeyMapping} active during normal gameplay, with an explicit
     * {@link InputConstants.Type}, single {@link KeyModifier} (Ctrl/Alt/Shift/None), and
     * category, so the Controls screen shows e.g. "Ctrl + F" automatically.
     */
    public static KeyMapping bind(String name, InputConstants.Type type, int code, KeyModifier modifier, String category) {
        return new KeyMapping(
            "key." + yebisuRPG.MODID + "." + name,
            KeyConflictContext.IN_GAME,
            modifier,
            type,
            code,
            category
        );
    }
}
