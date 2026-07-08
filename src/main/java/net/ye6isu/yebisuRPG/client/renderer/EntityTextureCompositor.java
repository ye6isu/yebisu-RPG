package net.ye6isu.yebisuRPG.client.renderer;

import com.mojang.blaze3d.platform.NativeImage;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.texture.AbstractTexture;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.client.renderer.texture.HttpTexture;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.ye6isu.yebisuRPG.texture.MaskMode;
import net.ye6isu.yebisuRPG.texture.TextureComponent;
import net.ye6isu.yebisuRPG.texture.TextureOverlayManager;
import net.ye6isu.yebisuRPG.texture.TextureStack;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.Nullable;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.Map;

/**
 * Composites overlay layers onto ANY entity's texture on the CPU — players (their real
 * downloaded skin) and mobs (their normal static resource-pack texture) alike.
 *
 * <p>Registers the composite as a {@link DynamicTexture} at the entity's own texture
 * {@link ResourceLocation} (as reported by its {@code EntityRenderer}), replacing whatever
 * was there. Stores the original pixels so the unmodified texture can be restored when the
 * overlay stack clears.</p>
 *
 * <p>Call {@link #update(Entity)} once per frame before that entity renders — see
 * {@code EntityTextureRenderHooks}. Call {@link #release(int)} when the entity is discarded/unloaded.</p>
 */
public final class EntityTextureCompositor {

    public static final EntityTextureCompositor INSTANCE = new EntityTextureCompositor();
    private static final Logger LOGGER = LoggerFactory.getLogger(EntityTextureCompositor.class);

    private final Map<Integer, Entry> entries = new HashMap<>();
    private final Map<Integer, Boolean> pendingInvalidations = new HashMap<>();

    private EntityTextureCompositor() {}

    public void update(Entity entity) {
        if (pendingInvalidations.remove(entity.getId()) != null) {
            Entry e = entries.get(entity.getId());
            if (e != null) e.dirty = true;
        }

        TextureStack stack = TextureOverlayManager.INSTANCE.getStack(entity.getId());
        int id = entity.getId();

        if (stack == null || stack.isEmpty()) {
            Entry e = entries.get(id);
            if (e != null && e.injected) e.restore(entity);
            return;
        }

        Entry entry = entries.computeIfAbsent(id, k -> new Entry());

        long tick = entity.level() != null ? entity.level().getGameTime() : 0L;
        if (!entry.dirty) {
            for (TextureComponent c : stack.getLayers()) {
                if (!c.isSpritesheet()) continue;
                int currentFrame = c.getCurrentFrame(tick);
                Integer last = entry.lastFrames.get(c.getZIndex());
                if (last == null || last != currentFrame) entry.dirty = true;
            }
        }

        if (entry.dirty) entry.rebuild(entity, stack, tick);
    }

    public void invalidate(int entityId) {
        Entry e = entries.get(entityId);
        if (e != null) e.dirty = true;
    }

    /** Invalidate by integer entity ID — safe to call before the entity exists client-side yet. */
    public void invalidateById(int entityId) {
        pendingInvalidations.put(entityId, true);
    }

    public void release(int entityId) {
        entries.remove(entityId);
    }

    public void releaseAll() {
        entries.clear();
    }

    // ---- Entry ----

    private static final class Entry {
        boolean dirty = true;
        boolean injected = false;
        @Nullable NativeImage originalPixels;
        @Nullable ResourceLocation cachedBaseLoc;
        private final Map<Integer, Integer> lastFrames = new HashMap<>();

