package net.ye6isu.yebisuRPG.entity;

import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.event.entity.EntityAttributeCreationEvent;
import net.neoforged.neoforge.event.entity.EntityAttributeModificationEvent;
import net.ye6isu.yebisuRPG.attribute.ModAttributes;
import net.ye6isu.yebisuRPG.entity.custom.YcsMobData;

/**
 * Registers the {@link net.minecraft.world.entity.ai.attributes.AttributeSupplier}
 * (an open-ended list — max health, movement speed, combat stats, scale, any
 * mod-defined attribute; see {@code ycs-data/entities/&lt;id&gt;.json}'s
 * {@code attributes} array) and the {@link YcsMobData} hostility/goal/breeding/
 * ranged-attack config for every YCS-authored mob.
 *
 * <p>YCS injects one {@code event.put(ModEntities.X.get(), LivingEntity.createLivingAttributes()
 * .add(Attributes.FOLLOW_RANGE, 16.0).add(...).build());} line per entity above the {@code
 * YCS_Entity_Attributes} marker — the {@code .add(...)} chain is generated directly from the
 * entity's attribute list since a fixed-arity Java helper can't represent an open-ended set —
 * and one {@code YcsMobData.register(ModEntities.X.get(), new YcsMobData.Config(...)
 * .withGoal(...)...);} line per entity above the {@code YCS_Entity_Hostility} marker below.</p>
 */
public final class ModEntityEvents {

    private ModEntityEvents() {}

    public static void register(IEventBus modEventBus) {
        modEventBus.addListener(ModEntityEvents::registerAttributes);
        modEventBus.addListener(ModEntityEvents::registerPlayerResourceAttributes);
    }

    private static void registerPlayerResourceAttributes(EntityAttributeModificationEvent event) {
        event.add(EntityType.PLAYER, ModAttributes.MAX_MANA);
        event.add(EntityType.PLAYER, ModAttributes.MANA_REGENERATION);
        event.add(EntityType.PLAYER, ModAttributes.MAX_STAMINA);
        event.add(EntityType.PLAYER, ModAttributes.STAMINA_REGENERATION);
        event.add(EntityType.PLAYER, ModAttributes.MAX_CURSED_ENERGY);
        event.add(EntityType.PLAYER, ModAttributes.CURSED_ENERGY_REGENERATION);
        // YCS_Player_Resource_Attributes
    }

    private static void registerAttributes(EntityAttributeCreationEvent event) {

        // YCS_Entity_Attributes

        // YCS_Entity_Hostility
    }
}
