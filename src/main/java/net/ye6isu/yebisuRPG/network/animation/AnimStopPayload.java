package net.ye6isu.yebisuRPG.network.animation;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.network.BasePayload;

/**
 * S2C payload that halts a custom animation on a specific entity/category slot
 * and signals the client to begin the 2-tick linear blend-out back to default pose.
 *
 * <h2>Wire format</h2>
 * <pre>
 *  entityId        VarInt   — entity.getId()
 *  categoryOrdinal VarInt   — AnimationCategory.ordinal()
 * </pre>
 *
 * <p>Deliberately minimal. The client derives all blend parameters locally;
 * no bone data is ever transmitted over the wire.</p>
 *
 * @param entityId        entity.getId()
 * @param categoryOrdinal AnimationCategory.ordinal() — decoded back to enum on receipt
 */
public record AnimStopPayload(
        int entityId,
        int categoryOrdinal
) implements BasePayload {

    public static final CustomPacketPayload.Type<AnimStopPayload> TYPE =
            new CustomPacketPayload.Type<>(
                    ResourceLocation.fromNamespaceAndPath("yebisurpg", "anim_stop"));

    public static final StreamCodec<ByteBuf, AnimStopPayload> STREAM_CODEC =
            StreamCodec.composite(
                    ByteBufCodecs.VAR_INT,  AnimStopPayload::entityId,
                    ByteBufCodecs.VAR_INT,  AnimStopPayload::categoryOrdinal,
                    AnimStopPayload::new);

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
    // Factory
    // -------------------------------------------------------------------------

    public static AnimStopPayload of(int entityId, AnimationCategory category) {
        return new AnimStopPayload(entityId, category.ordinal());
    }
}
