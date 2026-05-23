package net.ye6isu.yebisuRPG.data.network;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.neoforged.neoforge.network.handling.IPayloadContext;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/data/network/VarSyncClientHandler.class */
@OnlyIn(Dist.CLIENT)
public final class VarSyncClientHandler {
    private VarSyncClientHandler() {
    }

    public static void handle(VarSyncPayload payload, IPayloadContext ctx) {
        if (payload.vars().isEmpty()) {
            VarSyncClientCache.clear(payload.entityId());
        } else {
            VarSyncClientCache.apply(payload.entityId(), payload.vars());
        }
    }
}
