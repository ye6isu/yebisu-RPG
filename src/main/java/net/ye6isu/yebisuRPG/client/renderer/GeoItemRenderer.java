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
import java.util.List;

@OnlyIn(Dist.CLIENT)
public class GeoItemRenderer extends BlockEntityWithoutLevelRenderer {

    private static final Map<Item, GeoItemEntry> REGISTRY = new HashMap<>();
    private final Map<Item, BakedGeoModel> models = new HashMap<>();
    private final Map<Item, Integer> spritesheetFrameCounts = new HashMap<>();

    private static int currentRenderEntityId = -1;

    public static void setRenderEntity(int entityId) {
        currentRenderEntityId = entityId;
    }

    public static void clearRenderEntity() {
        currentRenderEntityId = -1;
    }

    public GeoItemRenderer(BlockEntityRenderDispatcher dispatcher, EntityModelSet models) {
        super(dispatcher, models);
    }

    public static void register(Item item, ResourceLocation geoLocation, ResourceLocation textureLocation) {
        REGISTRY.put(item, new GeoItemEntry(geoLocation, List.of(textureLocation), 0, false, 0));
    }

    public static void register(Item item, ResourceLocation geoLocation, ResourceLocation textureLocation,
                                 int frames, boolean animated, int ticksPerFrame) {
        REGISTRY.put(item, new GeoItemEntry(geoLocation, List.of(textureLocation), frames, animated, ticksPerFrame));
    }

    public static void register(Item item, ResourceLocation geoLocation, List<ResourceLocation> textureFrames) {
        REGISTRY.put(item, new GeoItemEntry(geoLocation, textureFrames, 0, false, 0));
    }

    public static boolean hasEntry(Item item) {
        return REGISTRY.containsKey(item);
    }

    @Override
    public void onResourceManagerReload(ResourceManager resourceManager) {
        models.clear();
        spritesheetFrameCounts.clear();
        for (var entry : REGISTRY.entrySet()) {
            BakedGeoModel model = loadModel(resourceManager, entry.getValue().geoLocation());
            if (model != null) {
                models.put(entry.getKey(), model);
                if (entry.getValue().textures().size() == 1) {
                    int frames = detectFrameCount(resourceManager, entry.getValue().textures().get(0), model.texHeight());
                    if (frames > 1) {
                        spritesheetFrameCounts.put(entry.getKey(), frames);
                    }
                }
            }
        }
    }

    private int detectFrameCount(ResourceManager mgr, ResourceLocation texLoc, int geoTexHeight) {
        try (InputStream is = mgr.getResourceOrThrow(texLoc).open()) {
            // PNG IHDR: 8-byte signature, 4-byte chunk length, 4-byte "IHDR", 4-byte width, 4-byte height
            byte[] header = new byte[24];
            if (is.read(header) < 24) return 1;
            int pngHeight = ((header[20] & 0xFF) << 24) | ((header[21] & 0xFF) << 16)
                    | ((header[22] & 0xFF) << 8) | (header[23] & 0xFF);
            if (geoTexHeight > 0 && pngHeight > geoTexHeight && pngHeight % geoTexHeight == 0) {
                return pngHeight / geoTexHeight;
            }
        } catch (Exception ignored) {}
        return 1;
    }

