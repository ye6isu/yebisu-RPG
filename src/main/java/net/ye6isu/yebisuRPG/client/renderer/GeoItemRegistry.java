package net.ye6isu.yebisuRPG.client.renderer;

import net.minecraft.client.renderer.BlockEntityWithoutLevelRenderer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.Item;
import net.neoforged.neoforge.client.event.RegisterClientReloadListenersEvent;
import net.neoforged.neoforge.client.extensions.common.IClientItemExtensions;
import net.neoforged.neoforge.client.extensions.common.RegisterClientExtensionsEvent;
import net.neoforged.neoforge.registries.DeferredItem;
import net.ye6isu.yebisuRPG.item.ModItems;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.ArrayList;
import java.util.List;

public class GeoItemRegistry {

    private static GeoItemRenderer RENDERER;
    private static List<Item> COLLECTED_ITEMS;

    /**
     * {@code collectGeoItems()} populates {@code GeoItemRenderer.REGISTRY} as a side effect, and both
     * {@code onRegisterClientExtensions} and {@code onRegisterAdditionalModels} need that populated
     * regardless of which mod-bus event fires first — so this runs it exactly once, lazily, from
     * whichever of the two fires first.
     */
    private static List<Item> collectGeoItemsOnce() {
        if (COLLECTED_ITEMS == null) COLLECTED_ITEMS = collectGeoItems();
        return COLLECTED_ITEMS;
    }

    public static void onRegisterReloadListeners(RegisterClientReloadListenersEvent event) {
        RENDERER = new GeoItemRenderer(
                net.minecraft.client.Minecraft.getInstance().getBlockEntityRenderDispatcher(),
                net.minecraft.client.Minecraft.getInstance().getEntityModels());
        event.registerReloadListener(RENDERER);
    }

    /**
     * Flat-state item models are loose files, never tied to any registered Item's own model, so
     * vanilla's normal model-baking pass never discovers/bakes them. This makes them explicitly
     * bake-able via {@code ModelManager.getModel(ModelResourceLocation)} at render time — without
     * this, {@code GeoItemRenderer.renderFlatState} would always resolve to the missing/checkerboard
     * model, since nothing else ever tells the model bakery these files exist.
     */
    public static void onRegisterAdditionalModels(net.neoforged.neoforge.client.event.ModelEvent.RegisterAdditional event) {
        collectGeoItemsOnce();
        for (ResourceLocation loc : GeoItemRenderer.getAllFlatModelLocations()) {
            event.register(new net.minecraft.client.resources.model.ModelResourceLocation(
                    loc, net.minecraft.client.resources.model.ModelResourceLocation.STANDALONE_VARIANT));
        }
    }

    public static void onRegisterClientExtensions(RegisterClientExtensionsEvent event) {
        List<Item> geoItems = collectGeoItemsOnce();
        if (geoItems.isEmpty()) return;

        IClientItemExtensions ext = new IClientItemExtensions() {
            @Override
            public BlockEntityWithoutLevelRenderer getCustomRenderer() {
                if (RENDERER == null) {
                    RENDERER = new GeoItemRenderer(
                            net.minecraft.client.Minecraft.getInstance().getBlockEntityRenderDispatcher(),
                            net.minecraft.client.Minecraft.getInstance().getEntityModels());
                }
                return RENDERER;
            }
        };

        for (Item item : geoItems) {
            event.registerItem(ext, item);
        }
    }

    private static List<Item> collectGeoItems() {
        List<Item> items = new ArrayList<>();
        tryRegister(items, ModItems.AXER, "axer");
        tryRegisterMixedStates(items, ModItems.AEEEE, java.util.List.of(new GeoItemRegistry.StateSpec("flat", "aeeee_state0", 0, false, 0, 0), new GeoItemRegistry.StateSpec("flat", "aeeee_state1", 0, false, 0, 0), new GeoItemRegistry.StateSpec("geo", "aeeee_state2", 0, false, 0, 0), new GeoItemRegistry.StateSpec("geo", "aeeee_state3", 2, true, 4, 0)));
        // YCS_Geo_Collect
        return items;
    }

    static void tryRegister(List<Item> items, DeferredItem<? extends Item> deferred, String id) {
        tryRegister(items, deferred, id, 0, false, 0, 0);
    }

