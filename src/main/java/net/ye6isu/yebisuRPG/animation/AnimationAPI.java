package net.ye6isu.yebisuRPG.animation;

import net.minecraft.world.entity.Entity;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.ye6isu.yebisuRPG.network.animation.AnimPausePayload;
import net.ye6isu.yebisuRPG.network.animation.AnimStopPayload;
import net.ye6isu.yebisuRPG.network.animation.AnimTriggerPayload;
import net.ye6isu.yebisuRPG.network.util.NetworkUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Unified public API for the custom animation system.
 *
 * <p>This is the single entry point all mod code should call to start or halt
 * custom animations. It must be called <b>server-side only</b> — the server is
 * authoritative over animation state and replicates it to clients via packets.</p>
 *
 * <h2>What these methods do</h2>
 * <ol>
 *   <li>Validate that the call is happening on a server level.</li>
 *   <li>Write to / remove from {@link AnimationRegistry} so the server state is
 *       always the source of truth for late-joiner catch-up.</li>
 *   <li>Broadcast the appropriate packet to all clients currently tracking
 *       the entity (including the entity itself if it is a player) via
 *       {@link NetworkUtils#sendToPlayersTrackingAndSelf}.</li>
 * </ol>
 *
 * <h2>What these methods do NOT do</h2>
 * <ul>
 *   <li>Touch vanilla movement, AI, or animation state machines.</li>
 *   <li>Write any NBT or persistent data — animation state is transient.</li>
 *   <li>Execute any rendering logic — clients handle that independently upon
 *       receiving the packet.</li>
 * </ul>
 *
 * <h2>Typical usage</h2>
 * <pre>{@code
 * // Inside an ability, event, or item-use handler on the server thread:
 * AnimationAPI.triggerAnimation(player, AnimationCategory.ITEM_MAIN_HAND, "rifle_fire");
 *
 * // To interrupt mid-animation (stun, death, interaction):
 * AnimationAPI.stopAnimation(player, AnimationCategory.ITEM_MAIN_HAND);
 * }</pre>
 */
public final class AnimationAPI {

    private static final Logger LOGGER = LoggerFactory.getLogger(AnimationAPI.class);

    private AnimationAPI() {}

    // -------------------------------------------------------------------------
    // triggerAnimation
    // -------------------------------------------------------------------------

    /**
     * Starts a custom animation on the given entity/category slot, immediately
     * replacing any animation that was previously active in that slot.
     *
     * <p>The call is a no-op (with a warning log) if {@code entity} is not in a
     * {@link ServerLevel}. All callers must be on the server thread.</p>
     *
     * @param entity      the entity whose animation slot is being driven;
     *                    may be a custom mob, a player, or any other {@link Entity}
     * @param category    which render pathway to target (skeletal, item slot, armor slot)
     * @param animId      the Blockbench export key matching the animation asset file name
     *                    (e.g. {@code "attack_slash"}, {@code "rifle_fire"})
     */
    public static void triggerAnimation(Entity entity, AnimationCategory category, String animId) {
        triggerAnimation(entity, category, animId, null, 1f);
    }

    public static void triggerAnimation(Entity entity, AnimationCategory category,
                                        String animId, String filePath) {
        triggerAnimation(entity, category, animId, filePath, 1f);
    }

    /**
     * @param filePath      source JSON resource path, or {@code null} for the default
     * @param playbackSpeed speed multiplier (1.0 = normal, 0.5 = half speed, 2.0 = double)
     */
    public static void triggerAnimation(Entity entity, AnimationCategory category,
                                        String animId, String filePath, float playbackSpeed) {
        triggerAnimation(entity, category, animId, filePath, playbackSpeed, 0);
    }

    public static void triggerAnimation(Entity entity, AnimationCategory category,
                                        String animId, String filePath, float playbackSpeed,
                                        int lookAtMask) {
        if (!(entity.level() instanceof ServerLevel)) {
            LOGGER.warn("[AnimationAPI] triggerAnimation called client-side for entity={} cat={} anim={}; ignoring.",
                    entity.getId(), category, animId);
            return;
        }

        long startTick = entity.level().getGameTime();
        AnimationEntry entry = new AnimationEntry(entity.getId(), category, animId, startTick,
                filePath, playbackSpeed);

        AnimationRegistry.get().put(entry);

        AnimTriggerPayload payload = AnimTriggerPayload.fresh(entity.getId(), category, animId,
                filePath, playbackSpeed, lookAtMask);
        NetworkUtils.sendToPlayersTrackingAndSelf(entity, payload);

        LOGGER.debug("[AnimationAPI] trigger: entity={} cat={} anim={} file={} speed={} lookAt={} startTick={}",
                entity.getId(), category, animId, filePath, playbackSpeed, lookAtMask, startTick);
    }

    // -------------------------------------------------------------------------
    // stopAnimation
    // -------------------------------------------------------------------------

    /**
     * Halts the active animation in the given entity/category slot and signals
     * all tracking clients to begin the 2-tick linear blend-out back to default pose.
     *
     * <p>If the slot is already empty (animation already finished or was never started)
     * the call is a silent no-op — no packet is sent.</p>
     *
     * <p>The call is a no-op (with a warning log) if {@code entity} is not in a
     * {@link ServerLevel}. All callers must be on the server thread.</p>
     *
     * @param entity   the entity whose animation slot is being cleared
     * @param category the slot to clear
     */
    /**
     * Stops the first-person animation currently playing on the given entity's ENTITY slot.
     * Works for all loop types (loop, hold-last, play-once). Silent no-op if nothing is playing.
     */
    public static void stopFirstPersonAnimation(Entity entity) {
        stopAnimation(entity, AnimationCategory.ENTITY);
    }

    // ── Third-person convenience wrappers ─────────────────────────────────────

    public static void triggerThirdPersonAnimation(Entity entity, String animId) {
        triggerAnimation(entity, AnimationCategory.ENTITY_THIRD_PERSON, animId, null, 1f);
    }

    public static void triggerThirdPersonAnimation(Entity entity, String animId, String filePath) {
        triggerAnimation(entity, AnimationCategory.ENTITY_THIRD_PERSON, animId, filePath, 1f);
    }

    public static void triggerThirdPersonAnimation(Entity entity, String animId, String filePath, float playbackSpeed) {
        triggerAnimation(entity, AnimationCategory.ENTITY_THIRD_PERSON, animId, filePath, playbackSpeed, 0);
    }

    public static void triggerThirdPersonAnimation(Entity entity, String animId, String filePath, float playbackSpeed, int lookAtMask) {
        triggerAnimation(entity, AnimationCategory.ENTITY_THIRD_PERSON, animId, filePath, playbackSpeed, lookAtMask);
    }

    public static void stopThirdPersonAnimation(Entity entity) {
        stopAnimation(entity, AnimationCategory.ENTITY_THIRD_PERSON);
    }

    public static void pauseThirdPersonAnimation(Entity entity) {
        pauseAnimation(entity, AnimationCategory.ENTITY_THIRD_PERSON);
    }

    public static void resumeThirdPersonAnimation(Entity entity) {
        resumeAnimation(entity, AnimationCategory.ENTITY_THIRD_PERSON);
    }

    public static void stopAnimation(Entity entity, AnimationCategory category) {
        if (!(entity.level() instanceof ServerLevel)) {
            LOGGER.warn("[AnimationAPI] stopAnimation called client-side for entity={} cat={}; ignoring.",
                    entity.getId(), category);
            return;
        }

        // 1. Clear server registry. Returns the entry that was removed (or null if
        //    the slot was already empty), so we can skip the packet in that case.
        AnimationEntry removed = AnimationRegistry.get().remove(entity.getId(), category);
        if (removed == null) return;

        // 2. Broadcast stop signal — clients begin their 2-tick blend-out on receipt.
        AnimStopPayload payload = AnimStopPayload.of(entity.getId(), category);
        NetworkUtils.sendToPlayersTrackingAndSelf(entity, payload);

        LOGGER.debug("[AnimationAPI] stop: entity={} cat={} (was anim={})",
                entity.getId(), category, removed.animId());
    }

    // -------------------------------------------------------------------------
    // pauseAnimation / resumeAnimation
    // -------------------------------------------------------------------------

    /**
     * Freezes the active animation for the given entity/category slot at its current position.
     * Frozen progress is saved in {@link AnimationEntry} so late joiners receive the correct
     * catch-up position. Silent no-op if no animation is playing or already paused.
     */
    public static void pauseAnimation(Entity entity, AnimationCategory category) {
        if (!(entity.level() instanceof ServerLevel)) {
            LOGGER.warn("[AnimationAPI] pauseAnimation called client-side for entity={} cat={}; ignoring.",
                    entity.getId(), category);
            return;
        }

        AnimationEntry entry = AnimationRegistry.get().get(entity.getId(), category);
        if (entry == null || entry.isPaused()) return;

        long now = entity.level().getGameTime();
        entry.pause(now);

        // frozenProgressMs = speed-scaled ticks × MS_PER_TICK
        long frozenMs = entry.pausedAtScaledTicks() * 50L;
        AnimPausePayload payload = AnimPausePayload.pause(entity.getId(), category, frozenMs);
        NetworkUtils.sendToPlayersTrackingAndSelf(entity, payload);

        LOGGER.debug("[AnimationAPI] pause: entity={} cat={} frozenMs={}", entity.getId(), category, frozenMs);
    }

    /**
     * Resumes a previously paused animation from where it was frozen.
     * If the animation expired while paused (play-once finished), clients will stop it.
     * Silent no-op if no animation is registered or it is not paused.
     */
    public static void resumeAnimation(Entity entity, AnimationCategory category) {
        if (!(entity.level() instanceof ServerLevel)) {
            LOGGER.warn("[AnimationAPI] resumeAnimation called client-side for entity={} cat={}; ignoring.",
                    entity.getId(), category);
            return;
        }

        AnimationEntry entry = AnimationRegistry.get().get(entity.getId(), category);
        if (entry == null || !entry.isPaused()) return;

        long now = entity.level().getGameTime();
        entry.resume(now);

        AnimPausePayload payload = AnimPausePayload.resume(entity.getId(), category);
        NetworkUtils.sendToPlayersTrackingAndSelf(entity, payload);

        LOGGER.debug("[AnimationAPI] resume: entity={} cat={}", entity.getId(), category);
    }

    // -------------------------------------------------------------------------
    // Hand pose (persistent idle pose shown when no animation is playing)
    // -------------------------------------------------------------------------

    /**
     * Sets a persistent first-person hand pose for an entity.
     * The pose is shown whenever no animation is actively playing on the ENTITY slot.
     * Specify the animation name and file exactly as you would for triggerAnimation.
     */
    public static void setFirstPersonHandPose(Entity entity, String animName, String filePath) {
        if (!(entity.level() instanceof ServerLevel)) {
            LOGGER.warn("[AnimationAPI] setFirstPersonHandPose called client-side for entity={}; ignoring.", entity.getId());
            return;
        }
        var payload = net.ye6isu.yebisuRPG.network.animation.HandPosePayload.set(
                entity.getId(), animName, filePath);
        NetworkUtils.sendToPlayersTrackingAndSelf(entity, payload);
    }

    /**
     * Resets the entity's first-person hand pose back to vanilla default.
     */
    public static void resetFirstPersonHandPose(Entity entity) {
        if (!(entity.level() instanceof ServerLevel)) {
            LOGGER.warn("[AnimationAPI] resetFirstPersonHandPose called client-side for entity={}; ignoring.", entity.getId());
            return;
        }
        var payload = net.ye6isu.yebisuRPG.network.animation.HandPosePayload.clear(entity.getId());
        NetworkUtils.sendToPlayersTrackingAndSelf(entity, payload);
    }

    // -------------------------------------------------------------------------
    // stopAllAnimations
    // -------------------------------------------------------------------------

    /**
     * Convenience method — halts every active animation slot for an entity at once.
     *
     * <p>Intended for use on entity death, removal, or any event that requires a
     * clean slate (e.g. a player logging out). Sends one {@link AnimStopPayload}
     * per active category so each client blend-out fires independently per slot.</p>
     *
     * @param entity the entity to fully clear
     */
    public static void stopAllAnimations(Entity entity) {
        if (!(entity.level() instanceof ServerLevel)) {
            LOGGER.warn("[AnimationAPI] stopAllAnimations called client-side for entity={}; ignoring.",
                    entity.getId());
            return;
        }

        // Snapshot the active categories before clearing so we can send one packet
        // per category without holding the registry in a partially-cleared state.
        var slots = AnimationRegistry.get().getAll(entity.getId());
        if (slots.isEmpty()) return;

        // Copy the category set — getAll() returns an unmodifiable view of the live
        // inner map, and remove() mutates it, so we must not iterate and mutate together.
        var categories = new java.util.ArrayList<>(slots.keySet());

        AnimationRegistry.get().removeAll(entity.getId());

        for (AnimationCategory category : categories) {
            AnimStopPayload payload = AnimStopPayload.of(entity.getId(), category);
            NetworkUtils.sendToPlayersTrackingAndSelf(entity, payload);
        }

        LOGGER.debug("[AnimationAPI] stopAll: entity={} cleared {} slot(s)",
                entity.getId(), categories.size());
    }
}
