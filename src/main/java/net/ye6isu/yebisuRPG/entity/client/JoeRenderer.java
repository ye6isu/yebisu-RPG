package net.ye6isu.yebisuRPG.entity.client;

import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.entity.custom.JoeEntity;
import net.ye6isu.yebisuRPG.yebisuRPG;

public class JoeRenderer extends MobRenderer<JoeEntity, JoeModel<JoeEntity>> {

    public JoeRenderer(EntityRendererProvider.Context context, JoeModel<JoeEntity> model, float shadowRadius) {
        super(context, new JoeModel<>(context.bakeLayer(JoeModel.LAYER_LOCATION)), 0.25f);
    }

    @Override
    public ResourceLocation getTextureLocation(JoeEntity entity) {
        return ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "textures/entity/joe_texture.png");
    }

    @Override
    public void render(JoeEntity entity, float entityYaw, float partialTicks, PoseStack poseStack, MultiBufferSource buffer, int packedLight) {
        if(entity.isBaby()) {
            poseStack.scale(0.45f, 0.45f, 0.45f);
        } else {
            poseStack.scale(1f, 1f, 1f);
        }

        super.render(entity, entityYaw, partialTicks, poseStack, buffer, packedLight);
    }

}
