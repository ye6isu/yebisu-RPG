package net.ye6isu.yebisuRPG.keybind;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.network.BasePayload;

/**
 * Client -> server: a YCS combo keybind's raw press/release edge fired.
 * Keybinds are not vanilla {@link net.minecraft.client.KeyMapping}s (they support true
 * multi-key combos, which vanilla's KeyMapping cannot represent) so their down/up edges
 * are tracked client-side each tick and reported over this payload.
 */
public record KeybindTriggerPayload(String keybindId, boolean pressed) implements BasePayload {

    public static final CustomPacketPayload.Type<KeybindTriggerPayload> TYPE =
            new CustomPacketPayload.Type<>(
                    ResourceLocation.fromNamespaceAndPath("yebisurpg", "keybind_trigger"));

    public static final StreamCodec<ByteBuf, KeybindTriggerPayload> STREAM_CODEC =
            new StreamCodec<>() {
                @Override
                public KeybindTriggerPayload decode(ByteBuf buf) {
                    return new KeybindTriggerPayload(
                            ByteBufCodecs.stringUtf8(64).decode(buf),
                            ByteBufCodecs.BOOL.decode(buf));
                }
                @Override
                public void encode(ByteBuf buf, KeybindTriggerPayload p) {
                    ByteBufCodecs.stringUtf8(64).encode(buf, p.keybindId());
                    ByteBufCodecs.BOOL.encode(buf, p.pressed());
                }
            };

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() { return TYPE; }
}
