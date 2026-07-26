package net.ye6isu.yebisuRPG.vfx;

import net.minecraft.resources.ResourceKey;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.level.Level;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.entity.player.PlayerEvent;
import net.neoforged.neoforge.event.tick.ServerTickEvent;
import net.ye6isu.yebisuRPG.network.util.NetworkUtils;
import net.ye6isu.yebisuRPG.vfx.network.VfxRemovePayload;
import net.ye6isu.yebisuRPG.vfx.network.VfxStartPayload;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Server authority for finite VFX instances created by Blocky. */
@EventBusSubscriber(modid = yebisuRPG.MODID)
public final class VfxService {

    public enum AnchorMode {
        FIXED,
        FOLLOW_ENTITY
    }

    public enum SpawnPoint {
        RAW_POSITION,
        EYE_LEVEL
    }

    private static final double BROADCAST_RADIUS = 192.0;
    private static final Map<InstanceKey, ActiveVfx> ACTIVE = new HashMap<>();

    private VfxService() {}

    public static UUID playAtEntity(
            String effectId,
            String instanceName,
            Entity owner,
            double offsetX,
            double offsetY,
            double offsetZ
    ) {
        return playAtEntity(
                effectId,
                instanceName,
                owner,
                AnchorMode.FIXED,
                SpawnPoint.RAW_POSITION,
                false,
                false,
                false,
                offsetX,
                offsetY,
                offsetZ);
    }

    public static UUID playAtEntity(
            String effectId,
            String instanceName,
            Entity owner,
            SpawnPoint spawnPoint,
            double offsetX,
            double offsetY,
            double offsetZ
    ) {
        return playAtEntity(
                effectId,
                instanceName,
                owner,
                AnchorMode.FIXED,
                spawnPoint,
                false,
                false,
                false,
                offsetX,
                offsetY,
                offsetZ);
    }

    public static UUID playAtEntity(
            String effectId,
            String instanceName,
            Entity owner,
            SpawnPoint spawnPoint,
            boolean followYaw,
            boolean followPitch,
            double offsetX,
            double offsetY,
            double offsetZ
    ) {
        return playAtEntity(
                effectId,
                instanceName,
                owner,
                AnchorMode.FIXED,
                spawnPoint,
                followYaw,
                followPitch,
                false,
                offsetX,
                offsetY,
                offsetZ);
    }

    public static UUID playAtEntity(
            String effectId,
            String instanceName,
            Entity owner,
            AnchorMode anchorMode,
            SpawnPoint spawnPoint,
            boolean followYaw,
            boolean followPitch,
            double offsetX,
            double offsetY,
            double offsetZ
    ) {
        return playAtEntity(
                effectId,
                instanceName,
                owner,
                anchorMode,
                spawnPoint,
                followYaw,
                followPitch,
                false,
                offsetX,
                offsetY,
                offsetZ);
    }

    public static UUID playAtEntity(
            String effectId,
            String instanceName,
            Entity owner,
            AnchorMode anchorMode,
            SpawnPoint spawnPoint,
            boolean followYaw,
            boolean followPitch,
            boolean viewSway,
            double offsetX,
            double offsetY,
            double offsetZ
    ) {
        if (!(owner.level() instanceof ServerLevel level)) return null;

        String normalizedEffect = VfxRegistry.normalize(effectId);
        int durationTicks = VfxRegistry.durationTicks(normalizedEffect);
        if (durationTicks <= 0) {
            yebisuRPG.LOGGER.warn("[VFX] Ignoring unknown effect id '{}'", effectId);
            return null;
        }

        String slot = normalizeInstanceName(instanceName);
        InstanceKey key = new InstanceKey(owner.getUUID(), slot);
        removeInternal(key, level, true);

        UUID instanceId = UUID.randomUUID();
        double x = owner.getX() + offsetX;
        double y = (spawnPoint == SpawnPoint.EYE_LEVEL ? owner.getEyeY() : owner.getY()) + offsetY;
        double z = owner.getZ() + offsetZ;
        float yawDegrees = followYaw ? owner.getYRot() : 0.0F;
        float pitchDegrees = followPitch ? owner.getXRot() : 0.0F;
        long startTick = level.getGameTime();
        Set<UUID> recipients = new HashSet<>();
        VfxStartPayload payload = new VfxStartPayload(
                instanceId,
                normalizedEffect,
                x,
                y,
                z,
                yawDegrees,
                pitchDegrees,
                owner.getId(),
                anchorMode == AnchorMode.FOLLOW_ENTITY,
                spawnPoint == SpawnPoint.EYE_LEVEL,
                followYaw,
                followPitch,
                viewSway,
                offsetX,
                offsetY,
                offsetZ,
                startTick);

        double radiusSquared = BROADCAST_RADIUS * BROADCAST_RADIUS;
        for (ServerPlayer player : level.players()) {
            if (player.distanceToSqr(x, y, z) <= radiusSquared) {
                NetworkUtils.sendToPlayer(player, payload);
                recipients.add(player.getUUID());
            }
        }

        ACTIVE.put(key, new ActiveVfx(
                instanceId,
                level.dimension(),
                startTick + durationTicks,
                recipients,
                payload));
        return instanceId;
    }

    public static void remove(String instanceName, Entity owner) {
        if (!(owner.level() instanceof ServerLevel level)) return;
        removeInternal(new InstanceKey(owner.getUUID(), normalizeInstanceName(instanceName)), level, true);
    }

    private static String normalizeInstanceName(String name) {
        if (name == null || name.isBlank()) return "main";
        String trimmed = name.trim();
        return trimmed.length() <= 64 ? trimmed : trimmed.substring(0, 64);
    }

    private static void removeInternal(InstanceKey key, ServerLevel level, boolean notifyClients) {
        ActiveVfx active = ACTIVE.remove(key);
        if (active == null || !notifyClients) return;

        VfxRemovePayload payload = new VfxRemovePayload(active.instanceId());
        for (UUID recipientId : active.recipients()) {
            ServerPlayer player = level.getServer().getPlayerList().getPlayer(recipientId);
            if (player != null) NetworkUtils.sendToPlayer(player, payload);
        }
    }

    @SubscribeEvent
    public static void onServerTick(ServerTickEvent.Post event) {
        Iterator<Map.Entry<InstanceKey, ActiveVfx>> iterator = ACTIVE.entrySet().iterator();
        while (iterator.hasNext()) {
            ActiveVfx active = iterator.next().getValue();
            ServerLevel level = event.getServer().getLevel(active.dimension());
            if (level == null || level.getGameTime() >= active.endTick()) {
                iterator.remove();
            }
        }
    }

    @SubscribeEvent
    public static void onStartTracking(PlayerEvent.StartTracking event) {
        if (!(event.getEntity() instanceof ServerPlayer player)) return;
        Entity target = event.getTarget();
        for (Map.Entry<InstanceKey, ActiveVfx> entry : ACTIVE.entrySet()) {
            ActiveVfx active = entry.getValue();
            if (!entry.getKey().ownerId().equals(target.getUUID())
                    || !active.payload().followEntity()
                    || !active.dimension().equals(player.level().dimension())) continue;
            NetworkUtils.sendToPlayer(player, active.payload());
            active.recipients().add(player.getUUID());
        }
    }

    private record InstanceKey(UUID ownerId, String instanceName) {}

    private record ActiveVfx(
            UUID instanceId,
            ResourceKey<Level> dimension,
            long endTick,
            Set<UUID> recipients,
            VfxStartPayload payload
    ) {}

}
