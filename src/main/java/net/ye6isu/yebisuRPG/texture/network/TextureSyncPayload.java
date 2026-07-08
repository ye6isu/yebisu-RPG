package net.ye6isu.yebisuRPG.texture.network;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.network.BasePayload;
import net.ye6isu.yebisuRPG.texture.FrameLoopMode;

import java.util.List;

/**
 * Server-to-client: the full, authoritative overlay layer list for one entity.
 * Always sent as a complete replacement (never a delta) — see {@code TextureServerEvents}.
 */
public record TextureSyncPayload(int entityId, List<LayerData> layers) implements BasePayload {

    public static final CustomPacketPayload.Type<TextureSyncPayload> TYPE =
        new CustomPacketPayload.Type<>(
            ResourceLocation.fromNamespaceAndPath("yebisurpg", "texture_sync"));

    public static final StreamCodec<ByteBuf, TextureSyncPayload> STREAM_CODEC =
        StreamCodec.composite(
            ByteBufCodecs.VAR_INT, TextureSyncPayload::entityId,
            LayerData.STREAM_CODEC.apply(ByteBufCodecs.list()), TextureSyncPayload::layers,
            TextureSyncPayload::new);

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() { return TYPE; }

    /**
     * One overlay layer. Spritesheet playback is a single server-synced playhead — the same
     * model as bone/pose animation ({@code AnimationPlayhead}): {@code startTick} + {@code speed}
     * let every client (including late joiners, via re-send on login/start-tracking) compute the
     * identical current frame independently, with no per-frame network traffic needed. When
     * {@code playing} is false, {@code restFrame} is shown as a fixed, non-animating frame.
     */
    public record LayerData(
            String texturePath, int zIndex,
            byte maskModeByte, String maskPath,
            String emissivePath,
            int columns, int rows,
            boolean playing, byte loopModeByte, int ticksPerFrame, long startTick, float speed,
            int restFrame
    ) {
        public static final StreamCodec<ByteBuf, LayerData> STREAM_CODEC = new StreamCodec<>() {
            @Override
            public LayerData decode(ByteBuf buf) {
                return new LayerData(
                        ByteBufCodecs.stringUtf8(256).decode(buf),
                        ByteBufCodecs.VAR_INT.decode(buf),
                        ByteBufCodecs.BYTE.decode(buf),
                        ByteBufCodecs.stringUtf8(256).decode(buf),
                        ByteBufCodecs.stringUtf8(256).decode(buf),
                        ByteBufCodecs.VAR_INT.decode(buf),
                        ByteBufCodecs.VAR_INT.decode(buf),
                        ByteBufCodecs.BOOL.decode(buf),
                        ByteBufCodecs.BYTE.decode(buf),
                        ByteBufCodecs.VAR_INT.decode(buf),
                        ByteBufCodecs.VAR_LONG.decode(buf),
                        ByteBufCodecs.FLOAT.decode(buf),
                        ByteBufCodecs.VAR_INT.decode(buf));
            }

            @Override
            public void encode(ByteBuf buf, LayerData d) {
                ByteBufCodecs.stringUtf8(256).encode(buf, d.texturePath());
                ByteBufCodecs.VAR_INT.encode(buf, d.zIndex());
                ByteBufCodecs.BYTE.encode(buf, d.maskModeByte());
                ByteBufCodecs.stringUtf8(256).encode(buf, d.maskPath());
                ByteBufCodecs.stringUtf8(256).encode(buf, d.emissivePath());
                ByteBufCodecs.VAR_INT.encode(buf, d.columns());
                ByteBufCodecs.VAR_INT.encode(buf, d.rows());
                ByteBufCodecs.BOOL.encode(buf, d.playing());
                ByteBufCodecs.BYTE.encode(buf, d.loopModeByte());
                ByteBufCodecs.VAR_INT.encode(buf, d.ticksPerFrame());
                ByteBufCodecs.VAR_LONG.encode(buf, d.startTick());
                ByteBufCodecs.FLOAT.encode(buf, d.speed());
                ByteBufCodecs.VAR_INT.encode(buf, d.restFrame());
            }
        };

        public static LayerData simple(String texturePath, int zIndex) {
            return new LayerData(texturePath, zIndex, (byte) 0, "", "", 1, 1, false, (byte) 0, 4, 0L, 1f, 0);
        }

        public static LayerData alphaFromBase(String texturePath, int zIndex) {
            return new LayerData(texturePath, zIndex, (byte) 2, "", "", 1, 1, false, (byte) 0, 4, 0L, 1f, 0);
        }

        public static LayerData cutoutWithMask(String texturePath, int zIndex, String maskPath) {
            return new LayerData(texturePath, zIndex, (byte) 1, maskPath, "", 1, 1, false, (byte) 0, 4, 0L, 1f, 0);
        }

        public static LayerData cutoutWithMaskAndEmissive(String texturePath, int zIndex, String maskPath, String emissivePath) {
            return new LayerData(texturePath, zIndex, (byte) 1, maskPath, emissivePath, 1, 1, false, (byte) 0, 4, 0L, 1f, 0);
        }

        /** A spritesheet layer at rest on a fixed frame (not playing). */
        public static LayerData restFrameSpritesheet(String texturePath, int zIndex,
                int columns, int rows, int restFrame) {
            return new LayerData(texturePath, zIndex, (byte) 0, "", "", columns, rows, false, (byte) 0, 4, 0L, 1f, restFrame);
        }

        public static LayerData restFrameCutoutWithMask(String texturePath, int zIndex, String maskPath,
                int columns, int rows, int restFrame) {
            return new LayerData(texturePath, zIndex, (byte) 1, maskPath, "", columns, rows, false, (byte) 0, 4, 0L, 1f, restFrame);
        }

        /** A spritesheet layer actively playing a server-synced animation — see class docs. */
        public static LayerData playingSpritesheet(String texturePath, int zIndex,
                int columns, int rows, byte loopModeByte, int ticksPerFrame, long startTick, float speed) {
            return new LayerData(texturePath, zIndex, (byte) 0, "", "", columns, rows, true, loopModeByte, ticksPerFrame, startTick, speed, 0);
        }

        public static LayerData playingCutoutWithMask(String texturePath, int zIndex, String maskPath,
                int columns, int rows, byte loopModeByte, int ticksPerFrame, long startTick, float speed) {
            return new LayerData(texturePath, zIndex, (byte) 1, maskPath, "", columns, rows, true, loopModeByte, ticksPerFrame, startTick, speed, 0);
        }

        /** @return a copy of this layer stopped at a fixed rest frame — used by {@code TextureServerEvents#stop}. */
        public LayerData stoppedAt(int frame) {
            return new LayerData(texturePath, zIndex, maskModeByte, maskPath, emissivePath,
                    columns, rows, false, loopModeByte, ticksPerFrame, startTick, speed, frame);
        }

        /** @return a copy of this layer set to play from now — used by {@code TextureServerEvents#play}. */
        public LayerData playingFrom(long startTick, FrameLoopMode mode, int ticksPerFrame, float speed) {
            return new LayerData(texturePath, zIndex, maskModeByte, maskPath, emissivePath,
                    columns, rows, true, mode.toByte(), ticksPerFrame, startTick, speed, restFrame);
        }

        public boolean hasMask() { return maskModeByte == 1 && !maskPath.isEmpty(); }
        public boolean hasEmissive() { return !emissivePath.isEmpty(); }
    }
}
