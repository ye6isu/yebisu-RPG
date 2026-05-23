package net.ye6isu.yebisuRPG.data.network;

import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.runtime.ObjectMethods;
import java.util.List;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.ItemStack;
import net.ye6isu.yebisuRPG.data.EntityVar;
import net.ye6isu.yebisuRPG.data.EntityVarType;
import net.ye6isu.yebisuRPG.yebisuRPG;
import net.ye6isu.yebisulib.network.BasePayload;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/data/network/VarSyncPayload.class */
public final class VarSyncPayload extends Record implements BasePayload {
    private final int entityId;
    private final List<VarEntry> vars;
    public static final CustomPacketPayload.Type<VarSyncPayload> TYPE = new CustomPacketPayload.Type<>(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "var_sync"));
    public static final StreamCodec<RegistryFriendlyByteBuf, VarSyncPayload> STREAM_CODEC = StreamCodec.composite(ByteBufCodecs.VAR_INT, (v0) -> {
        return v0.entityId();
    }, VarEntry.STREAM_CODEC.apply(ByteBufCodecs.list()), (v0) -> {
        return v0.vars();
    }, (v1, v2) -> {
        return new VarSyncPayload(v1, v2);
    });

    public VarSyncPayload(int entityId, List<VarEntry> vars) {
        this.entityId = entityId;
        this.vars = vars;
    }

    @Override // java.lang.Record
    public final String toString() {
        return (String) ObjectMethods.bootstrap(MethodHandles.lookup(), "toString", MethodType.methodType(String.class, VarSyncPayload.class), VarSyncPayload.class, "entityId;vars", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload;->entityId:I", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload;->vars:Ljava/util/List;").dynamicInvoker().invoke(this) /* invoke-custom */;
    }

    @Override // java.lang.Record
    public final int hashCode() {
        return (int) ObjectMethods.bootstrap(MethodHandles.lookup(), "hashCode", MethodType.methodType(Integer.TYPE, VarSyncPayload.class), VarSyncPayload.class, "entityId;vars", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload;->entityId:I", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload;->vars:Ljava/util/List;").dynamicInvoker().invoke(this) /* invoke-custom */;
    }

    @Override // java.lang.Record
    public final boolean equals(Object o) {
        return (boolean) ObjectMethods.bootstrap(MethodHandles.lookup(), "equals", MethodType.methodType(Boolean.TYPE, VarSyncPayload.class, Object.class), VarSyncPayload.class, "entityId;vars", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload;->entityId:I", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload;->vars:Ljava/util/List;").dynamicInvoker().invoke(this, o) /* invoke-custom */;
    }

    public int entityId() {
        return this.entityId;
    }

    public List<VarEntry> vars() {
        return this.vars;
    }

    @Override // net.ye6isu.yebisulib.network.BasePayload
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }

    /* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry.class */
    public static final class VarEntry extends Record {
        private final String key;
        private final byte typeId;
        private final int intVal;
        private final float floatVal;
        private final boolean boolVal;
        private final String stringVal;
        private final ItemStack itemVal;
        public static final StreamCodec<RegistryFriendlyByteBuf, VarEntry> STREAM_CODEC = new StreamCodec<RegistryFriendlyByteBuf, VarEntry>() { // from class: net.ye6isu.yebisuRPG.data.network.VarSyncPayload.VarEntry.1
            /* JADX INFO: Thrown type has an unknown type hierarchy: java.lang.MatchException */
            public VarEntry decode(RegistryFriendlyByteBuf buf) throws MatchException {
                String key = (String) ByteBufCodecs.stringUtf8(64).decode(buf);
                byte typeId = buf.readByte();
                switch (C00041.$SwitchMap$net$ye6isu$yebisuRPG$data$EntityVarType[EntityVarType.fromWireId(typeId).ordinal()]) {
                    case ID_FLOAT:
                        return VarEntry.ofInt(key, ((Integer) ByteBufCodecs.VAR_INT.decode(buf)).intValue());
                    case ID_BOOL:
                        return VarEntry.ofFloat(key, buf.readFloat());
                    case ID_STRING:
                        return VarEntry.ofBool(key, buf.readBoolean());
                    case ID_ITEM_STACK:
                        return VarEntry.ofString(key, (String) ByteBufCodecs.stringUtf8(256).decode(buf));
                    case 5:
                        return VarEntry.ofItem(key, (ItemStack) ItemStack.STREAM_CODEC.decode(buf));
                    default:
                        throw new MatchException((String) null, (Throwable) null);
                }
            }

            public void encode(RegistryFriendlyByteBuf buf, VarEntry e) {
                ByteBufCodecs.stringUtf8(64).encode(buf, e.key());
                buf.writeByte(e.typeId());
                switch (C00041.$SwitchMap$net$ye6isu$yebisuRPG$data$EntityVarType[EntityVarType.fromWireId(e.typeId()).ordinal()]) {
                    case ID_FLOAT:
                        ByteBufCodecs.VAR_INT.encode(buf, Integer.valueOf(e.intVal()));
                        break;
                    case ID_BOOL:
                        buf.writeFloat(e.floatVal());
                        break;
                    case ID_STRING:
                        buf.writeBoolean(e.boolVal());
                        break;
                    case ID_ITEM_STACK:
                        ByteBufCodecs.stringUtf8(256).encode(buf, e.stringVal());
                        break;
                    case 5:
                        ItemStack.STREAM_CODEC.encode(buf, e.itemVal());
                        break;
                }
            }
        };

        public VarEntry(String key, byte typeId, int intVal, float floatVal, boolean boolVal, String stringVal, ItemStack itemVal) {
            this.key = key;
            this.typeId = typeId;
            this.intVal = intVal;
            this.floatVal = floatVal;
            this.boolVal = boolVal;
            this.stringVal = stringVal;
            this.itemVal = itemVal;
        }

        @Override // java.lang.Record
        public final String toString() {
            return (String) ObjectMethods.bootstrap(MethodHandles.lookup(), "toString", MethodType.methodType(String.class, VarEntry.class), VarEntry.class, "key;typeId;intVal;floatVal;boolVal;stringVal;itemVal", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->key:Ljava/lang/String;", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->typeId:B", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->intVal:I", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->floatVal:F", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->boolVal:Z", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->stringVal:Ljava/lang/String;", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->itemVal:Lnet/minecraft/world/item/ItemStack;").dynamicInvoker().invoke(this) /* invoke-custom */;
        }

        @Override // java.lang.Record
        public final int hashCode() {
            return (int) ObjectMethods.bootstrap(MethodHandles.lookup(), "hashCode", MethodType.methodType(Integer.TYPE, VarEntry.class), VarEntry.class, "key;typeId;intVal;floatVal;boolVal;stringVal;itemVal", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->key:Ljava/lang/String;", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->typeId:B", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->intVal:I", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->floatVal:F", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->boolVal:Z", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->stringVal:Ljava/lang/String;", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->itemVal:Lnet/minecraft/world/item/ItemStack;").dynamicInvoker().invoke(this) /* invoke-custom */;
        }

        @Override // java.lang.Record
        public final boolean equals(Object o) {
            return (boolean) ObjectMethods.bootstrap(MethodHandles.lookup(), "equals", MethodType.methodType(Boolean.TYPE, VarEntry.class, Object.class), VarEntry.class, "key;typeId;intVal;floatVal;boolVal;stringVal;itemVal", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->key:Ljava/lang/String;", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->typeId:B", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->intVal:I", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->floatVal:F", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->boolVal:Z", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->stringVal:Ljava/lang/String;", "FIELD:Lnet/ye6isu/yebisuRPG/data/network/VarSyncPayload$VarEntry;->itemVal:Lnet/minecraft/world/item/ItemStack;").dynamicInvoker().invoke(this, o) /* invoke-custom */;
        }

        public String key() {
            return this.key;
        }

        public byte typeId() {
            return this.typeId;
        }

        public int intVal() {
            return this.intVal;
        }

        public float floatVal() {
            return this.floatVal;
        }

        public boolean boolVal() {
            return this.boolVal;
        }

        public String stringVal() {
            return this.stringVal;
        }

        public ItemStack itemVal() {
            return this.itemVal;
        }

        public static VarEntry ofInt(String key, int v) {
            return new VarEntry(key, EntityVarType.INT.wireId(), v, 0.0f, false, "", ItemStack.EMPTY);
        }

        public static VarEntry ofFloat(String key, float v) {
            return new VarEntry(key, EntityVarType.FLOAT.wireId(), 0, v, false, "", ItemStack.EMPTY);
        }

        public static VarEntry ofBool(String key, boolean v) {
            return new VarEntry(key, EntityVarType.BOOL.wireId(), 0, 0.0f, v, "", ItemStack.EMPTY);
        }

        public static VarEntry ofString(String key, String v) {
            return new VarEntry(key, EntityVarType.STRING.wireId(), 0, 0.0f, false, v, ItemStack.EMPTY);
        }

        public static VarEntry ofItem(String key, ItemStack v) {
            return new VarEntry(key, EntityVarType.ITEM_STACK.wireId(), 0, 0.0f, false, "", v);
        }

        /* JADX INFO: Thrown type has an unknown type hierarchy: java.lang.MatchException */
        public static VarEntry from(String key, EntityVar var) throws MatchException {
            switch (C00041.$SwitchMap$net$ye6isu$yebisuRPG$data$EntityVarType[var.getType().ordinal()]) {
                case ID_FLOAT:
                    return ofInt(key, var.getInt());
                case ID_BOOL:
                    return ofFloat(key, var.getFloat());
                case ID_STRING:
                    return ofBool(key, var.getBool());
                case ID_ITEM_STACK:
                    return ofString(key, var.getString());
                case 5:
                    return ofItem(key, var.getItem());
                default:
                    throw new MatchException((String) null, (Throwable) null);
            }
        }
    }

    /* JADX INFO: renamed from: net.ye6isu.yebisuRPG.data.network.VarSyncPayload$1 */
    /* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/data/network/VarSyncPayload$1.class */
    static /* synthetic */ class C00041 {
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
}
