package net.ye6isu.yebisuRPG.component;

import com.mojang.serialization.Codec;
import net.minecraft.core.component.DataComponentType;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.codec.ByteBufCodecs;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.yebisuRPG;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/component/ModDataComponents.class */
public final class ModDataComponents {
    public static final DeferredRegister<DataComponentType<?>> COMPONENTS = DeferredRegister.create(Registries.DATA_COMPONENT_TYPE, yebisuRPG.MODID);
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<Integer>> WALKMAN_FRAME = COMPONENTS.register("walkman_frame", () -> {
        return DataComponentType.builder().persistent(Codec.INT).networkSynchronized(ByteBufCodecs.VAR_INT).build();
    });

    private ModDataComponents() {
    }

    public static void register(IEventBus eventBus) {
        COMPONENTS.register(eventBus);
    }
}
