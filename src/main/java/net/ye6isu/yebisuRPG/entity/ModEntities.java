package net.ye6isu.yebisuRPG.entity;

import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.entity.custom.JoeEntity;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.function.Supplier;

public class ModEntities {

    public static final DeferredRegister<EntityType<?>> ENTITY_TYPES =
            DeferredRegister.create(BuiltInRegistries.ENTITY_TYPE, yebisuRPG.MODID);

    public static final Supplier<EntityType<JoeEntity>> JOE =
            ENTITY_TYPES.register("joe", () -> EntityType.Builder.of(JoeEntity::new, MobCategory.CREATURE)
                    .sized(0.75f, 0.35f).build("joe"));


    public static void register(IEventBus eventBus) {
        ENTITY_TYPES.register(eventBus);
    }


}