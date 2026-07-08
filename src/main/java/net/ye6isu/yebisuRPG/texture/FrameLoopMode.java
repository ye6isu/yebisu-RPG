package net.ye6isu.yebisuRPG.texture;

/**
 * How a tick-driven spritesheet animation behaves when it reaches the end of its frames.
 * Shared vocabulary with the bone-animation system's loop mode, kept as its own
 * enum here since texture frame playback has no dependency on that engine.
 */
public enum FrameLoopMode {
    /** Play once then stop, holding on the last frame. */
    PLAY_ONCE,
    /** Freeze on the last frame indefinitely (same visual result as PLAY_ONCE, kept distinct for clarity/intent). */
    HOLD_LAST,
    /** Restart from frame 0 and loop indefinitely. */
    LOOP;

    /** Parses the Blockbench/Bedrock {@code "loop"} field value. */
    public static FrameLoopMode from(String s) {
        if (s == null) return PLAY_ONCE;
        return switch (s.toLowerCase(java.util.Locale.ROOT)) {
            case "hold", "hold_on_last_frame" -> HOLD_LAST;
            case "loop", "true" -> LOOP;
            case "once", "false", "play_once" -> PLAY_ONCE;
            default -> PLAY_ONCE;
        };
    }

    /** Single canonical wire encoding — use this everywhere instead of {@code ordinal()}. */
    public byte toByte() {
        return switch (this) {
            case PLAY_ONCE -> 0;
            case HOLD_LAST -> 1;
            case LOOP -> 2;
        };
    }

    /** Inverse of {@link #toByte()}. */
    public static FrameLoopMode fromByte(byte b) {
        return switch (b) {
            case 1 -> HOLD_LAST;
            case 2 -> LOOP;
            default -> PLAY_ONCE;
        };
    }
}
