package net.ye6isu.yebisuRPG.item.custom;

import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;

/**
 * ye6isu item — right-click toggles an animated flame overlay (highest priority).
 *
 * <p>The flame is a 64×256 spritesheet containing 4 frames arranged in a single column
 * (1 column × 4 rows). It uses {@code CUTOUT_BELOW} masking driven by
 * {@code flame_shape.png}, so only the shape area is painted and the skin below is
 * cut in that region. Z-index 3 ensures it renders on top of both jacket (1) and
 * bandana (2).</p>
 */
public class Ye6isuItem extends Item {

    public Ye6isuItem(Properties properties) {
        super(properties);
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);

        if (!level.isClientSide && player instanceof ServerPlayer serverPlayer) {
            int current = stack.getOrDefault(
                net.minecraft.core.component.DataComponents.CUSTOM_MODEL_DATA,
                new net.minecraft.world.item.component.CustomModelData(0)).value();
            int next = current == 0 ? 1 : 0;

            stack.set(net.minecraft.core.component.DataComponents.CUSTOM_MODEL_DATA,
                new net.minecraft.world.item.component.CustomModelData(next));

            // Delegate to OverlaySync so walkman layers are preserved
            OverlaySync.resync(serverPlayer);
        }

        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide());
    }
}
