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

@OnlyIn(Dist.CLIENT)
public final class VfxDefinitionLoader {

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
        JsonObject rotation = object.has("rotation") ? object.getAsJsonObject("rotation") : new JsonObject();
        JsonObject scale = object.has("scale") ? object.getAsJsonObject("scale") : new JsonObject();
        float opacity = clamp(decimal(object, "opacity", 1.0f), 0.0f, 1.0f);
        int color = color(string(object, "color", "#ffffff"), opacity);
        int startTick = clamp(integer(object, "startTick", 0), 0, duration - 1);
        int endTick = clamp(integer(object, "endTick", duration), startTick + 1, duration);

        return new VfxDefinition.Plane(
                string(object, "id", "plane"),
                texture,
                decimal(position, "x", 0.0f),
                decimal(position, "y", 0.0f),
                decimal(position, "z", 0.0f),
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
                endTick);
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
}
