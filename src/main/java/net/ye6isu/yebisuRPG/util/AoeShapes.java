package net.ye6isu.yebisuRPG.util;

import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.ClipContext;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.HitResult;
import net.minecraft.world.phys.Vec3;

import java.util.ArrayList;
import java.util.List;

public final class AoeShapes {

    private AoeShapes() {}

    // ── Line of sight ────────────────────────────────────────────────────────

    public static boolean hasLineOfSight(ServerLevel level, Vec3 from, Entity target) {
        double hw = target.getBbWidth() * 0.4;
        Vec3 base = target.position();
        double cy = base.y + target.getBbHeight() * 0.5;
        Vec3[] points = {
            target.getEyePosition(),
            new Vec3(base.x, cy, base.z),
            new Vec3(base.x + hw, cy, base.z),
            new Vec3(base.x - hw, cy, base.z),
            new Vec3(base.x, cy, base.z + hw),
            new Vec3(base.x, cy, base.z - hw),
            new Vec3(base.x, base.y + target.getBbHeight() * 0.1, base.z),
            new Vec3(base.x, base.y + target.getBbHeight() * 0.9, base.z),
        };
        for (Vec3 p : points) {
            if (rayClear(level, from, p, target)) return true;
        }
        Vec3 dirToTarget = target.position().add(0, cy - from.y, 0).subtract(from).normalize();
        double dist = from.distanceTo(target.position().add(0, target.getBbHeight() * 0.5, 0));
        Vec3 end = from.add(dirToTarget.scale(dist + 1));
        AABB targetBox = target.getBoundingBox().inflate(0.1);
        java.util.Optional<Vec3> hitOpt = targetBox.clip(from, end);
        if (hitOpt.isPresent()) {
            Vec3 hitPoint = hitOpt.get();
            if (rayClear(level, from, hitPoint, target)) return true;
        }
        return false;
    }

    private static boolean rayClear(ServerLevel level, Vec3 from, Vec3 to, Entity context) {
        BlockHitResult hit = level.clip(new ClipContext(
            from, to, ClipContext.Block.COLLIDER, ClipContext.Fluid.NONE, context));
        return hit.getType() == HitResult.Type.MISS;
    }

    private static Vec3 yawOnly(Entity source) {
        double yawRad = Math.toRadians(-source.getYRot());
        return new Vec3(Math.sin(yawRad), 0, Math.cos(yawRad));
    }

    // ── Local coordinate frame from look direction ───────────────────────────

    private static Vec3[] buildFrame(Vec3 look) {
        Vec3 up = Math.abs(look.y) < 0.99 ? new Vec3(0, 1, 0) : new Vec3(1, 0, 0);
        Vec3 right = look.cross(up).normalize();
        Vec3 localUp = right.cross(look).normalize();
        return new Vec3[]{ right, localUp, look };
    }

    // ── Sphere ───────────────────────────────────────────────────────────────

    public static void visualizeSphere(ServerLevel level, Vec3 center, double radius) {
        int rings = 10;
        int pointsPerRing = 16;
        for (int i = 0; i < rings; i++) {
            double phi = Math.PI * i / (rings - 1);
            double y = center.y + radius * Math.cos(phi);
            double ringRadius = radius * Math.sin(phi);
            for (int j = 0; j < pointsPerRing; j++) {
                double theta = 2 * Math.PI * j / pointsPerRing;
                level.sendParticles(ParticleTypes.END_ROD,
                    center.x + ringRadius * Math.cos(theta), y,
                    center.z + ringRadius * Math.sin(theta), 1, 0, 0, 0, 0);
            }
        }
    }

    public static List<LivingEntity> querySphere(ServerLevel level, Vec3 center, double radius,
                                                   Entity exclude, boolean requireLoS) {
        return querySphere(level, center, radius, exclude, requireLoS, center);
    }

