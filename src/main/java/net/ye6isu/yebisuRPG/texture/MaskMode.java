package net.ye6isu.yebisuRPG.texture;

/**
 * How an overlay layer blends against whatever is beneath it.
 */
public enum MaskMode {
    /** Plain alpha-blend on top — no masking. */
    NORMAL,
    /** Overlay only shows where a separate shape-mask texture is opaque; erases the base there first. */
    CUTOUT_BELOW,
    /** Overlay only shows where the base texture beneath is already opaque — follows the base's own shape. */
    ALPHA_FROM_BASE
}
