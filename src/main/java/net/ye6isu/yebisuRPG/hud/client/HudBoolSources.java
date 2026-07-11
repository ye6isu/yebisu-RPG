package net.ye6isu.yebisuRPG.hud.client;

import net.minecraft.world.entity.player.Player;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
// YCS_Hud_Bool_Source_Imports

import java.util.HashMap;
import java.util.Map;
import java.util.function.Predicate;

/**
 * Per-layout/per-widget compiled visibility conditions for HUD bindings — the boolean
 * counterpart to {@link HudValueSources}. A widget or whole layout can be gated by a single
 * connectable boolean slot (a Blocky graph ending in a "Return Bool" node); at Save time YCS
 * compiles whatever's plugged into that slot into one small static method here, keyed by a
 * generated id, and registers it so {@link HudOverlayRenderer} can look it up by that id.
 *
 * <p>Runs purely client-side, once per frame, against the local player only.</p>
 */
@OnlyIn(Dist.CLIENT)
public final class HudBoolSources {

    private static final Map<String, Predicate<Player>> SOURCES = new HashMap<>();

    private HudBoolSources() {}

    private static void register(String id, Predicate<Player> fn) {
        SOURCES.put(id, fn);
    }

    public static boolean resolve(String id, Player player) {
        Predicate<Player> fn = SOURCES.get(id);
        return fn == null || fn.test(player);
    }

    static {
        // YCS_Hud_Bool_Sources
    }
}
