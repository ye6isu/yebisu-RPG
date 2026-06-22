package net.ye6isu.yebisuRPG.client.renderer;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import com.mojang.math.Axis;
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
import org.joml.Vector3f;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

@OnlyIn(Dist.CLIENT)
public class GeoItemRenderer extends BlockEntityWithoutLevelRenderer {

    private static final Map<Item, GeoItemEntry> REGISTRY = new HashMap<>();
    private final Map<Item, BakedGeoModel> models = new HashMap<>();

    public GeoItemRenderer(BlockEntityRenderDispatcher dispatcher, EntityModelSet models) {
        super(dispatcher, models);
    }

    public static void register(Item item, ResourceLocation geoLocation, ResourceLocation textureLocation) {
        REGISTRY.put(item, new GeoItemEntry(geoLocation, textureLocation));
    }

    public static boolean hasEntry(Item item) {
        return REGISTRY.containsKey(item);
    }

    @Override
    public void onResourceManagerReload(ResourceManager resourceManager) {
        models.clear();
        for (var entry : REGISTRY.entrySet()) {
            BakedGeoModel model = loadModel(resourceManager, entry.getValue().geoLocation());
            if (model != null) {
                models.put(entry.getKey(), model);
            }
        }
    }

    @Override
    public void renderByItem(ItemStack stack, ItemDisplayContext displayContext, PoseStack poseStack,
                             MultiBufferSource buffer, int packedLight, int packedOverlay) {
        Item item = stack.getItem();
        GeoItemEntry entry = REGISTRY.get(item);
        if (entry == null) return;

        BakedGeoModel model = models.get(item);
        if (model == null) return;

        RenderType renderType = RenderType.entityCutoutNoCull(entry.textureLocation());
        VertexConsumer vc = ItemRenderer.getFoilBufferDirect(buffer, renderType, false, stack.hasFoil());

        poseStack.pushPose();
        poseStack.translate(0.5f, 0.5f, 0.5f);
        poseStack.scale(1.0f / 16.0f, 1.0f / 16.0f, 1.0f / 16.0f);

        for (BakedBone bone : model.bones()) {
            renderBone(bone, poseStack, vc, packedLight, packedOverlay, model.texWidth(), model.texHeight());
        }

        poseStack.popPose();
    }

    private void renderBone(BakedBone bone, PoseStack poseStack, VertexConsumer vc,
                            int light, int overlay, int texW, int texH) {
        poseStack.pushPose();

        float px = bone.pivotX(), py = bone.pivotY(), pz = bone.pivotZ();
        poseStack.translate(px, py, pz);
        if (bone.rotX() != 0) poseStack.mulPose(Axis.XP.rotationDegrees(-bone.rotX()));
        if (bone.rotY() != 0) poseStack.mulPose(Axis.YP.rotationDegrees(-bone.rotY()));
        if (bone.rotZ() != 0) poseStack.mulPose(Axis.ZP.rotationDegrees(bone.rotZ()));
        poseStack.translate(-px, -py, -pz);

        for (BakedCube cube : bone.cubes()) {
            renderCube(cube, poseStack, vc, light, overlay, texW, texH);
        }

        for (BakedBone child : bone.children()) {
            renderBone(child, poseStack, vc, light, overlay, texW, texH);
        }

        poseStack.popPose();
    }

    private void renderCube(BakedCube cube, PoseStack poseStack, VertexConsumer vc,
                            int light, int overlay, int texW, int texH) {
        poseStack.pushPose();

        float px = cube.pivotX(), py = cube.pivotY(), pz = cube.pivotZ();
        if (px != 0 || py != 0 || pz != 0) {
            poseStack.translate(px, py, pz);
        }
        if (cube.rotX() != 0) poseStack.mulPose(Axis.XP.rotationDegrees(-cube.rotX()));
        if (cube.rotY() != 0) poseStack.mulPose(Axis.YP.rotationDegrees(-cube.rotY()));
        if (cube.rotZ() != 0) poseStack.mulPose(Axis.ZP.rotationDegrees(cube.rotZ()));
        if (px != 0 || py != 0 || pz != 0) {
            poseStack.translate(-px, -py, -pz);
        }

        Matrix4f mat = poseStack.last().pose();
        Matrix3f norm = poseStack.last().normal();

        float ox = cube.originX(), oy = cube.originY(), oz = cube.originZ();
        float sx = cube.sizeX(), sy = cube.sizeY(), sz = cube.sizeZ();
        float inf = cube.inflate();

        float x0 = ox - inf, y0 = oy - inf, z0 = oz - inf;
        float x1 = ox + sx + inf, y1 = oy + sy + inf, z1 = oz + sz + inf;

        float u = cube.uvX(), v = cube.uvY();

        // Bedrock box UV layout — Bedrock front = -Z, Java front = +Z, so swap front/back UVs
        // Bedrock "front": u+sz,       v+sz,       sx, sy  → maps to Java North (-Z)
        // Bedrock "back":  u+sz+sx+sz, v+sz,       sx, sy  → maps to Java South (+Z)
        // Bedrock "left":  u,          v+sz,       sz, sy  → maps to Java East (+X)
        // Bedrock "right": u+sz+sx,    v+sz,       sz, sy  → maps to Java West (-X)
        // Top:             u+sz,       v,          sx, sz
        // Bottom:          u+sz+sx,    v,          sx, sz

        // South face (+Z) — uses Bedrock "back" UV
        quad(mat, norm, vc, light, overlay, texW, texH,
            x0, y0, z1,  x1, y0, z1,  x1, y1, z1,  x0, y1, z1,
            u + sz + sx + sz, v + sz, sx, sy, 0, 0, 1);

        // North face (-Z) — uses Bedrock "front" UV
        quad(mat, norm, vc, light, overlay, texW, texH,
            x1, y0, z0,  x0, y0, z0,  x0, y1, z0,  x1, y1, z0,
            u + sz, v + sz, sx, sy, 0, 0, -1);

        // West face (-X) — uses Bedrock "right" UV
        quad(mat, norm, vc, light, overlay, texW, texH,
            x0, y0, z0,  x0, y0, z1,  x0, y1, z1,  x0, y1, z0,
            u + sz + sx, v + sz, sz, sy, -1, 0, 0);

        // East face (+X) — uses Bedrock "left" UV
        quad(mat, norm, vc, light, overlay, texW, texH,
            x1, y0, z1,  x1, y0, z0,  x1, y1, z0,  x1, y1, z1,
            u, v + sz, sz, sy, 1, 0, 0);

        // Top face (+Y) normal 0,1,0
        quad(mat, norm, vc, light, overlay, texW, texH,
            x0, y1, z1,  x1, y1, z1,  x1, y1, z0,  x0, y1, z0,
            u + sz, v, sx, sz, 0, 1, 0);

        // Bottom face (-Y) normal 0,-1,0
        quad(mat, norm, vc, light, overlay, texW, texH,
            x0, y0, z0,  x1, y0, z0,  x1, y0, z1,  x0, y0, z1,
            u + sz + sx, v, sx, sz, 0, -1, 0);

        poseStack.popPose();
    }

