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
import net.ye6isu.yebisulib.texture.TextureStack;

/**
 * GPU render layer that draws emissive overlays for players.
 *
 * <p>For every layer in the player's texture stack that
 * has an emissive texture, this layer renders the <b>composited DynamicTexture</b>
 * (the same ResourceLocation as the player's skin, now replaced by CompositeSkinManager)
 * using {@link RenderType#entityTranslucentEmissive}, which ignores the lightmap and
 * makes the emissive regions glow at full brightness.</p>
 *
 * <p>The emissive pixels were already baked into the DynamicTexture by
 * {@link CompositeSkinManager} alongside the normal layers, so this pass just
 * re-renders the same texture with a full-bright render type. Pixels that should
 * NOT glow are transparent in the emissive texture and were composited as-is onto
 * the skin — they contribute colour, not glow. Only opaque emissive pixels glow.</p>
 *
 * <p>Registered in {@link net.ye6isu.yebisuRPG.client.ClientEvents}.</p>
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

        // Render the player model with the emissive-only texture at full brightness.
        // This texture is transparent everywhere except where emissive pixels were baked,
        // so only those pixels glow — the rest of the model is unaffected.
        RenderType renderType = RenderType.entityTranslucentEmissive(emissiveLoc);
        getParentModel().renderToBuffer(pose, buffers.getBuffer(renderType),
            packedLight, OverlayTexture.NO_OVERLAY);
    }
}
