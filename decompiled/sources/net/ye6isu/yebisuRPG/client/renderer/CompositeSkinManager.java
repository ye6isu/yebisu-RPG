package net.ye6isu.yebisuRPG.client.renderer;

import com.mojang.blaze3d.platform.NativeImage;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import javax.annotation.Nullable;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.client.renderer.texture.HttpTexture;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.yebisuRPG;
import net.ye6isu.yebisulib.texture.MaskMode;
import net.ye6isu.yebisulib.texture.TextureComponent;
import net.ye6isu.yebisulib.texture.TextureManager;
import net.ye6isu.yebisulib.texture.TextureStack;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/client/renderer/CompositeSkinManager.class */
public final class CompositeSkinManager {
    public static final CompositeSkinManager INSTANCE = new CompositeSkinManager();
    private static final Logger LOGGER = LoggerFactory.getLogger(CompositeSkinManager.class);
    private final Map<UUID, Entry> entries = new HashMap();
    private final Map<Integer, Boolean> pendingInvalidations = new HashMap();

    @Nullable
    public ResourceLocation getEmissiveLocation(UUID playerId) {
        Entry e = this.entries.get(playerId);
        if (e == null || !e.emissiveInjected) {
            return null;
        }
        return e.emissiveLoc;
    }

    private CompositeSkinManager() {
    }

    public void update(AbstractClientPlayer player) {
        Entry e;
        if (this.pendingInvalidations.remove(Integer.valueOf(player.getId())) != null && (e = this.entries.get(player.getUUID())) != null) {
            e.dirty = true;
        }
        TextureStack stack = TextureManager.INSTANCE.getStack(player.getId());
        UUID id = player.getUUID();
        if (stack == null || stack.isEmpty()) {
            Entry e2 = this.entries.get(id);
            if (e2 == null || !e2.injected) {
                return;
            }
            e2.restore(player);
            return;
        }
        Entry entry = this.entries.computeIfAbsent(id, k -> {
            return new Entry();
        });
        if (!entry.dirty) {
            for (TextureComponent c : stack.getLayers()) {
                c.getAnimation().ifPresent(anim -> {
                    int currentFrame = anim.getCurrentFrame();
                    Integer last = entry.lastFrames.get(Integer.valueOf(c.getZIndex()));
                    if (last == null || last.intValue() != currentFrame) {
                        entry.dirty = true;
                    }
                });
            }
        }
        if (entry.dirty) {
            entry.rebuild(player, stack);
        }
    }

    public void invalidate(UUID playerId) {
        Entry e = this.entries.get(playerId);
        if (e != null) {
            e.dirty = true;
        }
    }

    public void invalidateById(int entityId) {
        this.pendingInvalidations.put(Integer.valueOf(entityId), true);
    }

    public void release(UUID playerId) {
        this.entries.remove(playerId);
    }

    public void releaseAll() {
        this.entries.clear();
    }

    /* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/client/renderer/CompositeSkinManager$Entry.class */
    private static final class Entry {

        @Nullable
        NativeImage originalPixels;

        @Nullable
        ResourceLocation emissiveLoc;
        boolean dirty = true;
        boolean injected = false;
        boolean emissiveInjected = false;
        private final HashMap<Integer, Integer> lastFrames = new HashMap<>();

        private Entry() {
        }

