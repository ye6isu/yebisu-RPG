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

import java.util.List;
import java.util.UUID;

/**
 * Server-authoritative entry points for the texture overlay system. Works on any
 * {@link Entity}, not just players — mobs included.
 *
 * <p>{@link #apply} always sends the FULL layer list, never a delta, and persists it
 * in {@link TextureAuthority}. This is what makes late-join and out-of-range/back-in-range
 * sync correct for free: {@link #onPlayerLogin} and {@link #onStartTracking} just re-send
 * whatever is currently stored, with no separate "catch up" protocol needed.</p>
 *
 * <p>{@link #play} and {@link #stop} are the only ways a spritesheet layer's animation state
 * changes — both are single messages (playhead origin + speed, or a fixed rest frame), the
 * same model as bone/pose animation triggers. There is no per-client-guessed playback: every
 * observer computes the identical frame from the same {@code startTick}/{@code speed}, and
 * late joiners/newly-tracking players get it for free via {@link #onPlayerLogin}/{@link #onStartTracking}.</p>
 */
@EventBusSubscriber(modid = yebisuRPG.MODID)
public final class TextureServerEvents {

    private TextureServerEvents() {}

    public static void apply(Entity entity, List<TextureSyncPayload.LayerData> layers) {
        if (!(entity.level() instanceof ServerLevel sl)) return;
        TextureAuthority.get(sl).put(entity.getUUID(), layers);
        NetworkUtils.sendToPlayersTrackingAndSelf(entity, new TextureSyncPayload(entity.getId(), layers));
    }

    /**
     * Adds or replaces a single overlay layer on this entity, keyed by {@code zIndex} — any existing
     * layer at that same z-index is replaced, all other layers are left untouched. This is the entry
     * point for Blocky's "Set Entity Texture Overlay" block: each call only ever touches its own layer
     * slot, so multiple independent overlays (e.g. a hat layer and a cape layer) can be toggled without
     * stepping on each other.
     */
    public static void setLayer(Entity entity, TextureSyncPayload.LayerData layer) {
        if (!(entity.level() instanceof ServerLevel sl)) return;
        List<TextureSyncPayload.LayerData> existing = TextureAuthority.get(sl).getAll().get(entity.getUUID());
        List<TextureSyncPayload.LayerData> updated = new java.util.ArrayList<>();
        if (existing != null) {
            for (TextureSyncPayload.LayerData l : existing) {
                if (l.zIndex() != layer.zIndex()) updated.add(l);
            }
        }
        updated.add(layer);
        apply(entity, updated);
    }

    /**
     * Same as {@link #setLayer(Entity, TextureSyncPayload.LayerData)}, but if {@code animated} is true
     * and this is a spritesheet layer ({@code columns * rows > 1}), immediately starts the same
     * server-synced looping playhead {@link #play} uses — correct for late joiners for free via
     * {@link #onPlayerLogin}/{@link #onStartTracking}, no separate {@code play(...)} call needed.
     */
    public static void setLayer(Entity entity, TextureSyncPayload.LayerData layer, boolean animated) {
        if (!(entity.level() instanceof ServerLevel sl)) return;
        if (animated && layer.columns() * layer.rows() > 1) {
            layer = layer.playingFrom(sl.getGameTime(), FrameLoopMode.LOOP, layer.ticksPerFrame(), 1f);
        }
        setLayer(entity, layer);
    }

    /** Removes whichever overlay layer is currently at this z-index, leaving all other layers untouched. */
    public static void removeLayer(Entity entity, int zIndex) {
        if (!(entity.level() instanceof ServerLevel sl)) return;
        List<TextureSyncPayload.LayerData> existing = TextureAuthority.get(sl).getAll().get(entity.getUUID());
        if (existing == null || existing.isEmpty()) return;
        List<TextureSyncPayload.LayerData> updated = new java.util.ArrayList<>();
        for (TextureSyncPayload.LayerData l : existing) {
            if (l.zIndex() != zIndex) updated.add(l);
        }
        apply(entity, updated);
    }

    /**
     * Removes whichever overlay layer is currently showing this exact texture path, regardless of
     * which layer/z-index it's on — no need to track/remember layer numbers separately from the
     * texture itself. If more than one layer somehow shares the same texture, all matching layers
     * are removed.
     */
    public static void removeByTexture(Entity entity, String texturePath) {
        if (!(entity.level() instanceof ServerLevel sl)) return;
        List<TextureSyncPayload.LayerData> existing = TextureAuthority.get(sl).getAll().get(entity.getUUID());
        if (existing == null || existing.isEmpty()) return;
        List<TextureSyncPayload.LayerData> updated = new java.util.ArrayList<>();
        for (TextureSyncPayload.LayerData l : existing) {
            if (!l.texturePath().equals(texturePath)) updated.add(l);
        }
        apply(entity, updated);
    }

    /** Starts (or restarts) playback of every spritesheet layer currently on this entity. */
    public static void play(Entity entity, FrameLoopMode mode, int ticksPerFrame, float speed) {
        if (!(entity.level() instanceof ServerLevel sl)) return;
        List<TextureSyncPayload.LayerData> layers = TextureAuthority.get(sl).getAll().get(entity.getUUID());
        if (layers == null || layers.isEmpty()) return;
        long now = sl.getGameTime();
        List<TextureSyncPayload.LayerData> updated = new java.util.ArrayList<>(layers.size());
        for (TextureSyncPayload.LayerData layer : layers) {
            if (layer.columns() * layer.rows() > 1) {
                updated.add(layer.playingFrom(now, mode, ticksPerFrame, speed));
            } else {
                updated.add(layer);
            }
        }
        apply(entity, updated);
    }

    /** Stops playback of every spritesheet layer on this entity, holding at the given rest frame. */
    public static void stop(Entity entity, int restFrame) {
        if (!(entity.level() instanceof ServerLevel sl)) return;
        List<TextureSyncPayload.LayerData> layers = TextureAuthority.get(sl).getAll().get(entity.getUUID());
        if (layers == null || layers.isEmpty()) return;
        List<TextureSyncPayload.LayerData> updated = new java.util.ArrayList<>(layers.size());
        for (TextureSyncPayload.LayerData layer : layers) {
            if (layer.columns() * layer.rows() > 1) {
                updated.add(layer.stoppedAt(restFrame));
            } else {
                updated.add(layer);
            }
        }
        apply(entity, updated);
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
        NetworkUtils.sendToPlayer(observer, new TextureSyncPayload(tracked.getId(), layers));
    }
}
