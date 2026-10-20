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
    private final Map<Item, List<BakedGeoModel>> models = new HashMap<>();
    private final Map<Item, Map<Integer, Integer>> spritesheetFrameCounts = new HashMap<>();

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
        REGISTRY.put(item, new GeoItemEntry(List.of(geoLocation), List.of(textureLocation), List.of(StateAnim.NONE)));
    }

    public static void register(Item item, ResourceLocation geoLocation, ResourceLocation textureLocation,
                                 int frames, boolean animated, int ticksPerFrame) {
        REGISTRY.put(item, new GeoItemEntry(List.of(geoLocation), List.of(textureLocation), List.of(new StateAnim(frames, animated, ticksPerFrame))));
    }

    public static void register(Item item, ResourceLocation geoLocation, List<ResourceLocation> textureFrames) {
        List<StateAnim> anims = new ArrayList<>();
        for (int i = 0; i < textureFrames.size(); i++) anims.add(StateAnim.NONE);
        REGISTRY.put(item, new GeoItemEntry(List.of(geoLocation), textureFrames, anims));
    }

    public static void register(Item item, List<ResourceLocation> geoLocations, List<ResourceLocation> textures) {
        List<StateAnim> anims = new ArrayList<>();
        for (int i = 0; i < textures.size(); i++) anims.add(StateAnim.NONE);
        REGISTRY.put(item, new GeoItemEntry(geoLocations, textures, anims));
    }

    public static void register(Item item, List<ResourceLocation> geoLocations, List<ResourceLocation> textures,
                                 List<StateAnim> stateAnims) {
        REGISTRY.put(item, new GeoItemEntry(geoLocations, textures, stateAnims));
    }

    public static boolean hasEntry(Item item) {
        return REGISTRY.containsKey(item);
    }

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
            if (!bakedModels.isEmpty()) {
                models.put(entry.getKey(), bakedModels);
                List<ResourceLocation> textures = entry.getValue().textures();
                Map<Integer, Integer> frameCounts = new HashMap<>();
                for (int i = 0; i < textures.size(); i++) {
                    BakedGeoModel modelForState = bakedModels.get(Math.min(i, bakedModels.size() - 1));
                    int frames = detectFrameCount(resourceManager, textures.get(i), modelForState.texWidth(), modelForState.texHeight());
                    if (frames > 1) frameCounts.put(i, frames);
                }
                if (!frameCounts.isEmpty()) spritesheetFrameCounts.put(entry.getKey(), frameCounts);
            }
        }
    }

    private int detectFrameCount(ResourceManager mgr, ResourceLocation texLoc, int geoTexWidth, int geoTexHeight) {
        try (InputStream is = mgr.getResourceOrThrow(texLoc).open()) {
            byte[] header = new byte[24];
            if (is.read(header) < 24) return 1;
            int pngWidth = ((header[16] & 0xFF) << 24) | ((header[17] & 0xFF) << 16)
                    | ((header[18] & 0xFF) << 8) | (header[19] & 0xFF);
            int pngHeight = ((header[20] & 0xFF) << 24) | ((header[21] & 0xFF) << 16)
                    | ((header[22] & 0xFF) << 8) | (header[23] & 0xFF);
            if (geoTexWidth <= 0 || geoTexHeight <= 0) return 1;
            // Check aspect ratio: a spritesheet has the same width:geoWidth ratio
            // but a taller height. A uniformly scaled texture has equal ratios.
            int wScale = pngWidth / geoTexWidth;
            int hScale = pngHeight / geoTexHeight;
            if (wScale > 0 && hScale > wScale && pngWidth == geoTexWidth * wScale && pngHeight % (geoTexHeight * wScale) == 0) {
                return pngHeight / (geoTexHeight * wScale);
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

        List<BakedGeoModel> modelList = models.get(item);
        if (modelList == null || modelList.isEmpty()) return;
        BakedGeoModel model = null; // resolved after itemState is computed

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
        int itemState = stack.getOrDefault(
                net.ye6isu.yebisuRPG.component.ModDataComponents.ITEM_STATE.get(), 0);

        model = modelList.get(Math.min(itemState, modelList.size() - 1));

        int texIdx = Math.min(itemState, entry.textures().size() - 1);
        ResourceLocation textureLoc = entry.textures().get(texIdx);
        StateAnim stateAnim = texIdx < entry.stateAnims().size() ? entry.stateAnims().get(texIdx) : StateAnim.NONE;

        Map<Integer, Integer> frameCounts = spritesheetFrameCounts.get(item);
        int detectedFrames = frameCounts != null && frameCounts.containsKey(texIdx) ? frameCounts.get(texIdx) : 0;
        int resolvedFrameCount = stateAnim.frames() > 1 ? stateAnim.frames() : detectedFrames;

        int frame;
        if (resolvedFrameCount > 1) {
            if (stateAnim.animated()) {
                int tpf = Math.max(1, stateAnim.ticksPerFrame() > 0 ? stateAnim.ticksPerFrame() : 4);
                long tick = Minecraft.getInstance().level != null ? Minecraft.getInstance().level.getGameTime() : 0;
                frame = (int)((tick / tpf) % resolvedFrameCount);
            } else {
                frame = Math.max(0, customModelData - 1);
            }
        } else {
            frame = 0;
        }

        float vFrameOffset = 0f;
        int effectiveTexH;
        if (resolvedFrameCount > 1) {
            int clampedFrame = Math.min(frame, resolvedFrameCount - 1);
            effectiveTexH = model.texHeight() * resolvedFrameCount;
            vFrameOffset = (float)(clampedFrame * model.texHeight());
        } else {
            effectiveTexH = model.texHeight();
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

        // Nudge coplanar faces apart to prevent z-fighting on zero-width axes
        float eps = 0.001f;
        if (sx == 0) { x0 -= eps; x1 += eps; }
        if (sy == 0) { y0 -= eps; y1 += eps; }
        if (sz == 0) { z0 -= eps; z1 += eps; }

        if (cube.hasPerFaceUV()) {
            FaceUV[] pf = cube.perFaceUV();
            // 0=south(+Z), 1=north(-Z), 2=west(-X), 3=east(+X), 4=up(+Y), 5=down(-Y)
            emitPerFace(mat, norm, vc, light, overlay, texW, texH, vFrameOffset, pf[0],
                x0, y0, z1,  x1, y0, z1,  x1, y1, z1,  x0, y1, z1,  0, 0, 1);
            emitPerFace(mat, norm, vc, light, overlay, texW, texH, vFrameOffset, pf[1],
                x1, y0, z0,  x0, y0, z0,  x0, y1, z0,  x1, y1, z0,  0, 0, -1);
            emitPerFace(mat, norm, vc, light, overlay, texW, texH, vFrameOffset, pf[2],
                x0, y0, z0,  x0, y0, z1,  x0, y1, z1,  x0, y1, z0,  -1, 0, 0);
            emitPerFace(mat, norm, vc, light, overlay, texW, texH, vFrameOffset, pf[3],
                x1, y0, z1,  x1, y0, z0,  x1, y1, z0,  x1, y1, z1,  1, 0, 0);
            emitPerFace(mat, norm, vc, light, overlay, texW, texH, vFrameOffset, pf[4],
                x0, y1, z0,  x1, y1, z0,  x1, y1, z1,  x0, y1, z1,  0, 1, 0);
            emitPerFace(mat, norm, vc, light, overlay, texW, texH, vFrameOffset, pf[5],
                x0, y0, z1,  x1, y0, z1,  x1, y0, z0,  x0, y0, z0,  0, -1, 0);
        } else {
            float u = cube.uvX(), v = cube.uvY() + vFrameOffset;

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

            // Top face (+Y)
            quad(mat, norm, vc, light, overlay, texW, texH,
                x0, y1, z0,  x1, y1, z0,  x1, y1, z1,  x0, y1, z1,
                u + sz, v, sx, sz, 0, 1, 0);

            // Bottom face (-Y)
            quad(mat, norm, vc, light, overlay, texW, texH,
                x0, y0, z0,  x1, y0, z0,  x1, y0, z1,  x0, y0, z1,
                u + sz + sx, v, sx, sz, 0, -1, 0);
        }

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

    private void emitPerFace(Matrix4f mat, Matrix3f norm, VertexConsumer vc, int light, int overlay,
                             int texW, int texH, float vFrameOffset, FaceUV face,
                             float x0, float y0, float z0,
                             float x1, float y1, float z1,
                             float x2, float y2, float z2,
                             float x3, float y3, float z3,
                             float nx, float ny, float nz) {
        if (face == null || (face.uSize() == 0 && face.vSize() == 0)) return;
        quad(mat, norm, vc, light, overlay, texW, texH,
            x0, y0, z0,  x1, y1, z1,  x2, y2, z2,  x3, y3, z3,
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
                        JsonObject c = cubeEl.getAsJsonObject();
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
                                JsonObject uvObj = uvEl.getAsJsonObject();
                                perFaceUV = new FaceUV[6];
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
                            }
                        }

                        cubes.add(new BakedCube(
                            origin[0], origin[1], origin[2],
                            size[0], size[1], size[2],
                            cPivot[0], cPivot[1], cPivot[2],
                            cRot[0], cRot[1], cRot[2],
                            inflate, uvX, uvY, perFaceUV
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
