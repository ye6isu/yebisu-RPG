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

        //YCS_Mod_Recipe_Provider_START

        ShapedRecipeBuilder.shaped(RecipeCategory.MISC, ModItems.NORBIT_THE_ORBIT.get(), 1)
                .pattern(" A ")
                .pattern("A A")
                .pattern(" A ")
                .define('A', net.minecraft.core.registries.BuiltInRegistries.ITEM.get(ResourceLocation.parse("minecraft:diamond")))
                .unlockedBy("has_diamond", has(net.minecraft.core.registries.BuiltInRegistries.ITEM.get(ResourceLocation.parse("minecraft:diamond"))))
                .save(recipeOutput);
        
        SimpleCookingRecipeBuilder.smelting(Ingredient.of(net.minecraft.core.registries.BuiltInRegistries.ITEM.get(ResourceLocation.parse("yebisurpg:plank"))), RecipeCategory.MISC, ModItems.NORBIT_THE_ORBIT.get(), 0.7f, 200)
                .unlockedBy("has_plank", has(net.minecraft.core.registries.BuiltInRegistries.ITEM.get(ResourceLocation.parse("yebisurpg:plank"))))
                .save(recipeOutput, ResourceLocation.fromNamespaceAndPath("yebisurpg", "norbit_the_orbit_from_smelting"));

        //YCS_Mod_Recipe_Provider_END

    }
}
