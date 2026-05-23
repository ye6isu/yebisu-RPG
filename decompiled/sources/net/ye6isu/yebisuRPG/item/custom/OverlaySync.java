package net.ye6isu.yebisuRPG.item.custom;

import java.util.ArrayList;
import java.util.List;
import net.minecraft.core.component.DataComponentType;
import net.minecraft.core.component.DataComponents;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.component.CustomModelData;
import net.ye6isu.yebisuRPG.component.ModDataComponents;
import net.ye6isu.yebisuRPG.item.ModItems;
import net.ye6isu.yebisulib.texture.TextureServerEvents;
import net.ye6isu.yebisulib.texture.network.TextureSyncPayload;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/item/custom/OverlaySync.class */
public final class OverlaySync {
    private static final String JACKET = "yebisurpg:textures/test/jacket.png";
    private static final String BANDANA = "yebisurpg:textures/test/bandana.png";
    private static final String BANDANA_MASK = "yebisurpg:textures/test/bandana_shape.png";
    private static final String FLAME = "yebisurpg:textures/test/flame.png";
    private static final String FLAME_MASK = "yebisurpg:textures/test/flame_shape.png";
    private static final String FLAME_EMISSIVE = "yebisurpg:textures/test/flame_emissive.png";

    private OverlaySync() {
    }

    public static void resync(ServerPlayer player) {
        List<TextureSyncPayload.LayerData> layers = new ArrayList<>();
        int walkmanFlags = findWalkmanFlags(player);
        if ((walkmanFlags & 1) != 0) {
            layers.add(TextureSyncPayload.LayerData.cutoutWithMask(JACKET, 1, JACKET));
        }
        if ((walkmanFlags & 2) != 0) {
            layers.add(TextureSyncPayload.LayerData.cutoutWithMask(BANDANA, 2, BANDANA_MASK));
        }
        if (isFlameActive(player)) {
            layers.add(TextureSyncPayload.LayerData.animatedCutoutWithMaskAndEmissive(FLAME, 3, FLAME_MASK, FLAME_EMISSIVE, 1, 4, 4, (byte) 1));
        }
        if (layers.isEmpty()) {
            TextureServerEvents.clear(player);
        } else {
            TextureServerEvents.apply(player, layers);
        }
    }

    private static int findWalkmanFlags(ServerPlayer player) {
        for (ItemStack stack : player.getInventory().items) {
            if (stack.is((Item) ModItems.WALKMAN.get())) {
                return ((Integer) stack.getOrDefault((DataComponentType) ModDataComponents.WALKMAN_FRAME.get(), 0)).intValue();
            }
        }
        return 0;
    }

    private static boolean isFlameActive(ServerPlayer player) {
        for (ItemStack stack : player.getInventory().items) {
            if (stack.is((Item) ModItems.YE6ISU.get())) {
                int v = ((CustomModelData) stack.getOrDefault(DataComponents.CUSTOM_MODEL_DATA, new CustomModelData(0))).value();
                if (v == 1) {
                    return true;
                }
            }
        }
        return false;
    }
}
