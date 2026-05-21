package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.Minecraft;
import net.minecraft.client.model.PlayerModel;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.ItemInHandRenderer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.entity.EntityRenderDispatcher;
import net.minecraft.client.renderer.entity.LivingEntityRenderer;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.HumanoidArm;
import net.minecraft.world.item.ItemStack;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.client.renderer.CompositeSkinManager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * First-person arm hooks for the overlay system.
 *
 * <p>Two injects:</p>
 * <ol>
 *   <li>{@code renderArmWithItem} HEAD — runs on every first-person arm render,
 *       calls {@link CompositeSkinManager#update} so the DynamicTexture (including
 *       animated frames) stays fresh regardless of which hand holds what.</li>
 *   <li>{@code renderPlayerArm} TAIL — draws the emissive glow overlay when the
 *       arm is rendered bare (main hand empty). PoseStack is still in arm-local
 *       space at this point.</li>
 * </ol>
 */
@OnlyIn(Dist.CLIENT)
@Mixin(ItemInHandRenderer.class)
public abstract class MixinItemInHandRenderer {

    // ── Inject 1: keep the composite texture (incl. animations) refreshing ───
    //
    // Without this, when the player holds an item in main hand, RenderArmEvent
    // never fires, so update() never runs, so animated frames freeze in first
    // person. renderArmWithItem is called for every first-person arm draw on
    // every render frame — perfect place to drive the animation.

    @Inject(method = "renderArmWithItem", at = @At("HEAD"))
    private void yebisurpg$refreshComposite(
            AbstractClientPlayer player,
            float partialTicks,
            float pitch,
            InteractionHand hand,
            float swingProgress,
            ItemStack stack,
            float equippedProgress,
            PoseStack poseStack,
            MultiBufferSource buffer,
            int combinedLight,
            CallbackInfo ci) {
        CompositeSkinManager.INSTANCE.update(player);
    }

    // ── Inject 2: emissive glow draw when bare arm is rendered ───────────────

    @Inject(method = "renderPlayerArm", at = @At("TAIL"))
    @SuppressWarnings("unchecked")
    private void yebisurpg$onRenderPlayerArmTail(
            PoseStack poseStack,
            MultiBufferSource buffer,
            int packedLight,
            float equippedProgress,
            float swingProgress,
            HumanoidArm side,
            CallbackInfo ci) {

        AbstractClientPlayer player = Minecraft.getInstance().player;
        if (player == null) return;

        ResourceLocation emissiveLoc =
            CompositeSkinManager.INSTANCE.getEmissiveLocation(player.getUUID());
        if (emissiveLoc == null) return;

        EntityRenderDispatcher dispatcher = Minecraft.getInstance().getEntityRenderDispatcher();
        var renderer = dispatcher.getRenderer(player);
        if (!(renderer instanceof LivingEntityRenderer<?, ?> living)) return;

        var playerRenderer = (LivingEntityRenderer<AbstractClientPlayer,
            PlayerModel<AbstractClientPlayer>>) living;
        PlayerModel<AbstractClientPlayer> model = playerRenderer.getModel();

        boolean slim = player.getSkin().model() ==
            net.minecraft.client.resources.PlayerSkin.Model.SLIM;

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
    }
}
