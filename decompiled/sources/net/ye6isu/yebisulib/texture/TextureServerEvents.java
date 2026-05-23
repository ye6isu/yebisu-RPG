package net.ye6isu.yebisulib.texture;

import java.util.List;
import java.util.UUID;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.entity.player.PlayerEvent;
import net.ye6isu.yebisuRPG.yebisuRPG;
import net.ye6isu.yebisulib.network.util.NetworkUtils;
import net.ye6isu.yebisulib.texture.network.TextureSyncPayload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/texture/TextureServerEvents.class */
@EventBusSubscriber(modid = yebisuRPG.MODID)
public final class TextureServerEvents {
    private static final Logger LOGGER = LoggerFactory.getLogger(TextureServerEvents.class);

    private TextureServerEvents() {
    }

    public static void apply(Entity entity, List<TextureSyncPayload.LayerData> layers) {
        ServerLevel serverLevelLevel = entity.level();
        if (serverLevelLevel instanceof ServerLevel) {
            ServerLevel sl = serverLevelLevel;
            TextureAuthority.get(sl).put(entity.getUUID(), layers);
            NetworkUtils.sendToPlayersTrackingAndSelf(entity, new TextureSyncPayload(entity.getId(), layers));
        }
    }

    public static void clear(Entity entity) {
        ServerLevel serverLevelLevel = entity.level();
        if (serverLevelLevel instanceof ServerLevel) {
            ServerLevel sl = serverLevelLevel;
            TextureAuthority.get(sl).remove(entity.getUUID());
            NetworkUtils.sendToPlayersTrackingAndSelf(entity, new TextureSyncPayload(entity.getId(), List.of()));
        }
    }

    @SubscribeEvent
    public static void onPlayerLogin(PlayerEvent.PlayerLoggedInEvent event) {
        ServerPlayer entity = event.getEntity();
        if (entity instanceof ServerPlayer) {
            ServerPlayer joining = entity;
            List<TextureSyncPayload.LayerData> layers = TextureAuthority.get(joining.getServer().overworld()).getAll().get(joining.getUUID());
            if (layers == null || layers.isEmpty()) {
                return;
            }
            LOGGER.debug("[TextureSync] Self-sync on login: player={} id={} layers={}", new Object[]{joining.getName().getString(), Integer.valueOf(joining.getId()), Integer.valueOf(layers.size())});
            NetworkUtils.sendToPlayer(joining, new TextureSyncPayload(joining.getId(), layers));
        }
    }

    @SubscribeEvent
    public static void onStartTracking(PlayerEvent.StartTracking event) {
        ServerPlayer entity = event.getEntity();
        if (entity instanceof ServerPlayer) {
            ServerPlayer observer = entity;
            Entity tracked = event.getTarget();
            UUID uuid = tracked.getUUID();
            List<TextureSyncPayload.LayerData> layers = TextureAuthority.get(observer.getServer().overworld()).getAll().get(uuid);
            if (layers == null || layers.isEmpty()) {
                return;
            }
            LOGGER.debug("[TextureSync] StartTracking: observer={} tracked={} id={} layers={}", new Object[]{observer.getName().getString(), tracked.getName().getString(), Integer.valueOf(tracked.getId()), Integer.valueOf(layers.size())});
            NetworkUtils.sendToPlayer(observer, new TextureSyncPayload(tracked.getId(), layers));
        }
    }
}
