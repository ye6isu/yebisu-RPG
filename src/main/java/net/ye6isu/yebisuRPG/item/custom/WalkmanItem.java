package net.ye6isu.yebisuRPG.item.custom;

import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.Mth;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;

public class WalkmanItem extends Item {
    public WalkmanItem(Properties properties) {
        super(properties);
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack itemstack = player.getItemInHand(hand);

        if (!level.isClientSide) {
            for (int i = 0; i < 16; i++) {
                double d0 = player.getX() + (player.getRandom().nextDouble() - 0.5) * 16.0;
                double d1 = Mth.clamp(
                        player.getY() + (double)(player.getRandom().nextInt(16) - 8),
                        (double)level.getMinBuildHeight(),
                        (double)(level.getMinBuildHeight() + ((ServerLevel)level).getLogicalHeight() - 1)
                );
                double d2 = player.getZ() + (player.getRandom().nextDouble() - 0.5) * 16.0;

                if (player.isPassenger()) {
                    player.stopRiding();
                }

                if (player.randomTeleport(d0, d1, d2, true)) {
                    break;
                }
            }
        }

        // Returns sidedSuccess to play the hand-swing animation and handle client/server syncing
        return InteractionResultHolder.sidedSuccess(itemstack, level.isClientSide());
    }
}
