package net.ye6isu.yebisuRPG.network;

import net.neoforged.neoforge.network.handling.IPayloadContext;

@FunctionalInterface
public interface PayloadHandler<T extends BasePayload> {
    void handle(T payload, IPayloadContext ctx);
}
