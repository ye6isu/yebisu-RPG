package net.ye6isu.yebisuRPG.mixin;

import net.minecraft.client.renderer.entity.TropicalFishRenderer;
import net.minecraft.world.entity.animal.TropicalFish;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.texture.TextureOverlayManager;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyArg;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import javax.annotation.Nullable;

/**
 * Tropical fish tint their main body model with the fish's base dye color. That tint should not
 * multiply over a mask-over-base overlay, because the overlay is already the final visible color.
 */
@OnlyIn(Dist.CLIENT)
@Mixin(TropicalFishRenderer.class)
public abstract class MixinTropicalFishRenderer {

    @Unique
    @Nullable
    private TropicalFish yebisurpg$renderedFish;

    @Inject(method = "render(Lnet/minecraft/world/entity/animal/TropicalFish;FFLcom/mojang/blaze3d/vertex/PoseStack;Lnet/minecraft/client/renderer/MultiBufferSource;I)V",
            at = @At("HEAD"))
    private void yebisurpg$captureRenderedFish(
            TropicalFish fish, float entityYaw, float partialTicks,
            com.mojang.blaze3d.vertex.PoseStack poseStack,
            net.minecraft.client.renderer.MultiBufferSource buffer,
            int packedLight,
            CallbackInfo ci) {
        yebisurpg$renderedFish = fish;
    }

    @Inject(method = "render(Lnet/minecraft/world/entity/animal/TropicalFish;FFLcom/mojang/blaze3d/vertex/PoseStack;Lnet/minecraft/client/renderer/MultiBufferSource;I)V",
            at = @At("RETURN"))
    private void yebisurpg$clearRenderedFish(
            TropicalFish fish, float entityYaw, float partialTicks,
            com.mojang.blaze3d.vertex.PoseStack poseStack,
            net.minecraft.client.renderer.MultiBufferSource buffer,
            int packedLight,
            CallbackInfo ci) {
        yebisurpg$renderedFish = null;
    }

    @ModifyArg(
            method = "render(Lnet/minecraft/world/entity/animal/TropicalFish;FFLcom/mojang/blaze3d/vertex/PoseStack;Lnet/minecraft/client/renderer/MultiBufferSource;I)V",
            at = @At(value = "INVOKE", target = "Lnet/minecraft/client/model/ColorableHierarchicalModel;setColor(I)V", ordinal = 0),
            index = 0)
    private int yebisurpg$cancelBaseTintWhenMaskOverBase(int color) {
        TropicalFish fish = yebisurpg$renderedFish;
        return fish != null && TextureOverlayManager.INSTANCE.hasMaskOverBase(fish.getId()) ? -1 : color;
    }
}
