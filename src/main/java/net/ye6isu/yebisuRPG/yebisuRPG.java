package net.ye6isu.yebisuRPG;

import org.slf4j.Logger;
import com.mojang.logging.LogUtils;

import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.ModContainer;
import net.neoforged.fml.common.Mod;

@Mod(yebisuRPG.MOD_ID)
public class yebisuRPG
{
    public static final String MOD_ID = "yebisurpg";
    private static final Logger LOGGER = LogUtils.getLogger();

    public yebisuRPG(IEventBus modEventBus, ModContainer modContainer) {
    }
}