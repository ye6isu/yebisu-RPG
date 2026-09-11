package net.ye6isu.yebisuRPG.item.custom;

import java.util.List;
import net.minecraft.network.chat.Component;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.Item.TooltipContext;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Tier;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.item.UseAnim;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.Level;
import net.ye6isu.yebisuRPG.util.DashUtil;
import net.ye6isu.yebisuRPG.util.ProjectileUtil;

public class CatItem extends Item {
    public CatItem(Properties properties) { super(properties); }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {
        player.startUsingItem(usedHand);
        if (player.isCrouching()) {
            if (!level.isClientSide()) { player.setDeltaMovement(((player.getLookAngle().x) * (4)), ((player.getLookAngle().y) * (4)), ((player.getLookAngle().z) * (4))); player.hurtMarked = true; }
        } else {
            DashUtil.start(player, player.getLookAngle().x, player.getLookAngle().y, player.getLookAngle().z, 20, (int)(5), DashUtil.Easing.EASE_OUT, null, null, "sphere", 1.5, 0, 0, false);
        }
        return InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
 }
