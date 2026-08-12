package net.ye6isu.yebisuRPG.vfx.client;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.packs.resources.Resource;
import net.minecraft.server.packs.resources.ResourceManager;
import net.minecraft.server.packs.resources.ResourceManagerReloadListener;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@OnlyIn(Dist.CLIENT)
public final class VfxDefinitionLoader {

    private static final int MIN_TIMELINE_TICK = -12_000;
    private static final int MAX_TIMELINE_TICK = 24_000;
    private static volatile Map<String, VfxDefinition> definitions = Map.of();

    private VfxDefinitionLoader() {}

    public static ResourceManagerReloadListener reloadListener() {
        return VfxDefinitionLoader::reload;
    }

    public static VfxDefinition get(String id) {
        return definitions.get(id);
    }

    private static void reload(ResourceManager manager) {
        Map<String, VfxDefinition> loaded = new LinkedHashMap<>();
        manager.listResources("vfx", location ->
                        location.getNamespace().equals(yebisuRPG.MODID) && location.getPath().endsWith(".json"))
                .forEach((location, resource) -> loadOne(location, resource, loaded));
        definitions = Map.copyOf(loaded);
        yebisuRPG.LOGGER.info("[VFX] Loaded {} client effect definitions", loaded.size());
    }

    private static void loadOne(ResourceLocation location, Resource resource, Map<String, VfxDefinition> loaded) {
        try (var reader = new InputStreamReader(resource.open(), StandardCharsets.UTF_8)) {
            JsonObject root = JsonParser.parseReader(reader).getAsJsonObject();
            String path = location.getPath();
            String id = path.substring("vfx/".length(), path.length() - ".json".length());
            int version = integer(root, "version", 1);
            if (version < 1 || version > 4) {
                throw new IllegalArgumentException("Unsupported VFX definition version " + version);
            }
            int duration = clamp(integer(root, "durationTicks", 20), 1, 12_000);
            ArrayList<VfxDefinition.Plane> planes = new ArrayList<>();
            if (root.has("objects") && root.get("objects").isJsonArray()) {
                for (var element : root.getAsJsonArray("objects")) {
                    JsonObject object = element.getAsJsonObject();
                    if (!"plane".equals(string(object, "type", ""))) continue;
                    VfxDefinition.Plane plane = parsePlane(object, duration);
                    if (plane != null) planes.add(plane);
                }
            }
            loaded.put(id, new VfxDefinition(id, duration, List.copyOf(planes)));
        } catch (Exception e) {
            yebisuRPG.LOGGER.warn("[VFX] Failed to load {}: {}", location, e.toString());
        }
    }

