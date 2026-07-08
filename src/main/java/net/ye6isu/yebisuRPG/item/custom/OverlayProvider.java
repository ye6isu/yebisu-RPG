package net.ye6isu.yebisuRPG.item.custom;

import net.minecraft.server.level.ServerPlayer;
import net.ye6isu.yebisuRPG.texture.network.TextureSyncPayload;

import java.util.List;

/**
 * Functional interface for items that contribute overlay layers to the player's skin.
 *
 * <p>Implementations inspect the player's inventory state and append any currently
 * active {@link TextureSyncPayload.LayerData} entries to the provided list.
 * They must NOT clear the list — OverlaySync owns that responsibility.</p>
 *
 * <p>Register via {@link OverlaySync#registerProvider(OverlayProvider)}.</p>
 */
@FunctionalInterface
public interface OverlayProvider {
    void collectLayers(ServerPlayer player, List<TextureSyncPayload.LayerData> layers);
}
