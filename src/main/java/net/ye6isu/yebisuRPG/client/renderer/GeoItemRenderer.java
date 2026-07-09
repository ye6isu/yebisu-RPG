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
        REGISTRY.put(item, new GeoItemEntry(List.of(
                new ItemStateEntry(StateKind.GEO, geoLoc, texLoc, StateAnim.NONE, null, null))));
    }

    public static void register(Item item, ResourceLocation geoLoc, ResourceLocation texLoc,
                                int frames, boolean animated, int ticksPerFrame) {
        register(item, geoLoc, texLoc, frames, animated, ticksPerFrame, 0);
    }

    public static void register(Item item, ResourceLocation geoLoc, ResourceLocation texLoc,
                                int frames, boolean animated, int ticksPerFrame, int defaultFrame) {
        REGISTRY.put(item, new GeoItemEntry(List.of(new ItemStateEntry(StateKind.GEO, geoLoc, texLoc,
                new StateAnim(frames, animated, ticksPerFrame, defaultFrame), null, null))));
    }

    public static void register(Item item, List<ResourceLocation> geoLocs, List<ResourceLocation> textures) {
        List<ItemStateEntry> states = new ArrayList<>();
        for (int i = 0; i < geoLocs.size(); i++) {
            states.add(new ItemStateEntry(StateKind.GEO, geoLocs.get(i), textures.get(i), StateAnim.NONE, null, null));
        }
        REGISTRY.put(item, new GeoItemEntry(states));
    }

    public static void register(Item item, List<ResourceLocation> geoLocs, List<ResourceLocation> textures,
                                List<StateAnim> stateAnims) {
        List<ItemStateEntry> states = new ArrayList<>();
        for (int i = 0; i < geoLocs.size(); i++) {
            StateAnim anim = i < stateAnims.size() ? stateAnims.get(i) : StateAnim.NONE;
            states.add(new ItemStateEntry(StateKind.GEO, geoLocs.get(i), textures.get(i), anim, null, null));
        }
        REGISTRY.put(item, new GeoItemEntry(states));
    }

    /** Full mixed-state registration — each state independently GEO (3D bone-rendered) or FLAT (baked-quad rendered). */
    public static void registerMixed(Item item, List<ItemStateEntry> states) {
        REGISTRY.put(item, new GeoItemEntry(states));
    }

    public static boolean hasEntry(Item item) {
        return REGISTRY.containsKey(item);
    }

    /**
     * All {@code flatModelLoc}s across every registered FLAT state, across every item — these are
     * loose model files not tied to any real Item registration, so they must be explicitly baked via
     * {@code ModelEvent.RegisterAdditional} (see {@code GeoItemRegistry.onRegisterAdditionalModels})
     * or {@code ModelManager.getModel} silently falls back to the missing/checkerboard model.
     */
    public static List<ResourceLocation> getAllFlatModelLocations() {
        List<ResourceLocation> locs = new ArrayList<>();
        for (GeoItemEntry entry : REGISTRY.values()) {
            for (ItemStateEntry state : entry.states()) {
                if (state.kind() != StateKind.FLAT) continue;
                if (state.flatModelLoc() != null) locs.add(state.flatModelLoc());
                StateAnim anim = state.stateAnim() != null ? state.stateAnim() : StateAnim.NONE;
                if (anim.frames() > 1 && !anim.animated() && state.flatFrameModelBase() != null) {
                    for (int f = 0; f < anim.frames(); f++) {
                        locs.add(state.flatFrameModelBase().withSuffix("_frame" + f));
                    }
                }
            }
        }
        return locs;
    }

    // ─── Resource reload ─────────────────────────────────────────────────────────

    @Override
    public void onResourceManagerReload(ResourceManager resourceManager) {
        models.clear();
        spritesheetFrameCounts.clear();
        for (var entry : REGISTRY.entrySet()) {
            List<ItemStateEntry> states = entry.getValue().states();
            List<BakedGeoModel> bakedModels = new ArrayList<>();
            Map<Integer, Integer> frameCounts = new HashMap<>();

            for (int i = 0; i < states.size(); i++) {
                ItemStateEntry state = states.get(i);
                if (state.kind() == StateKind.GEO) {
                    BakedGeoModel model = loadModel(resourceManager, state.geoLoc());
                    if (model != null) {
                        bakedModels.add(model);
                        int frames = detectFrameCount(resourceManager, state.texture(), model.texWidth(), model.texHeight());
                        if (frames > 1) frameCounts.put(i, frames);
                        continue;
                    }
                }
                // FLAT states (or a GEO state whose model failed to load) have no bone data —
                // keep index alignment with `states` by inserting a placeholder.
                bakedModels.add(null);
            }

            if (!bakedModels.isEmpty()) models.put(entry.getKey(), bakedModels);
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

        List<ItemStateEntry> states = entry.states();
        if (states.isEmpty()) return;

        int customModelData = stack.getOrDefault(
                net.minecraft.core.component.DataComponents.CUSTOM_MODEL_DATA,
                new net.minecraft.world.item.component.CustomModelData(0)).value();
        int itemState = Math.min(Math.max(0, customModelData), states.size() - 1);

        ItemStateEntry state = states.get(itemState);
        if (state.kind() == StateKind.FLAT) {
            renderFlatState(stack, item, itemState, state, displayContext, poseStack, buffer, packedLight, packedOverlay);
        } else {
            renderGeoState(stack, item, itemState, state, displayContext, poseStack, buffer, packedLight, packedOverlay);
        }
    }

    private void renderGeoState(ItemStack stack, Item item, int itemState, ItemStateEntry state,
                                ItemDisplayContext displayContext, PoseStack poseStack, MultiBufferSource buffer,
                                int packedLight, int packedOverlay) {
        List<BakedGeoModel> modelList = models.get(item);
        if (modelList == null || itemState >= modelList.size()) return;
        BakedGeoModel model = modelList.get(itemState);
        if (model == null) return;

        StateAnim stateAnim = state.stateAnim() != null ? state.stateAnim() : StateAnim.NONE;

        Map<Integer, Integer> frameCounts = spritesheetFrameCounts.get(item);
        int detectedFrames = frameCounts != null && frameCounts.containsKey(itemState) ? frameCounts.get(itemState) : 0;
        int resolvedFrameCount = stateAnim.frames() > 1 ? stateAnim.frames() : detectedFrames;

        int frame = 0;
        if (resolvedFrameCount > 1) {
            if (stateAnim.animated()) {
                int tpf = Math.max(1, stateAnim.ticksPerFrame() > 0 ? stateAnim.ticksPerFrame() : 4);
                long tick = Minecraft.getInstance().level != null ? Minecraft.getInstance().level.getGameTime() : 0;
                frame = net.ye6isu.yebisuRPG.texture.TextureFrameClock.frameAt(
                        tick, tpf, resolvedFrameCount, net.ye6isu.yebisuRPG.texture.FrameLoopMode.LOOP);
            } else {
                // ITEM_FRAME is independent of CustomModelData (which only picks the active state) —
                // each state's spritesheet has its own frame dial via this separate component.
                Integer itemFrame = stack.get(net.ye6isu.yebisuRPG.component.ModDataComponents.ITEM_FRAME.get());
                frame = itemFrame != null ? itemFrame : stateAnim.defaultFrame();
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

        RenderType renderType = RenderType.entityCutoutNoCull(state.texture());
        VertexConsumer vc = ItemRenderer.getFoilBufferDirect(buffer, renderType, false, stack.hasFoil());

        poseStack.pushPose();
        poseStack.translate(0.5f, 0.5f, 0.5f);
        poseStack.scale(1.0f / 16.0f, 1.0f / 16.0f, 1.0f / 16.0f);

        ItemAnimContext animCtx = resolveItemAnimContext();

        for (BakedBone bone : model.bones()) {
            renderBone(bone, poseStack, vc, packedLight, packedOverlay, model.texWidth(), effectiveTexH, vFrameOffset, animCtx);
        }

        poseStack.popPose();
    }

    /**
     * Resolves the item-animation pose (if any) for whichever entity/hand is currently being
     * rendered, per {@link net.ye6isu.yebisuRPG.animation.client.ItemRenderContextHolder} —
     * only populated for third-person held items (see {@code MixinItemInHandLayer}); first-person
     * items bypass this renderer entirely, so {@code animCtx} is {@code null} there.
     */
    private ItemAnimContext resolveItemAnimContext() {
        if (!net.ye6isu.yebisuRPG.animation.client.ItemRenderContextHolder.ACTIVE.get()) return null;
        int entityId = net.ye6isu.yebisuRPG.animation.client.ItemRenderContextHolder.ENTITY_ID.get();
        boolean mainHand = net.ye6isu.yebisuRPG.animation.client.ItemRenderContextHolder.MAIN_HAND.get();
        if (entityId < 0) return null;

        var engine = net.ye6isu.yebisuRPG.animation.client.ClientAnimationEngine.INSTANCE;
        var category = mainHand
                ? net.ye6isu.yebisuRPG.animation.AnimationCategory.ITEM_MAIN_HAND
                : net.ye6isu.yebisuRPG.animation.AnimationCategory.ITEM_OFF_HAND;
        var playhead = engine.getPlayhead(entityId, category);
        var blender = engine.getBlender(entityId, category);

        net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader.AnimData poseAnim =
                playhead == null ? engine.getItemAnimPose(entityId, mainHand) : null;
        if (playhead == null && blender == null && poseAnim == null) return null;

        net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader.AnimData anim;
        if (playhead != null) {
            anim = playhead.filePath() != null
                    ? net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader.INSTANCE.get(playhead.animId(), playhead.filePath())
                    : net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader.INSTANCE.get(playhead.animId());
        } else {
            anim = poseAnim;
        }
        if (anim == null && blender == null) return null;

        float timeSecs = 0f;
        if (playhead == null) {
            if (anim != null && anim.loopMode() == net.ye6isu.yebisuRPG.animation.AnimationLoopMode.LOOP && anim.length() > 0f) {
                float elapsed = engine.getItemPoseElapsedSecs(entityId, mainHand);
                timeSecs = elapsed % anim.length();
            } else if (anim != null) {
                timeSecs = anim.length();
            }
        } else {
            float raw = playhead.getCurrentTimeSecs();
            timeSecs = (anim != null && playhead.effectiveLoopMode(anim) == net.ye6isu.yebisuRPG.animation.AnimationLoopMode.HOLD_LAST)
                    ? Math.min(raw, anim.length())
                    : raw;
        }

        float weight = 1.0f;
        if (playhead != null) {
            float partialTick = Minecraft.getInstance().getTimer().getGameTimeDeltaPartialTick(true);
            weight *= playhead.getBlendInWeight(partialTick);
        }
        if (blender != null && blender.isActive()) {
            float partialTick = Minecraft.getInstance().getTimer().getGameTimeDeltaPartialTick(true);
            weight *= 1.0f - blender.getBlendAlpha(partialTick);
        }
        if (weight <= 0f) weight = 0.001f;

        return new ItemAnimContext(anim, timeSecs, weight);
    }

    /** Resolved item-animation pose for the current render call — null when nothing is playing/posed. */
    private record ItemAnimContext(
            net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader.AnimData anim,
            float timeSecs, float weight) {}

    /**
     * Renders a FLAT-kind state — a plain vanilla item model (e.g. {@code minecraft:item/generated})
     * resolved and baked directly, bypassing model-resolution/custom-renderer dispatch (which would
     * otherwise loop back to this same renderer, since the Item's base model is {@code builtin/entity}).
     * This lets one Item mix 3D geo states and flat icon states, since vanilla itself only decides
     * "custom renderer vs. not" once per Item, not per CustomModelData value. Vanilla never applies an
     * ItemTransform for custom-rendered items (that branch is skipped entirely in ItemRenderer), so this
     * renders the flat model's raw baked quads directly with no additional pose applied.
     */
    private void renderFlatState(ItemStack stack, Item item, int itemState, ItemStateEntry state,
                                 ItemDisplayContext displayContext, PoseStack poseStack, MultiBufferSource buffer,
                                 int packedLight, int packedOverlay) {
        StateAnim stateAnim = state.stateAnim() != null ? state.stateAnim() : StateAnim.NONE;

        ResourceLocation resolvedLoc = state.flatModelLoc();
        // Non-animated multi-frame flat state: pick a per-frame model via ITEM_FRAME, independent of
        // CustomModelData (which only ever picks the active state). Animated flat states need no code
        // here at all — their vanilla .mcmeta handles playback with no custom logic.
        if (stateAnim.frames() > 1 && !stateAnim.animated() && state.flatFrameModelBase() != null) {
            Integer itemFrame = stack.get(net.ye6isu.yebisuRPG.component.ModDataComponents.ITEM_FRAME.get());
            int frame = itemFrame != null ? Math.min(Math.max(itemFrame, 0), stateAnim.frames() - 1) : stateAnim.defaultFrame();
            resolvedLoc = state.flatFrameModelBase().withSuffix("_frame" + frame);
        }
        if (resolvedLoc == null) return;

        var modelManager = Minecraft.getInstance().getModelManager();
        var modelLoc = new net.minecraft.client.resources.model.ModelResourceLocation(
                resolvedLoc, net.minecraft.client.resources.model.ModelResourceLocation.STANDALONE_VARIANT);
        var bakedModel = modelManager.getModel(modelLoc);
        if (bakedModel == null) return;

        Minecraft.getInstance().getItemRenderer().render(
                stack, displayContext, false, poseStack, buffer, packedLight, packedOverlay, bakedModel);
    }

    private void renderBone(BakedBone bone, PoseStack poseStack, VertexConsumer vc,
                            int light, int overlay, int texW, int texH, float vFrameOffset,
                            ItemAnimContext animCtx) {
        poseStack.pushPose();

        float px = bone.pivotX(), py = bone.pivotY(), pz = bone.pivotZ();

        float animRX = 0f, animRY = 0f, animRZ = 0f;
        float animPX = 0f, animPY = 0f, animPZ = 0f;
        float animSX = 1f, animSY = 1f, animSZ = 1f;
        if (animCtx != null && animCtx.anim() != null) {
            var bonePose = animCtx.anim().bone(bone.name());
            float t = animCtx.timeSecs(), w = animCtx.weight();
            animRX = bonePose.rotation().evalX(t) * w;
            animRY = bonePose.rotation().evalY(t) * w;
            animRZ = bonePose.rotation().evalZ(t) * w;
            animPX = bonePose.position().evalX(t) * w;
            animPY = bonePose.position().evalY(t) * w;
            animPZ = bonePose.position().evalZ(t) * w;
            animSX = 1f + (bonePose.scale().evalX(t) - 1f) * w;
            animSY = 1f + (bonePose.scale().evalY(t) - 1f) * w;
            animSZ = 1f + (bonePose.scale().evalZ(t) - 1f) * w;
        }

        Quaternionf q = eulerToQuat(
                (float) Math.toRadians(-(bone.rotX() + animRX)),
                (float) Math.toRadians(-(bone.rotY() + animRY)),
                (float) Math.toRadians(bone.rotZ() + animRZ));

        poseStack.translate(px, py, pz);
        poseStack.mulPose(q);
        poseStack.translate(-px, -py, -pz);
        if (animPX != 0f || animPY != 0f || animPZ != 0f) {
            poseStack.translate(animPX, -animPY, animPZ);
        }
        if (animSX != 1f || animSY != 1f || animSZ != 1f) {
            poseStack.scale(animSX, animSY, animSZ);
        }

        for (BakedCube cube : bone.cubes()) {
            renderCube(cube, poseStack, vc, light, overlay, texW, texH, vFrameOffset);
        }

        for (BakedBone child : bone.children()) {
            renderBone(child, poseStack, vc, light, overlay, texW, texH, vFrameOffset, animCtx);
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

    public record StateAnim(int frames, boolean animated, int ticksPerFrame, int defaultFrame) {
        public static final StateAnim NONE = new StateAnim(0, false, 0, 0);

        public StateAnim(int frames, boolean animated, int ticksPerFrame) {
            this(frames, animated, ticksPerFrame, 0);
        }
    }

    /** Whether a state is a 3D bone-rendered geo model, or a flat vanilla-style baked item model. */
    public enum StateKind { GEO, FLAT }

    /**
     * One entry in an item's state list, selected at render time by {@code CustomModelData}.
     * {@code geoLoc} is only used for {@code GEO} states; {@code flatModelLoc} only for {@code FLAT} states.
     * {@code texture} is the geo texture for {@code GEO} states (spritesheet-capable via {@code stateAnim}).
     * {@code stateAnim} also carries a FLAT state's own spritesheet info (frames/animated/ticksPerFrame/
     * defaultFrame) — animated flat states rely entirely on the vanilla {@code .mcmeta} file (no code
     * needed here); non-animated multi-frame flat states resolve a per-frame model via
     * {@code flatFrameModelBase} + {@link net.ye6isu.yebisuRPG.component.ModDataComponents#ITEM_FRAME}
     * (independent of {@code CustomModelData}, which only ever picks the active state).
     */
    public record ItemStateEntry(StateKind kind, ResourceLocation geoLoc, ResourceLocation texture,
                                 StateAnim stateAnim, ResourceLocation flatModelLoc, ResourceLocation displayModelLoc,
                                 ResourceLocation flatFrameModelBase) {
        public ItemStateEntry(StateKind kind, ResourceLocation geoLoc, ResourceLocation texture,
                              StateAnim stateAnim, ResourceLocation flatModelLoc, ResourceLocation displayModelLoc) {
            this(kind, geoLoc, texture, stateAnim, flatModelLoc, displayModelLoc, null);
        }
    }

    private record GeoItemEntry(List<ItemStateEntry> states) {}
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
