package net.ye6isu.yebisuRPG.event;

import net.minecraft.client.Minecraft;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.ClientTickEvent;
import net.neoforged.neoforge.client.event.EntityRenderersEvent;
import net.ye6isu.yebisuRPG.client.renderer.firstperson.FirstPersonHandModel;
import net.ye6isu.yebisuRPG.client.renderer.firstperson.FirstPersonHandRenderer;

import net.ye6isu.yebisuRPG.yebisuRPG;

@EventBusSubscriber(modid = yebisuRPG.MODID, value = Dist.CLIENT)
public class ModClientEvents {

    @SubscribeEvent
    public static void registerLayers(EntityRenderersEvent.RegisterLayerDefinitions event) {
        event.registerLayerDefinition(FirstPersonHandRenderer.LAYER, FirstPersonHandModel::createLayer);
    }

    @SubscribeEvent
    public static void registerRenderers(EntityRenderersEvent.RegisterRenderers event) {
    }

    @SubscribeEvent
    public static void onClientTick(ClientTickEvent.Post event) {
        net.ye6isu.yebisuRPG.item.TabIconCycler.init();
        net.ye6isu.yebisuRPG.item.TabIconCycler.onClientTick();
        Minecraft mc = Minecraft.getInstance();
    }
}
