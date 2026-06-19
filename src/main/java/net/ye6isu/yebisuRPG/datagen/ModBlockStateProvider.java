package net.ye6isu.yebisuRPG.datagen;

import net.minecraft.data.PackOutput;
import net.minecraft.world.level.block.RotatedPillarBlock;
import net.neoforged.neoforge.client.model.generators.BlockStateProvider;
import net.neoforged.neoforge.client.model.generators.ModelFile;
import net.neoforged.neoforge.common.data.ExistingFileHelper;
import net.neoforged.neoforge.registries.DeferredBlock;
import net.ye6isu.yebisuRPG.block.ModBlocks;
import net.ye6isu.yebisuRPG.yebisuRPG;

public class ModBlockStateProvider extends BlockStateProvider {
    public ModBlockStateProvider(PackOutput output, ExistingFileHelper exFileHelper) {
        super(output, yebisuRPG.MODID, exFileHelper);
    }

    @Override
    protected void registerStatesAndModels() {

        //Normal Blockss
        blockWithItem(ModBlocks.YE6ISU_BLOCK);
        blockWithItem(ModBlocks.CRATE_BLOCK);
        blockWithItem(ModBlocks.YE6ISU_ORE);

        //Non-Block Blocks
        blockItem(ModBlocks.CRATE_STAIRS);
        blockItem(ModBlocks.CRATE_SLAB);
        blockItem(ModBlocks.CRATE_PRESSURE_PLATE);
        blockItem(ModBlocks.CRATE_FENCE_GATE);
        blockItem(ModBlocks.CRATE_TRAPDOOR, "_bottom");

        //Special Non-Block Blocks
        stairsBlock(ModBlocks.CRATE_STAIRS.get(), blockTexture(ModBlocks.CRATE_BLOCK.get()));
        slabBlock(ModBlocks.CRATE_SLAB.get(), blockTexture(ModBlocks.CRATE_BLOCK.get()), blockTexture(ModBlocks.CRATE_BLOCK.get()));
        buttonBlock(ModBlocks.CRATE_BUTTON.get(), blockTexture(ModBlocks.CRATE_BLOCK.get()));
        pressurePlateBlock(ModBlocks.CRATE_PRESSURE_PLATE.get(), blockTexture(ModBlocks.CRATE_BLOCK.get()));
        fenceBlock(ModBlocks.CRATE_FENCE.get(), blockTexture(ModBlocks.CRATE_BLOCK.get()));
        fenceGateBlock(ModBlocks.CRATE_FENCE_GATE.get(), blockTexture(ModBlocks.CRATE_BLOCK.get()));
        wallBlock(ModBlocks.CRATE_WALL.get(), blockTexture(ModBlocks.CRATE_BLOCK.get()));
        doorBlockWithRenderType(ModBlocks.CRATE_DOOR.get(), modLoc("block/crate_door_bottom"), modLoc("block/crate_door_top"), "cutout");
        trapdoorBlockWithRenderType(ModBlocks.CRATE_TRAPDOOR.get(), modLoc("block/crate_trapdoor"), true, "cutout");

        //Block from creator

        //YCS_Mod_Block_State_START

        blockWithItem(ModBlocks.YEBISU_CAT);

        //YCS_Mod_Block_State_END
    }

    private void blockWithItem(DeferredBlock<?> deferredBlock) {
        simpleBlockWithItem(deferredBlock.get(), cubeAll(deferredBlock.get()));
    }

    private void blockItem(DeferredBlock<?> deferredBlock) {
        simpleBlockItem(deferredBlock.get(), new ModelFile.UncheckedModelFile("yebisurpg:block/" + deferredBlock.getId().getPath()));
    }

    private void blockItem(DeferredBlock<?> deferredBlock, String appendix) {
        simpleBlockItem(deferredBlock.get(), new ModelFile.UncheckedModelFile("yebisurpg:block/" + deferredBlock.getId().getPath() + appendix));
    }

}

