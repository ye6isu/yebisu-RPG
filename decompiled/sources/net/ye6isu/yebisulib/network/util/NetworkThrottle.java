package net.ye6isu.yebisulib.network.util;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;
import net.minecraft.server.level.ServerPlayer;
import net.ye6isu.yebisulib.network.BasePayload;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/network/util/NetworkThrottle.class */
public final class NetworkThrottle<T extends BasePayload> {
    private final long intervalMs;
    private final ConcurrentHashMap<UUID, Long> lastSent = new ConcurrentHashMap<>();

    public NetworkThrottle(long intervalMs) {
        if (intervalMs < 1) {
            throw new IllegalArgumentException("intervalMs must be >= 1");
        }
        this.intervalMs = intervalMs;
    }

    public void send(ServerPlayer player, Supplier<T> payloadSupplier) {
        long now = System.currentTimeMillis();
        UUID id = player.getUUID();
        Long prev = this.lastSent.get(id);
        if (prev == null || now - prev.longValue() >= this.intervalMs) {
            this.lastSent.put(id, Long.valueOf(now));
            NetworkUtils.sendToPlayer(player, payloadSupplier.get());
        }
    }

    public void invalidate(ServerPlayer player) {
        this.lastSent.remove(player.getUUID());
    }

    public void remove(ServerPlayer player) {
        this.lastSent.remove(player.getUUID());
    }

    public void clear() {
        this.lastSent.clear();
    }
}
