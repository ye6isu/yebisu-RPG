package net.ye6isu.yebisuRPG.effect;

import net.minecraft.core.Holder;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectCategory;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.yebisuRPG;



public class ModEffects {

    public static final DeferredRegister<MobEffect> MOB_EFFECTS =
        DeferredRegister.create(BuiltInRegistries.MOB_EFFECT, yebisuRPG.MODID);

    //YCS_Effects_START
    public static final Holder<MobEffect> TEST_EFFECT =
        MOB_EFFECTS.register("test_effect", () -> new MobEffect(MobEffectCategory.NEUTRAL, 0x535050) {});
    //YCS_Effects_END

    private ModEffects() {}

    public static void register(IEventBus modEventBus) {
        MOB_EFFECTS.register(modEventBus);
    }
}
