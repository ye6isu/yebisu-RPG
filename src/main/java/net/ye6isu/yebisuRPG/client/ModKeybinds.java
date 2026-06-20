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
 * Registers all client-side key bindings for yebisu RPG.
 *
 * <h2>Adding a new keybind — two steps</h2>
 * <ol>
 *   <li>Declare a {@code public static KeyMapping} field below, using
 *       {@link #bind} for the common case or constructing a {@link KeyMapping}
 *       directly for custom conflict contexts.</li>
 *   <li>Add the translation key in {@code assets/yebisurpg/lang/en_us.json}:
 *       {@code "key.yebisurpg.your_name": "Your Label"}</li>
 * </ol>
 *
 * <h2>Acting on a keybind each frame</h2>
 * <p>Listen to {@code ClientTickEvent.Post} (client-only event bus subscriber),
 * call {@code yourKey.consumeClick()} in a {@code while} loop, and send a
 * {@code playToServer} payload via {@code NetworkUtils.sendToServer(...)} when true.</p>
 *
 * <pre>{@code
 * @SubscribeEvent
 * public static void onClientTick(ClientTickEvent.Post event) {
 *     while (ModKeybinds.USE_ABILITY.consumeClick()) {
 *         NetworkUtils.sendToServer(new UseAbilityPayload());
 *     }
 * }
 * }</pre>
 *
 * <h2>Key categories</h2>
 * <p>All binds share the category {@value #CATEGORY}, which appears as a group
 * header in the Controls screen.</p>
 */
@EventBusSubscriber(modid = yebisuRPG.MODID, value = Dist.CLIENT)
public final class ModKeybinds {

    /** Controls-screen category label. Translation key defined in en_us.json. */
    public static final String CATEGORY = "key.categories.yebisurpg";

    // ---------------------------------------------------------------------------------
    // Keybind declarations
    // ---------------------------------------------------------------------------------
    // Use bind(name, glfwKey) for standard in-game binds.
    // Use bindGui(name, glfwKey) for binds active only in GUIs.
    // Use new KeyMapping(...) directly for full control.
    // ---------------------------------------------------------------------------------

    /** Opens the first-person hand debug screen. Default: H */
    public static final KeyMapping OPEN_HAND_DEBUG = bind("open_hand_debug", GLFW.GLFW_KEY_H);

    // Add more binds here:
    // public static final KeyMapping OPEN_SKILL_TREE = bind("open_skill_tree", GLFW.GLFW_KEY_K);
    // public static final KeyMapping DODGE           = bind("dodge",           GLFW.GLFW_KEY_LEFT_ALT);

    //YCS_Mod_Keybinds_START

    //YCS_Mod_Keybinds_END

    // ---------------------------------------------------------------------------------

    /** Toggles prone rendering: false = full vanilla (tilt + animation), true = tilt only (no limb animation). */
    public static boolean proneTiltOnly = false;

    private ModKeybinds() {}

    /**
     * Registers all keybinds. Called automatically via {@code @EventBusSubscriber}.
     * Do not call manually.
     */
    @SubscribeEvent
    public static void register(RegisterKeyMappingsEvent event) {
        event.register(OPEN_HAND_DEBUG);

        //YCS_Mod_Keybinds_Register_START

        //YCS_Mod_Keybinds_Register_END
    }

    // ---------------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------------

    /**
     * Creates a {@link KeyMapping} active during normal gameplay (not in GUIs).
     *
     * @param name    short name, e.g. {@code "use_ability"}.
     *                Translation key will be {@code "key.yebisurpg.<name>"}.
     * @param glfwKey GLFW key constant, e.g. {@link GLFW#GLFW_KEY_R}.
     */
    private static KeyMapping bind(String name, int glfwKey) {
        return new KeyMapping(
            "key." + yebisuRPG.MODID + "." + name,
            KeyConflictContext.IN_GAME,
            InputConstants.Type.KEYSYM,
            glfwKey,
            CATEGORY
        );
    }

    /**
     * Creates a {@link KeyMapping} active during normal gameplay (not in GUIs),
     * with an explicit {@link InputConstants.Type} so mouse buttons (and unbound
     * defaults via {@link InputConstants#UNKNOWN}) are supported alongside keys.
     *
     * @param name short name, e.g. {@code "use_ability"}.
     * @param type {@link InputConstants.Type#KEYSYM} for keyboard or
     *             {@link InputConstants.Type#MOUSE} for mouse buttons.
     * @param code GLFW key/button constant, or {@link InputConstants#UNKNOWN} for no default.
     */
    private static KeyMapping bind(String name, InputConstants.Type type, int code) {
        return new KeyMapping(
            "key." + yebisuRPG.MODID + "." + name,
            KeyConflictContext.IN_GAME,
            type,
            code,
            CATEGORY
        );
    }

    /**
     * Creates a {@link KeyMapping} active only when a GUI is open.
     *
     * @param name    short name used for the translation key.
     * @param glfwKey GLFW key constant.
     */
    @SuppressWarnings("unused")
    private static KeyMapping bindGui(String name, int glfwKey) {
        return new KeyMapping(
            "key." + yebisuRPG.MODID + "." + name,
            KeyConflictContext.GUI,
            InputConstants.Type.KEYSYM,
            glfwKey,
            CATEGORY
        );
    }

    /**
     * Creates a {@link KeyMapping} active during normal gameplay, with an explicit
     * {@link InputConstants.Type}, single {@link KeyModifier} (Ctrl/Alt/Shift/None —
     * NeoForge's {@code KeyMapping} only supports one modifier at a time, not
     * combinations), and category, so the Controls screen shows e.g. "Ctrl + F"
     * automatically via {@code KeyMapping.getTranslatedKeyMessage()}.
     *
     * @param name     short name, e.g. {@code "use_ability"}.
     * @param type     {@link InputConstants.Type#KEYSYM} for keyboard or
     *                 {@link InputConstants.Type#MOUSE} for mouse buttons.
     * @param code     GLFW key/button constant, or {@link InputConstants#UNKNOWN} for no default.
     * @param modifier {@link KeyModifier#CONTROL}, {@link KeyModifier#SHIFT},
     *                 {@link KeyModifier#ALT}, or {@link KeyModifier#NONE}.
     * @param category Controls-screen category translation key, e.g. {@link #CATEGORY}
     *                 for this mod's own group or a vanilla one like
     *                 {@code "key.categories.misc"} to slot into an existing group.
     */
    private static KeyMapping bind(String name, InputConstants.Type type, int code, KeyModifier modifier, String category) {
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
