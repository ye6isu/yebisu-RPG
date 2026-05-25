package net.ye6isu.yebisuRPG.texture;

import net.minecraft.resources.ResourceLocation;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

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

    public void tick() {
        for (TextureComponent c : components) {
            c.getAnimation().ifPresent(AnimationState::tick);
        }
    }

    public List<TextureComponent> getLayers() { return Collections.unmodifiableList(components); }
    public int size()      { return components.size(); }
    public boolean isEmpty() { return components.isEmpty(); }
}
