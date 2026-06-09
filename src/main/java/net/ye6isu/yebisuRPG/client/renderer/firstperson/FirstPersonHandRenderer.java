package net.ye6isu.yebisuRPG.client.renderer.firstperson;

import net.minecraft.client.Minecraft;
import net.minecraft.client.model.geom.ModelLayerLocation;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.animation.client.ClientAnimationEngine;
import net.ye6isu.yebisuRPG.yebisuRPG;

@OnlyIn(Dist.CLIENT)
public final class FirstPersonHandRenderer {

    public static final ModelLayerLocation LAYER =
        new ModelLayerLocation(
            ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "first_person_hands"),
            "main"
        );

    private static FirstPersonHandModel model = null;
    private static boolean bakeFailed = false;

    private FirstPersonHandRenderer() {}

    public static boolean isActive(LocalPlayer player) {
        if (player == null) return false;
        int id = player.getId();
        return ClientAnimationEngine.INSTANCE.getPlayhead(id, AnimationCategory.ENTITY) != null
            || ClientAnimationEngine.INSTANCE.getBlender(id, AnimationCategory.ENTITY) != null;
    }

    /** Returns the baked model, attempting to bake it on first call. Returns null on failure. */
    public static FirstPersonHandModel getOrBakeModel() {
        if (model != null) return model;
        if (bakeFailed) return null;
        try {
            var root = Minecraft.getInstance().getEntityModels().bakeLayer(LAYER);
            model = new FirstPersonHandModel(root);
            yebisuRPG.LOGGER.info("[FirstPersonHandRenderer] Model baked successfully.");
        } catch (Exception e) {
            bakeFailed = true;
            yebisuRPG.LOGGER.error("[FirstPersonHandRenderer] Failed to bake layer: {}", e.getMessage());
        }
        return model;
    }
}
