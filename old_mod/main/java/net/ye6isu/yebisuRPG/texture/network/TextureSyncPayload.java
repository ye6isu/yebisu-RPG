package net.ye6isu.yebisuRPG.texture.network;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.network.BasePayload;

import java.util.List;

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

    public record LayerData(LayerBase base, LayerAnim anim, LayerEmissive emissive) {

        public static final StreamCodec<ByteBuf, LayerData> STREAM_CODEC =
            StreamCodec.composite(
                LayerBase.STREAM_CODEC,     LayerData::base,
                LayerAnim.STREAM_CODEC,     LayerData::anim,
                LayerEmissive.STREAM_CODEC, LayerData::emissive,
                LayerData::new);

        public static LayerData simple(String texturePath, int zIndex) {
            return new LayerData(new LayerBase(texturePath, zIndex, (byte)0, false, "", 0), LayerAnim.NONE, LayerEmissive.NONE);
        }

        public static LayerData maskedByBase(String texturePath, int zIndex) {
            return new LayerData(new LayerBase(texturePath, zIndex, (byte)1, false, "", 0), LayerAnim.NONE, LayerEmissive.NONE);
        }

        public static LayerData cutoutWithMask(String texturePath, int zIndex, String maskPath) {
            return new LayerData(new LayerBase(texturePath, zIndex, (byte)1, true, maskPath, 0), LayerAnim.NONE, LayerEmissive.NONE);
        }

        public static LayerData cutoutWithMaskAndEmissive(String texturePath, int zIndex, String maskPath, String emissivePath) {
            return new LayerData(new LayerBase(texturePath, zIndex, (byte)1, true, maskPath, 0), LayerAnim.NONE, new LayerEmissive(emissivePath));
        }

        public static LayerData spritesheet(String texturePath, int zIndex,
                int columns, int rows, int defaultFrame) {
            return new LayerData(new LayerBase(texturePath, zIndex, (byte)0, false, "", 0),
                new LayerAnim(false, columns, rows, 1, (byte)0, defaultFrame), LayerEmissive.NONE);
        }

        public static LayerData spritesheetWithMask(String texturePath, int zIndex, String maskPath,
                int columns, int rows, int defaultFrame) {
            return new LayerData(new LayerBase(texturePath, zIndex, (byte)1, true, maskPath, 0),
                new LayerAnim(false, columns, rows, 1, (byte)0, defaultFrame), LayerEmissive.NONE);
        }

        public static LayerData animatedCutoutWithMask(String texturePath, int zIndex, String maskPath,
                int columns, int rows, int ticksPerFrame, byte animModeByte) {
            return animatedCutoutWithMask(texturePath, zIndex, maskPath, columns, rows, ticksPerFrame, animModeByte, 0);
        }

        public static LayerData animatedCutoutWithMask(String texturePath, int zIndex, String maskPath,
                int columns, int rows, int ticksPerFrame, byte animModeByte, int defaultFrame) {
            return new LayerData(new LayerBase(texturePath, zIndex, (byte)1, true, maskPath, 0),
                new LayerAnim(true, columns, rows, ticksPerFrame, animModeByte, defaultFrame), LayerEmissive.NONE);
        }

        public static LayerData animatedCutoutWithMaskAndEmissive(String texturePath, int zIndex,
                String maskPath, String emissivePath, int columns, int rows, int ticksPerFrame, byte animModeByte) {
            return animatedCutoutWithMaskAndEmissive(texturePath, zIndex, maskPath, emissivePath, columns, rows, ticksPerFrame, animModeByte, 0);
        }

        public static LayerData animatedCutoutWithMaskAndEmissive(String texturePath, int zIndex,
                String maskPath, String emissivePath, int columns, int rows, int ticksPerFrame, byte animModeByte, int defaultFrame) {
            return new LayerData(new LayerBase(texturePath, zIndex, (byte)1, true, maskPath, 0),
                new LayerAnim(true, columns, rows, ticksPerFrame, animModeByte, defaultFrame), new LayerEmissive(emissivePath));
        }

        public static LayerData animated(String texturePath, int zIndex,
                byte maskModeByte, String maskPath, int maskZIndex,
                int columns, int rows, int ticksPerFrame, byte animModeByte) {
            return animated(texturePath, zIndex, maskModeByte, maskPath, maskZIndex, columns, rows, ticksPerFrame, animModeByte, 0);
        }

        public static LayerData animated(String texturePath, int zIndex,
                byte maskModeByte, String maskPath, int maskZIndex,
                int columns, int rows, int ticksPerFrame, byte animModeByte, int defaultFrame) {
            boolean hasMask = maskModeByte == 2 && !maskPath.isEmpty();
            return new LayerData(
                new LayerBase(texturePath, zIndex, maskModeByte, hasMask, hasMask ? maskPath : "", maskZIndex),
                new LayerAnim(true, columns, rows, ticksPerFrame, animModeByte, defaultFrame), LayerEmissive.NONE);
        }
    }

    public record LayerBase(String texturePath, int zIndex, byte maskModeByte, boolean hasMask, String maskPath, int maskZIndex) {
        public static final StreamCodec<ByteBuf, LayerBase> STREAM_CODEC =
            StreamCodec.composite(
                ByteBufCodecs.stringUtf8(256), LayerBase::texturePath,
                ByteBufCodecs.VAR_INT,         LayerBase::zIndex,
                ByteBufCodecs.BYTE,            LayerBase::maskModeByte,
                ByteBufCodecs.BOOL,            LayerBase::hasMask,
                ByteBufCodecs.stringUtf8(256), LayerBase::maskPath,
                ByteBufCodecs.VAR_INT,         LayerBase::maskZIndex,
                LayerBase::new);
    }

    public record LayerAnim(boolean isAnimated, int columns, int rows, int ticksPerFrame, byte animModeByte, int defaultFrame) {
        public static final LayerAnim NONE = new LayerAnim(false, 1, 1, 1, (byte)0, 0);
        public static final StreamCodec<ByteBuf, LayerAnim> STREAM_CODEC =
            StreamCodec.composite(
                ByteBufCodecs.BOOL,    LayerAnim::isAnimated,
                ByteBufCodecs.VAR_INT, LayerAnim::columns,
                ByteBufCodecs.VAR_INT, LayerAnim::rows,
                ByteBufCodecs.VAR_INT, LayerAnim::ticksPerFrame,
                ByteBufCodecs.BYTE,    LayerAnim::animModeByte,
                ByteBufCodecs.VAR_INT, LayerAnim::defaultFrame,
                LayerAnim::new);
    }

    public record LayerEmissive(String emissivePath) {
        public static final LayerEmissive NONE = new LayerEmissive("");
        public boolean hasEmissive() { return !emissivePath.isEmpty(); }
        public static final StreamCodec<ByteBuf, LayerEmissive> STREAM_CODEC =
            StreamCodec.composite(
                ByteBufCodecs.stringUtf8(256), LayerEmissive::emissivePath,
                LayerEmissive::new);
    }
}
