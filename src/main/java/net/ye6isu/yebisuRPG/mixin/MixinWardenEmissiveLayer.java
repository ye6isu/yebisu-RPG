package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.layers.WardenEmissiveLayer;
import net.minecraft.world.entity.monster.warden.Warden;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.texture.TextureOverlayManager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Suppresses the Warden's emissive glow parts — see {@link MixinEmissiveLayers} for reasoning. */
@OnlyIn(Dist.CLIENT)
@Mixin(WardenEmissiveLayer.class)
public abstract class MixinWardenEmissiveLayer<T extends Warden> {

    @Inject(method = "render", at = @At("HEAD"), cancellable = true)
    private void yebisurpg$suppressWhenMaskOverBase(
            PoseStack poseStack, MultiBufferSource buffer, int packedLight,
            T livingEntity, float limbSwing, float limbSwingAmount,
            float partialTicks, float ageInTicks, float netHeadYaw, float headPitch,
            CallbackInfo ci) {
        if (TextureOverlayManager.INSTANCE.hasMaskOverBase(livingEntity.getId())) {
            ci.cancel();
        }
    }
}
