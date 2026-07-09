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

    // lookAtMask — 2 bits per part (yaw, pitch), 7 parts = 14 bits
    // Head=bits 0-1, Torso=2-3, RightArm=4-5, LeftArm=6-7, RightLeg=8-9, LeftLeg=10-11, Root=12-13
    public static final int LOOK_HEAD_YAW       = 1 << 0;
    public static final int LOOK_HEAD_PITCH     = 1 << 1;
    public static final int LOOK_TORSO_YAW      = 1 << 2;
    public static final int LOOK_TORSO_PITCH    = 1 << 3;
    public static final int LOOK_RARM_YAW       = 1 << 4;
    public static final int LOOK_RARM_PITCH     = 1 << 5;
    public static final int LOOK_LARM_YAW       = 1 << 6;
    public static final int LOOK_LARM_PITCH     = 1 << 7;
    public static final int LOOK_RLEG_YAW       = 1 << 8;
    public static final int LOOK_RLEG_PITCH     = 1 << 9;
    public static final int LOOK_LLEG_YAW       = 1 << 10;
    public static final int LOOK_LLEG_PITCH     = 1 << 11;
    public static final int LOOK_ROOT_YAW       = 1 << 12;
    public static final int LOOK_ROOT_PITCH     = 1 << 13;

    // vanillaMask — 1 bit per part; if set, vanilla walk/swing fully owns that part (no anim overwrite)
    // Crouch bit: allows the PoseStack -0.125 Y shift (crouched height) but still no bone tilt animation
    // Sitting bit: allows riding leg splay and arm pull-back pose
    // Head=bit0, Torso=bit1, RightArm=bit2, LeftArm=bit3, RightLeg=bit4, LeftLeg=bit5,
    // Crouch=bit6, (bit7 reserved), Sitting=bit8
    public static final int VAN_HEAD      = 1 << 0;
    public static final int VAN_TORSO     = 1 << 1;
    public static final int VAN_RIGHT_ARM = 1 << 2;
    public static final int VAN_LEFT_ARM  = 1 << 3;
    public static final int VAN_RIGHT_LEG = 1 << 4;
    public static final int VAN_LEFT_LEG  = 1 << 5;
    public static final int VAN_CROUCH    = 1 << 6;
    public static final int DISABLE_PRONE = 1 << 7;
    public static final int VAN_SITTING   = 1 << 8;
    public static final int HAND_SKIP_RIGHT = 1 << 9;
    public static final int HAND_SKIP_LEFT  = 1 << 10;

    // vanillaMoveMask — repurposed as the first-person mannequin limb mask: when any of the
    // FP_* bits below are set, this entity's ENTITY_THIRD_PERSON animation/pose is additionally
    // rendered as a camera-anchored, eye-pivoted overlay of just those limbs via
    // ForceRenderCameraEntity — a partial mannequin fixed in front of the camera, independent of
    // and without touching the real third-person render. Head/torso are never rendered by the
    // mannequin (see ForceRenderCameraEntity). Older per-part "while moving"/"while still" bits
    // (1<<0 .. 1<<13, 1<<16, 1<<17) and a since-removed per-limb version of this mask were
    // declared but never consumed by any renderer / superseded before shipping — safe to repurpose.
    public static final int FP_RIGHT_ARM = 1 << 0;
    public static final int FP_LEFT_ARM  = 1 << 1;
    public static final int FP_RIGHT_LEG = 1 << 2;
    public static final int FP_LEFT_LEG  = 1 << 3;
    public static final int FP_ANY_LIMB  = FP_RIGHT_ARM | FP_LEFT_ARM | FP_RIGHT_LEG | FP_LEFT_LEG;

    private final int entityId;
    private final AnimationCategory category;
    private final String animId;
    private final String filePath;
    private final float playbackSpeed;
    private final int lookAtMask;
    private final int vanillaMask;
    private final int vanillaMoveMask;

    public static final int BLEND_IN_TICKS = 3;

    private long startMs;
    private final long createdMs;
    private long frozenMs = -1L; // >= 0 while paused
    private State state = State.PLAYING;

    public AnimationPlayhead(int entityId, AnimationCategory category, String animId) {
        this(entityId, category, animId, null, 1f, 0, 0, 0);
    }

    public AnimationPlayhead(int entityId, AnimationCategory category, String animId, String filePath) {
        this(entityId, category, animId, filePath, 1f, 0, 0, 0);
    }

    public AnimationPlayhead(int entityId, AnimationCategory category, String animId,
                             String filePath, float playbackSpeed) {
        this(entityId, category, animId, filePath, playbackSpeed, 0, 0, 0);
    }

    public AnimationPlayhead(int entityId, AnimationCategory category, String animId,
                             String filePath, float playbackSpeed, int lookAtMask) {
        this(entityId, category, animId, filePath, playbackSpeed, lookAtMask, 0, 0);
    }

    public AnimationPlayhead(int entityId, AnimationCategory category, String animId,
                             String filePath, float playbackSpeed, int lookAtMask, int vanillaMask) {
        this(entityId, category, animId, filePath, playbackSpeed, lookAtMask, vanillaMask, 0);
    }

    public AnimationPlayhead(int entityId, AnimationCategory category, String animId,
                             String filePath, float playbackSpeed, int lookAtMask, int vanillaMask, int vanillaMoveMask) {
        this.entityId        = entityId;
        this.category        = category;
        this.animId          = animId;
        this.filePath        = filePath;
        this.playbackSpeed   = playbackSpeed;
        this.lookAtMask      = lookAtMask;
        this.vanillaMask     = vanillaMask;
        this.vanillaMoveMask = vanillaMoveMask;
        this.startMs         = System.currentTimeMillis();
        this.createdMs       = this.startMs;
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
    public int               lookAtMask()      { return lookAtMask;      }
    public int               vanillaMask()     { return vanillaMask;     }
    public int               vanillaMoveMask() { return vanillaMoveMask; }
    public State             state()           { return state;           }
    public boolean           isPlaying()       { return state == State.PLAYING; }
    public boolean           isDone()          { return state == State.DONE;    }
    public boolean           looksAt(int bit)  { return (lookAtMask & bit) != 0; }
    public boolean           allowsVanilla(int bit){ return (vanillaMask & bit) != 0; }

    /** True if the camera-anchored first-person mannequin overlay is enabled (any limb) for this animation. */
    public boolean showInFirstPerson() { return (vanillaMoveMask & FP_ANY_LIMB) != 0; }

    /** Bitmask of which limbs (FP_RIGHT_ARM/FP_LEFT_ARM/FP_RIGHT_LEG/FP_LEFT_LEG) the first-person mannequin should render. */
    public int firstPersonLimbMask() { return vanillaMoveMask & FP_ANY_LIMB; }

    public float getBlendInWeight(float partialTick) {
        long elapsedMs = System.currentTimeMillis() - createdMs;
        float elapsedTicks = elapsedMs / (float) MS_PER_TICK + partialTick;
        if (elapsedTicks >= BLEND_IN_TICKS) return 1.0f;
        return Math.max(elapsedTicks / (float) BLEND_IN_TICKS, 0.0f);
    }

    public AnimationLoopMode effectiveLoopMode(HandAnimationLoader.AnimData anim) {
        return anim.loopMode();
    }
}
