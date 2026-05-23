package net.ye6isu.yebisulib.texture;

import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/texture/TextureManager.class */
@OnlyIn(Dist.CLIENT)
public final class TextureManager {
    public static final TextureManager INSTANCE = new TextureManager();
    private final Map<Integer, TextureStack> stacks = new ConcurrentHashMap();

    private TextureManager() {
    }

    public void clientTick() {
        for (TextureStack stack : this.stacks.values()) {
            stack.tick();
        }
    }

    public void apply(int entityId, TextureStack stack) {
        this.stacks.put(Integer.valueOf(entityId), stack);
    }

    public void addComponent(int entityId, TextureComponent component) {
        this.stacks.computeIfAbsent(Integer.valueOf(entityId), id -> {
            return new TextureStack();
        }).add(component);
    }

    public void removeLayer(int entityId, ResourceLocation location) {
        TextureStack stack = this.stacks.get(Integer.valueOf(entityId));
        if (stack == null) {
            return;
        }
        stack.remove(location);
        if (stack.isEmpty()) {
            this.stacks.remove(Integer.valueOf(entityId));
        }
    }

    public void clear(int entityId) {
        this.stacks.remove(Integer.valueOf(entityId));
    }

    public void clearAll() {
        this.stacks.clear();
    }

    public TextureStack getStack(int entityId) {
        return this.stacks.get(Integer.valueOf(entityId));
    }

    public boolean hasStack(int entityId) {
        return this.stacks.containsKey(Integer.valueOf(entityId));
    }

    public Map<Integer, TextureStack> getAllStacks() {
        return Collections.unmodifiableMap(this.stacks);
    }
}
