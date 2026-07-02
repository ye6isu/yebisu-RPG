package net.ye6isu.yebisuRPG.component;

import com.mojang.serialization.Codec;
import net.minecraft.core.component.DataComponentType;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.world.item.ItemStack;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.minecraft.core.registries.Registries;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.List;

/**
 * Registers custom {@link DataComponentType}s for yebisu RPG items.
 *
 * <h2>What is a DataComponent?</h2>
 * <p>A {@link DataComponentType} is a typed key-value pair stored directly on an
 * {@link net.minecraft.world.item.ItemStack}. Unlike NBT, components are typed,
 * validated, and automatically synced to clients. Each stack holds its own
 * independent value.</p>
 *
 * <h2>Adding a new component</h2>
 * <p>YCS injects new component declarations above the {@code YCS_Data_Components}
 * marker below. Read/write via {@code stack.get(ModDataComponents.YOUR_COMPONENT.get())}
 * and {@code stack.set(...)}.</p>
 */
public final class ModDataComponents {

    public static final DeferredRegister<DataComponentType<?>> COMPONENTS =
        DeferredRegister.create(Registries.DATA_COMPONENT_TYPE, yebisuRPG.MODID);

    public static final StreamCodec<net.minecraft.network.RegistryFriendlyByteBuf, ItemStack> ITEMSTACK_STREAM_CODEC =
        ItemStack.STREAM_CODEC.cast();

    public static DeferredHolder<DataComponentType<?>, DataComponentType<Double>> registerDouble(String name) {
        return COMPONENTS.register(name, () ->
            DataComponentType.<Double>builder()
                .persistent(Codec.DOUBLE)
                .networkSynchronized(ByteBufCodecs.DOUBLE)
                .build());
    }

    public static DeferredHolder<DataComponentType<?>, DataComponentType<Boolean>> registerBoolean(String name) {
        return COMPONENTS.register(name, () ->
            DataComponentType.<Boolean>builder()
                .persistent(Codec.BOOL)
                .networkSynchronized(ByteBufCodecs.BOOL)
                .build());
    }

    public static DeferredHolder<DataComponentType<?>, DataComponentType<String>> registerString(String name) {
        return COMPONENTS.register(name, () ->
            DataComponentType.<String>builder()
                .persistent(Codec.STRING)
                .networkSynchronized(ByteBufCodecs.STRING_UTF8)
                .build());
    }

    /** List of ItemStacks — used for socketed/held items (e.g. power slots, backpacks). */
    public static DeferredHolder<DataComponentType<?>, DataComponentType<List<ItemStack>>> registerItemStackList(String name) {
        return COMPONENTS.register(name, () ->
            DataComponentType.<List<ItemStack>>builder()
                .persistent(ItemStack.CODEC.listOf())
                .networkSynchronized(ITEMSTACK_STREAM_CODEC.apply(ByteBufCodecs.list()))
                .build());
    }

    public static final DeferredHolder<DataComponentType<?>, DataComponentType<Double>> MAX_AMMO = registerDouble("max_ammo");
    // YCS_Data_Components

    private ModDataComponents() {}

    public static void register(IEventBus eventBus) {
        COMPONENTS.register(eventBus);
    }
}
