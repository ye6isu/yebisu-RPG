package net.ye6isu.yebisuRPG.item.custom;

import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.ItemStack;
import net.ye6isu.yebisuRPG.component.ModDataComponents;
import net.ye6isu.yebisuRPG.item.ModItems;
import net.ye6isu.yebisulib.texture.TextureServerEvents;
import net.ye6isu.yebisulib.texture.network.TextureSyncPayload;

import java.util.ArrayList;
import java.util.List;

/**
 * Single source of truth for rebuilding the player's full overlay layer list.
 *
 * <p>Both {@link WalkmanItem} and {@link Ye6isuItem} delegate here after mutating
 * their own item stack state. This ensures that toggling one item never wipes the
 * layers contributed by another item — the combined active state is always sent as
 * one atomic {@link TextureServerEvents#apply} call.</p>
 */
public final class OverlaySync {

    private static final String JACKET       = "yebisurpg:textures/test/jacket.png";
    private static final String BANDANA      = "yebisurpg:textures/test/bandana.png";
    private static final String BANDANA_MASK = "yebisurpg:textures/test/bandana_shape.png";
    private static final String FLAME        = "yebisurpg:textures/test/flame.png";
    private static final String FLAME_MASK   = "yebisurpg:textures/test/flame_shape.png";

    private OverlaySync() {}

    /**
     * Reads the current toggle state of every overlay item in the player's inventory
     * and sends one combined layer list (or a clear if nothing is active).
     *
     * <p>Call this after mutating the item stack's component — the updated value will
     * already be visible when this method reads inventory state.</p>
     */
    public static void resync(ServerPlayer player) {
        List<TextureSyncPayload.LayerData> layers = new ArrayList<>();

        // ── Walkman (jacket + bandana) ───────────────────────────────────────────
        int walkmanFlags = findWalkmanFlags(player);

        if ((walkmanFlags & WalkmanItem.FLAG_JACKET) != 0) {
            layers.add(TextureSyncPayload.LayerData.cutoutWithMask(JACKET, 1, JACKET));
        }
        if ((walkmanFlags & WalkmanItem.FLAG_BANDANA) != 0) {
            layers.add(TextureSyncPayload.LayerData.cutoutWithMask(BANDANA, 2, BANDANA_MASK));
        }

        // ── Ye6isu item (flame) ──────────────────────────────────────────────────
        if (isFlameActive(player)) {
            layers.add(TextureSyncPayload.LayerData.animatedCutoutWithMask(
                FLAME, 3, FLAME_MASK, 1, 4, 4, (byte) 1));
        }

        if (layers.isEmpty()) {
            TextureServerEvents.clear(player);
        } else {
            TextureServerEvents.apply(player, layers);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    /** Returns the walkman bitmask (FLAG_JACKET | FLAG_BANDANA) from the first
     *  walkman found in the player's inventory, or 0 if none. */
    private static int findWalkmanFlags(ServerPlayer player) {
        for (ItemStack stack : player.getInventory().items) {
            if (stack.is(ModItems.WALKMAN.get())) {
                return stack.getOrDefault(ModDataComponents.WALKMAN_FRAME.get(), 0);
            }
        }
        return 0;
    }

    /** Returns true if the player has an active ye6isu item (CUSTOM_MODEL_DATA == 1). */
    private static boolean isFlameActive(ServerPlayer player) {
        for (ItemStack stack : player.getInventory().items) {
            if (stack.is(ModItems.YE6ISU.get())) {
                int v = stack.getOrDefault(
                    net.minecraft.core.component.DataComponents.CUSTOM_MODEL_DATA,
                    new net.minecraft.world.item.component.CustomModelData(0)).value();
                if (v == 1) return true;
            }
        }
        return false;
    }
}
