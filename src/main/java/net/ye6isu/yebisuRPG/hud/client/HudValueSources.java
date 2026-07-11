package net.ye6isu.yebisuRPG.hud.client;

import net.minecraft.world.entity.player.Player;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.entityvar.ModAttachments;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.Attributes;
// YCS_Hud_Value_Source_Imports

import java.util.HashMap;
import java.util.Map;
import java.util.function.ToDoubleFunction;

/**
 * Per-widget compiled value expressions for HUD bindings. Unlike the rest of YCS's Blocky
 * system, a HUD binding is a single connectable number slot (not a full action graph) — at
 * Save time, YCS compiles whatever value-block chain is plugged into a widget's binding
 * slot into one small static method here, keyed by a generated id (e.g.
 * {@code <layoutName>_w<widgetIndex>}), and registers it in {@link #SOURCES} so
 * {@link HudOverlayRenderer} can look it up by that same id without per-frame reflection.
 *
 * <p>Runs purely client-side, once per frame, against the local player only — {@code player}
 * is always {@code Minecraft.getInstance().player}, never a server-side or arbitrary
 * target entity.</p>
 */
@OnlyIn(Dist.CLIENT)
public final class HudValueSources {

    private static final Map<String, ToDoubleFunction<Player>> SOURCES = new HashMap<>();

    private HudValueSources() {}

    private static void register(String id, ToDoubleFunction<Player> fn) {
        SOURCES.put(id, fn);
    }

    public static double resolve(String id, Player player) {
        ToDoubleFunction<Player> fn = SOURCES.get(id);
        return fn != null ? fn.applyAsDouble(player) : 0.0;
    }

    static {
        register("testhud_w0_frame_icon", player -> (double)(((double)(player.getData(ModAttachments.COUNTER.get())))));
        register("testhud_w2_value", player -> (double)((player instanceof LivingEntity livingTarget_ne0tx9su ? livingTarget_ne0tx9su.getHealth() : 0.0)));
        register("testhud_w2_max", player -> (double)((player instanceof LivingEntity livingTarget_n0daex5j ? livingTarget_n0daex5j.getAttributeValue(Attributes.MAX_HEALTH) : 0.0)));
        // YCS_Hud_Value_Sources
    }
}
