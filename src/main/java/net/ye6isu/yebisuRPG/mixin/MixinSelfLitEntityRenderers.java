package net.ye6isu.yebisuRPG.mixin;

import net.minecraft.core.BlockPos;
import net.minecraft.client.renderer.entity.AllayRenderer;
import net.minecraft.client.renderer.entity.BlazeRenderer;
import net.minecraft.client.renderer.entity.GlowSquidRenderer;
import net.minecraft.client.renderer.entity.MagmaCubeRenderer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.level.LightLayer;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.texture.TextureOverlayManager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Self-lit mobs force their block light to full brightness. A mask-over-base overlay is meant
 * to replace the entity's visible surface, so render it under normal world light instead.
 */
@OnlyIn(Dist.CLIENT)
@Mixin({AllayRenderer.class, BlazeRenderer.class, GlowSquidRenderer.class, MagmaCubeRenderer.class})
public abstract class MixinSelfLitEntityRenderers {

    @Inject(method = "getBlockLightLevel(Lnet/minecraft/world/entity/Entity;Lnet/minecraft/core/BlockPos;)I",
            at = @At("HEAD"), cancellable = true)
    private void yebisurpg$useWorldLightWhenMaskOverBase(
            Entity entity, BlockPos pos, CallbackInfoReturnable<Integer> cir) {
        if (TextureOverlayManager.INSTANCE.hasMaskOverBase(entity.getId())) {
            cir.setReturnValue(entity.level().getBrightness(LightLayer.BLOCK, pos));
        }
    }
}
