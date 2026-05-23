package net.ye6isu.yebisulib.network;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.fml.loading.FMLEnvironment;
import net.neoforged.neoforge.network.handling.IPayloadContext;
import net.ye6isu.yebisuRPG.data.network.VarSyncClientHandler;
import net.ye6isu.yebisuRPG.data.network.VarSyncPayload;
import net.ye6isu.yebisulib.texture.network.TextureSyncClientHandler;
import net.ye6isu.yebisulib.texture.network.TextureSyncPayload;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/network/ClientHandlerProxy.class */
public final class ClientHandlerProxy {
    private ClientHandlerProxy() {
    }

    public static void onTextureSync(TextureSyncPayload payload, IPayloadContext ctx) {
        if (FMLEnvironment.dist == Dist.CLIENT) {
            Runnable call = () -> {
                TextureSyncClientHandler.handle(payload, ctx);
            };
            call.run();
        }
    }

    public static void onVarSync(VarSyncPayload payload, IPayloadContext ctx) {
        if (FMLEnvironment.dist == Dist.CLIENT) {
            Runnable call = () -> {
                VarSyncClientHandler.handle(payload, ctx);
            };
            call.run();
        }
    }
}
