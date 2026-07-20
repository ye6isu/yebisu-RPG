package net.ye6isu.yebisuRPG.hud.client;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.minecraft.client.Minecraft;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.packs.resources.Resource;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.hud.HudWidget;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Loads YCS-authored HUD layouts from {@code assets/yebisurpg/hud/<name>.json}. Only the
 * layout (positions/sizes/texture refs/which compiled value-source id each widget reads)
 * is read from JSON — the actual bound values themselves come from generated Java methods
 * in {@link HudValueSources}, not from anything in this file.
 */
@OnlyIn(Dist.CLIENT)
public final class HudLayoutLoader {

    private HudLayoutLoader() {}

    public static List<HudWidget> load(String name) {
        if ("alt_ability".equals(name)) return altAbilityWidgets();
        List<HudWidget> widgets = new ArrayList<>();
        ResourceLocation loc = ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "hud/" + name + ".json");
        try {
            Optional<Resource> res = Minecraft.getInstance().getResourceManager().getResource(loc);
            if (res.isEmpty()) return widgets;
            try (InputStream is = res.get().open()) {
                JsonArray arr = JsonParser.parseReader(new InputStreamReader(is, StandardCharsets.UTF_8)).getAsJsonArray();
                for (var el : arr) {
                    widgets.add(parseWidget(el.getAsJsonObject()));
                }
            }
        } catch (Exception e) {
            yebisuRPG.LOGGER.warn("[HudLayoutLoader] Failed to load hud/{}.json: {}", name, e.toString());
        }
        return widgets;
    }

    private static HudWidget parseWidget(JsonObject obj) {
        String id = obj.has("id") ? obj.get("id").getAsString() : "";
        String name = obj.has("name") ? obj.get("name").getAsString() : "";
        HudWidget.Type type = HudWidget.Type.valueOf(obj.get("type").getAsString().toUpperCase());
        HudWidget.Anchor anchor = obj.has("anchor")
                ? HudWidget.Anchor.valueOf(obj.get("anchor").getAsString().toUpperCase())
                : HudWidget.Anchor.TOP_LEFT;
        String anchorTarget = obj.has("anchorTarget") ? obj.get("anchorTarget").getAsString() : "";
        int x = obj.has("x") ? obj.get("x").getAsInt() : 0;
        int y = obj.has("y") ? obj.get("y").getAsInt() : 0;
        int width = obj.has("width") ? obj.get("width").getAsInt() : 80;
        int height = obj.has("height") ? obj.get("height").getAsInt() : 12;
        int color = obj.has("color") ? (int) Long.parseLong(obj.get("color").getAsString().replace("#", ""), 16) | 0xFF000000 : 0xFFFFFFFF;
        String valueSourceId = obj.has("valueSourceId") ? obj.get("valueSourceId").getAsString() : "";
        String maxSourceId = obj.has("maxSourceId") ? obj.get("maxSourceId").getAsString() : "";
        String visibleSourceId = obj.has("visibleSourceId") ? obj.get("visibleSourceId").getAsString() : "";
        String textSourceId = obj.has("textSourceId") ? obj.get("textSourceId").getAsString() : "";
        boolean textMode = obj.has("textMode") && "text".equals(obj.get("textMode").getAsString());
        double valueLiteral = parseLiteralDouble(obj, "valueLiteral", 0.0);
        double maxLiteral = parseLiteralDouble(obj, "maxLiteral", 100.0);
        boolean visibleLiteral = !obj.has("visibleLiteral") || obj.get("visibleLiteral").getAsBoolean();
        String textLiteral = obj.has("textLiteral") ? obj.get("textLiteral").getAsString() : "";
        boolean fillLerpEnabled = obj.has("fillLerpEnabled") && obj.get("fillLerpEnabled").getAsBoolean();
        double fillLerpStrength = obj.has("fillLerpStrength") ? obj.get("fillLerpStrength").getAsDouble() : 0.2;
        double textFontScale = obj.has("textFontScale") ? obj.get("textFontScale").getAsDouble() : 1.0;
        HudWidget.Anchor textAlign = obj.has("textAlign")
                ? HudWidget.Anchor.valueOf(obj.get("textAlign").getAsString().toUpperCase())
                : HudWidget.Anchor.TOP_LEFT;

        HudWidget.TextureRef icon = obj.has("icon") ? parseTextureRef(obj.getAsJsonObject("icon")) : HudWidget.TextureRef.NONE;
        HudWidget.TextureRef barFilled = obj.has("barFilled") ? parseTextureRef(obj.getAsJsonObject("barFilled")) : HudWidget.TextureRef.NONE;
        HudWidget.TextureRef barEmpty = obj.has("barEmpty") ? parseTextureRef(obj.getAsJsonObject("barEmpty")) : HudWidget.TextureRef.NONE;

        boolean multiState = obj.has("multiState") && obj.get("multiState").getAsBoolean();
        String stateSourceId = obj.has("stateSourceId") ? obj.get("stateSourceId").getAsString() : "";
        double stateLiteral = parseLiteralDouble(obj, "stateLiteral", 0.0);
        List<HudWidget.StateEntry> states = new ArrayList<>();
        if (obj.has("states")) {
            for (var el : obj.getAsJsonArray("states")) {
                JsonObject s = el.getAsJsonObject();
                HudWidget.TextureRef sIcon = s.has("icon") ? parseTextureRef(s.getAsJsonObject("icon")) : HudWidget.TextureRef.NONE;
                HudWidget.TextureRef sFilled = s.has("barFilled") ? parseTextureRef(s.getAsJsonObject("barFilled")) : HudWidget.TextureRef.NONE;
                HudWidget.TextureRef sEmpty = s.has("barEmpty") ? parseTextureRef(s.getAsJsonObject("barEmpty")) : HudWidget.TextureRef.NONE;
                states.add(new HudWidget.StateEntry(sIcon, sFilled, sEmpty));
            }
        }

        return new HudWidget(id, name, type, anchor, anchorTarget, x, y, width, height, color, valueSourceId, maxSourceId, visibleSourceId, textSourceId, textMode, valueLiteral, maxLiteral, visibleLiteral, textLiteral, fillLerpEnabled, fillLerpStrength, textFontScale, textAlign, icon, barFilled, barEmpty, multiState, stateSourceId, stateLiteral, states);
    }

    // valueLiteral/maxLiteral are typed as free-text strings in the YCS editor (a typeable
    // hardcode shortcut before opening the full Blocky graph), so parse defensively.
    private static double parseLiteralDouble(JsonObject obj, String key, double fallback) {
        if (!obj.has(key)) return fallback;
        try {
            return Double.parseDouble(obj.get(key).getAsString().trim());
        } catch (Exception e) {
            return fallback;
        }
    }

    private static HudWidget.TextureRef parseTextureRef(JsonObject obj) {
        String id = obj.has("id") ? obj.get("id").getAsString() : "";
        int rows = obj.has("rows") ? obj.get("rows").getAsInt() : 1;
        boolean animatedOnUse = obj.has("animatedOnUse") && obj.get("animatedOnUse").getAsBoolean();
        int ticksPerFrame = obj.has("ticksPerFrame") ? obj.get("ticksPerFrame").getAsInt() : 4;
        int defaultFrame = obj.has("defaultFrame") ? obj.get("defaultFrame").getAsInt() : 0;
        String frameSourceId = obj.has("frameSourceId") ? obj.get("frameSourceId").getAsString() : "";
        double frameLiteral = parseLiteralDouble(obj, "frameLiteral", 0.0);
        return new HudWidget.TextureRef(id, Math.max(1, rows), animatedOnUse, Math.max(1, ticksPerFrame), defaultFrame, frameSourceId, frameLiteral);
    }

    private static List<HudWidget> altAbilityWidgets() {
        List<HudWidget> widgets = new ArrayList<>();
        widgets.add(iconWidget("alt_bar", "Alt Ability Bar", HudWidget.Anchor.CENTER_RIGHT, "", 0, 0, 12, 212, texture("alt_ability_bar")));
        for (int i = 1; i <= 9; i++) {
            int y = -92 + (i - 1) * 23;
            String frameId = "alt_frame_" + i;
            String iconId = "alt_icon_" + i;
            widgets.add(iconWidget(frameId, "Alt Ability " + i + " Frame", HudWidget.Anchor.CENTER_RIGHT, "", -1, y, 22, 22, texture("ability_frame")));
            widgets.add(iconWidget(iconId, "Alt Ability " + i, HudWidget.Anchor.CENTER, frameId, 0, 0, 16, 16, texture("placehold_ability")));
            widgets.add(textWidget("alt_cd_" + i, "Alt Ability " + i + " Cooldown", iconId));
        }
        return widgets;
    }

    private static HudWidget iconWidget(String id, String name, HudWidget.Anchor anchor, String target, int x, int y, int width, int height, HudWidget.TextureRef icon) {
        return new HudWidget(
                id, name, HudWidget.Type.ICON, anchor, target, x, y, width, height, 0xFFFFFFFF,
                "", "", "", "", false, 0.0, 100.0, true, "", false, 0.2, 1.0, HudWidget.Anchor.CENTER,
                icon, HudWidget.TextureRef.NONE, HudWidget.TextureRef.NONE, false, "", 0.0, List.of());
    }

    private static HudWidget textWidget(String id, String name, String target) {
        return new HudWidget(
                id, name, HudWidget.Type.TEXT, HudWidget.Anchor.CENTER, target, 0, 0, 16, 16, 0xFFFFFFFF,
                "", "", "", "", false, 0.0, 100.0, true, "", false, 0.2, 1.0, HudWidget.Anchor.CENTER,
                HudWidget.TextureRef.NONE, HudWidget.TextureRef.NONE, HudWidget.TextureRef.NONE, false, "", 0.0, List.of());
    }

    private static HudWidget.TextureRef texture(String id) {
        return new HudWidget.TextureRef(id, 1, false, 4, 0, "", 0.0);
    }
}
