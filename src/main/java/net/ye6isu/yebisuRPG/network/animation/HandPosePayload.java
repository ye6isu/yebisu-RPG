package net.ye6isu.yebisuRPG.network.animation;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.network.BasePayload;

/**
 * S2C payload that sets or clears a persistent first-person hand pose for an entity.
 *
 * <p>When set, the renderer uses this pose whenever no animation is actively playing
 * (playhead is null or finished). When cleared, vanilla default pose is restored.</p>
 *
 * @param entityId  entity.getId()
 * @param animName  animation key inside the JSON, or empty string to clear
 * @param filePath  resource path of the JSON file, or empty string for default
 */
public record HandPosePayload(
        int entityId,
        String animName,
        String filePath
) implements BasePayload {

    public static final CustomPacketPayload.Type<HandPosePayload> TYPE =
            new CustomPacketPayload.Type<>(
                    ResourceLocation.fromNamespaceAndPath("yebisurpg", "hand_pose"));

    public static final StreamCodec<ByteBuf, HandPosePayload> STREAM_CODEC =
            StreamCodec.composite(
                    ByteBufCodecs.VAR_INT,          HandPosePayload::entityId,
                    ByteBufCodecs.stringUtf8(64),   HandPosePayload::animName,
                    ByteBufCodecs.stringUtf8(256),  HandPosePayload::filePath,
                    HandPosePayload::new);

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() { return TYPE; }

    public boolean isClear() { return animName == null || animName.isEmpty(); }

    public static HandPosePayload set(int entityId, String animName, String filePath) {
        return new HandPosePayload(entityId,
                animName != null ? animName : "",
                filePath != null ? filePath : "");
    }

    public static HandPosePayload clear(int entityId) {
        return new HandPosePayload(entityId, "", "");
    }
}
