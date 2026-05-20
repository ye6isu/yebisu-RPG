package net.ye6isu.yebisuRPG.data.network;

import net.minecraft.world.item.ItemStack;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Client-side read-only mirror of entity variable maps.
 *
 * <p>The server is authoritative for all variable values. Clients never write to
 * their attachment directly — they read from this cache which is populated by
 * incoming {@link VarSyncPayload} packets.</p>
 *
 * <h2>Usage — client side only</h2>
 * <pre>{@code
 * int mana    = VarSyncClientCache.getInt(player.getId(), "mana");
 * float speed = VarSyncClientCache.getFloat(entity.getId(), "speed_mult");
 * boolean stunned = VarSyncClientCache.getBool(entity.getId(), "is_stunned");
 * }</pre>
 *
 * <p>Returns sensible defaults (0, 0f, false, "", EMPTY) when a key is not present.</p>
 */
@OnlyIn(Dist.CLIENT)
public final class VarSyncClientCache {

    private VarSyncClientCache() {}

    // entityId → (key → VarEntry snapshot)
    private static final Map<Integer, Map<String, VarSyncPayload.VarEntry>> DATA =
        new ConcurrentHashMap<>();

    // ---------------------------------------------------------------------------------
    // Internal update — called by VarSyncClientHandler
    // ---------------------------------------------------------------------------------

    static void apply(int entityId, Iterable<VarSyncPayload.VarEntry> entries) {
        Map<String, VarSyncPayload.VarEntry> map =
            DATA.computeIfAbsent(entityId, id -> new ConcurrentHashMap<>());
        for (VarSyncPayload.VarEntry e : entries) {
            map.put(e.key(), e);
        }
    }

    static void clear(int entityId) {
        DATA.remove(entityId);
    }

    public static void clearAll() {
        DATA.clear();
    }

    // ---------------------------------------------------------------------------------
    // Public read API
    // ---------------------------------------------------------------------------------

    public static int getInt(int entityId, String key) {
        var e = entry(entityId, key); return e != null ? e.intVal() : 0;
    }
    public static float getFloat(int entityId, String key) {
        var e = entry(entityId, key); return e != null ? e.floatVal() : 0f;
    }
    public static boolean getBool(int entityId, String key) {
        var e = entry(entityId, key); return e != null ? e.boolVal() : false;
    }
    public static String getString(int entityId, String key) {
        var e = entry(entityId, key); return e != null ? e.stringVal() : "";
    }
    public static ItemStack getItem(int entityId, String key) {
        var e = entry(entityId, key); return e != null ? e.itemVal() : ItemStack.EMPTY;
    }
    public static boolean has(int entityId, String key) {
        var m = DATA.get(entityId); return m != null && m.containsKey(key);
    }

    private static VarSyncPayload.VarEntry entry(int entityId, String key) {
        var m = DATA.get(entityId); return m != null ? m.get(key) : null;
    }
}
