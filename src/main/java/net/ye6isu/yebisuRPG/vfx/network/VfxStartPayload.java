package net.ye6isu.yebisuRPG.vfx.network;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.network.BasePayload;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.UUID;

/** One authoritative start message; clients simulate and animate the effect locally. */
public record VfxStartPayload(
        UUID instanceId,
        String effectId,
        double x,
        double y,
        double z,
        float yawDegrees,
        float pitchDegrees,
        int anchorEntityId,
        boolean followEntity,
        boolean eyeLevel,
        boolean followYaw,
        boolean followPitch,
        boolean viewSway,
        double offsetX,
        double offsetY,
        double offsetZ,
        long startTick
) implements BasePayload {

    public static final CustomPacketPayload.Type<VfxStartPayload> TYPE =
            new CustomPacketPayload.Type<>(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "vfx_start"));

    public static final StreamCodec<ByteBuf, VfxStartPayload> STREAM_CODEC = new StreamCodec<>() {
        private final StreamCodec<ByteBuf, String> stringCodec = ByteBufCodecs.stringUtf8(128);

        @Override
        public VfxStartPayload decode(ByteBuf buf) {
            UUID instanceId = new UUID(buf.readLong(), buf.readLong());
            String effectId = stringCodec.decode(buf);
            double x = buf.readDouble();
            double y = buf.readDouble();
            double z = buf.readDouble();
            float yawDegrees = buf.readFloat();
            float pitchDegrees = buf.readFloat();
            int anchorEntityId = buf.readInt();
            int flags = buf.readUnsignedByte();
            return new VfxStartPayload(
                    instanceId,
                    effectId,
                    x,
                    y,
                    z,
                    yawDegrees,
                    pitchDegrees,
                    anchorEntityId,
                    (flags & 1) != 0,
                    (flags & 2) != 0,
                    (flags & 4) != 0,
                    (flags & 8) != 0,
                    (flags & 16) != 0,
                    buf.readDouble(),
                    buf.readDouble(),
                    buf.readDouble(),
                    buf.readLong());
        }

        @Override
        public void encode(ByteBuf buf, VfxStartPayload payload) {
            buf.writeLong(payload.instanceId().getMostSignificantBits());
            buf.writeLong(payload.instanceId().getLeastSignificantBits());
            stringCodec.encode(buf, payload.effectId());
            buf.writeDouble(payload.x());
            buf.writeDouble(payload.y());
            buf.writeDouble(payload.z());
            buf.writeFloat(payload.yawDegrees());
            buf.writeFloat(payload.pitchDegrees());
            buf.writeInt(payload.anchorEntityId());
            int flags = (payload.followEntity() ? 1 : 0)
                    | (payload.eyeLevel() ? 2 : 0)
                    | (payload.followYaw() ? 4 : 0)
                    | (payload.followPitch() ? 8 : 0)
                    | (payload.viewSway() ? 16 : 0);
            buf.writeByte(flags);
            buf.writeDouble(payload.offsetX());
            buf.writeDouble(payload.offsetY());
            buf.writeDouble(payload.offsetZ());
            buf.writeLong(payload.startTick());
        }
    };

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }
}
