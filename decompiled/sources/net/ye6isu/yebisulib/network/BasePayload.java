package net.ye6isu.yebisulib.network;

import net.minecraft.network.protocol.common.custom.CustomPacketPayload;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/network/BasePayload.class */
public interface BasePayload extends CustomPacketPayload {
    CustomPacketPayload.Type<? extends CustomPacketPayload> type();
}
