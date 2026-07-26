package net.ye6isu.yebisuRPG.util;

import net.minecraft.world.entity.Entity;
import net.minecraft.world.phys.Vec3;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.entity.player.PlayerEvent;
import net.neoforged.neoforge.event.tick.ServerTickEvent;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.UUID;

/**
 * Server-tick reimplementation of ProjectJJK's short burst/deceleration dash.
 * This intentionally has separate state and behavior from {@link DashUtil}.
 */
@EventBusSubscriber(modid = yebisuRPG.MODID)
public final class ProjectJjkDashUtil {

    private static final double PROJECT_JJK_BURST_MULTIPLIER = 0.5;
    private static final Map<UUID, BurstState> ACTIVE = new HashMap<>();

    private ProjectJjkDashUtil() {}

    public static void start(
            Entity entity,
            double directionX,
            double directionY,
            double directionZ,
            double travelValue,
            int burstTicks,
            int decelerationTicks,
            double endMomentum,
            boolean forceAirborne
    ) {
        if (entity == null || entity.level().isClientSide()) return;

        Vec3 requestedDirection = new Vec3(directionX, directionY, directionZ);
        Vec3 direction = requestedDirection.lengthSqr() < 0.001
                ? entity.getLookAngle().normalize()
                : requestedDirection.normalize();
        if (direction.lengthSqr() < 0.001) return;

        double boundedTravel = finiteClamp(travelValue, -256.0, 256.0, 12.0);
        int boundedBurstTicks = Math.clamp(burstTicks, 1, 200);
        int boundedDecelerationTicks = Math.clamp(decelerationTicks, 0, 200);
        double boundedEndMomentum = finiteClamp(endMomentum, 0.0, 1.0, 0.2);
        double burstSpeed = boundedTravel / boundedBurstTicks * PROJECT_JJK_BURST_MULTIPLIER;

        ACTIVE.put(entity.getUUID(), new BurstState(
                entity,
                direction,
                burstSpeed,
                boundedBurstTicks,
                boundedDecelerationTicks,
                boundedEndMomentum,
                forceAirborne));
    }

    @SubscribeEvent
    public static void onServerTick(ServerTickEvent.Post event) {
        Iterator<BurstState> iterator = ACTIVE.values().iterator();
        while (iterator.hasNext()) {
            BurstState state = iterator.next();
            Entity entity = state.entity;
            if (entity.isRemoved()) {
                iterator.remove();
                continue;
            }

            if (state.elapsedTicks >= state.burstTicks + state.decelerationTicks) {
                entity.setDeltaMovement(entity.getDeltaMovement().scale(state.endMomentum));
                entity.hurtMarked = true;
                iterator.remove();
                continue;
            }

            if (state.elapsedTicks < state.burstTicks) {
                entity.setDeltaMovement(state.direction.scale(state.burstSpeed));
            } else {
                int decelerationStep = state.elapsedTicks - state.burstTicks;
                double factor = 1.0 - decelerationStep / (double) state.decelerationTicks;
                entity.setDeltaMovement(entity.getDeltaMovement().scale(Math.max(0.0, factor)));
            }

            if (state.forceAirborne) entity.setOnGround(false);
            entity.hurtMarked = true;
            state.elapsedTicks++;
        }
    }

    @SubscribeEvent
    public static void onPlayerLogout(PlayerEvent.PlayerLoggedOutEvent event) {
        ACTIVE.remove(event.getEntity().getUUID());
    }

    @SubscribeEvent
    public static void onPlayerLogin(PlayerEvent.PlayerLoggedInEvent event) {
        ACTIVE.remove(event.getEntity().getUUID());
    }

    private static double finiteClamp(double value, double min, double max, double fallback) {
        return Double.isFinite(value) ? Math.clamp(value, min, max) : fallback;
    }

    private static final class BurstState {
        private final Entity entity;
        private final Vec3 direction;
        private final double burstSpeed;
        private final int burstTicks;
        private final int decelerationTicks;
        private final double endMomentum;
        private final boolean forceAirborne;
        private int elapsedTicks;

        private BurstState(
                Entity entity,
                Vec3 direction,
                double burstSpeed,
                int burstTicks,
                int decelerationTicks,
                double endMomentum,
                boolean forceAirborne
        ) {
            this.entity = entity;
            this.direction = direction;
            this.burstSpeed = burstSpeed;
            this.burstTicks = burstTicks;
            this.decelerationTicks = decelerationTicks;
            this.endMomentum = endMomentum;
            this.forceAirborne = forceAirborne;
        }
    }
}
