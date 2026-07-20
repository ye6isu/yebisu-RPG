package net.ye6isu.yebisuRPG.entity.client;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import net.minecraft.client.model.EntityModel;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead;
import net.ye6isu.yebisuRPG.animation.client.ClientAnimationEngine;
import net.ye6isu.yebisuRPG.animation.client.HandAnimationLoader;
import net.ye6isu.yebisuRPG.entity.client.GeoEntityModelLoader.BakedBone;
import net.ye6isu.yebisuRPG.entity.client.GeoEntityModelLoader.BakedCube;
import net.ye6isu.yebisuRPG.entity.client.GeoEntityModelLoader.BakedGeoModel;
import net.ye6isu.yebisuRPG.entity.client.GeoEntityModelLoader.FaceUV;
import net.ye6isu.yebisuRPG.entity.custom.YcsMobEntity;
import org.joml.Matrix3f;
import org.joml.Matrix4f;
import org.joml.Quaternionf;
import org.joml.Vector3f;

import java.util.ArrayList;
import java.util.List;

/**
 * A generic {@link EntityModel} whose bones/cubes come entirely from a mob's own
 * {@code .geo.json} (see {@link GeoEntityModelLoader}), posed every frame by
 * sampling that same mob's Bedrock {@code .animation.json} via the mod's existing
 * {@link HandAnimationLoader} sampler/interpolator — the exact same easing/Bezier/
 * Catmull-Rom math used by first/third-person player and item animation, just
 * evaluated against arbitrary named bones instead of {@code PlayerModel}'s fixed six.
 *
 * <p>Rendering is manual per-face vertex emission (mirroring {@code GeoItemRenderer.
 * renderBone}/{@code renderCube}) rather than vanilla's {@code ModelPart}, since
 * vanilla's {@code CubeListBuilder} only supports the classic single-origin "box UV"
 * layout — it has no public API for Bedrock's independent per-face UV rects, which
 * is what real exported models (see {@code uploaded/tester.geo.json}) actually use.
 * Vanilla's own {@link net.minecraft.client.renderer.entity.LivingEntityRenderer#render}
 * still drives all the surrounding positioning/scale/rotation setup and calls
 * {@link #setupAnim}/{@link #renderToBuffer} at the right time — only the bone/cube
 * geometry emission itself bypasses {@code ModelPart}.</p>
 *
 * <p>Animation is resolved per bone from fixed-priority layers: idle (0), walk
 * (100), then an active third-person action (200). The highest active layer that
 * actually authors a bone owns that bone, so walk arms work normally until an
 * action overrides them while walk-only legs continue underneath. Idle/walk use
 * vanilla-synced movement state; actions use the existing synchronized playhead.</p>
 */
public class GeoEntityModel<T extends YcsMobEntity> extends EntityModel<T> {

    private static final int IDLE_PRIORITY = 0;
    private static final int WALK_PRIORITY = 100;
    private static final int ACTION_PRIORITY = 200;

    private final BakedGeoModel model;
    private final String animationFile;
    private final String idleAnim;
    private final String walkAnim;
    private final String headBone;

    private final List<AnimationLayer> animationLayers = new ArrayList<>(3);
    private float headYaw;
    private float headPitch;

    public GeoEntityModel(BakedGeoModel model, String animationFile, String idleAnim, String walkAnim, String headBone) {
        this.model = model;
        this.animationFile = animationFile;
        this.idleAnim = idleAnim;
        this.walkAnim = walkAnim;
        this.headBone = headBone;
    }

