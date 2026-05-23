package net.ye6isu.yebisulib.texture.network;

import io.netty.buffer.ByteBuf;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.runtime.ObjectMethods;
import java.util.List;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.yebisuRPG;
import net.ye6isu.yebisulib.network.BasePayload;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/texture/network/TextureSyncPayload.class */
public final class TextureSyncPayload extends Record implements BasePayload {
    private final int entityId;
    private final List<LayerData> layers;
    public static final CustomPacketPayload.Type<TextureSyncPayload> TYPE = new CustomPacketPayload.Type<>(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "texture_sync"));
    public static final StreamCodec<ByteBuf, TextureSyncPayload> STREAM_CODEC = StreamCodec.composite(ByteBufCodecs.VAR_INT, (v0) -> {
        return v0.entityId();
    }, LayerData.STREAM_CODEC.apply(ByteBufCodecs.list()), (v0) -> {
        return v0.layers();
    }, (v1, v2) -> {
        return new TextureSyncPayload(v1, v2);
    });

    public TextureSyncPayload(int entityId, List<LayerData> layers) {
        this.entityId = entityId;
        this.layers = layers;
    }

    @Override // java.lang.Record
    public final String toString() {
        return (String) ObjectMethods.bootstrap(MethodHandles.lookup(), "toString", MethodType.methodType(String.class, TextureSyncPayload.class), TextureSyncPayload.class, "entityId;layers", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload;->entityId:I", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload;->layers:Ljava/util/List;").dynamicInvoker().invoke(this) /* invoke-custom */;
    }

    @Override // java.lang.Record
    public final int hashCode() {
        return (int) ObjectMethods.bootstrap(MethodHandles.lookup(), "hashCode", MethodType.methodType(Integer.TYPE, TextureSyncPayload.class), TextureSyncPayload.class, "entityId;layers", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload;->entityId:I", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload;->layers:Ljava/util/List;").dynamicInvoker().invoke(this) /* invoke-custom */;
    }

    @Override // java.lang.Record
    public final boolean equals(Object o) {
        return (boolean) ObjectMethods.bootstrap(MethodHandles.lookup(), "equals", MethodType.methodType(Boolean.TYPE, TextureSyncPayload.class, Object.class), TextureSyncPayload.class, "entityId;layers", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload;->entityId:I", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload;->layers:Ljava/util/List;").dynamicInvoker().invoke(this, o) /* invoke-custom */;
    }

    public int entityId() {
        return this.entityId;
    }

    public List<LayerData> layers() {
        return this.layers;
    }

    @Override // net.ye6isu.yebisulib.network.BasePayload
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }

    /* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerData.class */
    public static final class LayerData extends Record {
        private final LayerBase base;
        private final LayerAnim anim;
        private final LayerEmissive emissive;
        public static final StreamCodec<ByteBuf, LayerData> STREAM_CODEC = StreamCodec.composite(LayerBase.STREAM_CODEC, (v0) -> {
            return v0.base();
        }, LayerAnim.STREAM_CODEC, (v0) -> {
            return v0.anim();
        }, LayerEmissive.STREAM_CODEC, (v0) -> {
            return v0.emissive();
        }, LayerData::new);

        public LayerData(LayerBase base, LayerAnim anim, LayerEmissive emissive) {
            this.base = base;
            this.anim = anim;
            this.emissive = emissive;
        }

        @Override // java.lang.Record
        public final String toString() {
            return (String) ObjectMethods.bootstrap(MethodHandles.lookup(), "toString", MethodType.methodType(String.class, LayerData.class), LayerData.class, "base;anim;emissive", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerData;->base:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerData;->anim:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim;", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerData;->emissive:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerEmissive;").dynamicInvoker().invoke(this) /* invoke-custom */;
        }

        @Override // java.lang.Record
        public final int hashCode() {
            return (int) ObjectMethods.bootstrap(MethodHandles.lookup(), "hashCode", MethodType.methodType(Integer.TYPE, LayerData.class), LayerData.class, "base;anim;emissive", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerData;->base:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerData;->anim:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim;", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerData;->emissive:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerEmissive;").dynamicInvoker().invoke(this) /* invoke-custom */;
        }

        @Override // java.lang.Record
        public final boolean equals(Object o) {
            return (boolean) ObjectMethods.bootstrap(MethodHandles.lookup(), "equals", MethodType.methodType(Boolean.TYPE, LayerData.class, Object.class), LayerData.class, "base;anim;emissive", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerData;->base:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerData;->anim:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim;", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerData;->emissive:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerEmissive;").dynamicInvoker().invoke(this, o) /* invoke-custom */;
        }

        public LayerBase base() {
            return this.base;
        }

        public LayerAnim anim() {
            return this.anim;
        }

        public LayerEmissive emissive() {
            return this.emissive;
        }

        public static LayerData simple(String texturePath, int zIndex) {
            return new LayerData(new LayerBase(texturePath, zIndex, (byte) 0, false, "", 0), LayerAnim.NONE, LayerEmissive.NONE);
        }

        public static LayerData maskedByBase(String texturePath, int zIndex) {
            return new LayerData(new LayerBase(texturePath, zIndex, (byte) 1, false, "", 0), LayerAnim.NONE, LayerEmissive.NONE);
        }

        public static LayerData maskedByTexture(String texturePath, int zIndex, String maskPath, int maskZIndex) {
            return new LayerData(new LayerBase(texturePath, zIndex, (byte) 2, true, maskPath, maskZIndex), LayerAnim.NONE, LayerEmissive.NONE);
        }

        public static LayerData cutoutWithMask(String texturePath, int zIndex, String maskPath) {
            return new LayerData(new LayerBase(texturePath, zIndex, (byte) 1, true, maskPath, 0), LayerAnim.NONE, LayerEmissive.NONE);
        }

        public static LayerData cutoutWithMaskAndEmissive(String texturePath, int zIndex, String maskPath, String emissivePath) {
            return new LayerData(new LayerBase(texturePath, zIndex, (byte) 1, true, maskPath, 0), LayerAnim.NONE, new LayerEmissive(emissivePath));
        }

        public static LayerData animatedCutoutWithMask(String texturePath, int zIndex, String maskPath, int columns, int rows, int ticksPerFrame, byte animModeByte) {
            return new LayerData(new LayerBase(texturePath, zIndex, (byte) 1, true, maskPath, 0), new LayerAnim(true, columns, rows, ticksPerFrame, animModeByte), LayerEmissive.NONE);
        }

        public static LayerData animatedCutoutWithMaskAndEmissive(String texturePath, int zIndex, String maskPath, String emissivePath, int columns, int rows, int ticksPerFrame, byte animModeByte) {
            return new LayerData(new LayerBase(texturePath, zIndex, (byte) 1, true, maskPath, 0), new LayerAnim(true, columns, rows, ticksPerFrame, animModeByte), new LayerEmissive(emissivePath));
        }

        public static LayerData animated(String texturePath, int zIndex, byte maskModeByte, String maskPath, int maskZIndex, int columns, int rows, int ticksPerFrame, byte animModeByte) {
            boolean hasMask = maskModeByte == 2 && !maskPath.isEmpty();
            return new LayerData(new LayerBase(texturePath, zIndex, maskModeByte, hasMask, hasMask ? maskPath : "", maskZIndex), new LayerAnim(true, columns, rows, ticksPerFrame, animModeByte), LayerEmissive.NONE);
        }
    }

    /* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase.class */
    public static final class LayerBase extends Record {
        private final String texturePath;
        private final int zIndex;
        private final byte maskModeByte;
        private final boolean hasMask;
        private final String maskPath;
        private final int maskZIndex;
        public static final StreamCodec<ByteBuf, LayerBase> STREAM_CODEC = StreamCodec.composite(ByteBufCodecs.stringUtf8(256), (v0) -> {
            return v0.texturePath();
        }, ByteBufCodecs.VAR_INT, (v0) -> {
            return v0.zIndex();
        }, ByteBufCodecs.BYTE, (v0) -> {
            return v0.maskModeByte();
        }, ByteBufCodecs.BOOL, (v0) -> {
            return v0.hasMask();
        }, ByteBufCodecs.stringUtf8(256), (v0) -> {
            return v0.maskPath();
        }, ByteBufCodecs.VAR_INT, (v0) -> {
            return v0.maskZIndex();
        }, (v1, v2, v3, v4, v5, v6) -> {
            return new LayerBase(v1, v2, v3, v4, v5, v6);
        });

        public LayerBase(String texturePath, int zIndex, byte maskModeByte, boolean hasMask, String maskPath, int maskZIndex) {
            this.texturePath = texturePath;
            this.zIndex = zIndex;
            this.maskModeByte = maskModeByte;
            this.hasMask = hasMask;
            this.maskPath = maskPath;
            this.maskZIndex = maskZIndex;
        }

        @Override // java.lang.Record
        public final String toString() {
            return (String) ObjectMethods.bootstrap(MethodHandles.lookup(), "toString", MethodType.methodType(String.class, LayerBase.class), LayerBase.class, "texturePath;zIndex;maskModeByte;hasMask;maskPath;maskZIndex", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;->texturePath:Ljava/lang/String;", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;->zIndex:I", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;->maskModeByte:B", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;->hasMask:Z", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;->maskPath:Ljava/lang/String;", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;->maskZIndex:I").dynamicInvoker().invoke(this) /* invoke-custom */;
        }

        @Override // java.lang.Record
        public final int hashCode() {
            return (int) ObjectMethods.bootstrap(MethodHandles.lookup(), "hashCode", MethodType.methodType(Integer.TYPE, LayerBase.class), LayerBase.class, "texturePath;zIndex;maskModeByte;hasMask;maskPath;maskZIndex", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;->texturePath:Ljava/lang/String;", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;->zIndex:I", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;->maskModeByte:B", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;->hasMask:Z", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;->maskPath:Ljava/lang/String;", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;->maskZIndex:I").dynamicInvoker().invoke(this) /* invoke-custom */;
        }

        @Override // java.lang.Record
        public final boolean equals(Object o) {
            return (boolean) ObjectMethods.bootstrap(MethodHandles.lookup(), "equals", MethodType.methodType(Boolean.TYPE, LayerBase.class, Object.class), LayerBase.class, "texturePath;zIndex;maskModeByte;hasMask;maskPath;maskZIndex", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;->texturePath:Ljava/lang/String;", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;->zIndex:I", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;->maskModeByte:B", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;->hasMask:Z", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;->maskPath:Ljava/lang/String;", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerBase;->maskZIndex:I").dynamicInvoker().invoke(this, o) /* invoke-custom */;
        }

        public String texturePath() {
            return this.texturePath;
        }

        public int zIndex() {
            return this.zIndex;
        }

        public byte maskModeByte() {
            return this.maskModeByte;
        }

        public boolean hasMask() {
            return this.hasMask;
        }

        public String maskPath() {
            return this.maskPath;
        }

        public int maskZIndex() {
            return this.maskZIndex;
        }
    }

    /* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim.class */
    public static final class LayerAnim extends Record {
        private final boolean isAnimated;
        private final int columns;
        private final int rows;
        private final int ticksPerFrame;
        private final byte animModeByte;
        public static final LayerAnim NONE = new LayerAnim(false, 1, 1, 1, (byte) 0);
        public static final StreamCodec<ByteBuf, LayerAnim> STREAM_CODEC = StreamCodec.composite(ByteBufCodecs.BOOL, (v0) -> {
            return v0.isAnimated();
        }, ByteBufCodecs.VAR_INT, (v0) -> {
            return v0.columns();
        }, ByteBufCodecs.VAR_INT, (v0) -> {
            return v0.rows();
        }, ByteBufCodecs.VAR_INT, (v0) -> {
            return v0.ticksPerFrame();
        }, ByteBufCodecs.BYTE, (v0) -> {
            return v0.animModeByte();
        }, (v1, v2, v3, v4, v5) -> {
            return new LayerAnim(v1, v2, v3, v4, v5);
        });

        public LayerAnim(boolean isAnimated, int columns, int rows, int ticksPerFrame, byte animModeByte) {
            this.isAnimated = isAnimated;
            this.columns = columns;
            this.rows = rows;
            this.ticksPerFrame = ticksPerFrame;
            this.animModeByte = animModeByte;
        }

        @Override // java.lang.Record
        public final String toString() {
            return (String) ObjectMethods.bootstrap(MethodHandles.lookup(), "toString", MethodType.methodType(String.class, LayerAnim.class), LayerAnim.class, "isAnimated;columns;rows;ticksPerFrame;animModeByte", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim;->isAnimated:Z", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim;->columns:I", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim;->rows:I", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim;->ticksPerFrame:I", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim;->animModeByte:B").dynamicInvoker().invoke(this) /* invoke-custom */;
        }

        @Override // java.lang.Record
        public final int hashCode() {
            return (int) ObjectMethods.bootstrap(MethodHandles.lookup(), "hashCode", MethodType.methodType(Integer.TYPE, LayerAnim.class), LayerAnim.class, "isAnimated;columns;rows;ticksPerFrame;animModeByte", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim;->isAnimated:Z", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim;->columns:I", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim;->rows:I", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim;->ticksPerFrame:I", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim;->animModeByte:B").dynamicInvoker().invoke(this) /* invoke-custom */;
        }

        @Override // java.lang.Record
        public final boolean equals(Object o) {
            return (boolean) ObjectMethods.bootstrap(MethodHandles.lookup(), "equals", MethodType.methodType(Boolean.TYPE, LayerAnim.class, Object.class), LayerAnim.class, "isAnimated;columns;rows;ticksPerFrame;animModeByte", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim;->isAnimated:Z", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim;->columns:I", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim;->rows:I", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim;->ticksPerFrame:I", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerAnim;->animModeByte:B").dynamicInvoker().invoke(this, o) /* invoke-custom */;
        }

        public boolean isAnimated() {
            return this.isAnimated;
        }

        public int columns() {
            return this.columns;
        }

        public int rows() {
            return this.rows;
        }

        public int ticksPerFrame() {
            return this.ticksPerFrame;
        }

        public byte animModeByte() {
            return this.animModeByte;
        }
    }

    /* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerEmissive.class */
    public static final class LayerEmissive extends Record {
        private final String emissivePath;
        public static final LayerEmissive NONE = new LayerEmissive("");
        public static final StreamCodec<ByteBuf, LayerEmissive> STREAM_CODEC = StreamCodec.composite(ByteBufCodecs.stringUtf8(256), (v0) -> {
            return v0.emissivePath();
        }, LayerEmissive::new);

        public LayerEmissive(String emissivePath) {
            this.emissivePath = emissivePath;
        }

        @Override // java.lang.Record
        public final String toString() {
            return (String) ObjectMethods.bootstrap(MethodHandles.lookup(), "toString", MethodType.methodType(String.class, LayerEmissive.class), LayerEmissive.class, "emissivePath", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerEmissive;->emissivePath:Ljava/lang/String;").dynamicInvoker().invoke(this) /* invoke-custom */;
        }

        @Override // java.lang.Record
        public final int hashCode() {
            return (int) ObjectMethods.bootstrap(MethodHandles.lookup(), "hashCode", MethodType.methodType(Integer.TYPE, LayerEmissive.class), LayerEmissive.class, "emissivePath", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerEmissive;->emissivePath:Ljava/lang/String;").dynamicInvoker().invoke(this) /* invoke-custom */;
        }

        @Override // java.lang.Record
        public final boolean equals(Object o) {
            return (boolean) ObjectMethods.bootstrap(MethodHandles.lookup(), "equals", MethodType.methodType(Boolean.TYPE, LayerEmissive.class, Object.class), LayerEmissive.class, "emissivePath", "FIELD:Lnet/ye6isu/yebisulib/texture/network/TextureSyncPayload$LayerEmissive;->emissivePath:Ljava/lang/String;").dynamicInvoker().invoke(this, o) /* invoke-custom */;
        }

        public String emissivePath() {
            return this.emissivePath;
        }

        public boolean hasEmissive() {
            return !this.emissivePath.isEmpty();
        }
    }
}
