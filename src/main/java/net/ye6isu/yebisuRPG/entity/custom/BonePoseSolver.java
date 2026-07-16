package net.ye6isu.yebisuRPG.entity.custom;

import net.minecraft.world.phys.Vec3;
import net.ye6isu.yebisuRPG.entity.client.GeoEntityModelLoader.BakedBone;
import net.ye6isu.yebisuRPG.entity.client.GeoEntityModelLoader.BakedCube;
import net.ye6isu.yebisuRPG.entity.client.GeoEntityModelLoader.BakedGeoModel;
import org.joml.Matrix4f;
import org.joml.Quaternionf;
import org.joml.Vector4f;
import net.minecraft.world.phys.AABB;

/**
 * Server-safe equivalent of the bone-position half of {@link
 * net.ye6isu.yebisuRPG.entity.client.GeoEntityModel#renderBone} — walks the same
 * baked bone tree, applies the exact same pivot/rotation/animation-offset math,
 * but accumulates a {@link Matrix4f} directly instead of pushing onto a client-only
 * {@code PoseStack}, and returns a bone's resolved pivot as a world-space {@link Vec3}
 * (after applying the entity's own position + yRot) rather than rendering anything.
 *
 * <p>Used exclusively by {@link YcsMobEntity} to reposition its {@link
 * YcsMobPartEntity}s server-side every tick — every transform here (the model-space
 * setup, the per-bone pivot/rotate/anim-offset order, the Y-negation on animated
 * position) must stay byte-for-byte in sync with {@code GeoEntityModel.renderToBuffer}/
 * {@code renderBone}, or a part's hitbox will visibly drift from the rendered mesh.</p>
 */
public final class BonePoseSolver {

    private BonePoseSolver() {}

    /**
     * Resolves {@code boneName}'s pivot to a world-space position for {@code entity},
     * sampling {@code entity}'s current idle/walk animation exactly like {@code
     * GeoEntityModel.setupAnim} does (limb-swing-driven walk selection, age-in-ticks
     * idle timing, loop-mode-aware clamping). Returns {@code null} if the entity has
     * no geo model, the bone doesn't exist, or has no animation configured.
     */
    public static Vec3 resolveBoneWorldPos(YcsMobEntity entity, String boneName) {
        return resolveBoneWorldPos(entity, boneName, 0.0F, 0.0F, 0.0F);
    }

    public static Vec3 resolveBoneWorldPos(YcsMobEntity entity, String boneName,
                                           float offsetX, float offsetY, float offsetZ) {
        if (boneName == null || boneName.isEmpty()) return null;

        String entityId = idFromEntityType(entity);
        BakedGeoModel model = ServerGeoModelLoader.load(entityId);
        if (model == null) return null;

        String animName = resolveActiveAnimName(entity);
        ServerAnimationSampler.AnimData anim = null;
        float animTime = 0f;
        if (animName != null && !animName.isEmpty()) {
            String animFile = "yebisurpg:animations/entity/" + entityId + ".animation.json";
            anim = ServerAnimationSampler.get(animName, animFile);
            if (anim != null) animTime = computeAnimTime(entity, anim);
        }

        Matrix4f mat = new Matrix4f();

        Vector4f result = new Vector4f();
        boolean[] found = {false};
        for (BakedBone bone : model.bones()) {
            if (walkBone(bone, boneName, offsetX, offsetY, offsetZ, new Matrix4f(mat), anim, animTime, result, found)) {
                found[0] = true;
                break;
            }
        }
        if (!found[0]) return null;

        // result is in raw Bedrock model units, feet-relative and Y-up. The client
        // renderer has to counter vanilla LivingEntityRenderer's ModelPart flips before
        // drawing, but the server has no PoseStack here: convert directly to blocks.
        float localX = result.x / 16.0F;
        float localY = result.y / 16.0F;
        float localZ = -result.z / 16.0F;
        float yawRad = (float) Math.toRadians(-entity.getYRot());
        float cos = (float) Math.cos(yawRad), sin = (float) Math.sin(yawRad);
        float worldX = localX * cos - localZ * sin;
        float worldZ = localX * sin + localZ * cos;

        return new Vec3(entity.getX() + worldX, entity.getY() + localY, entity.getZ() + worldZ);
    }

