package net.ye6isu.yebisuRPG.datagen;

import net.minecraft.core.HolderLookup;
import net.minecraft.data.DataGenerator;
import net.minecraft.data.PackOutput;
import net.minecraft.data.loot.LootTableProvider;
import net.minecraft.world.level.storage.loot.parameters.LootContextParamSets;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.common.data.BlockTagsProvider;
import net.neoforged.neoforge.common.data.ExistingFileHelper;
import net.neoforged.neoforge.data.event.GatherDataEvent;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.nio.file.Path;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@EventBusSubscriber(modid = yebisuRPG.MODID)

public class DataGenerators {
    @SubscribeEvent
    public static void getherData(GatherDataEvent event) {
        DataGenerator generator = event.getGenerator();
        PackOutput packOutput = generator.getPackOutput();
        ExistingFileHelper existingFileHelper = event.getExistingFileHelper();
        CompletableFuture<HolderLookup.Provider> lookupProvider = event.getLookupProvider();

        generator.addProvider(event.includeServer(), new LootTableProvider(packOutput, Collections.emptySet(),
                List.of(new LootTableProvider.SubProviderEntry(ModBlockLootTableProvider::new, LootContextParamSets.BLOCK)), lookupProvider));
        generator.addProvider(event.includeServer(), new ModRecipeProvider(packOutput, lookupProvider));

        // One-off dump of every vanilla item id for YCS's item pickers — see
        // YCSVanillaItemDumpProvider for why this isn't part of the mod's normal output.
        generator.addProvider(event.includeServer(), new YCSVanillaItemDumpProvider());

        BlockTagsProvider blockTagsProvider = new ModBlockTagProvider(packOutput, lookupProvider, existingFileHelper);
        generator.addProvider(event.includeServer(), blockTagsProvider);
        generator.addProvider(event.includeServer(), new ModItemTagProvider(packOutput, lookupProvider, blockTagsProvider.contentsGetter(), existingFileHelper));

        generator.addProvider(event.includeClient(), new ModItemModelProvider(packOutput, existingFileHelper));
        generator.addProvider(event.includeClient(), new ModBlockStateProvider(packOutput, existingFileHelper));

        // Generate .mcmeta for animated textures
        generator.addProvider(event.includeClient(), new ModAnimationProvider(packOutput)
            .animate("yebisurpg:item/texture2", 20, false));

        // Slice spritesheet PNGs into per-frame textures (used by walkman model overrides).
        // Read the source root from a system property set in build.gradle's data run config
        // so the path is always absolute regardless of JVM working directory.
        String sourceResourcesProp = System.getProperty("yebisurpg.sourceResources");
        if (sourceResourcesProp == null) {
            throw new IllegalStateException(
                "System property 'yebisurpg.sourceResources' is not set. " +
                "Make sure it is defined in the 'data' run config in build.gradle.");
        }
        Path sourceResources = Path.of(sourceResourcesProp);
        generator.addProvider(event.includeClient(),
            new ModSpriteSliceProvider(packOutput, sourceResources, "yebisurpg")
                .slice("textures/item/texture2.png", 16, 16,
                    "textures/item/walkman_frame0.png",
                    "textures/item/walkman_frame1.png"));
    }
}