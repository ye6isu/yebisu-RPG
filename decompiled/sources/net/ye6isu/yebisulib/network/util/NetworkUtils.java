package net.ye6isu.yebisulib.network.util;

import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.level.ChunkPos;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.neoforged.neoforge.network.PacketDistributor;
import net.ye6isu.yebisulib.network.BasePayload;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/network/util/NetworkUtils.class */
public final class NetworkUtils {
    private NetworkUtils() {
    }

    @OnlyIn(Dist.CLIENT)
    public static <T extends BasePayload> void sendToServer(T payload) {
        PacketDistributor.sendToServer(payload, new CustomPacketPayload[0]);
    }

    public static <T extends BasePayload> void sendToPlayer(ServerPlayer player, T payload) {
        PacketDistributor.sendToPlayer(player, payload, new CustomPacketPayload[0]);
    }

    public static <T extends BasePayload> void sendToPlayersTracking(Entity entity, T payload) {
        PacketDistributor.sendToPlayersTrackingEntity(entity, payload, new CustomPacketPayload[0]);
    }

    public static <T extends BasePayload> void sendToPlayersTrackingAndSelf(Entity entity, T payload) {
        PacketDistributor.sendToPlayersTrackingEntityAndSelf(entity, payload, new CustomPacketPayload[0]);
    }

    public static <T extends BasePayload> void sendToPlayersTrackingChunk(ServerLevel level, ChunkPos chunkPos, T payload) {
        PacketDistributor.sendToPlayersTrackingChunk(level, chunkPos, payload, new CustomPacketPayload[0]);
    }

    public static <T extends BasePayload> void sendToPlayersNear(ServerLevel level, double x, double y, double z, double radius, T payload) {
        double r2 = radius * radius;
        for (ServerPlayer p : level.players()) {
            if (p.distanceToSqr(x, y, z) <= r2) {
                PacketDistributor.sendToPlayer(p, payload, new CustomPacketPayload[0]);
            }
        }
    }

    public static <T extends BasePayload> void sendToAllPlayers(T payload) {
        PacketDistributor.sendToAllPlayers(payload, new CustomPacketPayload[0]);
    }

    public static <T extends BasePayload> void sendToPlayersInDimension(ServerLevel level, T payload) {
        for (ServerPlayer p : level.players()) {
            PacketDistributor.sendToPlayer(p, payload, new CustomPacketPayload[0]);
        }
    }
}
