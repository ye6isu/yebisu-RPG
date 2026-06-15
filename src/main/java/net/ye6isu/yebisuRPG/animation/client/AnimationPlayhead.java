package net.ye6isu.yebisuRPG.animation.client;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.animation.AnimationLoopMode;

/**
 * CLIENT-ONLY per-slot playback cursor for one active custom animation.
 *
 * <h2>Time model</h2>
 * <p>{@code startMs} is a wall-clock origin. {@code getCurrentTimeSecs()} returns
 * {@code (now - startMs) / 1000 * speed}. Pausing freezes the perceived time by
 * recording the frozen ms and stopping {@code startMs} from advancing.</p>
 *
 * <h2>Pause model</h2>
 * <p>When paused, {@code frozenMs >= 0} and queries return that fixed value.
 * On resume, {@code startMs} is recalculated so the live formula immediately
 * yields the same position the animation was frozen at.</p>
 */
@OnlyIn(Dist.CLIENT)
public final class AnimationPlayhead {

    public static final long MS_PER_TICK = 50L;

    public enum State { PLAYING, BLENDING_OUT, DONE }

    private final int entityId;
    private final AnimationCategory category;
    private final String animId;
    private final String filePath;
    private final float playbackSpeed;

    private long startMs;
    private long frozenMs = -1L; // >= 0 while paused
    private State state = State.PLAYING;

    public AnimationPlayhead(int entityId, AnimationCategory category, String animId) {
        this(entityId, category, animId, null, 1f);
    }

    public AnimationPlayhead(int entityId, AnimationCategory category, String animId, String filePath) {
        this(entityId, category, animId, filePath, 1f);
    }

    public AnimationPlayhead(int entityId, AnimationCategory category, String animId,
                             String filePath, float playbackSpeed) {
        this.entityId      = entityId;
        this.category      = category;
        this.animId        = animId;
        this.filePath      = filePath;
        this.playbackSpeed = playbackSpeed;
        this.startMs       = System.currentTimeMillis();
    }

    // ── Fast-forward ──────────────────────────────────────────────────────────

    /**
     * Shifts the playhead to align with the server's current position.
     * progressTicks are speed-scaled; divide by speed to get real wall-clock ms.
     */
    public void fastForward(int ticks) {
        if (ticks > 0 && playbackSpeed > 0f)
            startMs -= (long)(ticks * MS_PER_TICK / playbackSpeed);
    }

    // ── Pause / Resume ────────────────────────────────────────────────────────

    /**
     * Freezes playback at {@code frozenProgressMs} (speed-scaled ms from the server).
     * Safe to call multiple times — only the first call while unpaused takes effect.
     */
    public void pause(long frozenProgressMs) {
        if (frozenMs < 0) frozenMs = frozenProgressMs;
    }

    /**
     * Resumes from the frozen position. Recalculates {@code startMs} so the live
     * formula immediately yields the same perceived time as the frozen value.
     * Returns the frozen ms so the engine can check whether the animation expired.
     */
    public long resume() {
        long frozen = frozenMs;
        frozenMs = -1L;
        if (frozen >= 0 && playbackSpeed > 0f) {
            // startMs = now - (frozen / speed)  →  getCurrentTimeMs() = frozen / speed
            // then * speed = frozen perceived ms
            startMs = System.currentTimeMillis() - (long)(frozen / playbackSpeed);
        }
        return frozen;
    }

    public boolean isPaused() { return frozenMs >= 0; }

    // ── Time queries ──────────────────────────────────────────────────────────

    public long getCurrentTimeMs() {
        if (frozenMs >= 0) return frozenMs;
        return System.currentTimeMillis() - startMs;
    }

    /** Speed-scaled seconds — what renderers pass to the animation sampler. */
    public float getCurrentTimeSecs() {
        return getCurrentTimeMs() / 1000f * playbackSpeed;
    }

    // ── Loop support ──────────────────────────────────────────────────────────

    public void restart(long animLengthMs) {
        startMs += (playbackSpeed > 0f ? (long)(animLengthMs / playbackSpeed) : animLengthMs);
    }

    // ── State transitions ─────────────────────────────────────────────────────

    public void beginBlendOut() {
        if (state == State.PLAYING) state = State.BLENDING_OUT;
    }

    public void markDone() {
        state = State.DONE;
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    public int               entityId()      { return entityId;      }
    public AnimationCategory category()      { return category;      }
    public String            animId()        { return animId;        }
    public String            filePath()      { return filePath;      }
    public float             playbackSpeed() { return playbackSpeed; }
    public State             state()         { return state;         }
    public boolean           isPlaying()     { return state == State.PLAYING; }
    public boolean           isDone()        { return state == State.DONE;    }

    public AnimationLoopMode effectiveLoopMode(HandAnimationLoader.AnimData anim) {
        return anim.loopMode();
    }
}
