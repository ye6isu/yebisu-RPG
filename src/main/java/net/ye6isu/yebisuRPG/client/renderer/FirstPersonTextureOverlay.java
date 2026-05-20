package net.ye6isu.yebisuRPG.client.renderer;

import net.minecraft.client.Minecraft;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.world.entity.player.Player;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.RenderArmEvent;
import net.neoforged.neoforge.client.event.RenderPlayerEvent;
import net.ye6isu.yebisuRPG.yebisuRPG;

/**
 * Keeps the composite skin up to date before any player render.
 *
 * <p>{@link CompositeSkinManager} registers the composite directly at the player's skin
 * {@link net.minecraft.resources.ResourceLocation} and restores the original when cleared,
 * so no render interception is needed — vanilla renders the composite automatically.</p>
 */
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
