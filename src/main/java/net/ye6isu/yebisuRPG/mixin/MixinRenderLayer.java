package net.ye6isu.yebisuRPG.mixin;

import net.minecraft.client.renderer.entity.layers.RenderLayer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.LivingEntity;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.client.renderer.EntityTextureCompositor;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyVariable;

/**
 * Redirects {@code RenderLayer.renderColoredCutoutModel}'s texture argument to a per-instance
 * composite (see {@link EntityTextureCompositor#getLayerCompositeLocation}) whenever the entity
 * has an active overlay — this is the single shared choke point behind sheep wool
 * ({@code SheepFurLayer}), stray/bogged clothing ({@code SkeletonClothingLayer}, via
 * {@code coloredCutoutModelCopyLayerRender}), and villager/zombie-villager profession clothes
 * ({@code VillagerProfessionLayer}), so one mixin covers all of them: the overlay gets composited
 * onto whichever specific texture each of those layers would have used, same as the main body.
 */
@OnlyIn(Dist.CLIENT)
@Mixin(RenderLayer.class)
public abstract class MixinRenderLayer {

    @ModifyVariable(method = "renderColoredCutoutModel", at = @At("HEAD"), argsOnly = true, ordinal = 0)
    private static <T extends LivingEntity> ResourceLocation yebisurpg$redirectLayerTexture(
            ResourceLocation textureLocation,
            net.minecraft.client.model.EntityModel<T> model,
            ResourceLocation textureLocationOriginal,
            com.mojang.blaze3d.vertex.PoseStack poseStack,
            net.minecraft.client.renderer.MultiBufferSource buffer,
            int packedLight,
            T entity,
            int color) {
        ResourceLocation composite = EntityTextureCompositor.INSTANCE.getLayerCompositeLocation(entity.getId(), textureLocation);
        return composite != null ? composite : textureLocation;
    }

    /**
     * Cancels the ARGB tint (sheep wool's dye color, tropical fish's pattern color, etc.) whenever
     * this entity has any active overlay — the tint is meant to colorize the ORIGINAL vanilla
     * texture, so multiplying it over our own composited overlay pixels visibly discolors them.
     * Checks {@code isComposited} rather than re-deriving {@code getLayerCompositeLocation} from
     * {@code textureLocation} here, since by the time this second {@code @ModifyVariable} runs (same
     * {@code HEAD} point, same method), {@link #yebisurpg$redirectLayerTexture} has already
     * overwritten that local with the composite's own location rather than the original base texture.
     */
    @ModifyVariable(method = "renderColoredCutoutModel", at = @At("HEAD"), argsOnly = true, ordinal = 1)
    private static <T extends LivingEntity> int yebisurpg$cancelLayerTint(
            int color,
            net.minecraft.client.model.EntityModel<T> model,
            ResourceLocation textureLocation,
            com.mojang.blaze3d.vertex.PoseStack poseStack,
            net.minecraft.client.renderer.MultiBufferSource buffer,
            int packedLight,
            T entity,
            int colorOriginal) {
        return EntityTextureCompositor.INSTANCE.isComposited(entity.getId()) ? -1 : color;
    }
}
