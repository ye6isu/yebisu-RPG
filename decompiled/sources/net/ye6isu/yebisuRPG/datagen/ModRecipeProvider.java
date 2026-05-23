package net.ye6isu.yebisuRPG.datagen;

import java.util.concurrent.CompletableFuture;
import net.minecraft.core.HolderLookup;
import net.minecraft.data.PackOutput;
import net.minecraft.data.recipes.RecipeCategory;
import net.minecraft.data.recipes.RecipeOutput;
import net.minecraft.data.recipes.RecipeProvider;
import net.minecraft.data.recipes.ShapedRecipeBuilder;
import net.minecraft.data.recipes.ShapelessRecipeBuilder;
import net.minecraft.world.level.ItemLike;
import net.neoforged.neoforge.common.conditions.IConditionBuilder;
import net.ye6isu.yebisuRPG.block.ModBlocks;
import net.ye6isu.yebisuRPG.item.ModItems;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/datagen/ModRecipeProvider.class */
public class ModRecipeProvider extends RecipeProvider implements IConditionBuilder {
    public ModRecipeProvider(PackOutput output, CompletableFuture<HolderLookup.Provider> registries) {
        super(output, registries);
    }

    protected void buildRecipes(RecipeOutput recipeOutput) {
        ShapedRecipeBuilder.shaped(RecipeCategory.MISC, (ItemLike) ModBlocks.YE6ISU_BLOCK.get()).pattern("YYY").pattern("YYY").pattern("YYY").define('Y', (ItemLike) ModItems.YE6ISU.get()).unlockedBy("has_ye6isu", has(ModItems.YE6ISU)).save(recipeOutput);
        ShapelessRecipeBuilder.shapeless(RecipeCategory.MISC, (ItemLike) ModItems.YE6ISU.get(), 9).requires(ModBlocks.YE6ISU_BLOCK).unlockedBy("has_ye6isu_block", has(ModBlocks.YE6ISU_BLOCK)).save(recipeOutput);
        ShapedRecipeBuilder.shaped(RecipeCategory.MISC, (ItemLike) ModBlocks.CRATE_BLOCK.get()).pattern("PPP").pattern("P P").pattern("PPP").define('P', (ItemLike) ModItems.PLANK.get()).unlockedBy("has_plank", has(ModItems.PLANK)).save(recipeOutput);
    }
}
