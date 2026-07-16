package net.ye6isu.yebisuRPG.entity.custom;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.ye6isu.yebisuRPG.entity.client.GeoEntityModelLoader.BakedBone;
import net.ye6isu.yebisuRPG.entity.client.GeoEntityModelLoader.BakedCube;
import net.ye6isu.yebisuRPG.entity.client.GeoEntityModelLoader.BakedGeoModel;
import net.ye6isu.yebisuRPG.entity.client.GeoEntityModelLoader.FaceUV;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Server-safe counterpart to {@link net.ye6isu.yebisuRPG.entity.client.GeoEntityModelLoader}
 * — parses the exact same Bedrock {@code .geo.json} format into the exact same
 * {@link BakedGeoModel} bone tree, but reads the file straight off the classpath
 * ({@code assets/yebisurpg/geo/entity/<id>.geo.json}, packaged like any other mod
 * asset) instead of through {@code Minecraft.getInstance().getResourceManager()} —
 * that resource-pack layer is client-only and doesn't exist on a dedicated server.
 *
 * <p>Needed so {@link BonePoseSolver} can compute a named bone's world position
 * server-side (for multi-hitbox mob parts) without depending on any {@code
 * @OnlyIn(Dist.CLIENT)} class. Results are cached per entity id, same as the
 * client loader's own resource-manager caching.</p>
 */
public final class ServerGeoModelLoader {

    private ServerGeoModelLoader() {}

    // ConcurrentHashMap, not HashMap — in a runClient/singleplayer setup, the client
    // tick thread and the integrated server's own tick thread both call YcsMobEntity.tick()
    // concurrently, so this cache is genuinely accessed from multiple threads (confirmed
    // live: a plain HashMap here threw ConcurrentModificationException out of
    // computeIfAbsent during actual testing, not a hypothetical race).
    private static final Map<String, BakedGeoModel> CACHE = new ConcurrentHashMap<>();

    /** @param entityId the YCS entity id — model is expected at
     *  {@code assets/yebisurpg/geo/entity/<entityId>.geo.json} on the classpath. */
    public static BakedGeoModel load(String entityId) {
        return CACHE.computeIfAbsent(entityId, ServerGeoModelLoader::loadUncached);
    }

    private static BakedGeoModel loadUncached(String entityId) {
        String path = "assets/" + yebisuRPG.MODID + "/geo/entity/" + entityId + ".geo.json";
        try (InputStream is = ServerGeoModelLoader.class.getClassLoader().getResourceAsStream(path)) {
            if (is == null) {
                yebisuRPG.LOGGER.warn("[ServerGeoModelLoader] {} not found on classpath", path);
                return null;
            }
            String json = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            JsonObject root = JsonParser.parseString(json).getAsJsonObject();
            JsonArray geoArr = root.getAsJsonArray("minecraft:geometry");
            if (geoArr == null || geoArr.isEmpty()) return null;

            JsonObject geo = geoArr.get(0).getAsJsonObject();
            JsonObject desc = geo.getAsJsonObject("description");
            int texW = desc != null && desc.has("texture_width") ? desc.get("texture_width").getAsInt() : 16;
            int texH = desc != null && desc.has("texture_height") ? desc.get("texture_height").getAsInt() : 16;

            JsonArray bonesArr = geo.getAsJsonArray("bones");
            if (bonesArr == null) return null;

            Map<String, BakedBone> boneMap = new LinkedHashMap<>();
            Map<String, String> parentMap = new HashMap<>();

            for (JsonElement boneEl : bonesArr) {
                JsonObject b = boneEl.getAsJsonObject();
                String name = b.has("name") ? b.get("name").getAsString() : "root";
                String parent = b.has("parent") ? b.get("parent").getAsString() : null;

                float[] pivot = readVec3(b, "pivot");
                float[] rot = readVec3(b, "rotation");

                List<BakedCube> cubes = new ArrayList<>();
                if (b.has("cubes")) {
                    for (JsonElement cubeEl : b.getAsJsonArray("cubes")) {
                        cubes.add(parseCube(cubeEl.getAsJsonObject()));
                    }
                }

                boneMap.put(name, new BakedBone(name, pivot[0], pivot[1], pivot[2],
                        rot[0], rot[1], rot[2], cubes, new ArrayList<>()));
                if (parent != null) parentMap.put(name, parent);
            }

            List<BakedBone> roots = new ArrayList<>();
            for (var e : boneMap.entrySet()) {
                String parentName = parentMap.get(e.getKey());
                if (parentName != null && boneMap.containsKey(parentName)) {
                    boneMap.get(parentName).children().add(e.getValue());
                } else {
                    roots.add(e.getValue());
                }
            }

            return new BakedGeoModel(texW, texH, roots);
        } catch (Exception e) {
            yebisuRPG.LOGGER.warn("[ServerGeoModelLoader] Failed to load {}: {}", path, e.getMessage());
            return null;
        }
    }

