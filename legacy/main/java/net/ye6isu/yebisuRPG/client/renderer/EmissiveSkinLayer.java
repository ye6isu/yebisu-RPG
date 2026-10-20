package net.ye6isu.yebisuRPG.client.renderer;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.model.PlayerModel;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.entity.RenderLayerParent;
import net.minecraft.client.renderer.entity.layers.RenderLayer;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

/**
 * GPU render layer — draws the emissive-only DynamicTexture over the player model
 * using {@link RenderType#eyes} so emissive pixels glow at full brightness
 * (same technique as spider/enderman eyes).
 */
@OnlyIn(Dist.CLIENT)
public final class EmissiveSkinLayer
        extends RenderLayer<AbstractClientPlayer, PlayerModel<AbstractClientPlayer>> {

    public EmissiveSkinLayer(
            RenderLayerParent<AbstractClientPlayer, PlayerModel<AbstractClientPlayer>> parent) {
        super(parent);
    }

    @Override
    public void render(PoseStack pose, MultiBufferSource buffers,
                       int packedLight, AbstractClientPlayer player,
                       float limbSwing, float limbSwingAmount,
                       float partialTick, float ageInTicks,
                       float netHeadYaw, float headPitch) {

        ResourceLocation emissiveLoc =
            CompositeSkinManager.INSTANCE.getEmissiveLocation(player.getUUID());
        if (emissiveLoc == null) return;

        // RenderType.eyes renders at full brightness regardless of light level —
        // the same technique vanilla uses for spider/enderman/phantom glowing eyes.
        getParentModel().renderToBuffer(
            pose,
            buffers.getBuffer(RenderType.entityTranslucentEmissive(emissiveLoc)),
            packedLight,
            OverlayTexture.NO_OVERLAY);
    }
}
