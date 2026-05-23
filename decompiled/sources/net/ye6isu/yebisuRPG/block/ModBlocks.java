package net.ye6isu.yebisuRPG.block;

import java.util.function.Supplier;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredBlock;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.item.ModItems;
import net.ye6isu.yebisuRPG.yebisuRPG;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/block/ModBlocks.class */
public class ModBlocks {
    public static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks(yebisuRPG.MODID);
    public static final DeferredBlock<Block> YE6ISU_BLOCK = registerBlock("ye6isu_block", () -> {
        return new Block(BlockBehaviour.Properties.of().strength(4.0f).requiresCorrectToolForDrops().sound(SoundType.METAL));
    });
    public static final DeferredBlock<Block> CRATE_BLOCK = registerBlock("crate_block", () -> {
        return new Block(BlockBehaviour.Properties.of().strength(2.0f).sound(SoundType.WOOD));
    });

    private static <T extends Block> DeferredBlock<T> registerBlock(String name, Supplier<T> block) {
        DeferredBlock<T> toReturn = BLOCKS.register(name, block);
        registerBlockItem(name, toReturn);
        return toReturn;
    }

    private static <T extends Block> void registerBlockItem(String name, DeferredBlock<T> block) {
        ModItems.ITEMS.register(name, () -> {
            return new BlockItem((Block) block.get(), new Item.Properties());
        });
    }

    public static void register(IEventBus eventBus) {
        BLOCKS.register(eventBus);
    }
}
