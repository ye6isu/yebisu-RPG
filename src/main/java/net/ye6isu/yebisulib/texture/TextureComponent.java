package net.ye6isu.yebisulib.texture;

import net.minecraft.resources.ResourceLocation;

import javax.annotation.Nullable;
import java.util.Optional;

/**
 * The fundamental composition unit of the texture system.
 *
 * <p>Each {@code TextureComponent} encapsulates one texture layer with three
 * independent, optional concerns:</p>
 * <ol>
 *   <li><b>Source texture</b> — which PNG to sample, and its Z-index (priority).</li>
 *   <li><b>Spritesheet / frame state</b> — columns × rows layout + playback.
 *       UV offsets are computed from the full texture — the PNG is never sliced.</li>
 *   <li><b>Mask role</b> — how this component participates in compositing
 *       (normal overlay, shape stencil, or alpha-conforming overlay).</li>
 * </ol>
 *
 * <p>The texture path passed to {@link Builder} must be the <b>full resource path</b>
 * including {@code textures/} prefix and {@code .png} suffix, e.g.
 * {@code "yebisurpg:textures/item/texture2.png"}. This differs from model JSON
 * shorthand ({@code "yebisurpg:item/texture2"}) — the JSON system adds the prefix/suffix
 * automatically, but direct {@code RenderType} binding does not.</p>
 *
 * <h2>UV mapping — no PNG slicing</h2>
 * <p>For a spritesheet with {@code columns=1, rows=2} (e.g. 16×32 with two 16×16 frames):
 * <pre>
 *   frame 0 → u=0.0, v=0.0,  uSpan=1.0, vSpan=0.5
 *   frame 1 → u=0.0, v=0.5,  uSpan=1.0, vSpan=0.5
 * </pre>
 * The renderer uses these four values to build the UV quad. The full texture is bound
 * once; the quad samples only the relevant region.</p>
 *
 * <h2>Quick-start examples</h2>
 * <pre>{@code
 * // Static single texture
 * TextureComponent base = new TextureComponent.Builder("yebisurpg:textures/item/texture2.png", 0)
 *     .build();
 *
 * // Animated looping spritesheet — 1 col, 2 rows, 20 ticks/frame
 * TextureComponent anim = new TextureComponent.Builder("yebisurpg:textures/item/texture2.png", 0)
 *     .spritesheet(1, 2)
 *     .animated(AnimationMode.LOOP, 20)
 *     .build();
 *
 * // Multi-state (manual frame control) — e.g. walkman toggled by right-click
 * TextureComponent toggle = new TextureComponent.Builder("yebisurpg:textures/item/texture2.png", 0)
 *     .spritesheet(1, 2)
 *     .build();  // AnimationMode.MANUAL by default when spritesheet() is called
 * toggle.getAnimation().ifPresent(a -> a.setFrame(1));
 *
 * // Ice overlay — conforms to entity transparency (no puffy block effect)
 * TextureComponent ice = new TextureComponent.Builder("yebisurpg:textures/entity/ice_overlay.png", 2)
 *     .spritesheet(4, 1)
 *     .animated(AnimationMode.LOOP, 5)
 *     .maskMode(MaskMode.ALPHA_FROM_BASE)
 *     .build();
 *
 * // Clothing shape mask — clips lower layers to shirt shape
 * TextureComponent shirtMask = new TextureComponent.Builder("yebisurpg:textures/clothing/shirt_mask.png", 1)
 *     .maskMode(MaskMode.SHAPE_MASK)
 *     .build();
 * }</pre>
 */
public final class TextureComponent {

    // ---------------------------------------------------------------------------------
    // Immutable config
    // ---------------------------------------------------------------------------------

    private final ResourceLocation texture;
    private final int zIndex;
    private final MaskMode maskMode;
    @Nullable private final ResourceLocation maskTexture;
    @Nullable private final ResourceLocation emissiveTexture;

    // Spritesheet layout — (1,1) for a plain static texture
    private final int columns;
    private final int rows;

    // ---------------------------------------------------------------------------------
    // Mutable client-side state (never sent over network)
    // ---------------------------------------------------------------------------------

    /** Non-null whenever spritesheet() or animated() was called on the Builder. */
    @Nullable private final AnimationState animation;

    // ---------------------------------------------------------------------------------
    // Private constructor
    // ---------------------------------------------------------------------------------

    private TextureComponent(Builder b) {
        this.texture          = b.texture;
        this.zIndex           = b.zIndex;
        this.maskMode         = b.maskMode;
        this.maskTexture      = b.maskTexture;
        this.emissiveTexture  = b.emissiveTexture;
        this.columns          = b.columns;
        this.rows             = b.rows;
        this.animation        = b.animation;
    }

