package net.ye6isu.yebisuRPG.event;

import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.tags.TagKey;
import net.minecraft.world.item.Item;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.ClientTickEvent;
import net.neoforged.neoforge.client.event.EntityRenderersEvent;
import net.neoforged.neoforge.client.event.MovementInputUpdateEvent;
import net.ye6isu.yebisuRPG.client.ModKeybinds;
import net.ye6isu.yebisuRPG.client.debug.HandDebugScreen;
import net.ye6isu.yebisuRPG.client.renderer.firstperson.FirstPersonHandModel;
import net.ye6isu.yebisuRPG.client.renderer.firstperson.FirstPersonHandRenderer;
import net.ye6isu.yebisuRPG.entity.client.JoeModel;
import net.ye6isu.yebisuRPG.entity.client.JoeRenderer;
import net.ye6isu.yebisuRPG.yebisuRPG;

import static net.ye6isu.yebisuRPG.entity.ModEntities.JOE;

@EventBusSubscriber(modid = yebisuRPG.MODID, value = Dist.CLIENT)
public class ModClientEvents {

    public static final TagKey<Item> NO_SLOWDOWN_TAG = TagKey.create(Registries.ITEM, ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "no_use_slowdown"));

    @SubscribeEvent
    public static void registerLayers(EntityRenderersEvent.RegisterLayerDefinitions event) {
        event.registerLayerDefinition(JoeModel.LAYER_LOCATION, JoeModel::createBodyLayer);
        event.registerLayerDefinition(FirstPersonHandRenderer.LAYER, FirstPersonHandModel::createLayer);
    }

    @SubscribeEvent
    public static void registerRenderers(EntityRenderersEvent.RegisterRenderers event) {
        event.registerEntityRenderer(JOE.get(), (EntityRendererProvider.Context context) -> new JoeRenderer(context));
    }

    @SubscribeEvent
    public static void onClientTick(ClientTickEvent.Post event) {
        net.ye6isu.yebisuRPG.item.TabIconCycler.init();
        net.ye6isu.yebisuRPG.item.TabIconCycler.onClientTick();
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || mc.screen != null) return;
        while (ModKeybinds.OPEN_HAND_DEBUG.consumeClick()) {
            mc.setScreen(new HandDebugScreen());
        }
    }

    @SubscribeEvent
    public static void onMovementInputUpdate(MovementInputUpdateEvent event) {
        if (event.getEntity().isUsingItem()) {
            if (event.getEntity().getUseItem().is(NO_SLOWDOWN_TAG)) {
                event.getInput().forwardImpulse *= 5.0f;
                event.getInput().leftImpulse *= 5.0f;
            }
        }
    }
}
