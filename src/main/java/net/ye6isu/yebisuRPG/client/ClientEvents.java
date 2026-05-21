package net.ye6isu.yebisuRPG.client;

import net.minecraft.client.model.PlayerModel;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.entity.LivingEntityRenderer;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.EntityRenderersEvent;
import net.ye6isu.yebisuRPG.client.renderer.EmissiveSkinLayer;
import net.ye6isu.yebisuRPG.yebisuRPG;

/**
 * Client-side event handlers registered on the MOD bus.
 */
@EventBusSubscriber(modid = yebisuRPG.MODID, value = Dist.CLIENT)
public final class ClientEvents {

    private ClientEvents() {}

    /** Registers the emissive GPU render layer on both player renderer variants. */
    @SuppressWarnings("unchecked")
    @SubscribeEvent
    public static void onAddRenderLayers(EntityRenderersEvent.AddLayers event) {
        for (net.minecraft.client.resources.PlayerSkin.Model model :
                net.minecraft.client.resources.PlayerSkin.Model.values()) {
            var renderer = event.getSkin(model);
            if (renderer instanceof LivingEntityRenderer<?, ?> living) {
                var playerRenderer = (LivingEntityRenderer<AbstractClientPlayer,
                    PlayerModel<AbstractClientPlayer>>) living;
                playerRenderer.addLayer(new EmissiveSkinLayer(playerRenderer));
            }
        }
    }
}
