package net.ye6isu.yebisuRPG.data.network;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import net.minecraft.world.item.ItemStack;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.data.network.VarSyncPayload;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/data/network/VarSyncClientCache.class */
@OnlyIn(Dist.CLIENT)
public final class VarSyncClientCache {
    private static final Map<Integer, Map<String, VarSyncPayload.VarEntry>> DATA = new ConcurrentHashMap();

    private VarSyncClientCache() {
    }

    static void apply(int entityId, Iterable<VarSyncPayload.VarEntry> entries) {
        Map<String, VarSyncPayload.VarEntry> map = DATA.computeIfAbsent(Integer.valueOf(entityId), id -> {
            return new ConcurrentHashMap();
        });
        for (VarSyncPayload.VarEntry e : entries) {
            map.put(e.key(), e);
        }
    }

    static void clear(int entityId) {
        DATA.remove(Integer.valueOf(entityId));
    }

    public static void clearAll() {
        DATA.clear();
    }

    public static int getInt(int entityId, String key) {
        VarSyncPayload.VarEntry e = entry(entityId, key);
        if (e != null) {
            return e.intVal();
        }
        return 0;
    }

    public static float getFloat(int entityId, String key) {
        VarSyncPayload.VarEntry e = entry(entityId, key);
        if (e != null) {
            return e.floatVal();
        }
        return 0.0f;
    }

    public static boolean getBool(int entityId, String key) {
        VarSyncPayload.VarEntry e = entry(entityId, key);
        if (e != null) {
            return e.boolVal();
        }
        return false;
    }

    public static String getString(int entityId, String key) {
        VarSyncPayload.VarEntry e = entry(entityId, key);
        return e != null ? e.stringVal() : "";
    }

    public static ItemStack getItem(int entityId, String key) {
        VarSyncPayload.VarEntry e = entry(entityId, key);
        return e != null ? e.itemVal() : ItemStack.EMPTY;
    }

    public static boolean has(int entityId, String key) {
        Map<String, VarSyncPayload.VarEntry> m = DATA.get(Integer.valueOf(entityId));
        return m != null && m.containsKey(key);
    }

    private static VarSyncPayload.VarEntry entry(int entityId, String key) {
        Map<String, VarSyncPayload.VarEntry> m = DATA.get(Integer.valueOf(entityId));
        if (m != null) {
            return m.get(key);
        }
        return null;
    }
}
