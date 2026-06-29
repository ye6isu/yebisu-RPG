package net.ye6isu.yebisuRPG.network.animation;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.network.BasePayload;

public record AnimPausePayload(
        int entityId,
        int categoryOrdinal,
        long frozenProgressMs
) implements BasePayload {

    public static final CustomPacketPayload.Type<AnimPausePayload> TYPE =
            new CustomPacketPayload.Type<>(
                    ResourceLocation.fromNamespaceAndPath("yebisurpg", "anim_pause"));

    public static final StreamCodec<ByteBuf, AnimPausePayload> STREAM_CODEC =
            StreamCodec.composite(
                    ByteBufCodecs.VAR_INT, AnimPausePayload::entityId,
                    ByteBufCodecs.VAR_INT, AnimPausePayload::categoryOrdinal,
                    ByteBufCodecs.VAR_LONG, AnimPausePayload::frozenProgressMs,
                    AnimPausePayload::new);

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() { return TYPE; }

    public boolean isResume() { return frozenProgressMs < 0; }

    public static AnimPausePayload pause(int entityId, int categoryOrdinal, long frozenProgressMs) {
        return new AnimPausePayload(entityId, categoryOrdinal, frozenProgressMs);
    }

    public static AnimPausePayload resume(int entityId, int categoryOrdinal) {
        return new AnimPausePayload(entityId, categoryOrdinal, -1L);
    }
}