        void rebuild(AbstractClientPlayer player, TextureStack stack) {
            Minecraft mc = Minecraft.getInstance();
            ResourceLocation skinLoc = player.getSkin().texture();
            if (this.originalPixels == null) {
                try {
                    NativeImage skinPixels = CompositeSkinManager.readSkinFromDisk(mc, skinLoc);
                    this.originalPixels = skinPixels;
                } catch (IOException e) {
                    CompositeSkinManager.LOGGER.debug("Skin not ready for {} ({}): {}", new Object[]{player.getName().getString(), skinLoc, e.getMessage()});
                    return;
                }
            }
            NativeImage result = CompositeSkinManager.copy(this.originalPixels);
            boolean hasEmissive = stack.getLayers().stream().anyMatch(c -> {
                return c.getEmissiveTexture().isPresent();
            });
            NativeImage emissiveResult = null;
            if (hasEmissive) {
                emissiveResult = new NativeImage(this.originalPixels.getWidth(), this.originalPixels.getHeight(), false);
                for (int y = 0; y < emissiveResult.getHeight(); y++) {
                    for (int x = 0; x < emissiveResult.getWidth(); x++) {
                        emissiveResult.setPixelRGBA(x, y, 0);
                    }
                }
            }
            for (TextureComponent component : stack.getLayers()) {
                NativeImage overlay = null;
                try {
                    overlay = CompositeSkinManager.loadModAsset(mc, component.getTexture());
                } catch (IOException e2) {
                    CompositeSkinManager.LOGGER.warn("Cannot load overlay {}: {}", component.getTexture(), e2.getMessage());
                }
                NativeImage mask = null;
                if (component.getMaskMode() == MaskMode.CUTOUT_BELOW && overlay != null) {
                    ResourceLocation maskLoc = component.getEffectiveMaskTexture();
                    if (!maskLoc.equals(component.getTexture())) {
                        try {
                            mask = CompositeSkinManager.loadModAsset(mc, maskLoc);
                        } catch (IOException e3) {
                            CompositeSkinManager.LOGGER.warn("Cannot load mask {}: {}", maskLoc, e3.getMessage());
                        }
                    }
                }
                if (overlay != null) {
                    CompositeSkinManager.applyLayer(result, overlay, mask != null ? mask : overlay, component);
                }
                if (emissiveResult != null) {
                    NativeImage emissiveDst = emissiveResult;
                    component.getEmissiveTexture().ifPresent(emissiveLoc -> {
                        try {
                            NativeImage emissive = CompositeSkinManager.loadModAsset(mc, emissiveLoc);
                            CompositeSkinManager.applyLayerNormal(emissiveDst, emissive, component);
                            emissive.close();
                        } catch (IOException e4) {
                            CompositeSkinManager.LOGGER.warn("Cannot load emissive {}: {}", emissiveLoc, e4.getMessage());
                        }
                    });
                }
                if (mask != null) {
                    mask.close();
                }
                if (overlay != null) {
                    overlay.close();
                }
            }
            net.minecraft.client.renderer.texture.TextureManager tm = mc.getTextureManager();
            DynamicTexture texture = tm.getTexture(skinLoc);
            if (texture instanceof DynamicTexture) {
                DynamicTexture dt = texture;
                dt.setPixels(result);
                dt.upload();
            } else {
                tm.register(skinLoc, new DynamicTexture(result));
            }
            this.injected = true;
            if (emissiveResult != null) {
                if (this.emissiveLoc == null) {
                    this.emissiveLoc = ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "emissive/" + String.valueOf(player.getUUID()));
                }
                DynamicTexture texture2 = tm.getTexture(this.emissiveLoc);
                if (texture2 instanceof DynamicTexture) {
                    DynamicTexture edt = texture2;
                    edt.setPixels(emissiveResult);
                    edt.upload();
                } else {
                    tm.register(this.emissiveLoc, new DynamicTexture(emissiveResult));
                }
                this.emissiveInjected = true;
            } else {
                this.emissiveInjected = false;
            }
            this.dirty = false;
            for (TextureComponent c2 : stack.getLayers()) {
                c2.getAnimation().ifPresent(anim -> {
                    this.lastFrames.put(Integer.valueOf(c2.getZIndex()), Integer.valueOf(anim.getCurrentFrame()));
                });
            }
        }

