package net.ye6isu.yebisuRPG.animation;

import net.minecraft.world.entity.Entity;
import net.minecraft.server.level.ServerLevel;
import net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead;
import net.ye6isu.yebisuRPG.network.animation.AnimPausePayload;
import net.ye6isu.yebisuRPG.network.animation.AnimStopPayload;
import net.ye6isu.yebisuRPG.network.animation.AnimTriggerPayload;
import net.ye6isu.yebisuRPG.network.util.NetworkUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Unified public API for the custom animation system.
 *
 * <p>This is the single entry point all mod code (including Blocky-compiled item/entity
 * methods — see {@code ycs/src/codegen/visual/compiler.js}) calls to start or halt custom
 * animations. It must be called <b>server-side only</b> — the server is authoritative over
 * animation state and replicates it to clients via packets.</p>
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
 */
public final class AnimationAPI {

    private static final Logger LOGGER = LoggerFactory.getLogger(AnimationAPI.class);

    private AnimationAPI() {}

    // -------------------------------------------------------------------------
    // triggerAnimation
    // -------------------------------------------------------------------------

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
        triggerAnimation(entity, category, animId, filePath, playbackSpeed, lookAtMask, 0);
    }

    public static void triggerAnimation(Entity entity, AnimationCategory category,
                                        String animId, String filePath, float playbackSpeed,
                                        int lookAtMask, int vanillaMask) {
        triggerAnimation(entity, category, animId, filePath, playbackSpeed, lookAtMask, vanillaMask, 0);
    }

    public static void triggerAnimation(Entity entity, AnimationCategory category,
                                        String animId, String filePath, float playbackSpeed,
                                        int lookAtMask, int vanillaMask, boolean showInFirstPerson) {
        triggerAnimation(entity, category, animId, filePath, playbackSpeed, lookAtMask, vanillaMask,
                showInFirstPerson ? AnimationPlayhead.FP_ANY_LIMB : 0);
    }

    public static void triggerAnimation(Entity entity, AnimationCategory category,
                                        String animId, String filePath, float playbackSpeed,
                                        int lookAtMask, int vanillaMask, int vanillaMoveMask) {
        if (!(entity.level() instanceof ServerLevel)) {
            LOGGER.warn("[AnimationAPI] triggerAnimation called client-side for entity={} cat={} anim={}; ignoring.",
                    entity.getId(), category, animId);
            return;
        }

        long startTick = entity.level().getGameTime();
        AnimationEntry entry = new AnimationEntry(entity.getId(), category, animId, startTick,
                filePath, playbackSpeed, lookAtMask, vanillaMask, vanillaMoveMask);

        AnimationRegistry.get().put(entry);

        AnimTriggerPayload payload = AnimTriggerPayload.fresh(entity.getId(), category.ordinal(), animId,
                filePath, playbackSpeed, lookAtMask, vanillaMask, vanillaMoveMask);
        NetworkUtils.sendToPlayersTrackingAndSelf(entity, payload);

        LOGGER.debug("[AnimationAPI] trigger: entity={} cat={} anim={} file={} speed={} lookAt={} vanilla={} move={} startTick={}",
                entity.getId(), category, animId, filePath, playbackSpeed, lookAtMask, vanillaMask, vanillaMoveMask, startTick);
    }

    // -------------------------------------------------------------------------
    // First-person convenience wrappers
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // stopAnimation
    // -------------------------------------------------------------------------

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

        // 2. Broadcast stop signal — clients begin their blend-out on receipt.
        AnimStopPayload payload = AnimStopPayload.of(entity.getId(), category.ordinal());
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
        AnimPausePayload payload = AnimPausePayload.pause(entity.getId(), category.ordinal(), frozenMs);
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

        AnimPausePayload payload = AnimPausePayload.resume(entity.getId(), category.ordinal());
        NetworkUtils.sendToPlayersTrackingAndSelf(entity, payload);

        LOGGER.debug("[AnimationAPI] resume: entity={} cat={}", entity.getId(), category);
    }

    // -------------------------------------------------------------------------
    // Hand pose (persistent idle pose shown when no animation is playing)
    // -------------------------------------------------------------------------

    public static void setFirstPersonHandPose(Entity entity, String animName, String filePath) {
        setFirstPersonHandPose(entity, animName, filePath, false);
    }

    public static void setFirstPersonHandPose(Entity entity, String animName, String filePath, boolean allowVanillaActions) {
        setFirstPersonHandPose(entity, animName, filePath, allowVanillaActions, false);
    }

    public static void setFirstPersonHandPose(Entity entity, String animName, String filePath, boolean allowVanillaActions, boolean keepPosScale) {
        if (!(entity.level() instanceof ServerLevel)) {
            LOGGER.warn("[AnimationAPI] setFirstPersonHandPose called client-side for entity={}; ignoring.", entity.getId());
            return;
        }
        var payload = net.ye6isu.yebisuRPG.network.animation.HandPosePayload.set(
                entity.getId(), animName, filePath, allowVanillaActions, keepPosScale);
        PoseRegistry.get().setHandPose(payload);
        NetworkUtils.sendToPlayersTrackingAndSelf(entity, payload);
    }

    /**
     * Sets a persistent third-person pose for an entity.
     * The pose is shown whenever no animation is actively playing on the ENTITY_THIRD_PERSON slot.
     * Supports the same settings as triggerThirdPersonAnimation (lookAtMask, vanillaMask, vanillaMoveMask).
     */
    public static void setThirdPersonPose(Entity entity, String animName, String filePath) {
        setThirdPersonPose(entity, animName, filePath, 0, 0, 0);
    }

    public static void setThirdPersonPose(Entity entity, String animName, String filePath,
                                           int lookAtMask) {
        setThirdPersonPose(entity, animName, filePath, lookAtMask, 0, 0);
    }

    public static void setThirdPersonPose(Entity entity, String animName, String filePath,
                                           int lookAtMask, int vanillaMask) {
        setThirdPersonPose(entity, animName, filePath, lookAtMask, vanillaMask, 0);
    }

    public static void setThirdPersonPose(Entity entity, String animName, String filePath,
                                           int lookAtMask, int vanillaMask, int vanillaMoveMask) {
        setThirdPersonPose(entity, animName, filePath, lookAtMask, vanillaMask, vanillaMoveMask, false);
    }

    public static void setThirdPersonPose(Entity entity, String animName, String filePath,
                                           int lookAtMask, int vanillaMask, int vanillaMoveMask,
                                           boolean allowVanillaActions) {
        setThirdPersonPose(entity, animName, filePath, lookAtMask, vanillaMask, vanillaMoveMask, allowVanillaActions, false);
    }

    public static void setThirdPersonPose(Entity entity, String animName, String filePath,
                                           int lookAtMask, int vanillaMask, int vanillaMoveMask,
                                           boolean allowVanillaActions, boolean keepPosScale) {
        int actMask = allowVanillaActions ? 0x3F : 0;
        int keepMask = keepPosScale ? 0x3F : 0;
        setThirdPersonPose(entity, animName, filePath, lookAtMask, vanillaMask, vanillaMoveMask, actMask, keepMask);
    }

    public static void setThirdPersonPose(Entity entity, String animName, String filePath,
                                           int lookAtMask, int vanillaMask, boolean showInFirstPerson,
                                           int allowActionsMask, int keepPosScaleMask) {
        setThirdPersonPose(entity, animName, filePath, lookAtMask, vanillaMask,
                showInFirstPerson ? AnimationPlayhead.FP_ANY_LIMB : 0, allowActionsMask, keepPosScaleMask);
    }

    public static void setThirdPersonPose(Entity entity, String animName, String filePath,
                                           int lookAtMask, int vanillaMask, int vanillaMoveMask,
                                           int allowActionsMask, int keepPosScaleMask) {
        if (!(entity.level() instanceof ServerLevel)) {
            LOGGER.warn("[AnimationAPI] setThirdPersonPose called client-side for entity={}; ignoring.", entity.getId());
            return;
        }
        var payload = net.ye6isu.yebisuRPG.network.animation.ThirdPersonPosePayload.set(
                entity.getId(), animName, filePath, lookAtMask, vanillaMask, vanillaMoveMask, allowActionsMask, keepPosScaleMask);
        PoseRegistry.get().setThirdPersonPose(payload);
        NetworkUtils.sendToPlayersTrackingAndSelf(entity, payload);
    }

    /**
     * Resets the entity's third-person pose back to vanilla default.
     */
    public static void resetThirdPersonPose(Entity entity) {
        if (!(entity.level() instanceof ServerLevel)) {
            LOGGER.warn("[AnimationAPI] resetThirdPersonPose called client-side for entity={}; ignoring.", entity.getId());
            return;
        }
        var payload = net.ye6isu.yebisuRPG.network.animation.ThirdPersonPosePayload.clear(entity.getId());
        PoseRegistry.get().setThirdPersonPose(payload);
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
        PoseRegistry.get().setHandPose(payload);
        NetworkUtils.sendToPlayersTrackingAndSelf(entity, payload);
    }

    // -------------------------------------------------------------------------
    // Item animation convenience wrappers
    // -------------------------------------------------------------------------

    public static void triggerItemAnimation(Entity entity, String animId, String filePath, float speed, boolean mainHand) {
        AnimationCategory cat = mainHand ? AnimationCategory.ITEM_MAIN_HAND : AnimationCategory.ITEM_OFF_HAND;
        triggerAnimation(entity, cat, animId, filePath, speed);
    }

    public static void triggerItemAnimation(Entity entity, String animId, String filePath, boolean mainHand) {
        triggerItemAnimation(entity, animId, filePath, 1f, mainHand);
    }

    public static void stopItemAnimation(Entity entity, boolean mainHand) {
        stopAnimation(entity, mainHand ? AnimationCategory.ITEM_MAIN_HAND : AnimationCategory.ITEM_OFF_HAND);
    }

    public static void pauseItemAnimation(Entity entity, boolean mainHand) {
        pauseAnimation(entity, mainHand ? AnimationCategory.ITEM_MAIN_HAND : AnimationCategory.ITEM_OFF_HAND);
    }

    public static void resumeItemAnimation(Entity entity, boolean mainHand) {
        resumeAnimation(entity, mainHand ? AnimationCategory.ITEM_MAIN_HAND : AnimationCategory.ITEM_OFF_HAND);
    }

    public static void setItemAnimPose(Entity entity, String animName, String filePath, float speed, boolean mainHand) {
        if (!(entity.level() instanceof ServerLevel)) {
            LOGGER.warn("[AnimationAPI] setItemAnimPose called client-side for entity={}; ignoring.", entity.getId());
            return;
        }
        var payload = net.ye6isu.yebisuRPG.network.animation.ItemAnimPosePayload.set(
                entity.getId(), animName, filePath, speed, mainHand);
        PoseRegistry.get().setItemPose(payload);
        NetworkUtils.sendToPlayersTrackingAndSelf(entity, payload);
    }

    public static void setItemAnimPose(Entity entity, String animName, String filePath, boolean mainHand) {
        setItemAnimPose(entity, animName, filePath, 1f, mainHand);
    }

    public static void resetItemAnimPose(Entity entity, boolean mainHand) {
        if (!(entity.level() instanceof ServerLevel)) {
            LOGGER.warn("[AnimationAPI] resetItemAnimPose called client-side for entity={}; ignoring.", entity.getId());
            return;
        }
        var payload = net.ye6isu.yebisuRPG.network.animation.ItemAnimPosePayload.clear(
                entity.getId(), mainHand);
        PoseRegistry.get().setItemPose(payload);
        NetworkUtils.sendToPlayersTrackingAndSelf(entity, payload);
    }

    // -------------------------------------------------------------------------
    // stopAllAnimations
    // -------------------------------------------------------------------------

    /**
     * Convenience method — halts every active animation slot for an entity at once.
     * Intended for use on entity death, removal, or any event that requires a
     * clean slate (e.g. a player logging out).
     */
    public static void stopAllAnimations(Entity entity) {
        if (!(entity.level() instanceof ServerLevel)) {
            LOGGER.warn("[AnimationAPI] stopAllAnimations called client-side for entity={}; ignoring.",
                    entity.getId());
            return;
        }

        var slots = AnimationRegistry.get().getAll(entity.getId());
        if (slots.isEmpty()) return;

        var categories = new java.util.ArrayList<>(slots.keySet());

        AnimationRegistry.get().removeAll(entity.getId());

        for (AnimationCategory category : categories) {
            AnimStopPayload payload = AnimStopPayload.of(entity.getId(), category.ordinal());
            NetworkUtils.sendToPlayersTrackingAndSelf(entity, payload);
        }

        LOGGER.debug("[AnimationAPI] stopAll: entity={} cleared {} slot(s)",
                entity.getId(), categories.size());
    }
}
