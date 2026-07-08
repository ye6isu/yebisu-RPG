package net.ye6isu.yebisuRPG.item.custom;

import net.minecraft.network.chat.Component;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.ye6isu.yebisuRPG.component.ModDataComponents;

public class AxerItem extends Item {
    public AxerItem(Properties properties) {
        super(properties);
    }
    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {
        player.startUsingItem(usedHand);
        if ((player.isCrouching())) {
              player.getItemInHand(usedHand).set(ModDataComponents.AXER_TESTNUM.get(), (double)((((player.getItemInHand(usedHand).getOrDefault(ModDataComponents.AXER_TESTNUM.get(), 0.0)))+(1))));
            } else {
              player.getItemInHand(usedHand).set(ModDataComponents.AXER_TESTNUM.get(), (double)((((player.getItemInHand(usedHand).getOrDefault(ModDataComponents.AXER_TESTNUM.get(), 0.0)))-(1))));
        }
        if (player instanceof Player chatPlayer) {
            chatPlayer.sendSystemMessage(Component.literal(String.valueOf((double)((player.getItemInHand(usedHand).getOrDefault(ModDataComponents.AXER_TESTNUM.get(), 0.0))))));
        }
        return InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
}
