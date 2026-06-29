package net.ye6isu.yebisuRPG.client.renderer;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.BlockEntityWithoutLevelRenderer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.blockentity.BlockEntityRenderDispatcher;
import net.minecraft.client.renderer.entity.ItemRenderer;
import net.minecraft.client.model.geom.EntityModelSet;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.packs.resources.ResourceManager;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemDisplayContext;
import net.minecraft.world.item.ItemStack;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.yebisuRPG;
import org.joml.Matrix3f;
import org.joml.Matrix4f;
import org.joml.Quaternionf;
import org.joml.Vector3f;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

@OnlyIn(Dist.CLIENT)
public class GeoItemRenderer extends BlockEntityWithoutLevelRenderer {

    private static final Map<Item, GeoItemEntry> REGISTRY = new HashMap<>();
    private final Map<Item, List<BakedGeoModel>> models = new HashMap<>();
    private final Map<Item, Map<Integer, Integer>> spritesheetFrameCounts = new HashMap<>();

    public GeoItemRenderer(BlockEntityRenderDispatcher dispatcher, EntityModelSet models) {
        super(dispatcher, models);
    }

    // ─── Registration ────────────────────────────────────────────────────────────

    public static void register(Item item, ResourceLocation geoLoc, ResourceLocation texLoc) {
        REGISTRY.put(item, new GeoItemEntry(List.of(geoLoc), List.of(texLoc), List.of(StateAnim.NONE)));
    }

    public static void register(Item item, ResourceLocation geoLoc, ResourceLocation texLoc,
                                int frames, boolean animated, int ticksPerFrame) {
        REGISTRY.put(item, new GeoItemEntry(List.of(geoLoc), List.of(texLoc),
                List.of(new StateAnim(frames, animated, ticksPerFrame))));
    }

    public static void register(Item item, List<ResourceLocation> geoLocs, List<ResourceLocation> textures) {
        List<StateAnim> anims = new ArrayList<>(Collections.nCopies(textures.size(), StateAnim.NONE));
        REGISTRY.put(item, new GeoItemEntry(geoLocs, textures, anims));
    }

    public static void register(Item item, List<ResourceLocation> geoLocs, List<ResourceLocation> textures,
                                List<StateAnim> stateAnims) {
        REGISTRY.put(item, new GeoItemEntry(geoLocs, textures, stateAnims));
    }

    public static boolean hasEntry(Item item) {
        return REGISTRY.containsKey(item);
    }

    // ─── Resource reload ─────────────────────────────────────────────────────────

    @Override
    public void onResourceManagerReload(ResourceManager resourceManager) {
        models.clear();
        spritesheetFrameCounts.clear();
        for (var entry : REGISTRY.entrySet()) {
            List<BakedGeoModel> bakedModels = new ArrayList<>();
            for (ResourceLocation geoLoc : entry.getValue().geoLocations()) {
                BakedGeoModel model = loadModel(resourceManager, geoLoc);
                if (model != null) bakedModels.add(model);
            }
            if (bakedModels.isEmpty()) continue;

            models.put(entry.getKey(), bakedModels);
            List<ResourceLocation> textures = entry.getValue().textures();
            Map<Integer, Integer> frameCounts = new HashMap<>();
            for (int i = 0; i < textures.size(); i++) {
                BakedGeoModel m = bakedModels.get(Math.min(i, bakedModels.size() - 1));
                int frames = detectFrameCount(resourceManager, textures.get(i), m.texWidth(), m.texHeight());
                if (frames > 1) frameCounts.put(i, frames);
            }
            if (!frameCounts.isEmpty()) spritesheetFrameCounts.put(entry.getKey(), frameCounts);
        }
    }

    private int detectFrameCount(ResourceManager mgr, ResourceLocation texLoc, int geoTexW, int geoTexH) {
        try (InputStream is = mgr.getResourceOrThrow(texLoc).open()) {
            byte[] header = new byte[24];
            if (is.read(header) < 24) return 1;
            int pngW = ((header[16] & 0xFF) << 24) | ((header[17] & 0xFF) << 16)
                    | ((header[18] & 0xFF) << 8) | (header[19] & 0xFF);
            int pngH = ((header[20] & 0xFF) << 24) | ((header[21] & 0xFF) << 16)
                    | ((header[22] & 0xFF) << 8) | (header[23] & 0xFF);
            if (geoTexW <= 0 || geoTexH <= 0) return 1;
            int wScale = pngW / geoTexW;
            int hScale = pngH / geoTexH;
            if (wScale > 0 && hScale > wScale && pngW == geoTexW * wScale && pngH % (geoTexH * wScale) == 0) {
                return pngH / (geoTexH * wScale);
            }
        } catch (Exception ignored) {}
        return 1;
    }

