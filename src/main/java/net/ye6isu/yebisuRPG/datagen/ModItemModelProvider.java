package net.ye6isu.yebisuRPG.datagen;

import net.minecraft.data.PackOutput;
import net.neoforged.neoforge.client.model.generators.ItemModelProvider;
import net.neoforged.neoforge.common.data.ExistingFileHelper;
import net.ye6isu.yebisuRPG.item.ModItems;
import net.ye6isu.yebisuRPG.yebisuRPG;

public class ModItemModelProvider extends ItemModelProvider {

    public ModItemModelProvider(PackOutput output, ExistingFileHelper existingFileHelper) {
        super(output, yebisuRPG.MODID, existingFileHelper);
    }

    @Override
    protected void registerModels() {
        basicItem(ModItems.YE6ISU.get());
        basicItem(ModItems.WALKMAN.get());
        basicItem(ModItems.PLANK.get());
    }
}
