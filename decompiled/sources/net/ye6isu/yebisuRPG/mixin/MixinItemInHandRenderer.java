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

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/mixin/MixinItemInHandRenderer.class */
@Mixin({ItemInHandRenderer.class})
@OnlyIn(Dist.CLIENT)
public abstract class MixinItemInHandRenderer {

    @Shadow
    private Minecraft minecraft;

    @Inject(method = {"renderPlayerArm"}, at = {@At("TAIL")})
    private void yebisurpg$onRenderPlayerArmTail(PoseStack poseStack, MultiBufferSource buffer, int packedLight, float equippedProgress, float swingProgress, HumanoidArm side, CallbackInfo ci) {
        ResourceLocation emissiveLoc;
        LocalPlayer localPlayer = this.minecraft.player;
        if (localPlayer == null || (emissiveLoc = CompositeSkinManager.INSTANCE.getEmissiveLocation(localPlayer.getUUID())) == null) {
            return;
        }
        EntityRenderDispatcher dispatcher = this.minecraft.getEntityRenderDispatcher();
        LivingEntityRenderer<?, ?> renderer = dispatcher.getRenderer(localPlayer);
        if (renderer instanceof LivingEntityRenderer) {
            LivingEntityRenderer<?, ?> living = renderer;
            PlayerModel<AbstractClientPlayer> model = living.getModel();
            boolean slim = localPlayer.getSkin().model() == PlayerSkin.Model.SLIM;
            model.setAllVisible(false);
            if (side == HumanoidArm.RIGHT) {
                model.rightArm.visible = true;
                if (slim) {
                    model.rightSleeve.visible = true;
                }
            } else {
                model.leftArm.visible = true;
                if (slim) {
                    model.leftSleeve.visible = true;
                }
            }
            model.renderToBuffer(poseStack, buffer.getBuffer(RenderType.entityTranslucentEmissive(emissiveLoc)), packedLight, OverlayTexture.NO_OVERLAY);
            model.setAllVisible(true);
        }
    }
}
