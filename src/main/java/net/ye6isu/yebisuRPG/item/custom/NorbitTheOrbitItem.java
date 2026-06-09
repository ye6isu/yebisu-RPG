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
//YCS_Import_END

public class NorbitTheOrbitItem extends Item {
    public NorbitTheOrbitItem(Properties properties) {
        super(properties);
    }

    //YCS:useDuration:start
    @Override
    public int getUseDuration(ItemStack stack, net.minecraft.world.entity.LivingEntity entity) {
        return 100;
    }
    //YCS:useDuration:end

    //YCS:continuousUse:start
    @Override
    public void onUseTick(Level level, LivingEntity livingEntity, ItemStack stack, int remainingUseDuration) {
                // (empty)
    }
    //YCS:continuousUse:end

    //YCS:use:start
    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {
        player.startUsingItem(usedHand);
                // (empty)
        return net.minecraft.world.InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
    //YCS:use:end

    //YCS:useAnimation:start
    @Override
    public net.minecraft.world.item.UseAnim getUseAnimation(ItemStack stack) {
        return net.minecraft.world.item.UseAnim.BOW;
    }
    //YCS:useAnimation:end

    //YCS:releaseUsing:start
    @Override
    public void releaseUsing(ItemStack stack, Level level, LivingEntity livingEntity, int timeCharged) {
                // (empty)
    }
    //YCS:releaseUsing:end

    //YCS:finishUsingItem:start
    @Override
    public ItemStack finishUsingItem(ItemStack stack, Level level, LivingEntity livingEntity) {
                LivingEntity eventEntity = livingEntity;
        if (eventEntity instanceof net.minecraft.world.entity.LivingEntity _et) { _et.addEffect(new net.minecraft.world.effect.MobEffectInstance(MobEffects.LEVITATION, (int)(10), Math.max(0,(int)(64.1f)-1))); }
        return super.finishUsingItem(stack, level, livingEntity);
    }
    //YCS:finishUsingItem:end

}