    private static BakedCube parseCube(JsonObject c) {
        float[] origin = readVec3(c, "origin");
        float[] size = readVec3(c, "size");
        float[] cPivot = readVec3(c, "pivot");
        float[] cRot = readVec3(c, "rotation");
        float inflate = c.has("inflate") ? c.get("inflate").getAsFloat() : 0;

        float uvX = 0, uvY = 0;
        FaceUV[] perFaceUV = null;
        if (c.has("uv")) {
            JsonElement uvEl = c.get("uv");
            if (uvEl.isJsonArray()) {
                JsonArray uvArr = uvEl.getAsJsonArray();
                uvX = uvArr.get(0).getAsFloat();
                uvY = uvArr.get(1).getAsFloat();
            } else if (uvEl.isJsonObject()) {
                perFaceUV = parsePerFaceUV(uvEl.getAsJsonObject(), size);
            }
        }

        return new BakedCube(origin[0], origin[1], origin[2],
                size[0], size[1], size[2],
                cPivot[0], cPivot[1], cPivot[2],
                cRot[0], cRot[1], cRot[2],
                inflate, uvX, uvY, perFaceUV);
    }

    private static FaceUV[] parsePerFaceUV(JsonObject uvObj, float[] size) {
        FaceUV[] perFaceUV = new FaceUV[6];
        String[] faces = {"south", "north", "west", "east", "up", "down"};
        float[][] defaultSizes = {
                {size[0], size[1]}, {size[0], size[1]},
                {size[2], size[1]}, {size[2], size[1]},
                {size[0], size[2]}, {size[0], size[2]}
        };
        for (int fi = 0; fi < 6; fi++) {
            if (uvObj.has(faces[fi])) {
                JsonObject faceObj = uvObj.getAsJsonObject(faces[fi]);
                JsonArray fUv = faceObj.getAsJsonArray("uv");
                float fu = fUv.get(0).getAsFloat(), fv = fUv.get(1).getAsFloat();
                float fuSize = defaultSizes[fi][0], fvSize = defaultSizes[fi][1];
                if (faceObj.has("uv_size")) {
                    JsonArray fSize = faceObj.getAsJsonArray("uv_size");
                    fuSize = fSize.get(0).getAsFloat();
                    fvSize = fSize.get(1).getAsFloat();
                }
                perFaceUV[fi] = new FaceUV(fu, fv, fuSize, fvSize);
            } else {
                perFaceUV[fi] = new FaceUV(0, 0, 0, 0);
            }
        }
        return perFaceUV;
    }

    private static float[] readVec3(JsonObject obj, String key) {
        if (obj == null || !obj.has(key)) return new float[]{0, 0, 0};
        JsonArray arr = obj.getAsJsonArray(key);
        return new float[]{arr.get(0).getAsFloat(), arr.get(1).getAsFloat(), arr.get(2).getAsFloat()};
    }
}
