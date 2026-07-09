package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.layers.ItemInHandLayer;
import net.minecraft.world.entity.HumanoidArm;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.item.ItemDisplayContext;
import net.minecraft.world.item.ItemStack;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.animation.client.ItemRenderContextHolder;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Publishes which entity/hand is being rendered into {@link ItemRenderContextHolder} for the
 * duration of {@code renderArmWithItem} — the one vanilla call site where the held item's
 * entity and hand side are both still in scope before dispatch reaches
 * {@link net.minecraft.client.renderer.BlockEntityWithoutLevelRenderer#renderByItem}
 * (whose vanilla signature carries neither). Third-person only: first-person held items never
 * reach {@code GeoItemRenderer} at all — {@code MixinItemInHandRenderer} renders those directly.
 */
@Mixin(ItemInHandLayer.class)
@OnlyIn(Dist.CLIENT)
public abstract class MixinItemInHandLayer {

    @Inject(method = "renderArmWithItem", at = @At("HEAD"))
    private void yebisurpg$beginItemRenderContext(
            LivingEntity livingEntity, ItemStack itemStack, ItemDisplayContext displayContext,
            HumanoidArm arm, PoseStack poseStack, MultiBufferSource buffer, int packedLight,
            CallbackInfo ci) {
        ItemRenderContextHolder.ENTITY_ID.set(livingEntity.getId());
        ItemRenderContextHolder.MAIN_HAND.set(arm == livingEntity.getMainArm());
        ItemRenderContextHolder.ACTIVE.set(true);
    }

    @Inject(method = "renderArmWithItem", at = @At("TAIL"))
    private void yebisurpg$endItemRenderContext(
            LivingEntity livingEntity, ItemStack itemStack, ItemDisplayContext displayContext,
            HumanoidArm arm, PoseStack poseStack, MultiBufferSource buffer, int packedLight,
            CallbackInfo ci) {
        ItemRenderContextHolder.ACTIVE.set(false);
    }
}
