package net.ye6isu.yebisuRPG.entity;

import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.event.entity.EntityAttributeCreationEvent;
import net.ye6isu.yebisuRPG.entity.custom.YcsMobEntity;

/**
 * Registers the {@link net.minecraft.world.entity.ai.attributes.AttributeSupplier}
 * for every YCS-authored mob (max health / movement speed — see
 * {@link net.ye6isu.yebisuRPG.entity.custom.YcsMobEntity#createAttributes}).
 *
 * <p>YCS injects one {@code event.put(ModEntities.X.get(), YcsMobEntity.createAttributes(...).build());}
 * line per entity above the {@code YCS_Entity_Attributes} marker below.</p>
 */
public final class ModEntityEvents {

    private ModEntityEvents() {}

    public static void register(IEventBus modEventBus) {
        modEventBus.addListener(ModEntityEvents::registerAttributes);
    }

    private static void registerAttributes(EntityAttributeCreationEvent event) {
        event.put(ModEntities.TESTERENT.get(), YcsMobEntity.createAttributes(20D, 0.25D).build());
        // YCS_Entity_Attributes
    }
}
