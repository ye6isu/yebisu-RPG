package net.ye6isu.yebisuRPG.client.renderer;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.model.EntityModel;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.RenderLayerParent;
import net.minecraft.client.renderer.entity.layers.RenderLayer;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.LivingEntity;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

/**
 * GPU render layer — draws the emissive-only overlay texture over the entity model using
 * {@link FullbrightRenderType}, the same technique vanilla uses for spider/enderman glowing
 * eyes ({@code RenderType.eyes}). Generalized to any {@link LivingEntity} (not just players,
 * unlike old_mod's player-skin-specific {@code EmissiveSkinLayer}), matching how
 * {@link EntityTextureCompositor}/{@code EntityTextureRenderHooks} already work for any entity.
 *
 * <p>Registered as a REAL {@link RenderLayer} (see {@code EntityTextureRenderHooks#onAddLayers})
 * rather than driven from a post-render event — this must run inside the entity renderer's own
 * layer loop so it inherits the exact same already-posed {@code PoseStack} every other layer
 * (armor, elytra, etc.) uses. A {@code RenderLivingEvent.Post} handler fires after the entity's
 * pose has already been popped, which is why an earlier attempt at this rendered in the wrong
 * position — a real render layer is the only way to get correct positioning.</p>
 */
@OnlyIn(Dist.CLIENT)
public final class EmissiveEntityLayer<T extends LivingEntity, M extends EntityModel<T>> extends RenderLayer<T, M> {

    public EmissiveEntityLayer(RenderLayerParent<T, M> parent) {
        super(parent);
    }

    @Override
    public void render(PoseStack pose, MultiBufferSource buffers, int packedLight,
                       T entity, float limbSwing, float limbSwingAmount,
                       float partialTick, float ageInTicks, float netHeadYaw, float headPitch) {
        if (FullbrightRenderType.shader == null) return;
        ResourceLocation emissiveLoc = EntityTextureCompositor.INSTANCE.getEmissiveLocation(entity.getId());
        if (emissiveLoc == null) return;

        getParentModel().renderToBuffer(
            pose,
            buffers.getBuffer(FullbrightRenderType.get(emissiveLoc)),
            packedLight,
            OverlayTexture.NO_OVERLAY);
    }
}
