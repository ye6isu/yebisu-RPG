package net.ye6isu.yebisuRPG.hud.client;

import com.mojang.blaze3d.systems.RenderSystem;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.LayeredDraw;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.packs.resources.ResourceManagerReloadListener;
import net.minecraft.server.packs.resources.ResourceManager;
import net.minecraft.util.Mth;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.GameType;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.hud.HudWidget;
import net.ye6isu.yebisuRPG.keybind.AbilityDefinition;
import net.ye6isu.yebisuRPG.keybind.AbilityRegistry;
import net.ye6isu.yebisuRPG.keybind.PlayerAbilities;
import net.ye6isu.yebisuRPG.keybind.client.AbilityBarClientState;
import net.ye6isu.yebisuRPG.resource.PlayerResourceDefinition;
import net.ye6isu.yebisuRPG.resource.PlayerResourceRegistry;
import net.ye6isu.yebisuRPG.texture.FrameLoopMode;
import net.ye6isu.yebisuRPG.texture.TextureFrameClock;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
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
    private static final int RESOURCE_ICON_SIZE = 9;
    private static final int RESOURCE_GAP = 2;
    private static final int RESOURCE_ROW_SPACING = RESOURCE_ICON_SIZE + RESOURCE_GAP;
    private static final int HOTBAR_HALF_WIDTH = 91;
    private static final int VANILLA_HEALTH_BOTTOM_OFFSET = 39;
    // Bar widgets can optionally smooth their fill toward the target value instead of
    // snapping instantly — keyed by valueSourceId (unique per bound widget) since HudWidget
    // itself is re-parsed fresh from JSON every reload and has no other stable identity.
    private static final Map<String, Double> BAR_DISPLAY_FRAC = new HashMap<>();
    private final boolean resourceOnly;

    public HudOverlayRenderer() {
        this(false);
    }

    private HudOverlayRenderer(boolean resourceOnly) {
        this.resourceOnly = resourceOnly;
    }

    public static HudOverlayRenderer resourceOnly() {
        return new HudOverlayRenderer(true);
    }

    public static boolean isResourceHudActive() {
        Minecraft mc = Minecraft.getInstance();
        return mc.player != null
                && mc.gameMode != null
                && (mc.gameMode.getPlayerMode() == GameType.SURVIVAL
                || mc.gameMode.getPlayerMode() == GameType.CREATIVE);
    }

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
        if (resourceOnly && !isResourceHudActive()) return;

        int screenWidth = graphics.guiWidth();
        int screenHeight = graphics.guiHeight();
        long tick = player.level().getGameTime();

        for (Map.Entry<String, List<HudWidget>> entry : widgetsByLayout().entrySet()) {
            boolean isResourceLayout = "resource".equals(entry.getKey());
            if (resourceOnly != isResourceLayout) continue;
            if ("alt_ability".equals(entry.getKey()) && !AbilityBarClientState.isAltBarActive()) continue;
            String layoutVisSourceId = LAYOUT_VISIBILITY.get(entry.getKey());
            boolean layoutVisLiteral = LAYOUT_VISIBILITY_LITERAL.getOrDefault(entry.getKey(), true);
            if (!resolveVisible(layoutVisSourceId, player, layoutVisLiteral)) continue;
            if (isResourceLayout) {
                renderResourceHud(graphics, player, screenWidth, screenHeight);
                continue;
            }

            List<HudWidget> layoutWidgets = entry.getValue();
            for (HudWidget widget : layoutWidgets) {
                int abilitySlot = abilitySlotForWidget(widget);
                if (abilitySlot > 0) {
                    String abilityId = isAltAbilityWidget(widget)
                            ? PlayerAbilities.getAltSlot(player, abilitySlot)
                            : PlayerAbilities.getEffectiveSlot(player, abilitySlot);
                    if (abilityId.isBlank()) continue;
                }
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

    private static void renderResourceHud(GuiGraphics g, Player player, int screenWidth, int screenHeight) {
        int healthX = screenWidth / 2 - HOTBAR_HALF_WIDTH;
        int healthY = screenHeight - VANILLA_HEALTH_BOTTOM_OFFSET;
        renderResourceHeart(g, player, healthX, healthY);

        int resourceX = screenWidth / 2 + HOTBAR_HALF_WIDTH + RESOURCE_GAP;
        int resourceBottomY = screenHeight - RESOURCE_ICON_SIZE - RESOURCE_GAP;
        int row = 0;
        for (PlayerResourceDefinition resource : PlayerResourceRegistry.all()) {
            renderResourceValue(g, player, resource, resourceX, resourceBottomY - row * RESOURCE_ROW_SPACING);
            row++;
        }
    }

    private static void renderResourceHeart(GuiGraphics g, Player player, int x, int y) {
        boolean blink = isHeartBlinking(player);
        boolean hardcore = player.level().getLevelData().isHardcore();

        String containerTexture = "heart_container"
                + (hardcore ? "_hardcore" : "")
                + (blink ? "_blinking" : "");
        drawResourceHeartTexture(g, containerTexture, x, y);

        float maxHealth = Math.max(1.0F, player.getMaxHealth());
        int filledWidth = (int) Math.ceil(RESOURCE_ICON_SIZE * Math.max(0.0F, Math.min(1.0F, player.getHealth() / maxHealth)));
        if (filledWidth > 0) {
            drawResourceHeartTextureClipped(g, resourceHeartTexture(player, hardcore, blink), x, y, filledWidth);
        }

        String healthText = formatResourceHealth(player.getHealth()) + "/" + formatResourceHealth(maxHealth);
        drawResourceText(g, healthText, x, y);
    }

    private static void renderResourceValue(GuiGraphics g, Player player, PlayerResourceDefinition resource, int x, int y) {
        double current = resource.current(player);
        double maximum = resource.maximum(player);
        double fraction = maximum > 0.0 ? Math.max(0.0, Math.min(1.0, current / maximum)) : 0.0;

        drawResourceTexture(g, resource.emptyTexture(), resource.emptyTextureWidth(), resource.emptyTextureHeight(), x, y);
        int filledWidth = (int) Math.ceil(RESOURCE_ICON_SIZE * fraction);
        if (filledWidth > 0) {
            drawResourceTextureClipped(g, resource.filledTexture(), resource.filledTextureWidth(), resource.filledTextureHeight(), x, y, filledWidth);
        }

        drawResourceText(g, formatResourceNumber(current) + "/" + formatResourceNumber(maximum), x, y);
    }

    private static void drawResourceText(GuiGraphics g, String text, int iconX, int iconY) {
        g.drawString(Minecraft.getInstance().font, text, iconX + RESOURCE_ICON_SIZE + RESOURCE_GAP, iconY + 1, 0xFFFFFFFF, true);
    }

    private static boolean isHeartBlinking(Player player) {
        int blinkTicks = Math.max(player.hurtTime, player.invulnerableTime);
        return blinkTicks > 0 && (blinkTicks / 3) % 2 == 1;
    }

    private static String resourceHeartTexture(Player player, boolean hardcore, boolean blink) {
        String state = player.hasEffect(MobEffects.POISON) ? "poisoned"
                : player.hasEffect(MobEffects.WITHER) ? "withered"
                : player.isFullyFrozen() ? "frozen"
                : "";
        String texture = state.isEmpty()
                ? (hardcore ? "hardcore_full" : "full")
                : state + (hardcore ? "_hardcore" : "") + "_full";
        return "heart_" + texture + (blink ? "_blinking" : "");
    }

    private static String formatResourceHealth(float value) {
        return formatResourceNumber(Math.max(0.0F, value));
    }

    private static String formatResourceNumber(double value) {
        double clamped = Math.max(0.0, value);
        if (clamped < 1.0 && clamped > 0.0) return String.format(Locale.ROOT, "%.1f", clamped);
        return String.valueOf(Mth.ceil(clamped));
    }

    private static void drawResourceHeartTexture(GuiGraphics g, String textureId, int x, int y) {
        drawResourceTexture(g, textureId, RESOURCE_ICON_SIZE, RESOURCE_ICON_SIZE, x, y);
    }

    private static void drawResourceHeartTextureClipped(GuiGraphics g, String textureId, int x, int y, int clipWidth) {
        drawResourceTextureClipped(g, textureId, RESOURCE_ICON_SIZE, RESOURCE_ICON_SIZE, x, y, clipWidth);
    }

    private static void drawResourceTexture(GuiGraphics g, String textureId, int sourceWidth, int sourceHeight, int x, int y) {
        ResourceLocation loc = ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "textures/hud/" + textureId + ".png");
        RenderSystem.enableBlend();
        RenderSystem.defaultBlendFunc();
        g.blit(loc, x, y, RESOURCE_ICON_SIZE, RESOURCE_ICON_SIZE, 0f, 0f,
                sourceWidth, sourceHeight, sourceWidth, sourceHeight);
    }

    private static void drawResourceTextureClipped(GuiGraphics g, String textureId, int sourceWidth, int sourceHeight, int x, int y, int clipWidth) {
        if (clipWidth >= RESOURCE_ICON_SIZE) {
            drawResourceTexture(g, textureId, sourceWidth, sourceHeight, x, y);
            return;
        }
        g.enableScissor(x, y, x + clipWidth, y + RESOURCE_ICON_SIZE);
        drawResourceTexture(g, textureId, sourceWidth, sourceHeight, x, y);
        g.disableScissor();
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
        int abilityCooldownSlot = abilityCooldownSlotForWidget(w);
        if (abilityCooldownSlot > 0) {
            long remainingTicks = PlayerAbilities.cooldownRemainingTicks(player, abilityCooldownSlot);
            if (isAltAbilityWidget(w)) {
                remainingTicks = PlayerAbilities.cooldownRemainingTicks(player, PlayerAbilities.getAltSlot(player, abilityCooldownSlot));
            }
            if (remainingTicks <= 0) return;
            double remainingSeconds = remainingTicks / 20.0;
            text = remainingSeconds < 1.0
                    ? String.format(Locale.ROOT, "%.1f", remainingSeconds)
                    : String.valueOf((long) Math.ceil(remainingSeconds));
        } else if (w.textMode()) {
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
        HudWidget.TextureRef icon = abilityIconForWidget(w, player);
        if (icon == null) icon = state != null ? state.icon() : w.icon();
        if (!icon.isSet()) return;
        int abilitySlot = abilityIconSlotForWidget(w);
        long remaining = isAltAbilityWidget(w)
                ? PlayerAbilities.cooldownRemainingTicks(player, PlayerAbilities.getAltSlot(player, abilitySlot))
                : PlayerAbilities.cooldownRemainingTicks(player, abilitySlot);
        float alpha = abilitySlot > 0 && remaining > 0 ? 0.5f : 1.0f;
        drawTexture(g, icon, player, x, y, w.width(), w.height(), tick, alpha);
    }

    private static HudWidget.TextureRef abilityIconForWidget(HudWidget widget, Player player) {
        int slot = abilityIconSlotForWidget(widget);
        if (slot <= 0) return null;
        String abilityId = isAltAbilityWidget(widget)
                ? PlayerAbilities.getAltSlot(player, slot)
                : PlayerAbilities.getEffectiveSlot(player, slot);
        AbilityDefinition ability = AbilityRegistry.get(abilityId);
        if (ability == null || ability.icon().isBlank()) return HudWidget.TextureRef.NONE;
        return new HudWidget.TextureRef(ability.icon(), 1, false, 4, 0, "", 0);
    }

    private static int abilitySlotForWidget(HudWidget widget) {
        int iconSlot = abilityIconSlotForWidget(widget);
        return iconSlot > 0 ? iconSlot : abilityCooldownSlotForWidget(widget);
    }

    private static int abilityIconSlotForWidget(HudWidget widget) {
        String name = widget.name();
        if (name == null) return 0;
        if (name.startsWith("Alt Ability ")) {
            if (name.contains("Cooldown") || name.contains("Frame")) return 0;
            return parseTrailingSlot(name.substring("Alt Ability ".length()), 9);
        }
        if (!name.startsWith("Ability ")) return 0;
        if (name.contains("Cooldown") || name.contains("Frame")) return 0;
        return parseTrailingSlot(name.substring("Ability ".length()), 6);
    }

    private static int abilityCooldownSlotForWidget(HudWidget widget) {
        String name = widget.name();
        if (name == null || !name.endsWith(" Cooldown")) return 0;
        if (name.startsWith("Alt Ability ")) {
            String slotText = name.substring("Alt Ability ".length(), name.length() - " Cooldown".length());
            return parseTrailingSlot(slotText, 9);
        }
        if (!name.startsWith("Ability ")) return 0;
        String slotText = name.substring("Ability ".length(), name.length() - " Cooldown".length());
        return parseTrailingSlot(slotText, 6);
    }

    private static boolean isAltAbilityWidget(HudWidget widget) {
        String name = widget.name();
        return name != null && name.startsWith("Alt Ability ");
    }

    private static int parseTrailingSlot(String text, int maxSlot) {
        try {
            int slot = Integer.parseInt(text.trim());
            return slot >= 1 && slot <= maxSlot ? slot : 0;
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    /** Draws a (possibly animated spritesheet) texture ref fully within its widget box. */
    private static void drawTexture(GuiGraphics g, HudWidget.TextureRef ref, Player player, int x, int y, int width, int height, long tick) {
        drawTexture(g, ref, player, x, y, width, height, tick, 1.0f);
    }

    private static void drawTexture(GuiGraphics g, HudWidget.TextureRef ref, Player player, int x, int y, int width, int height, long tick, float alpha) {
        ResourceLocation loc = ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "textures/hud/" + ref.id() + ".png");
        int frame = currentFrame(ref, player, tick);
        int frameHeight = height;
        int textureHeight = frameHeight * ref.rows();
        RenderSystem.enableBlend();
        RenderSystem.defaultBlendFunc();
        RenderSystem.setShaderColor(1.0f, 1.0f, 1.0f, alpha);
        g.setColor(1.0f, 1.0f, 1.0f, alpha);
        g.blit(loc, x, y, width, height, 0f, frame * frameHeight, width, frameHeight, width, textureHeight);
        g.setColor(1.0f, 1.0f, 1.0f, 1.0f);
        RenderSystem.setShaderColor(1.0f, 1.0f, 1.0f, 1.0f);
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