    @Override
    public void renderByItem(ItemStack stack, ItemDisplayContext displayContext, PoseStack poseStack,
                             MultiBufferSource buffer, int packedLight, int packedOverlay) {
        Item item = stack.getItem();
        GeoItemEntry entry = REGISTRY.get(item);
        if (entry == null) return;

        BakedGeoModel model = models.get(item);
        if (model == null) return;

        // Resolve item animation data
        boolean isMainHand = displayContext == ItemDisplayContext.FIRST_PERSON_RIGHT_HAND
                || displayContext == ItemDisplayContext.THIRD_PERSON_RIGHT_HAND;
        int entityId = currentRenderEntityId >= 0 ? currentRenderEntityId
                : (Minecraft.getInstance().player != null ? Minecraft.getInstance().player.getId() : -1);

        net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader.AnimData itemAnim = null;
        float timeSecs = 0f;
        if (entityId >= 0) {
            net.ye6isu.yebisuRPG.animation.AnimationCategory cat = isMainHand
                    ? net.ye6isu.yebisuRPG.animation.AnimationCategory.ITEM_MAIN_HAND
                    : net.ye6isu.yebisuRPG.animation.AnimationCategory.ITEM_OFF_HAND;
            net.ye6isu.yebisuRPG.animation.client.ClientAnimationEngine engine =
                    net.ye6isu.yebisuRPG.animation.client.ClientAnimationEngine.INSTANCE;
            var playhead = engine.getPlayhead(entityId, cat);

            if (playhead != null) {
                itemAnim = playhead.filePath() != null
                        ? net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader.INSTANCE.get(playhead.animId(), playhead.filePath())
                        : net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader.INSTANCE.get(playhead.animId());
                if (itemAnim != null) {
                    float raw = playhead.getCurrentTimeSecs();
                    var loopMode = playhead.effectiveLoopMode(itemAnim);
                    timeSecs = (loopMode == net.ye6isu.yebisuRPG.animation.AnimationLoopMode.HOLD_LAST)
                            ? Math.min(raw, itemAnim.length()) : raw;
                }
            } else {
                itemAnim = engine.getItemAnimPose(entityId, isMainHand);
                if (itemAnim != null) {
                    if (itemAnim.loopMode() == net.ye6isu.yebisuRPG.animation.AnimationLoopMode.LOOP && itemAnim.length() > 0f) {
                        timeSecs = engine.getItemPoseElapsedSecs(entityId, isMainHand) % itemAnim.length();
                    } else {
                        timeSecs = itemAnim.length();
                    }
                }
            }
        }

        int customModelData = stack.getOrDefault(
                net.minecraft.core.component.DataComponents.CUSTOM_MODEL_DATA,
                new net.minecraft.world.item.component.CustomModelData(0)).value();

        int resolvedFrameCount = entry.frames() > 1 ? entry.frames()
                : (spritesheetFrameCounts.containsKey(item) ? spritesheetFrameCounts.get(item) : 0);

        int frame;
        if (entry.animated() && resolvedFrameCount > 1) {
            int tpf = Math.max(1, entry.ticksPerFrame());
            long tick = Minecraft.getInstance().level != null ? Minecraft.getInstance().level.getGameTime() : 0;
            frame = (int)((tick / tpf) % resolvedFrameCount);
        } else {
            frame = Math.max(0, customModelData - 1);
        }

        ResourceLocation textureLoc;
        float vFrameOffset = 0f;
        int effectiveTexH;

        if (entry.textures().size() > 1) {
            int idx = Math.min(frame, entry.textures().size() - 1);
            textureLoc = entry.textures().get(idx);
            effectiveTexH = model.texHeight();
        } else {
            textureLoc = entry.textures().get(0);
            if (resolvedFrameCount > 1) {
                int clampedFrame = Math.min(frame, resolvedFrameCount - 1);
                effectiveTexH = model.texHeight() * resolvedFrameCount;
                vFrameOffset = (float)(clampedFrame * model.texHeight());
            } else {
                effectiveTexH = model.texHeight();
            }
        }

        RenderType renderType = RenderType.entityCutoutNoCull(textureLoc);
        VertexConsumer vc = ItemRenderer.getFoilBufferDirect(buffer, renderType, false, stack.hasFoil());

        poseStack.pushPose();
        poseStack.translate(0.5f, 0.5f, 0.5f);
        poseStack.scale(1.0f / 16.0f, 1.0f / 16.0f, 1.0f / 16.0f);

        for (BakedBone bone : model.bones()) {
            renderBone(bone, poseStack, vc, packedLight, packedOverlay, model.texWidth(), effectiveTexH, vFrameOffset, itemAnim, timeSecs);
        }

        poseStack.popPose();
    }

