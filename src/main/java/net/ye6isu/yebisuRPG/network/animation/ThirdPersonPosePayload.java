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
        int vanillaMoveMask,
        int allowActionsMask,
        int keepPosScaleMask
) implements BasePayload {

    public static final CustomPacketPayload.Type<ThirdPersonPosePayload> TYPE =
            new CustomPacketPayload.Type<>(
                    ResourceLocation.fromNamespaceAndPath("yebisurpg", "tp_pose"));

    // Pack vanillaMoveMask + allowActionsMask + keepPosScaleMask into one int
    // to stay within StreamCodec.composite's 6-field limit
    private int packedFlags() {
        int packed = vanillaMoveMask & 0x3FFFF;
        packed |= (allowActionsMask & 0x3F) << 18;
        packed |= (keepPosScaleMask & 0x3F) << 24;
        return packed;
    }

    private static ThirdPersonPosePayload fromPacked(int entityId, String animName, String filePath,
                                                      int lookAtMask, int vanillaMask, int packed) {
        return new ThirdPersonPosePayload(entityId, animName, filePath, lookAtMask, vanillaMask,
                packed & 0x3FFFF, (packed >> 18) & 0x3F, (packed >> 24) & 0x3F);
    }

    public static final StreamCodec<ByteBuf, ThirdPersonPosePayload> STREAM_CODEC =
            StreamCodec.composite(
                    ByteBufCodecs.VAR_INT,         ThirdPersonPosePayload::entityId,
                    ByteBufCodecs.stringUtf8(64),   ThirdPersonPosePayload::animName,
                    ByteBufCodecs.stringUtf8(256),  ThirdPersonPosePayload::filePath,
                    ByteBufCodecs.VAR_INT,          ThirdPersonPosePayload::lookAtMask,
                    ByteBufCodecs.VAR_INT,          ThirdPersonPosePayload::vanillaMask,
                    ByteBufCodecs.VAR_INT,          ThirdPersonPosePayload::packedFlags,
                    ThirdPersonPosePayload::fromPacked);

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() { return TYPE; }

    public boolean isClear() { return animName == null || animName.isEmpty(); }

    public static ThirdPersonPosePayload set(int entityId, String animName, String filePath,
                                              int lookAtMask, int vanillaMask, int vanillaMoveMask,
                                              int allowActionsMask, int keepPosScaleMask) {
        return new ThirdPersonPosePayload(entityId,
                animName != null ? animName : "", filePath != null ? filePath : "",
                lookAtMask, vanillaMask, vanillaMoveMask, allowActionsMask, keepPosScaleMask);
    }

    public static ThirdPersonPosePayload clear(int entityId) {
        return new ThirdPersonPosePayload(entityId, "", "", 0, 0, 0, 0, 0);
    }
}
