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

    public static final KeyMapping TESTBIND = bind("testbind", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_Z, KeyModifier.ALT, CATEGORY);
    // YCS_Mod_Keybinds

    private ModKeybinds() {}

    @SubscribeEvent
    public static void register(RegisterKeyMappingsEvent event) {
        event.register(TESTBIND);
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
