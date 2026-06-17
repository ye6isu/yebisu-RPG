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
import net.neoforged.neoforge.event.entity.EntityAttributeModificationEvent;
import net.neoforged.neoforge.event.server.ServerStartingEvent;
import net.ye6isu.yebisuRPG.attribute.AttributeRangeFix;
import net.ye6isu.yebisuRPG.attribute.ModAttributes;
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
        ModAttributes.register(modEventBus);
        modEventBus.addListener(this::onAttributeModification);

        YCSTabRegistry.register(modEventBus);

        net.ye6isu.yebisuRPG.entity.ModEntities.register(modEventBus);

        //modEventBus.addListener(this::addCreative); To be decided if needed

        // Client-only setup (keybinds, client-side registrations, etc.)
        if (FMLEnvironment.dist == Dist.CLIENT) {
            modEventBus.addListener(this::clientSetup);
        }

        modContainer.registerConfig(ModConfig.Type.COMMON, Config.SPEC);
    }

    private void onAttributeModification(EntityAttributeModificationEvent event) {
        // Add all yebisurpg scale attributes to every LivingEntity type so they are
        // always present and can be read/modified via attribute modifiers at runtime.
        event.getTypes().forEach(type -> {
            event.add(type, ModAttributes.SCALE_BASE);
            event.add(type, ModAttributes.SCALE_WIDTH);
            event.add(type, ModAttributes.SCALE_HEIGHT);
            event.add(type, ModAttributes.SCALE_EYE_HEIGHT);
            event.add(type, ModAttributes.SCALE_HITBOX_WIDTH);
            event.add(type, ModAttributes.SCALE_HITBOX_HEIGHT);
            event.add(type, ModAttributes.SCALE_MODEL_WIDTH);
            event.add(type, ModAttributes.SCALE_MODEL_HEIGHT);
            event.add(type, ModAttributes.SCALE_THIRD_PERSON);
            event.add(type, ModAttributes.SCALE_MOTION);
            event.add(type, ModAttributes.SCALE_FALLING);
            event.add(type, ModAttributes.SCALE_STEP_HEIGHT);
            event.add(type, ModAttributes.SCALE_VIEW_BOBBING);
            event.add(type, ModAttributes.SCALE_VISIBILITY);
            event.add(type, ModAttributes.SCALE_JUMP_HEIGHT);
            event.add(type, ModAttributes.SCALE_FLIGHT);
            event.add(type, ModAttributes.SCALE_REACH);
            event.add(type, ModAttributes.SCALE_BLOCK_REACH);
            event.add(type, ModAttributes.SCALE_ENTITY_REACH);
            event.add(type, ModAttributes.SCALE_MINING_SPEED);
            event.add(type, ModAttributes.SCALE_ATTACK_SPEED);
            event.add(type, ModAttributes.SCALE_KNOCKBACK);
            event.add(type, ModAttributes.SCALE_ATTACK);
            event.add(type, ModAttributes.SCALE_DEFENSE);
            event.add(type, ModAttributes.SCALE_HEALTH);
            event.add(type, ModAttributes.SCALE_DROPS);
            event.add(type, ModAttributes.SCALE_HELD_ITEM);
            event.add(type, ModAttributes.SCALE_PROJECTILES);
            event.add(type, ModAttributes.SCALE_EXPLOSIONS);
        });
    }

    private void commonSetup(FMLCommonSetupEvent event) {
        // Runs on both client and server during mod loading.
        // Use for things that need to happen on both sides (capability registration, etc.)
        AttributeRangeFix.apply();
    }

    private void clientSetup(FMLClientSetupEvent event) {
        // Runs on the client only during mod loading.
        // ModKeybinds self-registers via @EventBusSubscriber(Dist.CLIENT) — no manual call needed.
        // Add other client-only setup here (screen registration, renderer registration, etc.)
    }

    /* To be decided if needed
    priv the te void addCreative(BuildCreativeModeTabContentsEvent event) {
        // Add items to creative tabs here if not handled in ModCreativeModeTabs.
    }
    */

    @SubscribeEvent
    public void onServerStarting(ServerStartingEvent event) {
        // Runs when the server starts. Safe for both dedicated and integrated servers.
    }
}

