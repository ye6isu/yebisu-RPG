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
 * <h2>Dual purpose — trigger and late-joiner catch-up</h2>
 * <p>When {@code progressTicks == 0} this is a fresh trigger broadcast to all trackers.
 * When {@code progressTicks > 0} this is a catch-up packet sent only to the joining client;
 * the client fast-forwards its local playhead to that exact offset so late joiners are
 * visually aligned with everyone else.</p>
 *
 * <h2>Wire format</h2>
 * <pre>
 *  entityId        VarInt   — entity.getId()
 *  categoryOrdinal VarInt   — AnimationCategory.ordinal()
 *  animId          String   — Blockbench export key, max 64 chars
 *  progressTicks   VarInt   — elapsed ticks since start (0 for fresh triggers)
 * </pre>
 *
 * <p>Uses plain {@link ByteBuf}; no registry data required.</p>
 *
 * @param entityId        entity.getId()
 * @param categoryOrdinal AnimationCategory.ordinal() — decoded back to enum on receipt
 * @param animId          matches the Blockbench export filename key (e.g. "attack_slash")
 * @param progressTicks   ticks already elapsed; 0 for a fresh trigger
 */
public record AnimTriggerPayload(
        int entityId,
        int categoryOrdinal,
        String animId,
        int progressTicks
) implements BasePayload {

    public static final CustomPacketPayload.Type<AnimTriggerPayload> TYPE =
            new CustomPacketPayload.Type<>(
                    ResourceLocation.fromNamespaceAndPath("yebisurpg", "anim_trigger"));

    public static final StreamCodec<ByteBuf, AnimTriggerPayload> STREAM_CODEC =
            StreamCodec.composite(
                    ByteBufCodecs.VAR_INT,          AnimTriggerPayload::entityId,
                    ByteBufCodecs.VAR_INT,          AnimTriggerPayload::categoryOrdinal,
                    ByteBufCodecs.stringUtf8(64),   AnimTriggerPayload::animId,
                    ByteBufCodecs.VAR_INT,          AnimTriggerPayload::progressTicks,
                    AnimTriggerPayload::new);

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() { return TYPE; }

    // -------------------------------------------------------------------------
    // Convenience accessors
    // -------------------------------------------------------------------------

    /** Decodes the ordinal back to the enum value. */
    public AnimationCategory category() {
        return AnimationCategory.values()[categoryOrdinal];
    }

    // -------------------------------------------------------------------------
    // Factories
    // -------------------------------------------------------------------------

    /** Fresh trigger — no elapsed time. Sent to all trackers. */
    public static AnimTriggerPayload fresh(int entityId, AnimationCategory category, String animId) {
        return new AnimTriggerPayload(entityId, category.ordinal(), animId, 0);
    }

    /** Catch-up trigger — already-elapsed ticks included. Sent only to the joining client. */
    public static AnimTriggerPayload catchUp(int entityId, AnimationCategory category,
                                             String animId, int progressTicks) {
        return new AnimTriggerPayload(entityId, category.ordinal(), animId, progressTicks);
    }
}
