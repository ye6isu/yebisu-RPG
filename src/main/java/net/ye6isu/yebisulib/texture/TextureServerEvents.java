package net.ye6isu.yebisulib.texture;

import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.entity.player.PlayerEvent;
import net.neoforged.neoforge.event.level.LevelEvent;
import net.ye6isu.yebisulib.network.util.NetworkUtils;
import net.ye6isu.yebisulib.texture.network.TextureSyncPayload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Server-side texture sync event handlers.
 *
 * <h2>Applying an overlay</h2>
 * <p>Always use {@link #apply} and {@link #clear} rather than calling
 * {@link TextureAuthority} and {@link NetworkUtils} separately. These methods
 * handle both persistence and broadcast to all currently-tracking players in
 * one call.</p>
 *
 * <pre>{@code
 * // Apply jacket to a player — persisted + broadcast to all nearby players
 * TextureServerEvents.apply(serverPlayer, layers);
 *
 * // Remove it
 * TextureServerEvents.clear(serverPlayer);
 * }</pre>
 *
 * <h2>Two sync paths on join</h2>
 * <ul>
 *   <li>{@code PlayerLoggedInEvent} — player's own overlay (StartTracking never
 *       fires for the player's own entity).</li>
 *   <li>{@code StartTracking} — other entities entering the player's view.</li>
 * </ul>
 */
@EventBusSubscriber(modid = "yebisurpg")
public final class TextureServerEvents {

    private static final Logger LOGGER = LoggerFactory.getLogger(TextureServerEvents.class);

    private TextureServerEvents() {}

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Applies a texture stack to an entity, persists it in {@link TextureAuthority},
     * and broadcasts the update to all players currently tracking the entity.
     *
     * <p>This is the correct single call-site for applying any overlay.
     * Do not call {@link TextureAuthority} and {@link NetworkUtils} separately.</p>
     *
     * @param entity the entity to apply the overlay to
     * @param layers the layers to apply
     */
    public static void apply(net.minecraft.world.entity.Entity entity,
                             List<TextureSyncPayload.LayerData> layers) {
        if (!(entity.level() instanceof ServerLevel sl)) return;
        TextureAuthority.get(sl).put(entity.getUUID(), layers);
        NetworkUtils.sendToPlayersTrackingAndSelf(entity,
            new TextureSyncPayload(entity.getId(), layers));
    }

    /**
     * Clears the texture stack for an entity, removes it from {@link TextureAuthority},
     * and broadcasts the removal to all players currently tracking the entity.
     *
     * @param entity the entity whose overlay should be removed
     */
    public static void clear(net.minecraft.world.entity.Entity entity) {
        if (!(entity.level() instanceof ServerLevel sl)) return;
        TextureAuthority.get(sl).remove(entity.getUUID());
        NetworkUtils.sendToPlayersTrackingAndSelf(entity,
            new TextureSyncPayload(entity.getId(), List.of()));
    }

    // ─── Path 1: player's own texture on login ────────────────────────────────

    @SubscribeEvent
    public static void onPlayerLogin(PlayerEvent.PlayerLoggedInEvent event) {
        if (!(event.getEntity() instanceof ServerPlayer joining)) return;

        List<TextureSyncPayload.LayerData> layers =
            TextureAuthority.get(joining.getServer().overworld())
                .getAll().get(joining.getUUID());

        if (layers == null || layers.isEmpty()) return;

        LOGGER.debug("[TextureSync] Self-sync on login: player={} id={} layers={}",
            joining.getName().getString(), joining.getId(), layers.size());

        NetworkUtils.sendToPlayer(joining,
            new TextureSyncPayload(joining.getId(), layers));
    }

    // ─── Path 2: other entities entering the player's view ───────────────────

    @SubscribeEvent
    public static void onStartTracking(PlayerEvent.StartTracking event) {
        if (!(event.getEntity() instanceof ServerPlayer observer)) return;

        Entity tracked = event.getTarget();
        UUID uuid = tracked.getUUID();

        List<TextureSyncPayload.LayerData> layers =
            TextureAuthority.get(observer.getServer().overworld())
                .getAll().get(uuid);

        if (layers == null || layers.isEmpty()) return;

        LOGGER.debug("[TextureSync] StartTracking: observer={} tracked={} id={} layers={}",
            observer.getName().getString(),
            tracked.getName().getString(),
            tracked.getId(),
            layers.size());

        NetworkUtils.sendToPlayer(observer,
            new TextureSyncPayload(tracked.getId(), layers));
    }
}
