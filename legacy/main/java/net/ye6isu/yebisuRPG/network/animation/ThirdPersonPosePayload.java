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

    // Pack into 6 fields for codec limit: vanillaMoveMask + allowActionsMask + keepPosScaleMask
    // vanillaMoveMask uses bits 0-17. Pack allowActionsMask in bits 18-23 and keepPosScaleMask in bits 24-29.
    private int packedMoveMaskAndFlags() {
        int packed = vanillaMoveMask & 0x3FFFF;
        packed |= (allowActionsMask & 0x3F) << 18;
        packed |= (keepPosScaleMask & 0x3F) << 24;
        return packed;
    }

    private static ThirdPersonPosePayload fromPacked(int entityId, String animName, String filePath,
                                                      int lookAtMask, int vanillaMask, int packed) {
        int moveMask = packed & 0x3FFFF;
        int actMask = (packed >> 18) & 0x3F;
        int keepMask = (packed >> 24) & 0x3F;
        return new ThirdPersonPosePayload(entityId, animName, filePath, lookAtMask, vanillaMask,
                moveMask, actMask, keepMask);
    }

    public static final StreamCodec<ByteBuf, ThirdPersonPosePayload> STREAM_CODEC =
            StreamCodec.composite(
                    ByteBufCodecs.VAR_INT,          ThirdPersonPosePayload::entityId,
                    ByteBufCodecs.stringUtf8(64),    ThirdPersonPosePayload::animName,
                    ByteBufCodecs.stringUtf8(256),   ThirdPersonPosePayload::filePath,
                    ByteBufCodecs.VAR_INT,           ThirdPersonPosePayload::lookAtMask,
                    ByteBufCodecs.VAR_INT,           ThirdPersonPosePayload::vanillaMask,
                    ByteBufCodecs.VAR_INT,           ThirdPersonPosePayload::packedMoveMaskAndFlags,
                    ThirdPersonPosePayload::fromPacked);

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() { return TYPE; }

    public boolean isClear() { return animName == null || animName.isEmpty(); }

    // Convenience: check if any part allows vanilla actions
    public boolean hasAnyAllowActions() { return allowActionsMask != 0; }
    public boolean hasAnyKeepPosScale() { return keepPosScaleMask != 0; }

    public static ThirdPersonPosePayload set(int entityId, String animName, String filePath,
                                              int lookAtMask, int vanillaMask, int vanillaMoveMask) {
        return new ThirdPersonPosePayload(entityId,
                animName != null ? animName : "", filePath != null ? filePath : "",
                lookAtMask, vanillaMask, vanillaMoveMask, 0, 0);
    }

    public static ThirdPersonPosePayload set(int entityId, String animName, String filePath,
                                              int lookAtMask, int vanillaMask, int vanillaMoveMask,
                                              boolean allowVanillaActions) {
        int actMask = allowVanillaActions ? 0x3F : 0; // all 6 parts
        return new ThirdPersonPosePayload(entityId,
                animName != null ? animName : "", filePath != null ? filePath : "",
                lookAtMask, vanillaMask, vanillaMoveMask, actMask, 0);
    }

    public static ThirdPersonPosePayload set(int entityId, String animName, String filePath,
                                              int lookAtMask, int vanillaMask, int vanillaMoveMask,
                                              boolean allowVanillaActions, boolean keepPosScale) {
        int actMask = allowVanillaActions ? 0x3F : 0;
        int keepMask = keepPosScale ? 0x3F : 0;
        return new ThirdPersonPosePayload(entityId,
                animName != null ? animName : "", filePath != null ? filePath : "",
                lookAtMask, vanillaMask, vanillaMoveMask, actMask, keepMask);
    }

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
