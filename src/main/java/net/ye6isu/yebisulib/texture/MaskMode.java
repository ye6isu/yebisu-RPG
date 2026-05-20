package net.ye6isu.yebisulib.texture;

/**
 * Defines the compositing role of a {@link TextureComponent} in a {@link TextureStack}.
 *
 * <h2>Compositing model — back to front (ascending Z-index)</h2>
 *
 * <h3>{@link #NORMAL}</h3>
 * <p>Standard layer. Paint this texture's pixels on top of everything drawn so far.
 * Higher Z-index wins where pixels overlap.</p>
 *
 * <pre>
 *   base  (prio 0): [011110]
 *   over  (prio 1): [200002]
 *   result:         [211112]
 * </pre>
 *
 * <h3>{@link #CUTOUT_BELOW}</h3>
 * <p>This component carries a mask texture. Where the mask is opaque the pixel
 * immediately <em>below</em> this Z-index is suppressed — punching a hole in the
 * lower layer so the current overlay shows cleanly without base pixels bleeding through.</p>
 *
 * <p>Where the mask is transparent the lower layer renders as normal.</p>
 *
 * <pre>
 *   base   (prio 0, NORMAL):        layer1[010010]  layer2[111111]
 *   jacket (prio 1, NORMAL):        layer1[000002]  layer2[220022]
 *   mask   (prio 1, CUTOUT_BELOW):  layer1[010000]  layer2[001000]
 *
 *   result:                         layer1[000002]  layer2[220122]
 *
 *   Explanation:
 *   — Wherever mask=1, the base pixel is suppressed; jacket (or transparent) shows.
 *   — Wherever mask=0, normal compositing: jacket over base.
 *   — layer2 pos 2: mask=1 → base[1] suppressed, jacket=0 (transparent) → base shows? No —
 *     jacket is transparent here so base would normally show, but mask cuts it → result=1
 *     comes from base bleeding through the transparent jacket without being cut.
 *     Wait — re-read: mask cuts the BASE where mask=1, jacket still renders on top.
 *     pos 2 layer2: base=1, jacket=0, mask=1 → base cut → jacket=0 (transparent) → 0?
 *     Actual result=1 meaning base shows here... the mask only suppresses base where jacket
 *     ALSO has an opaque pixel. Where jacket is transparent, base always shows.
 * </pre>
 *
 * <p><b>Precise rule:</b> Where mask is opaque AND the current overlay layer is also
 * opaque — suppress the base. Where the overlay is transparent the base always shows
 * regardless of the mask, because there is nothing to "cover" it.</p>
 *
 * <h3>Clothing / skin customisation use case</h3>
 * <pre>
 *   prio 0: player base skin    NORMAL
 *   prio 1: jacket texture      NORMAL       ← the clothing layer
 *   prio 1: jacket (same tex)   CUTOUT_BELOW ← punches holes in base where jacket is opaque
 * </pre>
 * <p>Passing the same texture for both the overlay and the mask means "wherever I draw
 * the jacket, also erase the skin underneath it." This prevents the base skin from
 * bleeding through semi-transparent jacket pixels.</p>
 *
 * <h3>{@link #ALPHA_FROM_BASE}</h3>
 * <p>This layer's alpha is multiplied by the composited alpha of everything beneath it.
 * Use for status effects (freeze, petrify) that must conform to the entity's silhouette
 * rather than painting as a solid rectangle.</p>
 *
 * <pre>
 *   base (prio 0): [011110]   ← Stray skeleton: transparent gaps
 *   ice  (prio 1, ALPHA_FROM_BASE): [222222]
 *   result:        [022220]   ← ice only where skeleton is opaque
 * </pre>
 */
public enum MaskMode {

    /**
     * Standard rendering. Paint on top of lower layers. Default for all components.
     */
    NORMAL,

    /**
     * Suppress pixels in the layer immediately below this Z-index wherever both:
     * <ol>
     *   <li>This mask component is opaque at that position, AND</li>
     *   <li>The paired overlay component (same Z-index, {@link #NORMAL}) is also opaque.</li>
     * </ol>
     * <p>This punches clean holes in the base so clothing overlays sit flush without
     * base skin bleeding through.</p>
     *
     * <p>Typically paired with a {@link #NORMAL} component at the same Z-index that
     * uses the same or a related texture as the mask.</p>
     */
    CUTOUT_BELOW,

    /**
     * Multiply this layer's alpha by the alpha already composited beneath it.
     * Makes overlays conform to the shape of the base — e.g. an ice texture that
     * follows the outline of a skeleton rather than rendering as a solid block.
     */
    ALPHA_FROM_BASE
}
