package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.model.PlayerModel;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.LivingEntityRenderer;
import net.minecraft.client.renderer.entity.player.PlayerRenderer;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.client.renderer.EntityTextureCompositor;
import net.ye6isu.yebisuRPG.client.renderer.FullbrightRenderType;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyVariable;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Injects emissive glow draws into {@link PlayerRenderer#renderRightHand}/{@code #renderLeftHand}
 * for first-person arm rendering — this is a confirmed-working, previously-shipped implementation
 * (see git history: "First person emissive texture" commit), restored here because the equivalent
 * NeoForge-event-based approach ({@code RenderArmEvent}) does not fire in the same context and never
 * actually drew anything. Third-person emissive glow still uses {@code EmissiveEntityLayer}, a real
 * render layer registered via {@code EntityRenderersEvent.AddLayers} — only first-person needs a
 * mixin, since {@code ItemInHandRenderer}'s first-person hand path has no render-layer equivalent.
 */
@OnlyIn(Dist.CLIENT)
@Mixin(PlayerRenderer.class)
public abstract class MixinPlayerRenderer extends LivingEntityRenderer<AbstractClientPlayer, PlayerModel<AbstractClientPlayer>> {

    protected MixinPlayerRenderer(EntityRendererProvider.Context context, PlayerModel<AbstractClientPlayer> model, float shadowRadius) {
        super(context, model, shadowRadius);
    }

    @ModifyVariable(method = "renderHand", at = @At("STORE"), ordinal = 0)
    private ResourceLocation yebisurpg$useCompositeFirstPersonHandTexture(
            ResourceLocation original,
            PoseStack poseStack,
            MultiBufferSource buffer,
            int combinedLight,
            AbstractClientPlayer player,
            ModelPart rendererArm,
            ModelPart rendererArmwear) {
        EntityTextureCompositor.INSTANCE.update(player);
        ResourceLocation composite = EntityTextureCompositor.INSTANCE.getCompositeLocation(player.getId());
        return composite != null ? composite : original;
    }

    @Inject(method = "renderRightHand", at = @At("TAIL"))
    private void yebisurpg$emissiveRightHand(
            PoseStack poseStack, MultiBufferSource buffer,
            int combinedLight, AbstractClientPlayer player, CallbackInfo ci) {
        ResourceLocation emissiveLoc = EntityTextureCompositor.INSTANCE.getEmissiveLocation(player.getId());
        if (emissiveLoc == null || FullbrightRenderType.shader == null) return;
        var model = getModel();
        var vb = buffer.getBuffer(FullbrightRenderType.get(emissiveLoc));
        model.rightArm.render(poseStack, vb, combinedLight, OverlayTexture.NO_OVERLAY);
        model.rightSleeve.render(poseStack, vb, combinedLight, OverlayTexture.NO_OVERLAY);
        if (buffer instanceof MultiBufferSource.BufferSource bs) {
            bs.endBatch(FullbrightRenderType.get(emissiveLoc));
        }
    }

    @Inject(method = "renderLeftHand", at = @At("TAIL"))
    private void yebisurpg$emissiveLeftHand(
            PoseStack poseStack, MultiBufferSource buffer,
            int combinedLight, AbstractClientPlayer player, CallbackInfo ci) {
        ResourceLocation emissiveLoc = EntityTextureCompositor.INSTANCE.getEmissiveLocation(player.getId());
        if (emissiveLoc == null || FullbrightRenderType.shader == null) return;
        var model = getModel();
        var vb = buffer.getBuffer(FullbrightRenderType.get(emissiveLoc));
        model.leftArm.render(poseStack, vb, combinedLight, OverlayTexture.NO_OVERLAY);
        model.leftSleeve.render(poseStack, vb, combinedLight, OverlayTexture.NO_OVERLAY);
        if (buffer instanceof MultiBufferSource.BufferSource bs) {
            bs.endBatch(FullbrightRenderType.get(emissiveLoc));
        }
    }
}
