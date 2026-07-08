package net.ye6isu.yebisuRPG.mixin;

import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.entity.layers.BreezeWindLayer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.monster.breeze.Breeze;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.client.renderer.EntityTextureCompositor;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * Redirects the Breeze's wind-effect texture to a per-instance composite (see
 * {@link EntityTextureCompositor#getLayerCompositeLocation}) whenever an overlay is active.
 */
@OnlyIn(Dist.CLIENT)
@Mixin(BreezeWindLayer.class)
public abstract class MixinBreezeWindLayer {

    @Redirect(method = "render", at = @At(value = "INVOKE",
            target = "Lnet/minecraft/client/renderer/RenderType;breezeWind(Lnet/minecraft/resources/ResourceLocation;FF)Lnet/minecraft/client/renderer/RenderType;"))
    private RenderType yebisurpg$redirectBreezeWind(
            ResourceLocation texture, float xOffset, float yOffset,
            com.mojang.blaze3d.vertex.PoseStack poseStack, net.minecraft.client.renderer.MultiBufferSource bufferSource,
            int packedLight, Breeze livingEntity, float limbSwing, float limbSwingAmount,
            float partialTick, float ageInTicks, float netHeadYaw, float headPitch) {
        ResourceLocation composite = EntityTextureCompositor.INSTANCE.getLayerCompositeLocation(livingEntity.getId(), texture);
        return RenderType.breezeWind(composite != null ? composite : texture, xOffset, yOffset);
    }
}
