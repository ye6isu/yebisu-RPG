package net.ye6isu.yebisuRPG.item.custom;

import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.ye6isu.yebisuRPG.util.DashUtil;

public class GunItem extends Item {
    public GunItem(Properties properties) {
        super(properties);
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {
        player.startUsingItem(usedHand);
        //YCS:use:body_START
        //YCS:use:body_END
        return InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }

    @Override
    public void onUseTick(Level level, LivingEntity livingEntity, ItemStack stack, int remainingUseDuration) {
        //YCS:continuousUse:body_START
        //YCS:continuousUse:body_END
    }

    @Override
    public void releaseUsing(ItemStack stack, Level level, LivingEntity livingEntity, int timeCharged) {
        //YCS:releaseUsing:body_START
        DashUtil.start(livingEntity, (double)((livingEntity.getLookAngle().x)), (double)((livingEntity.getLookAngle().y)), (double)((livingEntity.getLookAngle().z)), (double)(10), (int)((double)(5)), DashUtil.Easing.EASE_OUT, null, null, "sphere", (double)(1.5), (double)(0), (double)(0), false);
        //YCS:releaseUsing:body_END
    }
}
