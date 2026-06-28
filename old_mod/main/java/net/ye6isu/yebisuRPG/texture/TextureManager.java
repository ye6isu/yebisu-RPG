package net.ye6isu.yebisuRPG.texture;

import net.minecraft.resources.ResourceLocation;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@OnlyIn(Dist.CLIENT)
public final class TextureManager {

    public static final TextureManager INSTANCE = new TextureManager();
    private final Map<Integer, TextureStack> stacks = new ConcurrentHashMap<>();

    private TextureManager() {}

    public void clientTick() { for (TextureStack s : stacks.values()) s.tick(); }

    public void apply(int entityId, TextureStack stack) { stacks.put(entityId, stack); }
    public void addComponent(int entityId, TextureComponent component) {
        stacks.computeIfAbsent(entityId, id -> new TextureStack()).add(component);
    }
    public void removeLayer(int entityId, ResourceLocation location) {
        TextureStack stack = stacks.get(entityId);
        if (stack == null) return;
        stack.remove(location);
        if (stack.isEmpty()) stacks.remove(entityId);
    }
    public void clear(int entityId) { stacks.remove(entityId); }
    public void clearAll() { stacks.clear(); }
    public TextureStack getStack(int entityId) { return stacks.get(entityId); }
    public boolean hasStack(int entityId) { return stacks.containsKey(entityId); }
    public Map<Integer, TextureStack> getAllStacks() { return Collections.unmodifiableMap(stacks); }
}
