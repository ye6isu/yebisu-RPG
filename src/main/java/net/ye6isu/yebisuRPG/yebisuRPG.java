package net.ye6isu.yebisuRPG;

import net.ye6isu.yebisuRPG.item.ModItems;
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

        if (FMLEnvironment.dist == Dist.CLIENT) {
            modEventBus.addListener(net.ye6isu.yebisuRPG.client.renderer.GeoItemRegistry::onRegisterClientExtensions);
            modEventBus.addListener(net.ye6isu.yebisuRPG.client.renderer.GeoItemRegistry::onRegisterReloadListeners);
        }
    }
}