package net.ye6isu.yebisuRPG.hud;

import net.minecraft.resources.ResourceLocation;
import net.neoforged.neoforge.client.event.RegisterClientReloadListenersEvent;
import net.neoforged.neoforge.client.event.RegisterGuiLayersEvent;
import net.ye6isu.yebisuRPG.hud.client.HudOverlayRenderer;
import net.ye6isu.yebisuRPG.yebisuRPG;

/**
 * Registers the single YCS HUD overlay layer and every declared HUD layout name. YCS injects
 * one {@code HudOverlayRenderer.registerLayout("<name>")} call per saved layout above the
 * {@code YCS_Hud_Layouts} marker below.
 */
public final class ModHud {

    private ModHud() {}

    public static void onRegisterGuiLayers(RegisterGuiLayersEvent event) {
        event.registerAboveAll(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "hud_overlay"), new HudOverlayRenderer());
    }

    public static void onRegisterReloadListeners(RegisterClientReloadListenersEvent event) {
        event.registerReloadListener(HudOverlayRenderer.reloadListener());
    }

    public static void registerLayouts() {
        HudOverlayRenderer.registerLayout("aaaa");
        HudOverlayRenderer.registerLayoutVisibility("aaaa", "", false);
        HudOverlayRenderer.registerLayout("ability");
        HudOverlayRenderer.registerLayoutVisibility("ability", "", true);
        HudOverlayRenderer.registerLayout("alt_ability");
        HudOverlayRenderer.registerLayoutVisibility("alt_ability", "", true);
        // YCS_Hud_Layouts
    }
}
