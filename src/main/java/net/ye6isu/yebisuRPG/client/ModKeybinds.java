package net.ye6isu.yebisuRPG.client;

import com.mojang.blaze3d.platform.InputConstants;
import net.minecraft.client.KeyMapping;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.RegisterKeyMappingsEvent;
import net.neoforged.neoforge.client.settings.KeyConflictContext;
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

    /** Primary ability / skill activation. Default: R
    public static final KeyMapping USE_ABILITY = bind("use_ability", GLFW.GLFW_KEY_R);*/

    // Add more binds here:
    // public static final KeyMapping OPEN_SKILL_TREE = bind("open_skill_tree", GLFW.GLFW_KEY_K);
    // public static final KeyMapping DODGE           = bind("dodge",           GLFW.GLFW_KEY_LEFT_ALT);

    // ---------------------------------------------------------------------------------

    private ModKeybinds() {}

    /**
     * Registers all keybinds. Called automatically via {@code @EventBusSubscriber}.
     * Do not call manually.
     */
    @SubscribeEvent
    public static void register(RegisterKeyMappingsEvent event) {
        //event.register(USE_ABILITY);
        // Register new binds here in the same order as the declarations above.
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
}
