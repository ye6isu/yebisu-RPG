package net.ye6isu.yebisuRPG.entity;

import net.minecraft.core.registries.Registries;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.entity.custom.YcsMobEntity;
import net.ye6isu.yebisuRPG.yebisuRPG;
// YCS_Mod_Entity_Imports

/**
 * Registers YCS-authored mobs. Every mob YCS creates shares the single
 * generic {@link YcsMobEntity} class — per-mob look (model/texture/animations)
 * and stats (attributes/hitbox) are data, not a new Java class per entity.
 *
 * <p>YCS injects new entity declarations above the {@code YCS_Mod_Entities}
 * marker below.</p>
 */
public final class ModEntities {

    public static final DeferredRegister<EntityType<?>> ENTITY_TYPES =
        DeferredRegister.create(Registries.ENTITY_TYPE, yebisuRPG.MODID);
    
    // YCS_Mod_Entities

    private ModEntities() {}

    public static void register(IEventBus eventBus) {
        ENTITY_TYPES.register(eventBus);
    }
}
