package net.ye6isu.yebisuRPG.hud;

import net.minecraft.resources.ResourceLocation;
import net.minecraft.client.gui.LayeredDraw;
import net.neoforged.neoforge.client.gui.VanillaGuiLayers;
import net.neoforged.neoforge.client.event.RegisterClientReloadListenersEvent;
import net.neoforged.neoforge.client.event.RegisterGuiLayersEvent;
import net.ye6isu.yebisuRPG.hud.client.HealthBarHudRenderer;
import net.ye6isu.yebisuRPG.hud.client.HudOverlayRenderer;
import net.ye6isu.yebisuRPG.hud.client.ResourceBarHudRenderer;
import net.ye6isu.yebisuRPG.hud.client.VerticalHotbarRenderer;
import net.ye6isu.yebisuRPG.yebisuRPG;

/**
 * Registers the single YCS HUD overlay layer and every declared HUD layout name. YCS injects
 * one {@code HudOverlayRenderer.registerLayout("<name>")} call per saved layout above the
 * {@code YCS_Hud_Layouts} marker below.
 */
public final class ModHud {

    private ModHud() {}

    public static void onRegisterGuiLayers(RegisterGuiLayersEvent event) {
        event.wrapLayer(VanillaGuiLayers.HOTBAR, VerticalHotbarRenderer::new);
        event.wrapLayer(VanillaGuiLayers.FOOD_LEVEL, layer -> translated(layer, -10));
        event.wrapLayer(VanillaGuiLayers.AIR_LEVEL, layer -> translated(layer, -10));
        event.wrapLayer(VanillaGuiLayers.EXPERIENCE_LEVEL, layer -> translated(layer, -13));
        event.registerAbove(VanillaGuiLayers.EXPERIENCE_BAR,
                ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "health_bar_overlay"),
                new HealthBarHudRenderer());
        event.registerAboveAll(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "resource_bar_overlay"),
                new ResourceBarHudRenderer());
        event.registerAboveAll(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "hud_overlay"), new HudOverlayRenderer());
    }

    private static LayeredDraw.Layer translated(LayeredDraw.Layer layer, int yOffset) {
        return (graphics, deltaTracker) -> {
            if (!HealthBarHudRenderer.isActive()) {
                layer.render(graphics, deltaTracker);
                return;
            }
            graphics.pose().pushPose();
            try {
                graphics.pose().translate(0.0F, yOffset, 0.0F);
                layer.render(graphics, deltaTracker);
            } finally {
                graphics.pose().popPose();
            }
        };
    }

    public static void onRegisterReloadListeners(RegisterClientReloadListenersEvent event) {
        event.registerReloadListener(HudOverlayRenderer.reloadListener());
    }

    public static void registerLayouts() {
        HudOverlayRenderer.registerLayout("ability");
        HudOverlayRenderer.registerLayoutVisibility("ability", "", true);
        HudOverlayRenderer.registerLayout("alt_ability");
        HudOverlayRenderer.registerLayoutVisibility("alt_ability", "", true);
        HudOverlayRenderer.registerLayout("resource");
        HudOverlayRenderer.registerLayoutVisibility("resource", "", false);
        // YCS_Hud_Layouts
    }
}
