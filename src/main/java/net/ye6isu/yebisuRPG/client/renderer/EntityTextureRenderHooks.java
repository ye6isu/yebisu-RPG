package net.ye6isu.yebisuRPG.client.renderer;

import net.minecraft.client.player.AbstractClientPlayer;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.RenderArmEvent;
import net.neoforged.neoforge.client.event.RenderLivingEvent;
import net.ye6isu.yebisuRPG.yebisuRPG;

/**
 * Drives {@link EntityTextureCompositor#update} once per frame for whatever entity is
 * about to render, so its composited texture is up to date before sampling.
 *
 * <p>{@link RenderLivingEvent.Pre} covers every {@code LivingEntity} in third person —
 * players and mobs alike. {@link RenderArmEvent} additionally covers the local player's
 * own first-person hand/arm, which does not go through {@code RenderLivingEvent}.</p>
 */
@EventBusSubscriber(modid = yebisuRPG.MODID, value = Dist.CLIENT)
public final class EntityTextureRenderHooks {

    private EntityTextureRenderHooks() {}

    @SubscribeEvent
    public static void onRenderLiving(RenderLivingEvent.Pre<?, ?> event) {
        EntityTextureCompositor.INSTANCE.update(event.getEntity());
    }

    @SubscribeEvent
    public static void onRenderArm(RenderArmEvent event) {
        AbstractClientPlayer player = event.getPlayer();
        if (player != null) EntityTextureCompositor.INSTANCE.update(player);
    }
}
