package net.ye6isu.yebisulib.texture;

import java.util.HashMap;
import java.util.Map;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/texture/ItemTextureState.class */
@OnlyIn(Dist.CLIENT)
public final class ItemTextureState {
    public static final ItemTextureState INSTANCE = new ItemTextureState();
    private final Map<String, TextureStack> stacks = new HashMap();

    private ItemTextureState() {
    }

    public void register(String key, TextureStack stack) {
        this.stacks.put(key, stack);
    }

    public TextureStack get(String key) {
        return this.stacks.get(key);
    }

    public void remove(String key) {
        this.stacks.remove(key);
    }

    public void tickAll() {
        for (TextureStack s : this.stacks.values()) {
            s.tick();
        }
    }
}