    // ─── Rendering ───────────────────────────────────────────────────────────────

    @Override
    public void renderByItem(ItemStack stack, ItemDisplayContext displayContext, PoseStack poseStack,
                             MultiBufferSource buffer, int packedLight, int packedOverlay) {
        Item item = stack.getItem();
        GeoItemEntry entry = REGISTRY.get(item);
        if (entry == null) return;

        List<BakedGeoModel> modelList = models.get(item);
        if (modelList == null || modelList.isEmpty()) return;

        int customModelData = stack.getOrDefault(
                net.minecraft.core.component.DataComponents.CUSTOM_MODEL_DATA,
                new net.minecraft.world.item.component.CustomModelData(0)).value();
        int itemState = Math.max(0, customModelData);

        BakedGeoModel model = modelList.get(Math.min(itemState, modelList.size() - 1));

        int texIdx = Math.min(itemState, entry.textures().size() - 1);
        ResourceLocation textureLoc = entry.textures().get(texIdx);
        StateAnim stateAnim = texIdx < entry.stateAnims().size() ? entry.stateAnims().get(texIdx) : StateAnim.NONE;

        Map<Integer, Integer> frameCounts = spritesheetFrameCounts.get(item);
        int detectedFrames = frameCounts != null && frameCounts.containsKey(texIdx) ? frameCounts.get(texIdx) : 0;
        int resolvedFrameCount = stateAnim.frames() > 1 ? stateAnim.frames() : detectedFrames;

        int frame = 0;
        if (resolvedFrameCount > 1) {
            if (stateAnim.animated()) {
                int tpf = Math.max(1, stateAnim.ticksPerFrame() > 0 ? stateAnim.ticksPerFrame() : 4);
                long tick = Minecraft.getInstance().level != null ? Minecraft.getInstance().level.getGameTime() : 0;
                frame = (int) ((tick / tpf) % resolvedFrameCount);
            } else {
                frame = Math.max(0, customModelData - 1);
            }
        }

        float vFrameOffset = 0f;
        int effectiveTexH;
        if (resolvedFrameCount > 1) {
            effectiveTexH = model.texHeight() * resolvedFrameCount;
            vFrameOffset = (float) (Math.min(frame, resolvedFrameCount - 1) * model.texHeight());
        } else {
            effectiveTexH = model.texHeight();
        }

        RenderType renderType = RenderType.entityCutoutNoCull(textureLoc);
        VertexConsumer vc = ItemRenderer.getFoilBufferDirect(buffer, renderType, false, stack.hasFoil());

        poseStack.pushPose();
        poseStack.translate(0.5f, 0.5f, 0.5f);
        poseStack.scale(1.0f / 16.0f, 1.0f / 16.0f, 1.0f / 16.0f);

        for (BakedBone bone : model.bones()) {
            renderBone(bone, poseStack, vc, packedLight, packedOverlay, model.texWidth(), effectiveTexH, vFrameOffset);
        }

        poseStack.popPose();
    }

    private void renderBone(BakedBone bone, PoseStack poseStack, VertexConsumer vc,
                            int light, int overlay, int texW, int texH, float vFrameOffset) {
        poseStack.pushPose();

        float px = bone.pivotX(), py = bone.pivotY(), pz = bone.pivotZ();

        Quaternionf q = eulerToQuat(
                (float) Math.toRadians(-bone.rotX()),
                (float) Math.toRadians(-bone.rotY()),
                (float) Math.toRadians(bone.rotZ()));

        poseStack.translate(px, py, pz);
        poseStack.mulPose(q);
        poseStack.translate(-px, -py, -pz);

        for (BakedCube cube : bone.cubes()) {
            renderCube(cube, poseStack, vc, light, overlay, texW, texH, vFrameOffset);
        }

        for (BakedBone child : bone.children()) {
            renderBone(child, poseStack, vc, light, overlay, texW, texH, vFrameOffset);
        }

        poseStack.popPose();
    }

