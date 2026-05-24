package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.model.PlayerModel;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.LivingEntityRenderer;
import net.minecraft.client.renderer.entity.player.PlayerRenderer;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.client.renderer.CompositeSkinManager;
import net.ye6isu.yebisuRPG.client.renderer.FullbrightRenderType;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@OnlyIn(Dist.CLIENT)
@Mixin(PlayerRenderer.class)
public abstract class MixinPlayerRenderer extends LivingEntityRenderer<AbstractClientPlayer, PlayerModel<AbstractClientPlayer>> {

    public MixinPlayerRenderer() { super(null, null, 0); }

    @Inject(method = "renderRightHand", at = @At("TAIL"))
    private void yebisurpg$emissiveRightHand(
            PoseStack poseStack, MultiBufferSource buffer,
            int combinedLight, AbstractClientPlayer player, CallbackInfo ci) {
        ResourceLocation emissiveLoc =
            CompositeSkinManager.INSTANCE.getEmissiveLocation(player.getUUID());
        if (emissiveLoc == null || FullbrightRenderType.shader == null) return;
        var model = this.getModel();
        var vb = buffer.getBuffer(FullbrightRenderType.get(emissiveLoc));
        model.rightArm.render(poseStack, vb, combinedLight, OverlayTexture.NO_OVERLAY);
        model.rightSleeve.render(poseStack, vb, combinedLight, OverlayTexture.NO_OVERLAY);
        if (buffer instanceof MultiBufferSource.BufferSource bs)
            bs.endBatch(FullbrightRenderType.get(emissiveLoc));
    }

    @Inject(method = "renderLeftHand", at = @At("TAIL"))
    private void yebisurpg$emissiveLeftHand(
            PoseStack poseStack, MultiBufferSource buffer,
            int combinedLight, AbstractClientPlayer player, CallbackInfo ci) {
        ResourceLocation emissiveLoc =
            CompositeSkinManager.INSTANCE.getEmissiveLocation(player.getUUID());
        if (emissiveLoc == null || FullbrightRenderType.shader == null) return;
        var model = this.getModel();
        var vb = buffer.getBuffer(FullbrightRenderType.get(emissiveLoc));
        model.leftArm.render(poseStack, vb, combinedLight, OverlayTexture.NO_OVERLAY);
        model.leftSleeve.render(poseStack, vb, combinedLight, OverlayTexture.NO_OVERLAY);
        if (buffer instanceof MultiBufferSource.BufferSource bs)
            bs.endBatch(FullbrightRenderType.get(emissiveLoc));
    }
}
