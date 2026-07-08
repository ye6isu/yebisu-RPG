package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.layers.EyesLayer;
import net.minecraft.world.entity.Entity;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.texture.TextureOverlayManager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Suppresses vanilla's own glowing-eyes render pass ({@code EyesLayer}, the common base class
 * behind {@code EndermanEyesLayer}, {@code SpiderEyesLayer}, {@code PhantomEyesLayer}, etc. —
 * and any modded mob's eyes layer that likewise extends it) whenever the entity has an active
 * "Mask Over Base" ({@link net.ye6isu.yebisuRPG.texture.MaskMode#ALPHA_FROM_BASE}) overlay layer.
 * That mode means the overlay is meant to fully take over the entity's visible appearance, so
 * vanilla's separate full-bright glow pass — sampling its own fixed vanilla texture, entirely
 * outside the composited texture — should not draw on top of it.
 *
 * <p>{@code WardenEmissiveLayer} and {@code BreezeEyesLayer} render their glow the same way but
 * don't extend {@code EyesLayer} (different base class/render method), so they get their own
 * near-identical mixins alongside this one — see {@code MixinWardenEmissiveLayer} and
 * {@code MixinBreezeEyesLayer}.</p>
 */
@OnlyIn(Dist.CLIENT)
@Mixin(EyesLayer.class)
public abstract class MixinEmissiveLayers {

    @Inject(method = "render", at = @At("HEAD"), cancellable = true)
    private void yebisurpg$suppressWhenMaskOverBase(
            PoseStack poseStack, MultiBufferSource buffer, int packedLight,
            Entity livingEntity, float limbSwing, float limbSwingAmount,
            float partialTicks, float ageInTicks, float netHeadYaw, float headPitch,
            CallbackInfo ci) {
        if (TextureOverlayManager.INSTANCE.hasMaskOverBase(livingEntity.getId())) {
            ci.cancel();
        }
    }
}
