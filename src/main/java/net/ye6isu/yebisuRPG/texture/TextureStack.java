package net.ye6isu.yebisuRPG.texture;

import net.minecraft.resources.ResourceLocation;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * An ordered (by z-index) set of overlay layers active on a single entity.
 * Frames are computed on demand from the current tick — nothing here needs
 * per-frame ticking/mutation.
 */
public final class TextureStack {

    private final List<TextureComponent> components = new ArrayList<>();

    public void add(TextureComponent component) {
        components.add(component);
        components.sort((a, b) -> Integer.compare(a.getZIndex(), b.getZIndex()));
    }

    public boolean remove(ResourceLocation location) {
        return components.removeIf(c -> c.getTexture().equals(location));
    }

    public void clear() { components.clear(); }

    public List<TextureComponent> getLayers() { return Collections.unmodifiableList(components); }
    public int size()      { return components.size(); }
    public boolean isEmpty() { return components.isEmpty(); }

    /**
     * True if any active layer uses {@link MaskMode#ALPHA_FROM_BASE} ("Mask Over Base" in
     * Blocky) — this mode means the overlay is meant to fully take over the entity's visible
     * shape, so vanilla's own extra special-part passes (glowing eyes, sheep wool, mooshroom
     * mushrooms) should be suppressed rather than drawn on top of/underneath it.
     */
    public boolean hasMaskOverBase() {
        for (TextureComponent c : components) {
            if (c.getMaskMode() == MaskMode.ALPHA_FROM_BASE) return true;
        }
        return false;
    }
}
