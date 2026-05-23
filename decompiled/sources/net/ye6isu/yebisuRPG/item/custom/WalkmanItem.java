package net.ye6isu.yebisuRPG.item.custom;

import net.minecraft.core.component.DataComponentType;
import net.minecraft.core.component.DataComponents;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.component.CustomModelData;
import net.minecraft.world.level.Level;
import net.ye6isu.yebisuRPG.component.ModDataComponents;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/item/custom/WalkmanItem.class */
public class WalkmanItem extends Item {
    private static final String JACKET = "yebisurpg:textures/test/jacket.png";
    private static final String BANDANA = "yebisurpg:textures/test/bandana.png";
    private static final String BANDANA_MASK = "yebisurpg:textures/test/bandana_shape.png";
    static final int FLAG_JACKET = 1;
    static final int FLAG_BANDANA = 2;

    public WalkmanItem(Item.Properties properties) {
        super(properties);
    }

    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        int flags;
        ItemStack stack = player.getItemInHand(hand);
        if (!level.isClientSide && (player instanceof ServerPlayer)) {
            ServerPlayer serverPlayer = (ServerPlayer) player;
            int flags2 = ((Integer) stack.getOrDefault((DataComponentType) ModDataComponents.WALKMAN_FRAME.get(), 0)).intValue();
            if (player.isCrouching()) {
                flags = flags2 ^ 2;
            } else {
                flags = flags2 ^ 1;
            }
            stack.set((DataComponentType) ModDataComponents.WALKMAN_FRAME.get(), Integer.valueOf(flags));
            stack.set(DataComponents.CUSTOM_MODEL_DATA, new CustomModelData((flags & 1) != 0 ? 1 : 0));
            sendLayers(serverPlayer, flags);
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide());
    }

    private static void sendLayers(ServerPlayer player, int flags) {
        OverlaySync.resync(player);
    }

    public static int getFrame(ItemStack stack) {
        return ((Integer) stack.getOrDefault((DataComponentType) ModDataComponents.WALKMAN_FRAME.get(), 0)).intValue();
    }
}
