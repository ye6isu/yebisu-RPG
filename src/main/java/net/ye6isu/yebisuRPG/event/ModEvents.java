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
import net.neoforged.neoforge.event.entity.EntityAttributeCreationEvent;
import net.neoforged.neoforge.event.entity.living.LivingDamageEvent;
import net.ye6isu.yebisuRPG.entity.ModEntities;
import net.ye6isu.yebisuRPG.entity.custom.JoeEntity;
import net.ye6isu.yebisuRPG.item.ModItems;
import net.ye6isu.yebisuRPG.yebisuRPG;

@EventBusSubscriber(modid = yebisuRPG.MODID)
public class ModEvents {

    @SubscribeEvent
    public static void livingDamage(LivingDamageEvent.Pre event) {
        if(event.getEntity() instanceof LivingEntity livingEntity && event.getSource().getDirectEntity() instanceof Player player) {
            if(player.getMainHandItem().getItem() == ModItems.PLANK.get()) {
                player.sendSystemMessage(Component.literal(livingEntity.getName().getString().toUpperCase() + " HAS BEEN SPANKED WITH A PLANK!"));
            }
        }
    }

    @SubscribeEvent
    public static void registerAttributes(EntityAttributeCreationEvent event) {
        event.put(ModEntities.JOE.get(), JoeEntity.createAttributes().build());
    }

}