    @Override
    public void setupAnim(T entity, float limbSwing, float limbSwingAmount, float ageInTicks, float netHeadYaw, float headPitch) {
        animationLayers.clear();
        // Mirrors vanilla HumanoidModel.setupAnim's head.yRot/head.xRot — plain degrees
        // converted to radians, applied as an additional local rotation on the named head
        // bone in renderBone below (added on top of whatever the current animation pose sets).
        this.headYaw = netHeadYaw * ((float) Math.PI / 180F);
        this.headPitch = headPitch * ((float) Math.PI / 180F);

        if (idleAnim != null && !idleAnim.isEmpty()) {
            HandAnimationLoader.AnimData animation =
                    HandAnimationLoader.INSTANCE.get(idleAnim, animationFile);
            if (animation != null) {
                animationLayers.add(new AnimationLayer(
                        IDLE_PRIORITY, animation, sampleTime(animation, ageInTicks / 20.0f)));
            }
        }

        boolean walking = limbSwingAmount > 0.05f;
        if (walking && walkAnim != null && !walkAnim.isEmpty()) {
            HandAnimationLoader.AnimData animation =
                    HandAnimationLoader.INSTANCE.get(walkAnim, animationFile);
            if (animation != null) {
                animationLayers.add(new AnimationLayer(
                        WALK_PRIORITY, animation, sampleTime(animation, limbSwing * 0.1f)));
            }
        }

        AnimationPlayhead action = ClientAnimationEngine.INSTANCE.getPlayhead(
                entity.getId(), AnimationCategory.ENTITY_THIRD_PERSON);
        if (action != null && action.isPlaying()) {
            String file = action.filePath() != null ? action.filePath() : animationFile;
            HandAnimationLoader.AnimData animation =
                    HandAnimationLoader.INSTANCE.get(action.animId(), file);
            if (animation != null) {
                animationLayers.add(new AnimationLayer(
                        ACTION_PRIORITY, animation, sampleTime(animation, action.getCurrentTimeSecs())));
            }
        }
    }

    @Override
    public void renderToBuffer(PoseStack poseStack, VertexConsumer buffer, int packedLight, int packedOverlay, int color) {
        if (model == null) return;
        poseStack.pushPose();
        // LivingEntityRenderer.render() already applies poseStack.scale(-1, -1, 1) before
        // calling here (vanilla ModelPart geometry is authored expecting that flip) — this
        // bone-tree render loop is ported from GeoItemRenderer, whose own pipeline (renderByItem)
        // never applies that flip, so cube Y coordinates here are unflipped Bedrock Y-up space.
        // Counteract the inherited flip so bones don't end up upside down.
        poseStack.scale(1.0F, -1.0F, 1.0F);
        // LivingEntityRenderer.render() also applies poseStack.translate(0, -1.501, 0) before
        // calling here — vanilla ModelPart geometry is authored with its vertical origin at
        // roughly eye height, so vanilla shifts that down to the feet before rendering. Bedrock
        // geo models (see uploaded/tester.geo.json) are authored with the origin already at the
        // feet, so that shift must be undone here, in our own (unflipped) coordinate space —
        // otherwise every mob floats ~1.5 blocks above its hitbox.
        poseStack.translate(0.0F, -1.501F, 0.0F);
        // Bedrock geo cubes are authored in 16-units-per-block space with the origin at the
        // entity's feet — GeoItemRenderer.renderByItem applies this exact same 1/16 scale-down
        // (it needs no feet-to-center translate since items pivot at block-center, not feet).
        // Omitting this renders the whole model 16x too large.
        poseStack.scale(1.0F / 16.0F, 1.0F / 16.0F, 1.0F / 16.0F);
        for (BakedBone bone : model.bones()) {
            renderBone(bone, poseStack, buffer, packedLight, packedOverlay, model.texWidth(), model.texHeight());
        }
        poseStack.popPose();
    }