    public static AABB resolveBoneWorldBox(YcsMobEntity entity, String boneName) {
        if (boneName == null || boneName.isEmpty()) return null;

        String entityId = idFromEntityType(entity);
        BakedGeoModel model = ServerGeoModelLoader.load(entityId);
        if (model == null) return null;

        String animName = resolveActiveAnimName(entity);
        ServerAnimationSampler.AnimData anim = null;
        float animTime = 0f;
        if (animName != null && !animName.isEmpty()) {
            String animFile = "yebisurpg:animations/entity/" + entityId + ".animation.json";
            anim = ServerAnimationSampler.get(animName, animFile);
            if (anim != null) animTime = computeAnimTime(entity, anim);
        }

        Bounds bounds = new Bounds();
        for (BakedBone bone : model.bones()) {
            if (walkBoneBox(entity, bone, boneName, new Matrix4f(), anim, animTime, bounds)) {
                break;
            }
        }
        return bounds.found ? bounds.toAabb() : null;
    }

    /** Returns true (and fills {@code out}) once {@code targetName} is found in this subtree. */
    private static boolean walkBone(BakedBone bone, String targetName,
                                     float offsetX, float offsetY, float offsetZ,
                                     Matrix4f mat,
                                     ServerAnimationSampler.AnimData anim, float animTime,
                                     Vector4f out, boolean[] found) {
        float px = bone.pivotX(), py = bone.pivotY(), pz = bone.pivotZ();

        float animRX = 0f, animRY = 0f, animRZ = 0f;
        float animPX = 0f, animPY = 0f, animPZ = 0f;
        float animSX = 1f, animSY = 1f, animSZ = 1f;
        if (anim != null) {
            ServerAnimationSampler.BonePose bonePose = anim.bone(bone.name());
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

        applyBoneTransform(mat, bone, animRX, animRY, animRZ, animPX, animPY, animPZ, animSX, animSY, animSZ);

        if (bone.name().equals(targetName)) {
            Vector4f pivot = new Vector4f(px + offsetX, py + offsetY, pz + offsetZ, 1.0f);
            mat.transform(pivot, out);
            return true;
        }

        for (BakedBone child : bone.children()) {
            if (walkBone(child, targetName, offsetX, offsetY, offsetZ, new Matrix4f(mat), anim, animTime, out, found)) {
                return true;
            }
        }
        return false;
    }

    private static boolean walkBoneBox(YcsMobEntity entity, BakedBone bone, String targetName,
                                       Matrix4f mat,
                                       ServerAnimationSampler.AnimData anim, float animTime,
                                       Bounds bounds) {
        float animRX = 0f, animRY = 0f, animRZ = 0f;
        float animPX = 0f, animPY = 0f, animPZ = 0f;
        float animSX = 1f, animSY = 1f, animSZ = 1f;
        if (anim != null) {
            ServerAnimationSampler.BonePose bonePose = anim.bone(bone.name());
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

        applyBoneTransform(mat, bone, animRX, animRY, animRZ, animPX, animPY, animPZ, animSX, animSY, animSZ);

        if (bone.name().equals(targetName)) {
            if (bone.cubes().isEmpty()) {
                Vector4f pivot = new Vector4f(bone.pivotX(), bone.pivotY(), bone.pivotZ(), 1.0f);
                mat.transform(pivot);
                bounds.include(toWorld(entity, pivot));
            } else {
                for (BakedCube cube : bone.cubes()) {
                    includeCubeBounds(entity, mat, cube, bounds);
                }
            }
            return true;
        }

        for (BakedBone child : bone.children()) {
            if (walkBoneBox(entity, child, targetName, new Matrix4f(mat), anim, animTime, bounds)) {
                return true;
            }
        }
        return false;
    }

    private static void applyBoneTransform(Matrix4f mat, BakedBone bone,
                                           float animRX, float animRY, float animRZ,
                                           float animPX, float animPY, float animPZ,
                                           float animSX, float animSY, float animSZ) {
        float px = bone.pivotX(), py = bone.pivotY(), pz = bone.pivotZ();
        Quaternionf q = eulerToQuat(
                (float) Math.toRadians(-(bone.rotX() + animRX)),
                (float) Math.toRadians(-bone.rotY() + animRY),
                (float) Math.toRadians(bone.rotZ() + animRZ));

        mat.translate(px, py, pz);
        mat.rotate(q);
        mat.translate(-px, -py, -pz);
        if (animPX != 0f || animPY != 0f || animPZ != 0f) {
            mat.translate(animPX, -animPY, animPZ);
        }
        if (animSX != 1f || animSY != 1f || animSZ != 1f) {
            mat.scale(animSX, animSY, animSZ);
        }
    }

    private static void includeCubeBounds(YcsMobEntity entity, Matrix4f boneMat, BakedCube cube, Bounds bounds) {
        Matrix4f cubeMat = new Matrix4f(boneMat);
        float px = cube.pivotX(), py = cube.pivotY(), pz = cube.pivotZ();
        if (px != 0 || py != 0 || pz != 0) cubeMat.translate(px, py, pz);
        if (cube.rotX() != 0 || cube.rotY() != 0 || cube.rotZ() != 0) {
            cubeMat.rotate(eulerToQuat(
                    (float) Math.toRadians(-cube.rotX()),
                    (float) Math.toRadians(-cube.rotY()),
                    (float) Math.toRadians(cube.rotZ())));
        }
        if (px != 0 || py != 0 || pz != 0) cubeMat.translate(-px, -py, -pz);

        float inf = cube.inflate();
        float x0 = cube.originX() - inf;
        float y0 = cube.originY() - inf;
        float z0 = cube.originZ() - inf;
        float x1 = cube.originX() + cube.sizeX() + inf;
        float y1 = cube.originY() + cube.sizeY() + inf;
        float z1 = cube.originZ() + cube.sizeZ() + inf;

        includeCorner(entity, cubeMat, x0, y0, z0, bounds);
        includeCorner(entity, cubeMat, x0, y0, z1, bounds);
        includeCorner(entity, cubeMat, x0, y1, z0, bounds);
        includeCorner(entity, cubeMat, x0, y1, z1, bounds);
        includeCorner(entity, cubeMat, x1, y0, z0, bounds);
        includeCorner(entity, cubeMat, x1, y0, z1, bounds);
        includeCorner(entity, cubeMat, x1, y1, z0, bounds);
        includeCorner(entity, cubeMat, x1, y1, z1, bounds);
    }

    private static void includeCorner(YcsMobEntity entity, Matrix4f mat, float x, float y, float z, Bounds bounds) {
        Vector4f corner = new Vector4f(x, y, z, 1.0f);
        mat.transform(corner);
        bounds.include(toWorld(entity, corner));
    }

    private static Vec3 toWorld(YcsMobEntity entity, Vector4f modelPos) {
        float localX = modelPos.x / 16.0F;
        float localY = modelPos.y / 16.0F;
        float localZ = -modelPos.z / 16.0F;
        float yawRad = (float) Math.toRadians(-entity.getYRot());
        float cos = (float) Math.cos(yawRad), sin = (float) Math.sin(yawRad);
        float worldX = localX * cos - localZ * sin;
        float worldZ = localX * sin + localZ * cos;
        return new Vec3(entity.getX() + worldX, entity.getY() + localY, entity.getZ() + worldZ);
    }

    private static final class Bounds {
        boolean found;
        double minX = Double.POSITIVE_INFINITY;
        double minY = Double.POSITIVE_INFINITY;
        double minZ = Double.POSITIVE_INFINITY;
        double maxX = Double.NEGATIVE_INFINITY;
        double maxY = Double.NEGATIVE_INFINITY;
        double maxZ = Double.NEGATIVE_INFINITY;

        void include(Vec3 p) {
            found = true;
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            minZ = Math.min(minZ, p.z);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
            maxZ = Math.max(maxZ, p.z);
        }

        AABB toAabb() {
            return new AABB(minX, minY, minZ, maxX, maxY, maxZ);
        }
    }

    /** Mirrors {@code GeoEntityModel.setupAnim}'s walking/idle choice via vanilla's own
     *  synced {@code walkAnimation} state — the same server-visible motion signal used
     *  everywhere else in the mod (see AGENTS.md's dedicated-server checklist). */
    private static String resolveActiveAnimName(YcsMobEntity entity) {
        boolean walking = entity.walkAnimation.speed() > 0.05f;
        YcsMobData.Config cfg = YcsMobData.get(entity.getType());
        return walking ? cfg.walkAnim() : cfg.idleAnim();
    }

    private static float computeAnimTime(YcsMobEntity entity, ServerAnimationSampler.AnimData anim) {
        boolean walking = entity.walkAnimation.speed() > 0.05f;
        float timeSecs = walking
                ? entity.walkAnimation.position() * 0.1f
                : entity.tickCount / 20.0f;
        float length = anim.length() <= 0f ? 1f : anim.length();
        return switch (anim.loopMode()) {
            case LOOP -> ((timeSecs % length) + length) % length;
            case HOLD_LAST, PLAY_ONCE -> Math.min(timeSecs, length);
        };
    }

    private static String idFromEntityType(YcsMobEntity entity) {
        String key = net.minecraft.core.registries.BuiltInRegistries.ENTITY_TYPE.getKey(entity.getType()).getPath();
        return key;
    }

    private static Quaternionf eulerToQuat(float rx, float ry, float rz) {
        return new Quaternionf().rotationZYX(rz, ry, rx);
    }
}
