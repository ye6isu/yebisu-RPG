package net.ye6isu.yebisuRPG.mixin;

import net.minecraft.world.entity.ai.attributes.RangedAttribute;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Mutable;
import org.spongepowered.asm.mixin.gen.Accessor;

/**
 * Exposes RangedAttribute's private min/max fields for mutation after registration,
 * so vanilla attribute ceilings (max health, armor, attack damage, etc.) can be
 * raised without touching the damage formula or HUD rendering.
 */
@Mixin(RangedAttribute.class)
public interface AccessorRangedAttribute {

    @Accessor("minValue")
    @Mutable
    void yebisurpg$setMinValue(double min);

    @Accessor("maxValue")
    @Mutable
    void yebisurpg$setMaxValue(double max);
}
