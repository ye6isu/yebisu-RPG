package net.ye6isu.yebisuRPG.texture;

/**
 * Stateless tick-based frame counter shared by anything that plays a cosmetic
 * spritesheet animation (3D item models, texture overlays, etc).
 *
 * <p>Deliberately has no wall-clock time and no per-instance state — callers pass
 * in the current tick (e.g. {@code level.getGameTime()}) and get back a frame index.
 * This is only for decorative animation where exact cross-client phase doesn't matter;
 * anything that needs to convey real, synced state should use an explicit server-driven
 * frame index instead (see {@code TextureAuthority}), not this clock.</p>
 */
public final class TextureFrameClock {

    private TextureFrameClock() {}

    /**
     * @param tick          current game tick (e.g. {@code level.getGameTime()})
     * @param ticksPerFrame ticks to hold each frame for at 1.0x speed, minimum 1
     * @param frameCount    total number of frames, minimum 1
     * @param mode          behavior once the sequence reaches the last frame
     * @param startTick     the tick at which this animation started
     * @param speed         playback speed multiplier (matches {@code AnimationPlayhead.playbackSpeed} — 1.0 = normal, 2.0 = double speed)
     * @return the frame index to display, in {@code [0, frameCount)}
     */
    public static int frameAt(long tick, int ticksPerFrame, int frameCount, FrameLoopMode mode, long startTick, float speed) {
        if (frameCount <= 1) return 0;
        int tpf = Math.max(1, ticksPerFrame);
        float sp = speed > 0f ? speed : 1f;
        long elapsedTicks = Math.max(0, tick - startTick);
        long elapsedFrames = (long) (elapsedTicks * sp) / tpf;

        return switch (mode) {
            case LOOP -> (int) (elapsedFrames % frameCount);
            case PLAY_ONCE, HOLD_LAST -> (int) Math.min(elapsedFrames, frameCount - 1);
        };
    }

    /** Convenience overload at 1.0x speed. */
    public static int frameAt(long tick, int ticksPerFrame, int frameCount, FrameLoopMode mode, long startTick) {
        return frameAt(tick, ticksPerFrame, frameCount, mode, startTick, 1f);
    }

    /** Convenience overload for an animation that has always been running (no start offset), 1.0x speed. */
    public static int frameAt(long tick, int ticksPerFrame, int frameCount, FrameLoopMode mode) {
        return frameAt(tick, ticksPerFrame, frameCount, mode, 0L, 1f);
    }

    /** @return true once a PLAY_ONCE/HOLD_LAST animation has reached its final frame. */
    public static boolean isFinished(long tick, int ticksPerFrame, int frameCount, long startTick) {
        if (frameCount <= 1) return true;
        int tpf = Math.max(1, ticksPerFrame);
        long elapsedTicks = Math.max(0, tick - startTick);
        return elapsedTicks / tpf >= frameCount - 1;
    }
}
