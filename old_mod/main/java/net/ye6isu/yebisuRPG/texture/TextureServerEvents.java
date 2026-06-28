package net.ye6isu.yebisuRPG.texture;

import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.entity.player.PlayerEvent;
import net.ye6isu.yebisuRPG.network.util.NetworkUtils;
import net.ye6isu.yebisuRPG.texture.network.TextureSyncPayload;
import net.ye6isu.yebisuRPG.yebisuRPG;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.UUID;

@EventBusSubscriber(modid = yebisuRPG.MODID)
public final class TextureServerEvents {

    private static final Logger LOGGER = LoggerFactory.getLogger(TextureServerEvents.class);

    private TextureServerEvents() {}

    public static void apply(Entity entity, List<TextureSyncPayload.LayerData> layers) {
        if (!(entity.level() instanceof ServerLevel sl)) return;
        TextureAuthority.get(sl).put(entity.getUUID(), layers);
        NetworkUtils.sendToPlayersTrackingAndSelf(entity, new TextureSyncPayload(entity.getId(), layers));
    }

    public static void setFrame(Entity entity, int frame) {
        if (!(entity.level() instanceof ServerLevel sl)) return;
        List<TextureSyncPayload.LayerData> layers =
            TextureAuthority.get(sl).getAll().get(entity.getUUID());
        if (layers == null || layers.isEmpty()) return;
        List<TextureSyncPayload.LayerData> updated = new java.util.ArrayList<>(layers.size());
        for (TextureSyncPayload.LayerData layer : layers) {
            TextureSyncPayload.LayerAnim a = layer.anim();
            if (a.columns() * a.rows() > 1) {
                updated.add(new TextureSyncPayload.LayerData(layer.base(),
                    new TextureSyncPayload.LayerAnim(a.isAnimated(), a.columns(), a.rows(),
                        a.ticksPerFrame(), a.animModeByte(), frame),
                    layer.emissive()));
            } else {
                updated.add(layer);
            }
        }
        apply(entity, updated);
    }

    public static void resetFrame(Entity entity) {
        setFrame(entity, 0);
    }

    public static void clear(Entity entity) {
        if (!(entity.level() instanceof ServerLevel sl)) return;
        TextureAuthority.get(sl).remove(entity.getUUID());
        NetworkUtils.sendToPlayersTrackingAndSelf(entity, new TextureSyncPayload(entity.getId(), List.of()));
    }

    @SubscribeEvent
    public static void onPlayerLogin(PlayerEvent.PlayerLoggedInEvent event) {
        if (!(event.getEntity() instanceof ServerPlayer joining)) return;
        List<TextureSyncPayload.LayerData> layers =
            TextureAuthority.get(joining.getServer().overworld()).getAll().get(joining.getUUID());
        if (layers == null || layers.isEmpty()) return;
        LOGGER.debug("[TextureSync] Self-sync on login: player={} id={} layers={}",
            joining.getName().getString(), joining.getId(), layers.size());
        NetworkUtils.sendToPlayer(joining, new TextureSyncPayload(joining.getId(), layers));
    }

    @SubscribeEvent
    public static void onStartTracking(PlayerEvent.StartTracking event) {
        if (!(event.getEntity() instanceof ServerPlayer observer)) return;
        Entity tracked = event.getTarget();
        UUID uuid = tracked.getUUID();
        List<TextureSyncPayload.LayerData> layers =
            TextureAuthority.get(observer.getServer().overworld()).getAll().get(uuid);
        if (layers == null || layers.isEmpty()) return;
        LOGGER.debug("[TextureSync] StartTracking: observer={} tracked={} id={} layers={}",
            observer.getName().getString(), tracked.getName().getString(), tracked.getId(), layers.size());
        NetworkUtils.sendToPlayer(observer, new TextureSyncPayload(tracked.getId(), layers));
    }
}
