package net.ye6isu.yebisuRPG.data;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.annotation.Nullable;
import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.world.item.ItemStack;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/data/EntityVarMap.class */
public final class EntityVarMap {
    private final Map<String, EntityVar> vars = new LinkedHashMap();

    public void define(String key, EntityVar defaultVar) {
        this.vars.putIfAbsent(key, defaultVar);
    }

    public boolean has(String key) {
        return this.vars.containsKey(key);
    }

    public int getInt(String key) {
        EntityVar v = this.vars.get(key);
        if (v != null) {
            return v.getInt();
        }
        return 0;
    }

    public float getFloat(String key) {
        EntityVar v = this.vars.get(key);
        if (v != null) {
            return v.getFloat();
        }
        return 0.0f;
    }

    public boolean getBool(String key) {
        EntityVar v = this.vars.get(key);
        if (v != null) {
            return v.getBool();
        }
        return false;
    }

    public String getString(String key) {
        EntityVar v = this.vars.get(key);
        return v != null ? v.getString() : "";
    }

    public ItemStack getItem(String key) {
        EntityVar v = this.vars.get(key);
        return v != null ? v.getItem() : ItemStack.EMPTY;
    }

    public void setInt(String key, int v) {
        EntityVar e = this.vars.get(key);
        if (e != null) {
            e.setInt(v);
        }
    }

    public void setFloat(String key, float v) {
        EntityVar e = this.vars.get(key);
        if (e != null) {
            e.setFloat(v);
        }
    }

    public void setBool(String key, boolean v) {
        EntityVar e = this.vars.get(key);
        if (e != null) {
            e.setBool(v);
        }
    }

    public void setString(String key, String v) {
        EntityVar e = this.vars.get(key);
        if (e != null) {
            e.setString(v);
        }
    }

    public void setItem(String key, ItemStack v) {
        EntityVar e = this.vars.get(key);
        if (e != null) {
            e.setItem(v);
        }
    }

    @Nullable
    public EntityVar getRaw(String key) {
        return this.vars.get(key);
    }

    public Map<String, EntityVar> getAll() {
        return Collections.unmodifiableMap(this.vars);
    }

    public Map<String, EntityVar> getDropOnDeath() {
        Map<String, EntityVar> result = new LinkedHashMap<>();
        for (Map.Entry<String, EntityVar> e : this.vars.entrySet()) {
            if (e.getValue().getType() == EntityVarType.ITEM_STACK && e.getValue().isDropOnDeath()) {
                result.put(e.getKey(), e.getValue());
            }
        }
        return result;
    }

    public Map<String, EntityVar> drainDirty() {
        Map<String, EntityVar> dirty = new LinkedHashMap<>();
        for (Map.Entry<String, EntityVar> entry : this.vars.entrySet()) {
            if (entry.getValue().isDirty()) {
                dirty.put(entry.getKey(), entry.getValue());
                entry.getValue().clearDirty();
            }
        }
        return dirty;
    }

    public Map<String, EntityVar> drainAll() {
        for (EntityVar v : this.vars.values()) {
            v.clearDirty();
        }
        return Collections.unmodifiableMap(this.vars);
    }

    public CompoundTag save(HolderLookup.Provider registries) {
        CompoundTag tag = new CompoundTag();
        for (Map.Entry<String, EntityVar> entry : this.vars.entrySet()) {
            tag.put(entry.getKey(), entry.getValue().toNbt(registries));
        }
        return tag;
    }

    public void load(CompoundTag tag, HolderLookup.Provider registries) {
        for (String key : tag.getAllKeys()) {
            this.vars.put(key, EntityVar.fromNbt(tag.getCompound(key), registries));
        }
    }
}
