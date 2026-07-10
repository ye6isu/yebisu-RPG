package net.ye6isu.yebisuRPG.item.custom;

import net.minecraft.network.chat.Component;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.ye6isu.yebisuRPG.component.ModDataComponents;
import net.ye6isu.yebisuRPG.texture.TextureServerEvents;
import net.ye6isu.yebisuRPG.util.AoeShapes;
import net.ye6isu.yebisuRPG.util.DashUtil;

public class AeeeeItem extends Item {
    public AeeeeItem(Properties properties) {
        super(properties);
    }
    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {
        player.startUsingItem(usedHand);
        DashUtil.start(player, (double)((player.getLookAngle().x)), (double)((player.getLookAngle().y)), (double)((player.getLookAngle().z)), (double)(10), (int)((double)(5)), DashUtil.Easing.EASE_OUT, (_dashSrc, hitEntity) -> {
    hitEntity.setDeltaMovement((double)(0), (double)(1), (double)(0));
}, null, "box", (double)(3), (double)(3), (double)(3), false);
        return InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
    @Override
    public void inventoryTick(ItemStack stack, Level level, Entity entity, int slotId, boolean isSelected) {
        if ((net.minecraft.world.item.ItemStack.isSameItem((((net.minecraft.world.entity.LivingEntity)entity).getMainHandItem()), stack))) {
              if (entity instanceof Player chatPlayer) {
              chatPlayer.sendSystemMessage(Component.literal("handhand"));
              }
            } else if ((net.minecraft.world.item.ItemStack.isSameItem((((net.minecraft.world.entity.LivingEntity)entity).getOffhandItem()), stack))) {
              if (entity instanceof Player chatPlayer) {
              chatPlayer.sendSystemMessage(Component.literal("offhand"));
              }
        }
    }
    @Override
    public boolean hurtEnemy(ItemStack stack, LivingEntity target, LivingEntity attacker) {
        TextureServerEvents.setLayer(target, new net.ye6isu.yebisuRPG.texture.network.TextureSyncPayload.LayerData("yebisurpg:textures/overlay/petrified.png", (int)(0), (byte)2, "", "", 1, 1, false, (byte)0, 4, 0L, 1f, 0), false);
        return super.hurtEnemy(stack, target, attacker);
    }
    @Override
    public InteractionResult interactLivingEntity(ItemStack stack, Player player, LivingEntity interactionTarget, InteractionHand usedHand) {
        TextureServerEvents.removeByTexture(interactionTarget, "yebisurpg:textures/overlay/flame.png");
        return super.interactLivingEntity(stack, player, interactionTarget, usedHand);
    }
}
