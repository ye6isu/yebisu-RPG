package net.ye6isu.yebisulib.texture;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import net.minecraft.resources.ResourceLocation;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/texture/TextureStack.class */
public final class TextureStack {
    private final List<TextureComponent> components = new ArrayList();

    public void add(TextureComponent component) {
        this.components.add(component);
        this.components.sort((a, b) -> {
            return Integer.compare(a.getZIndex(), b.getZIndex());
        });
    }

    public boolean remove(ResourceLocation location) {
        return this.components.removeIf(c -> {
            return c.getTexture().equals(location);
        });
    }

    public void clear() {
        this.components.clear();
    }

    public void tick() {
        for (TextureComponent c : this.components) {
            c.getAnimation().ifPresent((v0) -> {
                v0.tick();
            });
        }
    }

    public List<TextureComponent> getLayers() {
        return Collections.unmodifiableList(this.components);
    }

    public int size() {
        return this.components.size();
    }

    public boolean isEmpty() {
        return this.components.isEmpty();
    }
}
