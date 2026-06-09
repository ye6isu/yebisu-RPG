package net.ye6isu.yebisuRPG.animation.client;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

/**
 * CLIENT-ONLY 2-tick linear blend-out executor.
 *
 * <p>When {@link net.ye6isu.yebisuRPG.animation.AnimationAPI#stopAnimation} fires,
 * the server clears its registry and broadcasts an
 * {@link net.ye6isu.yebisuRPG.network.animation.AnimStopPayload}.
 * Rather than snapping bones instantly to their rest pose, the client intercepts
 * this signal and hands the affected playhead to this class, which linearly
 * interpolates each bone channel from its interrupted pose back to the default
 * over exactly {@link #BLEND_TICKS} game ticks.</p>
 *
 * <h2>Blend mechanics</h2>
 * <p>On the first render frame after a stop signal arrives, the blender captures
 * a snapshot of the current bone pose via the supplied {@link PoseSnapshot}.
 * On every subsequent {@link #tick()} call (once per client game tick) it
 * increments the internal counter. Renderers query {@link #getBlendAlpha(float)}
 * each frame, passing the current partial tick, and receive a {@code [0.0, 1.0]}
 * value where {@code 0.0} = fully in the interrupted pose and {@code 1.0} = fully
 * at rest. When the counter reaches {@link #BLEND_TICKS} the blender calls
 * {@link AnimationPlayhead#markDone()} and flags itself finished so
 * {@link ClientAnimationEngine} can discard the entry.</p>
 *
 * <h2>Why 2 ticks</h2>
 * <p>Two ticks (100 ms at 20 TPS) is long enough to eliminate the visual snap
 * without being perceptible as a separate motion. It matches the spec verbatim.</p>
 *
 * <h2>Integration contract</h2>
 * <ul>
 *   <li>{@link ClientAnimationEngine} calls {@link #beginBlend(AnimationPlayhead, PoseSnapshot)}
 *       immediately on receipt of a stop packet.</li>
 *   <li>{@link ClientAnimationEngine#tick()} calls {@link #tick()} once per client tick
 *       for every blender that is not yet {@link #isFinished()}.</li>
 *   <li>Renderers call {@link #getBlendAlpha(float)} each render frame and lerp
 *       bone rotations between the snapshot and the rest pose using that value.</li>
 * </ul>
 */
@OnlyIn(Dist.CLIENT)
public final class AnimationBlender {

    /** Duration of the blend-out window in server/client ticks. */
    public static final int BLEND_TICKS = 2;

    // -------------------------------------------------------------------------
    // Pose snapshot
    // -------------------------------------------------------------------------

    /**
     * Immutable capture of a model's bone state at the moment a stop signal
     * was received. Renderers lerp from this snapshot toward the rest pose
     * using {@link #getBlendAlpha(float)}.
     *
     * <p>The three arrays are parallel — index {@code i} describes the same
     * bone in each. All rotations are in degrees, matching Minecraft's model
     * rotation convention.</p>
     *
     * @param boneNames  logical bone identifiers (e.g. {@code "head"}, {@code "right_arm"})
     * @param rotationsX per-bone X rotation in degrees at blend-out start
     * @param rotationsY per-bone Y rotation in degrees at blend-out start
     * @param rotationsZ per-bone Z rotation in degrees at blend-out start
     */
    public record PoseSnapshot(
            String[] boneNames,
            float[]  rotationsX,
            float[]  rotationsY,
            float[]  rotationsZ
    ) {
        /**
         * Convenience constructor for a single-bone snapshot, common for item
         * and armor slot animations that drive one geometry group.
         */
        public static PoseSnapshot single(String bone, float rx, float ry, float rz) {
            return new PoseSnapshot(
                    new String[]{ bone },
                    new float[] { rx  },
                    new float[] { ry  },
                    new float[] { rz  });
        }

        /** Empty snapshot — no bones to blend. Blend-out resolves immediately. */
        public static PoseSnapshot empty() {
            return new PoseSnapshot(new String[0], new float[0], new float[0], new float[0]);
        }

        public int boneCount() { return boneNames.length; }
    }

    // -------------------------------------------------------------------------
    // Fields
    // -------------------------------------------------------------------------

    private AnimationPlayhead playhead;
    private PoseSnapshot      snapshot;

    /** Ticks elapsed since blend-out began. */
    private int  elapsedTicks = 0;
    private boolean active    = false;

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    /**
     * Begins the blend-out for the given playhead, capturing the supplied
     * pose snapshot as the blend-out origin.
     *
     * <p>Must be called once, immediately after the stop packet is received.
     * Calling again on an already-active blender replaces the previous state —
     * this handles the rare case where a second stop arrives before the first
     * blend completes (e.g. rapid ability cancellation).</p>
     *
     * @param playhead the playhead whose {@link AnimationPlayhead#beginBlendOut()} has
     *                 already been called by {@link ClientAnimationEngine}
     * @param snapshot bone rotations captured at the moment of interruption
     */
    public void beginBlend(AnimationPlayhead playhead, PoseSnapshot snapshot) {
        this.playhead     = playhead;
        this.snapshot     = snapshot;
        this.elapsedTicks = 0;
        this.active       = true;
    }

    /**
     * Advances the blend timer by one client tick.
     * Called by {@link ClientAnimationEngine#tick()} on each game tick.
     * No-op if not active or already finished.
     */
    public void tick() {
        if (!active || playhead == null) return;
        elapsedTicks++;
        if (elapsedTicks >= BLEND_TICKS) {
            playhead.markDone();
            active = false;
        }
    }

    // -------------------------------------------------------------------------
    // Renderer query
    // -------------------------------------------------------------------------

    /**
     * Returns the blend alpha for the current render frame.
     *
     * <p>{@code 0.0f} = fully in the interrupted pose (start of blend-out).
     * {@code 1.0f} = fully at rest pose (blend complete).</p>
     *
     * <p>{@code partialTick} is the sub-tick interpolation value supplied by
     * Minecraft's render loop ({@code 0.0} at tick start, approaching {@code 1.0}
     * just before the next tick). Incorporating it keeps the blend visually smooth
     * at any frame rate rather than stepping in discrete 50 ms jumps.</p>
     *
     * <p>Returns {@code 1.0f} if the blender is not active, so renderers that query
     * this unconditionally simply render the rest pose when no blend is running.</p>
     *
     * @param partialTick sub-tick interpolation value from the render event [0.0, 1.0]
     * @return blend alpha in [0.0, 1.0]
     */
    public float getBlendAlpha(float partialTick) {
        if (!active) return 1.0f;
        float t = (elapsedTicks + partialTick) / (float) BLEND_TICKS;
        return Math.min(t, 1.0f);
    }

    /**
     * Linearly interpolates a single bone rotation channel from its snapshot
     * value toward zero (rest) using the current blend alpha.
     *
     * <p>Renderers call this per-bone per-axis rather than managing the lerp math
     * themselves, keeping the renderer code free of blend arithmetic.</p>
     *
     * @param snapshotRotation the rotation value captured at blend-out start (degrees)
     * @param partialTick      sub-tick interpolation value from the render event
     * @return interpolated rotation in degrees
     */
    public float lerpToRest(float snapshotRotation, float partialTick) {
        float alpha = getBlendAlpha(partialTick);
        // alpha 0.0 → full snapshot value; alpha 1.0 → rest (0 degrees)
        return snapshotRotation * (1.0f - alpha);
    }

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    public boolean     isActive()    { return active; }
    public boolean     isFinished()  { return playhead != null && playhead.isDone(); }
    public PoseSnapshot snapshot()   { return snapshot; }
}
