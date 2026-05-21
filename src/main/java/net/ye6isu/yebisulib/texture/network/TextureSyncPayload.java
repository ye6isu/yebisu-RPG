package net.ye6isu.yebisulib.texture.network;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisulib.network.BasePayload;

import java.util.List;

/**
 * S2C payload sent <b>once</b> by the server when an entity's texture state changes.
 *
 * <p>The server constructs a list of {@link LayerData} records and sends this single
 * packet. The client reconstructs the full {@link net.ye6isu.yebisulib.texture.TextureStack}
 * and handles all animation, masking, and UV logic locally with no further traffic.</p>
 *
 * <h2>Sending from server</h2>
 * <pre>{@code
 * // Animated ice overlay, masked to base model transparency:
 * TextureSyncPayload payload = new TextureSyncPayload(entity.getId(), List.of(
 *     LayerData.animated(
 *         "yebisurpg:textures/entity/ice_overlay.png", 2,
 *         (byte) 1,   // ALPHA_FROM_BASE
 *         "", 0,
 *         4, 1, 5, (byte) 1)  // 4 cols, 1 row, 5 ticks/frame, LOOP
 * ));
 * NetworkUtils.sendToPlayer(serverPlayer, payload);
 * }</pre>
 *
 * @param entityId the target entity's integer ID
 * @param layers   one {@link LayerData} per texture component to apply
 */
public record TextureSyncPayload(int entityId, List<LayerData> layers) implements BasePayload {

    public static final CustomPacketPayload.Type<TextureSyncPayload> TYPE =
        new CustomPacketPayload.Type<>(
            ResourceLocation.fromNamespaceAndPath("yebisurpg", "texture_sync"));

    public static final StreamCodec<ByteBuf, TextureSyncPayload> STREAM_CODEC =
        StreamCodec.composite(
            ByteBufCodecs.VAR_INT,
            TextureSyncPayload::entityId,
            LayerData.STREAM_CODEC.apply(ByteBufCodecs.list()),
            TextureSyncPayload::layers,
            TextureSyncPayload::new);

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() { return TYPE; }

    // ---------------------------------------------------------------------------------
    // LayerData — describes one TextureComponent over the wire.
    // Split into two sub-records so each composite stays within the 6-field limit.
    // ---------------------------------------------------------------------------------

    /**
     * Wire representation of a single {@link net.ye6isu.yebisulib.texture.TextureComponent}.
     *
     * @param base     base layer descriptor
     * @param anim     animation descriptor
     * @param emissive emissive descriptor (path is empty string when no emissive)
     */
    public record LayerData(LayerBase base, LayerAnim anim, LayerEmissive emissive) {

        public static final StreamCodec<ByteBuf, LayerData> STREAM_CODEC =
            StreamCodec.composite(
                LayerBase.STREAM_CODEC,     LayerData::base,
                LayerAnim.STREAM_CODEC,     LayerData::anim,
                LayerEmissive.STREAM_CODEC, LayerData::emissive,
                LayerData::new);

        // ---------------------------------------------------------------------------------
        // Factory methods
        // ---------------------------------------------------------------------------------

        /** Static texture, no mask, no animation. */
        public static LayerData simple(String texturePath, int zIndex) {
            return new LayerData(
                new LayerBase(texturePath, zIndex, (byte) 0, false, "", 0),
                LayerAnim.NONE, LayerEmissive.NONE);
        }

        /** Static texture masked by the layer beneath it in the stack. */
        public static LayerData maskedByBase(String texturePath, int zIndex) {
            return new LayerData(
                new LayerBase(texturePath, zIndex, (byte) 1, false, "", 0),
                LayerAnim.NONE, LayerEmissive.NONE);
        }

        /** Static texture masked by a dedicated mask texture. */
        public static LayerData maskedByTexture(
                String texturePath, int zIndex,
                String maskPath, int maskZIndex) {
            return new LayerData(
                new LayerBase(texturePath, zIndex, (byte) 2, true, maskPath, maskZIndex),
                LayerAnim.NONE, LayerEmissive.NONE);
        }

        /**
         * CUTOUT_BELOW with a separate shape/mask texture.
         */
        public static LayerData cutoutWithMask(
                String texturePath, int zIndex, String maskPath) {
            return new LayerData(
                new LayerBase(texturePath, zIndex, (byte) 1, true, maskPath, 0),
                LayerAnim.NONE, LayerEmissive.NONE);
        }

        /**
         * CUTOUT_BELOW with a separate mask AND an emissive overlay.
         */
        public static LayerData cutoutWithMaskAndEmissive(
                String texturePath, int zIndex, String maskPath, String emissivePath) {
            return new LayerData(
                new LayerBase(texturePath, zIndex, (byte) 1, true, maskPath, 0),
                LayerAnim.NONE, new LayerEmissive(emissivePath));
        }

