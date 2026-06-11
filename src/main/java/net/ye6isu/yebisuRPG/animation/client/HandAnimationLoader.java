package net.ye6isu.yebisuRPG.animation.client;

import com.google.gson.*;
import net.minecraft.client.Minecraft;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.packs.resources.Resource;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Loads hand_animations.json from resources at runtime.
 * Parsed on first use and cached until invalidated (e.g. F3+T resource reload).
 *
 * JSON format (Bedrock 1.8.0):
 *   "bones": { "right_arm": { "rotation": { "0": {"vector":[x,y,z]}, "1": {"vector":[x,y,z]} } } }
 *
 * Each bone's rotation channel is stored as float[][3] keyframe table: { time, x, y, z }.
 */
@OnlyIn(Dist.CLIENT)
public final class HandAnimationLoader {

    public static final HandAnimationLoader INSTANCE = new HandAnimationLoader();

    /** Keyframe row: [timeSecs, x, y, z] — used for both rotation (degrees) and position (Blockbench units). */
    public record BoneChannel(float[][] keys) {
        public float evalX(float t) { return eval(0, t); }
        public float evalY(float t) { return eval(1, t); }
        public float evalZ(float t) { return eval(2, t); }

        private float eval(int axis, float t) {
            if (keys.length == 0) return 0f;
            if (t <= keys[0][0]) return keys[0][1 + axis];
            for (int i = 1; i < keys.length; i++) {
                if (t <= keys[i][0]) {
                    float span  = keys[i][0] - keys[i - 1][0];
                    float alpha = span == 0 ? 1f : (t - keys[i - 1][0]) / span;
                    return keys[i - 1][1 + axis] + (keys[i][1 + axis] - keys[i - 1][1 + axis]) * alpha;
                }
            }
            return keys[keys.length - 1][1 + axis];
        }
    }

    public record BonePose(BoneChannel rotation, BoneChannel position) {}

    public record AnimData(float length, Map<String, BonePose> bones) {
        public BonePose bone(String name) {
            return bones.getOrDefault(name, EMPTY_POSE);
        }
    }

    private static final BoneChannel EMPTY_CHANNEL = new BoneChannel(new float[0][]);
    private static final BonePose    EMPTY_POSE    = new BonePose(EMPTY_CHANNEL, EMPTY_CHANNEL);

    // Cache: animName -> AnimData
    private final Map<String, AnimData> cache = new HashMap<>();
    private boolean loaded = false;

    private HandAnimationLoader() {}

    /** Call on resource reload to force re-parse next use. */
    public void invalidate() {
        cache.clear();
        loaded = false;
    }

    /** Returns the named animation, or null if not found. */
    public AnimData get(String animName) {
        if (!loaded) load();
        return cache.get(animName);
    }

    private void load() {
        loaded = true;
        ResourceLocation loc = ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "animations/animations.json");
        try {
            Optional<Resource> res = Minecraft.getInstance().getResourceManager().getResource(loc);
            if (res.isEmpty()) {
                yebisuRPG.LOGGER.warn("[HandAnimationLoader] {} not found", loc);
                return;
            }
            try (InputStream is = res.get().open()) {
                JsonObject root = JsonParser.parseReader(
                    new InputStreamReader(is, StandardCharsets.UTF_8)).getAsJsonObject();
                JsonObject anims = root.getAsJsonObject("animations");
                for (Map.Entry<String, JsonElement> animEntry : anims.entrySet()) {
                    String animName = animEntry.getKey();
                    JsonObject animObj = animEntry.getValue().getAsJsonObject();
                    float length = animObj.has("animation_length")
                        ? animObj.get("animation_length").getAsFloat() : 1f;
                    Map<String, BonePose> bones = new HashMap<>();
                    if (animObj.has("bones")) {
                        for (Map.Entry<String, JsonElement> boneEntry : animObj.getAsJsonObject("bones").entrySet()) {
                            String boneName = boneEntry.getKey();
                            JsonObject boneObj = boneEntry.getValue().getAsJsonObject();
                            BoneChannel rot = boneObj.has("rotation") ? parseChannel(boneObj.getAsJsonObject("rotation")) : EMPTY_CHANNEL;
                            BoneChannel pos = boneObj.has("position") ? parseChannel(boneObj.getAsJsonObject("position")) : EMPTY_CHANNEL;
                            bones.put(boneName, new BonePose(rot, pos));
                        }
                    }
                    cache.put(animName, new AnimData(length, bones));
                }
                yebisuRPG.LOGGER.info("[HandAnimationLoader] Loaded {} animation(s) from {}", cache.size(), loc);
            }
        } catch (Exception e) {
            yebisuRPG.LOGGER.error("[HandAnimationLoader] Failed to load {}: {}", loc, e.getMessage());
        }
    }

    private static BoneChannel parseChannel(JsonObject obj) {
        // Constant form: { "vector": [x, y, z] } — no keyframe timestamps.
        if (obj.has("vector")) {
            JsonArray vec = obj.getAsJsonArray("vector");
            float x = vec.get(0).getAsFloat();
            float y = vec.get(1).getAsFloat();
            float z = vec.get(2).getAsFloat();
            return new BoneChannel(new float[][]{ { 0f, x, y, z } });
        }

        // Keyframe form: { "0": { "vector": [x,y,z] }, "0.5": [...], ... }
        List<Map.Entry<String, JsonElement>> entries = new ArrayList<>(obj.entrySet());
        entries.removeIf(e -> {
            try { Double.parseDouble(e.getKey()); return false; }
            catch (NumberFormatException ex) { return true; }
        });
        entries.sort(Comparator.comparingDouble(e -> Double.parseDouble(e.getKey())));

        float[][] keys = new float[entries.size()][4];
        for (int i = 0; i < entries.size(); i++) {
            float time = Float.parseFloat(entries.get(i).getKey());
            JsonElement val = entries.get(i).getValue();
            float x, y, z;
            if (val.isJsonObject() && val.getAsJsonObject().has("vector")) {
                JsonArray vec = val.getAsJsonObject().getAsJsonArray("vector");
                x = vec.get(0).getAsFloat(); y = vec.get(1).getAsFloat(); z = vec.get(2).getAsFloat();
            } else if (val.isJsonArray()) {
                JsonArray vec = val.getAsJsonArray();
                x = vec.get(0).getAsFloat(); y = vec.get(1).getAsFloat(); z = vec.get(2).getAsFloat();
            } else {
                x = y = z = 0f;
            }
            keys[i] = new float[]{ time, x, y, z };
        }
        return new BoneChannel(keys);
    }
}