    private void renderCube(BakedCube cube, PoseStack poseStack, VertexConsumer vc,
                            int light, int overlay, int texW, int texH, float vFrameOffset) {
        poseStack.pushPose();

        float px = cube.pivotX(), py = cube.pivotY(), pz = cube.pivotZ();
        if (px != 0 || py != 0 || pz != 0) poseStack.translate(px, py, pz);
        if (cube.rotX() != 0 || cube.rotY() != 0 || cube.rotZ() != 0) {
            poseStack.mulPose(eulerToQuat(
                    (float) Math.toRadians(-cube.rotX()),
                    (float) Math.toRadians(-cube.rotY()),
                    (float) Math.toRadians(cube.rotZ())));
        }
        if (px != 0 || py != 0 || pz != 0) poseStack.translate(-px, -py, -pz);

        Matrix4f mat = poseStack.last().pose();
        Matrix3f norm = poseStack.last().normal();

        float ox = cube.originX(), oy = cube.originY(), oz = cube.originZ();
        float sx = cube.sizeX(), sy = cube.sizeY(), sz = cube.sizeZ();
        float inf = cube.inflate();

        float x0 = ox - inf, y0 = oy - inf, z0 = oz - inf;
        float x1 = ox + sx + inf, y1 = oy + sy + inf, z1 = oz + sz + inf;

        float eps = 0.001f;
        if (sx == 0) { x0 -= eps; x1 += eps; }
        if (sy == 0) { y0 -= eps; y1 += eps; }
        if (sz == 0) { z0 -= eps; z1 += eps; }

        if (cube.hasPerFaceUV()) {
            FaceUV[] pf = cube.perFaceUV();
            emitPerFace(mat, norm, vc, light, overlay, texW, texH, vFrameOffset, pf[0], x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1, 0,0,1);
            emitPerFace(mat, norm, vc, light, overlay, texW, texH, vFrameOffset, pf[1], x1,y0,z0, x0,y0,z0, x0,y1,z0, x1,y1,z0, 0,0,-1);
            emitPerFace(mat, norm, vc, light, overlay, texW, texH, vFrameOffset, pf[2], x0,y0,z0, x0,y0,z1, x0,y1,z1, x0,y1,z0, -1,0,0);
            emitPerFace(mat, norm, vc, light, overlay, texW, texH, vFrameOffset, pf[3], x1,y0,z1, x1,y0,z0, x1,y1,z0, x1,y1,z1, 1,0,0);
            emitPerFace(mat, norm, vc, light, overlay, texW, texH, vFrameOffset, pf[4], x0,y1,z0, x1,y1,z0, x1,y1,z1, x0,y1,z1, 0,1,0);
            emitPerFace(mat, norm, vc, light, overlay, texW, texH, vFrameOffset, pf[5], x0,y0,z1, x1,y0,z1, x1,y0,z0, x0,y0,z0, 0,-1,0);
        } else {
            float u = cube.uvX(), v = cube.uvY() + vFrameOffset;
            quad(mat, norm, vc, light, overlay, texW, texH, x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1, u+sz+sx+sz, v+sz, sx, sy, 0,0,1);
            quad(mat, norm, vc, light, overlay, texW, texH, x1,y0,z0, x0,y0,z0, x0,y1,z0, x1,y1,z0, u+sz, v+sz, sx, sy, 0,0,-1);
            quad(mat, norm, vc, light, overlay, texW, texH, x0,y0,z0, x0,y0,z1, x0,y1,z1, x0,y1,z0, u+sz+sx, v+sz, sz, sy, -1,0,0);
            quad(mat, norm, vc, light, overlay, texW, texH, x1,y0,z1, x1,y0,z0, x1,y1,z0, x1,y1,z1, u, v+sz, sz, sy, 1,0,0);
            quad(mat, norm, vc, light, overlay, texW, texH, x0,y1,z0, x1,y1,z0, x1,y1,z1, x0,y1,z1, u+sz, v, sx, sz, 0,1,0);
            quad(mat, norm, vc, light, overlay, texW, texH, x0,y0,z0, x1,y0,z0, x1,y0,z1, x0,y0,z1, u+sz+sx, v, sx, sz, 0,-1,0);
        }

        poseStack.popPose();
    }

