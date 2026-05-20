package net.ye6isu.yebisuRPG.item.custom;

import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.ye6isu.yebisuRPG.component.ModDataComponents;

/**
 * Walkman item.
 *
 * <h2>Right-click behaviour</h2>
 * <ul>
 *   <li>Normal right-click — toggles jacket overlay (zIndex=1, CUTOUT_BELOW).
 *       Re-sends the full current layer list each time so both jacket and any
 *       active bandana are kept in sync.</li>
 *   <li>Sneak + right-click — toggles bandana overlay (zIndex=2, CUTOUT_BELOW
 *       masked by bandana_shape.png). Re-sends combined layer list.</li>
 * </ul>
 */
public class WalkmanItem extends Item {

    private static final String JACKET       = "yebisurpg:textures/test/jacket.png";
    private static final String BANDANA      = "yebisurpg:textures/test/bandana.png";
    private static final String BANDANA_MASK = "yebisurpg:textures/test/bandana_shape.png";

    // Data component bit flags — package-visible so OverlaySync can read them
    static final int FLAG_JACKET  = 1;
    static final int FLAG_BANDANA = 2;

    public WalkmanItem(Properties properties) {
        super(properties);
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);

        if (!level.isClientSide && player instanceof ServerPlayer serverPlayer) {
            int flags = stack.getOrDefault(ModDataComponents.WALKMAN_FRAME.get(), 0);

            if (player.isCrouching()) {
                // Sneak + right-click: toggle bandana
                flags ^= FLAG_BANDANA;
            } else {
                // Normal right-click: toggle jacket
                flags ^= FLAG_JACKET;
            }

            stack.set(ModDataComponents.WALKMAN_FRAME.get(), flags);
            // Mirror jacket state in CustomModelData for item model switching
            stack.set(net.minecraft.core.component.DataComponents.CUSTOM_MODEL_DATA,
                new net.minecraft.world.item.component.CustomModelData((flags & FLAG_JACKET) != 0 ? 1 : 0));

            // Build layer list from current flags and send
            sendLayers(serverPlayer, flags);
        }

        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide());
    }

    private static void sendLayers(ServerPlayer player, int flags) {
        // Delegate to OverlaySync so flame layers from Ye6isuItem are preserved
        OverlaySync.resync(player);
    }

    public static int getFrame(ItemStack stack) {
        return stack.getOrDefault(ModDataComponents.WALKMAN_FRAME.get(), 0);
    }
}

