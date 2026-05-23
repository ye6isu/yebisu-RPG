package net.ye6isu.yebisuRPG.client;

import net.minecraft.client.renderer.entity.LivingEntityRenderer;
import net.minecraft.client.resources.PlayerSkin;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.EntityRenderersEvent;
import net.ye6isu.yebisuRPG.client.renderer.EmissiveSkinLayer;
import net.ye6isu.yebisuRPG.yebisuRPG;

@EventBusSubscriber(modid = yebisuRPG.MODID, value = {Dist.CLIENT})
public final class ClientEvents {

    private ClientEvents() {}

    @SuppressWarnings({"unchecked", "rawtypes"})
    @SubscribeEvent
    public static void onAddRenderLayers(EntityRenderersEvent.AddLayers event) {
        for (PlayerSkin.Model model : PlayerSkin.Model.values()) {
            Object skin = event.getSkin(model);
            if (skin instanceof LivingEntityRenderer living) {
                living.addLayer(new EmissiveSkinLayer(living));
            }
        }
    }
}
