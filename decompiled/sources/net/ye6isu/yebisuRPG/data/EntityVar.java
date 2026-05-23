package net.ye6isu.yebisuRPG.data;

import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.world.item.ItemStack;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/data/EntityVar.class */
public final class EntityVar {
    private final EntityVarType type;
    private final boolean dropOnDeath;
    private int intVal;
    private float floatVal;
    private boolean boolVal;
    private String stringVal = "";
    private ItemStack itemVal = ItemStack.EMPTY;
    private boolean dirty = true;

    public static EntityVar ofInt(int value) {
        EntityVar v = new EntityVar(EntityVarType.INT, false);
        v.intVal = value;
        return v;
    }

    public static EntityVar ofFloat(float value) {
        EntityVar v = new EntityVar(EntityVarType.FLOAT, false);
        v.floatVal = value;
        return v;
    }

    public static EntityVar ofBool(boolean value) {
        EntityVar v = new EntityVar(EntityVarType.BOOL, false);
        v.boolVal = value;
        return v;
    }

    public static EntityVar ofString(String value) {
        EntityVar v = new EntityVar(EntityVarType.STRING, false);
        v.stringVal = value;
        return v;
    }

    public static EntityVar ofItem(ItemStack value, boolean dropOnDeath) {
        EntityVar v = new EntityVar(EntityVarType.ITEM_STACK, dropOnDeath);
        v.itemVal = value.copy();
        return v;
    }

    private EntityVar(EntityVarType type, boolean dropOnDeath) {
        this.type = type;
        this.dropOnDeath = dropOnDeath;
    }

    public EntityVarType getType() {
        return this.type;
    }

    public boolean isDropOnDeath() {
        return this.dropOnDeath;
    }

    public boolean isDirty() {
        return this.dirty;
    }

    public void clearDirty() {
        this.dirty = false;
    }

    public int getInt() {
        return this.intVal;
    }

    public float getFloat() {
        return this.floatVal;
    }

    public boolean getBool() {
        return this.boolVal;
    }

    public String getString() {
        return this.stringVal;
    }

    public ItemStack getItem() {
        return this.itemVal;
    }

    public void setInt(int v) {
        if (this.intVal != v) {
            this.intVal = v;
            this.dirty = true;
        }
    }

    public void setFloat(float v) {
        if (this.floatVal != v) {
            this.floatVal = v;
            this.dirty = true;
        }
    }

    public void setBool(boolean v) {
        if (this.boolVal != v) {
            this.boolVal = v;
            this.dirty = true;
        }
    }

    public void setString(String v) {
        if (this.stringVal.equals(v)) {
            return;
        }
        this.stringVal = v;
        this.dirty = true;
    }

    public void setItem(ItemStack v) {
        if (!ItemStack.matches(this.itemVal, v)) {
            this.itemVal = v.copy();
            this.dirty = true;
        }
    }

    public void markDirty() {
        this.dirty = true;
    }

    public CompoundTag toNbt(HolderLookup.Provider registries) {
        CompoundTag tag = new CompoundTag();
        tag.putByte("type", this.type.wireId());
        tag.putBoolean("drop", this.dropOnDeath);
        switch (C00021.$SwitchMap$net$ye6isu$yebisuRPG$data$EntityVarType[this.type.ordinal()]) {
            case ID_FLOAT:
                tag.putInt("v", this.intVal);
                break;
            case ID_BOOL:
                tag.putFloat("v", this.floatVal);
                break;
            case ID_STRING:
                tag.putBoolean("v", this.boolVal);
                break;
            case ID_ITEM_STACK:
                tag.putString("v", this.stringVal);
                break;
            case 5:
                tag.put("v", this.itemVal.save(registries));
                break;
        }
        return tag;
    }

    /* JADX INFO: renamed from: net.ye6isu.yebisuRPG.data.EntityVar$1 */
    /* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/data/EntityVar$1.class */
    static /* synthetic */ class C00021 {
        static final /* synthetic */ int[] $SwitchMap$net$ye6isu$yebisuRPG$data$EntityVarType = new int[EntityVarType.values().length];

        static {
            try {
                $SwitchMap$net$ye6isu$yebisuRPG$data$EntityVarType[EntityVarType.INT.ordinal()] = 1;
            } catch (NoSuchFieldError e) {
            }
            try {
                $SwitchMap$net$ye6isu$yebisuRPG$data$EntityVarType[EntityVarType.FLOAT.ordinal()] = 2;
            } catch (NoSuchFieldError e2) {
            }
            try {
                $SwitchMap$net$ye6isu$yebisuRPG$data$EntityVarType[EntityVarType.BOOL.ordinal()] = 3;
            } catch (NoSuchFieldError e3) {
            }
            try {
                $SwitchMap$net$ye6isu$yebisuRPG$data$EntityVarType[EntityVarType.STRING.ordinal()] = 4;
            } catch (NoSuchFieldError e4) {
            }
            try {
                $SwitchMap$net$ye6isu$yebisuRPG$data$EntityVarType[EntityVarType.ITEM_STACK.ordinal()] = 5;
            } catch (NoSuchFieldError e5) {
            }
        }
    }

    public static EntityVar fromNbt(CompoundTag tag, HolderLookup.Provider registries) {
        EntityVarType type = EntityVarType.fromWireId(tag.getByte("type"));
        boolean drop = tag.getBoolean("drop");
        EntityVar v = new EntityVar(type, drop);
        switch (C00021.$SwitchMap$net$ye6isu$yebisuRPG$data$EntityVarType[type.ordinal()]) {
            case ID_FLOAT:
                v.intVal = tag.getInt("v");
                break;
            case ID_BOOL:
                v.floatVal = tag.getFloat("v");
                break;
            case ID_STRING:
                v.boolVal = tag.getBoolean("v");
                break;
            case ID_ITEM_STACK:
                v.stringVal = tag.getString("v");
                break;
            case 5:
                v.itemVal = ItemStack.parseOptional(registries, tag.getCompound("v"));
                break;
        }
        v.dirty = true;
        return v;
    }
}
