package net.ye6isu.yebisuRPG.item.custom;

//YCS_Import_START
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Entity;
import net.ye6isu.yebisuRPG.animation.AnimationAPI;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.util.TickScheduler;
import net.ye6isu.yebisuRPG.data.EntityVarCapability;
import net.ye6isu.yebisuRPG.data.EntityVar;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.UseAnim;
import net.minecraft.world.food.FoodProperties;
//YCS_Import_END

public class NorbitTheOrbitItem extends Item {
    public NorbitTheOrbitItem(Properties properties) {
        super(properties);
    }

    //YCS:useDuration:start
    @Override
    public int getUseDuration(ItemStack stack, LivingEntity entity) {
        return 1;
    }
    //YCS:useDuration:end

    //YCS:use:start
    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {
        player.startUsingItem(usedHand);
                if ((player.isCrouching())) {
          if (player instanceof Entity _tps && !level.isClientSide()) {
              AnimationAPI.stopThirdPersonAnimation(_tps);
          }
        } else {
          TickScheduler.INSTANCE.schedule((int)(40), () -> {
            if (player instanceof Entity _tpa && !level.isClientSide()) {
                AnimationAPI.triggerAnimation(_tpa,
                    AnimationCategory.ENTITY_THIRD_PERSON,
                    "tp2",
                    "yebisurpg:animations/player.animation.json",
                    1f, 0, 0, 0);
            }
            player.setDeltaMovement((double)((((player.getLookAngle().x))*(-1))), (double)((((player.getLookAngle().y))*(-1))), (double)((((player.getLookAngle().z))*(-1))));
          });
        }
        return InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
    //YCS:use:end

}