package net.ye6isu.yebisuRPG.event;

import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.EntityRenderersEvent;
import net.ye6isu.yebisuRPG.client.renderer.firstperson.FirstPersonHandModel;
import net.ye6isu.yebisuRPG.client.renderer.firstperson.FirstPersonHandRenderer;
import net.ye6isu.yebisuRPG.entity.client.JoeModel;
import net.ye6isu.yebisuRPG.entity.client.JoeRenderer;
import net.ye6isu.yebisuRPG.yebisuRPG;

import static net.ye6isu.yebisuRPG.entity.ModEntities.JOE;

@EventBusSubscriber(modid = yebisuRPG.MODID, value = Dist.CLIENT)
public class ModClientEvents {

    @SubscribeEvent
    public static void registerLayers(EntityRenderersEvent.RegisterLayerDefinitions event) {
        event.registerLayerDefinition(JoeModel.LAYER_LOCATION, JoeModel::createBodyLayer);
        event.registerLayerDefinition(FirstPersonHandRenderer.LAYER, FirstPersonHandModel::createLayer);
    }

    @SubscribeEvent
    public static void registerRenderers(EntityRenderersEvent.RegisterRenderers event) {
        event.registerEntityRenderer(JOE.get(), (EntityRendererProvider.Context context) -> new JoeRenderer(context));
    }

}