    private void quad(Matrix4f mat, Matrix3f norm, VertexConsumer vc, int light, int overlay,
                      int texW, int texH,
                      float x0, float y0, float z0, float x1, float y1, float z1,
                      float x2, float y2, float z2, float x3, float y3, float z3,
                      float uOff, float vOff, float uSize, float vSize,
                      float nx, float ny, float nz) {
        float u0 = uOff / texW, v0 = vOff / texH;
        float u1 = (uOff + uSize) / texW, v1 = (vOff + vSize) / texH;
        Vector3f n = norm.transform(new Vector3f(nx, ny, nz));

        vc.addVertex(mat, x0, y0, z0).setColor(1f,1f,1f,1f).setUv(u0, v1).setOverlay(overlay).setLight(light).setNormal(n.x, n.y, n.z);
        vc.addVertex(mat, x1, y1, z1).setColor(1f,1f,1f,1f).setUv(u1, v1).setOverlay(overlay).setLight(light).setNormal(n.x, n.y, n.z);
        vc.addVertex(mat, x2, y2, z2).setColor(1f,1f,1f,1f).setUv(u1, v0).setOverlay(overlay).setLight(light).setNormal(n.x, n.y, n.z);
        vc.addVertex(mat, x3, y3, z3).setColor(1f,1f,1f,1f).setUv(u0, v0).setOverlay(overlay).setLight(light).setNormal(n.x, n.y, n.z);
    }

    private void emitPerFace(Matrix4f mat, Matrix3f norm, VertexConsumer vc, int light, int overlay,
                             int texW, int texH, float vFrameOffset, FaceUV face,
                             float x0, float y0, float z0, float x1, float y1, float z1,
                             float x2, float y2, float z2, float x3, float y3, float z3,
                             float nx, float ny, float nz) {
        if (face == null || (face.uSize() == 0 && face.vSize() == 0)) return;
        quad(mat, norm, vc, light, overlay, texW, texH,
                x0,y0,z0, x1,y1,z1, x2,y2,z2, x3,y3,z3,
                face.u(), face.v() + vFrameOffset, face.uSize(), face.vSize(), nx, ny, nz);
    }

    // ─── Model loading ───────────────────────────────────────────────────────────

    private BakedGeoModel loadModel(ResourceManager mgr, ResourceLocation loc) {
        try (InputStream is = mgr.getResourceOrThrow(loc).open()) {
            String json = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            JsonObject root = JsonParser.parseString(json).getAsJsonObject();
            JsonArray geoArr = root.getAsJsonArray("minecraft:geometry");
            if (geoArr == null || geoArr.isEmpty()) return null;

            JsonObject geo = geoArr.get(0).getAsJsonObject();
            JsonObject desc = geo.getAsJsonObject("description");
            int texW = desc != null ? desc.get("texture_width").getAsInt() : 16;
            int texH = desc != null ? desc.get("texture_height").getAsInt() : 16;

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
            yebisuRPG.LOGGER.warn("Failed to load geo model {}: {}", loc, e.getMessage());
            return null;
        }
    }

    private BakedCube parseCube(JsonObject c) {
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

    private FaceUV[] parsePerFaceUV(JsonObject uvObj, float[] size) {
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

    private static Quaternionf eulerToQuat(float rx, float ry, float rz) {
        return new Quaternionf().rotationZYX(rz, ry, rx);
    }

    private float[] readVec3(JsonObject obj, String key) {
        if (!obj.has(key)) return new float[]{0, 0, 0};
        JsonArray arr = obj.getAsJsonArray(key);
        return new float[]{arr.get(0).getAsFloat(), arr.get(1).getAsFloat(), arr.get(2).getAsFloat()};
    }

    // ─── Data records ────────────────────────────────────────────────────────────

    public record StateAnim(int frames, boolean animated, int ticksPerFrame) {
        public static final StateAnim NONE = new StateAnim(0, false, 0);
    }

    private record GeoItemEntry(List<ResourceLocation> geoLocations, List<ResourceLocation> textures,
                                List<StateAnim> stateAnims) {}
    private record BakedGeoModel(int texWidth, int texHeight, List<BakedBone> bones) {}
    private record BakedBone(String name, float pivotX, float pivotY, float pivotZ,
                             float rotX, float rotY, float rotZ,
                             List<BakedCube> cubes, List<BakedBone> children) {}
    private record FaceUV(float u, float v, float uSize, float vSize) {}
    private record BakedCube(float originX, float originY, float originZ,
                             float sizeX, float sizeY, float sizeZ,
                             float pivotX, float pivotY, float pivotZ,
                             float rotX, float rotY, float rotZ,
                             float inflate, float uvX, float uvY,
                             FaceUV[] perFaceUV) {
        boolean hasPerFaceUV() { return perFaceUV != null; }
    }
}
