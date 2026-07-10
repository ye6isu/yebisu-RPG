package net.ye6isu.yebisuRPG.util;

import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.entity.player.PlayerEvent;
import net.neoforged.neoforge.event.tick.ServerTickEvent;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.BiConsumer;

/**
 * Ported from {@code old_mod}'s {@code DashUtil} verbatim (same velocity-based, no-gravity dash
 * mechanism, same collision/particle handling via {@link AoeShapes}), with only the tick driver
 * changed: old_mod called {@code DashUtil.tick()} externally from its own
 * {@code AnimationEventHooks}, whereas this version subscribes to {@code ServerTickEvent.Post}
 * itself, since the current mod's {@code AnimationEventHooks} has no such hook to piggyback on.
 */
@EventBusSubscriber(modid = yebisuRPG.MODID)
public final class DashUtil {

    public enum Easing {
        LINEAR,
        EASE_IN,
        EASE_OUT,
        EASE_IN_OUT;

        public byte id() { return (byte) ordinal(); }
    }

    private static final Map<UUID, DashState> ACTIVE = new ConcurrentHashMap<>();

    private DashUtil() {}

    public static void start(Entity entity, double distance, int durationTicks) {
        start(entity, 0, 0, 0, distance, durationTicks, Easing.LINEAR, null, null, "sphere", 1.5, 0, 0, false);
    }

    public static void start(Entity entity, double distance, int durationTicks, Easing easing) {
        start(entity, 0, 0, 0, distance, durationTicks, easing, null, null, "sphere", 1.5, 0, 0, false);
    }

    public static void start(Entity entity, double dirX, double dirY, double dirZ,
                              double distance, int durationTicks, Easing easing,
                              BiConsumer<Entity, Entity> onCollision, Runnable onComplete,
                              String collisionShape, double colA, double colB, double colC, boolean showParticles) {
        if (durationTicks < 1) durationTicks = 1;
        if (entity.level().isClientSide()) return;
        cancel(entity);
        Vec3 rawDir = new Vec3(dirX, dirY, dirZ);
        Vec3 dir = rawDir.lengthSqr() < 0.001 ? entity.getLookAngle().normalize() : rawDir.normalize();
        DashState state = new DashState(entity, dir, distance, durationTicks, easing, onCollision, onComplete,
            collisionShape, colA, colB, colC, showParticles);
        state.hadNoGravity = entity.isNoGravity();
        ACTIVE.put(entity.getUUID(), state);
        entity.setNoGravity(true);
        entity.fallDistance = 0;
    }

