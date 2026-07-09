package net.ye6isu.yebisuRPG.animation;

/**
 * Mutable snapshot of one active animation slot on the server.
 *
 * @param entityId        entity.getId()
 * @param category        which render pathway this entry drives
 * @param animId          key matching the Blockbench export filename
 * @param startTick       level.getGameTime() at the moment triggerAnimation() was called
 * @param filePath        resource path of the source JSON file, or {@code null} for the default
 * @param playbackSpeed   speed multiplier (1.0 = normal, 0.5 = half, 2.0 = double)
 * @param lookAtMask      per-bone look-at bits, needed to resend an identical catch-up trigger
 * @param vanillaMask     per-bone vanilla-fallback bits, needed to resend an identical catch-up trigger
 * @param vanillaMoveMask per-bone movement-conditioned vanilla bits, needed to resend an identical catch-up trigger
 */
public final class AnimationEntry {

    private final int entityId;
    private final AnimationCategory category;
    private final String animId;
    private final long startTick;
    private final String filePath;
    private final float playbackSpeed;
    private final int lookAtMask;
    private final int vanillaMask;
    private final int vanillaMoveMask;

    /**
     * Speed-scaled elapsed ticks at the moment pause() was called, or -1 if not paused.
     * Stored in speed-scaled units to match what the client receives in the catch-up payload.
     */
    private long pausedAtScaledTicks = -1L;

    public AnimationEntry(int entityId, AnimationCategory category, String animId,
                          long startTick, String filePath, float playbackSpeed,
                          int lookAtMask, int vanillaMask, int vanillaMoveMask) {
        this.entityId        = entityId;
        this.category        = category;
        this.animId          = animId;
        this.startTick       = startTick;
        this.filePath        = filePath;
        this.playbackSpeed   = playbackSpeed;
        this.lookAtMask      = lookAtMask;
        this.vanillaMask     = vanillaMask;
        this.vanillaMoveMask = vanillaMoveMask;
    }

    /**
     * Returns how many speed-scaled ticks have elapsed.
     * While paused this returns the frozen value; otherwise it computes live.
     */
    public long elapsedTicks(long currentTick) {
        if (pausedAtScaledTicks >= 0) return pausedAtScaledTicks;
        return Math.max(0L, (long)((currentTick - startTick) * playbackSpeed));
    }

    /** Freezes playback at the current elapsed position. */
    public void pause(long currentTick) {
        if (pausedAtScaledTicks < 0)
            pausedAtScaledTicks = elapsedTicks(currentTick);
    }

    /**
     * Resumes playback from the frozen position.
     * Returns the frozen progress in speed-scaled ticks so the caller can
     * check whether the animation has already expired.
     */
    public long resume(long currentTick) {
        long frozen = pausedAtScaledTicks;
        pausedAtScaledTicks = -1L;
        return frozen;
    }

    public boolean isPaused() { return pausedAtScaledTicks >= 0; }

    public int               entityId()          { return entityId;          }
    public AnimationCategory category()           { return category;          }
    public String            animId()             { return animId;            }
    public long              startTick()          { return startTick;         }
    public String            filePath()           { return filePath;          }
    public float             playbackSpeed()      { return playbackSpeed;     }
    public int               lookAtMask()         { return lookAtMask;        }
    public int               vanillaMask()        { return vanillaMask;       }
    public int               vanillaMoveMask()    { return vanillaMoveMask;   }
    public long              pausedAtScaledTicks(){ return pausedAtScaledTicks; }
}