    public static List<LivingEntity> querySphere(ServerLevel level, Vec3 center, double radius,
                                                   Entity exclude, boolean requireLoS, Vec3 losOrigin) {
        AABB aabb = AABB.ofSize(center, radius * 2, radius * 2, radius * 2);
        List<LivingEntity> result = new ArrayList<>();
        for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, aabb)) {
            if (e == exclude) continue;
            if (e.position().distanceTo(center) > radius) continue;
            if (requireLoS && !hasLineOfSight(level, losOrigin, e)) continue;
            result.add(e);
        }
        return result;
    }

    // ── Box ──────────────────────────────────────────────────────────────────

    public static void visualizeBox(ServerLevel level, Vec3 center, double width, double height, double depth,
                                     Vec3 forward, Vec3 right, Vec3 up) {
        double hw = width / 2, hh = height / 2, hd = depth / 2;
        Vec3[] corners = new Vec3[8];
        for (int i = 0; i < 8; i++) {
            double lx = (i & 1) != 0 ? hw : -hw;
            double ly = (i & 2) != 0 ? hh : -hh;
            double lz = (i & 4) != 0 ? hd : -hd;
            corners[i] = center.add(right.scale(lx)).add(up.scale(ly)).add(forward.scale(lz));
        }
        int[][] edges = {
            {0,1},{2,3},{4,5},{6,7}, {0,2},{1,3},{4,6},{5,7}, {0,4},{1,5},{2,6},{3,7},
        };
        for (int[] edge : edges) {
            Vec3 a = corners[edge[0]], b = corners[edge[1]];
            int steps = Math.max(4, (int)(a.distanceTo(b) * 2));
            for (int s = 0; s <= steps; s++) {
                double t = s / (double) steps;
                level.sendParticles(ParticleTypes.END_ROD,
                    a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t,
                    1, 0, 0, 0, 0);
            }
        }
    }

    public static List<LivingEntity> queryBox(ServerLevel level, Vec3 center, double width, double height, double depth,
                                               Vec3 forward, Vec3 right, Vec3 up,
                                               Entity exclude, boolean requireLoS) {
        return queryBox(level, center, width, height, depth, forward, right, up, exclude, requireLoS, center);
    }

    public static List<LivingEntity> queryBox(ServerLevel level, Vec3 center, double width, double height, double depth,
                                               Vec3 forward, Vec3 right, Vec3 up,
                                               Entity exclude, boolean requireLoS, Vec3 losOrigin) {
        double maxDim = Math.max(width, Math.max(height, depth));
        AABB aabb = AABB.ofSize(center, maxDim * 2, maxDim * 2, maxDim * 2);
        double hw = width / 2, hh = height / 2, hd = depth / 2;
        List<LivingEntity> result = new ArrayList<>();
        for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, aabb)) {
            if (e == exclude) continue;
            Vec3 rel = e.position().add(0, e.getBbHeight() / 2, 0).subtract(center);
            double dotR = rel.dot(right);
            double dotU = rel.dot(up);
            double dotF = rel.dot(forward);
            if (Math.abs(dotR) > hw || Math.abs(dotU) > hh || Math.abs(dotF) > hd) continue;
            if (requireLoS && !hasLineOfSight(level, losOrigin, e)) continue;
            result.add(e);
        }
        return result;
    }

    // ── Cone ─────────────────────────────────────────────────────────────────

    public static void visualizeCone(ServerLevel level, Entity source, double distance, double angleDeg) {
        Vec3 eye = source.getEyePosition();
        Vec3 look = yawOnly(source);
        Vec3[] frame = buildFrame(look);
        Vec3 right = frame[0], localUp = frame[1];
        double halfAngle = Math.toRadians(angleDeg / 2.0);

        int ringCount = Math.max(4, (int)(distance * 2));
        int pointsPerRing = 24;
        for (int i = 0; i <= ringCount; i++) {
            double d = distance * i / ringCount;
            double ringRadius = d * Math.tan(halfAngle);
            Vec3 ringCenter = eye.add(look.scale(d));
            for (int j = 0; j < pointsPerRing; j++) {
                double theta = 2 * Math.PI * j / pointsPerRing;
                Vec3 p = ringCenter.add(right.scale(ringRadius * Math.cos(theta)))
                    .add(localUp.scale(ringRadius * Math.sin(theta)));
                level.sendParticles(ParticleTypes.END_ROD, p.x, p.y, p.z, 1, 0, 0, 0, 0);
            }
        }
        int edgeLines = 8;
        for (int e = 0; e < edgeLines; e++) {
            double theta = 2 * Math.PI * e / edgeLines;
            for (int i = 0; i <= ringCount; i++) {
                double d = distance * i / ringCount;
                double ringRadius = d * Math.tan(halfAngle);
                Vec3 ringCenter = eye.add(look.scale(d));
                Vec3 p = ringCenter.add(right.scale(ringRadius * Math.cos(theta)))
                    .add(localUp.scale(ringRadius * Math.sin(theta)));
                level.sendParticles(ParticleTypes.END_ROD, p.x, p.y, p.z, 1, 0, 0, 0, 0);
            }
        }
    }

    public static List<LivingEntity> queryCone(ServerLevel level, Entity source, double distance, double angleDeg,
                                                 boolean excludeSelf, boolean requireLoS) {
        Vec3 eye = source.getEyePosition();
        Vec3 look = yawOnly(source);
        double halfAngle = Math.toRadians(angleDeg / 2.0);
        double cosHalf = Math.cos(halfAngle);
        AABB aabb = AABB.ofSize(eye, distance * 2, distance * 2, distance * 2);
        List<LivingEntity> result = new ArrayList<>();
        for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, aabb)) {
            if (excludeSelf && e == source) continue;
            Vec3 toEntity = e.position().add(0, e.getBbHeight() / 2, 0).subtract(eye);
            double dist = toEntity.length();
            if (dist > distance || dist < 0.001) continue;
            double dot = toEntity.normalize().dot(look);
            if (dot < cosHalf) continue;
            if (requireLoS && !hasLineOfSight(level, eye, e)) continue;
            result.add(e);
        }
        return result;
    }

    // ── Line (cylinder) ──────────────────────────────────────────────────────

    public static void visualizeLine(ServerLevel level, Entity source, double distance, double width) {
        Vec3 eye = source.getEyePosition();
        Vec3 look = yawOnly(source);
        Vec3[] frame = buildFrame(look);
        Vec3 right = frame[0], localUp = frame[1];
        double radius = width / 2.0;

        int lengthSteps = Math.max(4, (int)(distance * 2));
        int circumSteps = 12;
        for (int i = 0; i <= lengthSteps; i++) {
            double d = distance * i / lengthSteps;
            Vec3 ringCenter = eye.add(look.scale(d));
            for (int j = 0; j < circumSteps; j++) {
                double theta = 2 * Math.PI * j / circumSteps;
                Vec3 p = ringCenter.add(right.scale(radius * Math.cos(theta)))
                    .add(localUp.scale(radius * Math.sin(theta)));
                level.sendParticles(ParticleTypes.END_ROD, p.x, p.y, p.z, 1, 0, 0, 0, 0);
            }
        }
        for (int e = 0; e < 4; e++) {
            double theta = 2 * Math.PI * e / 4;
            Vec3 offset = right.scale(radius * Math.cos(theta))
                .add(localUp.scale(radius * Math.sin(theta)));
            for (int i = 0; i <= lengthSteps; i++) {
                double d = distance * i / lengthSteps;
                Vec3 p = eye.add(look.scale(d)).add(offset);
                level.sendParticles(ParticleTypes.END_ROD, p.x, p.y, p.z, 1, 0, 0, 0, 0);
            }
        }
    }

    public static List<LivingEntity> queryLine(ServerLevel level, Entity source, double distance, double width,
                                                 boolean excludeSelf, boolean requireLoS) {
        Vec3 eye = source.getEyePosition();
        Vec3 look = yawOnly(source);
        double radius = width / 2.0;
        AABB aabb = AABB.ofSize(eye.add(look.scale(distance / 2)), distance + width, distance + width, distance + width);
        List<LivingEntity> result = new ArrayList<>();
        for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, aabb)) {
            if (excludeSelf && e == source) continue;
            Vec3 toEntity = e.position().add(0, e.getBbHeight() / 2, 0).subtract(eye);
            double along = toEntity.dot(look);
            if (along < 0 || along > distance) continue;
            Vec3 closest = eye.add(look.scale(along));
            double perpDist = e.position().add(0, e.getBbHeight() / 2, 0).distanceTo(closest);
            if (perpDist > radius) continue;
            if (requireLoS && !hasLineOfSight(level, eye, e)) continue;
            result.add(e);
        }
        return result;
    }

    // ── Cone with offset ───────────────────────────────────────────────────────

    public static void visualizeConeOffset(ServerLevel level, Entity source, Vec3 offset, double distance, double angleDeg) {
        Vec3 eye = source.getEyePosition().add(offset);
        Vec3 look = yawOnly(source);
        Vec3[] frame = buildFrame(look);
        Vec3 right = frame[0], localUp = frame[1];
        double halfAngle = Math.toRadians(angleDeg / 2.0);
        int ringCount = Math.max(4, (int)(distance * 2));
        int pointsPerRing = 24;
        for (int i = 0; i <= ringCount; i++) {
            double d = distance * i / ringCount;
            double ringRadius = d * Math.tan(halfAngle);
            Vec3 ringCenter = eye.add(look.scale(d));
            for (int j = 0; j < pointsPerRing; j++) {
                double theta = 2 * Math.PI * j / pointsPerRing;
                Vec3 p = ringCenter.add(right.scale(ringRadius * Math.cos(theta)))
                    .add(localUp.scale(ringRadius * Math.sin(theta)));
                level.sendParticles(ParticleTypes.END_ROD, p.x, p.y, p.z, 1, 0, 0, 0, 0);
            }
        }
        int edgeLines = 8;
        for (int e = 0; e < edgeLines; e++) {
            double theta = 2 * Math.PI * e / edgeLines;
            for (int i = 0; i <= ringCount; i++) {
                double d = distance * i / ringCount;
                double ringRadius = d * Math.tan(halfAngle);
                Vec3 ringCenter = eye.add(look.scale(d));
                Vec3 p = ringCenter.add(right.scale(ringRadius * Math.cos(theta)))
                    .add(localUp.scale(ringRadius * Math.sin(theta)));
                level.sendParticles(ParticleTypes.END_ROD, p.x, p.y, p.z, 1, 0, 0, 0, 0);
            }
        }
    }

    public static List<LivingEntity> queryConeOffset(ServerLevel level, Entity source, Vec3 offset,
                                                      double distance, double angleDeg,
                                                      boolean excludeSelf, boolean requireLoS) {
        Vec3 eye = source.getEyePosition().add(offset);
        Vec3 look = yawOnly(source);
        double halfAngle = Math.toRadians(angleDeg / 2.0);
        double cosHalf = Math.cos(halfAngle);
        AABB aabb = AABB.ofSize(eye, distance * 2, distance * 2, distance * 2);
        List<LivingEntity> result = new ArrayList<>();
        for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, aabb)) {
            if (excludeSelf && e == source) continue;
            Vec3 toEntity = e.position().add(0, e.getBbHeight() / 2, 0).subtract(eye);
            double dist = toEntity.length();
            if (dist > distance || dist < 0.001) continue;
            double dot = toEntity.normalize().dot(look);
            if (dot < cosHalf) continue;
            if (requireLoS && !hasLineOfSight(level, eye, e)) continue;
            result.add(e);
        }
        return result;
    }

    // ── Line with offset ─────────────────────────────────────────────────────

    public static void visualizeLineOffset(ServerLevel level, Entity source, Vec3 offset, double distance, double width) {
        Vec3 eye = source.getEyePosition().add(offset);
        Vec3 look = yawOnly(source);
        Vec3[] frame = buildFrame(look);
        Vec3 right = frame[0], localUp = frame[1];
        double radius = width / 2.0;
        int lengthSteps = Math.max(4, (int)(distance * 2));
        int circumSteps = 12;
        for (int i = 0; i <= lengthSteps; i++) {
            double d = distance * i / lengthSteps;
            Vec3 ringCenter = eye.add(look.scale(d));
            for (int j = 0; j < circumSteps; j++) {
                double theta = 2 * Math.PI * j / circumSteps;
                Vec3 p = ringCenter.add(right.scale(radius * Math.cos(theta)))
                    .add(localUp.scale(radius * Math.sin(theta)));
                level.sendParticles(ParticleTypes.END_ROD, p.x, p.y, p.z, 1, 0, 0, 0, 0);
            }
        }
        for (int e = 0; e < 4; e++) {
            double theta = 2 * Math.PI * e / 4;
            Vec3 off = right.scale(radius * Math.cos(theta))
                .add(localUp.scale(radius * Math.sin(theta)));
            for (int i = 0; i <= lengthSteps; i++) {
                double d = distance * i / lengthSteps;
                Vec3 p = eye.add(look.scale(d)).add(off);
                level.sendParticles(ParticleTypes.END_ROD, p.x, p.y, p.z, 1, 0, 0, 0, 0);
            }
        }
    }

    public static List<LivingEntity> queryLineOffset(ServerLevel level, Entity source, Vec3 offset,
                                                      double distance, double width,
                                                      boolean excludeSelf, boolean requireLoS) {
        Vec3 eye = source.getEyePosition().add(offset);
        Vec3 look = yawOnly(source);
        double radius = width / 2.0;
        AABB aabb = AABB.ofSize(eye.add(look.scale(distance / 2)), distance + width, distance + width, distance + width);
        List<LivingEntity> result = new ArrayList<>();
        for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, aabb)) {
            if (excludeSelf && e == source) continue;
            Vec3 toEntity = e.position().add(0, e.getBbHeight() / 2, 0).subtract(eye);
            double along = toEntity.dot(look);
            if (along < 0 || along > distance) continue;
            Vec3 closest = eye.add(look.scale(along));
            double perpDist = e.position().add(0, e.getBbHeight() / 2, 0).distanceTo(closest);
            if (perpDist > radius) continue;
            if (requireLoS && !hasLineOfSight(level, eye, e)) continue;
            result.add(e);
        }
        return result;
    }

    // ── Helpers for "in front" positioning ────────────────────────────────────

    public static Vec3 centerInFront(Entity source, double forwardOffset) {
        Vec3 look = yawOnly(source);
        return source.getEyePosition().add(look.scale(forwardOffset));
    }

    public static Vec3 offsetInCameraSpace(Entity source, double ox, double oy, double oz) {
        Vec3[] frame = buildFrame(yawOnly(source));
        Vec3 right = frame[0], up = frame[1], forward = frame[2];
        return source.getEyePosition()
            .add(right.scale(ox))
            .add(up.scale(oy))
            .add(forward.scale(oz));
    }

    public static Vec3[] frameFromEntity(Entity source) {
        return buildFrame(yawOnly(source));
    }

    // ── Glowing helper ───────────────────────────────────────────────────────

    public static void applyGlowing(List<LivingEntity> entities, int durationTicks) {
        for (LivingEntity e : entities) {
            e.addEffect(new MobEffectInstance(MobEffects.GLOWING, durationTicks, 0, false, true));
        }
    }
}