    // ---------------------------------------------------------------------------------
    // Identity / config accessors
    // ---------------------------------------------------------------------------------

    /** The texture {@link ResourceLocation}, e.g. {@code yebisurpg:item/texture2}. */
    public ResourceLocation getTexture() { return texture; }

    /** Z-index / render priority. Lower = drawn first (beneath higher values). */
    public int getZIndex() { return zIndex; }

    /** How this component participates in stack compositing. */
    public MaskMode getMaskMode() { return maskMode; }

    /**
     * The mask texture used when {@link MaskMode#CUTOUT_BELOW} is active.
     * Where this texture is opaque and the overlay is also opaque, the layer below
     * is suppressed. Returns empty for {@link MaskMode#NORMAL} and
     * {@link MaskMode#ALPHA_FROM_BASE}.
     *
     * <p>When the mask texture is the same as the primary texture (most common case),
     * this returns {@link Optional#empty()} — the renderer uses {@link #getTexture()}
     * for both the overlay and the cutout sampling.</p>
     */
    public Optional<ResourceLocation> getMaskTexture() {
        return Optional.ofNullable(maskTexture);
    }

    /**
     * Returns the texture to sample for the cutout mask.
     * If no separate mask texture was set, falls back to the primary texture — meaning
     * "use my own pixels as the cutout shape."
     */
    public ResourceLocation getEffectiveMaskTexture() {
        return maskTexture != null ? maskTexture : texture;
    }

    /**
     * Returns the emissive overlay texture for this layer, if any.
     * When present, this texture is rendered on top using full-bright lighting
     * ({@code entityTranslucentEmissive}), making it glow regardless of light level.
     */
    public Optional<ResourceLocation> getEmissiveTexture() {
        return Optional.ofNullable(emissiveTexture);
    }

    /** Number of frame columns in the spritesheet (1 for a plain texture). */
    public int getColumns() { return columns; }

    /** Number of frame rows in the spritesheet (1 for a plain texture). */
    public int getRows() { return rows; }

    /** {@code true} when this component uses a multi-frame spritesheet. */
    public boolean isSpritesheet() { return columns * rows > 1; }

    // ---------------------------------------------------------------------------------
    // UV accessors — used by the renderer, allocation-free
    // ---------------------------------------------------------------------------------

    /**
     * U coordinate of the top-left corner of the current frame (0.0–1.0).
     * Always 0.0 for a single-frame texture.
     */
    public float getU() {
        if (animation == null) return 0f;
        return (float) (animation.getCurrentFrame() % columns) / columns;
    }

    /**
     * V coordinate of the top-left corner of the current frame (0.0–1.0).
     * Always 0.0 for a single-frame texture.
     */
    public float getV() {
        if (animation == null) return 0f;
        return (float) (animation.getCurrentFrame() / columns) / rows;
    }

    /**
     * Width of one frame as a fraction of the full texture width (1.0 / columns).
     * Always 1.0 for a single-frame texture.
     */
    public float getUSpan() { return 1f / columns; }

    /**
     * Height of one frame as a fraction of the full texture height (1.0 / rows).
     * Always 1.0 for a single-frame texture.
     */
    public float getVSpan() { return 1f / rows; }

    // ---------------------------------------------------------------------------------
    // Animation access
    // ---------------------------------------------------------------------------------

    /**
     * The mutable playback state. Present whenever {@link Builder#spritesheet} or
     * {@link Builder#animated} was called. Use this to:
     * <ul>
     *   <li>Manually set a frame: {@code anim.setFrame(1)}</li>
     *   <li>Stop a looping animation: {@code anim.stop()}</li>
     *   <li>Restart: {@code anim.restart()}</li>
     *   <li>Check if PLAY_ONCE finished: {@code anim.isFinished()}</li>
     * </ul>
     */
    public Optional<AnimationState> getAnimation() { return Optional.ofNullable(animation); }

    // ---------------------------------------------------------------------------------
    // Builder
    // ---------------------------------------------------------------------------------

    /**
     * Fluent builder for {@link TextureComponent}.
     *
     * <p>Call order is flexible — all methods except the constructor are optional.</p>
     *
     * <h2>Calling convention</h2>
     * <ul>
     *   <li>Use {@link #spritesheet(int, int)} to declare layout + enable {@link AnimationMode#MANUAL}.</li>
     *   <li>Chain {@link #animated(AnimationMode, int)} after {@link #spritesheet} to enable auto-tick.</li>
     *   <li>Use {@link #maskMode(MaskMode)} for compositing role.</li>
     * </ul>
     */
    public static final class Builder {