    private static VfxDefinition.Plane parsePlane(JsonObject object, int duration) {
        String textureValue = string(object, "texture", "");
        ResourceLocation texture = ResourceLocation.tryParse(textureValue);
        if (texture == null) return null;

        JsonObject position = object.has("position") ? object.getAsJsonObject("position") : new JsonObject();
        JsonObject pivot = object.has("pivot") ? object.getAsJsonObject("pivot") : new JsonObject();
        JsonObject baseRotation = object.has("baseRotation")
                ? object.getAsJsonObject("baseRotation")
                : new JsonObject();
        JsonObject rotation = object.has("rotation") ? object.getAsJsonObject("rotation") : new JsonObject();
        JsonObject scale = object.has("scale") ? object.getAsJsonObject("scale") : new JsonObject();
        float opacity = clamp(decimal(object, "opacity", 1.0f), 0.0f, 1.0f);
        int color = color(string(object, "color", "#ffffff"), opacity);
        int startTick = clamp(integer(object, "startTick", 0), MIN_TIMELINE_TICK, MAX_TIMELINE_TICK - 1);
        int endTick = clamp(integer(object, "endTick", duration), startTick + 1, MAX_TIMELINE_TICK);

        return new VfxDefinition.Plane(
                string(object, "id", "plane"),
                texture,
                decimal(position, "x", 0.0f),
                decimal(position, "y", 0.0f),
                decimal(position, "z", 0.0f),
                decimal(pivot, "x", 0.0f),
                decimal(pivot, "y", 0.0f),
                decimal(pivot, "z", 0.0f),
                decimal(baseRotation, "x", 0.0f),
                decimal(baseRotation, "y", 0.0f),
                decimal(baseRotation, "z", 0.0f),
                decimal(rotation, "x", 0.0f),
                decimal(rotation, "y", 0.0f),
                decimal(rotation, "z", 0.0f),
                decimal(scale, "x", 1.0f),
                decimal(scale, "y", 1.0f),
                decimal(scale, "z", 1.0f),
                Math.max(0.001f, decimal(object, "width", 1.0f)),
                Math.max(0.001f, decimal(object, "height", 1.0f)),
                bool(object, "billboard", true),
                bool(object, "fullBright", true),
                color,
                Math.max(1, integer(object, "rows", 1)),
                Math.max(1, integer(object, "ticksPerFrame", 2)),
                bool(object, "textureLoop", true),
                startTick,
                endTick,
                bool(object, "separatePositionDimensions", false),
                parsePositionKeyframes(object),
                parseScalarKeyframes(object, "positionXKeyframes"),
                parseScalarKeyframes(object, "positionYKeyframes"),
                parseScalarKeyframes(object, "positionZKeyframes"),
                bool(object, "separateRotationDimensions", false),
                parseVectorKeyframes(object, "rotationKeyframes"),
                parseScalarKeyframes(object, "rotationXKeyframes"),
                parseScalarKeyframes(object, "rotationYKeyframes"),
                parseScalarKeyframes(object, "rotationZKeyframes"),
                bool(object, "separateScaleDimensions", false),
                parseVectorKeyframes(object, "scaleKeyframes"),
                parseScalarKeyframes(object, "scaleXKeyframes"),
                parseScalarKeyframes(object, "scaleYKeyframes"),
                parseScalarKeyframes(object, "scaleZKeyframes"),
                parseOpacityKeyframes(object));
    }

    private static List<VfxDefinition.PositionKeyframe> parsePositionKeyframes(JsonObject object) {
        if (!object.has("positionKeyframes") || !object.get("positionKeyframes").isJsonArray()) {
            return List.of();
        }

        TreeMap<Double, VfxDefinition.PositionKeyframe> byTick = new TreeMap<>();
        for (var element : object.getAsJsonArray("positionKeyframes")) {
            if (!element.isJsonObject()) continue;
            JsonObject keyframe = element.getAsJsonObject();
            if (!keyframe.has("value") || !keyframe.get("value").isJsonObject()) continue;
            double tick = clamp(decimalDouble(keyframe, "tick", 0.0), MIN_TIMELINE_TICK, MAX_TIMELINE_TICK);
            JsonObject value = keyframe.getAsJsonObject("value");
            byTick.put(tick, new VfxDefinition.PositionKeyframe(
                    tick,
                    decimal(value, "x", 0.0f),
                    decimal(value, "y", 0.0f),
                    decimal(value, "z", 0.0f),
                    easing(keyframe)));
        }
        return List.copyOf(byTick.values());
    }

    private static List<VfxDefinition.VectorKeyframe> parseVectorKeyframes(JsonObject object, String property) {
        if (!object.has(property) || !object.get(property).isJsonArray()) return List.of();
        TreeMap<Double, VfxDefinition.VectorKeyframe> byTick = new TreeMap<>();
        for (var element : object.getAsJsonArray(property)) {
            if (!element.isJsonObject()) continue;
            JsonObject keyframe = element.getAsJsonObject();
            if (!keyframe.has("value") || !keyframe.get("value").isJsonObject()) continue;
            double tick = clamp(decimalDouble(keyframe, "tick", 0.0), MIN_TIMELINE_TICK, MAX_TIMELINE_TICK);
            JsonObject value = keyframe.getAsJsonObject("value");
            byTick.put(tick, new VfxDefinition.VectorKeyframe(
                    tick,
                    decimalDouble(value, "x", 0.0),
                    decimalDouble(value, "y", 0.0),
                    decimalDouble(value, "z", 0.0),
                    easing(keyframe)));
        }
        return List.copyOf(byTick.values());
    }

