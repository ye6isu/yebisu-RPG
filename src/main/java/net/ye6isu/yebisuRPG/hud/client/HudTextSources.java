package net.ye6isu.yebisuRPG.hud.client;

import net.minecraft.world.entity.player.Player;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.LivingEntity;
// YCS_Hud_Text_Source_Imports

import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * Per-widget compiled literal-text expressions for HUD Text widgets in Text mode — the
 * string counterpart to {@link HudValueSources}. A Text widget can either format a bound
 * number (the original behavior) or, in Text mode, read a raw string straight from a Blocky
 * graph ending in a "Return Text" node; at Save time YCS compiles whatever's plugged into
 * that slot into one small static method here, keyed by a generated id.
 *
 * <p>Runs purely client-side, once per frame, against the local player only.</p>
 */
@OnlyIn(Dist.CLIENT)
public final class HudTextSources {

    private static final Map<String, Function<Player, String>> SOURCES = new HashMap<>();

    private HudTextSources() {}

    private static void register(String id, Function<Player, String> fn) {
        SOURCES.put(id, fn);
    }

    public static String resolve(String id, Player player, String fallback) {
        Function<Player, String> fn = SOURCES.get(id);
        if (fn == null) return fallback;
        String result = fn.apply(player);
        return result != null ? result : fallback;
    }

    static {
        register("testhud_w1_text", player -> (String)((String.valueOf(String.format("%.1f", (double)((player instanceof LivingEntity livingTarget_n1g9b79w ? livingTarget_n1g9b79w.getHealth() : 0.0)))) + " / " + String.valueOf(String.format("%.1f", (double)((player instanceof LivingEntity livingTarget_ncs2jq9o ? livingTarget_ncs2jq9o.getAttributeValue(Attributes.MAX_HEALTH) : 0.0)))))));
        // YCS_Hud_Text_Sources
    }
}
