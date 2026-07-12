package net.ye6isu.yebisuRPG.entity.client;

import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.entity.custom.YcsMobEntity;

/**
 * Generic renderer for every YCS-authored mob — texture/model come entirely
 * from the entity's own {@link ModEntityRendererRegistry.EntitySpec}, so one
 * renderer class covers every entity YCS creates (mirrors {@link YcsMobEntity}
 * being the single generic entity class).
 */
public class GeoEntityRenderer<T extends YcsMobEntity> extends MobRenderer<T, GeoEntityModel<T>> {

    private final ResourceLocation texture;

    public GeoEntityRenderer(EntityRendererProvider.Context context, GeoEntityModel<T> model, ResourceLocation texture) {
        super(context, model, 0.5f);
        this.texture = texture;
    }

    @Override
    public ResourceLocation getTextureLocation(T entity) {
        return texture;
    }
}
