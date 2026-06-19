package net.ye6isu.yebisuRPG.effect.custom;

//YCS_Import_START
import net.minecraft.world.effect.MobEffectCategory;
import net.minecraft.world.entity.LivingEntity;
//YCS_Import_END

public class TestEffectEffect extends YCSEffect {
    public TestEffectEffect(MobEffectCategory category, int color) {
        super(category, color);
    }

    //YCS:onEffectStarted:start
    @Override
    public void onEffectStarted(LivingEntity livingEntity, int amplifier) {
        //YCS:onEffectStarted:body
    }
    //YCS:onEffectStarted:end

}