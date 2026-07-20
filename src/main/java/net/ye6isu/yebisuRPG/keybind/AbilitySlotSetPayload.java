package net.ye6isu.yebisuRPG.keybind;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.network.BasePayload;

/** Client debug screen -> server: set or clear one player ability slot. */
public record AbilitySlotSetPayload(int slot, boolean alt, String abilityId) implements BasePayload {

    public static final CustomPacketPayload.Type<AbilitySlotSetPayload> TYPE =
            new CustomPacketPayload.Type<>(
                    ResourceLocation.fromNamespaceAndPath("yebisurpg", "ability_slot_set"));

    public static final StreamCodec<ByteBuf, AbilitySlotSetPayload> STREAM_CODEC =
            new StreamCodec<>() {
                @Override
                public AbilitySlotSetPayload decode(ByteBuf buf) {
                    return new AbilitySlotSetPayload(
                            ByteBufCodecs.VAR_INT.decode(buf),
                            ByteBufCodecs.BOOL.decode(buf),
                            ByteBufCodecs.stringUtf8(128).decode(buf));
                }

                @Override
                public void encode(ByteBuf buf, AbilitySlotSetPayload payload) {
                    ByteBufCodecs.VAR_INT.encode(buf, payload.slot());
                    ByteBufCodecs.BOOL.encode(buf, payload.alt());
                    ByteBufCodecs.stringUtf8(128).encode(buf, payload.abilityId() != null ? payload.abilityId() : "");
                }
            };

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }
}
