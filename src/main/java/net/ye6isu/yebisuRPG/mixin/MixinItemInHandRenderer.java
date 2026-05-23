package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.Minecraft;
import net.minecraft.client.model.PlayerModel;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.client.renderer.ItemInHandRenderer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.entity.EntityRenderDispatcher;
import net.minecraft.client.renderer.entity.LivingEntityRenderer;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.client.resources.PlayerSkin;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.HumanoidArm;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.client.renderer.CompositeSkinManager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(ItemInHandRenderer.class)
@OnlyIn(Dist.CLIENT)
public abstract class MixinItemInHandRenderer {

    private static boolean logged = false;

    @Shadow
    private Minecraft minecraft;

    @Inject(method = {"renderPlayerArm"}, at = {@At("TAIL")})
    private void yebisurpg$onRenderPlayerArmTail(
            PoseStack poseStack,
            MultiBufferSource buffer,
            int packedLight,
            float equippedProgress,
            float swingProgress,
            HumanoidArm side,
            CallbackInfo ci) {

        LocalPlayer localPlayer = this.minecraft.player;
        if (localPlayer == null) return;

        ResourceLocation emissiveLoc =
            CompositeSkinManager.INSTANCE.getEmissiveLocation(localPlayer.getUUID());

        // Temporary: log once to confirm inject fires and emissiveLoc state
        if (!logged) {
            org.slf4j.LoggerFactory.getLogger("MixinArm")
                .info("renderPlayerArm TAIL fired, emissiveLoc={}", emissiveLoc);
            logged = true;
        }

        if (emissiveLoc == null) return;

        EntityRenderDispatcher dispatcher = this.minecraft.getEntityRenderDispatcher();
        var rawRenderer = dispatcher.getRenderer(localPlayer);
        if (!(rawRenderer instanceof LivingEntityRenderer)) return;

        LivingEntityRenderer<?, ?> living = (LivingEntityRenderer<?, ?>) rawRenderer;
        @SuppressWarnings("unchecked")
        PlayerModel<AbstractClientPlayer> model =
            (PlayerModel<AbstractClientPlayer>) living.getModel();

        boolean slim = localPlayer.getSkin().model() == PlayerSkin.Model.SLIM;
        model.setAllVisible(false);
        if (side == HumanoidArm.RIGHT) {
            model.rightArm.visible = true;
            if (slim) model.rightSleeve.visible = true;
        } else {
            model.leftArm.visible = true;
            if (slim) model.leftSleeve.visible = true;
        }

        model.renderToBuffer(poseStack,
            buffer.getBuffer(RenderType.entityTranslucentEmissive(emissiveLoc)),
            packedLight, OverlayTexture.NO_OVERLAY);

        model.setAllVisible(true);

        // entityTranslucentEmissive is not pre-registered in RenderBuffers — it won't
        // auto-flush in first-person. Force-flush immediately after the draw.
        if (buffer instanceof MultiBufferSource.BufferSource bs) {
            bs.endBatch(RenderType.entityTranslucentEmissive(emissiveLoc));
        }
    }
}
