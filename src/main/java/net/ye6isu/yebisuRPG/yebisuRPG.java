package net.ye6isu.yebisuRPG;

import net.ye6isu.yebisuRPG.attribute.AttributeRangeFix;
import net.ye6isu.yebisuRPG.attribute.ModAttributes;
import net.ye6isu.yebisuRPG.component.ModDataComponents;
import net.ye6isu.yebisuRPG.entity.ModEntities;
import net.ye6isu.yebisuRPG.entity.ModEntityEvents;
import net.ye6isu.yebisuRPG.entityvar.ModAttachments;
import net.ye6isu.yebisuRPG.hud.ModHud;
import net.ye6isu.yebisuRPG.item.ModCreativeModeTabs;
import net.ye6isu.yebisuRPG.item.ModCreativeTabContents;
import net.ye6isu.yebisuRPG.item.ModItems;
import net.ye6isu.yebisuRPG.item.TabIconCycler;
import org.slf4j.Logger;
import com.mojang.logging.LogUtils;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.ModContainer;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.event.lifecycle.FMLCommonSetupEvent;
import net.neoforged.fml.loading.FMLEnvironment;

@Mod(yebisuRPG.MODID)
public class yebisuRPG
{
    public static final String MODID = "yebisurpg";
    public static final Logger LOGGER = LogUtils.getLogger();

    public yebisuRPG(IEventBus modEventBus, ModContainer modContainer) {
        ModItems.register(modEventBus);
        ModDataComponents.register(modEventBus);
        ModAttachments.register(modEventBus);
        ModAttributes.register(modEventBus);
        ModEntities.register(modEventBus);
        ModEntityEvents.register(modEventBus);
        ModCreativeModeTabs.register(modEventBus);
        modEventBus.addListener(ModCreativeTabContents::buildTabContents);
        modEventBus.addListener(this::commonSetup);

        if (FMLEnvironment.dist == Dist.CLIENT) {
            modEventBus.addListener(net.ye6isu.yebisuRPG.client.renderer.GeoItemRegistry::onRegisterClientExtensions);
            modEventBus.addListener(net.ye6isu.yebisuRPG.client.renderer.GeoItemRegistry::onRegisterReloadListeners);
            modEventBus.addListener(net.ye6isu.yebisuRPG.client.renderer.GeoItemRegistry::onRegisterAdditionalModels);
            modEventBus.addListener(net.ye6isu.yebisuRPG.client.renderer.EntityTextureRenderHooks::onRegisterShaders);
            modEventBus.addListener(net.ye6isu.yebisuRPG.client.renderer.EntityTextureRenderHooks::onAddLayers);
            modEventBus.addListener(net.ye6isu.yebisuRPG.entity.client.ModEntityRendererRegistry::onRegisterRenderers);
            net.neoforged.neoforge.common.NeoForge.EVENT_BUS.addListener((net.neoforged.neoforge.client.event.ClientTickEvent.Post e) -> TabIconCycler.onClientTick());
            net.neoforged.neoforge.common.NeoForge.EVENT_BUS.addListener((net.neoforged.neoforge.client.event.ClientTickEvent.Post e) -> net.ye6isu.yebisuRPG.animation.client.ClientAnimationEngine.INSTANCE.tick());
            net.neoforged.neoforge.common.NeoForge.EVENT_BUS.addListener((net.neoforged.neoforge.client.event.ClientTickEvent.Pre e) -> net.ye6isu.yebisuRPG.keybind.client.ClientKeybindTracker.INSTANCE.preTick());
            net.neoforged.neoforge.common.NeoForge.EVENT_BUS.addListener((net.neoforged.neoforge.client.event.ClientTickEvent.Post e) -> net.ye6isu.yebisuRPG.keybind.client.ClientKeybindTracker.INSTANCE.tick());
            modEventBus.addListener(ModHud::onRegisterGuiLayers);
            modEventBus.addListener(ModHud::onRegisterReloadListeners);
            ModHud.registerLayouts();
        }
    }

    private void commonSetup(FMLCommonSetupEvent event) {
        AttributeRangeFix.apply();
    }
}
