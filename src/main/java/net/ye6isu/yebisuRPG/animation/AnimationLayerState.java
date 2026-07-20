package net.ye6isu.yebisuRPG.animation;

/**
 * Side-neutral snapshot of one active animation layer.
 *
 * @param animId animation name inside the source file
 * @param filePath explicit source file, or null/empty to use the entity's file
 * @param timeSecs current speed-scaled playhead position in seconds
 */
public record AnimationLayerState(String animId, String filePath, float timeSecs) {}
