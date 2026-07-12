package net.ye6isu.yebisuRPG.keybind;

import net.minecraft.server.level.ServerPlayer;
import net.ye6isu.yebisuRPG.util.DashUtil;
import net.minecraft.world.entity.LivingEntity;
// YCS_Keybind_Handler_Imports

/**
 * Dispatch target for YCS keybind Blocky graphs. Each declared keybind gets one
 * {@code onPress_<id>}/{@code onRelease_<id>} method injected above the
 * {@code YCS_Keybind_Handlers} marker below, compiled from that keybind's own Blocky
 * graph (stored client-side in the YCS tool as {@code ycs-blocky::keybind::<id>::onPress}
 * / {@code ::onRelease}) — mirrors how per-item methods are compiled onto Item subclasses,
 * except keybinds aren't tied to any item, so they live here instead as static dispatch
 * methods keyed by keybind id.
 */
public final class KeybindHandlers {

    private KeybindHandlers() {}

    public static void dispatch(String keybindId, boolean pressed, ServerPlayer player) {
        if (pressed) {
            dispatchPress(keybindId, player);
        } else {
            dispatchRelease(keybindId, player);
        }
    }

    private static void dispatchPress(String keybindId, ServerPlayer player) {
        switch (keybindId) {
            case "testbind" -> { player.setDeltaMovement((double)((((player.getLookAngle().x))*(5))), (double)((((player.getLookAngle().y))*(5))), (double)((((player.getLookAngle().z))*(5)))); player.hurtMarked = true; }
            // YCS_Keybind_Press_Dispatch
            default -> {}
        }
    }

    private static void dispatchRelease(String keybindId, ServerPlayer player) {
        switch (keybindId) {
            // YCS_Keybind_Release_Dispatch
            default -> {}
        }
    }

    // YCS_Keybind_Handlers
}
