package net.ye6isu.yebisuRPG.texture;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

import java.util.HashMap;
import java.util.Map;

@OnlyIn(Dist.CLIENT)
public final class ItemTextureState {

    public static final ItemTextureState INSTANCE = new ItemTextureState();
    private final Map<String, TextureStack> stacks = new HashMap<>();

    private ItemTextureState() {}

    public void register(String key, TextureStack stack) { stacks.put(key, stack); }
    public TextureStack get(String key) { return stacks.get(key); }
    public void remove(String key) { stacks.remove(key); }
    public void tickAll() { for (TextureStack s : stacks.values()) s.tick(); }
}
