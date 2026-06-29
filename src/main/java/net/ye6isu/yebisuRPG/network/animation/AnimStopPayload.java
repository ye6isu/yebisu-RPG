package net.ye6isu.yebisuRPG.network.animation;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.network.BasePayload;

public record AnimStopPayload(
        int entityId,
        int categoryOrdinal
) implements BasePayload {

    public static final CustomPacketPayload.Type<AnimStopPayload> TYPE =
            new CustomPacketPayload.Type<>(
                    ResourceLocation.fromNamespaceAndPath("yebisurpg", "anim_stop"));

    public static final StreamCodec<ByteBuf, AnimStopPayload> STREAM_CODEC =
            StreamCodec.composite(
                    ByteBufCodecs.VAR_INT, AnimStopPayload::entityId,
                    ByteBufCodecs.VAR_INT, AnimStopPayload::categoryOrdinal,
                    AnimStopPayload::new);

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() { return TYPE; }

    public static AnimStopPayload of(int entityId, int categoryOrdinal) {
        return new AnimStopPayload(entityId, categoryOrdinal);
    }
}
