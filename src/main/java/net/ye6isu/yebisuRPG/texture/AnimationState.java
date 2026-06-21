package net.ye6isu.yebisuRPG.texture;

public final class AnimationState {

    private final int totalFrames;
    private final int ticksPerFrame;
    private final AnimationMode mode;
    private final int defaultFrame;

    private int currentFrame;
    private int tickAccumulator = 0;
    private boolean running = true;
    private boolean finished = false;

    public AnimationState(int totalFrames, int ticksPerFrame, AnimationMode mode) {
        this(totalFrames, ticksPerFrame, mode, 0);
    }

    public AnimationState(int totalFrames, int ticksPerFrame, AnimationMode mode, int defaultFrame) {
        if (totalFrames < 1) throw new IllegalArgumentException("totalFrames must be >= 1");
        if (ticksPerFrame < 1) throw new IllegalArgumentException("ticksPerFrame must be >= 1");
        this.totalFrames   = totalFrames;
        this.ticksPerFrame = ticksPerFrame;
        this.mode          = mode;
        this.defaultFrame  = Math.max(0, Math.min(defaultFrame, totalFrames - 1));
        this.currentFrame  = this.defaultFrame;
    }

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
                    currentFrame = totalFrames - 1;
                    running = false;
                    finished = true;
                }
                default -> {}
            }
        }
    }

    public void setFrame(int frame) { currentFrame = Math.max(0, Math.min(frame, totalFrames - 1)); }
    public void stop()    { running = false; }
    public void resume()  { running = true; finished = false; }
    public void restart() { currentFrame = defaultFrame; tickAccumulator = 0; running = true; finished = false; }

    public float getFrameU(int columns) { return (float)(currentFrame % columns) / columns; }
    public float getFrameV(int columns, int rows) { return (float)(currentFrame / columns) / rows; }

    public int getCurrentFrame()   { return currentFrame; }
    public int getTotalFrames()    { return totalFrames; }
    public int getTicksPerFrame()  { return ticksPerFrame; }
    public AnimationMode getMode() { return mode; }
    public int getDefaultFrame()   { return defaultFrame; }
    public boolean isRunning()     { return running; }
    public boolean isFinished()    { return finished; }
}