    private static List<VfxDefinition.ScalarKeyframe> parseScalarKeyframes(JsonObject object, String property) {
        if (!object.has(property) || !object.get(property).isJsonArray()) return List.of();
        TreeMap<Double, VfxDefinition.ScalarKeyframe> byTick = new TreeMap<>();
        for (var element : object.getAsJsonArray(property)) {
            if (!element.isJsonObject()) continue;
            JsonObject keyframe = element.getAsJsonObject();
            double tick = clamp(decimalDouble(keyframe, "tick", 0.0), MIN_TIMELINE_TICK, MAX_TIMELINE_TICK);
            byTick.put(tick, new VfxDefinition.ScalarKeyframe(
                    tick,
                    decimalDouble(keyframe, "value", 0.0),
                    easing(keyframe)));
        }
        return List.copyOf(byTick.values());
    }

    private static List<VfxDefinition.OpacityKeyframe> parseOpacityKeyframes(JsonObject object) {
        if (!object.has("opacityKeyframes") || !object.get("opacityKeyframes").isJsonArray()) {
            return List.of();
        }

        TreeMap<Double, VfxDefinition.OpacityKeyframe> byTick = new TreeMap<>();
        for (var element : object.getAsJsonArray("opacityKeyframes")) {
            if (!element.isJsonObject()) continue;
            JsonObject keyframe = element.getAsJsonObject();
            double tick = clamp(decimalDouble(keyframe, "tick", 0.0), MIN_TIMELINE_TICK, MAX_TIMELINE_TICK);
            float value = clamp(decimal(keyframe, "value", 1.0f), 0.0f, 1.0f);
            byTick.put(tick, new VfxDefinition.OpacityKeyframe(tick, value, easing(keyframe)));
        }
        return List.copyOf(byTick.values());
    }

    private static VfxDefinition.Easing easing(JsonObject keyframe) {
        if (!keyframe.has("easing") || !keyframe.get("easing").isJsonObject()) {
            return VfxDefinition.Easing.LINEAR;
        }
        JsonObject easing = keyframe.getAsJsonObject("easing");
        String type = string(easing, "type", "cubic");
        if (!List.of(
                "cubic", "step", "sine", "quad", "cubicPower", "quart", "quint",
                "expo", "circ", "back", "elastic", "bounce").contains(type)) {
            type = "cubic";
        }
        String mode = string(easing, "mode", "inOut");
        if (!mode.equals("in") && !mode.equals("out") && !mode.equals("inOut")) mode = "inOut";
        double fallbackAmount = type.equals("step") ? 2.0 : type.equals("back") ? 1.70158 : 1.0;
        double maximumAmount = type.equals("step") ? 64.0 : type.equals("back") ? 10.0 : 4.0;
        return new VfxDefinition.Easing(
                type,
                mode,
                clamp(decimalDouble(easing, "amount", fallbackAmount), 0.0, maximumAmount),
                clamp(decimalDouble(easing, "x1", 1.0 / 3.0), 0.0, 1.0),
                decimalDouble(easing, "y1", 1.0 / 3.0),
                clamp(decimalDouble(easing, "x2", 2.0 / 3.0), 0.0, 1.0),
                decimalDouble(easing, "y2", 2.0 / 3.0));
    }

    private static String string(JsonObject object, String key, String fallback) {
        return object.has(key) ? object.get(key).getAsString() : fallback;
    }

    private static int integer(JsonObject object, String key, int fallback) {
        try {
            return object.has(key) ? object.get(key).getAsInt() : fallback;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private static float decimal(JsonObject object, String key, float fallback) {
        try {
            return object.has(key) ? object.get(key).getAsFloat() : fallback;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private static double decimalDouble(JsonObject object, String key, double fallback) {
        try {
            return object.has(key) ? object.get(key).getAsDouble() : fallback;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private static boolean bool(JsonObject object, String key, boolean fallback) {
        try {
            return object.has(key) ? object.get(key).getAsBoolean() : fallback;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private static int color(String value, float opacity) {
        try {
            String hex = value.startsWith("#") ? value.substring(1) : value;
            int rgb = Integer.parseUnsignedInt(hex.length() >= 6 ? hex.substring(0, 6) : "ffffff", 16);
            return (Math.round(opacity * 255.0f) << 24) | rgb;
        } catch (Exception ignored) {
            return (Math.round(opacity * 255.0f) << 24) | 0xFFFFFF;
        }
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private static float clamp(float value, float min, float max) {
        return Math.max(min, Math.min(max, value));
    }

    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}
