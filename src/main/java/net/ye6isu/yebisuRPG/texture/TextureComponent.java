package net.ye6isu.yebisuRPG.texture;

import net.minecraft.resources.ResourceLocation;

import javax.annotation.Nullable;
import java.util.Optional;

/**
 * One overlay layer: a texture, how it blends/masks against what's beneath it,
 * and (optionally) spritesheet frame/playback info. Entity-agnostic — used
 * identically whether the layer is being composited onto a player's skin or a
 * mob's texture.
 *
 * <p>There is exactly one animation model, always server-synced: a playhead
 * ({@link #startTick}, {@link #speed}, {@link #loopMode}) computed the same way as
 * bone/pose animation ({@code AnimationPlayhead}). Setting it up is a Blocky/API
 * concern (play/stop with a loop mode and speed) — the texture asset itself only
 * ever carries {@link #columns}/{@link #rows}, never a baked-in animation choice.
 * When not playing, {@link #restFrame} is shown — a fixed frame, e.g. for
 * value-indicator use cases that don't animate at all.</p>
 */
public final class TextureComponent {

    private final ResourceLocation texture;
    private final int zIndex;
    private final MaskMode maskMode;
    @Nullable private final ResourceLocation maskTexture;
    @Nullable private final ResourceLocation emissiveTexture;
    private final int columns;
    private final int rows;
    private final boolean playing;
    private final int ticksPerFrame;
    private final FrameLoopMode loopMode;
    private final long startTick;
    private final float speed;
    private final int restFrame;

    private TextureComponent(Builder b) {
        this.texture         = b.texture;
        this.zIndex          = b.zIndex;
        this.maskMode        = b.maskMode;
        this.maskTexture     = b.maskTexture;
        this.emissiveTexture = b.emissiveTexture;
        this.columns         = b.columns;
        this.rows            = b.rows;
        this.playing         = b.playing;
        this.ticksPerFrame   = b.ticksPerFrame;
        this.loopMode        = b.loopMode;
        this.startTick       = b.startTick;
        this.speed           = b.speed;
        this.restFrame       = b.restFrame;
    }

    public ResourceLocation getTexture()  { return texture; }
    public int getZIndex()                { return zIndex; }
    public MaskMode getMaskMode()         { return maskMode; }
    public Optional<ResourceLocation> getMaskTexture() { return Optional.ofNullable(maskTexture); }
    public ResourceLocation getEffectiveMaskTexture()  { return maskTexture != null ? maskTexture : texture; }
    public Optional<ResourceLocation> getEmissiveTexture() { return Optional.ofNullable(emissiveTexture); }
    public int getColumns() { return columns; }
    public int getRows()    { return rows; }
    public boolean isSpritesheet() { return columns * rows > 1; }
    public boolean isPlaying()     { return playing; }

    /** Current frame index — playhead-driven while playing, otherwise the fixed rest frame. */
    public int getCurrentFrame(long currentTick) {
        if (!isSpritesheet()) return 0;
        int frameCount = columns * rows;
        if (playing) return TextureFrameClock.frameAt(currentTick, ticksPerFrame, frameCount, loopMode, startTick, speed);
        return Math.max(0, Math.min(restFrame, frameCount - 1));
    }

    public float getU(long currentTick) { return (float) (getCurrentFrame(currentTick) % columns) / columns; }
    public float getV(long currentTick) { return (float) (getCurrentFrame(currentTick) / columns) / rows; }
    public float getUSpan() { return 1f / columns; }
    public float getVSpan() { return 1f / rows; }

    public static final class Builder {
        private final ResourceLocation texture;
        private final int zIndex;
        private MaskMode maskMode = MaskMode.NORMAL;
        @Nullable private ResourceLocation maskTexture = null;
        @Nullable private ResourceLocation emissiveTexture = null;
        private int columns = 1;
        private int rows = 1;
        private boolean playing = false;
        private int ticksPerFrame = 4;
        private FrameLoopMode loopMode = FrameLoopMode.LOOP;
        private long startTick = 0L;
        private float speed = 1f;
        private int restFrame = 0;

        public Builder(String texturePath, int zIndex) {
            this.texture = ResourceLocation.parse(texturePath);
            this.zIndex  = zIndex;
        }

        public Builder(ResourceLocation texture, int zIndex) {
            this.texture = texture;
            this.zIndex  = zIndex;
        }

        public Builder spritesheet(int columns, int rows) {
            if (columns < 1 || rows < 1) throw new IllegalArgumentException("columns and rows >= 1");
            this.columns = columns;
            this.rows    = rows;
            return this;
        }

        /** Server-synced playback — see class docs. Call {@link #spritesheet} first. */
        public Builder play(FrameLoopMode mode, int ticksPerFrame, long startTick, float speed) {
            this.playing       = true;
            this.loopMode      = mode;
            this.ticksPerFrame = Math.max(1, ticksPerFrame);
            this.startTick     = startTick;
            this.speed         = speed > 0f ? speed : 1f;
            return this;
        }

        /** Fixed, non-animating frame — see class docs. Call {@link #spritesheet} first. */
        public Builder restFrame(int frame) {
            this.playing   = false;
            this.restFrame = frame;
            return this;
        }

        public Builder maskMode(MaskMode mode) {
            this.maskMode = mode; this.maskTexture = null; return this;
        }

        public Builder maskMode(MaskMode mode, String maskTexturePath) {
            this.maskMode = mode; this.maskTexture = ResourceLocation.parse(maskTexturePath); return this;
        }

        public Builder emissive(String emissiveTexturePath) {
            this.emissiveTexture = ResourceLocation.parse(emissiveTexturePath); return this;
        }

        public TextureComponent build() { return new TextureComponent(this); }
    }
}
