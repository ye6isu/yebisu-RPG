package net.ye6isu.yebisuRPG.client.renderer;

import com.mojang.blaze3d.vertex.DefaultVertexFormat;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.ShaderInstance;
import net.minecraft.client.renderer.entity.LivingEntityRenderer;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.EntityRenderersEvent;
import net.neoforged.neoforge.client.event.RegisterShadersEvent;
import net.neoforged.neoforge.client.event.RenderArmEvent;
import net.neoforged.neoforge.client.event.RenderLivingEvent;
import net.ye6isu.yebisuRPG.yebisuRPG;

/**
 * Drives {@link EntityTextureCompositor#update} once per frame for whatever entity is
 * about to render, so its composited texture is up to date before sampling. Also registers
 * the extra full-bright render layer for emissive overlay layers ({@link EmissiveEntityLayer}).
 *
 * <p>{@link RenderLivingEvent.Pre} covers every {@code LivingEntity} in third person —
 * players and mobs alike — this is what keeps spritesheet-animated overlays advancing frame
 * by frame for anything rendered in third person. {@link RenderArmEvent} covers the local
 * player's own first-person hand/arm's composite texture update. The actual first-person
 * emissive draw itself is handled separately by {@code MixinPlayerRenderer} (a real mixin
 * into {@code PlayerRenderer.renderRightHand}/{@code renderLeftHand}), since a plain
 * {@code RenderArmEvent} handler does not fire in the right context to draw anything for
 * first-person emissive glow.</p>
 */
@EventBusSubscriber(modid = yebisuRPG.MODID, value = Dist.CLIENT)
public final class EntityTextureRenderHooks {

    private EntityTextureRenderHooks() {}

    /** Registered on the MOD bus (see {@code yebisuRPG}'s constructor) — RegisterShadersEvent is a mod-bus-only event. */
    public static void onRegisterShaders(RegisterShadersEvent event) {
        try {
            event.registerShader(
                new ShaderInstance(
                    event.getResourceProvider(),
                    ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "yebisurpg_fullbright"),
                    DefaultVertexFormat.NEW_ENTITY
                ),
                shader -> {
                    FullbrightRenderType.shader = shader;
                    yebisuRPG.LOGGER.info("yebisurpg_fullbright shader registered successfully");
                }
            );
        } catch (java.io.IOException e) {
            yebisuRPG.LOGGER.error("Failed to register yebisurpg_fullbright shader", e);
        }
    }

    /**
     * Registered on the MOD bus (see {@code yebisuRPG}'s constructor) — AddLayers is a
     * mod-bus-only event. Adds {@link EmissiveEntityLayer} to every registered LivingEntity
     * renderer AND every player skin model, so third-person emissive glow works for mobs and
     * players alike. Must be a real render layer (not a post-render event) to inherit the
     * entity renderer's own correctly-posed PoseStack — see {@link EmissiveEntityLayer}'s docs.
     */
    @SuppressWarnings({"unchecked", "rawtypes"})
    public static void onAddLayers(EntityRenderersEvent.AddLayers event) {
        for (var skinModel : event.getSkins()) {
            var renderer = event.getSkin(skinModel);
            if (renderer instanceof LivingEntityRenderer living) {
                living.addLayer(new EmissiveEntityLayer(living));
            }
        }
        for (var entityType : event.getEntityTypes()) {
            var renderer = event.getRenderer(entityType);
            if (renderer instanceof LivingEntityRenderer living) {
                living.addLayer(new EmissiveEntityLayer(living));
            }
        }
    }

    @SubscribeEvent
    public static void onRenderArm(RenderArmEvent event) {
        AbstractClientPlayer player = event.getPlayer();
        if (player != null) EntityTextureCompositor.INSTANCE.update(player);
    }

    /** Drives the composite/emissive texture rebuild for every third-person LivingEntity render. */
    @SubscribeEvent
    public static void onRenderLiving(RenderLivingEvent.Pre<?, ?> event) {
        EntityTextureCompositor.INSTANCE.update(event.getEntity());
    }
}
