package net.ye6isu.yebisuRPG.data.network;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.ItemStack;
import net.ye6isu.yebisuRPG.network.BasePayload;
import net.ye6isu.yebisuRPG.data.EntityVarType;

import java.util.List;

/**
 * S2C payload carrying a batch of variable changes for one entity.
 *
 * <h2>Efficiency design</h2>
 * <p>One payload covers <b>all dirty variables</b> for one entity in a single packet.
 * The server only sends this when at least one variable has changed, throttled to at
 * most once per {@link net.ye6isu.yebisuRPG.data.network.EntityVarSync#SYNC_INTERVAL_MS}.
 * On join, one payload per entity with variables — no per-variable overhead.</p>
 *
 * <h2>Wire format per {@link VarEntry}</h2>
 * <pre>
 *  key        String (max 64 chars)
 *  typeId     Byte   (0=int, 1=float, 2=bool, 3=string, 4=itemstack)
 *  value      varies by type
 * </pre>
 *
 * <p>Uses {@link RegistryFriendlyByteBuf} because {@link ItemStack} requires registry access.</p>
 *
 * @param entityId the entity's integer ID
 * @param vars     list of changed variables (name + encoded value)
 */
public record VarSyncPayload(int entityId, List<VarEntry> vars) implements BasePayload {

    public static final CustomPacketPayload.Type<VarSyncPayload> TYPE =
        new CustomPacketPayload.Type<>(
            ResourceLocation.fromNamespaceAndPath("yebisurpg", "var_sync"));

    public static final StreamCodec<RegistryFriendlyByteBuf, VarSyncPayload> STREAM_CODEC =
        StreamCodec.composite(
            ByteBufCodecs.VAR_INT,                              VarSyncPayload::entityId,
            VarEntry.STREAM_CODEC.apply(ByteBufCodecs.list()),  VarSyncPayload::vars,
            VarSyncPayload::new);

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() { return TYPE; }

    // ---------------------------------------------------------------------------------
    // VarEntry — one variable's name + encoded value
    // ---------------------------------------------------------------------------------

    /**
     * Wire representation of one variable change.
     * The value is encoded inline as:
     * <ul>
     *   <li>Byte: typeId</li>
     *   <li>Remaining: type-specific value</li>
     * </ul>
     */
    public record VarEntry(String key, byte typeId, int intVal, float floatVal, double doubleVal,
                           boolean boolVal, String stringVal, ItemStack itemVal) {

        public static final StreamCodec<RegistryFriendlyByteBuf, VarEntry> STREAM_CODEC =
            new StreamCodec<>() {
                @Override
                public VarEntry decode(RegistryFriendlyByteBuf buf) {
                    String key    = ByteBufCodecs.stringUtf8(64).decode(buf);
                    byte   typeId = buf.readByte();
                    return switch (EntityVarType.fromWireId(typeId)) {
                        case INT        -> ofInt(key,    ByteBufCodecs.VAR_INT.decode(buf));
                        case FLOAT      -> ofFloat(key,  buf.readFloat());
                        case DOUBLE     -> ofDouble(key, buf.readDouble());
                        case BOOL       -> ofBool(key,   buf.readBoolean());
                        case STRING     -> ofString(key, ByteBufCodecs.stringUtf8(256).decode(buf));
                        case ITEM_STACK -> ofItem(key,   ItemStack.STREAM_CODEC.decode(buf));
                    };
                }

                @Override
                public void encode(RegistryFriendlyByteBuf buf, VarEntry e) {
                    ByteBufCodecs.stringUtf8(64).encode(buf, e.key());
                    buf.writeByte(e.typeId());
                    switch (EntityVarType.fromWireId(e.typeId())) {
                        case INT        -> ByteBufCodecs.VAR_INT.encode(buf, e.intVal());
                        case FLOAT      -> buf.writeFloat(e.floatVal());
                        case DOUBLE     -> buf.writeDouble(e.doubleVal());
                        case BOOL       -> buf.writeBoolean(e.boolVal());
                        case STRING     -> ByteBufCodecs.stringUtf8(256).encode(buf, e.stringVal());
                        case ITEM_STACK -> ItemStack.STREAM_CODEC.encode(buf, e.itemVal());
                    }
                }
            };

        // ---------------------------------------------------------------------------------
        // Factories
        // ---------------------------------------------------------------------------------
        public static VarEntry ofInt(String key, int v) {
            return new VarEntry(key, EntityVarType.INT.wireId(), v, 0f, 0.0, false, "", ItemStack.EMPTY); }
        public static VarEntry ofFloat(String key, float v) {
            return new VarEntry(key, EntityVarType.FLOAT.wireId(), 0, v, 0.0, false, "", ItemStack.EMPTY); }
        public static VarEntry ofDouble(String key, double v) {
            return new VarEntry(key, EntityVarType.DOUBLE.wireId(), 0, 0f, v, false, "", ItemStack.EMPTY); }
        public static VarEntry ofBool(String key, boolean v) {
            return new VarEntry(key, EntityVarType.BOOL.wireId(), 0, 0f, 0.0, v, "", ItemStack.EMPTY); }
        public static VarEntry ofString(String key, String v) {
            return new VarEntry(key, EntityVarType.STRING.wireId(), 0, 0f, 0.0, false, v, ItemStack.EMPTY); }
        public static VarEntry ofItem(String key, ItemStack v) {
            return new VarEntry(key, EntityVarType.ITEM_STACK.wireId(), 0, 0f, 0.0, false, "", v); }

        /** Build from a live {@link net.ye6isu.yebisuRPG.data.EntityVar}. */
        public static VarEntry from(String key, net.ye6isu.yebisuRPG.data.EntityVar var) {
            return switch (var.getType()) {
                case INT        -> ofInt(key,    var.getInt());
                case FLOAT      -> ofFloat(key,  var.getFloat());
                case DOUBLE     -> ofDouble(key, var.getDouble());
                case BOOL       -> ofBool(key,   var.getBool());
                case STRING     -> ofString(key, var.getString());
                case ITEM_STACK -> ofItem(key,   var.getItem());
            };
        }
    }
}
