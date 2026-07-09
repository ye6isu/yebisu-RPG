package net.ye6isu.yebisuRPG.animation;

/**
 * How an animation behaves when it reaches the end of its timeline.
 * Shared between server (API/network) and client (renderer/engine).
 */
public enum AnimationLoopMode {
    /** Play once then stop (default). */
    PLAY_ONCE,
    /** Freeze on the last frame indefinitely. */
    HOLD_LAST,
    /** Restart from the beginning and loop indefinitely. */
    LOOP;

    /** Parses the Blockbench/Bedrock {@code "loop"} field value. */
    public static AnimationLoopMode from(String s) {
        if (s == null) return PLAY_ONCE;
        return switch (s.toLowerCase(java.util.Locale.ROOT)) {
            case "hold", "hold_on_last_frame" -> HOLD_LAST;
            case "loop", "true"               -> LOOP;
            case "once", "false", "play_once" -> PLAY_ONCE;
            default                           -> PLAY_ONCE;
        };
    }
}
