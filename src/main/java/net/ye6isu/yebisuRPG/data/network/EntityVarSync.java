package net.ye6isu.yebisuRPG.data.network;

import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
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
import net.ye6isu.yebisuRPG.yebisuRPG;
import net.ye6isu.yebisulib.network.util.NetworkUtils;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Server-side sync engine for entity variables.
 *
 * <h2>Persistence</h2>
 * <p>Variables are persisted via {@link EntityVarCapability}'s NBT attachment
 * serializer — they survive full restarts because they are stored in entity NBT
 * on disk. On rejoin, the client receives a fresh snapshot via two sync paths:</p>
 * <ul>
 *   <li>{@link #onPlayerLogin} — sends the joining player their own vars immediately.
 *       {@code StartTracking} never fires for the player's own entity.</li>
 *   <li>{@link #onStartTracking} — sends vars for any other entity as it enters
 *       the player's view (other players, mobs, projectiles, etc.).</li>
 * </ul>
 *
 * <h2>Efficiency</h2>
 * <ul>
 *   <li>Dirty batching — only changed vars per tick window are sent.</li>
 *   <li>100 ms throttle — high-frequency changes (mana per tick) collapse to
 *       ≤10 packets/second per entity regardless of tick rate.</li>
 *   <li>Zero traffic when idle — no dirty vars = no packet.</li>
 * </ul>
 */
@EventBusSubscriber(modid = yebisuRPG.MODID)
public final class EntityVarSync {

    public static final long SYNC_INTERVAL_MS = 100;

    /** Integer entity ID → last flush timestamp. Cleared on world unload. */
    private static final Map<Integer, Long> LAST_SYNC = new ConcurrentHashMap<>();

    private EntityVarSync() {}

    // ─── Per-tick dirty flush ─────────────────────────────────────────────────

    @SubscribeEvent
    public static void onServerTick(ServerTickEvent.Post event) {
        long now = System.currentTimeMillis();

        for (ServerLevel level : event.getServer().getAllLevels()) {
            for (Entity entity : level.getAllEntities()) {
                if (!EntityVarCapability.hasData(entity)) continue;

                int id = entity.getId();
                Long last = LAST_SYNC.get(id);
                if (last != null && (now - last) < SYNC_INTERVAL_MS) continue;

                EntityVarMap map = EntityVarCapability.get(entity);
                Map<String, EntityVar> dirty = map.drainDirty();
                if (dirty.isEmpty()) continue;

                NetworkUtils.sendToPlayersTrackingAndSelf(entity,
                    new VarSyncPayload(id, toEntries(dirty)));
                LAST_SYNC.put(id, now);
            }
        }
    }

    // ─── Self-sync on login ───────────────────────────────────────────────────

    /**
     * Send the joining player their own variable snapshot.
     * {@code StartTracking} never fires for a player's own entity, so this
     * path is the only way they receive their own vars on rejoin.
     */
    @SubscribeEvent
    public static void onPlayerLogin(PlayerEvent.PlayerLoggedInEvent event) {
        if (!(event.getEntity() instanceof ServerPlayer joining)) return;
        sendSnapshot(joining, joining);
    }

    // ─── Other-entity sync when entering view ────────────────────────────────

    /**
     * Send variable snapshot for any entity that enters the observer's view.
     * Covers other players, mobs, and any entity with variables.
     */
    @SubscribeEvent
    public static void onStartTracking(PlayerEvent.StartTracking event) {
        if (!(event.getEntity() instanceof ServerPlayer observer)) return;
        Entity tracked = event.getTarget();
        sendSnapshot(observer, tracked);
    }

    // ─── Death drops ─────────────────────────────────────────────────────────

    @SubscribeEvent
    public static void onEntityDeath(LivingDropsEvent event) {
        Entity entity = event.getEntity();
        if (!EntityVarCapability.hasData(entity)) return;

        EntityVarMap map = EntityVarCapability.get(entity);
        for (var entry : map.getDropOnDeath().entrySet()) {
            ItemStack stack = entry.getValue().getItem();
            if (stack.isEmpty()) continue;

            ItemEntity drop = new ItemEntity(
                entity.level(), entity.getX(), entity.getY(), entity.getZ(), stack.copy());
            drop.setDefaultPickUpDelay();
            entity.level().addFreshEntity(drop);
            map.setItem(entry.getKey(), ItemStack.EMPTY);
        }
    }

    // ─── Cleanup ─────────────────────────────────────────────────────────────

    @SubscribeEvent
    public static void onWorldUnload(LevelEvent.Unload event) {
        if (!event.getLevel().isClientSide()) {
            LAST_SYNC.clear();
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Sends all variables for {@code entity} to {@code observer}.
     * Uses {@link EntityVarMap#drainAll()} so the dirty flags are cleared —
     * the normal per-tick sync won't immediately re-send the same data.
     */
    private static void sendSnapshot(ServerPlayer observer, Entity entity) {
        if (!EntityVarCapability.hasData(entity)) return;

        EntityVarMap map = EntityVarCapability.get(entity);
        Map<String, EntityVar> all = map.drainAll();
        if (all.isEmpty()) return;

        NetworkUtils.sendToPlayer(observer,
            new VarSyncPayload(entity.getId(), toEntries(all)));
    }

    private static List<VarSyncPayload.VarEntry> toEntries(Map<String, EntityVar> vars) {
        List<VarSyncPayload.VarEntry> entries = new ArrayList<>(vars.size());
        for (var e : vars.entrySet()) {
            entries.add(VarSyncPayload.VarEntry.from(e.getKey(), e.getValue()));
        }
        return entries;
    }
}
