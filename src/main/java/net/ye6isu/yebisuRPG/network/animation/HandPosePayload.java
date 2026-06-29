package net.ye6isu.yebisuRPG.network.animation;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.network.BasePayload;

public record HandPosePayload(
        int entityId,
        String animName,
        String filePath,
        boolean allowVanillaActions,
        boolean keepPosScale
) implements BasePayload {

    private static final int FLAG_ALLOW_ACTIONS = 1;
    private static final int FLAG_KEEP_POS_SCALE = 2;

    private int flags() {
        int f = 0;
        if (allowVanillaActions) f |= FLAG_ALLOW_ACTIONS;
        if (keepPosScale) f |= FLAG_KEEP_POS_SCALE;
        return f;
    }

    private static HandPosePayload fromFields(int entityId, String animName, String filePath, int flags) {
        return new HandPosePayload(entityId, animName, filePath,
                (flags & FLAG_ALLOW_ACTIONS) != 0,
                (flags & FLAG_KEEP_POS_SCALE) != 0);
    }

    public static final CustomPacketPayload.Type<HandPosePayload> TYPE =
            new CustomPacketPayload.Type<>(
                    ResourceLocation.fromNamespaceAndPath("yebisurpg", "hand_pose"));

    public static final StreamCodec<ByteBuf, HandPosePayload> STREAM_CODEC =
            StreamCodec.composite(
                    ByteBufCodecs.VAR_INT,         HandPosePayload::entityId,
                    ByteBufCodecs.stringUtf8(64),   HandPosePayload::animName,
                    ByteBufCodecs.stringUtf8(256),  HandPosePayload::filePath,
                    ByteBufCodecs.VAR_INT,          HandPosePayload::flags,
                    HandPosePayload::fromFields);

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() { return TYPE; }

    public boolean isClear() { return animName == null || animName.isEmpty(); }

    public static HandPosePayload set(int entityId, String animName, String filePath,
                                      boolean allowVanillaActions, boolean keepPosScale) {
        return new HandPosePayload(entityId,
                animName != null ? animName : "",
                filePath != null ? filePath : "",
                allowVanillaActions, keepPosScale);
    }

    public static HandPosePayload clear(int entityId) {
        return new HandPosePayload(entityId, "", "", false, false);
    }
}
