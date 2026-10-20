package net.ye6isu.yebisuRPG.item.custom;

import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.level.Level;
import net.ye6isu.yebisuRPG.texture.network.TextureSyncPayload;

import java.util.ArrayList;
import java.util.List;

/**
 * ye6isu item — right-click toggles animated flame overlay.
 *
 * <p>Registers its own {@link OverlayProvider} with {@link OverlaySync} so the
 * overlay system knows about flame layers without OverlaySync needing any
 * ye6isu-specific code.</p>
 */
public class Ye6isuItem extends Item {

    private static final String FLAME          = "yebisurpg:textures/test/flame.png";
    private static final String FLAME_MASK     = "yebisurpg:textures/test/flame_shape.png";
    private static final String FLAME_EMISSIVE = "yebisurpg:textures/test/flame_emissive.png";

    static {
        OverlaySync.registerProvider(Ye6isuItem::collectLayers);
    }

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

            stack.set(net.minecraft.core.component.DataComponents.CUSTOM_MODEL_DATA,
                new net.minecraft.world.item.component.CustomModelData(current == 0 ? 1 : 0));

            OverlaySync.resync(serverPlayer);
        }

        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide());
    }

    private static void collectLayers(ServerPlayer player, List<TextureSyncPayload.LayerData> layers) {
        var allSlots = new ArrayList<>(player.getInventory().items);
        allSlots.addAll(player.getInventory().offhand);
        for (ItemStack stack : allSlots) {
            if (stack.getItem() instanceof Ye6isuItem) {
                int v = stack.getOrDefault(
                    net.minecraft.core.component.DataComponents.CUSTOM_MODEL_DATA,
                    new net.minecraft.world.item.component.CustomModelData(0)).value();
                if (v == 1) {
                    layers.add(TextureSyncPayload.LayerData.animatedCutoutWithMaskAndEmissive(
                        FLAME, 3, FLAME_MASK, FLAME_EMISSIVE, 1, 4, 4, (byte) 1));
                }
                return;
            }
        }
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context,
            List<Component> tooltipComponents, TooltipFlag tooltipFlag) {
        if (Screen.hasShiftDown()) {
            tooltipComponents.add(Component.translatable("tooltip.yebisurpg.ye6isu.shift_down"));
        } else {
            tooltipComponents.add(Component.translatable("tooltip.yebisurpg.ye6isu"));
        }
        super.appendHoverText(stack, context, tooltipComponents, tooltipFlag);
    }
}
