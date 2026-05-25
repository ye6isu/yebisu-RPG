package net.ye6isu.yebisuRPG.texture;

import net.minecraft.resources.ResourceLocation;

import javax.annotation.Nullable;
import java.util.Optional;

public final class TextureComponent {

    private final ResourceLocation texture;
    private final int zIndex;
    private final MaskMode maskMode;
    @Nullable private final ResourceLocation maskTexture;
    @Nullable private final ResourceLocation emissiveTexture;
    private final int columns;
    private final int rows;
    @Nullable private final AnimationState animation;

    private TextureComponent(Builder b) {
        this.texture         = b.texture;
        this.zIndex          = b.zIndex;
        this.maskMode        = b.maskMode;
        this.maskTexture     = b.maskTexture;
        this.emissiveTexture = b.emissiveTexture;
        this.columns         = b.columns;
        this.rows            = b.rows;
        this.animation       = b.animation;
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

    public float getU() { return animation == null ? 0f : (float)(animation.getCurrentFrame() % columns) / columns; }
    public float getV() { return animation == null ? 0f : (float)(animation.getCurrentFrame() / columns) / rows; }
    public float getUSpan() { return 1f / columns; }
    public float getVSpan() { return 1f / rows; }

    public Optional<AnimationState> getAnimation() { return Optional.ofNullable(animation); }

    public static final class Builder {
        private final ResourceLocation texture;
        private final int zIndex;
        private MaskMode maskMode = MaskMode.NORMAL;
        @Nullable private ResourceLocation maskTexture = null;
        @Nullable private ResourceLocation emissiveTexture = null;
        private int columns = 1;
        private int rows = 1;
        @Nullable private AnimationState animation = null;

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
            this.columns   = columns;
            this.rows      = rows;
            this.animation = new AnimationState(columns * rows, Integer.MAX_VALUE, AnimationMode.MANUAL);
            return this;
        }

        public Builder animated(AnimationMode mode, int ticksPerFrame) {
            if (this.animation == null) throw new IllegalStateException("Call spritesheet() before animated()");
            if (mode == AnimationMode.MANUAL) throw new IllegalArgumentException("Use spritesheet() alone for MANUAL");
            this.animation = new AnimationState(columns * rows, ticksPerFrame, mode);
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