        private final ResourceLocation texture;
        private final int zIndex;

        private MaskMode maskMode = MaskMode.NORMAL;
        @Nullable private ResourceLocation maskTexture    = null;
        @Nullable private ResourceLocation emissiveTexture = null;
        private int columns = 1;
        private int rows    = 1;
        @Nullable private AnimationState animation = null;

        /**
         * @param texturePath full resource path including {@code textures/} and {@code .png},
         *                    e.g. {@code "yebisurpg:textures/item/texture2.png"}.
         *                    Do NOT use the model JSON shorthand ({@code "yebisurpg:item/texture2"})
         *                    — that format is only valid in JSON; direct RenderType binding needs the full path.
         * @param zIndex      render priority — lower values drawn first
         */
        public Builder(String texturePath, int zIndex) {
            this.texture = ResourceLocation.parse(texturePath);
            this.zIndex  = zIndex;
        }

        /** @param texture pre-built {@link ResourceLocation} */
        public Builder(ResourceLocation texture, int zIndex) {
            this.texture = texture;
            this.zIndex  = zIndex;
        }

        /**
         * Declares the spritesheet layout and enables {@link AnimationMode#MANUAL} playback.
         * The frame is controlled by calling {@link AnimationState#setFrame(int)} on the
         * returned component's animation state.
         *
         * <p>For a 16×32 PNG with two 16×16 frames stacked vertically: {@code spritesheet(1, 2)}.</p>
         *
         * @param columns number of frame columns in the PNG
         * @param rows    number of frame rows in the PNG
         */
        public Builder spritesheet(int columns, int rows) {
            if (columns < 1 || rows < 1) throw new IllegalArgumentException("columns and rows >= 1");
            this.columns   = columns;
            this.rows      = rows;
            this.animation = new AnimationState(columns * rows, Integer.MAX_VALUE, AnimationMode.MANUAL);
            return this;
        }

        /**
         * Enables automatic tick-based frame advancement. Must be called <em>after</em>
         * {@link #spritesheet(int, int)} — the layout must already be declared.
         *
         * @param mode          {@link AnimationMode#LOOP} or {@link AnimationMode#PLAY_ONCE}
         * @param ticksPerFrame ticks between frame advances (20 = 1 second, 1 = every tick)
         */
        public Builder animated(AnimationMode mode, int ticksPerFrame) {
            if (this.animation == null) throw new IllegalStateException(
                "Call spritesheet(columns, rows) before animated()");
            if (mode == AnimationMode.MANUAL) throw new IllegalArgumentException(
                "Use spritesheet() alone for MANUAL mode");
            this.animation = new AnimationState(columns * rows, ticksPerFrame, mode);
            return this;
        }

        /**
         * Sets the compositing role of this component in the stack.
         *
         * <ul>
         *   <li>{@link MaskMode#NORMAL} — standard overlay (default)</li>
         *   <li>{@link MaskMode#CUTOUT_BELOW} — punch holes in the layer below where this
         *       component is opaque. The primary texture is used as both the overlay and
         *       the cutout mask. For a separate mask texture use
         *       {@link #maskMode(MaskMode, String)}.</li>
         *   <li>{@link MaskMode#ALPHA_FROM_BASE} — conforms to the silhouette of layers beneath</li>
         * </ul>
         */
        public Builder maskMode(MaskMode mode) {
            this.maskMode    = mode;
            this.maskTexture = null; // use primary texture as mask
            return this;
        }

        /**
         * Sets {@link MaskMode#CUTOUT_BELOW} with a separate mask texture.
         * Use this when the cutout shape is defined by a different PNG than the overlay.
         *
         * @param maskTexturePath full path to the mask texture,
         *                        e.g. {@code "yebisurpg:textures/clothing/jacket_mask.png"}
         */
        public Builder maskMode(MaskMode mode, String maskTexturePath) {
            this.maskMode    = mode;
            this.maskTexture = ResourceLocation.parse(maskTexturePath);
            return this;
        }

        /**
         * Attaches an emissive overlay texture to this layer.
         * The emissive texture is rendered on top of the composited skin using
         * full-bright lighting, making it glow regardless of the in-game light level.
         *
         * @param emissiveTexturePath full path e.g. {@code "yebisurpg:textures/test/bandana_emissive.png"}
         */
        public Builder emissive(String emissiveTexturePath) {
            this.emissiveTexture = ResourceLocation.parse(emissiveTexturePath);
            return this;
        }

        /** Builds the {@link TextureComponent}. */
        public TextureComponent build() {
            return new TextureComponent(this);
        }
    }
}
