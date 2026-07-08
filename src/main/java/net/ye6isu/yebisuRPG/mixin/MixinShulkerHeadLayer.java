package net.ye6isu.yebisuRPG.mixin;

import net.minecraft.client.renderer.entity.layers.ShulkerHeadLayer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.monster.Shulker;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.client.renderer.EntityTextureCompositor;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyVariable;

/**
 * Redirects the shulker's "inside" head texture to a per-instance composite (see
 * {@link EntityTextureCompositor#getLayerCompositeLocation}) whenever an overlay is active.
 */
@OnlyIn(Dist.CLIENT)
@Mixin(ShulkerHeadLayer.class)
public abstract class MixinShulkerHeadLayer {

    @ModifyVariable(method = "render", at = @At("STORE"), ordinal = 0)
    private ResourceLocation yebisurpg$redirectShulkerInside(
            ResourceLocation resourcelocation, com.mojang.blaze3d.vertex.PoseStack poseStack,
            net.minecraft.client.renderer.MultiBufferSource buffer, int packedLight, Shulker livingEntity) {
        ResourceLocation composite = EntityTextureCompositor.INSTANCE.getLayerCompositeLocation(livingEntity.getId(), resourcelocation);
        return composite != null ? composite : resourcelocation;
    }
}
