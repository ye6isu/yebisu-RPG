package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.layers.MushroomCowMushroomLayer;
import net.minecraft.world.entity.animal.MushroomCow;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.texture.TextureOverlayManager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Suppresses the mooshroom mushroom-cap layer whenever a mask-over-base overlay is active.
 * These render as actual block models sampling the shared block texture atlas, not a standalone
 * entity texture, so compositing the overlay onto them isn't possible the way it is for wool,
 * clothes, etc. — hiding them is the practical option instead.
 */
@OnlyIn(Dist.CLIENT)
@Mixin(MushroomCowMushroomLayer.class)
public abstract class MixinMushroomCowMushroomLayer<T extends MushroomCow> {

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
