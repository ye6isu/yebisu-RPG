package net.ye6isu.yebisulib.texture;

/**
 * Determines how a spritesheet animation progresses over time.
 *
 * <h2>Modes</h2>
 * <ul>
 *   <li>{@link #MANUAL} — no automatic frame advancement. The caller controls the
 *       active frame directly via {@link AnimationState#setFrame}. Use this for
 *       multi-stage actions such as weapon charge-up where the game state dictates
 *       which frame to display.</li>
 *   <li>{@link #LOOP} — advances through all frames in order then wraps back to
 *       frame 0. Runs indefinitely until explicitly stopped.</li>
 *   <li>{@link #PLAY_ONCE} — advances through all frames exactly once, then freezes
 *       on the final frame. The component marks itself as {@code finished} so the
 *       caller can react (e.g. remove the overlay or chain another animation).</li>
 * </ul>
 */
public enum AnimationMode {

    /**
     * Caller sets the frame manually via {@link AnimationState#setFrame(int)}.
     * No tick-based advancement occurs.
     */
    MANUAL,

    /**
     * Automatically advance frames on a tick interval, wrapping to frame 0 after
     * the last frame. Never stops unless {@link AnimationState#stop()} is called.
     */
    LOOP,

    /**
     * Automatically advance frames once. Freezes on the last frame and sets
     * {@link AnimationState#isFinished()} to {@code true}.
     */
    PLAY_ONCE
}
