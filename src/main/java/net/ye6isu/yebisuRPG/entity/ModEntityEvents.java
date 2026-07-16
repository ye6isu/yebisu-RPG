package net.ye6isu.yebisuRPG.entity;

import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.event.entity.EntityAttributeCreationEvent;
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
    }

    private static void registerAttributes(EntityAttributeCreationEvent event) {

        event.put(ModEntities.TESTEN.get(), LivingEntity.createLivingAttributes().add(Attributes.FOLLOW_RANGE, 16.0).add(Attributes.MAX_HEALTH, 20D).add(Attributes.MOVEMENT_SPEED, 0.25D).add(Attributes.ATTACK_DAMAGE, 2D).add(Attributes.ARMOR, 0D).add(Attributes.ARMOR_TOUGHNESS, 0D).add(Attributes.KNOCKBACK_RESISTANCE, 0D).add(Attributes.SCALE, 1D).build());
        event.put(ModEntities.PLL.get(), LivingEntity.createLivingAttributes().add(Attributes.FOLLOW_RANGE, 16.0).add(Attributes.MAX_HEALTH, 20D).add(Attributes.MOVEMENT_SPEED, 0.25D).add(Attributes.ATTACK_DAMAGE, 2D).add(Attributes.ARMOR, 0D).add(Attributes.ARMOR_TOUGHNESS, 0D).add(Attributes.KNOCKBACK_RESISTANCE, 0D).add(Attributes.SCALE, 1D).build());
        event.put(ModEntities.PAAAA.get(), LivingEntity.createLivingAttributes().add(Attributes.FOLLOW_RANGE, 16.0).add(Attributes.MAX_HEALTH, 20D).add(Attributes.MOVEMENT_SPEED, 0.25D).build());
        // YCS_Entity_Attributes

        YcsMobData.register(ModEntities.TESTEN.get(), new YcsMobData.Config(YcsMobData.Hostility.HOSTILE).withGoal(new YcsMobData.GoalEntry(YcsMobData.GoalType.WANDER, 1D, 0D, 0F, false, null)).withGoal(new YcsMobData.GoalEntry(YcsMobData.GoalType.LOOK_AT_PLAYER, 0D, 0D, 8F, false, null)).withGoal(new YcsMobData.GoalEntry(YcsMobData.GoalType.LOOK_AROUND, 0D, 0D, 0F, false, null)).withHeadBone("bone2"));
        YcsMobData.register(ModEntities.PLL.get(), new YcsMobData.Config(YcsMobData.Hostility.PASSIVE).withGoal(new YcsMobData.GoalEntry(YcsMobData.GoalType.WANDER, 1D, 0D, 0F, false, null)).withGoal(new YcsMobData.GoalEntry(YcsMobData.GoalType.LOOK_AT_PLAYER, 0D, 0D, 8F, false, null)).withGoal(new YcsMobData.GoalEntry(YcsMobData.GoalType.LOOK_AROUND, 0D, 0D, 0F, false, null)).withHeadBone("Head").withAnimNames("idle", "").withPart("Head", "Head", 1F, 0.5F).withPart("RLegs", "Right Leg", 0.5F, 1F));
        YcsMobData.register(ModEntities.PAAAA.get(), new YcsMobData.Config(YcsMobData.Hostility.PASSIVE).withAnimNames("idle", "").withPart("hb_head", "hb_head", 0.625F, 0.625F, 0F, -1F, 0F).withPart("hb_rarm", "hb_rarm", 0.375F, 0.875F, -8F, -1F, 0F).withPart("hb_larm", "hb_larm", 0.375F, 0.875F, 4F, -1F, 0F).withPart("hb_rleg", "hb_rleg", 0.375F, 0.875F, -4F, -13F, 0F));
        // YCS_Entity_Hostility
    }
}
