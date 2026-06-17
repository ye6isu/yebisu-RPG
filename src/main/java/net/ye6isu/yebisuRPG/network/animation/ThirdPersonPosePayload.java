package net.ye6isu.yebisuRPG.network.animation;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.network.BasePayload;

public record ThirdPersonPosePayload(
        int entityId,
        String animName,
        String filePath,
        int lookAtMask,
        int vanillaMask,
        int vanillaMoveMask
) implements BasePayload {

    public static final CustomPacketPayload.Type<ThirdPersonPosePayload> TYPE =
            new CustomPacketPayload.Type<>(
                    ResourceLocation.fromNamespaceAndPath("yebisurpg", "tp_pose"));

    public static final StreamCodec<ByteBuf, ThirdPersonPosePayload> STREAM_CODEC =
            StreamCodec.composite(
                    ByteBufCodecs.VAR_INT,          ThirdPersonPosePayload::entityId,
                    ByteBufCodecs.stringUtf8(64),    ThirdPersonPosePayload::animName,
                    ByteBufCodecs.stringUtf8(256),   ThirdPersonPosePayload::filePath,
                    ByteBufCodecs.VAR_INT,           ThirdPersonPosePayload::lookAtMask,
                    ByteBufCodecs.VAR_INT,           ThirdPersonPosePayload::vanillaMask,
                    ByteBufCodecs.VAR_INT,           ThirdPersonPosePayload::vanillaMoveMask,
                    ThirdPersonPosePayload::new);

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() { return TYPE; }

    public boolean isClear() { return animName == null || animName.isEmpty(); }

    public static ThirdPersonPosePayload set(int entityId, String animName, String filePath,
                                              int lookAtMask, int vanillaMask, int vanillaMoveMask) {
        return new ThirdPersonPosePayload(entityId,
                animName != null ? animName : "",
                filePath != null ? filePath : "",
                lookAtMask, vanillaMask, vanillaMoveMask);
    }

    public static ThirdPersonPosePayload clear(int entityId) {
        return new ThirdPersonPosePayload(entityId, "", "", 0, 0, 0);
    }
}
