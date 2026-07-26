package net.ye6isu.yebisuRPG.vfx.network;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.network.BasePayload;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.UUID;

public record VfxRemovePayload(UUID instanceId) implements BasePayload {

    public static final CustomPacketPayload.Type<VfxRemovePayload> TYPE =
            new CustomPacketPayload.Type<>(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "vfx_remove"));

    public static final StreamCodec<ByteBuf, VfxRemovePayload> STREAM_CODEC = new StreamCodec<>() {
        @Override
        public VfxRemovePayload decode(ByteBuf buf) {
            return new VfxRemovePayload(new UUID(buf.readLong(), buf.readLong()));
        }

        @Override
        public void encode(ByteBuf buf, VfxRemovePayload payload) {
            buf.writeLong(payload.instanceId().getMostSignificantBits());
            buf.writeLong(payload.instanceId().getLeastSignificantBits());
        }
    };

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }
}
