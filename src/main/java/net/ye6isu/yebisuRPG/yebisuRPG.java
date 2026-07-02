package net.ye6isu.yebisuRPG;

import net.ye6isu.yebisuRPG.component.ModDataComponents;
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
import net.neoforged.fml.loading.FMLEnvironment;

@Mod(yebisuRPG.MODID)
public class yebisuRPG
{
    public static final String MODID = "yebisurpg";
    public static final Logger LOGGER = LogUtils.getLogger();

    public yebisuRPG(IEventBus modEventBus, ModContainer modContainer) {
        ModItems.register(modEventBus);
        ModDataComponents.register(modEventBus);
        ModCreativeModeTabs.register(modEventBus);
        modEventBus.addListener(ModCreativeTabContents::buildTabContents);

        if (FMLEnvironment.dist == Dist.CLIENT) {
            modEventBus.addListener(net.ye6isu.yebisuRPG.client.renderer.GeoItemRegistry::onRegisterClientExtensions);
            modEventBus.addListener(net.ye6isu.yebisuRPG.client.renderer.GeoItemRegistry::onRegisterReloadListeners);
            net.neoforged.neoforge.common.NeoForge.EVENT_BUS.addListener((net.neoforged.neoforge.client.event.ClientTickEvent.Post e) -> TabIconCycler.onClientTick());
        }
    }
}