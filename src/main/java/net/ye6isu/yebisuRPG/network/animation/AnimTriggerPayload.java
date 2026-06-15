package net.ye6isu.yebisuRPG.network.animation;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.network.BasePayload;

/**
 * S2C payload that starts (or resumes) a custom animation on a specific entity/category slot.
 *
 * <h2>Wire format</h2>
 * <pre>
 *  entityId        VarInt   — entity.getId()
 *  categoryOrdinal VarInt   — AnimationCategory.ordinal()
 *  animId          String   — Blockbench export key, max 64 chars
 *  progressTicks   VarInt   — elapsed ticks since start (0 for fresh triggers)
 *  filePath        String   — resource path of the source JSON (empty = default file), max 256 chars
 *  playbackSpeed   Float    — speed multiplier (1.0 = normal)
 * </pre>
 *
 * @param entityId        entity.getId()
 * @param categoryOrdinal AnimationCategory.ordinal()
 * @param animId          animation name key (e.g. "anim1")
 * @param progressTicks   ticks already elapsed; 0 for a fresh trigger
 * @param filePath        resource path of the source JSON file, or empty string for the default
 * @param playbackSpeed   speed multiplier (1.0 = normal, 0.5 = half, 2.0 = double)
 */
public record AnimTriggerPayload(
        int entityId,
        int categoryOrdinal,
        String animId,
        int progressTicks,
        String filePath,
        float playbackSpeed
) implements BasePayload {

    public static final CustomPacketPayload.Type<AnimTriggerPayload> TYPE =
            new CustomPacketPayload.Type<>(
                    ResourceLocation.fromNamespaceAndPath("yebisurpg", "anim_trigger"));

    public static final StreamCodec<ByteBuf, AnimTriggerPayload> STREAM_CODEC =
            StreamCodec.composite(
                    ByteBufCodecs.VAR_INT,         AnimTriggerPayload::entityId,
                    ByteBufCodecs.VAR_INT,         AnimTriggerPayload::categoryOrdinal,
                    ByteBufCodecs.stringUtf8(64),  AnimTriggerPayload::animId,
                    ByteBufCodecs.VAR_INT,         AnimTriggerPayload::progressTicks,
                    ByteBufCodecs.stringUtf8(256), AnimTriggerPayload::filePath,
                    ByteBufCodecs.FLOAT,           AnimTriggerPayload::playbackSpeed,
                    AnimTriggerPayload::new);

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() { return TYPE; }

    public AnimationCategory category() {
        return AnimationCategory.values()[categoryOrdinal];
    }

    /** Returns the filePath as a nullable — {@code null} when empty (meaning use default file). */
    public String filePathOrNull() {
        return filePath == null || filePath.isEmpty() ? null : filePath;
    }

    // ── Factories ────────────────────────────────────────────────────────────

    public static AnimTriggerPayload fresh(int entityId, AnimationCategory category, String animId) {
        return new AnimTriggerPayload(entityId, category.ordinal(), animId, 0, "", 1f);
    }

    public static AnimTriggerPayload fresh(int entityId, AnimationCategory category,
                                           String animId, String filePath) {
        return new AnimTriggerPayload(entityId, category.ordinal(), animId, 0,
                filePath != null ? filePath : "", 1f);
    }

    public static AnimTriggerPayload fresh(int entityId, AnimationCategory category,
                                           String animId, String filePath, float playbackSpeed) {
        return new AnimTriggerPayload(entityId, category.ordinal(), animId, 0,
                filePath != null ? filePath : "", playbackSpeed);
    }

    public static AnimTriggerPayload catchUp(int entityId, AnimationCategory category,
                                             String animId, int progressTicks) {
        return new AnimTriggerPayload(entityId, category.ordinal(), animId, progressTicks, "", 1f);
    }

    public static AnimTriggerPayload catchUp(int entityId, AnimationCategory category,
                                             String animId, int progressTicks,
                                             String filePath, float playbackSpeed) {
        return new AnimTriggerPayload(entityId, category.ordinal(), animId, progressTicks,
                filePath != null ? filePath : "", playbackSpeed);
    }
}
