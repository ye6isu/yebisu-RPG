package net.ye6isu.yebisuRPG.item.custom;

import net.minecraft.network.chat.Component;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.ye6isu.yebisuRPG.entityvar.ModAttachments;

public class AeeeeItem extends Item {
    public AeeeeItem(Properties properties) {
        super(properties);
    }
    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {
        player.startUsingItem(usedHand);
        if ((player.isCrouching())) {
              player.setData(ModAttachments.COUNTER.get(), (double)(20));
            } else {
              player.setData(ModAttachments.COUNTER.get(), (double)(4));
        }
        return InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
    @Override
    public boolean hurtEnemy(ItemStack stack, LivingEntity target, LivingEntity attacker) {
        return super.hurtEnemy(stack, target, attacker);
    }
    @Override
    public InteractionResult interactLivingEntity(ItemStack stack, Player player, LivingEntity interactionTarget, InteractionHand usedHand) {
        if (player instanceof Player chatPlayer_nr3acrly) {
            chatPlayer_nr3acrly.sendSystemMessage(Component.literal(String.format("%.0f", (double)((interactionTarget instanceof LivingEntity livingTarget_nghbwu1j ? livingTarget_nghbwu1j.getHealth() : 0.0)))).append(Component.literal(" / ").append(Component.literal(String.format("%.0f", (double)((interactionTarget instanceof LivingEntity livingTarget_n79gwi0u ? livingTarget_n79gwi0u.getAttributeValue(Attributes.MAX_HEALTH) : 0.0)))))));
        }
        return super.interactLivingEntity(stack, player, interactionTarget, usedHand);
    }
}
