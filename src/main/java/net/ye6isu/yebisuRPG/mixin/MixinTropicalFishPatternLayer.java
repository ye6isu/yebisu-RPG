package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.layers.TropicalFishPatternLayer;
import net.minecraft.world.entity.animal.TropicalFish;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.texture.TextureOverlayManager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Hides the tropical fish's pattern layer whenever a mask-over-base overlay is active. Cancels
 * before it reaches {@code renderColoredCutoutModel} (which {@code MixinRenderLayer} would
 * otherwise redirect like wool/clothes) since this one should disappear, not get the overlay
 * composited onto it.
 */
@OnlyIn(Dist.CLIENT)
@Mixin(TropicalFishPatternLayer.class)
public abstract class MixinTropicalFishPatternLayer {

    @Inject(method = "render", at = @At("HEAD"), cancellable = true)
    private void yebisurpg$suppressWhenMaskOverBase(
            PoseStack poseStack, MultiBufferSource buffer, int packedLight,
            TropicalFish livingEntity, float limbSwing, float limbSwingAmount,
            float partialTicks, float ageInTicks, float netHeadYaw, float headPitch,
            CallbackInfo ci) {
        if (TextureOverlayManager.INSTANCE.hasMaskOverBase(livingEntity.getId())) {
            ci.cancel();
        }
    }
}
