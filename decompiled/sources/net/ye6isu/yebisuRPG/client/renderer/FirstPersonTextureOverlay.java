package net.ye6isu.yebisuRPG.client.renderer;

import net.minecraft.client.player.AbstractClientPlayer;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.RenderArmEvent;
import net.neoforged.neoforge.client.event.RenderPlayerEvent;
import net.ye6isu.yebisuRPG.yebisuRPG;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/client/renderer/FirstPersonTextureOverlay.class */
@EventBusSubscriber(modid = yebisuRPG.MODID, value = {Dist.CLIENT})
public final class FirstPersonTextureOverlay {
    private FirstPersonTextureOverlay() {
    }

    @SubscribeEvent
    public static void onRenderArm(RenderArmEvent event) {
        CompositeSkinManager.INSTANCE.update(event.getPlayer());
    }

    @SubscribeEvent
    public static void onRenderPlayer(RenderPlayerEvent.Pre event) {
        AbstractClientPlayer entity = event.getEntity();
        if (entity instanceof AbstractClientPlayer) {
            AbstractClientPlayer acp = entity;
            CompositeSkinManager.INSTANCE.update(acp);
        }
    }
}
