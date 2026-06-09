package net.ye6isu.yebisuRPG.animation;

/**
 * Immutable snapshot of one active animation slot on the server.
 *
 * Stored in AnimationRegistry as:
 *   Map<entityId, EnumMap<AnimationCategory, AnimationEntry>>
 *
 * Not persisted to NBT — animation state is transient. On server restart all
 * entities return to their default pose naturally.
 *
 * @param entityId   entity.getId() — matches the value sent over the wire
 * @param category   which render pathway this entry drives
 * @param animId     key matching the Blockbench export filename (e.g. "attack_slash")
 * @param startTick  level.getGameTime() captured at the moment triggerAnimation() was called;
 *                   used to compute the progress delta for late-joiner catch-up
 */
public record AnimationEntry(
        int entityId,
        AnimationCategory category,
        String animId,
        long startTick
) {
    /**
     * Computes how many ticks have elapsed since this animation started.
     * Used by AnimationEventHooks to locate the current hurtbox window and
     * by the pairing hook to build the late-joiner progress delta payload.
     *
     * @param currentTick  level.getGameTime() at the moment of the query
     * @return elapsed ticks, clamped to zero if somehow called before startTick
     */
    public long elapsedTicks(long currentTick) {
        return Math.max(0L, currentTick - startTick);
    }
}
