package net.ye6isu.yebisuRPG.datagen;

import net.minecraft.core.HolderLookup;
import net.minecraft.data.PackOutput;
import net.minecraft.data.tags.ItemTagsProvider;
import net.minecraft.tags.ItemTags;
import net.minecraft.world.level.block.Block;
import net.neoforged.neoforge.common.data.ExistingFileHelper;
import net.ye6isu.yebisuRPG.item.ModItems;
import net.ye6isu.yebisuRPG.util.ModTags;
import net.ye6isu.yebisuRPG.yebisuRPG;
import org.jetbrains.annotations.Nullable;

import java.util.concurrent.CompletableFuture;

public class ModItemTagProvider extends ItemTagsProvider {
    public ModItemTagProvider(PackOutput output, CompletableFuture<HolderLookup.Provider> lookupProvider, CompletableFuture<TagLookup<Block>> blockTags, @Nullable ExistingFileHelper existingFileHelper) {
        super(output, lookupProvider, blockTags, yebisuRPG.MODID, existingFileHelper);
    }

    @Override
    protected void addTags(HolderLookup.Provider provider) {
        tag(ModTags.Items.CURSED_ITEMS)
                .add(ModItems.SUKUNA_FINGER.get());

        tag(ItemTags.SWORDS)
                .add(ModItems.YE6ISU_SWORD.get())
                .add(ModItems.YE6ISU_HOE.get());;
        tag(ItemTags.PICKAXES)
                .add(ModItems.YE6ISU_PICKAXE.get());
        tag(ItemTags.SHOVELS)
                .add(ModItems.YE6ISU_SHOVEL.get());
        tag(ItemTags.AXES)
                .add(ModItems.YE6ISU_AXE.get());
        tag(ItemTags.HOES)
                .add(ModItems.YE6ISU_HOE.get());
        this.tag(ItemTags.TRIMMABLE_ARMOR)
                .add(ModItems.PLANK_HELMET.get())
                .add(ModItems.PLANK_CHESTPLATE.get())
                .add(ModItems.PLANK_LEGGINGS.get())
                .add(ModItems.PLANK_BOOTS.get());

        // YCS_ITEM_TAGS_INSERT
    }
}
