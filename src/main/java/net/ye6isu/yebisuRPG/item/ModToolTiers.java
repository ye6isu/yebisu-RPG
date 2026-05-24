package net.ye6isu.yebisuRPG.item;

import net.minecraft.world.item.Tier;
import net.minecraft.world.item.crafting.Ingredient;
import net.neoforged.neoforge.common.SimpleTier;
import net.ye6isu.yebisuRPG.util.ModTags;

public class ModToolTiers {
    public static final Tier YE6ISU = new SimpleTier(ModTags.Blocks.INCORRECT_FOR_YE6ISU_TOOL,
            1400, 4f, 3f, 28, () -> Ingredient.of(ModItems.YE6ISU));

}