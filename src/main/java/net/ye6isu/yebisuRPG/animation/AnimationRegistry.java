package net.ye6isu.yebisuRPG.animation;

import java.util.Collections;
import java.util.EnumMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Server-side in-memory store of every animation slot currently active across
 * all loaded entities.
 *
 * Structure:
 *   entityId → (AnimationCategory → AnimationEntry)
 *
 * ConcurrentHashMap at the outer level guards against the rare case where a
 * server tick thread and a network thread touch the map simultaneously.
 * EnumMap at the inner level is allocation-efficient for a fixed key set.
 *
 * This class has no NeoForge or Minecraft imports — it is pure data bookkeeping
 * and can be unit-tested without a running game instance.
 *
 * Lifecycle: populated by AnimationAPI.triggerAnimation(), cleared by
 * AnimationAPI.stopAnimation() and by AnimationEventHooks when an entity is
 * removed from the level.
 */
public final class AnimationRegistry {

    // Singleton instance — server only. Never read on the client.
    private static final AnimationRegistry INSTANCE = new AnimationRegistry();

    private final ConcurrentHashMap<Integer, EnumMap<AnimationCategory, AnimationEntry>> registry =
            new ConcurrentHashMap<>();

    private AnimationRegistry() {}

    public static AnimationRegistry get() {
        return INSTANCE;
    }

    // -------------------------------------------------------------------------
    // Write operations
    // -------------------------------------------------------------------------

    /**
     * Records or replaces the active animation for a specific entity/category slot.
     * Called exclusively from AnimationAPI.triggerAnimation() on the server thread.
     */
    public void put(AnimationEntry entry) {
        registry
            .computeIfAbsent(entry.entityId(), id -> new EnumMap<>(AnimationCategory.class))
            .put(entry.category(), entry);
    }

    /**
     * Removes the active animation for a specific entity/category slot.
     * Returns the entry that was removed, or null if the slot was already empty.
     * Called from AnimationAPI.stopAnimation() and from the entity-removal hook.
     */
    public AnimationEntry remove(int entityId, AnimationCategory category) {
        EnumMap<AnimationCategory, AnimationEntry> slots = registry.get(entityId);
        if (slots == null) return null;

        AnimationEntry removed = slots.remove(category);

        // Clean up the outer map entry when the last slot is cleared so the
        // map does not accumulate stale entity IDs indefinitely.
        if (slots.isEmpty()) {
            registry.remove(entityId, slots);
        }

        return removed;
    }

    /**
     * Removes all active animation slots for an entity at once.
     * Used when an entity is removed from the level so its ID does not linger.
     */
    public void removeAll(int entityId) {
        registry.remove(entityId);
    }

    // -------------------------------------------------------------------------
    // Read operations
    // -------------------------------------------------------------------------

    /**
     * Returns the active entry for an entity/category pair, or null if none.
     */
    public AnimationEntry get(int entityId, AnimationCategory category) {
        EnumMap<AnimationCategory, AnimationEntry> slots = registry.get(entityId);
        if (slots == null) return null;
        return slots.get(category);
    }

    /**
     * Returns an unmodifiable view of all active slots for an entity.
     * Returns an empty map if the entity has no active animations.
     * Used by the pairing hook to iterate and build catch-up payloads.
     */
    public Map<AnimationCategory, AnimationEntry> getAll(int entityId) {
        EnumMap<AnimationCategory, AnimationEntry> slots = registry.get(entityId);
        if (slots == null) return Collections.emptyMap();
        return Collections.unmodifiableMap(slots);
    }

    /**
     * Returns an unmodifiable view of the entire registry.
     */
    public Map<Integer, EnumMap<AnimationCategory, AnimationEntry>> snapshot() {
        return Collections.unmodifiableMap(registry);
    }

    /**
     * True if the entity has at least one active animation slot.
     */
    public boolean hasAny(int entityId) {
        EnumMap<AnimationCategory, AnimationEntry> slots = registry.get(entityId);
        return slots != null && !slots.isEmpty();
    }

    /**
     * Wipes the entire registry. Called on server shutdown / level unload to
     * prevent stale state bleeding into a subsequent local game session.
     */
    public void clear() {
        registry.clear();
    }
}
