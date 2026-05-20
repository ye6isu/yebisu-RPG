package net.ye6isu.yebisulib.texture;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

import java.util.HashMap;
import java.util.Map;

/**
 * Client-side registry mapping a string key to a {@link TextureStack} for items.
 *
 * <p>Items don't have entity IDs, so {@link TextureManager} (which keys by entity ID)
 * doesn't apply. Instead, item renderers use this registry keyed by a stable string
 * (typically the item's registry name, e.g. {@code "yebisurpg:ye6isu"}).</p>
 *
 * <p>Stacks registered here are ticked by {@link TextureManager#clientTick()} via
 * {@link #tickAll()} — wire up the same {@code ClientTickEvent.Post} subscriber.</p>
 *
 * <h2>Usage</h2>
 * <pre>{@code
 * // Register once (e.g. in a client setup event or item renderer init):
 * TextureStack stack = new TextureStack();
 * stack.add(new TextureComponent.Builder("yebisurpg:textures/item/texture2.png", 0)
 *     .spritesheet(1, 2)
 *     .animated(AnimationMode.LOOP, 20)
 *     .build());
 * ItemTextureState.INSTANCE.register("yebisurpg:ye6isu", stack);
 *
 * // In your item renderer:
 * TextureStack s = ItemTextureState.INSTANCE.get("yebisurpg:ye6isu");
 * if (s != null) { // render using s.getLayers() }
 * }</pre>
 */
@OnlyIn(Dist.CLIENT)
public final class ItemTextureState {

    public static final ItemTextureState INSTANCE = new ItemTextureState();

    private final Map<String, TextureStack> stacks = new HashMap<>();

    private ItemTextureState() {}

    /** Registers or replaces the stack for {@code key}. */
    public void register(String key, TextureStack stack) {
        stacks.put(key, stack);
    }

    /** Returns the stack for {@code key}, or {@code null} if not registered. */
    public TextureStack get(String key) {
        return stacks.get(key);
    }

    /** Removes the stack for {@code key}. */
    public void remove(String key) {
        stacks.remove(key);
    }

    /** Advances all item stacks by one tick. Call from {@code ClientTickEvent.Post}. */
    public void tickAll() {
        for (TextureStack s : stacks.values()) s.tick();
    }
}
