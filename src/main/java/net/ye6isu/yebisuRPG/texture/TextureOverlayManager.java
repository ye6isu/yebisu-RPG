package net.ye6isu.yebisuRPG.texture;

import net.minecraft.resources.ResourceLocation;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Client-side registry of active overlay {@link TextureStack}s, keyed by entity ID.
 * Populated by the network handler when a sync payload arrives; read by
 * {@link EntityTextureCompositor} once per frame.
 */
@OnlyIn(Dist.CLIENT)
public final class TextureOverlayManager {

    public static final TextureOverlayManager INSTANCE = new TextureOverlayManager();

    private final Map<Integer, TextureStack> stacks = new ConcurrentHashMap<>();

    private TextureOverlayManager() {}

    public void apply(int entityId, TextureStack stack) { stacks.put(entityId, stack); }
    public void clear(int entityId) { stacks.remove(entityId); }
    public void clearAll() { stacks.clear(); }
    public TextureStack getStack(int entityId) { return stacks.get(entityId); }
    public boolean hasStack(int entityId) { return stacks.containsKey(entityId); }
    public Map<Integer, TextureStack> getAllStacks() { return Collections.unmodifiableMap(stacks); }
}
