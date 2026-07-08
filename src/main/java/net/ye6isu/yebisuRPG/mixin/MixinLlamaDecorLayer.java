package net.ye6isu.yebisuRPG.mixin;

import net.minecraft.client.renderer.entity.layers.LlamaDecorLayer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.animal.horse.Llama;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.client.renderer.EntityTextureCompositor;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyVariable;

/**
 * Redirects the llama's decor/carpet texture (including the trader llama variant) to a
 * per-instance composite (see {@link EntityTextureCompositor#getLayerCompositeLocation})
 * whenever an overlay is active.
 */
@OnlyIn(Dist.CLIENT)
@Mixin(LlamaDecorLayer.class)
public abstract class MixinLlamaDecorLayer {

    @ModifyVariable(method = "render", at = @At("STORE"), ordinal = 0)
    private ResourceLocation yebisurpg$redirectLlamaDecor(
            ResourceLocation resourcelocation, com.mojang.blaze3d.vertex.PoseStack poseStack,
            net.minecraft.client.renderer.MultiBufferSource buffer, int packedLight, Llama livingEntity) {
        ResourceLocation composite = EntityTextureCompositor.INSTANCE.getLayerCompositeLocation(livingEntity.getId(), resourcelocation);
        return composite != null ? composite : resourcelocation;
    }
}
