package net.ye6isu.yebisuRPG.network;

import net.minecraft.network.protocol.common.custom.CustomPacketPayload;

public interface BasePayload extends CustomPacketPayload {
    @Override
    CustomPacketPayload.Type<? extends CustomPacketPayload> type();
}
