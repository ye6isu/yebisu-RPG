package net.ye6isu.yebisuRPG.component;

import com.mojang.serialization.Codec;
import net.minecraft.core.component.DataComponentType;
import net.minecraft.network.codec.ByteBufCodecs;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.minecraft.core.registries.Registries;
import net.ye6isu.yebisuRPG.yebisuRPG;

/**
 * Registers custom {@link DataComponentType}s for yebisu RPG items.
 *
 * <h2>What is a DataComponent?</h2>
 * <p>A {@link DataComponentType} is a typed key-value pair stored directly on an
 * {@link net.minecraft.world.item.ItemStack}. Unlike NBT, components are typed,
 * validated, and automatically synced to clients. Each stack holds its own
 * independent value — so each walkman in a player's inventory has its own frame.</p>
 *
 * <h2>Adding a new component</h2>
 * <ol>
 *   <li>Declare a {@code DeferredHolder<DataComponentType<?>, DataComponentType<T>>}
 *       field using {@link #COMPONENTS}.register(...).</li>
 *   <li>Call {@link #register(IEventBus)} in {@link net.ye6isu.yebisuRPG.yebisuRPG}.</li>
 *   <li>Read/write via {@code stack.get(ModDataComponents.YOUR_COMPONENT.get())}
 *       and {@code stack.set(...)}.</li>
 * </ol>
 */
public final class ModDataComponents {

    public static final DeferredRegister<DataComponentType<?>> COMPONENTS =
        DeferredRegister.create(Registries.DATA_COMPONENT_TYPE, yebisuRPG.MODID);

    /**
     * Stores the current display frame index for the Walkman item.
     *
     * <ul>
     *   <li>0 = frame 0 (default / stopped)</li>
     *   <li>1 = frame 1 (active / playing)</li>
     * </ul>
     *
     * <p>Stored as an {@code int} on the {@link net.minecraft.world.item.ItemStack},
     * synced to clients automatically, and saved to world data.</p>
     */
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<Integer>>
        WALKMAN_FRAME = COMPONENTS.register("walkman_frame", () ->
            DataComponentType.<Integer>builder()
                .persistent(Codec.INT)
                .networkSynchronized(ByteBufCodecs.VAR_INT)
                .build());

    public static final DeferredHolder<DataComponentType<?>, DataComponentType<Integer>>
        ITEM_STATE = COMPONENTS.register("item_state", () ->
            DataComponentType.<Integer>builder()
                .persistent(Codec.INT)
                .networkSynchronized(ByteBufCodecs.VAR_INT)
                .build());

    //YCS_DataComponents_START

    //YCS_DataComponents_END

    private ModDataComponents() {}

    public static void register(IEventBus eventBus) {
        COMPONENTS.register(eventBus);
    }
}