        void rebuild(Entity entity, TextureStack stack, long tick) {
            Minecraft mc = Minecraft.getInstance();
            ResourceLocation baseLoc = resolveBaseTextureLocation(mc, entity);
            if (baseLoc == null) return;

            if (originalPixels == null || !baseLoc.equals(cachedBaseLoc)) {
                NativeImage basePixels;
                try {
                    basePixels = readBaseTexture(mc, entity, baseLoc);
                } catch (IOException e) {
                    LOGGER.debug("Base texture not ready for entity {} ({}): {}", entity.getId(), baseLoc, e.getMessage());
                    return;
                }
                if (originalPixels != null) originalPixels.close();
                originalPixels = basePixels;
                cachedBaseLoc = baseLoc;
            }

            NativeImage result = copy(originalPixels);

            for (TextureComponent component : stack.getLayers()) {
                NativeImage overlay = null;
                try { overlay = loadModAsset(mc, component.getTexture()); }
                catch (IOException e) {
                    LOGGER.warn("Cannot load overlay {}: {}", component.getTexture(), e.getMessage());
                }
                if (overlay == null) continue;

                NativeImage mask = null;
                if (component.getMaskMode() == MaskMode.CUTOUT_BELOW) {
                    ResourceLocation maskLoc = component.getEffectiveMaskTexture();
                    if (!maskLoc.equals(component.getTexture())) {
                        try { mask = loadModAsset(mc, maskLoc); }
                        catch (IOException e) {
                            LOGGER.warn("Cannot load mask {}: {}", maskLoc, e.getMessage());
                        }
                    }
                }

                applyLayer(result, overlay, mask != null ? mask : overlay, component, tick);

                if (mask != null) mask.close();
                overlay.close();
            }

            net.minecraft.client.renderer.texture.TextureManager tm = mc.getTextureManager();
            AbstractTexture existing = tm.getTexture(baseLoc);
            if (existing instanceof DynamicTexture dt) {
                dt.setPixels(result);
                dt.upload();
            } else {
                tm.register(baseLoc, new DynamicTexture(result));
            }
            injected = true;

            dirty = false;
            for (TextureComponent c : stack.getLayers()) {
                if (c.isSpritesheet()) lastFrames.put(c.getZIndex(), c.getCurrentFrame(tick));
            }
        }

        void restore(Entity entity) {
            if (!injected || originalPixels == null || cachedBaseLoc == null) return;
            Minecraft mc = Minecraft.getInstance();
            net.minecraft.client.renderer.texture.TextureManager tm = mc.getTextureManager();
            AbstractTexture existing = tm.getTexture(cachedBaseLoc);
            if (existing instanceof DynamicTexture dt) {
                NativeImage restored = copy(originalPixels);
                dt.setPixels(restored);
                dt.upload();
            }
            injected = false;
            dirty = true;
        }
    }

    // ---- Base texture resolution ----

    /** The entity's own texture location, as reported by its registered renderer. */
    @Nullable
    private static ResourceLocation resolveBaseTextureLocation(Minecraft mc, Entity entity) {
        try {
            return mc.getEntityRenderDispatcher().getRenderer(entity).getTextureLocation(entity);
        } catch (Exception e) {
            LOGGER.debug("Could not resolve texture location for entity {}: {}", entity.getId(), e.getMessage());
            return null;
        }
    }

    /**
     * Reads the entity's base texture pixels. Players need the special HTTP-skin-cache
     * path since their real skin is a downloaded file, not a resource-pack asset; every
     * other entity (mobs) just reads its texture location like any other mod/vanilla asset.
     */
    private static NativeImage readBaseTexture(Minecraft mc, Entity entity, ResourceLocation baseLoc) throws IOException {
        if (entity instanceof AbstractClientPlayer) {
            return readSkinFromDisk(mc, baseLoc);
        }
        return loadModAsset(mc, baseLoc);
    }

    /** Reads a player skin PNG from the HttpTexture's cached disk file. */
    private static NativeImage readSkinFromDisk(Minecraft mc, ResourceLocation skinLoc) throws IOException {
        AbstractTexture tex = mc.getTextureManager().getTexture(skinLoc);
        if (tex instanceof HttpTexture httpTex) {
            try {
                Field f = HttpTexture.class.getDeclaredField("file");
                f.setAccessible(true);
                java.io.File file = (java.io.File) f.get(httpTex);
                if (file == null) throw new IOException("HttpTexture file field is null — skin not downloaded yet");
                if (!file.exists()) throw new IOException("Skin file not on disk yet: " + file.getPath());
                try (InputStream in = new FileInputStream(file)) {
                    return NativeImage.read(in);
                }
            } catch (ReflectiveOperationException e) {
                throw new IOException("Reflection failed: " + e.getMessage(), e);
            }
        }
        // Fallback for non-Http textures (local/default skin)
        try (InputStream in = mc.getResourceManager().getResourceOrThrow(skinLoc).open()) {
            return NativeImage.read(in);
        }
    }

