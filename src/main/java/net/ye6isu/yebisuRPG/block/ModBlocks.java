package net.ye6isu.yebisuRPG.block;

import net.minecraft.util.valueproviders.UniformInt;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.block.*;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.properties.BlockSetType;
import net.minecraft.world.level.block.state.properties.WoodType;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredBlock;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.item.ModItems;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.function.Supplier;

public class ModBlocks {
    public static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks(yebisuRPG.MODID);

    public static final DeferredBlock<Block> YE6ISU_BLOCK = registerBlock("ye6isu_block",
            () -> new Block(BlockBehaviour.Properties.of()
                    .strength(4f)
                    .requiresCorrectToolForDrops()
                    .sound(SoundType.METAL)));

    public static final DeferredBlock<Block> YE6ISU_ORE = registerBlock("ye6isu_ore",
            () -> new DropExperienceBlock(UniformInt.of(2, 4),
                    BlockBehaviour.Properties.of().strength(3f).requiresCorrectToolForDrops().sound(SoundType.STONE)));

    public static final DeferredBlock<Block> CRATE_BLOCK = registerBlock("crate_block",
            () -> new Block(BlockBehaviour.Properties.of()
                    .strength(2.0F)
                    .sound(SoundType.WOOD)));

    public static final DeferredBlock<StairBlock> CRATE_STAIRS = registerBlock("crate_stairs",
            () -> new StairBlock(ModBlocks.CRATE_BLOCK.get().defaultBlockState(),
                    BlockBehaviour.Properties.of().strength(2f).requiresCorrectToolForDrops()));

    public static final DeferredBlock<SlabBlock> CRATE_SLAB = registerBlock("crate_slab",
            () -> new SlabBlock(BlockBehaviour.Properties.of().strength(2f).requiresCorrectToolForDrops()));

    public static final DeferredBlock<PressurePlateBlock> CRATE_PRESSURE_PLATE = registerBlock("crate_pressure_plate",
            () -> new PressurePlateBlock(BlockSetType.IRON, BlockBehaviour.Properties.of().strength(2f).requiresCorrectToolForDrops()));

    public static final DeferredBlock<ButtonBlock> CRATE_BUTTON = registerBlock("crate_button",
            () -> new ButtonBlock(BlockSetType.IRON, 20,
                    BlockBehaviour.Properties.of().strength(2f).requiresCorrectToolForDrops().noCollission()));

    public static final DeferredBlock<FenceBlock> CRATE_FENCE = registerBlock("crate_fence",
            () -> new FenceBlock(BlockBehaviour.Properties.of().strength(2f).requiresCorrectToolForDrops()));

    public static final DeferredBlock<FenceGateBlock> CRATE_FENCE_GATE = registerBlock("crate_fence_gate",
            () -> new FenceGateBlock(WoodType.OAK, BlockBehaviour.Properties.of().strength(2f).requiresCorrectToolForDrops()));

    public static final DeferredBlock<WallBlock> CRATE_WALL = registerBlock("crate_wall",
            () -> new WallBlock(BlockBehaviour.Properties.of().strength(2f).requiresCorrectToolForDrops()));

    public static final DeferredBlock<DoorBlock> CRATE_DOOR = registerBlock("crate_door",
            () -> new DoorBlock(BlockSetType.IRON, BlockBehaviour.Properties.of().strength(2f).requiresCorrectToolForDrops().noOcclusion()));

    public static final DeferredBlock<TrapDoorBlock> CRATE_TRAPDOOR = registerBlock("crate_trapdoor",
            () -> new TrapDoorBlock(BlockSetType.IRON, BlockBehaviour.Properties.of().strength(2f).requiresCorrectToolForDrops().noOcclusion()));

    // ─── Cat Block + variants ─────────────────────────────────────────────────

    public static final DeferredBlock<Block> CAT_BLOCK = registerBlock("cat_block",
                    () -> new Block(BlockBehaviour.Properties.of()
                                .strength(2f)
                                .sound(SoundType.WOOD)));


    private static <T extends Block> DeferredBlock<T> registerBlock(String name, Supplier<T> block) {
        DeferredBlock<T> toReturn = BLOCKS.register(name, block);
        registerBlockItem(name, toReturn);
        return toReturn;
    }

    private static <T extends Block> void registerBlockItem(String name, DeferredBlock<T> block) {
        ModItems.ITEMS.register(name, () -> new BlockItem(block.get(), new Item.Properties()));
    }

    public static void register(IEventBus eventBus) {
        BLOCKS.register(eventBus);
    }
}
