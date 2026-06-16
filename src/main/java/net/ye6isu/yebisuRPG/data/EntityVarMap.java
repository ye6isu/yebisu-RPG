package net.ye6isu.yebisuRPG.data;

import net.minecraft.nbt.CompoundTag;
import net.minecraft.world.item.ItemStack;

import javax.annotation.Nullable;
import java.util.*;

/**
 * The map of named {@link EntityVar}s for one entity.
 *
 * <p>This is the primary data store. One instance is attached to each entity via
 * {@link EntityVarCapability}. It is server-authoritative — clients receive a
 * read-only mirror via {@link net.ye6isu.yebisuRPG.data.network.VarSyncClientCache}.</p>
 *
 * <h2>Dirty tracking</h2>
 * <p>Each {@link EntityVar} tracks its own dirty flag. {@link #drainDirty()} returns
 * only the changed variables and clears their flags — used by the sync system to build
 * minimal delta packets rather than sending the full map every tick.</p>
 *
 * <h2>Usage</h2>
 * <pre>{@code
 * // Get the map for an entity (server side)
 * EntityVarMap vars = EntityVarCapability.get(entity);
 *
 * // Define variables (typically called once at spawn or first access)
 * vars.define("mana",       EntityVar.ofInt(100));
 * vars.define("max_mana",   EntityVar.ofInt(100));
 * vars.define("is_stunned", EntityVar.ofBool(false));
 * vars.define("weapon",     EntityVar.ofItem(ItemStack.EMPTY, true)); // drops on death
 *
 * // Read / write
 * vars.getInt("mana")              // → 100
 * vars.setInt("mana", 80)          // marks mana dirty
 * vars.getBool("is_stunned")       // → false
 * vars.setItem("weapon", sword)    // marks weapon dirty
 * }</pre>
 */
public final class EntityVarMap {

    private final Map<String, EntityVar> vars = new LinkedHashMap<>();

    // ---------------------------------------------------------------------------------
    // Definition
    // ---------------------------------------------------------------------------------

    /**
     * Defines a variable. If the key already exists, the existing value is kept
     * (safe to call on every tick or spawn without overwriting live data).
     * Returns {@code this} so define+get/set can be chained in a single expression
     * (used by YCS-generated Get/Set Variable blocks).
     */
    public EntityVarMap define(String key, EntityVar defaultVar) {
        vars.putIfAbsent(key, defaultVar);
        return this;
    }

    /** Returns {@code true} if the key has been defined. */
    public boolean has(String key) { return vars.containsKey(key); }

    // ---------------------------------------------------------------------------------
    // Typed getters — return defaults if key missing or wrong type
    // ---------------------------------------------------------------------------------

    public int       getInt(String key)    { var v = vars.get(key); return v != null ? v.getInt()    : 0; }
    public float     getFloat(String key)  { var v = vars.get(key); return v != null ? v.getFloat()  : 0f; }
    public boolean   getBool(String key)   { var v = vars.get(key); return v != null ? v.getBool()   : false; }
    public String    getString(String key) { var v = vars.get(key); return v != null ? v.getString() : ""; }
    public ItemStack getItem(String key)   { var v = vars.get(key); return v != null ? v.getItem()   : ItemStack.EMPTY; }

    // ---------------------------------------------------------------------------------
    // Typed setters — no-op if key not defined or wrong type
    // ---------------------------------------------------------------------------------

    public void setInt(String key, int v)         { var e = vars.get(key); if (e != null) e.setInt(v); }
    public void setFloat(String key, float v)     { var e = vars.get(key); if (e != null) e.setFloat(v); }
    public void setBool(String key, boolean v)    { var e = vars.get(key); if (e != null) e.setBool(v); }
    public void setString(String key, String v)   { var e = vars.get(key); if (e != null) e.setString(v); }
    public void setItem(String key, ItemStack v)  { var e = vars.get(key); if (e != null) e.setItem(v); }

    // ---------------------------------------------------------------------------------
    // Raw access
    // ---------------------------------------------------------------------------------

    /** Returns the raw {@link EntityVar} for a key, or {@code null} if not defined. */
    @Nullable public EntityVar getRaw(String key) { return vars.get(key); }

    /** Unmodifiable view of all entries. */
    public Map<String, EntityVar> getAll() { return Collections.unmodifiableMap(vars); }

    /** Returns all ItemStack variables marked as drop-on-death. */
    public Map<String, EntityVar> getDropOnDeath() {
        Map<String, EntityVar> result = new LinkedHashMap<>();
        for (var e : vars.entrySet()) {
            if (e.getValue().getType() == EntityVarType.ITEM_STACK
                    && e.getValue().isDropOnDeath()) {
                result.put(e.getKey(), e.getValue());
            }
        }
        return result;
    }

    // ---------------------------------------------------------------------------------
    // Dirty drain — used by sync system
    // ---------------------------------------------------------------------------------

    /**
     * Returns all variables that have been modified since the last drain, then
     * clears their dirty flags. Called by the sync system to build delta packets.
     *
     * <p>If no variables are dirty, returns an empty map — no packet is sent.</p>
     */
    public Map<String, EntityVar> drainDirty() {
        Map<String, EntityVar> dirty = new LinkedHashMap<>();
        for (var entry : vars.entrySet()) {
            if (entry.getValue().isDirty()) {
                dirty.put(entry.getKey(), entry.getValue());
                entry.getValue().clearDirty();
            }
        }
        return dirty;
    }

    /**
     * Returns all variables (dirty or not) and clears all dirty flags.
     * Used for join-sync snapshots.
     */
    public Map<String, EntityVar> drainAll() {
        for (EntityVar v : vars.values()) v.clearDirty();
        return Collections.unmodifiableMap(vars);
    }

    // ---------------------------------------------------------------------------------
    // NBT persistence
    // ---------------------------------------------------------------------------------

    public CompoundTag save(net.minecraft.core.HolderLookup.Provider registries) {
        var tag = new CompoundTag();
        for (var entry : vars.entrySet()) {
            tag.put(entry.getKey(), entry.getValue().toNbt(registries));
        }
        return tag;
    }

    public void load(CompoundTag tag, net.minecraft.core.HolderLookup.Provider registries) {
        for (String key : tag.getAllKeys()) {
            vars.put(key, EntityVar.fromNbt(tag.getCompound(key), registries));
        }
    }
}
