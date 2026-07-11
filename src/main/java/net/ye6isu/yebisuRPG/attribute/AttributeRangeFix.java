package net.ye6isu.yebisuRPG.attribute;

import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.RangedAttribute;
import net.ye6isu.yebisuRPG.mixin.AccessorRangedAttribute;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.Map;

/**
 * Raises vanilla's hardcoded RangedAttribute ceilings so mob/player stats can scale
 * into RPG/roguelike territory (PoE/Diablo-style numbers). Vanilla only clamps values
 * via {@link Attribute#sanitizeValue}; this does not change the damage formula or HUD
 * rendering, both of which still assume vanilla-scale numbers.
 */
public final class AttributeRangeFix {

    private static final Map<ResourceLocation, Double> NEW_MAX_VALUES = Map.of(
        ResourceLocation.withDefaultNamespace("generic.max_health"), 100_000.0,
        ResourceLocation.withDefaultNamespace("generic.armor"), 10_000.0,
        ResourceLocation.withDefaultNamespace("generic.armor_toughness"), 10_000.0,
        ResourceLocation.withDefaultNamespace("generic.attack_damage"), 100_000.0,
        ResourceLocation.withDefaultNamespace("generic.attack_knockback"), 100.0,
        ResourceLocation.withDefaultNamespace("generic.movement_speed"), 10.0
    );

    private AttributeRangeFix() {}

    public static void apply() {
        for (Attribute attribute : BuiltInRegistries.ATTRIBUTE) {
            if (!(attribute instanceof RangedAttribute ranged)) continue;
            ResourceLocation id = BuiltInRegistries.ATTRIBUTE.getKey(attribute);
            Double newMax = id != null ? NEW_MAX_VALUES.get(id) : null;
            if (newMax == null || newMax <= ranged.getMaxValue()) continue;

            ((AccessorRangedAttribute) ranged).yebisurpg$setMaxValue(newMax);
            yebisuRPG.LOGGER.info("[AttributeRangeFix] Raised max for {} to {}", id, newMax);
        }
    }
}
