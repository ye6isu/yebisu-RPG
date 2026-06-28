package net.ye6isu.yebisuRPG.client.renderer;

import net.minecraft.client.player.AbstractClientPlayer;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.RenderArmEvent;
import net.neoforged.neoforge.client.event.RenderPlayerEvent;
import net.ye6isu.yebisuRPG.yebisuRPG;

@EventBusSubscriber(modid = yebisuRPG.MODID, value = Dist.CLIENT)
public final class FirstPersonTextureOverlay {

    private FirstPersonTextureOverlay() {}

    @SubscribeEvent
    public static void onRenderArm(RenderArmEvent event) {
        CompositeSkinManager.INSTANCE.update(event.getPlayer());
    }

    @SubscribeEvent
    public static void onRenderPlayer(RenderPlayerEvent.Pre event) {
        if (event.getEntity() instanceof AbstractClientPlayer acp) {
            CompositeSkinManager.INSTANCE.update(acp);
        }
    }
}