        /**
         * Animated CUTOUT_BELOW with a separate shape/mask texture.
         *
         * @param animModeByte 0=MANUAL, 1=LOOP, 2=PLAY_ONCE
         */
        public static LayerData animatedCutoutWithMask(
                String texturePath, int zIndex, String maskPath,
                int columns, int rows, int ticksPerFrame, byte animModeByte) {
            return new LayerData(
                new LayerBase(texturePath, zIndex, (byte) 1, true, maskPath, 0),
                new LayerAnim(true, columns, rows, ticksPerFrame, animModeByte),
                LayerEmissive.NONE);
        }

        /**
         * Animated CUTOUT_BELOW with mask AND emissive overlay.
         *
         * @param animModeByte 0=MANUAL, 1=LOOP, 2=PLAY_ONCE
         */
        public static LayerData animatedCutoutWithMaskAndEmissive(
                String texturePath, int zIndex, String maskPath, String emissivePath,
                int columns, int rows, int ticksPerFrame, byte animModeByte) {
            return new LayerData(
                new LayerBase(texturePath, zIndex, (byte) 1, true, maskPath, 0),
                new LayerAnim(true, columns, rows, ticksPerFrame, animModeByte),
                new LayerEmissive(emissivePath));
        }

        /**
         * Animated spritesheet with configurable masking.
         *
         * @param maskModeByte 0=NONE, 1=ALPHA_FROM_BASE, 2=ALPHA_FROM_MASK
         * @param animModeByte 0=MANUAL, 1=LOOP, 2=PLAY_ONCE
         */
        public static LayerData animated(
                String texturePath, int zIndex,
                byte maskModeByte, String maskPath, int maskZIndex,
                int columns, int rows, int ticksPerFrame, byte animModeByte) {
            boolean hasMask = maskModeByte == 2 && !maskPath.isEmpty();
            return new LayerData(
                new LayerBase(texturePath, zIndex, maskModeByte, hasMask,
                    hasMask ? maskPath : "", maskZIndex),
                new LayerAnim(true, columns, rows, ticksPerFrame, animModeByte),
                LayerEmissive.NONE);
        }
    }

    // ---------------------------------------------------------------------------------
    // LayerBase — texture location, z-index, mask info (6 fields → fits composite)
    // ---------------------------------------------------------------------------------

    /**
     * @param texturePath  namespaced path e.g. {@code "yebisurpg:textures/entity/ice.png"}
     * @param zIndex       render priority (lower = drawn first)
     * @param maskModeByte 0=NONE, 1=ALPHA_FROM_BASE, 2=ALPHA_FROM_MASK
     * @param hasMask      true when a separate mask texture is provided
     * @param maskPath     mask texture path (empty string when hasMask=false)
     * @param maskZIndex   mask layer Z-index (0 when hasMask=false)
     */
    public record LayerBase(
        String  texturePath,
        int     zIndex,
        byte    maskModeByte,
        boolean hasMask,
        String  maskPath,
        int     maskZIndex
    ) {
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

    // ---------------------------------------------------------------------------------
    // LayerAnim — spritesheet playback (5 fields → fits composite)
    // ---------------------------------------------------------------------------------

    /**
     * @param isAnimated   false for static textures — remaining fields are 0 / (byte)0
     * @param columns      spritesheet columns
     * @param rows         spritesheet rows
     * @param ticksPerFrame ticks between frame advances (20 = 1 s)
     * @param animModeByte 0=MANUAL, 1=LOOP, 2=PLAY_ONCE
     */
    public record LayerAnim(
        boolean isAnimated,
        int     columns,
        int     rows,
        int     ticksPerFrame,
        byte    animModeByte
    ) {
        /** Sentinel value for non-animated layers. */
        public static final LayerAnim NONE = new LayerAnim(false, 1, 1, 1, (byte) 0);

        public static final StreamCodec<ByteBuf, LayerAnim> STREAM_CODEC =
            StreamCodec.composite(
                ByteBufCodecs.BOOL,    LayerAnim::isAnimated,
                ByteBufCodecs.VAR_INT, LayerAnim::columns,
                ByteBufCodecs.VAR_INT, LayerAnim::rows,
                ByteBufCodecs.VAR_INT, LayerAnim::ticksPerFrame,
                ByteBufCodecs.BYTE,    LayerAnim::animModeByte,
                LayerAnim::new);
    }

    // ---------------------------------------------------------------------------------
    // LayerEmissive — optional emissive overlay path
    // ---------------------------------------------------------------------------------

    /**
     * @param emissivePath full texture path for the emissive overlay, or {@code ""}
     *                     when no emissive is attached.
     */
    public record LayerEmissive(String emissivePath) {

        /** Sentinel value for layers with no emissive. */
        public static final LayerEmissive NONE = new LayerEmissive("");

        public boolean hasEmissive() { return !emissivePath.isEmpty(); }

        public static final StreamCodec<ByteBuf, LayerEmissive> STREAM_CODEC =
            StreamCodec.composite(
                ByteBufCodecs.stringUtf8(256), LayerEmissive::emissivePath,
                LayerEmissive::new);
    }
}
