package net.ye6isu.yebisuRPG.client;

import net.minecraft.client.renderer.entity.LivingEntityRenderer;
import net.minecraft.client.resources.PlayerSkin;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.EntityRenderersEvent;
import net.ye6isu.yebisuRPG.client.renderer.EmissiveSkinLayer;
import net.ye6isu.yebisuRPG.yebisuRPG;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/client/ClientEvents.class */
@EventBusSubscriber(modid = yebisuRPG.MODID, value = {Dist.CLIENT})
public final class ClientEvents {
    private ClientEvents() {
    }

    @SubscribeEvent
    public static void onAddRenderLayers(EntityRenderersEvent.AddLayers event) {
        for (PlayerSkin.Model model : PlayerSkin.Model.values()) {
            LivingEntityRenderer<?, ?> skin = event.getSkin(model);
            if (skin instanceof LivingEntityRenderer) {
                LivingEntityRenderer<?, ?> living = skin;
                living.addLayer(new EmissiveSkinLayer(living));
            }
        }
    }
}
