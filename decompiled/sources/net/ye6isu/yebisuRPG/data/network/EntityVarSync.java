package net.ye6isu.yebisuRPG.data.network;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.item.ItemStack;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.entity.living.LivingDropsEvent;
import net.neoforged.neoforge.event.entity.player.PlayerEvent;
import net.neoforged.neoforge.event.level.LevelEvent;
import net.neoforged.neoforge.event.tick.ServerTickEvent;
import net.ye6isu.yebisuRPG.data.EntityVar;
import net.ye6isu.yebisuRPG.data.EntityVarCapability;
import net.ye6isu.yebisuRPG.data.EntityVarMap;
import net.ye6isu.yebisuRPG.data.network.VarSyncPayload;
import net.ye6isu.yebisuRPG.yebisuRPG;
import net.ye6isu.yebisulib.network.util.NetworkUtils;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/data/network/EntityVarSync.class */
@EventBusSubscriber(modid = yebisuRPG.MODID)
public final class EntityVarSync {
    public static final long SYNC_INTERVAL_MS = 100;
    private static final Map<Integer, Long> LAST_SYNC = new ConcurrentHashMap();

    private EntityVarSync() {
    }

    @SubscribeEvent
    public static void onServerTick(ServerTickEvent.Post event) {
        long now = System.currentTimeMillis();
        for (ServerLevel level : event.getServer().getAllLevels()) {
            for (Entity entity : level.getAllEntities()) {
                if (EntityVarCapability.hasData(entity)) {
                    int id = entity.getId();
                    Long last = LAST_SYNC.get(Integer.valueOf(id));
                    if (last == null || now - last.longValue() >= 100) {
                        EntityVarMap map = EntityVarCapability.get(entity);
                        Map<String, EntityVar> dirty = map.drainDirty();
                        if (!dirty.isEmpty()) {
                            NetworkUtils.sendToPlayersTrackingAndSelf(entity, new VarSyncPayload(id, toEntries(dirty)));
                            LAST_SYNC.put(Integer.valueOf(id), Long.valueOf(now));
                        }
                    }
                }
            }
        }
    }

    @SubscribeEvent
    public static void onPlayerLogin(PlayerEvent.PlayerLoggedInEvent event) {
        ServerPlayer entity = event.getEntity();
        if (entity instanceof ServerPlayer) {
            ServerPlayer joining = entity;
            sendSnapshot(joining, joining);
        }
    }

    @SubscribeEvent
    public static void onStartTracking(PlayerEvent.StartTracking event) {
        ServerPlayer entity = event.getEntity();
        if (entity instanceof ServerPlayer) {
            ServerPlayer observer = entity;
            Entity tracked = event.getTarget();
            sendSnapshot(observer, tracked);
        }
    }

    @SubscribeEvent
    public static void onEntityDeath(LivingDropsEvent event) {
        LivingEntity entity = event.getEntity();
        if (EntityVarCapability.hasData(entity)) {
            EntityVarMap map = EntityVarCapability.get(entity);
            for (Map.Entry<String, EntityVar> entry : map.getDropOnDeath().entrySet()) {
                ItemStack stack = entry.getValue().getItem();
                if (!stack.isEmpty()) {
                    ItemEntity drop = new ItemEntity(entity.level(), entity.getX(), entity.getY(), entity.getZ(), stack.copy());
                    drop.setDefaultPickUpDelay();
                    entity.level().addFreshEntity(drop);
                    map.setItem(entry.getKey(), ItemStack.EMPTY);
                }
            }
        }
    }

    @SubscribeEvent
    public static void onWorldUnload(LevelEvent.Unload event) {
        if (!event.getLevel().isClientSide()) {
            LAST_SYNC.clear();
        }
    }

    private static void sendSnapshot(ServerPlayer observer, Entity entity) {
        if (EntityVarCapability.hasData(entity)) {
            EntityVarMap map = EntityVarCapability.get(entity);
            Map<String, EntityVar> all = map.drainAll();
            if (all.isEmpty()) {
                return;
            }
            NetworkUtils.sendToPlayer(observer, new VarSyncPayload(entity.getId(), toEntries(all)));
        }
    }

    private static List<VarSyncPayload.VarEntry> toEntries(Map<String, EntityVar> vars) {
        List<VarSyncPayload.VarEntry> entries = new ArrayList<>(vars.size());
        for (Map.Entry<String, EntityVar> e : vars.entrySet()) {
            entries.add(VarSyncPayload.VarEntry.from(e.getKey(), e.getValue()));
        }
        return entries;
    }
}
