package net.ye6isu.yebisuRPG.item.custom;

import net.minecraft.server.level.ServerPlayer;
import net.ye6isu.yebisuRPG.texture.TextureServerEvents;
import net.ye6isu.yebisuRPG.texture.network.TextureSyncPayload;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Single source of truth for rebuilding the player's full overlay layer list.
 *
 * <p>Items register an {@link OverlayProvider} once (typically in their constructor
 * or a static initializer block via {@link #registerProvider}). When any overlay
 * state changes, the item calls {@link #resync(ServerPlayer)} — OverlaySync then
 * iterates all registered providers to build the combined layer list and sends it.</p>
 *
 * <p>This means items never need item-specific helpers here — each item is fully
 * self-contained and OverlaySync never needs to know what items exist.</p>
 */
public final class OverlaySync {

    private static final List<OverlayProvider> PROVIDERS = new CopyOnWriteArrayList<>();

    private OverlaySync() {}

    /**
     * Registers an overlay provider. Call this once per item type, e.g. from a
     * static initializer or {@code ModItems} registration.
     */
    public static void registerProvider(OverlayProvider provider) {
        PROVIDERS.add(provider);
    }

    /**
     * Reads the current state of every registered provider and sends one combined
     * layer list (or a clear if nothing is active).
     *
     * <p>Call this after mutating the item stack's component — the updated value
     * will already be visible when this method reads inventory state.</p>
     */
    public static void resync(ServerPlayer player) {
        List<TextureSyncPayload.LayerData> layers = new ArrayList<>();

        for (OverlayProvider provider : PROVIDERS) {
            provider.collectLayers(player, layers);
        }

        if (layers.isEmpty()) {
            TextureServerEvents.clear(player);
        } else {
            TextureServerEvents.apply(player, layers);
        }
    }
}
