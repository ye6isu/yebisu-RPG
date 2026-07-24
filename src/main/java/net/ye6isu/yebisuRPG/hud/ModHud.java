package net.ye6isu.yebisuRPG.hud;

import net.minecraft.resources.ResourceLocation;
import net.neoforged.neoforge.client.gui.VanillaGuiLayers;
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
        event.registerBelow(VanillaGuiLayers.PLAYER_HEALTH, ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "resource_hud_overlay"), HudOverlayRenderer.resourceOnly());
        event.registerAboveAll(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "hud_overlay"), new HudOverlayRenderer());
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
        HudOverlayRenderer.registerLayoutVisibility("resource", "", true);
        HudOverlayRenderer.registerLayout("asdadsadadadad");
        HudOverlayRenderer.registerLayoutVisibility("asdadsadadadad", "", true);
        // YCS_Hud_Layouts
    }
}
