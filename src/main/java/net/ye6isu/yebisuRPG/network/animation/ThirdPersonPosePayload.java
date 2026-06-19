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
        boolean allowVanillaActions,
        boolean keepPosScale
) implements BasePayload {

    public static final CustomPacketPayload.Type<ThirdPersonPosePayload> TYPE =
            new CustomPacketPayload.Type<>(
                    ResourceLocation.fromNamespaceAndPath("yebisurpg", "tp_pose"));

    // Pack vanillaMoveMask + flags into a single int for codec (6-field limit).
    // Bits 0-17: vanillaMoveMask, bit 30: keepPosScale, bit 31: allowVanillaActions
    private int packedMoveMaskAndFlags() {
        int packed = vanillaMoveMask & 0x3FFFFFFF;
        if (allowVanillaActions) packed |= (1 << 31);
        if (keepPosScale) packed |= (1 << 30);
        return packed;
    }

    private static ThirdPersonPosePayload fromPacked(int entityId, String animName, String filePath,
                                                      int lookAtMask, int vanillaMask, int packedMoveMaskFlags) {
        boolean allowActions = (packedMoveMaskFlags & (1 << 31)) != 0;
        boolean keepPS = (packedMoveMaskFlags & (1 << 30)) != 0;
        int moveMask = packedMoveMaskFlags & 0x3FFFFFFF;
        return new ThirdPersonPosePayload(entityId, animName, filePath, lookAtMask, vanillaMask,
                moveMask, allowActions, keepPS);
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

    public static ThirdPersonPosePayload set(int entityId, String animName, String filePath,
                                              int lookAtMask, int vanillaMask, int vanillaMoveMask) {
        return new ThirdPersonPosePayload(entityId,
                animName != null ? animName : "", filePath != null ? filePath : "",
                lookAtMask, vanillaMask, vanillaMoveMask, false, false);
    }

    public static ThirdPersonPosePayload set(int entityId, String animName, String filePath,
                                              int lookAtMask, int vanillaMask, int vanillaMoveMask,
                                              boolean allowVanillaActions) {
        return new ThirdPersonPosePayload(entityId,
                animName != null ? animName : "", filePath != null ? filePath : "",
                lookAtMask, vanillaMask, vanillaMoveMask, allowVanillaActions, false);
    }

    public static ThirdPersonPosePayload set(int entityId, String animName, String filePath,
                                              int lookAtMask, int vanillaMask, int vanillaMoveMask,
                                              boolean allowVanillaActions, boolean keepPosScale) {
        return new ThirdPersonPosePayload(entityId,
                animName != null ? animName : "", filePath != null ? filePath : "",
                lookAtMask, vanillaMask, vanillaMoveMask, allowVanillaActions, keepPosScale);
    }

    public static ThirdPersonPosePayload clear(int entityId) {
        return new ThirdPersonPosePayload(entityId, "", "", 0, 0, 0, false, false);
    }
}
