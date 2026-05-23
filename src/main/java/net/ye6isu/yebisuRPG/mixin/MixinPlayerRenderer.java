package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.model.PlayerModel;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.entity.player.PlayerRenderer;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.client.renderer.CompositeSkinManager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Injects emissive glow draws into {@link PlayerRenderer#renderRightHand} and
 * {@link PlayerRenderer#renderLeftHand} for first-person arm rendering.
 *
 * <p>Uses {@link RenderType#eyes} — the same full-bright unlit render type used
 * by spider/enderman/phantom glowing eyes — so only the emissive pixels glow
 * regardless of surrounding light level. Only the specific arm parts are rendered
 * (rightArm + rightSleeve or leftArm + leftSleeve), matching exactly what vanilla
 * drew in the preceding {@code renderHand} call.</p>
 */
@OnlyIn(Dist.CLIENT)
@Mixin(PlayerRenderer.class)
public abstract class MixinPlayerRenderer {

    @Shadow public abstract PlayerModel<AbstractClientPlayer> getModel();

    private static boolean logged = false;

    @Inject(method = "renderRightHand", at = @At("TAIL"))
    private void yebisurpg$emissiveRightHand(
            PoseStack poseStack,
            MultiBufferSource buffer,
            int combinedLight,
            AbstractClientPlayer player,
            CallbackInfo ci) {
        ResourceLocation emissiveLoc =
            CompositeSkinManager.INSTANCE.getEmissiveLocation(player.getUUID());
        if (!logged) {
            org.slf4j.LoggerFactory.getLogger("MixinPlayerRenderer")
                .info("renderRightHand TAIL: emissiveLoc={}", emissiveLoc);
            logged = true;
        }
        if (emissiveLoc == null) return;
        var vc = buffer.getBuffer(RenderType.eyes(emissiveLoc));
        PlayerModel<AbstractClientPlayer> model = getModel();
        model.rightArm.render(poseStack, vc, combinedLight, OverlayTexture.NO_OVERLAY);
        model.rightSleeve.render(poseStack, vc, combinedLight, OverlayTexture.NO_OVERLAY);
    }

    @Inject(method = "renderLeftHand", at = @At("TAIL"))
    private void yebisurpg$emissiveLeftHand(
            PoseStack poseStack,
            MultiBufferSource buffer,
            int combinedLight,
            AbstractClientPlayer player,
            CallbackInfo ci) {
        ResourceLocation emissiveLoc =
            CompositeSkinManager.INSTANCE.getEmissiveLocation(player.getUUID());
        if (emissiveLoc == null) return;
        var vc = buffer.getBuffer(RenderType.eyes(emissiveLoc));
        PlayerModel<AbstractClientPlayer> model = getModel();
        model.leftArm.render(poseStack, vc, combinedLight, OverlayTexture.NO_OVERLAY);
        model.leftSleeve.render(poseStack, vc, combinedLight, OverlayTexture.NO_OVERLAY);
    }
}
