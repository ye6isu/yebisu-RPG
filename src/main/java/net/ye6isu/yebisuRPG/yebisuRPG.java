package net.ye6isu.yebisuRPG;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.ModContainer;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.config.ModConfig;
import net.neoforged.fml.event.lifecycle.FMLClientSetupEvent;
import net.neoforged.fml.event.lifecycle.FMLCommonSetupEvent;
import net.neoforged.fml.loading.FMLEnvironment;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.server.ServerStartingEvent;
import net.ye6isu.yebisuRPG.block.ModBlocks;
import net.ye6isu.yebisuRPG.component.ModDataComponents;
import net.ye6isu.yebisuRPG.data.EntityVarCapability;
import net.ye6isu.yebisuRPG.item.ModCreativeModeTabs;
import net.ye6isu.yebisuRPG.item.ModItems;
import net.ye6isu.yebisuRPG.item.YCSTabRegistry;
import net.ye6isu.yebisuRPG.sound.ModSounds;
import org.slf4j.Logger;
import com.mojang.logging.LogUtils;

@Mod(yebisuRPG.MODID)
public class yebisuRPG {

    public static final String MODID = "yebisurpg";
    public static final Logger LOGGER = LogUtils.getLogger();

    public yebisuRPG(IEventBus modEventBus, ModContainer modContainer) {

        modEventBus.addListener(this::commonSetup);
        NeoForge.EVENT_BUS.register(this);

        ModCreativeModeTabs.register(modEventBus);

        ModItems.register(modEventBus); //Item Register

        ModBlocks.register(modEventBus);

        ModDataComponents.register(modEventBus);

        ModSounds.register(modEventBus);

        EntityVarCapability.register(modEventBus);

        YCSTabRegistry.register(modEventBus);

        //modEventBus.addListener(this::addCreative); To be decided if needed

        // Client-only setup (keybinds, client-side registrations, etc.)
        if (FMLEnvironment.dist == Dist.CLIENT) {
            modEventBus.addListener(this::clientSetup);
        }

        modContainer.registerConfig(ModConfig.Type.COMMON, Config.SPEC);
    }

    private void commonSetup(FMLCommonSetupEvent event) {
        // Runs on both client and server during mod loading.
        // Use for things that need to happen on both sides (capability registration, etc.)
    }

    private void clientSetup(FMLClientSetupEvent event) {
        // Runs on the client only during mod loading.
        // ModKeybinds self-registers via @EventBusSubscriber(Dist.CLIENT) — no manual call needed.
        // Add other client-only setup here (screen registration, renderer registration, etc.)
    }

    /* To be decided if needed
    private void addCreative(BuildCreativeModeTabContentsEvent event) {
        // Add items to creative tabs here if not handled in ModCreativeModeTabs.
    }
    */

    @SubscribeEvent
    public void onServerStarting(ServerStartingEvent event) {
        // Runs when the server starts. Safe for both dedicated and integrated servers.
    }
}

