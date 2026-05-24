package net.ye6isu.yebisuRPG.util;

import net.minecraft.resources.ResourceLocation;
import net.minecraft.tags.BlockTags;
import net.minecraft.tags.ItemTags;
import net.minecraft.tags.TagKey;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.block.Block;
import net.ye6isu.yebisuRPG.yebisuRPG;

public class ModTags {
    public static class Blocks {

        public static final TagKey<Block> NEEDS_YE6ISU_TOOL = createTag("needs_ye6isu_tool");
        public static final TagKey<Block> INCORRECT_FOR_YE6ISU_TOOL = createTag("incorrect_for_ye6isu_tool");

        private static TagKey<Block> createTag(String name) {
            return BlockTags.create(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, name));
        }

    }

    public static class Items {

        public static final TagKey<Item> CURSED_ITEMS = createTag("cursed_item");

        private static TagKey<Item> createTag(String name) {
            return ItemTags.create(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, name));
        }

    }

}
