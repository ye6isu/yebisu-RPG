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

    public static DeferredHolder<DataComponentType<?>, DataComponentType<Double>> registerDouble(String name) {
        return COMPONENTS.register(name, () ->
            DataComponentType.<Double>builder()
                .persistent(Codec.DOUBLE)
                .networkSynchronized(ByteBufCodecs.DOUBLE)
                .build());
    }

    public static DeferredHolder<DataComponentType<?>, DataComponentType<Integer>> registerInt(String name) {
        return COMPONENTS.register(name, () ->
            DataComponentType.<Integer>builder()
                .persistent(Codec.INT)
                .networkSynchronized(ByteBufCodecs.VAR_INT)
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


    /**
     * Which frame of the CURRENT item state's spritesheet texture is showing — completely independent
     * from {@code CustomModelData} (which only ever picks the active state/container). Read by whichever
     * state (3D or flat) happens to be selected; setting this never changes which state is active, and
     * vice versa. Absent = use that texture's own configured default frame. Ignored entirely by animated
     * textures (they always tick via {@code TextureFrameClock}, never read this component).
     */
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<Integer>> ITEM_FRAME = registerInt("item_frame");

    public static final DeferredHolder<DataComponentType<?>, DataComponentType<Boolean>> ITEM_HAS_ABILITIES = registerBoolean("item_has_abilities");
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<String>> ITEM_ABILITY_SLOT_1 = registerString("item_ability_slot_1");
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<String>> ITEM_ABILITY_SLOT_2 = registerString("item_ability_slot_2");
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<String>> ITEM_ABILITY_SLOT_3 = registerString("item_ability_slot_3");
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<String>> ITEM_ABILITY_SLOT_4 = registerString("item_ability_slot_4");
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<String>> ITEM_ABILITY_SLOT_5 = registerString("item_ability_slot_5");
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<String>> ITEM_ABILITY_SLOT_6 = registerString("item_ability_slot_6");
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<String>> ITEM_ABILITY_SLOT_7 = registerString("item_ability_slot_7");
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<String>> ITEM_ABILITY_SLOT_8 = registerString("item_ability_slot_8");
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<String>> ITEM_ABILITY_SLOT_9 = registerString("item_ability_slot_9");

    /**
     * Generic per-stack bitflag storage for items that toggle entity texture overlay layers on/off
     * (e.g. a wearable-cosmetic item where each bit is a separate layer). Not tied to any one item —
     * any item wanting simple on/off overlay layers can reuse this the same way {@code WalkmanItem} does.
     */
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<Integer>> OVERLAY_FLAGS = registerInt("overlay_flags");
    // YCS_Data_Components

    private ModDataComponents() {}

    public static void register(IEventBus eventBus) {
        COMPONENTS.register(eventBus);
    }
}