    private void renderBone(BakedBone bone, PoseStack poseStack, VertexConsumer vc, int light, int overlay, int texW, int texH) {
        poseStack.pushPose();

        float px = bone.pivotX(), py = bone.pivotY(), pz = bone.pivotZ();

        float animRX = 0f, animRY = 0f, animRZ = 0f;
        float animPX = 0f, animPY = 0f, animPZ = 0f;
        float animSX = 1f, animSY = 1f, animSZ = 1f;
        AnimationLayer layer = resolveLayer(bone.name());
        if (layer != null) {
            HandAnimationLoader.BonePose bonePose = layer.animation().bone(bone.name());
            animRX = bonePose.rotation().evalX(layer.time());
            animRY = bonePose.rotation().evalY(layer.time());
            animRZ = bonePose.rotation().evalZ(layer.time());
            animPX = bonePose.position().evalX(layer.time());
            animPY = bonePose.position().evalY(layer.time());
            animPZ = bonePose.position().evalZ(layer.time());
            animSX = bonePose.scale().evalX(layer.time());
            animSY = bonePose.scale().evalY(layer.time());
            animSZ = bonePose.scale().evalZ(layer.time());
        }

        Quaternionf q = eulerToQuat(
                (float) Math.toRadians(-(bone.rotX() + animRX)),
                (float) Math.toRadians(-bone.rotY() + animRY),
                (float) Math.toRadians(bone.rotZ() + animRZ));

        poseStack.translate(px, py, pz);
        poseStack.mulPose(q);
        // Look At Player's tracked yaw/pitch is applied as an additional local rotation on
        // the entity's configured head bone, on top of its animated pose — matches vanilla
        // HumanoidModel applying head.yRot/head.xRot directly onto the head ModelPart.
        if (headBone != null && !headBone.isEmpty() && headBone.equals(bone.name())) {
            poseStack.mulPose(new Quaternionf().rotationYXZ(headYaw, -headPitch, 0f));
        }
        poseStack.translate(-px, -py, -pz);
        if (animPX != 0f || animPY != 0f || animPZ != 0f) {
            poseStack.translate(animPX, -animPY, animPZ);
        }
        if (animSX != 1f || animSY != 1f || animSZ != 1f) {
            poseStack.scale(animSX, animSY, animSZ);
        }

        for (BakedCube cube : bone.cubes()) {
            renderCube(cube, poseStack, vc, light, overlay, texW, texH);
        }
        for (BakedBone child : bone.children()) {
            renderBone(child, poseStack, vc, light, overlay, texW, texH);
        }

        poseStack.popPose();
    }

    private void renderCube(BakedCube cube, PoseStack poseStack, VertexConsumer vc, int light, int overlay, int texW, int texH) {
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
            emitPerFace(mat, norm, vc, light, overlay, texW, texH, pf[0], x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1, 0,0,1);
            emitPerFace(mat, norm, vc, light, overlay, texW, texH, pf[1], x1,y0,z0, x0,y0,z0, x0,y1,z0, x1,y1,z0, 0,0,-1);
            emitPerFace(mat, norm, vc, light, overlay, texW, texH, pf[2], x0,y0,z0, x0,y0,z1, x0,y1,z1, x0,y1,z0, -1,0,0);
            emitPerFace(mat, norm, vc, light, overlay, texW, texH, pf[3], x1,y0,z1, x1,y0,z0, x1,y1,z0, x1,y1,z1, 1,0,0);
            emitPerFace(mat, norm, vc, light, overlay, texW, texH, pf[4], x0,y1,z0, x1,y1,z0, x1,y1,z1, x0,y1,z1, 0,1,0);
            emitPerFace(mat, norm, vc, light, overlay, texW, texH, pf[5], x0,y0,z1, x1,y0,z1, x1,y0,z0, x0,y0,z0, 0,-1,0);
        } else {
            float u = cube.uvX(), v = cube.uvY();
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
                              int texW, int texH, FaceUV face,
                              float x0, float y0, float z0, float x1, float y1, float z1,
                              float x2, float y2, float z2, float x3, float y3, float z3,
                              float nx, float ny, float nz) {
        if (face == null || (face.uSize() == 0 && face.vSize() == 0)) return;
        quad(mat, norm, vc, light, overlay, texW, texH,
                x0,y0,z0, x1,y1,z1, x2,y2,z2, x3,y3,z3,
                face.u(), face.v(), face.uSize(), face.vSize(), nx, ny, nz);
    }

    private static Quaternionf eulerToQuat(float rx, float ry, float rz) {
        return new Quaternionf().rotationZYX(rz, ry, rx);
    }

    private static float sampleTime(HandAnimationLoader.AnimData animation, float timeSecs) {
        float length = animation.length() <= 0f ? 1f : animation.length();
        return switch (animation.loopMode()) {
            case LOOP -> ((timeSecs % length) + length) % length;
            case HOLD_LAST, PLAY_ONCE -> Math.min(timeSecs, length);
        };
    }

    private AnimationLayer resolveLayer(String boneName) {
        AnimationLayer resolved = null;
        for (AnimationLayer layer : animationLayers) {
            if (layer.animation().bones().containsKey(boneName)
                    && (resolved == null || layer.priority() > resolved.priority())) {
                resolved = layer;
            }
        }
        return resolved;
    }

    private record AnimationLayer(int priority, HandAnimationLoader.AnimData animation, float time) {}
}
