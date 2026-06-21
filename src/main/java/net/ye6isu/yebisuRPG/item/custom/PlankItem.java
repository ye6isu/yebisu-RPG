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
import net.minecraft.world.item.UseAnim;
import net.minecraft.world.entity.Entity;
import net.ye6isu.yebisuRPG.animation.AnimationAPI;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.util.AoeShapes;
import net.ye6isu.yebisuRPG.data.EntityVarCapability;
import net.ye6isu.yebisuRPG.data.EntityVar;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.food.FoodProperties;
import net.minecraft.core.component.DataComponents;
import net.minecraft.world.item.component.CustomModelData;
//YCS_Import_END

public class PlankItem extends Item {
    
    public PlankItem(Properties properties) {
        super(properties);
    }

    //YCS:useDuration:start
    @Override
    public int getUseDuration(ItemStack stack, LivingEntity entity) {
        return 7200;
    }
    //YCS:useDuration:end

    //YCS:useAnimation:start
    @Override
    public UseAnim getUseAnimation(ItemStack stack) {
        return UseAnim.BOW;
    }
    //YCS:useAnimation:end

    //YCS:continuousUse:start
    @Override
    public void onUseTick(Level level, LivingEntity livingEntity, ItemStack stack, int remainingUseDuration) {
                if ((!((livingEntity instanceof net.minecraft.world.entity.player.Player _cdq && _cdq.getCooldowns().isOnCooldown(stack.getItem()))))) {
        }
    }
    //YCS:continuousUse:end

    //YCS:releaseUsing:start
    @Override
    public void releaseUsing(ItemStack stack, Level level, LivingEntity livingEntity, int timeCharged) {
                if ((!((livingEntity instanceof net.minecraft.world.entity.player.Player _cdq && _cdq.getCooldowns().isOnCooldown(stack.getItem()))))) {
          livingEntity.setDeltaMovement((double)((((livingEntity.getLookAngle().x))*((((stack.getUseDuration(livingEntity) - timeCharged))/(1))))), (double)((((livingEntity.getLookAngle().y))*((((stack.getUseDuration(livingEntity) - timeCharged))/(1))))), (double)((((livingEntity.getLookAngle().z))*((((stack.getUseDuration(livingEntity) - timeCharged))/(1))))));
          if (livingEntity instanceof net.minecraft.world.entity.player.Player _cdp) { _cdp.getCooldowns().addCooldown(stack.getItem(), (int)((double)(20))); }
        }
    }
    //YCS:releaseUsing:end

    //YCS:use:start
    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {
        player.startUsingItem(usedHand);
                // (empty)
        return InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
    //YCS:use:end

}