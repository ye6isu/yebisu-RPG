package net.ye6isu.yebisuRPG.entity.client;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.packs.resources.ResourceManager;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Parses a Bedrock-format {@code .geo.json} file into a {@link BakedGeoModel} bone
 * tree — the same on-disk format and same baked data shape
 * {@link net.ye6isu.yebisuRPG.client.renderer.GeoItemRenderer} uses for items.
 *
 * <p>Deliberately mirrors {@code GeoItemRenderer}'s own {@code loadModel}/{@code
 * parseCube}/{@code parsePerFaceUV} logic rather than building a vanilla {@code
 * ModelPart}/{@code CubeListBuilder} tree: vanilla's {@code CubeListBuilder} only
 * supports the single classic "box UV" layout (one {@code [u, v]} origin, all six
 * faces auto-laid-out around it) — there is no public API for Bedrock's per-face UV
 * object format (independent {@code uv}/{@code uv_size} per face), which is exactly
 * what real exported models (see {@code uploaded/tester.geo.json}) use. Baked bones
 * are rendered by {@link GeoEntityModel} via the same manual per-face vertex
 * emission {@code GeoItemRenderer.renderBone}/{@code renderCube} already does for
 * items, which handles both UV layouts correctly.</p>
 */
public final class GeoEntityModelLoader {

    private GeoEntityModelLoader() {}

    public static BakedGeoModel load(ResourceManager mgr, ResourceLocation loc) {
        try (InputStream is = mgr.getResourceOrThrow(loc).open()) {
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
            yebisuRPG.LOGGER.warn("[GeoEntityModelLoader] Failed to load geo model {}: {}", loc, e.getMessage());
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

    // ─── Data records (mirrors GeoItemRenderer's private records, made shareable) ──

    public record BakedGeoModel(int texWidth, int texHeight, List<BakedBone> bones) {}

    public record BakedBone(String name, float pivotX, float pivotY, float pivotZ,
                             float rotX, float rotY, float rotZ,
                             List<BakedCube> cubes, List<BakedBone> children) {}

    public record FaceUV(float u, float v, float uSize, float vSize) {}

    public record BakedCube(float originX, float originY, float originZ,
                             float sizeX, float sizeY, float sizeZ,
                             float pivotX, float pivotY, float pivotZ,
                             float rotX, float rotY, float rotZ,
                             float inflate, float uvX, float uvY,
                             FaceUV[] perFaceUV) {
        public boolean hasPerFaceUV() { return perFaceUV != null; }
    }
}
