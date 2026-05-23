package net.ye6isu.yebisuRPG.item;

import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.food.FoodProperties;

public class ModFoodProperties {
    public static final FoodProperties SUKUNA_FINGER = new FoodProperties.Builder().nutrition(3).saturationModifier(0.25f).alwaysEdible()
            .effect(new MobEffectInstance(MobEffects.DAMAGE_BOOST, 3600), 1).build();
}
