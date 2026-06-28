package net.ye6isu.yebisuRPG.data.network;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.neoforged.neoforge.network.handling.IPayloadContext;

/**
 * Client-side handler for {@link VarSyncPayload}.
 *
 * <p>{@code @OnlyIn(Dist.CLIENT)} — registered via
 * {@link net.ye6isu.yebisulib.network.ClientHandlerProxy} following the established
 * dedicated-server safe pattern.</p>
 */
@OnlyIn(Dist.CLIENT)
public final class VarSyncClientHandler {

    private VarSyncClientHandler() {}

    public static void handle(VarSyncPayload payload, IPayloadContext ctx) {
        if (payload.vars().isEmpty()) {
            VarSyncClientCache.clear(payload.entityId());
        } else {
            VarSyncClientCache.apply(payload.entityId(), payload.vars());
        }
    }
}
