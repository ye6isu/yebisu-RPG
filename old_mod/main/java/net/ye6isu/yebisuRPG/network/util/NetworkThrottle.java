package net.ye6isu.yebisuRPG.network.util;

import net.minecraft.server.level.ServerPlayer;
import net.ye6isu.yebisuRPG.network.BasePayload;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

public final class NetworkThrottle<T extends BasePayload> {

    private final long intervalMs;
    private final ConcurrentHashMap<UUID, Long> lastSent = new ConcurrentHashMap<>();

    public NetworkThrottle(long intervalMs) {
        if (intervalMs < 1) throw new IllegalArgumentException("intervalMs must be >= 1");
        this.intervalMs = intervalMs;
    }

    public void send(ServerPlayer player, Supplier<T> payloadSupplier) {
        long now = System.currentTimeMillis();
        UUID id = player.getUUID();
        Long prev = lastSent.get(id);
        if (prev != null && (now - prev) < intervalMs) return;
        lastSent.put(id, now);
        NetworkUtils.sendToPlayer(player, payloadSupplier.get());
    }

    public void invalidate(ServerPlayer player) { lastSent.remove(player.getUUID()); }
    public void remove(ServerPlayer player) { lastSent.remove(player.getUUID()); }
    public void clear() { lastSent.clear(); }
}
