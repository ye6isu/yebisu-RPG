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
 * <p>Registers the composite as a {@link DynamicTexture} at a private, per-entity-instance
 * {@link ResourceLocation} (never the entity's own shared texture location — multiple instances
 * of the same entity type, e.g. two zombies, share one vanilla texture, so mutating it directly
 * would leak the overlay onto every other instance of that type). {@code MixinLivingEntityRenderer}
 * redirects each entity's render type to its own composite location when one is active, via
 * {@link #getCompositeLocation(int)}.</p>
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

    /**
     * The emissive-only texture location for this entity, or null if no emissive layer is
     * currently active. Used by {@code EntityTextureRenderHooks} for the extra full-bright
     * render pass (first and third person alike).
     */
    @Nullable
    public ResourceLocation getEmissiveLocation(int entityId) {
        Entry e = entries.get(entityId);
        if (e == null || !e.emissiveInjected || e.emissiveDynTex == null || e.emissiveLoc == null) return null;
        // Re-register if TextureManager lost our texture (e.g. after a resource reload).
        Minecraft mc = Minecraft.getInstance();
        net.minecraft.client.renderer.texture.TextureManager tm = mc.getTextureManager();
        if (tm.getTexture(e.emissiveLoc) != e.emissiveDynTex) {
            tm.register(e.emissiveLoc, e.emissiveDynTex);
        }
        return e.emissiveLoc;
    }

    /**
     * The per-entity-instance composited base texture location, or null if no overlay is
     * currently active for this entity. Multiple entities of the same type (e.g. two zombies)
     * share one vanilla texture location, so the composite can never be baked into that shared
     * location directly — every entity gets its own private location instead, and
     * {@code MixinLivingEntityRenderer} redirects {@code getTextureLocation} to it per-instance.
     */
    @Nullable
    public ResourceLocation getCompositeLocation(int entityId) {
        Entry e = entries.get(entityId);
        if (e == null || !e.injected || e.compositeDynTex == null || e.compositeLoc == null) return null;
        Minecraft mc = Minecraft.getInstance();
        net.minecraft.client.renderer.texture.TextureManager tm = mc.getTextureManager();
        if (tm.getTexture(e.compositeLoc) != e.compositeDynTex) {
            tm.register(e.compositeLoc, e.compositeDynTex);
        }
        return e.compositeLoc;
    }

    /** True if this entity currently has an active overlay stack (i.e. any composite is injected). */
    public boolean isComposited(int entityId) {
        Entry e = entries.get(entityId);
        return e != null && e.injected;
    }

    /**
     * Per-instance composited texture for a "special part" render layer (sheep wool, mooshroom
     * mushroom block texture, skeleton/stray/bogged clothing, drowned outer layer, slime outer
     * layer, shulker inside, llama decor, villager/zombie-villager profession clothes) that draws
     * from its OWN fixed vanilla texture rather than the entity's main body texture. Each distinct
     * {@code baseLayerLoc} gets its own independent composite, cached per (entity, base texture)
     * pair, rebuilt in lockstep with the main body composite. Returns null if no overlay is active.
     *
     * <p>Used by the various per-layer mixins (e.g. {@code MixinSheepFurLayer}) to redirect that
     * layer's {@code RenderType} texture argument, the same way {@link #getCompositeLocation}
     * redirects the main body's.</p>
     */
    @Nullable
    public ResourceLocation getLayerCompositeLocation(int entityId, ResourceLocation baseLayerLoc) {
        Entry e = entries.get(entityId);
        if (e == null || !e.injected) return null;

        Entity entity = Minecraft.getInstance().level != null
                ? Minecraft.getInstance().level.getEntity(entityId) : null;
        TextureStack stack = TextureOverlayManager.INSTANCE.getStack(entityId);
        if (entity != null && stack != null) {
            long tick = entity.level() != null ? entity.level().getGameTime() : 0L;
            LayerEntry existing = e.layerComposites.get(baseLayerLoc);
            // Rebuild whenever the main composite is dirty (covers animated overlays) or this
            // particular layer texture hasn't been composited yet at all.
            if (e.dirty || existing == null || existing.dynTex == null) {
                e.rebuildLayerComposite(entity, stack, tick, baseLayerLoc);
            }
        }

        LayerEntry le = e.layerComposites.get(baseLayerLoc);
        if (le == null || le.dynTex == null || le.loc == null) return null;
        Minecraft mc = Minecraft.getInstance();
        net.minecraft.client.renderer.texture.TextureManager tm = mc.getTextureManager();
        if (tm.getTexture(le.loc) != le.dynTex) {
            tm.register(le.loc, le.dynTex);
        }
        return le.loc;
    }

    // ---- Entry ----

    /** Per (entity, extra-layer-base-texture) composited state — see {@link #getLayerCompositeLocation}. */
    private static final class LayerEntry {
        @Nullable NativeImage originalPixels;
        @Nullable ResourceLocation loc;
        @Nullable DynamicTexture dynTex;
    }

    private static final class Entry {
        boolean dirty = true;
        boolean injected = false;
        boolean emissiveInjected = false;
        @Nullable NativeImage originalPixels;
        @Nullable ResourceLocation cachedBaseLoc;
        @Nullable ResourceLocation compositeLoc;
        @Nullable DynamicTexture compositeDynTex;
        @Nullable ResourceLocation emissiveLoc;
        @Nullable DynamicTexture emissiveDynTex;
        private final Map<Integer, Integer> lastFrames = new HashMap<>();
        private final Map<ResourceLocation, LayerEntry> layerComposites = new HashMap<>();

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

            // Emissive-only texture (transparent base) — filled below whenever any layer has an
            // emissive attachment, used for the extra full-bright GPU pass (EntityTextureRenderHooks).
            boolean hasEmissive = stack.getLayers().stream().anyMatch(c -> c.getEmissiveTexture().isPresent());
            NativeImage emissiveResult = null;
            if (hasEmissive) {
                emissiveResult = new NativeImage(originalPixels.getWidth(), originalPixels.getHeight(), false);
                for (int y = 0; y < emissiveResult.getHeight(); y++) {
                    for (int x = 0; x < emissiveResult.getWidth(); x++) {
                        emissiveResult.setPixelRGBA(x, y, 0x00000000);
                    }
                }
            }

            applyStack(mc, result, emissiveResult, stack, tick);

            // Never mutate baseLoc directly — it's shared by every instance of this entity type
            // (e.g. all zombies use the same vanilla texture). Each entity instance gets its own
            // private composite location instead; MixinLivingEntityRenderer redirects
            // getTextureLocation to it per-instance so other entities of the same type are untouched.
            net.minecraft.client.renderer.texture.TextureManager tm = mc.getTextureManager();
            if (compositeLoc == null) {
                compositeLoc = ResourceLocation.fromNamespaceAndPath("yebisurpg", "composite/" + entity.getId());
            }
            if (compositeDynTex == null) {
                compositeDynTex = new DynamicTexture(result);
                tm.register(compositeLoc, compositeDynTex);
            } else {
                compositeDynTex.setPixels(result);
                compositeDynTex.upload();
            }
            injected = true;

            if (emissiveResult != null) {
                if (emissiveLoc == null) {
                    emissiveLoc = ResourceLocation.fromNamespaceAndPath("yebisurpg", "emissive/" + entity.getId());
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
            for (TextureComponent c : stack.getLayers()) {
                if (c.isSpritesheet()) lastFrames.put(c.getZIndex(), c.getCurrentFrame(tick));
            }
        }

        void restore(Entity entity) {
            // The shared vanilla texture was never mutated, so there's nothing to restore there —
            // just stop redirecting this entity's renderer to the (now stale) composite location.
            injected = false;
            emissiveInjected = false;
            dirty = true;
            layerComposites.clear();
        }

        /**
         * Composites the current overlay stack onto one extra "special part" texture (wool,
         * mushroom, clothes, etc.), independent of the main body composite. Lazily creates/updates
         * the {@link LayerEntry} for this {@code baseLayerLoc} on demand — the compositor doesn't
         * know every possible layer texture up front, so each per-layer mixin discovers/registers
         * its own the first time it's asked for.
         */
        void rebuildLayerComposite(Entity entity, TextureStack stack, long tick, ResourceLocation baseLayerLoc) {
            Minecraft mc = Minecraft.getInstance();
            LayerEntry le = layerComposites.computeIfAbsent(baseLayerLoc, k -> new LayerEntry());

            if (le.originalPixels == null) {
                try {
                    le.originalPixels = loadModAsset(mc, baseLayerLoc);
                } catch (IOException e) {
                    LOGGER.debug("Layer base texture not ready ({}) for entity {}: {}", baseLayerLoc, entity.getId(), e.getMessage());
                    return;
                }
            }

            NativeImage result = copy(le.originalPixels);
            applyStack(mc, result, null, stack, tick);

            net.minecraft.client.renderer.texture.TextureManager tm = mc.getTextureManager();
            if (le.loc == null) {
                le.loc = ResourceLocation.fromNamespaceAndPath("yebisurpg",
                        "composite/" + entity.getId() + "/" + baseLayerLoc.getNamespace() + "/" + baseLayerLoc.getPath().replace('/', '_'));
            }
            if (le.dynTex == null) {
                le.dynTex = new DynamicTexture(result);
                tm.register(le.loc, le.dynTex);
            } else {
                le.dynTex.setPixels(result);
                le.dynTex.upload();
            }
        }
    }

    /**
     * Applies every layer in {@code stack} onto {@code result} (and, if provided, bakes emissive
     * layers into {@code emissiveResult} too) — the shared per-pixel compositing core used by both
     * the main body composite and each per-layer "special part" composite.
     */
    private static void applyStack(Minecraft mc, NativeImage result, @Nullable NativeImage emissiveResult,
                                    TextureStack stack, long tick) {
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

            // Emissive: bake into the main composite at full bright (so anything sampling the
            // entity's normal texture directly still shows a glow), AND into the dedicated
            // emissive-only texture at normal brightness (for the full-bright shader pass).
            final NativeImage emissiveDst = emissiveResult;
            component.getEmissiveTexture().ifPresent(emissiveLocRes -> {
                try {
                    NativeImage emissive = loadModAsset(mc, emissiveLocRes);
                    applyLayerNormalBright(result, emissive, component, tick);
                    if (emissiveDst != null) applyLayerNormal(emissiveDst, emissive, component, tick);
                    emissive.close();
                } catch (IOException e) {
                    LOGGER.warn("Cannot load emissive {}: {}", emissiveLocRes, e.getMessage());
                }
            });

            if (mask != null) mask.close();
            overlay.close();
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

    /**
     * NORMAL blend of an emissive texture onto {@code base} at FULL BRIGHT — writes pixels at
     * maximum saturation so they appear fully lit regardless of the entity's actual light level
     * even where the composite is sampled directly (not through the full-bright shader pass).
     */
    private static void applyLayerNormalBright(NativeImage base, NativeImage overlay, TextureComponent component, long tick) {
        int bw = base.getWidth(), bh = base.getHeight();
        int ow = overlay.getWidth(), oh = overlay.getHeight();
        int frameX = Math.round(component.getU(tick) * ow);
        int frameY = Math.round(component.getV(tick) * oh);
        int frameW = Math.max(1, Math.round(component.getUSpan() * ow));
        int frameH = Math.max(1, Math.round(component.getVSpan() * oh));
        for (int y = 0; y < bh; y++) for (int x = 0; x < bw; x++) {
            int ox = frameX + x * frameW / bw;
            int oy = frameY + y * frameH / bh;
            int ov = overlay.getPixelRGBA(ox, oy);
            int oa = alpha(ov);
            if (oa == 0) continue;
            int r = ov & 0xFF;
            int g = (ov >> 8) & 0xFF;
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

    /** NORMAL blend of an emissive texture onto {@code base}, frame-windowed like any other layer. */
    private static void applyLayerNormal(NativeImage base, NativeImage overlay, TextureComponent component, long tick) {
        int bw = base.getWidth(), bh = base.getHeight();
        int ow = overlay.getWidth(), oh = overlay.getHeight();
        int frameX = Math.round(component.getU(tick) * ow);
        int frameY = Math.round(component.getV(tick) * oh);
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
