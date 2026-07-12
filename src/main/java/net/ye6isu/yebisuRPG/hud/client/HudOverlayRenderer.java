package net.ye6isu.yebisuRPG.hud.client;

import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.LayeredDraw;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.packs.resources.ResourceManagerReloadListener;
import net.minecraft.server.packs.resources.ResourceManager;
import net.minecraft.world.entity.player.Player;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.hud.HudWidget;
import net.ye6isu.yebisuRPG.texture.FrameLoopMode;
import net.ye6isu.yebisuRPG.texture.TextureFrameClock;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Renders every YCS-authored HUD layout as a single {@link LayeredDraw.Layer}, registered
 * above all vanilla layers via {@code RegisterGuiLayersEvent.registerAboveAll}. Layouts are
 * loaded lazily (and cached) from {@code assets/yebisurpg/hud/*.json} — layout/position/
 * texture data needs no rebuild to change, but each widget's bound *value* comes from a
 * compiled method in {@link HudValueSources} (see that class for why).
 */
@OnlyIn(Dist.CLIENT)
public final class HudOverlayRenderer implements LayeredDraw.Layer {

    private static final List<String> LAYOUT_NAMES = new ArrayList<>();
    // Layout name -> HudBoolSources id gating the WHOLE layout ("" = no link, use the literal
    // fallback below instead). Populated by YCS-injected registration code alongside
    // registerLayout, one entry per layout.
    private static final Map<String, String> LAYOUT_VISIBILITY = new LinkedHashMap<>();
    // Layout name -> literal visibility fallback, used only when LAYOUT_VISIBILITY has no link.
    private static final Map<String, Boolean> LAYOUT_VISIBILITY_LITERAL = new LinkedHashMap<>();
    private static Map<String, List<HudWidget>> cachedWidgetsByLayout = null;
    // Bar widgets can optionally smooth their fill toward the target value instead of
    // snapping instantly — keyed by valueSourceId (unique per bound widget) since HudWidget
    // itself is re-parsed fresh from JSON every reload and has no other stable identity.
    private static final Map<String, Double> BAR_DISPLAY_FRAC = new HashMap<>();

    /** Called once per declared HUD layout by YCS-injected registration code. */
    public static void registerLayout(String name) {
        LAYOUT_NAMES.add(name);
        cachedWidgetsByLayout = null;
    }

    /** Called once per declared HUD layout (alongside registerLayout) if it has a visibility gate or literal. */
    public static void registerLayoutVisibility(String name, String visibleSourceId, boolean visibleLiteral) {
        LAYOUT_VISIBILITY.put(name, visibleSourceId);
        LAYOUT_VISIBILITY_LITERAL.put(name, visibleLiteral);
        cachedWidgetsByLayout = null;
    }

    public static void invalidateCache() {
        cachedWidgetsByLayout = null;
    }

    /**
     * Widgets were previously only re-parsed once at mod init, so re-saving a layout in YCS
     * and reloading resources in-game (F3+T / {@code /reload}) without a full client restart
     * would keep rendering the stale ordering/positions. Registered as a resource reload
     * listener so every reload re-reads each layout's current JSON.
     */
    public static ResourceManagerReloadListener reloadListener() {
        return (ResourceManager manager) -> invalidateCache();
    }

    private static Map<String, List<HudWidget>> widgetsByLayout() {
        if (cachedWidgetsByLayout == null) {
            Map<String, List<HudWidget>> byLayout = new LinkedHashMap<>();
            for (String name : LAYOUT_NAMES) byLayout.put(name, HudLayoutLoader.load(name));
            cachedWidgetsByLayout = byLayout;
        }
        return cachedWidgetsByLayout;
    }

    @Override
    public void render(GuiGraphics graphics, DeltaTracker deltaTracker) {
        Minecraft mc = Minecraft.getInstance();
        Player player = mc.player;
        if (player == null || mc.options.hideGui) return;

        int screenWidth = graphics.guiWidth();
        int screenHeight = graphics.guiHeight();
        long tick = player.level().getGameTime();

        for (Map.Entry<String, List<HudWidget>> entry : widgetsByLayout().entrySet()) {
            String layoutVisSourceId = LAYOUT_VISIBILITY.get(entry.getKey());
            boolean layoutVisLiteral = LAYOUT_VISIBILITY_LITERAL.getOrDefault(entry.getKey(), true);
            if (!resolveVisible(layoutVisSourceId, player, layoutVisLiteral)) continue;

            List<HudWidget> layoutWidgets = entry.getValue();
            for (HudWidget widget : layoutWidgets) {
                if (!resolveVisible(widget.visibleSourceId(), player, widget.visibleLiteral())) continue;
                int[] pos = resolveRect(widget, layoutWidgets, screenWidth, screenHeight, new HashSet<>());
                int x = pos[0], y = pos[1];
                switch (widget.type()) {
                    case BAR -> renderBar(graphics, widget, player, x, y, tick);
                    case TEXT -> renderText(graphics, widget, player, x, y);
                    case ICON -> renderIcon(graphics, widget, player, x, y, tick);
                }
            }
        }
    }

    private static boolean resolveVisible(String sourceId, Player player, boolean fallback) {
        if (sourceId == null || sourceId.isEmpty()) return fallback;
        return HudBoolSources.resolve(sourceId, player);
    }

    /** Applies the 9-anchor math against an arbitrary container rect (canvas or another widget's rect). */
    private static int[] anchorOrigin(HudWidget.Anchor anchor, int containerX, int containerY, int containerW, int containerH, int width, int height) {
        int ox = containerX, oy = containerY;
        switch (anchor) {
            case TOP_CENTER -> ox = containerX + containerW / 2 - width / 2;
            case TOP_RIGHT -> ox = containerX + containerW - width;
            case CENTER_LEFT -> oy = containerY + containerH / 2 - height / 2;
            case CENTER -> { ox = containerX + containerW / 2 - width / 2; oy = containerY + containerH / 2 - height / 2; }
            case CENTER_RIGHT -> { ox = containerX + containerW - width; oy = containerY + containerH / 2 - height / 2; }
            case BOTTOM_LEFT -> oy = containerY + containerH - height;
            case BOTTOM_CENTER -> { ox = containerX + containerW / 2 - width / 2; oy = containerY + containerH - height; }
            case BOTTOM_RIGHT -> { ox = containerX + containerW - width; oy = containerY + containerH - height; }
            case TOP_LEFT -> {}
        }
        return new int[]{ox, oy};
    }

    /**
     * Resolves a widget's absolute screen position {@code {x, y}}, following anchorTarget
     * chains (widget-relative anchoring, set in YCS's "Anchor To" field) when present —
     * mirrors HudLanding.jsx's resolveWidgetRect exactly so the editor preview and in-game
     * render agree. Guards against cycles (A anchored to B anchored back to A) by tracking
     * visited ids and falling back to the canvas if one is hit.
     */
    private static int[] resolveRect(HudWidget w, List<HudWidget> layoutWidgets, int screenWidth, int screenHeight, Set<String> visiting) {
        int containerX = 0, containerY = 0, containerW = screenWidth, containerH = screenHeight;
        if (w.anchorTarget() != null && !w.anchorTarget().isEmpty() && !visiting.contains(w.anchorTarget())) {
            HudWidget target = layoutWidgets.stream().filter(o -> w.anchorTarget().equals(o.id())).findFirst().orElse(null);
            if (target != null) {
                Set<String> nextVisiting = new HashSet<>(visiting);
                if (w.id() != null) nextVisiting.add(w.id());
                int[] targetPos = resolveRect(target, layoutWidgets, screenWidth, screenHeight, nextVisiting);
                containerX = targetPos[0];
                containerY = targetPos[1];
                containerW = target.width();
                containerH = target.height();
            }
        }
        int[] origin = anchorOrigin(w.anchor(), containerX, containerY, containerW, containerH, w.width(), w.height());
        return new int[]{origin[0] + w.x(), origin[1] + w.y()};
    }

    private static double resolveSource(String sourceId, Player player, double fallback) {
        if (sourceId == null || sourceId.isEmpty()) return fallback;
        return HudValueSources.resolve(sourceId, player);
    }

    /**
     * Eases a bar's displayed fill fraction toward {@code target} instead of snapping
     * instantly — {@code strength} is a 0..1 per-frame catch-up rate (0 = never moves,
     * 1 = instant/no smoothing, ~0.1-0.3 reads as a gentle "chip damage" style catch-up).
     */
    private static double smoothedFrac(String key, double target, double strength) {
        double s = Math.max(0.0, Math.min(1.0, strength));
        double prev = BAR_DISPLAY_FRAC.getOrDefault(key, target);
        double next = prev + (target - prev) * s;
        if (Math.abs(next - target) < 0.0005) next = target;
        BAR_DISPLAY_FRAC.put(key, next);
        return next;
    }

    /**
     * Resolves which Multi-State entry is active (clamped into range), or {@code null} if
     * Multi-State isn't enabled or has no states defined — the caller falls back to the
     * widget's own base texture fields in that case. Index 0 is "the first state".
     */
    private static HudWidget.StateEntry currentState(HudWidget w, Player player) {
        if (!w.multiState() || w.states().isEmpty()) return null;
        double idx = resolveSource(w.stateSourceId(), player, w.stateLiteral());
        int i = Math.max(0, Math.min(w.states().size() - 1, (int) Math.round(idx)));
        return w.states().get(i);
    }

    private static void renderBar(GuiGraphics g, HudWidget w, Player player, int x, int y, long tick) {
        double value = resolveSource(w.valueSourceId(), player, w.valueLiteral());
        double max = resolveSource(w.maxSourceId(), player, w.maxLiteral());
        if (max <= 0) max = 1.0;
        double targetFrac = Math.max(0.0, Math.min(1.0, value / max));
        double frac = w.fillLerpEnabled() && w.valueSourceId() != null && !w.valueSourceId().isEmpty()
                ? smoothedFrac(w.valueSourceId(), targetFrac, w.fillLerpStrength())
                : targetFrac;
        int filledWidth = (int) Math.round(w.width() * frac);

        HudWidget.StateEntry state = currentState(w, player);
        HudWidget.TextureRef barEmpty = state != null ? state.barEmpty() : w.barEmpty();
        HudWidget.TextureRef barFilled = state != null ? state.barFilled() : w.barFilled();

        if (barEmpty.isSet()) {
            drawTexture(g, barEmpty, player, x, y, w.width(), w.height(), tick);
        } else {
            g.fill(x, y, x + w.width(), y + w.height(), 0xFF202020);
        }

        if (filledWidth <= 0) return;
        if (barFilled.isSet()) {
            drawTextureClipped(g, barFilled, player, x, y, w.width(), w.height(), filledWidth, tick);
        } else {
            g.fill(x, y, x + filledWidth, y + w.height(), w.color());
        }
    }

    private static void renderText(GuiGraphics g, HudWidget w, Player player, int x, int y) {
        String text;
        if (w.textMode()) {
            text = HudTextSources.resolve(w.textSourceId(), player, w.textLiteral() != null ? w.textLiteral() : "");
        } else {
            double value = resolveSource(w.valueSourceId(), player, w.valueLiteral());
            text = String.valueOf((long) value == value ? (long) value : value);
        }

        double scale = w.textFontScale() > 0 ? w.textFontScale() : 1.0;
        var font = Minecraft.getInstance().font;
        int scaledTextWidth = (int) Math.round(font.width(text) * scale);
        int scaledTextHeight = (int) Math.round(font.lineHeight * scale);

        // Full 9-way alignment (both axes) within the widget's OWN width/height box, reusing
        // the same anchor math the box-position system uses — but here the "container" IS the
        // widget's own box (at x,y) and the thing being positioned is the text's own measured
        // size, entirely independent of whatever anchor/anchorTarget placed the box on screen.
        int[] origin = anchorOrigin(w.textAlign(), x, y, w.width(), w.height(), scaledTextWidth, scaledTextHeight);
        int alignedX = origin[0], alignedY = origin[1];

        if (scale == 1.0) {
            g.drawString(font, text, alignedX, alignedY, w.color(), true);
            return;
        }
        g.pose().pushPose();
        g.pose().translate(alignedX, alignedY, 0);
        g.pose().scale((float) scale, (float) scale, 1f);
        g.drawString(font, text, 0, 0, w.color(), true);
        g.pose().popPose();
    }

    private static void renderIcon(GuiGraphics g, HudWidget w, Player player, int x, int y, long tick) {
        HudWidget.StateEntry state = currentState(w, player);
        HudWidget.TextureRef icon = state != null ? state.icon() : w.icon();
        if (!icon.isSet()) return;
        drawTexture(g, icon, player, x, y, w.width(), w.height(), tick);
    }

    /** Draws a (possibly animated spritesheet) texture ref fully within its widget box. */
    private static void drawTexture(GuiGraphics g, HudWidget.TextureRef ref, Player player, int x, int y, int width, int height, long tick) {
        ResourceLocation loc = ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "textures/hud/" + ref.id() + ".png");
        int frame = currentFrame(ref, player, tick);
        int frameHeight = height;
        int textureHeight = frameHeight * ref.rows();
        g.blit(loc, x, y, width, height, 0f, frame * frameHeight, width, frameHeight, width, textureHeight);
    }

    /** Draws only the left {@code clipWidth} pixels of a texture ref — used for a bar's filled portion. */
    private static void drawTextureClipped(GuiGraphics g, HudWidget.TextureRef ref, Player player, int x, int y, int width, int height, int clipWidth, long tick) {
        ResourceLocation loc = ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "textures/hud/" + ref.id() + ".png");
        int frame = currentFrame(ref, player, tick);
        int frameHeight = height;
        int textureHeight = frameHeight * ref.rows();
        g.enableScissor(x, y, x + clipWidth, y + height);
        g.blit(loc, x, y, width, height, 0f, frame * frameHeight, width, frameHeight, width, textureHeight);
        g.disableScissor();
    }

    /**
     * Picks which spritesheet row to draw. If not animated, a bound frame link/literal picks
     * one exact static frame (falling back to the texture's own defaultFrame if unbound); if
     * animated, a bound link/literal instead overrides ticksPerFrame (the cycling speed) —
     * both read through HudValueSources the same way Value/Max do, via frameSourceId.
     */
    private static int currentFrame(HudWidget.TextureRef ref, Player player, long tick) {
        if (ref.rows() <= 1) return 0;
        if (!ref.animatedOnUse()) {
            double frame = resolveSource(ref.frameSourceId(), player, ref.frameLiteral());
            return Math.max(0, Math.min(ref.rows() - 1, (int) Math.round(frame)));
        }
        double ticksPerFrame = resolveSource(ref.frameSourceId(), player, ref.frameLiteral());
        return TextureFrameClock.frameAt(tick, Math.max(1, (int) Math.round(ticksPerFrame)), ref.rows(), FrameLoopMode.LOOP);
    }
}
