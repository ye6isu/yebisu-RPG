package net.ye6isu.yebisuRPG.item.custom;

import net.minecraft.core.component.DataComponents;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.component.CustomModelData;
import net.minecraft.world.level.Level;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/item/custom/Ye6isuItem.class */
public class Ye6isuItem extends Item {
    public Ye6isuItem(Item.Properties properties) {
        super(properties);
    }

    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (!level.isClientSide && (player instanceof ServerPlayer)) {
            ServerPlayer serverPlayer = (ServerPlayer) player;
            int current = ((CustomModelData) stack.getOrDefault(DataComponents.CUSTOM_MODEL_DATA, new CustomModelData(0))).value();
            int next = current == 0 ? 1 : 0;
            stack.set(DataComponents.CUSTOM_MODEL_DATA, new CustomModelData(next));
            OverlaySync.resync(serverPlayer);
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide());
    }
}
