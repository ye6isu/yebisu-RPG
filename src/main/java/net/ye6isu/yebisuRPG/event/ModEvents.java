package net.ye6isu.yebisuRPG.event;

import net.minecraft.network.chat.Component;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.animal.Sheep;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Items;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.entity.living.LivingDamageEvent;
import net.ye6isu.yebisuRPG.item.ModItems;
import net.ye6isu.yebisuRPG.yebisuRPG;

@EventBusSubscriber(modid = yebisuRPG.MODID)
public class ModEvents {

    @SubscribeEvent
    public static void livingDamage(LivingDamageEvent.Pre event) {
        if(event.getEntity() instanceof LivingEntity livingEntity && event.getSource().getDirectEntity() instanceof Player player) {
            if(player.getMainHandItem().getItem() == ModItems.PLANK.get()) {
                player.sendSystemMessage(Component.literal(livingEntity.getName().getString().toUpperCase() + " HAS BEEN SPANKED WITH A PLANK!"));
                //sheep.addEffect(new MobEffectInstance(MobEffects.POISON, 600, 6));
                //player.getMainHandItem().shrink(1);
            }
        }
    }

}
