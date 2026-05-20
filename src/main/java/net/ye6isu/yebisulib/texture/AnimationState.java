package net.ye6isu.yebisulib.texture;

/**
 * Mutable, per-instance playback state for a spritesheet animation.
 *
 * <p>One {@code AnimationState} is owned by exactly one {@link TextureComponent}.
 * It is created and stored client-side only; it is never serialised or sent over
 * the network. All tick-based advancement happens in
 * {@link TextureManager#clientTick()}.</p>
 *
 * <h2>Coordinate system</h2>
 * <p>Frames are indexed left-to-right, top-to-bottom in the spritesheet.
 * The renderer converts a frame index into a UV offset using
 * {@link #getFrameU(int, int)} and {@link #getFrameV(int, int)}.</p>
 *
 * <h2>Thread safety</h2>
 * <p>Mutated only on the render/client thread. No synchronisation needed.</p>
 */
public final class AnimationState {

    private final int totalFrames;
    private final int ticksPerFrame;
    private final AnimationMode mode;

    private int currentFrame = 0;
    private int tickAccumulator = 0;
    private boolean running = true;
    private boolean finished = false;

    /**
     * @param totalFrames   total number of frames in the spritesheet
     * @param ticksPerFrame how many game ticks to wait before advancing one frame
     * @param mode          playback behaviour
     */
    public AnimationState(int totalFrames, int ticksPerFrame, AnimationMode mode) {
        if (totalFrames < 1) throw new IllegalArgumentException("totalFrames must be >= 1");
        if (ticksPerFrame < 1) throw new IllegalArgumentException("ticksPerFrame must be >= 1");
        this.totalFrames   = totalFrames;
        this.ticksPerFrame = ticksPerFrame;
        this.mode          = mode;
    }

    // ---------------------------------------------------------------------------------
    // Tick advancement — called by TextureManager.clientTick()
    // ---------------------------------------------------------------------------------

    /**
     * Advances the animation by one game tick. Called automatically by
     * {@link TextureManager}; do not call from render code.
     */
    public void tick() {
        if (!running || mode == AnimationMode.MANUAL) return;

        tickAccumulator++;
        if (tickAccumulator < ticksPerFrame) return;
        tickAccumulator = 0;

        currentFrame++;

        if (currentFrame >= totalFrames) {
            switch (mode) {
                case LOOP -> currentFrame = 0;
                case PLAY_ONCE -> {
                    currentFrame = totalFrames - 1; // freeze on last frame
                    running  = false;
                    finished = true;
                }
                default -> {}
            }
        }
    }

    // ---------------------------------------------------------------------------------
    // Manual control
    // ---------------------------------------------------------------------------------

    /**
     * Directly sets the active frame. Only meaningful when mode is
     * {@link AnimationMode#MANUAL}, but safe to call in any mode.
     *
     * @param frame frame index, clamped to [0, totalFrames - 1]
     */
    public void setFrame(int frame) {
        currentFrame = Math.max(0, Math.min(frame, totalFrames - 1));
    }

    /**
     * Stops tick-based advancement immediately. The current frame is preserved.
     * Has no effect if already stopped.
     */
    public void stop() {
        running = false;
    }

    /**
     * Resumes tick-based advancement from the current frame.
     * Clears the {@code finished} flag if the animation had completed.
     */
    public void resume() {
        running  = true;
        finished = false;
    }

    /** Resets to frame 0 and restarts playback. */
    public void restart() {
        currentFrame    = 0;
        tickAccumulator = 0;
        running         = true;
        finished        = false;
    }

    // ---------------------------------------------------------------------------------
    // UV computation helpers — used by the renderer
    // ---------------------------------------------------------------------------------

    /**
     * Returns the U offset (0.0–1.0) for the current frame within the spritesheet,
     * given how many columns the sheet has.
     *
     * @param columns number of frames per row in the spritesheet
     */
    public float getFrameU(int columns) {
        return (float) (currentFrame % columns) / columns;
    }

    /**
     * Returns the V offset (0.0–1.0) for the current frame within the spritesheet,
     * given how many columns and rows the sheet has.
     *
     * @param columns number of frames per row
     * @param rows    number of rows
     */
    public float getFrameV(int columns, int rows) {
        return (float) (currentFrame / columns) / rows;
    }

    // ---------------------------------------------------------------------------------
    // Accessors
    // ---------------------------------------------------------------------------------

    public int  getCurrentFrame()  { return currentFrame; }
    public int  getTotalFrames()   { return totalFrames; }
    public int  getTicksPerFrame() { return ticksPerFrame; }
    public AnimationMode getMode() { return mode; }
    public boolean isRunning()     { return running; }

    /**
     * {@code true} only after a {@link AnimationMode#PLAY_ONCE} animation
     * has played through all frames. Always {@code false} for {@link AnimationMode#LOOP}.
     */
    public boolean isFinished() { return finished; }
}