    private void quad(Matrix4f mat, Matrix3f norm, VertexConsumer vc, int light, int overlay,
                      int texW, int texH,
                      float x0, float y0, float z0,
                      float x1, float y1, float z1,
                      float x2, float y2, float z2,
                      float x3, float y3, float z3,
                      float uOff, float vOff, float uSize, float vSize,
                      float nx, float ny, float nz) {
        float u0 = uOff / texW, v0 = vOff / texH;
        float u1 = (uOff + uSize) / texW, v1 = (vOff + vSize) / texH;

        Vector3f n = norm.transform(new Vector3f(nx, ny, nz));

        vc.addVertex(mat, x0, y0, z0).setColor(1f, 1f, 1f, 1f).setUv(u0, v1).setOverlay(overlay).setLight(light).setNormal(n.x, n.y, n.z);
        vc.addVertex(mat, x1, y1, z1).setColor(1f, 1f, 1f, 1f).setUv(u1, v1).setOverlay(overlay).setLight(light).setNormal(n.x, n.y, n.z);
        vc.addVertex(mat, x2, y2, z2).setColor(1f, 1f, 1f, 1f).setUv(u1, v0).setOverlay(overlay).setLight(light).setNormal(n.x, n.y, n.z);
        vc.addVertex(mat, x3, y3, z3).setColor(1f, 1f, 1f, 1f).setUv(u0, v0).setOverlay(overlay).setLight(light).setNormal(n.x, n.y, n.z);
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
                        JsonObject c = cubeEl.getAsJsonObject();
                        float[] origin = readVec3(c, "origin");
                        float[] size = readVec3(c, "size");
                        float[] cPivot = readVec3(c, "pivot");
                        float[] cRot = readVec3(c, "rotation");
                        float inflate = c.has("inflate") ? c.get("inflate").getAsFloat() : 0;

                        float uvX = 0, uvY = 0;
                        if (c.has("uv")) {
                            JsonElement uvEl = c.get("uv");
                            if (uvEl.isJsonArray()) {
                                JsonArray uvArr = uvEl.getAsJsonArray();
                                uvX = uvArr.get(0).getAsFloat();
                                uvY = uvArr.get(1).getAsFloat();
                            }
                        }

                        cubes.add(new BakedCube(
                            origin[0], origin[1], origin[2],
                            size[0], size[1], size[2],
                            cPivot[0], cPivot[1], cPivot[2],
                            cRot[0], cRot[1], cRot[2],
                            inflate, uvX, uvY
                        ));
                    }
                }

                BakedBone bone = new BakedBone(name, pivot[0], pivot[1], pivot[2],
                    rot[0], rot[1], rot[2], cubes, new ArrayList<>());
                boneMap.put(name, bone);
                if (parent != null) parentMap.put(name, parent);
            }

            List<BakedBone> roots = new ArrayList<>();
            for (var entry : boneMap.entrySet()) {
                String parentName = parentMap.get(entry.getKey());
                if (parentName != null && boneMap.containsKey(parentName)) {
                    boneMap.get(parentName).children().add(entry.getValue());
                } else {
                    roots.add(entry.getValue());
                }
            }

            return new BakedGeoModel(texW, texH, roots);
        } catch (Exception e) {
            yebisuRPG.LOGGER.warn("Failed to load geo model {}: {}", loc, e.getMessage());
            return null;
        }
    }

    private float[] readVec3(JsonObject obj, String key) {
        if (!obj.has(key)) return new float[]{0, 0, 0};
        JsonArray arr = obj.getAsJsonArray(key);
        return new float[]{arr.get(0).getAsFloat(), arr.get(1).getAsFloat(), arr.get(2).getAsFloat()};
    }

    // ─── Data records ────────────────────────────────────────────────────────────

    private record GeoItemEntry(ResourceLocation geoLocation, ResourceLocation textureLocation) {}
    private record BakedGeoModel(int texWidth, int texHeight, List<BakedBone> bones) {}
    private record BakedBone(String name, float pivotX, float pivotY, float pivotZ,
                             float rotX, float rotY, float rotZ,
                             List<BakedCube> cubes, List<BakedBone> children) {}
    private record BakedCube(float originX, float originY, float originZ,
                             float sizeX, float sizeY, float sizeZ,
                             float pivotX, float pivotY, float pivotZ,
                             float rotX, float rotY, float rotZ,
                             float inflate, float uvX, float uvY) {}
}