        void restore(AbstractClientPlayer player) {
            if (!this.injected || this.originalPixels == null) {
                return;
            }
            Minecraft mc = Minecraft.getInstance();
            ResourceLocation skinLoc = player.getSkin().texture();
            net.minecraft.client.renderer.texture.TextureManager tm = mc.getTextureManager();
            DynamicTexture texture = tm.getTexture(skinLoc);
            if (texture instanceof DynamicTexture) {
                DynamicTexture dt = texture;
                NativeImage restored = CompositeSkinManager.copy(this.originalPixels);
                dt.setPixels(restored);
                dt.upload();
            }
            this.injected = false;
            this.emissiveInjected = false;
            this.dirty = true;
        }
    }

    private static void applyLayer(NativeImage base, @Nullable NativeImage overlay, @Nullable NativeImage mask, TextureComponent component) {
        int mFrameX;
        int mFrameY;
        int mFrameW;
        int mFrameH;
        if (overlay == null) {
        }
        int bw = base.getWidth();
        int bh = base.getHeight();
        int ow = overlay.getWidth();
        int oh = overlay.getHeight();
        int frameX = Math.round(component.getU() * ow);
        int frameY = Math.round(component.getV() * oh);
        int frameW = Math.max(1, Math.round(component.getUSpan() * ow));
        int frameH = Math.max(1, Math.round(component.getVSpan() * oh));
        switch (C00001.$SwitchMap$net$ye6isu$yebisulib$texture$MaskMode[component.getMaskMode().ordinal()]) {
            case ID_FLOAT:
                boolean separateMask = (mask == null || mask == overlay) ? false : true;
                int mw = mask != null ? mask.getWidth() : ow;
                int mh = mask != null ? mask.getHeight() : oh;
                NativeImage m = mask != null ? mask : overlay;
                if (separateMask && mw == ow && mh == oh) {
                    mFrameX = frameX;
                    mFrameY = frameY;
                    mFrameW = frameW;
                    mFrameH = frameH;
                } else if (separateMask) {
                    mFrameX = 0;
                    mFrameY = 0;
                    mFrameW = mw;
                    mFrameH = mh;
                } else {
                    mFrameX = Math.round(component.getU() * mw);
                    mFrameY = Math.round(component.getV() * mh);
                    mFrameW = Math.max(1, Math.round(component.getUSpan() * mw));
                    mFrameH = Math.max(1, Math.round(component.getVSpan() * mh));
                }
                for (int y = 0; y < bh; y++) {
                    for (int x = 0; x < bw; x++) {
                        int mx = mFrameX + ((x * mFrameW) / bw);
                        int my = mFrameY + ((y * mFrameH) / bh);
                        if (alpha(m.getPixelRGBA(mx, my)) > 127) {
                            int ox = frameX + ((x * frameW) / bw);
                            int oy = frameY + ((y * frameH) / bh);
                            int ov = overlay.getPixelRGBA(ox, oy);
                            base.setPixelRGBA(x, y, alpha(ov) > 0 ? ov : 0);
                        }
                    }
                }
                break;
            case ID_BOOL:
                for (int y2 = 0; y2 < bh; y2++) {
                    for (int x2 = 0; x2 < bw; x2++) {
                        int ox2 = frameX + ((x2 * frameW) / bw);
                        int oy2 = frameY + ((y2 * frameH) / bh);
                        int ov2 = overlay.getPixelRGBA(ox2, oy2);
                        int oa = alpha(ov2);
                        if (oa != 0) {
                            base.setPixelRGBA(x2, y2, oa == 255 ? ov2 : over(base.getPixelRGBA(x2, y2), ov2, oa));
                        }
                    }
                }
                break;
            case ID_STRING:
                for (int y3 = 0; y3 < bh; y3++) {
                    for (int x3 = 0; x3 < bw; x3++) {
                        int ox3 = frameX + ((x3 * frameW) / bw);
                        int oy3 = frameY + ((y3 * frameH) / bh);
                        int ov3 = overlay.getPixelRGBA(ox3, oy3);
                        int bs = base.getPixelRGBA(x3, y3);
                        int ea = (alpha(ov3) * alpha(bs)) / 255;
                        if (ea != 0) {
                            base.setPixelRGBA(x3, y3, over(bs, (ov3 & 16777215) | (ea << 24), ea));
                        }
                    }
                }
                break;
        }
    }

    /* JADX INFO: renamed from: net.ye6isu.yebisuRPG.client.renderer.CompositeSkinManager$1 */
    /* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/client/renderer/CompositeSkinManager$1.class */
    static /* synthetic */ class C00001 {
        static final /* synthetic */ int[] $SwitchMap$net$ye6isu$yebisulib$texture$MaskMode = new int[MaskMode.values().length];

        static {
            try {
                $SwitchMap$net$ye6isu$yebisulib$texture$MaskMode[MaskMode.CUTOUT_BELOW.ordinal()] = 1;
            } catch (NoSuchFieldError e) {
            }
            try {
                $SwitchMap$net$ye6isu$yebisulib$texture$MaskMode[MaskMode.NORMAL.ordinal()] = 2;
            } catch (NoSuchFieldError e2) {
            }
            try {
                $SwitchMap$net$ye6isu$yebisulib$texture$MaskMode[MaskMode.ALPHA_FROM_BASE.ordinal()] = 3;
            } catch (NoSuchFieldError e3) {
            }
        }
    }

    private static int alpha(int pixel) {
        return (pixel >> 24) & 255;
    }

    private static void applyLayerNormal(NativeImage base, NativeImage overlay, TextureComponent component) {
        int bw = base.getWidth();
        int bh = base.getHeight();
        int ow = overlay.getWidth();
        int oh = overlay.getHeight();
        int frameX = Math.round(component.getU() * ow);
        int frameY = Math.round(component.getV() * oh);
        int frameW = Math.max(1, Math.round(component.getUSpan() * ow));
        int frameH = Math.max(1, Math.round(component.getVSpan() * oh));
        for (int y = 0; y < bh; y++) {
            for (int x = 0; x < bw; x++) {
                int ox = frameX + ((x * frameW) / bw);
                int oy = frameY + ((y * frameH) / bh);
                int ov = overlay.getPixelRGBA(ox, oy);
                int oa = alpha(ov);
                if (oa != 0) {
                    base.setPixelRGBA(x, y, oa == 255 ? ov : over(base.getPixelRGBA(x, y), ov, oa));
                }
            }
        }
    }

    private static int over(int dst, int src, int srcA) {
        float sa = srcA / 255.0f;
        float da = 1.0f - sa;
        int r = Math.min((int) (((src & 255) * sa) + ((dst & 255) * da)), 255);
        int g = Math.min((int) ((((src >> 8) & 255) * sa) + (((dst >> 8) & 255) * da)), 255);
        int b = Math.min((int) ((((src >> 16) & 255) * sa) + (((dst >> 16) & 255) * da)), 255);
        int a = Math.min(srcA + ((int) (((dst >> 24) & 255) * da)), 255);
        return r | (g << 8) | (b << 16) | (a << 24);
    }

    private static NativeImage readSkinFromDisk(Minecraft mc, ResourceLocation skinLoc) throws IOException {
        HttpTexture texture = mc.getTextureManager().getTexture(skinLoc);
        if (texture instanceof HttpTexture) {
            HttpTexture httpTex = texture;
            try {
                Field f = HttpTexture.class.getDeclaredField("file");
                f.setAccessible(true);
                File file = (File) f.get(httpTex);
                if (file == null) {
                    throw new IOException("HttpTexture file field is null — skin not downloaded yet");
                }
                if (!file.exists()) {
                    throw new IOException("Skin file not on disk yet: " + file.getPath());
                }
                InputStream in = new FileInputStream(file);
                try {
                    NativeImage nativeImage = NativeImage.read(in);
                    in.close();
                    return nativeImage;
                } finally {
                }
            } catch (ReflectiveOperationException e) {
                throw new IOException("Reflection failed: " + e.getMessage(), e);
            }
        }
        InputStream in2 = mc.getResourceManager().getResourceOrThrow(skinLoc).open();
        try {
            NativeImage nativeImage2 = NativeImage.read(in2);
            if (in2 != null) {
                in2.close();
            }
            return nativeImage2;
        } catch (Throwable th) {
            if (in2 != null) {
                try {
                    in2.close();
                } catch (Throwable th2) {
                    th.addSuppressed(th2);
                }
            }
            throw th;
        }
    }

    private static NativeImage loadModAsset(Minecraft mc, ResourceLocation location) throws IOException {
        InputStream in = mc.getResourceManager().getResourceOrThrow(location).open();
        try {
            NativeImage nativeImage = NativeImage.read(in);
            if (in != null) {
                in.close();
            }
            return nativeImage;
        } catch (Throwable th) {
            if (in != null) {
                try {
                    in.close();
                } catch (Throwable th2) {
                    th.addSuppressed(th2);
                }
            }
            throw th;
        }
    }

    private static NativeImage copy(NativeImage src) {
        NativeImage dst = new NativeImage(src.getWidth(), src.getHeight(), false);
        for (int y = 0; y < src.getHeight(); y++) {
            for (int x = 0; x < src.getWidth(); x++) {
                dst.setPixelRGBA(x, y, src.getPixelRGBA(x, y));
            }
        }
        return dst;
    }
}