    static void tryRegister(List<Item> items, DeferredItem<? extends Item> deferred, String id,
                            int frames, boolean animated, int ticksPerFrame) {
        tryRegister(items, deferred, id, frames, animated, ticksPerFrame, 0);
    }

    static void tryRegister(List<Item> items, DeferredItem<? extends Item> deferred, String id,
                            int frames, boolean animated, int ticksPerFrame, int defaultFrame) {
        ResourceLocation geoLoc = ResourceLocation.fromNamespaceAndPath(
                yebisuRPG.MODID, "geo/item/" + id + ".geo.json");
        ResourceLocation texLoc = ResourceLocation.fromNamespaceAndPath(
                yebisuRPG.MODID, "textures/geo/item/" + id + ".png");
        Item item = deferred.get();
        GeoItemRenderer.register(item, geoLoc, texLoc, frames, animated, ticksPerFrame, defaultFrame);
        items.add(item);
    }

    /**
     * One entry in a mixed-state item registration. For {@code kind = "geo"}, {@code id} names the
     * geo model/texture pair at {@code geo/item/<id>.geo.json} / {@code textures/geo/item/<id>.png}.
     * For {@code kind = "flat"}, {@code id} names the flat item model at {@code models/item/<id>.json}
     * (and its texture, already baked into that model by YCS at save time — not read directly here).
     * {@code frames}/{@code animated}/{@code ticksPerFrame}/{@code defaultFrame} apply to either kind:
     * for "geo" they drive spritesheet UV playback; for "flat" with {@code frames > 1} and not animated,
     * they select which of {@code models/item/<id>_frame<N>.json} to show via
     * {@code ModDataComponents.ITEM_FRAME} (animated flat states need none of this — vanilla's own
     * {@code .mcmeta} on the texture handles playback with zero custom code).
     */
    public record StateSpec(String kind, String id, int frames, boolean animated, int ticksPerFrame, int defaultFrame) {}

    static void tryRegisterMixedStates(List<Item> items, DeferredItem<? extends Item> deferred, List<StateSpec> specs) {
        List<GeoItemRenderer.ItemStateEntry> states = new ArrayList<>();
        boolean needsCustomRenderer = false;

        for (StateSpec spec : specs) {
            if ("geo".equals(spec.kind())) {
                needsCustomRenderer = true;
                ResourceLocation geoLoc = ResourceLocation.fromNamespaceAndPath(
                        yebisuRPG.MODID, "geo/item/" + spec.id() + ".geo.json");
                ResourceLocation texLoc = ResourceLocation.fromNamespaceAndPath(
                        yebisuRPG.MODID, "textures/geo/item/" + spec.id() + ".png");
                GeoItemRenderer.StateAnim anim = new GeoItemRenderer.StateAnim(
                        spec.frames(), spec.animated(), spec.ticksPerFrame(), spec.defaultFrame());
                states.add(new GeoItemRenderer.ItemStateEntry(
                        GeoItemRenderer.StateKind.GEO, geoLoc, texLoc, anim, null, null));
            } else {
                // A flat state needs the custom renderer too when it's a non-animated multi-frame
                // spritesheet — that case swaps its model via ITEM_FRAME, which vanilla's own
                // CustomModelData-override dispatch can't do (that component is reserved for state
                // selection here). A plain texture or an animated (.mcmeta-driven) flat state needs
                // none of this — vanilla renders those correctly with no custom renderer at all.
                if (spec.frames() > 1 && !spec.animated()) needsCustomRenderer = true;
                ResourceLocation flatModelLoc = ResourceLocation.fromNamespaceAndPath(
                        yebisuRPG.MODID, "item/" + spec.id());
                GeoItemRenderer.StateAnim anim = new GeoItemRenderer.StateAnim(
                        spec.frames(), spec.animated(), spec.ticksPerFrame(), spec.defaultFrame());
                states.add(new GeoItemRenderer.ItemStateEntry(
                        GeoItemRenderer.StateKind.FLAT, null, null, anim, flatModelLoc, null, flatModelLoc));
            }
        }

        Item item = deferred.get();
        GeoItemRenderer.registerMixed(item, states);
        if (needsCustomRenderer) items.add(item);
    }
}