    public static void tick() {
        if (ACTIVE.isEmpty()) return;
        var it = ACTIVE.entrySet().iterator();
        while (it.hasNext()) {
            var entry = it.next();
            DashState s = entry.getValue();
            Entity e = s.entity;
            if (e.isRemoved() || s.elapsed >= s.totalTicks) {
                restore(e, s);
                if (s.onComplete != null) {
                    try { s.onComplete.run(); } catch (Exception ex) {
                        yebisuRPG.LOGGER.error("[DashUtil] onComplete threw", ex);
                    }
                }
                it.remove();
                continue;
            }
            double prevProgress = ease(s.easing, (double) s.elapsed / s.totalTicks);
            double nextProgress = ease(s.easing, (double) (s.elapsed + 1) / s.totalTicks);
            double stepDist = (nextProgress - prevProgress) * s.totalDistance;
            s.elapsed++;

            e.setDeltaMovement(s.direction.scale(stepDist));
            e.hurtMarked = true;
            e.fallDistance = 0;

            if (s.onCollision != null && e.level() instanceof net.minecraft.server.level.ServerLevel sl) {
                Vec3 center = e.position().add(0, e.getBbHeight() * 0.5, 0);
                Vec3 movement = e.getDeltaMovement();
                Vec3 fForward = s.direction;
                Vec3 worldUp = Math.abs(fForward.y) < 0.99 ? new Vec3(0, 1, 0) : new Vec3(1, 0, 0);
                Vec3 fRight = fForward.cross(worldUp).normalize();
                Vec3 fUp = fRight.cross(fForward).normalize();
                List<LivingEntity> nearby;
                if ("box".equals(s.collisionShape)) {
                    double sweepDepth = s.colC + movement.length();
                    Vec3 sweepCenter = center.add(movement.scale(0.5));
                    nearby = AoeShapes.queryBox(sl, sweepCenter, s.colA, s.colB, sweepDepth, fForward, fRight, fUp, e, false);
                } else {
                    double r = s.colA;
                    AABB box = AABB.ofSize(center, r * 2, r * 2, r * 2).expandTowards(movement);
                    nearby = new java.util.ArrayList<>(sl.getEntitiesOfClass(LivingEntity.class, box, t -> t != e && t.isAlive()));
                    Vec3 c = center;
                    Vec3 mv = movement;
                    nearby.removeIf(t -> {
                        Vec3 tp = t.position().add(0, t.getBbHeight() * 0.5, 0);
                        if (tp.distanceToSqr(c) <= r * r) return false;
                        Vec3 d = mv;
                        double lenSq = d.lengthSqr();
                        if (lenSq < 0.001) return tp.distanceToSqr(c) > r * r;
                        double proj = tp.subtract(c).dot(d) / lenSq;
                        proj = Math.max(0, Math.min(1, proj));
                        Vec3 closest = c.add(d.scale(proj));
                        return tp.distanceToSqr(closest) > r * r;
                    });
                }
                // Also check multi-part entities (e.g. EnderDragon) via their parts
                AABB broadBox = ("box".equals(s.collisionShape))
                    ? AABB.ofSize(center, Math.max(s.colA, s.colC) * 2 + movement.length(), s.colB * 2, Math.max(s.colA, s.colC) * 2 + movement.length())
                    : AABB.ofSize(center, s.colA * 2, s.colA * 2, s.colA * 2).expandTowards(movement);
                for (Entity allEnt : sl.getEntities(e, broadBox, t -> t.isMultipartEntity() && t instanceof LivingEntity && t.isAlive())) {
                    if (nearby.contains(allEnt)) continue;
                    LivingEntity le = (LivingEntity) allEnt;
                    boolean partHit = false;
                    if (allEnt.getParts() != null) {
                        for (var part : allEnt.getParts()) {
                            if (part.getBoundingBox().intersects(broadBox)) { partHit = true; break; }
                        }
                    }
                    if (partHit) nearby.add(le);
                }
                nearby.removeIf(t -> s.hitEntities.contains(t.getUUID()));
                for (LivingEntity hit : nearby) {
                    s.hitEntities.add(hit.getUUID());
                    try { s.onCollision.accept(e, hit); } catch (Exception ex) {
                        yebisuRPG.LOGGER.error("[DashUtil] onCollision threw", ex);
                    }
                }
            }
            if (s.showParticles && e.level() instanceof net.minecraft.server.level.ServerLevel sl2) {
                Vec3 visCenter = e.position().add(0, e.getBbHeight() * 0.5, 0);
                Vec3 mv = e.getDeltaMovement();
                Vec3 vForward = s.direction;
                Vec3 vWorldUp = Math.abs(vForward.y) < 0.99 ? new Vec3(0, 1, 0) : new Vec3(1, 0, 0);
                Vec3 vRight = vForward.cross(vWorldUp).normalize();
                Vec3 vUp = vRight.cross(vForward).normalize();
                if ("box".equals(s.collisionShape)) {
                    double sweepDepth = s.colC + mv.length();
                    Vec3 sweepCenter = visCenter.add(mv.scale(0.5));
                    AoeShapes.visualizeBox(sl2, sweepCenter, s.colA, s.colB, sweepDepth, vForward, vRight, vUp);
                } else {
                    AoeShapes.visualizeSphere(sl2, visCenter, s.colA);
                    if (mv.lengthSqr() > 0.01) {
                        AoeShapes.visualizeSphere(sl2, visCenter.add(mv), s.colA);
                        int steps = Math.max(2, (int)(mv.length() * 2));
                        for (int vi = 1; vi < steps; vi++) {
                            double vt = vi / (double) steps;
                            Vec3 p = visCenter.add(mv.scale(vt));
                            sl2.sendParticles(net.minecraft.core.particles.ParticleTypes.END_ROD,
                                p.x, p.y + s.colA, p.z, 1, 0, 0, 0, 0);
                            sl2.sendParticles(net.minecraft.core.particles.ParticleTypes.END_ROD,
                                p.x, p.y - s.colA, p.z, 1, 0, 0, 0, 0);
                        }
                    }
                }
            }
        }
    }

