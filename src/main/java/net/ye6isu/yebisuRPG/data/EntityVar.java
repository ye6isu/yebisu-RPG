package net.ye6isu.yebisuRPG.data;

import net.minecraft.world.item.ItemStack;

import javax.annotation.Nullable;

/**
 * A single named variable attached to an entity.
 *
 * <p>Variables are mutable. Any set operation marks the variable as dirty, which
 * causes it to be included in the next sync batch sent to tracking clients.</p>
 *
 * <h2>Drop-on-death</h2>
 * <p>Only meaningful for {@link EntityVarType#ITEM_STACK} variables. When {@code true},
 * the item is spawned as a dropped entity when the owning entity dies, and the variable
 * is reset to {@link ItemStack#EMPTY}. This enables things like:
 * <ul>
 *   <li>Mob carrying a key item that drops on death</li>
 *   <li>Player ability catalyst that falls on the floor</li>
 *   <li>Bound weapon that can be reclaimed</li>
 * </ul>
 * </p>
 */
public final class EntityVar {

    private final EntityVarType type;
    private final boolean dropOnDeath;   // only meaningful for ITEM_STACK

    // Value storage — only one is non-null at a time
    private int       intVal;
    private float     floatVal;
    private boolean   boolVal;
    private String    stringVal = "";
    private ItemStack itemVal   = ItemStack.EMPTY;

    private boolean dirty = true;  // new vars always sync on first send

    // ---------------------------------------------------------------------------------
    // Static factories — clear, readable construction
    // ---------------------------------------------------------------------------------

    public static EntityVar ofInt(int value) {
        var v = new EntityVar(EntityVarType.INT, false); v.intVal = value; return v;
    }
    public static EntityVar ofFloat(float value) {
        var v = new EntityVar(EntityVarType.FLOAT, false); v.floatVal = value; return v;
    }
    public static EntityVar ofBool(boolean value) {
        var v = new EntityVar(EntityVarType.BOOL, false); v.boolVal = value; return v;
    }
    public static EntityVar ofString(String value) {
        var v = new EntityVar(EntityVarType.STRING, false); v.stringVal = value; return v;
    }
    public static EntityVar ofItem(ItemStack value, boolean dropOnDeath) {
        var v = new EntityVar(EntityVarType.ITEM_STACK, dropOnDeath);
        v.itemVal = value.copy(); return v;
    }

    private EntityVar(EntityVarType type, boolean dropOnDeath) {
        this.type        = type;
        this.dropOnDeath = dropOnDeath;
    }

    // ---------------------------------------------------------------------------------
    // Getters
    // ---------------------------------------------------------------------------------

    public EntityVarType getType()   { return type; }
    public boolean       isDropOnDeath() { return dropOnDeath; }
    public boolean       isDirty()   { return dirty; }
    public void          clearDirty(){ dirty = false; }

    public int       getInt()    { return intVal; }
    public float     getFloat()  { return floatVal; }
    public boolean   getBool()   { return boolVal; }
    public String    getString() { return stringVal; }
    public ItemStack getItem()   { return itemVal; }

    // ---------------------------------------------------------------------------------
    // Setters — all mark dirty
    // ---------------------------------------------------------------------------------

    public void setInt(int v)         { if (intVal   != v)           { intVal   = v;       dirty = true; } }
    public void setFloat(float v)     { if (floatVal != v)           { floatVal = v;       dirty = true; } }
    public void setBool(boolean v)    { if (boolVal  != v)           { boolVal  = v;       dirty = true; } }
    public void setString(String v)   { if (!stringVal.equals(v))    { stringVal = v;      dirty = true; } }
    public void setItem(ItemStack v)  {
        if (!ItemStack.matches(itemVal, v)) { itemVal = v.copy();      dirty = true; }
    }

    /** Force-mark dirty regardless of value change. Used after NBT load. */
    public void markDirty() { dirty = true; }

    // ---------------------------------------------------------------------------------
    // NBT serialisation (server persistence)
    // ---------------------------------------------------------------------------------

    public net.minecraft.nbt.CompoundTag toNbt(net.minecraft.core.HolderLookup.Provider registries) {
        var tag = new net.minecraft.nbt.CompoundTag();
        tag.putByte("type", type.wireId());
        tag.putBoolean("drop", dropOnDeath);
        switch (type) {
            case INT        -> tag.putInt("v",     intVal);
            case FLOAT      -> tag.putFloat("v",   floatVal);
            case BOOL       -> tag.putBoolean("v", boolVal);
            case STRING     -> tag.putString("v",  stringVal);
            case ITEM_STACK -> tag.put("v",        (net.minecraft.nbt.Tag) itemVal.save(registries));
        }
        return tag;
    }

    public static EntityVar fromNbt(net.minecraft.nbt.CompoundTag tag,
                                    net.minecraft.core.HolderLookup.Provider registries) {
        EntityVarType type = EntityVarType.fromWireId(tag.getByte("type"));
        boolean drop       = tag.getBoolean("drop");
        EntityVar v        = new EntityVar(type, drop);
        switch (type) {
            case INT        -> v.intVal    = tag.getInt("v");
            case FLOAT      -> v.floatVal  = tag.getFloat("v");
            case BOOL       -> v.boolVal   = tag.getBoolean("v");
            case STRING     -> v.stringVal = tag.getString("v");
            case ITEM_STACK -> v.itemVal   = ItemStack.parseOptional(registries,
                                                tag.getCompound("v"));
        }
        v.dirty = true; // re-sync after load
        return v;
    }
}
