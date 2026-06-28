package net.ye6isu.yebisuRPG.effect.custom;

import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectCategory;
import net.minecraft.world.entity.LivingEntity;

public class YCSEffect extends MobEffect {
    public YCSEffect(MobEffectCategory category, int color) {
        super(category, color);
    }

    public void onEffectRemoved(LivingEntity livingEntity, int amplifier) {
    }
}