    static double ease(Easing easing, double t) {
        return switch (easing) {
            case LINEAR -> t;
            case EASE_IN -> t * t;
            case EASE_OUT -> 1 - (1 - t) * (1 - t);
            case EASE_IN_OUT -> t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
        };
    }

    public static boolean isDashing(Entity entity) {
        return ACTIVE.containsKey(entity.getUUID());
    }

    public static void cancel(Entity entity) {
        cancel(entity, true);
    }

    /**
     * Stops the entity's current dash immediately. When {@code stopVelocity} is true (the
     * default via {@link #cancel(Entity)}), the dash's velocity is zeroed on cancel — an
     * instant, hard stop, like Poppy's W in League of Legends. When false, whatever velocity
     * the dash last set is left on the entity, so momentum carries through into normal
     * gravity-affected falling/sliding instead of stopping dead.
     */
    public static void cancel(Entity entity, boolean stopVelocity) {
        if (entity.level().isClientSide()) return;
        DashState s = ACTIVE.remove(entity.getUUID());
        if (s != null) restore(entity, s, stopVelocity);
    }

    private static void restore(Entity entity, DashState s) {
        restore(entity, s, true);
    }

    private static void restore(Entity entity, DashState s, boolean stopVelocity) {
        entity.setNoGravity(s.hadNoGravity);
        if (stopVelocity) entity.setDeltaMovement(Vec3.ZERO);
        entity.hurtMarked = true;
    }

    @SubscribeEvent
    public static void onServerTick(ServerTickEvent.Post event) {
        tick();
    }

    @SubscribeEvent
    public static void onPlayerLogout(PlayerEvent.PlayerLoggedOutEvent event) {
        Entity e = event.getEntity();
        DashState s = ACTIVE.remove(e.getUUID());
        if (s != null) e.setNoGravity(s.hadNoGravity);
    }

    @SubscribeEvent
    public static void onPlayerLogin(PlayerEvent.PlayerLoggedInEvent event) {
        if (event.getEntity() instanceof ServerPlayer sp) {
            ACTIVE.remove(sp.getUUID());
        }
    }

    private static final class DashState {
        final Entity entity;
        final Vec3 direction;
        final double totalDistance;
        final int totalTicks;
        final Easing easing;
        final BiConsumer<Entity, Entity> onCollision;
        final Runnable onComplete;
        final Set<UUID> hitEntities = new HashSet<>();
        int elapsed;
        boolean hadNoGravity;

        final String collisionShape;
        final double colA, colB, colC;
        final boolean showParticles;

        DashState(Entity entity, Vec3 direction, double totalDistance, int totalTicks, Easing easing,
                  BiConsumer<Entity, Entity> onCollision, Runnable onComplete,
                  String collisionShape, double colA, double colB, double colC, boolean showParticles) {
            this.entity = entity;
            this.direction = direction;
            this.totalDistance = totalDistance;
            this.totalTicks = totalTicks;
            this.easing = easing;
            this.onCollision = onCollision;
            this.onComplete = onComplete;
            this.collisionShape = collisionShape;
            this.colA = colA;
            this.colB = colB;
            this.colC = colC;
            this.showParticles = showParticles;
        }
    }
}
