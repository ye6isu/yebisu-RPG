package net.ye6isu.yebisulib.network.util;

import net.minecraft.server.level.ServerPlayer;
import net.ye6isu.yebisulib.network.BasePayload;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Per-player send-rate limiter for high-frequency payloads.
 *
 * <p>On a server with 100+ players, blindly syncing every tick means:
 * 100 players × 20 packets/s = 2 000 packets/s per payload type. At even
 * 32 bytes each that is 64 KB/s of overhead for one stat. {@code NetworkThrottle}
 * collapses repeated sends into at most one send per {@code intervalMs}, sending
 * only the <em>latest</em> value rather than every intermediate update.</p>
 *
 * <h2>Typical usage — energy bar</h2>
 * <pre>{@code
 * // Created once, stored in your system class (or as a static field):
 * private static final NetworkThrottle<EnergySyncPayload> ENERGY_THROTTLE =
 *     new NetworkThrottle<>(100); // at most once per 100 ms (= 2 ticks)
 *
 * // Called every time energy changes (could be every tick):
 * ENERGY_THROTTLE.send(serverPlayer,
 *     () -> new EnergySyncPayload(player.getEnergy(), player.getMaxEnergy()));
 * }</pre>
 *
 * <h2>How it works</h2>
 * <p>A {@link ConcurrentHashMap} keyed by player UUID tracks the last send timestamp
 * per player. If {@code System.currentTimeMillis() - lastSent < intervalMs} the call
 * is a no-op. Otherwise the payload supplier is invoked, the packet is sent, and the
 * timestamp is updated. The supplier is only called when a send will actually happen,
 * so payload construction is free on suppressed ticks.</p>
 *
 * <h2>Thread safety</h2>
 * <p>Safe to call from the main game thread (typical) and from the network thread
 * (if the registrar is configured with {@code HandlerThread.NETWORK}). The internal
 * map uses {@link ConcurrentHashMap}; timestamp updates use a non-atomic long which
 * is acceptable here — a race between two ticks at most causes one extra packet, not
 * data corruption.</p>
 *
 * <h2>Cleanup</h2>
 * <p>Call {@link #remove(ServerPlayer)} when a player disconnects to prevent the map
 * from growing unboundedly. If your system already tracks disconnect events this is
 * one line. Alternatively, call {@link #clear()} when the server stops.</p>
 *
 * @param <T> the payload type this throttle manages
 */
public final class NetworkThrottle<T extends BasePayload> {

    private final long intervalMs;
    private final ConcurrentHashMap<UUID, Long> lastSent = new ConcurrentHashMap<>();

    /**
     * @param intervalMs minimum milliseconds between sends per player.
     *                   50 ms = every tick, 100 ms = every 2 ticks (recommended for stats),
     *                   500 ms = every 10 ticks (fine for less urgent data).
     */
    public NetworkThrottle(long intervalMs) {
        if (intervalMs < 1) throw new IllegalArgumentException("intervalMs must be >= 1");
        this.intervalMs = intervalMs;
    }

    /**
     * Sends {@code payloadSupplier.get()} to {@code player} if the throttle interval
     * has elapsed since the last send to that player. Otherwise does nothing.
     *
     * <p>The supplier is only invoked when the packet will actually be sent,
     * so constructing the payload object costs nothing on suppressed calls.</p>
     *
     * @param player          the target player
     * @param payloadSupplier produces the payload; called at most once per interval
     */
    public void send(ServerPlayer player, Supplier<T> payloadSupplier) {
        long now = System.currentTimeMillis();
        UUID id = player.getUUID();
        Long prev = lastSent.get(id);
        if (prev != null && (now - prev) < intervalMs) return;
        lastSent.put(id, now);
        NetworkUtils.sendToPlayer(player, payloadSupplier.get());
    }

    /**
     * Forces the next call to {@link #send} for {@code player} to go through,
     * regardless of the throttle interval. Useful when a value changes
     * significantly (e.g. player levels up) and you want an immediate sync.
     */
    public void invalidate(ServerPlayer player) {
        lastSent.remove(player.getUUID());
    }

    /**
     * Removes the tracking entry for {@code player}.
     * Call this on player disconnect to avoid memory leaks.
     */
    public void remove(ServerPlayer player) {
        lastSent.remove(player.getUUID());
    }

    /** Clears all tracking entries. Call on server stop. */
    public void clear() {
        lastSent.clear();
    }
}
