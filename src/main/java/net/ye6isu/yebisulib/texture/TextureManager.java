package net.ye6isu.yebisulib.texture;

import net.minecraft.resources.ResourceLocation;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Client-side registry that maps entity IDs to their {@link TextureStack}.
 *
 * <p>{@code TextureManager} is the single entry point for all texture operations.
 * It is {@code @OnlyIn(CLIENT)} — it must never be referenced from server code.
 * Access it through the {@link net.ye6isu.yebisulib.network.ClientHandlerProxy} pattern established in the
 * networking system (see {@code NETWORKING.md}).</p>
 *
 * <h2>Lifecycle</h2>
 * <ol>
 *   <li>Server detects a state change (e.g. player becomes frozen).</li>
 *   <li>Server sends one {@code TextureSyncPayload} via {@code NetworkUtils.sendToPlayer}.</li>
 *   <li>Client receives it, calls {@link #apply} to build and register the stack.</li>
 *   <li>{@link #clientTick()} advances all animations every game tick.</li>
 *   <li>The entity renderer calls {@link #getStack} and iterates layers.</li>
 *   <li>On removal (effect ends, player leaves), server sends a clear payload;
 *       client calls {@link #clear(int)} or {@link #removeLayer(int, ResourceLocation)}.</li>
 * </ol>
 *
 * <h2>Network efficiency</h2>
 * <p>The server sends <b>one packet per state change</b>. All animation advancement,
 * UV computation, and masking logic runs entirely client-side. At 100 players this
 * means zero per-tick network overhead for visual effects.</p>
 *
 * <h2>Usage example — renderer</h2>
 * <pre>{@code
 * TextureStack stack = TextureManager.INSTANCE.getStack(entity.getId());
 * if (stack != null) {
 *     for (TextureComponent component : stack.getLayers()) {
 *         ResourceLocation tex = component.getLayer().location();
 *         float u = component.getCurrentFrameU();
 *         float v = component.getCurrentFrameV();
 *         float uw = component.getFrameWidthUV();
 *         float vh = component.getFrameHeightUV();
 *         MaskMode mask = component.getMaskMode();
 *         // pass to your shader / render call
 *     }
 * }
 * }</pre>
 */
@OnlyIn(Dist.CLIENT)
public final class TextureManager {

    /** Singleton — always access via this field on the client thread. */
    public static final TextureManager INSTANCE = new TextureManager();

    /** entityId → TextureStack. ConcurrentHashMap guards against rare async access
     *  during entity spawn/despawn, though mutations should always be on the client thread. */
    private final Map<Integer, TextureStack> stacks = new ConcurrentHashMap<>();

    private TextureManager() {}

    // ---------------------------------------------------------------------------------
    // Tick — advance all animations
    // ---------------------------------------------------------------------------------

    /**
     * Advances all registered stacks by one game tick.
     *
     * <p>Subscribe to {@code ClientTickEvent.Post} in a
     * {@code @EventBusSubscriber(Dist.CLIENT)} class and call this method.
     * Do not call from render code.</p>
     *
     * <pre>{@code
     * @SubscribeEvent
     * public static void onClientTick(ClientTickEvent.Post event) {
     *     TextureManager.INSTANCE.clientTick();
     * }
     * }</pre>
     */
    public void clientTick() {
        for (TextureStack stack : stacks.values()) {
            stack.tick();
        }
    }

    // ---------------------------------------------------------------------------------
    // Apply — called by the network handler when a sync packet arrives
    // ---------------------------------------------------------------------------------

    /**
     * Replaces the entire {@link TextureStack} for {@code entityId} with a
     * freshly built stack. Any existing components for that entity are discarded.
     *
     * <p>Called by the client-side network handler when a {@code TextureSyncPayload}
     * arrives. Do not call from game logic — drive this via network events.</p>
     *
     * @param entityId  the entity's integer ID (from {@code entity.getId()})
     * @param stack     a pre-built stack, usually assembled in the network handler
     */
    public void apply(int entityId, TextureStack stack) {
        stacks.put(entityId, stack);
    }

    /**
     * Adds a single {@link TextureComponent} to an existing stack, or creates a new
     * stack if none exists for {@code entityId}.
     *
     * <p>Use this when adding one effect without disturbing existing layers
     * (e.g. adding a burn overlay while ice is already active).</p>
     *
     * @param entityId  the entity's integer ID
     * @param component the component to add
     */
    public void addComponent(int entityId, TextureComponent component) {
        stacks.computeIfAbsent(entityId, id -> new TextureStack()).add(component);
    }

    // ---------------------------------------------------------------------------------
    // Remove
    // ---------------------------------------------------------------------------------

    /**
     * Removes the layer identified by {@code location} from the entity's stack.
     * If the stack becomes empty after removal it is also removed from the registry.
     *
     * @param entityId the entity's integer ID
     * @param location the texture location to remove
     */
    public void removeLayer(int entityId, ResourceLocation location) {
        TextureStack stack = stacks.get(entityId);
        if (stack == null) return;
        stack.remove(location);
        if (stack.isEmpty()) stacks.remove(entityId);
    }

    /**
     * Removes all texture components for {@code entityId}.
     * Call this when an entity despawns or all effects are cleared.
     *
     * @param entityId the entity's integer ID
     */
    public void clear(int entityId) {
        stacks.remove(entityId);
    }

    /** Clears all stacks — call on level unload / disconnect. */
    public void clearAll() {
        stacks.clear();
    }

    // ---------------------------------------------------------------------------------
    // Read — used by renderers
    // ---------------------------------------------------------------------------------

    /**
     * Returns the {@link TextureStack} for {@code entityId}, or {@code null} if none
     * has been registered. A {@code null} return means "render the entity normally
     * with no extra layers."
     *
     * @param entityId the entity's integer ID
     * @return the stack, or {@code null}
     */
    public TextureStack getStack(int entityId) {
        return stacks.get(entityId);
    }

    /** @return {@code true} if the entity has any registered texture components */
    public boolean hasStack(int entityId) {
        return stacks.containsKey(entityId);
    }

    /** @return an unmodifiable view of all registered stacks (for debugging) */
    public Map<Integer, TextureStack> getAllStacks() {
        return Collections.unmodifiableMap(stacks);
    }
}
