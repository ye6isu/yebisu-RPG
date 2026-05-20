package net.ye6isu.yebisulib.texture;

import net.minecraft.resources.ResourceLocation;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * A Z-sorted, mutable collection of {@link TextureComponent}s bound to one entity or item.
 *
 * <p>Components are kept in ascending Z-index order so the renderer can iterate
 * and composite them back-to-front without sorting at render time. Re-sorting only
 * happens on {@link #add} — rare, driven by network events — not on every frame.</p>
 *
 * <h2>Compositing order</h2>
 * <p>The renderer walks the list in order:</p>
 * <ol>
 *   <li>{@link MaskMode#NORMAL} — paint this layer on top of everything drawn so far.</li>
 *   <li>{@link MaskMode#SHAPE_MASK} — apply as stencil: only pixels within this mask's
 *       opaque area remain visible for all layers at strictly lower Z-index.</li>
 *   <li>{@link MaskMode#ALPHA_FROM_BASE} — multiply this layer's alpha by the composited
 *       alpha beneath it before painting.</li>
 * </ol>
 *
 * <h2>Thread safety</h2>
 * <p>Mutated and read on the client thread only.</p>
 */
public final class TextureStack {

    private final List<TextureComponent> components = new ArrayList<>();

    // ---------------------------------------------------------------------------------
    // Mutation
    // ---------------------------------------------------------------------------------

    /**
     * Adds a component and re-sorts the stack by Z-index ascending.
     *
     * @param component the component to add
     */
    public void add(TextureComponent component) {
        components.add(component);
        components.sort((a, b) -> Integer.compare(a.getZIndex(), b.getZIndex()));
    }

    /**
     * Removes all components whose texture matches {@code location}.
     *
     * @param location the texture to remove
     * @return {@code true} if at least one component was removed
     */
    public boolean remove(ResourceLocation location) {
        return components.removeIf(c -> c.getTexture().equals(location));
    }

    /** Removes all components. */
    public void clear() {
        components.clear();
    }

    // ---------------------------------------------------------------------------------
    // Tick — advances all animated components
    // ---------------------------------------------------------------------------------

    /**
     * Advances animation states by one game tick.
     * Called by {@link TextureManager#clientTick()} — never call from render code.
     */
    public void tick() {
        for (TextureComponent c : components) {
            c.getAnimation().ifPresent(AnimationState::tick);
        }
    }

    // ---------------------------------------------------------------------------------
    // Read (renderer)
    // ---------------------------------------------------------------------------------

    /**
     * Z-sorted, unmodifiable view of all components.
     * Allocation-free — safe to call every frame.
     */
    public List<TextureComponent> getLayers() {
        return Collections.unmodifiableList(components);
    }

    /** @return number of components in the stack */
    public int size() { return components.size(); }

    /** @return {@code true} when no components are registered */
    public boolean isEmpty() { return components.isEmpty(); }
}
