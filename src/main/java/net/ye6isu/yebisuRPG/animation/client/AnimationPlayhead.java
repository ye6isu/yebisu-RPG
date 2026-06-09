package net.ye6isu.yebisuRPG.animation.client;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;

/**
 * CLIENT-ONLY per-slot playback cursor for one active custom animation.
 *
 * <p>One instance lives inside {@link ClientAnimationEngine} for each
 * (entityId, {@link AnimationCategory}) pair that has been triggered.
 * It tracks elapsed time in milliseconds so renderers can query a
 * sub-tick-accurate position within the animation timeline regardless
 * of the game's fixed 50 ms tick rate.</p>
 *
 * <h2>Time model</h2>
 * <p>The playhead owns a {@code startMs} wall-clock timestamp captured
 * the moment the playhead is created (or fast-forwarded). Querying
 * {@link #getCurrentTimeMs()} at render time subtracts that origin from
 * {@link System#currentTimeMillis()}, producing a value renderers hand
 * directly to Bedrock {@code AnimationDefinition} selectors (which accept
 * animation time in seconds as a float).</p>
 *
 * <h2>Fast-forward (late-joiner catch-up)</h2>
 * <p>When the server sends a catch-up {@link net.ye6isu.yebisuRPG.network.animation.AnimTriggerPayload}
 * with {@code progressTicks > 0}, {@link #fastForward(int)} shifts {@code startMs}
 * backward by the equivalent milliseconds so the playhead immediately reads as
 * if it had been running since the original trigger tick.</p>
 *
 * <h2>State machine</h2>
 * <pre>
 *   PLAYING ──stopAnimation()──► BLENDING_OUT ──blend complete──► DONE
 *      ▲                                                             │
 *      └────────────────────────triggerAnimation()───────────────────┘
 *                                (replaces entry in engine map)
 * </pre>
 * DONE playheads are removed from the engine map by {@link ClientAnimationEngine}
 * after the blend finishes; they are never reused.
 */
@OnlyIn(Dist.CLIENT)
public final class AnimationPlayhead {

    /** Milliseconds per server tick (20 TPS). */
    public static final long MS_PER_TICK = 50L;

    // -------------------------------------------------------------------------
    // State enum
    // -------------------------------------------------------------------------

    public enum State { PLAYING, BLENDING_OUT, DONE }

    // -------------------------------------------------------------------------
    // Fields
    // -------------------------------------------------------------------------

    private final int entityId;
    private final AnimationCategory category;
    private final String animId;

    /**
     * Wall-clock origin in milliseconds. Subtracting this from
     * {@link System#currentTimeMillis()} gives the animation's elapsed time.
     * Shifted backward by {@link #fastForward(int)} for late-joiner alignment.
     */
    private long startMs;

    private State state = State.PLAYING;

    // -------------------------------------------------------------------------
    // Construction
    // -------------------------------------------------------------------------

    /**
     * Creates a fresh playhead starting at time zero.
     * Called when a trigger packet with {@code progressTicks == 0} arrives.
     */
    public AnimationPlayhead(int entityId, AnimationCategory category, String animId) {
        this.entityId = entityId;
        this.category = category;
        this.animId   = animId;
        this.startMs  = System.currentTimeMillis();
    }

    // -------------------------------------------------------------------------
    // Fast-forward (late-joiner catch-up)
    // -------------------------------------------------------------------------

    /**
     * Shifts the playhead origin backward by {@code ticks × 50 ms} so the
     * playhead reads as if it started that many ticks ago.
     *
     * <p>Must be called immediately after construction when the incoming
     * {@link net.ye6isu.yebisuRPG.network.animation.AnimTriggerPayload#progressTicks()}
     * is greater than zero. Safe to call with {@code ticks == 0} (no-op).</p>
     *
     * @param ticks elapsed server ticks reported in the catch-up payload
     */
    public void fastForward(int ticks) {
        if (ticks > 0) startMs -= (long) ticks * MS_PER_TICK;
    }

    // -------------------------------------------------------------------------
    // Runtime queries
    // -------------------------------------------------------------------------

    /**
     * Returns the animation's current elapsed time in milliseconds.
     * Sub-tick accurate — safe to call every render frame.
     *
     * <p>Renderers convert this to seconds by dividing by 1000f before handing
     * it to an {@code AnimationDefinition} selector.</p>
     */
    public long getCurrentTimeMs() {
        return System.currentTimeMillis() - startMs;
    }

    /**
     * Convenience form of {@link #getCurrentTimeMs()} returned as seconds.
     * Matches the float time parameter expected by Minecraft's Bedrock animation
     * {@code AnimationDefinition} infrastructure.
     */
    public float getCurrentTimeSecs() {
        return getCurrentTimeMs() / 1000f;
    }

    // -------------------------------------------------------------------------
    // State transitions
    // -------------------------------------------------------------------------

    /**
     * Transitions the playhead to {@link State#BLENDING_OUT}.
     * Called by {@link ClientAnimationEngine} when an
     * {@link net.ye6isu.yebisuRPG.network.animation.AnimStopPayload} is received.
     * No-op if already blending or done.
     */
    public void beginBlendOut() {
        if (state == State.PLAYING) state = State.BLENDING_OUT;
    }

    /**
     * Marks the playhead as fully done after the blend finishes.
     * Called by {@link AnimationBlender} when the 2-tick window elapses.
     */
    public void markDone() {
        state = State.DONE;
    }

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    public int              entityId()  { return entityId; }
    public AnimationCategory category() { return category; }
    public String           animId()    { return animId;   }
    public State            state()     { return state;    }
    public boolean          isPlaying() { return state == State.PLAYING; }
    public boolean          isDone()    { return state == State.DONE;    }
}
