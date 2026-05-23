package net.ye6isu.yebisulib.texture;

import java.util.Optional;
import javax.annotation.Nullable;
import net.minecraft.resources.ResourceLocation;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/texture/TextureComponent.class */
public final class TextureComponent {
    private final ResourceLocation texture;
    private final int zIndex;
    private final MaskMode maskMode;

    @Nullable
    private final ResourceLocation maskTexture;

    @Nullable
    private final ResourceLocation emissiveTexture;
    private final int columns;
    private final int rows;

    @Nullable
    private final AnimationState animation;

    private TextureComponent(Builder b) {
        this.texture = b.texture;
        this.zIndex = b.zIndex;
        this.maskMode = b.maskMode;
        this.maskTexture = b.maskTexture;
        this.emissiveTexture = b.emissiveTexture;
        this.columns = b.columns;
        this.rows = b.rows;
        this.animation = b.animation;
    }

    public ResourceLocation getTexture() {
        return this.texture;
    }

    public int getZIndex() {
        return this.zIndex;
    }

    public MaskMode getMaskMode() {
        return this.maskMode;
    }

    public Optional<ResourceLocation> getMaskTexture() {
        return Optional.ofNullable(this.maskTexture);
    }

    public ResourceLocation getEffectiveMaskTexture() {
        return this.maskTexture != null ? this.maskTexture : this.texture;
    }

    public Optional<ResourceLocation> getEmissiveTexture() {
        return Optional.ofNullable(this.emissiveTexture);
    }

    public int getColumns() {
        return this.columns;
    }

    public int getRows() {
        return this.rows;
    }

    public boolean isSpritesheet() {
        return this.columns * this.rows > 1;
    }

    public float getU() {
        if (this.animation == null) {
            return 0.0f;
        }
        return (this.animation.getCurrentFrame() % this.columns) / this.columns;
    }

    public float getV() {
        if (this.animation == null) {
            return 0.0f;
        }
        return (this.animation.getCurrentFrame() / this.columns) / this.rows;
    }

    public float getUSpan() {
        return 1.0f / this.columns;
    }

    public float getVSpan() {
        return 1.0f / this.rows;
    }

    public Optional<AnimationState> getAnimation() {
        return Optional.ofNullable(this.animation);
    }

    /* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/texture/TextureComponent$Builder.class */
    public static final class Builder {
        private final ResourceLocation texture;
        private final int zIndex;
        private MaskMode maskMode = MaskMode.NORMAL;

        @Nullable
        private ResourceLocation maskTexture = null;

        @Nullable
        private ResourceLocation emissiveTexture = null;
        private int columns = 1;
        private int rows = 1;

        @Nullable
        private AnimationState animation = null;

        public Builder(String texturePath, int zIndex) {
            this.texture = ResourceLocation.parse(texturePath);
            this.zIndex = zIndex;
        }

        public Builder(ResourceLocation texture, int zIndex) {
            this.texture = texture;
            this.zIndex = zIndex;
        }

        public Builder spritesheet(int columns, int rows) {
            if (columns < 1 || rows < 1) {
                throw new IllegalArgumentException("columns and rows >= 1");
            }
            this.columns = columns;
            this.rows = rows;
            this.animation = new AnimationState(columns * rows, Integer.MAX_VALUE, AnimationMode.MANUAL);
            return this;
        }

        public Builder animated(AnimationMode mode, int ticksPerFrame) {
            if (this.animation == null) {
                throw new IllegalStateException("Call spritesheet(columns, rows) before animated()");
            }
            if (mode == AnimationMode.MANUAL) {
                throw new IllegalArgumentException("Use spritesheet() alone for MANUAL mode");
            }
            this.animation = new AnimationState(this.columns * this.rows, ticksPerFrame, mode);
            return this;
        }

        public Builder maskMode(MaskMode mode) {
            this.maskMode = mode;
            this.maskTexture = null;
            return this;
        }

        public Builder maskMode(MaskMode mode, String maskTexturePath) {
            this.maskMode = mode;
            this.maskTexture = ResourceLocation.parse(maskTexturePath);
            return this;
        }

        public Builder emissive(String emissiveTexturePath) {
            this.emissiveTexture = ResourceLocation.parse(emissiveTexturePath);
            return this;
        }

        public TextureComponent build() {
            return new TextureComponent(this);
        }
    }
}
