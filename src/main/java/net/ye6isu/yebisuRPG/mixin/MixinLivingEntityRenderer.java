package net.ye6isu.yebisuRPG.mixin;

import net.minecraft.client.renderer.entity.LivingEntityRenderer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.LivingEntity;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.client.renderer.EntityTextureCompositor;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyVariable;

/**
 * Redirects the texture location used for a {@link LivingEntity}'s render type to that
 * entity's own private composite texture (see {@link EntityTextureCompositor#getCompositeLocation})
 * when one is active.
 *
 * <p>Every instance of a given entity type (e.g. all zombies) shares one vanilla texture
 * {@link ResourceLocation}, so {@link EntityTextureCompositor} can never bake an overlay directly
 * into that shared location without affecting every other entity of the same type. Instead each
 * entity instance gets its own private composited location, and this mixin swaps in that
 * per-instance location right where {@code getRenderType} resolves it — leaving the shared
 * vanilla texture, and every other entity still using it, untouched.</p>
 */
@OnlyIn(Dist.CLIENT)
@Mixin(LivingEntityRenderer.class)
public abstract class MixinLivingEntityRenderer<T extends LivingEntity> {

    @ModifyVariable(method = "getRenderType", at = @At("STORE"))
    private ResourceLocation yebisurpg$redirectToComposite(ResourceLocation original, T livingEntity) {
        ResourceLocation composite = EntityTextureCompositor.INSTANCE.getCompositeLocation(livingEntity.getId());
        return composite != null ? composite : original;
    }
}
