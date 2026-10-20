package net.ye6isu.yebisuRPG.item.custom;

import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.ye6isu.yebisuRPG.component.ModDataComponents;
import net.ye6isu.yebisuRPG.texture.network.TextureSyncPayload;

import java.util.ArrayList;

/**
 * Walkman item — right-click toggles jacket, sneak+right-click toggles bandana.
 *
 * <p>Registers its own {@link OverlayProvider} with {@link OverlaySync} so the
 * overlay system knows about walkman layers without OverlaySync needing any
 * walkman-specific code.</p>
 */
public class WalkmanItem extends Item {

    private static final String JACKET       = "yebisurpg:textures/test/jacket.png";
    private static final String BANDANA      = "yebisurpg:textures/test/bandana.png";
    private static final String BANDANA_MASK = "yebisurpg:textures/test/bandana_shape.png";

    public static final int FLAG_JACKET  = 1;
    public static final int FLAG_BANDANA = 2;

    static {
        OverlaySync.registerProvider(WalkmanItem::collectLayers);
    }

    public WalkmanItem(Properties properties) {
        super(properties);
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);

        if (!level.isClientSide && player instanceof ServerPlayer serverPlayer) {
            int flags = stack.getOrDefault(ModDataComponents.WALKMAN_FRAME.get(), 0);

            if (player.isCrouching()) {
                flags ^= FLAG_BANDANA;
            } else {
                flags ^= FLAG_JACKET;
            }

            stack.set(ModDataComponents.WALKMAN_FRAME.get(), flags);
            stack.set(net.minecraft.core.component.DataComponents.CUSTOM_MODEL_DATA,
                new net.minecraft.world.item.component.CustomModelData((flags & FLAG_JACKET) != 0 ? 1 : 0));

            OverlaySync.resync(serverPlayer);
        }

        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide());
    }

    private static void collectLayers(ServerPlayer player,
            java.util.List<TextureSyncPayload.LayerData> layers) {
        var allSlots = new ArrayList<>(player.getInventory().items);
        allSlots.addAll(player.getInventory().offhand);
        for (ItemStack stack : allSlots) {
            if (stack.getItem() instanceof WalkmanItem) {
                int flags = stack.getOrDefault(ModDataComponents.WALKMAN_FRAME.get(), 0);
                if ((flags & FLAG_JACKET) != 0) {
                    layers.add(TextureSyncPayload.LayerData.cutoutWithMask(JACKET, 1, JACKET));
                }
                if ((flags & FLAG_BANDANA) != 0) {
                    layers.add(TextureSyncPayload.LayerData.cutoutWithMask(BANDANA, 2, BANDANA_MASK));
                }
                return; // Only one walkman counts
            }
        }
    }

    public static int getFrame(ItemStack stack) {
        return stack.getOrDefault(ModDataComponents.WALKMAN_FRAME.get(), 0);
    }
}
