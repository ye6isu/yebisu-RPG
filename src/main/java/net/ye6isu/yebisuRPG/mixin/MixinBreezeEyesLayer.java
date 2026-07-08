package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.layers.BreezeEyesLayer;
import net.minecraft.world.entity.monster.breeze.Breeze;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.texture.TextureOverlayManager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Suppresses the Breeze's glowing eyes — see {@link MixinEmissiveLayers} for reasoning. */
@OnlyIn(Dist.CLIENT)
@Mixin(BreezeEyesLayer.class)
public abstract class MixinBreezeEyesLayer {

    @Inject(method = "render", at = @At("HEAD"), cancellable = true)
    private void yebisurpg$suppressWhenMaskOverBase(
            PoseStack poseStack, MultiBufferSource buffer, int packedLight,
            Breeze livingEntity, float limbSwing, float limbSwingAmount,
            float partialTicks, float ageInTicks, float netHeadYaw, float headPitch,
            CallbackInfo ci) {
        if (TextureOverlayManager.INSTANCE.hasMaskOverBase(livingEntity.getId())) {
            ci.cancel();
        }
    }
}
