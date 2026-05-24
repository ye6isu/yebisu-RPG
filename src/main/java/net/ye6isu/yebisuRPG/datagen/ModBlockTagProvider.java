package net.ye6isu.yebisuRPG.datagen;

import net.minecraft.core.HolderLookup;
import net.minecraft.data.PackOutput;
import net.minecraft.tags.BlockTags;
import net.neoforged.neoforge.common.data.BlockTagsProvider;
import net.neoforged.neoforge.common.data.ExistingFileHelper;
import net.ye6isu.yebisuRPG.block.ModBlocks;
import net.ye6isu.yebisuRPG.util.ModTags;
import net.ye6isu.yebisuRPG.yebisuRPG;
import org.jetbrains.annotations.Nullable;

import java.util.concurrent.CompletableFuture;

public class ModBlockTagProvider extends BlockTagsProvider {
    public ModBlockTagProvider(PackOutput output, CompletableFuture<HolderLookup.Provider> lookupProvider, @Nullable ExistingFileHelper existingFileHelper) {
        super(output, lookupProvider, yebisuRPG.MODID, existingFileHelper);
    }

    @Override
    protected void addTags(HolderLookup.Provider provider) {
        tag(BlockTags.MINEABLE_WITH_PICKAXE)
                .add(ModBlocks.YE6ISU_BLOCK.get());

        tag(BlockTags.NEEDS_IRON_TOOL)
                .add(ModBlocks.YE6ISU_BLOCK.get());

        tag(BlockTags.FENCES).add(ModBlocks.CRATE_FENCE.get());
        tag(BlockTags.FENCE_GATES).add(ModBlocks.CRATE_FENCE_GATE.get());
        tag(BlockTags.WALLS).add(ModBlocks.CRATE_WALL.get());

        tag(ModTags.Blocks.NEEDS_YE6ISU_TOOL)
                .addTag(BlockTags.NEEDS_IRON_TOOL);

        tag(ModTags.Blocks.INCORRECT_FOR_YE6ISU_TOOL)
                .addTag(BlockTags.INCORRECT_FOR_IRON_TOOL)
                .remove(ModTags.Blocks.NEEDS_YE6ISU_TOOL);
    }
}
