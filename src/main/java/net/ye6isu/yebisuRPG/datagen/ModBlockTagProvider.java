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
                .add(ModBlocks.YE6ISU_BLOCK.get())
                .add(ModBlocks.YE6ISU_ORE.get());

        tag(BlockTags.NEEDS_IRON_TOOL)
                .add(ModBlocks.YE6ISU_ORE.get());

        tag(BlockTags.FENCES).add(ModBlocks.CRATE_FENCE.get());
        tag(BlockTags.FENCE_GATES).add(ModBlocks.CRATE_FENCE_GATE.get());
        tag(BlockTags.WALLS).add(ModBlocks.CRATE_WALL.get());
        tag(BlockTags.SLABS).add(ModBlocks.CRATE_SLAB.get());
        tag(BlockTags.STAIRS).add(ModBlocks.CRATE_STAIRS.get());
        tag(BlockTags.BUTTONS).add(ModBlocks.CRATE_BUTTON.get());
        tag(BlockTags.PRESSURE_PLATES).add(ModBlocks.CRATE_PRESSURE_PLATE.get());





        //YCS_Mod_Block_Tags_START

        //YCS_Mod_Block_Tags_END
    }
}
