package net.ye6isu.yebisuRPG.client.renderer;

import com.mojang.blaze3d.platform.NativeImage;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.texture.AbstractTexture;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.client.renderer.texture.HttpTexture;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisulib.texture.MaskMode;
import net.ye6isu.yebisulib.texture.TextureComponent;
import net.ye6isu.yebisulib.texture.TextureStack;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.Nullable;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Composites overlay layers onto a player's skin on the CPU.
 *
 * <p>Registers the composite as a {@link DynamicTexture} at the player's real skin
 * {@link ResourceLocation}, replacing the {@link HttpTexture}. Stores the original
 * skin pixels so it can restore the unmodified skin when the stack is cleared.</p>
 *
 * <p>Call {@link #update(AbstractClientPlayer)} once per frame before any render.
 * Call {@link #release(UUID)} on player disconnect.</p>
 */
public final class CompositeSkinManager {

    public static final CompositeSkinManager INSTANCE = new CompositeSkinManager();
    private static final Logger LOGGER = LoggerFactory.getLogger(CompositeSkinManager.class);

    private final Map<UUID, Entry> entries = new HashMap<>();

    /**
     * Returns the emissive-only DynamicTexture location for a player, or null if
     * no emissive layers are active. Used by {@link EmissiveSkinLayer}.
     */
    @Nullable
    public ResourceLocation getEmissiveLocation(UUID playerId) {
        Entry e = entries.get(playerId);
        if (e == null) return null;
        // If emissive not yet injected but we have a pending stack, force a rebuild attempt
        if (!e.emissiveInjected) {
            e.dirty = true;
            return null;
        }
        if (e.emissiveDynTex == null || e.emissiveLoc == null) return null;
        // Re-register if TextureManager lost our texture (e.g. after resource reload / POV switch)
        Minecraft mc = Minecraft.getInstance();
        net.minecraft.client.renderer.texture.TextureManager tm = mc.getTextureManager();
        if (tm.getTexture(e.emissiveLoc) != e.emissiveDynTex) {
            tm.register(e.emissiveLoc, e.emissiveDynTex);
        }
        return e.emissiveLoc;
    }

    private CompositeSkinManager() {}

    public void update(AbstractClientPlayer player) {
        if (pendingInvalidations.remove(player.getId()) != null) {
            Entry e = entries.get(player.getUUID());
            if (e != null) e.dirty = true;
        }

        net.ye6isu.yebisulib.texture.TextureStack stack =
            net.ye6isu.yebisulib.texture.TextureManager.INSTANCE.getStack(player.getId());

        UUID id = player.getUUID();

        if (stack == null || stack.isEmpty()) {
            Entry e = entries.get(id);
            if (e != null && e.injected) e.restore(player);
            return;
        }

        Entry entry = entries.computeIfAbsent(id, k -> new Entry());

        if (!entry.dirty) {
            for (net.ye6isu.yebisulib.texture.TextureComponent c : stack.getLayers()) {
                c.getAnimation().ifPresent(anim -> {
                    int currentFrame = anim.getCurrentFrame();
                    Integer last = entry.lastFrames.get(c.getZIndex());
                    if (last == null || last != currentFrame) entry.dirty = true;
                });
            }
        }

        if (entry.dirty) entry.rebuild(player, stack);
    }

    /** Keyed by entity integer ID for pre-spawn invalidation from network packets. */
    private final Map<Integer, Boolean> pendingInvalidations = new HashMap<>();

    public void invalidate(UUID playerId) {
        Entry e = entries.get(playerId);
        if (e != null) e.dirty = true;
    }

    /** Invalidate by integer entity ID — safe to call before entity spawns on client. */
    public void invalidateById(int entityId) {
        pendingInvalidations.put(entityId, true);
    }

    public void release(UUID playerId) {
        // On disconnect, restore original if needed — TextureManager clears anyway
        entries.remove(playerId);
    }

    public void releaseAll() {
        entries.clear();
    }

    // ---- Entry ----

    private static final class Entry {
        boolean dirty = true;
        boolean injected = false;
        boolean emissiveInjected = false;
        @Nullable NativeImage originalPixels;
        @Nullable ResourceLocation emissiveLoc;
        @Nullable DynamicTexture emissiveDynTex;
        private final java.util.HashMap<Integer, Integer> lastFrames = new java.util.HashMap<>();

        void rebuild(AbstractClientPlayer player, TextureStack stack) {
            Minecraft mc = Minecraft.getInstance();
            ResourceLocation skinLoc = player.getSkin().texture();

            if (originalPixels == null) {
                NativeImage skinPixels;
                try {
                    skinPixels = readSkinFromDisk(mc, skinLoc);
                } catch (IOException e) {
                    LOGGER.debug("Skin not ready for {} ({}): {}", player.getName().getString(), skinLoc, e.getMessage());
                    return;
                }
                originalPixels = skinPixels;
            }

            // ── Skin composite (no emissive) ──────────────────────────────────────
            NativeImage result = copy(originalPixels);

            // ── Emissive-only texture (transparent base) ──────────────────────────
            boolean hasEmissive = stack.getLayers().stream()
                .anyMatch(c -> c.getEmissiveTexture().isPresent());
            NativeImage emissiveResult = null;
            if (hasEmissive) {
                emissiveResult = new NativeImage(originalPixels.getWidth(), originalPixels.getHeight(), false);
                // Explicitly zero-fill — NativeImage(w,h,false) does NOT guarantee transparent init
                for (int y = 0; y < emissiveResult.getHeight(); y++)
                    for (int x = 0; x < emissiveResult.getWidth(); x++)
                        emissiveResult.setPixelRGBA(x, y, 0x00000000);
            }

            for (TextureComponent component : stack.getLayers()) {
                NativeImage overlay = null;
                try { overlay = loadModAsset(mc, component.getTexture()); }
                catch (IOException e) {
                    LOGGER.warn("Cannot load overlay {}: {}", component.getTexture(), e.getMessage());
                }

                NativeImage mask = null;
                if (component.getMaskMode() == MaskMode.CUTOUT_BELOW && overlay != null) {
                    ResourceLocation maskLoc = component.getEffectiveMaskTexture();
                    if (!maskLoc.equals(component.getTexture())) {
                        try { mask = loadModAsset(mc, maskLoc); }
                        catch (IOException e) {
                            LOGGER.warn("Cannot load mask {}: {}", maskLoc, e.getMessage());
                        }
                    }
                }

                // Apply to skin composite
                if (overlay != null) {
                    applyLayer(result, overlay, mask != null ? mask : overlay, component);
                }

                // Emissive: bake into skin composite (visible in first-person at normal brightness)
                // AND into dedicated emissive texture (for full-bright glow pass in 3rd person + mixin)
                final NativeImage emissiveDst = emissiveResult;
                component.getEmissiveTexture().ifPresent(emissiveLoc -> {
                    try {
                        NativeImage emissive = loadModAsset(mc, emissiveLoc);
                        applyLayerNormalBright(result, emissive, component);
                        if (emissiveDst != null) {
                            applyLayerNormal(emissiveDst, emissive, component);
                        }
                        emissive.close();
                    } catch (IOException e) {
                        LOGGER.warn("Cannot load emissive {}: {}", emissiveLoc, e.getMessage());
                    }
                });

                if (mask != null) mask.close();
                if (overlay != null) overlay.close();
            }

            // ── Upload skin composite ─────────────────────────────────────────────
            net.minecraft.client.renderer.texture.TextureManager tm = mc.getTextureManager();
            AbstractTexture existing = tm.getTexture(skinLoc);
            if (existing instanceof DynamicTexture dt) {
                dt.setPixels(result);
                dt.upload();
            } else {
                tm.register(skinLoc, new DynamicTexture(result));
            }
            injected = true;

            // ── Upload emissive-only texture ──────────────────────────────────────
            if (emissiveResult != null) {
                if (emissiveLoc == null) {
                    emissiveLoc = ResourceLocation.fromNamespaceAndPath(
                        "yebisurpg", "emissive/" + player.getUUID());
                }
                if (emissiveDynTex == null) {
                    emissiveDynTex = new DynamicTexture(emissiveResult);
                    tm.register(emissiveLoc, emissiveDynTex);
                } else {
                    emissiveDynTex.setPixels(emissiveResult);
                    emissiveDynTex.upload();
                }
                emissiveInjected = true;
            } else {
                emissiveInjected = false;
            }

            dirty = false;
            for (net.ye6isu.yebisulib.texture.TextureComponent c : stack.getLayers()) {
                c.getAnimation().ifPresent(anim -> lastFrames.put(c.getZIndex(), anim.getCurrentFrame()));
            }
        }

        void restore(AbstractClientPlayer player) {
            if (!injected || originalPixels == null) return;
            Minecraft mc = Minecraft.getInstance();
            ResourceLocation skinLoc = player.getSkin().texture();
            net.minecraft.client.renderer.texture.TextureManager tm = mc.getTextureManager();
            AbstractTexture existing = tm.getTexture(skinLoc);
            if (existing instanceof DynamicTexture dt) {
                NativeImage restored = copy(originalPixels);
                dt.setPixels(restored);
                dt.upload();
            }
            injected = false;
            emissiveInjected = false;
            dirty = true;
        }
    }

    // ---- Compositing ----

    private static void applyLayer(NativeImage base, @Nullable NativeImage overlay,
                                   @Nullable NativeImage mask, TextureComponent component) {
        if (overlay == null) return;
        int bw = base.getWidth(), bh = base.getHeight();
        int ow = overlay.getWidth(), oh = overlay.getHeight();

        // Compute source pixel region for spritesheets.
        // For a 1×4 sheet (1 col, 4 rows), getU()=0, getV()=frame/4, getUSpan()=1, getVSpan()=0.25
        int frameX  = Math.round(component.getU()     * ow);
        int frameY  = Math.round(component.getV()     * oh);
        int frameW  = Math.max(1, Math.round(component.getUSpan() * ow));
        int frameH  = Math.max(1, Math.round(component.getVSpan() * oh));

        switch (component.getMaskMode()) {
            case CUTOUT_BELOW -> {
                // Where the mask is opaque:
                //   1. Erase the base pixel (alpha=0) — "cut below"
                //   2. Paint the overlay pixel on top
                // Where the mask is transparent: leave base untouched.
                //
                // IMPORTANT: when 'mask' is a SEPARATE texture (e.g. bandana_shape.png),
                // it is always a full-image shape map — sample it across its entire size.
                // Only when mask==overlay (self-masked) do we apply the animation frame window.
                boolean separateMask = (mask != null && mask != overlay);
                int mw = mask != null ? mask.getWidth()  : ow;
                int mh = mask != null ? mask.getHeight() : oh;
                NativeImage m = mask != null ? mask : overlay;

                int mFrameX, mFrameY, mFrameW, mFrameH;
                if (separateMask && mw == ow && mh == oh) {
                    // Separate mask that is the same dimensions as the overlay spritesheet
                    // (e.g. flame_shape.png is also 64x256) — frame-window it identically
                    mFrameX = frameX;
                    mFrameY = frameY;
                    mFrameW = frameW;
                    mFrameH = frameH;
                } else if (separateMask) {
                    // Separate mask with different dimensions (e.g. a plain 64x64 shape map)
                    // — always sample full image regardless of overlay animation frame
                    mFrameX = 0; mFrameY = 0; mFrameW = mw; mFrameH = mh;
                } else {
                    // Self-mask: same animation frame window as the overlay
                    mFrameX = Math.round(component.getU()     * mw);
                    mFrameY = Math.round(component.getV()     * mh);
                    mFrameW = Math.max(1, Math.round(component.getUSpan() * mw));
                    mFrameH = Math.max(1, Math.round(component.getVSpan() * mh));
                }

                for (int y = 0; y < bh; y++) {
                    for (int x = 0; x < bw; x++) {
                        int mx = mFrameX + x * mFrameW / bw;
                        int my = mFrameY + y * mFrameH / bh;
                        if (alpha(m.getPixelRGBA(mx, my)) <= 127) continue;

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

    /** NORMAL blend of emissive texture onto base at FULL BRIGHT.
     *  Writes emissive pixels with all channels at maximum so they appear
     *  fully lit regardless of the lightmap in first-person rendering. */
    private static void applyLayerNormalBright(NativeImage base, NativeImage overlay, TextureComponent component) {
        int bw = base.getWidth(), bh = base.getHeight();
        int ow = overlay.getWidth(), oh = overlay.getHeight();
        int frameX = Math.round(component.getU()     * ow);
        int frameY = Math.round(component.getV()     * oh);
        int frameW = Math.max(1, Math.round(component.getUSpan() * ow));
        int frameH = Math.max(1, Math.round(component.getVSpan() * oh));
        for (int y = 0; y < bh; y++) for (int x = 0; x < bw; x++) {
            int ox = frameX + x * frameW / bw;
            int oy = frameY + y * frameH / bh;
            int ov = overlay.getPixelRGBA(ox, oy);
            int oa = alpha(ov);
            if (oa == 0) continue;
            // Write at full saturation — preserve hue but max out brightness
            int r = (ov      ) & 0xFF;
            int g = (ov >>  8) & 0xFF;
            int b = (ov >> 16) & 0xFF;
            int max = Math.max(r, Math.max(g, b));
            if (max > 0 && max < 255) {
                r = Math.min(255, r * 255 / max);
                g = Math.min(255, g * 255 / max);
                b = Math.min(255, b * 255 / max);
            }
            int bright = r | (g << 8) | (b << 16) | (oa << 24);
            base.setPixelRGBA(x, y, oa == 255 ? bright : over(base.getPixelRGBA(x, y), bright, oa));
        }
    }

    /** NORMAL blend of emissive texture onto base. Frame-windowed to match animation. */
    private static void applyLayerNormal(NativeImage base, NativeImage overlay, TextureComponent component) {
        int bw = base.getWidth(), bh = base.getHeight();
        int ow = overlay.getWidth(), oh = overlay.getHeight();
        int frameX = Math.round(component.getU()     * ow);
        int frameY = Math.round(component.getV()     * oh);
        int frameW = Math.max(1, Math.round(component.getUSpan() * ow));
        int frameH = Math.max(1, Math.round(component.getVSpan() * oh));
        for (int y = 0; y < bh; y++) for (int x = 0; x < bw; x++) {
            int ox = frameX + x * frameW / bw;
            int oy = frameY + y * frameH / bh;
            int ov = overlay.getPixelRGBA(ox, oy);
            int oa = alpha(ov);
            if (oa == 0) continue;
            base.setPixelRGBA(x, y, oa == 255 ? ov : over(base.getPixelRGBA(x, y), ov, oa));
        }
    }

    private static int over(int dst, int src, int srcA) {
        float sa = srcA / 255f, da = 1f - sa;
        int r = Math.min((int)((( src       ) & 0xFF) * sa + (( dst       ) & 0xFF) * da), 255);
        int g = Math.min((int)(((src >>  8)  & 0xFF) * sa + ((dst >>  8)  & 0xFF) * da), 255);
        int b = Math.min((int)(((src >> 16)  & 0xFF) * sa + ((dst >> 16)  & 0xFF) * da), 255);
        int a = Math.min(srcA  + (int)(((dst >> 24) & 0xFF) * da), 255);
        return r | (g << 8) | (b << 16) | (a << 24);
    }

    // ---- Image loading ----

    /** Reads a skin PNG from the HttpTexture's cached disk file. */
    private static NativeImage readSkinFromDisk(Minecraft mc, ResourceLocation skinLoc) throws IOException {
        AbstractTexture tex = mc.getTextureManager().getTexture(skinLoc);
        if (tex instanceof HttpTexture httpTex) {
            try {
                Field f = HttpTexture.class.getDeclaredField("file");
                f.setAccessible(true);
                java.io.File file = (java.io.File) f.get(httpTex);
                if (file == null) {
                    throw new IOException("HttpTexture file field is null — skin not downloaded yet");
                }
                if (!file.exists()) {
                    throw new IOException("Skin file not on disk yet: " + file.getPath());
                }
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

    /** Loads a mod asset (overlay/mask texture) via the resource manager. */
    private static NativeImage loadModAsset(Minecraft mc, ResourceLocation location) throws IOException {
        try (InputStream in = mc.getResourceManager().getResourceOrThrow(location).open()) {
            return NativeImage.read(in);
        }
    }

    /** Returns a deep copy of a NativeImage. Caller owns the returned image. */
    private static NativeImage copy(NativeImage src) {
        NativeImage dst = new NativeImage(src.getWidth(), src.getHeight(), false);
        for (int y = 0; y < src.getHeight(); y++)
            for (int x = 0; x < src.getWidth(); x++)
                dst.setPixelRGBA(x, y, src.getPixelRGBA(x, y));
        return dst;
    }
}
