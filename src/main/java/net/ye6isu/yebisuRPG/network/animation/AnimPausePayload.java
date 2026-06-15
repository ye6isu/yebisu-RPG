package net.ye6isu.yebisuRPG.network.animation;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.network.BasePayload;

/**
 * S2C payload that pauses or resumes a custom animation on a specific entity/category slot.
 *
 * <h2>Wire format</h2>
 * <pre>
 *  entityId          VarInt — entity.getId()
 *  categoryOrdinal   VarInt — AnimationCategory.ordinal()
 *  frozenProgressMs  Long   — speed-scaled ms frozen at pause time; -1 = resume
 * </pre>
 *
 * @param entityId         entity.getId()
 * @param categoryOrdinal  AnimationCategory.ordinal()
 * @param frozenProgressMs animation time in ms at which playback is frozen; -1 = resume
 */
public record AnimPausePayload(
        int entityId,
        int categoryOrdinal,
        long frozenProgressMs
) implements BasePayload {

    public static final CustomPacketPayload.Type<AnimPausePayload> TYPE =
            new CustomPacketPayload.Type<>(
                    ResourceLocation.fromNamespaceAndPath("yebisurpg", "anim_pause"));

    public static final StreamCodec<ByteBuf, AnimPausePayload> STREAM_CODEC =
            StreamCodec.composite(
                    ByteBufCodecs.VAR_INT,  AnimPausePayload::entityId,
                    ByteBufCodecs.VAR_INT,  AnimPausePayload::categoryOrdinal,
                    ByteBufCodecs.VAR_LONG, AnimPausePayload::frozenProgressMs,
                    AnimPausePayload::new);

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() { return TYPE; }

    public AnimationCategory category() {
        return AnimationCategory.values()[categoryOrdinal];
    }

    public boolean isResume() { return frozenProgressMs < 0; }

    public static AnimPausePayload pause(int entityId, AnimationCategory category, long frozenProgressMs) {
        return new AnimPausePayload(entityId, category.ordinal(), frozenProgressMs);
    }

    public static AnimPausePayload resume(int entityId, AnimationCategory category) {
        return new AnimPausePayload(entityId, category.ordinal(), -1L);
    }
}
