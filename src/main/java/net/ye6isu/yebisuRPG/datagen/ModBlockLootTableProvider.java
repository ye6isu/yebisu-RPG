package net.ye6isu.yebisuRPG.datagen;

import net.minecraft.core.Holder;
import net.minecraft.core.HolderLookup;
import net.minecraft.data.loot.BlockLootSubProvider;
import net.minecraft.world.flag.FeatureFlags;
import net.minecraft.world.level.block.Block;
import net.ye6isu.yebisuRPG.block.ModBlocks;
import net.ye6isu.yebisuRPG.item.ModItems;

import java.util.Set;

public class ModBlockLootTableProvider extends BlockLootSubProvider {
    protected ModBlockLootTableProvider(HolderLookup.Provider registries) {
        super(Set.of(), FeatureFlags.REGISTRY.allFlags(), registries);
    }

    @Override
    protected void generate() {
        dropSelf(ModBlocks.CRATE_BLOCK.get());
        dropSelf(ModBlocks.YE6ISU_BLOCK.get());

        add(ModBlocks.YE6ISU_ORE.get(),
                block -> createOreDrop(ModBlocks.YE6ISU_ORE.get(), ModItems.YE6ISU.get()));

        dropSelf(ModBlocks.CRATE_STAIRS.get());
        dropSelf(ModBlocks.CRATE_PRESSURE_PLATE.get());
        dropSelf(ModBlocks.CRATE_BUTTON.get());
        dropSelf(ModBlocks.CRATE_FENCE.get());
        dropSelf(ModBlocks.CRATE_FENCE_GATE.get());
        dropSelf(ModBlocks.CRATE_WALL.get());
        dropSelf(ModBlocks.CRATE_TRAPDOOR.get());

        add(ModBlocks.CRATE_SLAB.get(), block -> createSlabItemTable(ModBlocks.CRATE_SLAB.get()));
        add(ModBlocks.CRATE_DOOR.get(), block -> createDoorTable(ModBlocks.CRATE_DOOR.get()));



        dropSelf(ModBlocks.CAT_BLOCK.get());

        // YCS_LOOT_INSERT
    }

    @Override
    protected Iterable<Block> getKnownBlocks() {
        return ModBlocks.BLOCKS.getEntries().stream().map(Holder::value)::iterator;
    }
}
