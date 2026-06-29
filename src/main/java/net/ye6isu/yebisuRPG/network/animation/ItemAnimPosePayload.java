package net.ye6isu.yebisuRPG.network.animation;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.network.BasePayload;

public record ItemAnimPosePayload(
        int entityId,
        String animName,
        String filePath,
        float playbackSpeed,
        boolean isMainHand
) implements BasePayload {

    public static final CustomPacketPayload.Type<ItemAnimPosePayload> TYPE =
            new CustomPacketPayload.Type<>(
                    ResourceLocation.fromNamespaceAndPath("yebisurpg", "item_anim_pose"));

    public static final StreamCodec<ByteBuf, ItemAnimPosePayload> STREAM_CODEC =
            StreamCodec.composite(
                    ByteBufCodecs.VAR_INT,         ItemAnimPosePayload::entityId,
                    ByteBufCodecs.stringUtf8(64),   ItemAnimPosePayload::animName,
                    ByteBufCodecs.stringUtf8(256),  ItemAnimPosePayload::filePath,
                    ByteBufCodecs.FLOAT,            ItemAnimPosePayload::playbackSpeed,
                    ByteBufCodecs.BOOL,             ItemAnimPosePayload::isMainHand,
                    ItemAnimPosePayload::new);

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() { return TYPE; }

    public boolean isClear() { return animName == null || animName.isEmpty(); }

    public static ItemAnimPosePayload set(int entityId, String animName, String filePath,
                                          float speed, boolean mainHand) {
        return new ItemAnimPosePayload(entityId,
                animName != null ? animName : "",
                filePath != null ? filePath : "",
                speed, mainHand);
    }

    public static ItemAnimPosePayload clear(int entityId, boolean mainHand) {
        return new ItemAnimPosePayload(entityId, "", "", 1f, mainHand);
    }
}
