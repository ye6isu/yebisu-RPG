package net.ye6isu.yebisuRPG.client.renderer;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
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

    //YCS_Geo_Items_START

    //YCS_Geo_Items_END

    public static void onRegisterReloadListeners(RegisterClientReloadListenersEvent event) {
        RENDERER = new GeoItemRenderer(
            net.minecraft.client.Minecraft.getInstance().getBlockEntityRenderDispatcher(),
            net.minecraft.client.Minecraft.getInstance().getEntityModels()
        );
        event.registerReloadListener(RENDERER);
    }

    public static void onRegisterClientExtensions(RegisterClientExtensionsEvent event) {
        List<Item> geoItems = collectGeoItems();

        if (geoItems.isEmpty()) return;

        IClientItemExtensions ext = new IClientItemExtensions() {
            @Override
            public BlockEntityWithoutLevelRenderer getCustomRenderer() {
                if (RENDERER == null) {
                    RENDERER = new GeoItemRenderer(
                        net.minecraft.client.Minecraft.getInstance().getBlockEntityRenderDispatcher(),
                        net.minecraft.client.Minecraft.getInstance().getEntityModels()
                    );
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

        return items;
    }

    private static void tryRegister(List<Item> items, DeferredItem<? extends Item> deferred, String id) {
        tryRegister(items, deferred, id, 0, false, 0);
    }

    private static void tryRegisterStates(List<Item> items, DeferredItem<? extends Item> deferred, String id, String[] stateGeoIds) {
        java.util.List<ResourceLocation> geoLocs = new java.util.ArrayList<>();
        java.util.List<ResourceLocation> textures = new java.util.ArrayList<>();
        for (String geoId : stateGeoIds) {
            geoLocs.add(ResourceLocation.fromNamespaceAndPath(
                yebisuRPG.MODID, "geo/item/" + geoId + ".geo.json"));
            textures.add(ResourceLocation.fromNamespaceAndPath(
                yebisuRPG.MODID, "textures/geo/item/" + geoId + ".png"));
        }
        Item item = deferred.get();
        GeoItemRenderer.register(item, geoLocs, textures);
        items.add(item);
    }

    private static void tryRegisterStates(List<Item> items, DeferredItem<? extends Item> deferred, String id,
                                           String[] stateGeoIds, int[][] stateAnims) {
        java.util.List<ResourceLocation> geoLocs = new java.util.ArrayList<>();
        java.util.List<ResourceLocation> textures = new java.util.ArrayList<>();
        java.util.List<GeoItemRenderer.StateAnim> anims = new java.util.ArrayList<>();
        for (int i = 0; i < stateGeoIds.length; i++) {
            geoLocs.add(ResourceLocation.fromNamespaceAndPath(
                yebisuRPG.MODID, "geo/item/" + stateGeoIds[i] + ".geo.json"));
            textures.add(ResourceLocation.fromNamespaceAndPath(
                yebisuRPG.MODID, "textures/geo/item/" + stateGeoIds[i] + ".png"));
            if (i < stateAnims.length) {
                int[] a = stateAnims[i];
                anims.add(new GeoItemRenderer.StateAnim(a[0], a[1] != 0, a[2]));
            } else {
                anims.add(GeoItemRenderer.StateAnim.NONE);
            }
        }
        Item item = deferred.get();
        GeoItemRenderer.register(item, geoLocs, textures, anims);
        items.add(item);
    }

    private static void tryRegister(List<Item> items, DeferredItem<? extends Item> deferred, String id,
                                     int frames, boolean animated, int ticksPerFrame) {
        ResourceLocation geoLoc = ResourceLocation.fromNamespaceAndPath(
            yebisuRPG.MODID, "geo/item/" + id + ".geo.json");
        ResourceLocation texLoc = ResourceLocation.fromNamespaceAndPath(
            yebisuRPG.MODID, "textures/geo/item/" + id + ".png");
        Item item = deferred.get();
        GeoItemRenderer.register(item, geoLoc, texLoc, frames, animated, ticksPerFrame);
        items.add(item);
    }
}
