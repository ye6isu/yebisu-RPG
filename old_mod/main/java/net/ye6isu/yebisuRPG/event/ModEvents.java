package net.ye6isu.yebisuRPG.event;

import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.entity.EntityAttributeCreationEvent;
import net.neoforged.neoforge.event.entity.living.MobEffectEvent;
import net.ye6isu.yebisuRPG.effect.custom.YCSEffect;
import net.ye6isu.yebisuRPG.yebisuRPG;

@EventBusSubscriber(modid = yebisuRPG.MODID)
public class ModEvents {

    @SubscribeEvent
    public static void registerAttributes(EntityAttributeCreationEvent event) {
    }

    @SubscribeEvent
    public static void onEffectExpired(MobEffectEvent.Expired event) {
        if (event.getEffectInstance() != null && event.getEffectInstance().getEffect().value() instanceof YCSEffect ycsEffect) {
            ycsEffect.onEffectRemoved(event.getEntity(), event.getEffectInstance().getAmplifier());
        }
    }

    @SubscribeEvent
    public static void onEffectRemoved(MobEffectEvent.Remove event) {
        if (event.getEffectInstance() != null && event.getEffectInstance().getEffect().value() instanceof YCSEffect ycsEffect) {
            ycsEffect.onEffectRemoved(event.getEntity(), event.getEffectInstance().getAmplifier());
        }
    }

}
