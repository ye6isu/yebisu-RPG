package net.ye6isu.yebisuRPG.mixin;

import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.entity.layers.SlimeOuterLayer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.client.renderer.EntityTextureCompositor;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * Redirects the slime "outer" (translucent jelly) layer's texture to the same per-instance
 * composite as the main body ({@link EntityTextureCompositor#getCompositeLocation}) — this layer
 * calls {@code getTextureLocation} directly on the parent renderer rather than going through
 * {@code LivingEntityRenderer.getRenderType} (which {@code MixinLivingEntityRenderer} already
 * redirects), so it needs its own hook to stay in sync with the composited body.
 *
 * <p>{@code getTextureLocation} is {@code protected}, inherited from {@code RenderLayer} and
 * never overridden by {@code SlimeOuterLayer} itself — {@code @Shadow} requires the method to be
 * declared directly on the mixin target class (not just inherited), so it fails here without a
 * refmap (same class of bug as the earlier {@code MixinPlayerRenderer.getModel()} issue). Rather
 * than fighting Mixin's shadowing rules for an inherited method, the fallback value is just
 * re-derived directly from the entity's own registered renderer instead of calling the shadowed
 * method at all.</p>
 */
@OnlyIn(Dist.CLIENT)
@Mixin(SlimeOuterLayer.class)
public abstract class MixinSlimeOuterLayer<T extends LivingEntity> {

    @Redirect(method = "render", at = @At(value = "INVOKE",
            target = "Lnet/minecraft/client/renderer/entity/layers/SlimeOuterLayer;getTextureLocation(Lnet/minecraft/world/entity/Entity;)Lnet/minecraft/resources/ResourceLocation;"))
    private ResourceLocation yebisurpg$redirectSlimeOuter(SlimeOuterLayer<T> self, Entity entity) {
        ResourceLocation composite = EntityTextureCompositor.INSTANCE.getCompositeLocation(entity.getId());
        if (composite != null) return composite;
        return Minecraft.getInstance().getEntityRenderDispatcher().getRenderer(entity).getTextureLocation(entity);
    }
}
