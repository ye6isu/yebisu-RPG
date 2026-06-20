package net.ye6isu.yebisuRPG.datagen;

import net.minecraft.core.Holder;
import net.minecraft.core.HolderLookup;
import net.minecraft.data.loot.BlockLootSubProvider;
import net.minecraft.resources.ResourceLocation;
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

        //Same Block drop
        dropSelf(ModBlocks.CRATE_BLOCK.get());
        dropSelf(ModBlocks.YE6ISU_BLOCK.get());

        //Non-Block Block drop
        dropSelf(ModBlocks.CRATE_STAIRS.get());
        dropSelf(ModBlocks.CRATE_PRESSURE_PLATE.get());
        dropSelf(ModBlocks.CRATE_BUTTON.get());
        dropSelf(ModBlocks.CRATE_FENCE.get());
        dropSelf(ModBlocks.CRATE_FENCE_GATE.get());
        dropSelf(ModBlocks.CRATE_WALL.get());
        dropSelf(ModBlocks.CRATE_TRAPDOOR.get());

        //Special Non-Block Block drop
        add(ModBlocks.CRATE_SLAB.get(), block -> createSlabItemTable(ModBlocks.CRATE_SLAB.get()));
        add(ModBlocks.CRATE_DOOR.get(), block -> createDoorTable(ModBlocks.CRATE_DOOR.get()));
        
        //YCS_Mod_Block_Loot_START

;

        //YCS_Mod_Block_Loot_END
    }

    @Override
    protected Iterable<Block> getKnownBlocks() {
        return ModBlocks.BLOCKS.getEntries().stream().map(Holder::value)::iterator;
    }
}
