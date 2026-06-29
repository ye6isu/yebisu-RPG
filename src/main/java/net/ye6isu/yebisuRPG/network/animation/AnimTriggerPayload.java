package net.ye6isu.yebisuRPG.network.animation;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.network.BasePayload;

public record AnimTriggerPayload(
        int entityId,
        int categoryOrdinal,
        String animId,
        int progressTicks,
        String filePath,
        float playbackSpeed,
        int lookAtMask,
        int vanillaMask,
        int vanillaMoveMask
) implements BasePayload {

    public static final CustomPacketPayload.Type<AnimTriggerPayload> TYPE =
            new CustomPacketPayload.Type<>(
                    ResourceLocation.fromNamespaceAndPath("yebisurpg", "anim_trigger"));

    public static final StreamCodec<ByteBuf, AnimTriggerPayload> STREAM_CODEC =
            new StreamCodec<>() {
                @Override
                public AnimTriggerPayload decode(ByteBuf buf) {
                    return new AnimTriggerPayload(
                            ByteBufCodecs.VAR_INT.decode(buf),
                            ByteBufCodecs.VAR_INT.decode(buf),
                            ByteBufCodecs.stringUtf8(64).decode(buf),
                            ByteBufCodecs.VAR_INT.decode(buf),
                            ByteBufCodecs.stringUtf8(256).decode(buf),
                            ByteBufCodecs.FLOAT.decode(buf),
                            ByteBufCodecs.VAR_INT.decode(buf),
                            ByteBufCodecs.VAR_INT.decode(buf),
                            ByteBufCodecs.VAR_INT.decode(buf));
                }
                @Override
                public void encode(ByteBuf buf, AnimTriggerPayload p) {
                    ByteBufCodecs.VAR_INT.encode(buf, p.entityId());
                    ByteBufCodecs.VAR_INT.encode(buf, p.categoryOrdinal());
                    ByteBufCodecs.stringUtf8(64).encode(buf, p.animId());
                    ByteBufCodecs.VAR_INT.encode(buf, p.progressTicks());
                    ByteBufCodecs.stringUtf8(256).encode(buf, p.filePath());
                    ByteBufCodecs.FLOAT.encode(buf, p.playbackSpeed());
                    ByteBufCodecs.VAR_INT.encode(buf, p.lookAtMask());
                    ByteBufCodecs.VAR_INT.encode(buf, p.vanillaMask());
                    ByteBufCodecs.VAR_INT.encode(buf, p.vanillaMoveMask());
                }
            };

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() { return TYPE; }

    public String filePathOrNull() {
        return filePath == null || filePath.isEmpty() ? null : filePath;
    }

    public static AnimTriggerPayload fresh(int entityId, int categoryOrdinal, String animId) {
        return new AnimTriggerPayload(entityId, categoryOrdinal, animId, 0, "", 1f, 0, 0, 0);
    }

    public static AnimTriggerPayload fresh(int entityId, int categoryOrdinal, String animId,
                                           String filePath, float playbackSpeed,
                                           int lookAtMask, int vanillaMask, int vanillaMoveMask) {
        return new AnimTriggerPayload(entityId, categoryOrdinal, animId, 0,
                filePath != null ? filePath : "", playbackSpeed, lookAtMask, vanillaMask, vanillaMoveMask);
    }

    public static AnimTriggerPayload catchUp(int entityId, int categoryOrdinal, String animId,
                                             int progressTicks, String filePath, float playbackSpeed,
                                             int lookAtMask, int vanillaMask, int vanillaMoveMask) {
        return new AnimTriggerPayload(entityId, categoryOrdinal, animId, progressTicks,
                filePath != null ? filePath : "", playbackSpeed, lookAtMask, vanillaMask, vanillaMoveMask);
    }
}
