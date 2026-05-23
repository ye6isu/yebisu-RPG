package net.ye6isu.yebisuRPG.datagen;

import java.util.Objects;
import java.util.Set;
import java.util.stream.Stream;
import net.minecraft.core.HolderLookup;
import net.minecraft.data.loot.BlockLootSubProvider;
import net.minecraft.world.flag.FeatureFlags;
import net.minecraft.world.level.block.Block;
import net.ye6isu.yebisuRPG.block.ModBlocks;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/datagen/ModBlockLootTableProvider.class */
public class ModBlockLootTableProvider extends BlockLootSubProvider {
    protected ModBlockLootTableProvider(HolderLookup.Provider registries) {
        super(Set.of(), FeatureFlags.REGISTRY.allFlags(), registries);
    }

    protected void generate() {
        dropSelf((Block) ModBlocks.CRATE_BLOCK.get());
        dropSelf((Block) ModBlocks.YE6ISU_BLOCK.get());
    }

    protected Iterable<Block> getKnownBlocks() {
        Stream map = ModBlocks.BLOCKS.getEntries().stream().map((v0) -> {
            return v0.value();
        });
        Objects.requireNonNull(map);
        return map::iterator;
    }
}
