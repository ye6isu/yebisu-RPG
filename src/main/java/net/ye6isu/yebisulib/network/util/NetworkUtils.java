package net.ye6isu.yebisulib.network.util;

import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.level.ChunkPos;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.neoforged.neoforge.network.PacketDistributor;
import net.ye6isu.yebisulib.network.BasePayload;

/**
 * Thin, allocation-free wrappers around {@link PacketDistributor}.
 *
 * <p>All server-side methods are safe to call on the main game thread.
 * {@link #sendToServer} is {@code @OnlyIn(CLIENT)} — a compile-time guard
 * that prevents it from being called on a dedicated server.</p>
 *
 * <h2>Choosing the right method for 100+ players</h2>
 * <ul>
 *   <li><b>Per-player data</b> (energy, stats, ability cooldowns) →
 *       {@link #sendToPlayer}. One packet per affected player; never broadcast.</li>
 *   <li><b>Entity-tied effects</b> (animations, VFX) →
 *       {@link #sendToPlayersTracking} or {@link #sendToPlayersTrackingAndSelf}.
 *       Only reaches players whose client already knows about the entity.</li>
 *   <li><b>Area events</b> (explosions, AOE abilities) →
 *       {@link #sendToPlayersTrackingChunk} or {@link #sendToPlayersNear}.
 *       Prefer chunk-tracking; radius-scan iterates all players in the dimension.</li>
 *   <li><b>Global announcements</b> → {@link #sendToAllPlayers}.
 *       Use sparingly — sends to every connected player.</li>
 *   <li><b>High-frequency data</b> (energy draining every tick) →
 *       wrap calls with {@link NetworkThrottle} to avoid flooding 100+ clients.</li>
 * </ul>
 */
public final class NetworkUtils {

    private NetworkUtils() {}

    // ---------------------------------------------------------------------------------
    // Client → Server
    // ---------------------------------------------------------------------------------

    /** Sends a payload from the client to the server. Max 32 KiB. */
    @OnlyIn(Dist.CLIENT)
    public static <T extends BasePayload> void sendToServer(T payload) {
        PacketDistributor.sendToServer(payload);
    }

    // ---------------------------------------------------------------------------------
    // Server → specific target(s)
    // ---------------------------------------------------------------------------------

    /** Sends to one player. Prefer this over broadcast for per-player data. */
    public static <T extends BasePayload> void sendToPlayer(ServerPlayer player, T payload) {
        PacketDistributor.sendToPlayer(player, payload);
    }

    /**
     * Sends to all players tracking {@code entity} — i.e. players whose client
     * already knows the entity exists (within render distance, same dimension).
     * This is the most efficient choice for entity-specific syncs.
     */
    public static <T extends BasePayload> void sendToPlayersTracking(Entity entity, T payload) {
        PacketDistributor.sendToPlayersTrackingEntity(entity, payload);
    }

    /**
     * Like {@link #sendToPlayersTracking} but also sends to {@code entity} itself
     * if it is a player. Use for animations/VFX the actor should also see.
     */
    public static <T extends BasePayload> void sendToPlayersTrackingAndSelf(Entity entity, T payload) {
        PacketDistributor.sendToPlayersTrackingEntityAndSelf(entity, payload);
    }

    /**
     * Sends to all players tracking a chunk. Preferred over radius-scan for
     * block-level or area events because the tracking set is pre-computed by the server.
     */
    public static <T extends BasePayload> void sendToPlayersTrackingChunk(
            ServerLevel level, ChunkPos chunkPos, T payload) {
        PacketDistributor.sendToPlayersTrackingChunk(level, chunkPos, payload);
    }

    /**
     * Sends to all players in {@code level} within {@code radius} blocks of (x, y, z).
     *
     * <p><b>Cost:</b> O(players in dimension). For large servers prefer
     * {@link #sendToPlayersTrackingChunk} when the area maps to a chunk.</p>
     */
    public static <T extends BasePayload> void sendToPlayersNear(
            ServerLevel level, double x, double y, double z, double radius, T payload) {
        double r2 = radius * radius;
        for (ServerPlayer p : level.players()) {
            if (p.distanceToSqr(x, y, z) <= r2) {
                PacketDistributor.sendToPlayer(p, payload);
            }
        }
    }

    /** Sends to every connected player. Use sparingly on large servers. */
    public static <T extends BasePayload> void sendToAllPlayers(T payload) {
        PacketDistributor.sendToAllPlayers(payload);
    }

    /** Sends to every player in {@code level} (one dimension only). */
    public static <T extends BasePayload> void sendToPlayersInDimension(
            ServerLevel level, T payload) {
        for (ServerPlayer p : level.players()) {
            PacketDistributor.sendToPlayer(p, payload);
        }
    }
}