    private void renderBone(BakedBone bone, PoseStack poseStack, VertexConsumer vc,
                            int light, int overlay, int texW, int texH, float vFrameOffset,
                            net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader.AnimData anim,
                            float timeSecs) {
        poseStack.pushPose();

        float px = bone.pivotX(), py = bone.pivotY(), pz = bone.pivotZ();

        // Apply animation overrides for this bone if available
        float animRX = 0, animRY = 0, animRZ = 0;
        float animPX = 0, animPY = 0, animPZ = 0;
        float animSX = 1, animSY = 1, animSZ = 1;
        if (anim != null) {
            var bp = anim.bone(bone.name());
            animRX = bp.rotation().evalX(timeSecs);
            animRY = bp.rotation().evalY(timeSecs);
            animRZ = bp.rotation().evalZ(timeSecs);
            animPX = bp.position().evalX(timeSecs);
            animPY = bp.position().evalY(timeSecs);
            animPZ = bp.position().evalZ(timeSecs);
            animSX = bp.scale().evalX(timeSecs);
            animSY = bp.scale().evalY(timeSecs);
            animSZ = bp.scale().evalZ(timeSecs);
        }

        // Compose base bone rotation + animation rotation via quaternions
        // so animated axes stay correct regardless of base pose
        org.joml.Quaternionf qBase = eulerToQuat(
            (float) Math.toRadians(-bone.rotX()),
            (float) Math.toRadians(-bone.rotY()),
            (float) Math.toRadians(bone.rotZ()));
        org.joml.Quaternionf qAnim = eulerToQuat(
            (float) Math.toRadians(-animRX),
            (float) Math.toRadians(-animRY),
            (float) Math.toRadians(animRZ));
        org.joml.Quaternionf qFinal = qBase.mul(qAnim, new org.joml.Quaternionf());

        poseStack.translate(px + animPX, py + animPY, pz + animPZ);
        poseStack.mulPose(qFinal);
        if (animSX != 1 || animSY != 1 || animSZ != 1) poseStack.scale(animSX, animSY, animSZ);
        poseStack.translate(-px, -py, -pz);

        for (BakedCube cube : bone.cubes()) {
            renderCube(cube, poseStack, vc, light, overlay, texW, texH, vFrameOffset);
        }

        for (BakedBone child : bone.children()) {
            renderBone(child, poseStack, vc, light, overlay, texW, texH, vFrameOffset, anim, timeSecs);
        }

        poseStack.popPose();
    }

    private void renderCube(BakedCube cube, PoseStack poseStack, VertexConsumer vc,
                            int light, int overlay, int texW, int texH, float vFrameOffset) {
        poseStack.pushPose();

        float px = cube.pivotX(), py = cube.pivotY(), pz = cube.pivotZ();
        if (px != 0 || py != 0 || pz != 0) {
            poseStack.translate(px, py, pz);
        }
        if (cube.rotX() != 0 || cube.rotY() != 0 || cube.rotZ() != 0) {
            poseStack.mulPose(eulerToQuat(
                (float) Math.toRadians(-cube.rotX()),
                (float) Math.toRadians(-cube.rotY()),
                (float) Math.toRadians(cube.rotZ())));
        }
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

        float u = cube.uvX(), v = cube.uvY() + vFrameOffset;

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
            x0, y1, z0,  x1, y1, z0,  x1, y1, z1,  x0, y1, z1,
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

    private static org.joml.Quaternionf eulerToQuat(float rx, float ry, float rz) {
        return new org.joml.Quaternionf().rotationZYX(rz, ry, rx);
    }

    private float[] readVec3(JsonObject obj, String key) {
        if (!obj.has(key)) return new float[]{0, 0, 0};
        JsonArray arr = obj.getAsJsonArray(key);
        return new float[]{arr.get(0).getAsFloat(), arr.get(1).getAsFloat(), arr.get(2).getAsFloat()};
    }

    // ─── Data records ────────────────────────────────────────────────────────────

    private record GeoItemEntry(ResourceLocation geoLocation, List<ResourceLocation> textures,
                                    int frames, boolean animated, int ticksPerFrame) {}
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