    /** Loads a mod/vanilla asset (overlay/mask texture, or a mob's own base texture) via the resource manager. */
    private static NativeImage loadModAsset(Minecraft mc, ResourceLocation location) throws IOException {
        try (InputStream in = mc.getResourceManager().getResourceOrThrow(location).open()) {
            return NativeImage.read(in);
        }
    }

    // ---- Compositing ----

    private static void applyLayer(NativeImage base, NativeImage overlay, NativeImage mask,
                                   TextureComponent component, long tick) {
        int bw = base.getWidth(), bh = base.getHeight();
        int ow = overlay.getWidth(), oh = overlay.getHeight();

        int frameX = Math.round(component.getU(tick) * ow);
        int frameY = Math.round(component.getV(tick) * oh);
        int frameW = Math.max(1, Math.round(component.getUSpan() * ow));
        int frameH = Math.max(1, Math.round(component.getVSpan() * oh));

        switch (component.getMaskMode()) {
            case CUTOUT_BELOW -> {
                boolean separateMask = (mask != overlay);
                int mw = mask.getWidth(), mh = mask.getHeight();

                int mFrameX, mFrameY, mFrameW, mFrameH;
                if (separateMask && mw == ow && mh == oh) {
                    mFrameX = frameX; mFrameY = frameY; mFrameW = frameW; mFrameH = frameH;
                } else if (separateMask) {
                    mFrameX = 0; mFrameY = 0; mFrameW = mw; mFrameH = mh;
                } else {
                    mFrameX = frameX; mFrameY = frameY; mFrameW = frameW; mFrameH = frameH;
                }

                for (int y = 0; y < bh; y++) {
                    for (int x = 0; x < bw; x++) {
                        int mx = mFrameX + x * mFrameW / bw;
                        int my = mFrameY + y * mFrameH / bh;
                        if (alpha(mask.getPixelRGBA(mx, my)) <= 127) continue;

                        int ox = frameX + x * frameW / bw;
                        int oy = frameY + y * frameH / bh;
                        int ov = overlay.getPixelRGBA(ox, oy);
                        base.setPixelRGBA(x, y, alpha(ov) > 0 ? ov : 0x00000000);
                    }
                }
            }
            case NORMAL -> {
                for (int y = 0; y < bh; y++) for (int x = 0; x < bw; x++) {
                    int ox = frameX + x * frameW / bw;
                    int oy = frameY + y * frameH / bh;
                    int ov = overlay.getPixelRGBA(ox, oy);
                    int oa = alpha(ov);
                    if (oa == 0) continue;
                    base.setPixelRGBA(x, y, oa == 255 ? ov : over(base.getPixelRGBA(x, y), ov, oa));
                }
            }
            case ALPHA_FROM_BASE -> {
                for (int y = 0; y < bh; y++) for (int x = 0; x < bw; x++) {
                    int ox = frameX + x * frameW / bw;
                    int oy = frameY + y * frameH / bh;
                    int ov = overlay.getPixelRGBA(ox, oy);
                    int bs = base.getPixelRGBA(x, y);
                    int ea = alpha(ov) * alpha(bs) / 255;
                    if (ea == 0) continue;
                    base.setPixelRGBA(x, y, over(bs, (ov & 0x00FFFFFF) | (ea << 24), ea));
                }
            }
        }
    }

    private static int alpha(int pixel) { return (pixel >> 24) & 0xFF; }

    private static int over(int dst, int src, int srcA) {
        float sa = srcA / 255f, da = 1f - sa;
        int r = Math.min((int) (((src) & 0xFF) * sa + ((dst) & 0xFF) * da), 255);
        int g = Math.min((int) (((src >> 8) & 0xFF) * sa + ((dst >> 8) & 0xFF) * da), 255);
        int b = Math.min((int) (((src >> 16) & 0xFF) * sa + ((dst >> 16) & 0xFF) * da), 255);
        int a = Math.min(srcA + (int) (((dst >> 24) & 0xFF) * da), 255);
        return r | (g << 8) | (b << 16) | (a << 24);
    }

    private static NativeImage copy(NativeImage src) {
        NativeImage dst = new NativeImage(src.getWidth(), src.getHeight(), false);
        for (int y = 0; y < src.getHeight(); y++)
            for (int x = 0; x < src.getWidth(); x++)
                dst.setPixelRGBA(x, y, src.getPixelRGBA(x, y));
        return dst;
    }
}
