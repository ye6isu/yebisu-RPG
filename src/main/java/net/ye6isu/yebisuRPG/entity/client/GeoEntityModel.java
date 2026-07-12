package net.ye6isu.yebisuRPG.entity.client;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import net.minecraft.client.model.EntityModel;
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
 * <p>Idle vs. walk is chosen purely from vanilla's own {@code limbSwingAmount}
 * (already server-synced per-entity motion state, see {@code AGENTS.md}'s
 * dedicated-server checklist) — a locally-computed, wall-clock-driven pose, not
 * routed through {@link net.ye6isu.yebisuRPG.animation.client.ClientAnimationEngine}'s
 * packet-triggered playhead system, since idle/walk aren't server-triggered
 * gameplay animations.</p>
 */
public class GeoEntityModel<T extends YcsMobEntity> extends EntityModel<T> {

    private final BakedGeoModel model;
    private final String animationFile;
    private final String idleAnim;
    private final String walkAnim;

    private HandAnimationLoader.AnimData activeAnim;
    private float animTime;

    public GeoEntityModel(BakedGeoModel model, String animationFile, String idleAnim, String walkAnim) {
        this.model = model;
        this.animationFile = animationFile;
        this.idleAnim = idleAnim;
        this.walkAnim = walkAnim;
    }

    @Override
    public void setupAnim(T entity, float limbSwing, float limbSwingAmount, float ageInTicks, float netHeadYaw, float headPitch) {
        activeAnim = null;

        boolean walking = limbSwingAmount > 0.05f;
        String animName = walking ? walkAnim : idleAnim;
        if (animName == null || animName.isEmpty()) return;

        HandAnimationLoader.AnimData anim = HandAnimationLoader.INSTANCE.get(animName, animationFile);
        if (anim == null) return;

        float timeSecs = walking ? limbSwing * 0.1f : ageInTicks / 20.0f;
        float length = anim.length() <= 0f ? 1f : anim.length();
        float t = switch (anim.loopMode()) {
            case LOOP -> ((timeSecs % length) + length) % length;
            case HOLD_LAST, PLAY_ONCE -> Math.min(timeSecs, length);
        };

        activeAnim = anim;
        animTime = t;
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
        if (activeAnim != null) {
            HandAnimationLoader.BonePose bonePose = activeAnim.bone(bone.name());
            animRX = bonePose.rotation().evalX(animTime);
            animRY = bonePose.rotation().evalY(animTime);
            animRZ = bonePose.rotation().evalZ(animTime);
            animPX = bonePose.position().evalX(animTime);
            animPY = bonePose.position().evalY(animTime);
            animPZ = bonePose.position().evalZ(animTime);
            animSX = bonePose.scale().evalX(animTime);
            animSY = bonePose.scale().evalY(animTime);
            animSZ = bonePose.scale().evalZ(animTime);
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
}
