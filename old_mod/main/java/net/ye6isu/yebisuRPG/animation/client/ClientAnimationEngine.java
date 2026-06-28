package net.ye6isu.yebisuRPG.animation.client;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader;
import net.ye6isu.yebisuRPG.network.animation.AnimPausePayload;
import net.ye6isu.yebisuRPG.network.animation.AnimStopPayload;
import net.ye6isu.yebisuRPG.network.animation.AnimTriggerPayload;
import net.ye6isu.yebisuRPG.network.animation.HandPosePayload;
import net.ye6isu.yebisuRPG.network.animation.ThirdPersonPosePayload;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * CLIENT-ONLY singleton that owns every active {@link AnimationPlayhead} and
 * {@link AnimationBlender} on the local client.
 *
 * <h2>Lifecycle</h2>
 * <ol>
 *   <li>{@link #trigger(AnimTriggerPayload)} — called by {@link AnimClientHandler} when a
 *       trigger packet arrives. Creates or replaces the playhead for that slot and fast-forwards
 *       it if the packet carries a non-zero progress delta.</li>
 *   <li>{@link #stop(AnimStopPayload)} — called by {@link AnimClientHandler} when a stop packet
 *       arrives. Transitions the playhead to {@code BLENDING_OUT} and hands it to a
 *       {@link AnimationBlender} with a blank {@link AnimationBlender.PoseSnapshot}.
 *       Renderers that want to supply actual bone angles call
 *       {@link #stopWithSnapshot(int, AnimationCategory, AnimationBlender.PoseSnapshot)}
 *       directly before this method processes the packet.</li>
 *   <li>{@link #tick()} — called once per client game tick by {@link
 *       net.ye6isu.yebisuRPG.texture.TextureTickHandler}. Advances every active blender
 *       and removes finished entries.</li>
 *   <li>{@link #clearAll()} — called on client disconnect to wipe all state.</li>
 * </ol>
 *
 * <h2>Renderer contract</h2>
 * <p>Renderers do not call {@code trigger} or {@code stop}. They call
 * {@link #getPlayhead(int, AnimationCategory)} to obtain the active cursor,
 * then use {@link AnimationPlayhead#getCurrentTimeSecs()} to drive their
 * {@code AnimationDefinition} selector. They call
 * {@link #getBlender(int, AnimationCategory)} to obtain any active blender
 * and lerp bones accordingly via {@link AnimationBlender#lerpToRest}.</p>
 *
 * <h2>Thread safety</h2>
 * <p>The outer map is a {@link ConcurrentHashMap} because packet handlers run on
 * the Netty I/O thread, while {@link #tick()} and renderer queries run on the main
 * client thread. The inner {@link EnumMap} is only ever mutated under the protection
 * of {@code computeIfAbsent} or explicit replacement at the outer key level, which
 * is safe because ConcurrentHashMap's per-bucket locking covers the entire
 * compute lambda atomically.</p>
 */
@OnlyIn(Dist.CLIENT)
public final class ClientAnimationEngine {

    public static final ClientAnimationEngine INSTANCE = new ClientAnimationEngine();

    // entityId → (category → playhead)
    private final ConcurrentHashMap<Integer, EnumMap<AnimationCategory, AnimationPlayhead>> playheads =
            new ConcurrentHashMap<>();

    // entityId → (category → blender) — only populated while a blend-out is running
    private final ConcurrentHashMap<Integer, EnumMap<AnimationCategory, AnimationBlender>> blenders =
            new ConcurrentHashMap<>();

    // entityId → hand pose (animName + filePath) — shown when no animation is playing
    private final ConcurrentHashMap<Integer, HandPosePayload> handPoses = new ConcurrentHashMap<>();
    // entityId → wall-clock ms when the first-person hand pose was set (for looping time)
    private final ConcurrentHashMap<Integer, Long> handPoseStartMs = new ConcurrentHashMap<>();

    // entityId → third-person pose — shown when no third-person animation is playing
    private final ConcurrentHashMap<Integer, ThirdPersonPosePayload> thirdPersonPoses = new ConcurrentHashMap<>();
    // entityId → wall-clock ms when the third-person pose was set (for looping time)
    private final ConcurrentHashMap<Integer, Long> thirdPersonPoseStartMs = new ConcurrentHashMap<>();

    // entityId → item animation pose (main hand / off hand)
    private final ConcurrentHashMap<Integer, net.ye6isu.yebisuRPG.network.animation.ItemAnimPosePayload> itemPosesMain = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Integer, net.ye6isu.yebisuRPG.network.animation.ItemAnimPosePayload> itemPosesOff = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Integer, Long> itemPoseStartMsMain = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Integer, Long> itemPoseStartMsOff = new ConcurrentHashMap<>();

    private ClientAnimationEngine() {}

    // -------------------------------------------------------------------------
    // Packet-driven entry points (called from AnimClientHandler on Netty thread)
    // -------------------------------------------------------------------------

    /**
     * Creates or replaces the active playhead for the given entity/category slot.
     * If the payload carries {@code progressTicks > 0} the playhead is immediately
     * fast-forwarded to align with the server's current animation position.
     *
     * <p>Replacing an existing playhead (mid-animation retrigger) implicitly cancels
     * any in-progress blend for that slot by removing the old blender entry.</p>
     */
    public void trigger(AnimTriggerPayload payload) {
        AnimationPlayhead ph = new AnimationPlayhead(
                payload.entityId(), payload.category(), payload.animId(),
                payload.filePathOrNull(), payload.playbackSpeed(),
                payload.lookAtMask(), payload.vanillaMask(), payload.vanillaMoveMask());
        ph.fastForward(payload.progressTicks());

        playheads
            .computeIfAbsent(payload.entityId(), id -> new EnumMap<>(AnimationCategory.class))
            .put(payload.category(), ph);

        // Cancel any stale blend-out for this slot — the new trigger supersedes it.
        EnumMap<AnimationCategory, AnimationBlender> bSlots = blenders.get(payload.entityId());
        if (bSlots != null) bSlots.remove(payload.category());
    }

    /**
     * Transitions the active playhead to {@code BLENDING_OUT} and registers a blender
     * with an empty pose snapshot. The blender will complete in {@link AnimationBlender#BLEND_TICKS}
     * ticks and mark the playhead as {@code DONE} so {@link #tick()} can clean it up.
     *
     * <p>If no playhead exists for the slot (e.g. the animation already finished
     * naturally before the stop signal arrived) this method is a silent no-op.</p>
     */
    public void stop(AnimStopPayload payload) {
        stopWithSnapshot(payload.entityId(), payload.category(), AnimationBlender.PoseSnapshot.empty());
    }

    /**
     * Variant of {@link #stop(AnimStopPayload)} that accepts a real bone snapshot
     * captured by the renderer at the moment of interruption, enabling a smooth
     * per-bone linear blend-out rather than an immediate snap to rest.
     *
     * <p>Renderers that participate in blend-out (e.g. {@code MixinPlayerRenderer}
     * and {@code MixinItemInHandRenderer}) should call this before forwarding the
     * stop packet to {@link #stop(AnimStopPayload)} if they want bone-accurate
     * interpolation.</p>
     */
    public void stopWithSnapshot(int entityId, AnimationCategory category,
                                 AnimationBlender.PoseSnapshot snapshot) {
        EnumMap<AnimationCategory, AnimationPlayhead> pSlots = playheads.get(entityId);
        if (pSlots == null) return;

        AnimationPlayhead ph = pSlots.get(category);
        if (ph == null || !ph.isPlaying()) return;

        ph.beginBlendOut();

        AnimationBlender blender = new AnimationBlender();
        blender.beginBlend(ph, snapshot);

        blenders
            .computeIfAbsent(entityId, id -> new EnumMap<>(AnimationCategory.class))
            .put(category, blender);
    }

    // -------------------------------------------------------------------------
    // Pause / Resume (called from AnimClientHandler on Netty thread)
    // -------------------------------------------------------------------------

    /**
     * Handles an incoming {@link AnimPausePayload}.
     *
     * <p><b>Pause:</b> freezes the playhead at {@code frozenProgressMs}.</p>
     * <p><b>Resume:</b> unfreezes the playhead. If the animation has already
     * expired while paused (frozen position is past the animation length) the
     * slot is immediately stopped rather than playing a sliver of leftover time.</p>
     */
    public void pause(AnimPausePayload payload) {
        EnumMap<AnimationCategory, AnimationPlayhead> slots = playheads.get(payload.entityId());
        if (slots == null) return;
        AnimationPlayhead ph = slots.get(payload.category());
        if (ph == null || !ph.isPlaying()) return;

        if (payload.isResume()) {
            long frozenMs = ph.resume();
            // Check whether the animation expired while paused.
            if (frozenMs >= 0) {
                HandAnimationLoader.AnimData anim = ph.filePath() != null
                        ? HandAnimationLoader.INSTANCE.get(ph.animId(), ph.filePath())
                        : HandAnimationLoader.INSTANCE.get(ph.animId());
                if (anim != null) {
                    float frozenSecs = frozenMs / 1000f * ph.playbackSpeed();
                    switch (ph.effectiveLoopMode(anim)) {
                        case LOOP -> {
                            // Wrap so we resume mid-loop rather than at an expired position.
                            long animMs = (long)(anim.length() * 1000f);
                            if (animMs > 0) {
                                long wrapped = frozenMs % animMs;
                                // Rewind playhead to the wrapped position.
                                ph.resume(); // already resumed above — re-freeze at wrapped
                                ph.pause(wrapped);
                                ph.resume();
                            }
                        }
                        case HOLD_LAST -> {} // renderer clamps; let it keep running
                        default -> {
                            if (frozenSecs >= anim.length()) {
                                // Expired while paused — stop immediately.
                                stopWithSnapshot(payload.entityId(), payload.category(),
                                        AnimationBlender.PoseSnapshot.empty());
                            }
                        }
                    }
                }
            }
        } else {
            ph.pause(payload.frozenProgressMs());
        }
    }

    // -------------------------------------------------------------------------
    // Tick (called once per client game tick from TextureTickHandler)
    // -------------------------------------------------------------------------

    /**
     * Advances every active blender by one tick and removes all finished entries
     * from both the blender and playhead maps.
     *
     * <p>Iterates a snapshot list of entity IDs to avoid ConcurrentModificationException
     * if a packet arrives on the Netty thread mid-tick.</p>
     */
    public void tick() {
        // Auto-stop playheads that have run past their animation length.
        // Collect first, then stop — avoids mutating the EnumMap while iterating it.
        record ExpiredSlot(int entityId, AnimationCategory category) {}
        List<ExpiredSlot> expired = new ArrayList<>();
        for (Map.Entry<Integer, EnumMap<AnimationCategory, AnimationPlayhead>> outer : playheads.entrySet()) {
            for (Map.Entry<AnimationCategory, AnimationPlayhead> inner : outer.getValue().entrySet()) {
                AnimationPlayhead ph = inner.getValue();
                if (!ph.isPlaying() || ph.isPaused()) continue;
                HandAnimationLoader.AnimData anim = ph.filePath() != null
                        ? HandAnimationLoader.INSTANCE.get(ph.animId(), ph.filePath())
                        : HandAnimationLoader.INSTANCE.get(ph.animId());
                if (anim == null) continue;
                if (ph.getCurrentTimeSecs() >= anim.length()) {
                    switch (ph.effectiveLoopMode(anim)) {
                        case LOOP      -> ph.restart((long)(anim.length() * 1000f));
                        case HOLD_LAST -> {} // renderer clamps to last frame; playhead keeps running but is clamped
                        default        -> expired.add(new ExpiredSlot(outer.getKey(), inner.getKey()));
                    }
                }
            }
        }
        for (ExpiredSlot slot : expired) {
            stopWithSnapshot(slot.entityId(), slot.category(), AnimationBlender.PoseSnapshot.empty());
        }

        // Snapshot the key sets to avoid concurrent modification.
        List<Integer> entityIds = new ArrayList<>(blenders.keySet());

        for (int entityId : entityIds) {
            EnumMap<AnimationCategory, AnimationBlender> bSlots = blenders.get(entityId);
            if (bSlots == null) continue;

            Iterator<Map.Entry<AnimationCategory, AnimationBlender>> it =
                    bSlots.entrySet().iterator();

            while (it.hasNext()) {
                Map.Entry<AnimationCategory, AnimationBlender> entry = it.next();
                AnimationBlender blender = entry.getValue();
                blender.tick();

                if (blender.isFinished()) {
                    AnimationCategory cat = entry.getKey(); // read key before it.remove() invalidates the entry
                    it.remove();
                    EnumMap<AnimationCategory, AnimationPlayhead> pSlots = playheads.get(entityId);
                    if (pSlots != null) {
                        pSlots.remove(cat);
                        if (pSlots.isEmpty()) playheads.remove(entityId);
                    }
                }
            }

            if (bSlots.isEmpty()) blenders.remove(entityId);
        }
    }

    // -------------------------------------------------------------------------
    // Renderer queries (called on main client thread each render frame)
    // -------------------------------------------------------------------------

    /**
     * Returns the active {@link AnimationPlayhead} for the given entity/category slot,
     * or {@code null} if no animation is running or the slot is in DONE state.
     *
     * <p>Renderers check for null before querying the playhead — a null return means
     * vanilla behaviour should proceed unchanged for that slot.</p>
     */
    public AnimationPlayhead getPlayhead(int entityId, AnimationCategory category) {
        EnumMap<AnimationCategory, AnimationPlayhead> slots = playheads.get(entityId);
        if (slots == null) return null;
        AnimationPlayhead ph = slots.get(category);
        // Expose PLAYING and BLENDING_OUT playheads — renderers need the time value
        // during the blend window too. DONE playheads are already removed by tick().
        return (ph != null && !ph.isDone()) ? ph : null;
    }

    /**
     * Returns the active {@link AnimationBlender} for the given entity/category slot,
     * or {@code null} if no blend-out is currently running.
     *
     * <p>Renderers use this to lerp bone channels toward rest. A null return means
     * no blend is in progress — render the live playhead pose directly.</p>
     */
    public AnimationBlender getBlender(int entityId, AnimationCategory category) {
        EnumMap<AnimationCategory, AnimationBlender> slots = blenders.get(entityId);
        if (slots == null) return null;
        AnimationBlender b = slots.get(category);
        return (b != null && b.isActive()) ? b : null;
    }

    /**
     * Returns {@code true} if the given slot has an active playhead in PLAYING state.
     * Convenience check for event hooks that only need a boolean without querying time.
     */
    public boolean isPlaying(int entityId, AnimationCategory category) {
        AnimationPlayhead ph = getPlayhead(entityId, category);
        return ph != null && ph.isPlaying();
    }

    // -------------------------------------------------------------------------
    // Teardown
    // -------------------------------------------------------------------------

    /**
     * Sets or clears the persistent hand pose for an entity.
     * Called by {@link AnimClientHandler} when a {@link HandPosePayload} arrives.
     */
    public void setHandPose(HandPosePayload payload) {
        if (payload.isClear()) {
            handPoses.remove(payload.entityId());
            handPoseStartMs.remove(payload.entityId());
        } else {
            handPoses.put(payload.entityId(), payload);
            handPoseStartMs.put(payload.entityId(), System.currentTimeMillis());
        }
    }

    /**
     * Returns the active hand pose anim data for an entity, or {@code null} if none is set.
     * Used by the renderer when no playhead is active.
     */
    public HandAnimationLoader.AnimData getHandPose(int entityId) {
        HandPosePayload pose = handPoses.get(entityId);
        if (pose == null) return null;
        String file = pose.filePath() == null || pose.filePath().isEmpty() ? null : pose.filePath();
        return file != null
                ? HandAnimationLoader.INSTANCE.get(pose.animName(), file)
                : HandAnimationLoader.INSTANCE.get(pose.animName());
    }

    public HandPosePayload getHandPosePayload(int entityId) {
        return handPoses.get(entityId);
    }

    public void setThirdPersonPose(ThirdPersonPosePayload payload) {
        if (payload.isClear()) {
            thirdPersonPoses.remove(payload.entityId());
            thirdPersonPoseStartMs.remove(payload.entityId());
        } else {
            thirdPersonPoses.put(payload.entityId(), payload);
            thirdPersonPoseStartMs.put(payload.entityId(), System.currentTimeMillis());
        }
    }

    public ThirdPersonPosePayload getThirdPersonPosePayload(int entityId) {
        return thirdPersonPoses.get(entityId);
    }

    public HandAnimationLoader.AnimData getThirdPersonPose(int entityId) {
        ThirdPersonPosePayload pose = thirdPersonPoses.get(entityId);
        if (pose == null) return null;
        String file = pose.filePath() == null || pose.filePath().isEmpty() ? null : pose.filePath();
        return file != null
                ? HandAnimationLoader.INSTANCE.get(pose.animName(), file)
                : HandAnimationLoader.INSTANCE.get(pose.animName());
    }

    public float getPoseElapsedSecs(int entityId, boolean thirdPerson) {
        ConcurrentHashMap<Integer, Long> startMap = thirdPerson ? thirdPersonPoseStartMs : handPoseStartMs;
        Long startMs = startMap.get(entityId);
        if (startMs == null) return 0f;
        return (System.currentTimeMillis() - startMs) / 1000f;
    }

    // -------------------------------------------------------------------------
    // Item animation pose
    // -------------------------------------------------------------------------

    public void setItemAnimPose(net.ye6isu.yebisuRPG.network.animation.ItemAnimPosePayload payload) {
        var poses = payload.isMainHand() ? itemPosesMain : itemPosesOff;
        var starts = payload.isMainHand() ? itemPoseStartMsMain : itemPoseStartMsOff;
        if (payload.isClear()) {
            poses.remove(payload.entityId());
            starts.remove(payload.entityId());
        } else {
            poses.put(payload.entityId(), payload);
            starts.put(payload.entityId(), System.currentTimeMillis());
        }
    }

    public HandAnimationLoader.AnimData getItemAnimPose(int entityId, boolean mainHand) {
        var poses = mainHand ? itemPosesMain : itemPosesOff;
        net.ye6isu.yebisuRPG.network.animation.ItemAnimPosePayload pose = poses.get(entityId);
        if (pose == null) return null;
        String file = pose.filePath() == null || pose.filePath().isEmpty() ? null : pose.filePath();
        return file != null
                ? HandAnimationLoader.INSTANCE.get(pose.animName(), file)
                : HandAnimationLoader.INSTANCE.get(pose.animName());
    }

    public net.ye6isu.yebisuRPG.network.animation.ItemAnimPosePayload getItemAnimPosePayload(int entityId, boolean mainHand) {
        return (mainHand ? itemPosesMain : itemPosesOff).get(entityId);
    }

    public float getItemPoseElapsedSecs(int entityId, boolean mainHand) {
        var starts = mainHand ? itemPoseStartMsMain : itemPoseStartMsOff;
        Long startMs = starts.get(entityId);
        if (startMs == null) return 0f;
        return (System.currentTimeMillis() - startMs) / 1000f;
    }

    /**
     * Wipes all playheads, blenders, and hand poses. Called on client disconnect so stale state
     * from a previous session never bleeds into a new connection.
     */
    public void clearAll() {
        playheads.clear();
        blenders.clear();
        handPoses.clear();
        handPoseStartMs.clear();
        thirdPersonPoses.clear();
        thirdPersonPoseStartMs.clear();
        itemPosesMain.clear();
        itemPosesOff.clear();
        itemPoseStartMsMain.clear();
        itemPoseStartMsOff.clear();
    }
}
