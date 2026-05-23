package net.ye6isu.yebisulib.texture;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/texture/AnimationState.class */
public final class AnimationState {
    private final int totalFrames;
    private final int ticksPerFrame;
    private final AnimationMode mode;
    private int currentFrame = 0;
    private int tickAccumulator = 0;
    private boolean running = true;
    private boolean finished = false;

    public AnimationState(int totalFrames, int ticksPerFrame, AnimationMode mode) {
        if (totalFrames < 1) {
            throw new IllegalArgumentException("totalFrames must be >= 1");
        }
        if (ticksPerFrame < 1) {
            throw new IllegalArgumentException("ticksPerFrame must be >= 1");
        }
        this.totalFrames = totalFrames;
        this.ticksPerFrame = ticksPerFrame;
        this.mode = mode;
    }

    public void tick() {
        if (!this.running || this.mode == AnimationMode.MANUAL) {
            return;
        }
        this.tickAccumulator++;
        if (this.tickAccumulator < this.ticksPerFrame) {
        }
        this.tickAccumulator = 0;
        this.currentFrame++;
        if (this.currentFrame >= this.totalFrames) {
            switch (C00061.$SwitchMap$net$ye6isu$yebisulib$texture$AnimationMode[this.mode.ordinal()]) {
                case ID_FLOAT:
                    this.currentFrame = 0;
                    break;
                case ID_BOOL:
                    this.currentFrame = this.totalFrames - 1;
                    this.running = false;
                    this.finished = true;
                    break;
            }
        }
    }

    /* JADX INFO: renamed from: net.ye6isu.yebisulib.texture.AnimationState$1 */
    /* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/texture/AnimationState$1.class */
    static /* synthetic */ class C00061 {
        static final /* synthetic */ int[] $SwitchMap$net$ye6isu$yebisulib$texture$AnimationMode = new int[AnimationMode.values().length];

        static {
            try {
                $SwitchMap$net$ye6isu$yebisulib$texture$AnimationMode[AnimationMode.LOOP.ordinal()] = 1;
            } catch (NoSuchFieldError e) {
            }
            try {
                $SwitchMap$net$ye6isu$yebisulib$texture$AnimationMode[AnimationMode.PLAY_ONCE.ordinal()] = 2;
            } catch (NoSuchFieldError e2) {
            }
        }
    }

    public void setFrame(int frame) {
        this.currentFrame = Math.max(0, Math.min(frame, this.totalFrames - 1));
    }

    public void stop() {
        this.running = false;
    }

    public void resume() {
        this.running = true;
        this.finished = false;
    }

    public void restart() {
        this.currentFrame = 0;
        this.tickAccumulator = 0;
        this.running = true;
        this.finished = false;
    }

    public float getFrameU(int columns) {
        return (this.currentFrame % columns) / columns;
    }

    public float getFrameV(int columns, int rows) {
        return (this.currentFrame / columns) / rows;
    }

    public int getCurrentFrame() {
        return this.currentFrame;
    }

    public int getTotalFrames() {
        return this.totalFrames;
    }

    public int getTicksPerFrame() {
        return this.ticksPerFrame;
    }

    public AnimationMode getMode() {
        return this.mode;
    }

    public boolean isRunning() {
        return this.running;
    }

    public boolean isFinished() {
        return this.finished;
    }
}
