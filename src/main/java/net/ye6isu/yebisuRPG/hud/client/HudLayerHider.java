package net.ye6isu.yebisuRPG.hud.client;

import net.neoforged.neoforge.client.event.RenderGuiLayerEvent;
import net.neoforged.neoforge.client.gui.VanillaGuiLayers;

public final class HudLayerHider {
    private HudLayerHider() {
    }

    public static void onRenderGuiLayerPre(RenderGuiLayerEvent.Pre event) {
        if (!HealthBarHudRenderer.isActive()) return;

        if (VanillaGuiLayers.PLAYER_HEALTH.equals(event.getName())
                || VanillaGuiLayers.ARMOR_LEVEL.equals(event.getName())) {
            event.setCanceled(true);
        }
    }
}
