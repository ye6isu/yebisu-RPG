package net.ye6isu.yebisuRPG.client.renderer;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import net.minecraft.client.model.PlayerModel;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.entity.RenderLayerParent;
import net.minecraft.client.renderer.entity.layers.RenderLayer;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.texture.MaskMode;
import net.ye6isu.yebisuRPG.texture.TextureComponent;
import net.ye6isu.yebisuRPG.texture.TextureManager;
import net.ye6isu.yebisuRPG.texture.TextureStack;

/**
 * A render layer that composites {@link TextureStack} entries from {@link TextureManager}
 * on top of a player's model.
 *
 * <h2>Compositing modes</h2>
 * <ul>
 *   <li>{@link MaskMode#NORMAL} — render the texture on top using
 *       {@code entityTranslucentCull}, respecting the model's UV.</li>
 *   <li>{@link MaskMode#CUTOUT_BELOW} — render using {@code entityCutout} so
 *       opaque pixels punch through the layer beneath rather than blending.</li>
 *   <li>{@link MaskMode#ALPHA_FROM_BASE} — render using {@code entityTranslucent}
 *       so the layer conforms to the base model's transparency.</li>
 * </ul>
 *
 * <h2>Registration</h2>
 * <p>Registered in {@link net.ye6isu.yebisuRPG.client.ClientEvents} via
 * {@code RenderPlayerEvent} or {@code AddRenderLayersEvent}.</p>
 */
@OnlyIn(Dist.CLIENT)
public class PlayerTextureLayer extends RenderLayer<AbstractClientPlayer, PlayerModel<AbstractClientPlayer>> {

    public PlayerTextureLayer(RenderLayerParent<AbstractClientPlayer, PlayerModel<AbstractClientPlayer>> parent) {
        super(parent);
    }

    @Override
    public void render(PoseStack pose, MultiBufferSource buffers, int packedLight,
                       AbstractClientPlayer player, float limbSwing, float limbSwingAmount,
                       float partialTick, float ageInTicks, float netHeadYaw, float headPitch) {

        TextureStack stack = TextureManager.INSTANCE.getStack(player.getId());
        if (stack == null || stack.isEmpty()) return;

        for (TextureComponent component : stack.getLayers()) {
            RenderType renderType = toRenderType(component);

            VertexConsumer vc = buffers.getBuffer(renderType);

            // Render using the parent model's geometry — correct player shape, all limbs.
            // getParentModel() returns the PlayerModel already posed for the current animation.
            getParentModel().renderToBuffer(pose, vc, packedLight, OverlayTexture.NO_OVERLAY);
        }
    }

    private static RenderType toRenderType(TextureComponent component) {
        return switch (component.getMaskMode()) {
            case CUTOUT_BELOW   -> RenderType.entityCutout(component.getTexture());
            case ALPHA_FROM_BASE -> RenderType.entityTranslucent(component.getTexture());
            default              -> RenderType.entityTranslucentCull(component.getTexture());
        };
    }
}
