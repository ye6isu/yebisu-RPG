package net.ye6isu.yebisulib.network;

import net.neoforged.neoforge.network.handling.IPayloadContext;
import net.ye6isu.yebisulib.network.BasePayload;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/network/PayloadHandler.class */
@FunctionalInterface
public interface PayloadHandler<T extends BasePayload> {
    void handle(T t, IPayloadContext iPayloadContext);
}
