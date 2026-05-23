package net.ye6isu.yebisuRPG.datagen;

import java.util.concurrent.CompletableFuture;
import net.minecraft.core.HolderLookup;
import net.minecraft.data.PackOutput;
import net.minecraft.tags.BlockTags;
import net.minecraft.world.level.block.Block;
import net.neoforged.neoforge.common.data.BlockTagsProvider;
import net.neoforged.neoforge.common.data.ExistingFileHelper;
import net.ye6isu.yebisuRPG.block.ModBlocks;
import net.ye6isu.yebisuRPG.yebisuRPG;
import org.jetbrains.annotations.Nullable;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/datagen/ModBlockTagProvider.class */
public class ModBlockTagProvider extends BlockTagsProvider {
    public ModBlockTagProvider(PackOutput output, CompletableFuture<HolderLookup.Provider> lookupProvider, @Nullable ExistingFileHelper existingFileHelper) {
        super(output, lookupProvider, yebisuRPG.MODID, existingFileHelper);
    }

    protected void addTags(HolderLookup.Provider provider) {
        tag(BlockTags.MINEABLE_WITH_PICKAXE).add((Block) ModBlocks.YE6ISU_BLOCK.get());
        tag(BlockTags.NEEDS_IRON_TOOL).add((Block) ModBlocks.YE6ISU_BLOCK.get());
    }
}
