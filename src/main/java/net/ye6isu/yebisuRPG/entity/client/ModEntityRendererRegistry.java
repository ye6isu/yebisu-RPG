package net.ye6isu.yebisuRPG.entity.client;

import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.EntityType;
import net.neoforged.neoforge.client.event.EntityRenderersEvent;
import net.ye6isu.yebisuRPG.entity.ModEntities;
import net.ye6isu.yebisuRPG.entity.custom.YcsMobEntity;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.ArrayList;
import java.util.List;

/**
 * Registers a {@link GeoEntityRenderer} (backed by a {@link GeoEntityModel} built
 * from the entity's {@code .geo.json} — see {@link GeoEntityModelLoader}) for every
 * YCS-authored mob, analogous to how {@code GeoItemRegistry} registers items' geo
 * renderers via {@code IClientItemExtensions}. Entities use a different vanilla
 * hook — {@link EntityRenderersEvent.RegisterRenderers#registerEntityRenderer} —
 * since there is no per-item-style extension point for mobs.
 *
 * <p>YCS injects one {@code tryRegister(...)} call per entity above the
 * {@code YCS_Entity_Renderer_Collect} marker inside {@link #collectGeoEntities()}.</p>
 */
public final class ModEntityRendererRegistry {

    private ModEntityRendererRegistry() {}

    /** One YCS-authored mob's render data — geo model, texture, animation file, idle/walk animation names. */
    public record EntitySpec(EntityType<? extends YcsMobEntity> type, ResourceLocation geoLoc,
                              ResourceLocation texture, String animationFile, String idleAnim, String walkAnim) {}

    private static List<EntitySpec> SPECS;

    private static List<EntitySpec> collectGeoEntities() {
        List<EntitySpec> specs = new ArrayList<>();

        ModEntityRendererRegistry.tryRegister(specs, ModEntities.TESTERENT.get(), "testerent", "yebisurpg:animations/entity/testerent.animation.json", "idle", "walk");
        // YCS_Entity_Renderer_Collect

        return specs;
    }

    private static List<EntitySpec> specsOnce() {
        if (SPECS == null) SPECS = collectGeoEntities();
        return SPECS;
    }

    public static void tryRegister(List<EntitySpec> specs, EntityType<? extends YcsMobEntity> type,
                                    String id, String animationFile, String idleAnim, String walkAnim) {
        ResourceLocation geoLoc = ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "geo/entity/" + id + ".geo.json");
        ResourceLocation texture = ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "textures/entity/" + id + ".png");
        specs.add(new EntitySpec(type, geoLoc, texture, animationFile, idleAnim, walkAnim));
    }

    public static void onRegisterRenderers(EntityRenderersEvent.RegisterRenderers event) {
        for (EntitySpec spec : specsOnce()) {
            @SuppressWarnings("unchecked")
            EntityType<YcsMobEntity> type = (EntityType<YcsMobEntity>) spec.type();
            event.registerEntityRenderer(type, context -> {
                GeoEntityModelLoader.BakedGeoModel bakedModel = GeoEntityModelLoader.load(context.getResourceManager(), spec.geoLoc());
                GeoEntityModel<YcsMobEntity> model = new GeoEntityModel<>(bakedModel, spec.animationFile(), spec.idleAnim(), spec.walkAnim());
                return new GeoEntityRenderer<>(context, model, spec.texture());
            });
        }
    }
}
