package net.ye6isu.yebisuRPG.client;

import net.minecraft.client.renderer.ShaderInstance;
import net.minecraft.client.renderer.entity.LivingEntityRenderer;
import net.minecraft.client.resources.PlayerSkin;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.EntityRenderersEvent;
import net.neoforged.neoforge.client.event.RegisterShadersEvent;
import net.ye6isu.yebisuRPG.client.renderer.EmissiveSkinLayer;
import net.ye6isu.yebisuRPG.client.renderer.FullbrightRenderType;
import net.ye6isu.yebisuRPG.yebisuRPG;

import com.mojang.blaze3d.vertex.DefaultVertexFormat;

@EventBusSubscriber(modid = yebisuRPG.MODID, value = {Dist.CLIENT})
public final class ClientEvents {

    private ClientEvents() {}

    @SuppressWarnings({"unchecked", "rawtypes"})
    @SubscribeEvent
    public static void onAddRenderLayers(EntityRenderersEvent.AddLayers event) {
        for (PlayerSkin.Model model : PlayerSkin.Model.values()) {
            Object skin = event.getSkin(model);
            if (skin instanceof LivingEntityRenderer living) {
                living.addLayer(new EmissiveSkinLayer(living));
            }
        }
    }

    @SubscribeEvent
    public static void onRegisterShaders(RegisterShadersEvent event) throws java.io.IOException {
        event.registerShader(
            new ShaderInstance(
                event.getResourceProvider(),
                ResourceLocation.fromNamespaceAndPath("yebisurpg", "yebisurpg_fullbright"),
                DefaultVertexFormat.NEW_ENTITY
            ),
            shader -> FullbrightRenderType.shader = shader
        );
    }
}
