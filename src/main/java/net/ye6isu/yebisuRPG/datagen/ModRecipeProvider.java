package net.ye6isu.yebisuRPG.datagen;

import net.minecraft.core.HolderLookup;
import net.minecraft.data.PackOutput;
import net.minecraft.data.recipes.*;
import net.neoforged.neoforge.common.conditions.IConditionBuilder;
import net.ye6isu.yebisuRPG.block.ModBlocks;
import net.ye6isu.yebisuRPG.item.ModItems;

import java.util.concurrent.CompletableFuture;

public class ModRecipeProvider extends RecipeProvider implements IConditionBuilder {
    public ModRecipeProvider(PackOutput output, CompletableFuture<HolderLookup.Provider> registries) {
        super(output, registries);
    }

    @Override
    protected void buildRecipes(RecipeOutput recipeOutput) {

        ShapedRecipeBuilder.shaped(RecipeCategory.MISC, ModBlocks.YE6ISU_BLOCK.get())
                .pattern("YYY")
                .pattern("YYY")
                .pattern("YYY")
                .define('Y', ModItems.YE6ISU.get())
                .unlockedBy("has_ye6isu", has(ModItems.YE6ISU))
                .save(recipeOutput);

        ShapelessRecipeBuilder.shapeless(RecipeCategory.MISC, ModItems.YE6ISU.get(), 9)
                .requires(ModBlocks.YE6ISU_BLOCK)
                .unlockedBy("has_ye6isu_block", has(ModBlocks.YE6ISU_BLOCK))
                .save(recipeOutput);

        ShapedRecipeBuilder.shaped(RecipeCategory.MISC, ModBlocks.CRATE_BLOCK.get())
                .pattern("PPP")
                .pattern("P P")
                .pattern("PPP")
                .define('P', ModItems.PLANK.get())
                .unlockedBy("has_plank", has(ModItems.PLANK))
                .save(recipeOutput);

    }
}
