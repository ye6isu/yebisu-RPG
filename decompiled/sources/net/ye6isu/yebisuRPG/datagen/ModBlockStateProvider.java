package net.ye6isu.yebisuRPG.datagen;

import net.minecraft.data.PackOutput;
import net.minecraft.world.level.block.Block;
import net.neoforged.neoforge.client.model.generators.BlockStateProvider;
import net.neoforged.neoforge.common.data.ExistingFileHelper;
import net.neoforged.neoforge.registries.DeferredBlock;
import net.ye6isu.yebisuRPG.block.ModBlocks;
import net.ye6isu.yebisuRPG.yebisuRPG;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/datagen/ModBlockStateProvider.class */
public class ModBlockStateProvider extends BlockStateProvider {
    public ModBlockStateProvider(PackOutput output, ExistingFileHelper exFileHelper) {
        super(output, yebisuRPG.MODID, exFileHelper);
    }

    protected void registerStatesAndModels() {
        blockWithItem(ModBlocks.YE6ISU_BLOCK);
        blockWithItem(ModBlocks.CRATE_BLOCK);
    }

    private void blockWithItem(DeferredBlock<?> deferredBlock) {
        simpleBlockWithItem((Block) deferredBlock.get(), cubeAll((Block) deferredBlock.get()));
    }
}
