package net.ye6isu.yebisuRPG.datagen;

import net.minecraft.core.HolderLookup;
import net.minecraft.data.PackOutput;
import net.minecraft.data.recipes.*;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.crafting.*;
import net.minecraft.world.level.ItemLike;
import net.neoforged.neoforge.common.conditions.IConditionBuilder;
import net.ye6isu.yebisuRPG.block.ModBlocks;
import net.ye6isu.yebisuRPG.item.ModItems;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.List;
import java.util.concurrent.CompletableFuture;

public class ModRecipeProvider extends RecipeProvider implements IConditionBuilder {
    public ModRecipeProvider(PackOutput output, CompletableFuture<HolderLookup.Provider> registries) {
        super(output, registries);
    }

    @Override
    protected void buildRecipes(RecipeOutput recipeOutput) {

        //List<ItemLike> YE6ISU_SMELTABLES = List.of(ModItems.RAW_YE6ISU);

        //Shapeless recipe
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

        //Shaped recipe
        ShapedRecipeBuilder.shaped(RecipeCategory.MISC, ModBlocks.CRATE_BLOCK.get())
                .pattern("PPP")
                .pattern("P P")
                .pattern("PPP")
                .define('P', ModItems.PLANK.get())
                .unlockedBy("has_plank", has(ModItems.PLANK))
                .save(recipeOutput);

        //Non-Block Block recipe
        stairBuilder(ModBlocks.CRATE_STAIRS.get(), Ingredient.of(ModItems.PLANK)).group("CRATE")
                .unlockedBy("has_crate", has(ModItems.PLANK)).save(recipeOutput);

        slab(recipeOutput, RecipeCategory.BUILDING_BLOCKS, ModBlocks.CRATE_SLAB.get(), ModItems.PLANK.get());

        buttonBuilder(ModBlocks.CRATE_BUTTON.get(), Ingredient.of(ModItems.PLANK.get())).group("CRATE")
                .unlockedBy("has_crate", has(ModItems.PLANK.get())).save(recipeOutput);

        pressurePlate(recipeOutput, ModBlocks.CRATE_PRESSURE_PLATE.get(), ModItems.PLANK.get());

        fenceBuilder(ModBlocks.CRATE_FENCE.get(), Ingredient.of(ModItems.PLANK.get())).group("CRATE")
                .unlockedBy("has_crate", has(ModItems.PLANK.get())).save(recipeOutput);

        fenceGateBuilder(ModBlocks.CRATE_FENCE_GATE.get(), Ingredient.of(ModItems.PLANK.get())).group("CRATE")
                .unlockedBy("has_crate", has(ModItems.PLANK.get())).save(recipeOutput);

        wall(recipeOutput, RecipeCategory.BUILDING_BLOCKS, ModBlocks.CRATE_WALL.get(), ModItems.PLANK.get());

        doorBuilder(ModBlocks.CRATE_DOOR.get(), Ingredient.of(ModItems.PLANK.get())).group("CRATE")
                .unlockedBy("has_crate", has(ModItems.PLANK.get())).save(recipeOutput);

        trapdoorBuilder(ModBlocks.CRATE_TRAPDOOR.get(), Ingredient.of(ModItems.PLANK.get())).group("CRATE")
                .unlockedBy("has_crate", has(ModItems.PLANK.get())).save(recipeOutput);

        //Furnace recipe
        //smelting(recipeOutput, YE6ISU_SMELTABLES, RecipeCategory.MISC, ModItems.YE6ISU.get(), 0.25f, 200, "ye6isu");

        //Blasting recipe
        //blasting(recipeOutput, YE6ISU_SMELTABLES, RecipeCategory.MISC, ModItems.YE6ISU.get(), 0.25f, 100, "ye6isu");

        //YCS_Mod_Recipe_Provider_START

        //YCS_Mod_Recipe_Provider_END
    }

    protected static void smelting(RecipeOutput recipeOutput, List<ItemLike> pIngredients, RecipeCategory pCategory, ItemLike pResult, float pExperience, int pCookingTime, String pGroup) {
        basicCooking(recipeOutput, RecipeSerializer.SMELTING_RECIPE, SmeltingRecipe::new, pIngredients, pCategory, pResult, pExperience, pCookingTime, pGroup, "_from_smelting");
    }

    protected static void blasting(RecipeOutput recipeOutput, List<ItemLike> pIngredients, RecipeCategory pCategory, ItemLike pResult, float pExperience, int pCookingTime, String pGroup) {
        basicCooking(recipeOutput, RecipeSerializer.BLASTING_RECIPE, BlastingRecipe::new, pIngredients, pCategory, pResult, pExperience, pCookingTime, pGroup, "_from_blasting");
    }

    protected static void smoking(RecipeOutput recipeOutput, List<ItemLike> pIngredients, RecipeCategory pCategory, ItemLike pResult, float pExperience, int pCookingTime, String pGroup) {
        basicCooking(recipeOutput, RecipeSerializer.SMOKING_RECIPE, SmokingRecipe::new, pIngredients, pCategory, pResult, pExperience, pCookingTime, pGroup, "_from_smoking");
    }

    protected static void campfire(RecipeOutput recipeOutput, List<ItemLike> pIngredients, RecipeCategory pCategory, ItemLike pResult, float pExperience, int pCookingTime, String pGroup) {
        basicCooking(recipeOutput, RecipeSerializer.CAMPFIRE_COOKING_RECIPE, CampfireCookingRecipe::new, pIngredients, pCategory, pResult, pExperience, pCookingTime, pGroup, "_from_campfire");
    }

    protected static <T extends AbstractCookingRecipe> void basicCooking(RecipeOutput recipeOutput, RecipeSerializer<T> pCookingSerializer, AbstractCookingRecipe.Factory<T> factory, List<ItemLike> pIngredients, RecipeCategory pCategory, ItemLike pResult, float pExperience, int pCookingTime, String pGroup, String pRecipeName) {
        for(ItemLike itemlike : pIngredients) {
            SimpleCookingRecipeBuilder.generic(Ingredient.of(itemlike), pCategory, pResult, pExperience, pCookingTime, pCookingSerializer, factory)
                    .group(pGroup)
                    .unlockedBy(getHasName(itemlike), has(itemlike))
                    .save(recipeOutput, yebisuRPG.MODID + ":" + getItemName(pResult) + pRecipeName + "_" + getItemName(itemlike));
        }
    }

}
