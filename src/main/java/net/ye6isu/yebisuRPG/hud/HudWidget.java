package net.ye6isu.yebisuRPG.hud;

/**
 * A single HUD widget parsed from a YCS-authored HUD layout JSON
 * ({@code assets/yebisurpg/hud/<name>.json}). One layout file may declare many widgets;
 * each is independently positioned/anchored and independently data-bound.
 */
public record HudWidget(
        String id,
        Type type,
        Anchor anchor,
        String anchorTarget,
        int x,
        int y,
        int width,
        int height,
        int color,
        String valueSourceId,
        String maxSourceId,
        String visibleSourceId,
        String textSourceId,
        boolean textMode,
        double valueLiteral,
        double maxLiteral,
        boolean visibleLiteral,
        String textLiteral,
        boolean fillLerpEnabled,
        double fillLerpStrength,
        double textFontScale,
        Anchor textAlign,
        TextureRef icon,
        TextureRef barFilled,
        TextureRef barEmpty,
        boolean multiState,
        String stateSourceId,
        double stateLiteral,
        java.util.List<StateEntry> states
) {
    public enum Type { BAR, TEXT, ICON }

    /**
     * One entry in a Multi-State widget's {@link #states} list — a fully independent set of
     * textures (Bar's filled/empty, Icon's icon) selected as a whole by the widget's resolved
     * state index, so each state can look completely different (e.g. a bar animating between
     * "calm"/"charging"/"overheated" fill textures). Text widgets don't support Multi-State.
     */
    public record StateEntry(TextureRef icon, TextureRef barFilled, TextureRef barEmpty) {}

    /**
     * Which screen corner/edge x/y are relative to (widget box position) — also reused for
     * {@link #textAlign} (a Text widget's 9-way text alignment within its OWN width/height
     * box), which is an entirely independent, free-standing concern computed purely from that
     * box's own size, regardless of whatever the box itself is anchored to.
     */
    public enum Anchor {
        TOP_LEFT, TOP_CENTER, TOP_RIGHT,
        CENTER_LEFT, CENTER, CENTER_RIGHT,
        BOTTOM_LEFT, BOTTOM_CENTER, BOTTOM_RIGHT
    }

    /**
     * A texture pulled from the shared YCS texture pool, copied to
     * {@code assets/yebisurpg/textures/hud/<id>.png} at Save time — carries the same
     * spritesheet/animation metadata items use (rows/animatedOnUse/ticksPerFrame), so a
     * bar-fill or icon texture can be an animated spritesheet exactly like an item texture.
     */
    public record TextureRef(String id, int rows, boolean animatedOnUse, int ticksPerFrame, int defaultFrame,
                              String frameSourceId, double frameLiteral) {
        public static final TextureRef NONE = new TextureRef("", 1, false, 4, 0, "", 0);
        public boolean isSet() { return id != null && !id.isEmpty(); }
    }
}
