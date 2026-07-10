package net.ye6isu.yebisuRPG.animation;

import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.entity.player.PlayerEvent;
import net.ye6isu.yebisuRPG.network.animation.AnimPausePayload;
import net.ye6isu.yebisuRPG.network.animation.AnimTriggerPayload;
import net.ye6isu.yebisuRPG.network.util.NetworkUtils;
import net.ye6isu.yebisuRPG.yebisuRPG;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

/**
 * Server-side game-event subscriber for late-joiner / re-tracking catch-up of the
 * custom animation system — the dedicated-server-correctness requirement described in
 * {@code AGENTS.md} and {@code md/YCS_V3_Architecture.md}'s "Dedicated Server Compatibility"
 * section: a client that starts tracking an entity, or a player who just logged in, has no
 * way to derive "what animation/pose is currently active" on its own, so the server must
 * explicitly resend that state (mirroring the {@code TextureAuthority} re-send-on-login/
 * start-tracking pattern).
 *
 * <p>This class intentionally covers ONLY animation/pose catch-up. The old_mod reference
 * implementation bundled this together with server-authoritative hurtbox/damage-window
 * sweeping in the same {@code onServerTick} hook — that is an unrelated system (melee
 * hit-detection) and is out of scope for the animation port; it is not included here.</p>
 */
@EventBusSubscriber(modid = yebisuRPG.MODID)
public final class AnimationEventHooks {

    private static final Logger LOGGER = LoggerFactory.getLogger(AnimationEventHooks.class);

    // -------------------------------------------------------------------------
    // Late-joiner catch-up: StartTracking
    // -------------------------------------------------------------------------

    /**
     * Fired on the server when a player's client begins tracking an entity
     * (i.e. the entity enters their render distance).
     *
     * <p>Iterates every active animation slot for the newly-tracked entity and sends
     * a catch-up {@link AnimTriggerPayload} with the elapsed progress delta so the
     * observer's playhead is immediately aligned with everyone else, then does the
     * same for any active idle poses.</p>
     */
    @SubscribeEvent
    public static void onStartTracking(PlayerEvent.StartTracking event) {
        if (!(event.getEntity() instanceof ServerPlayer observer)) return;

        Entity tracked = event.getTarget();
        sendCatchUp(observer, tracked.getId(), tracked.level().getGameTime());
    }

    // -------------------------------------------------------------------------
    // Late-joiner catch-up: PlayerLoggedIn
    // -------------------------------------------------------------------------

    /**
     * Fired on the server when a player fully connects to the game.
     *
     * <p>Scans every entity in the server's overworld (the only level guaranteed
     * to be available at login) that has active animation slots and sends catch-up
     * payloads for each. Entities in other dimensions are handled when the player
     * changes dimension and StartTracking fires for those entities.</p>
     *
     * <p>The player's own entity is included so first-person item and armor animations
     * that were already running are also restored.</p>
     */
    @SubscribeEvent
    public static void onPlayerLogin(PlayerEvent.PlayerLoggedInEvent event) {
        if (!(event.getEntity() instanceof ServerPlayer joining)) return;
        if (joining.getServer() == null) return;

        ServerLevel overworld = joining.getServer().overworld();
        long now = overworld.getGameTime();

        for (Entity entity : overworld.getAllEntities()) {
            sendCatchUp(joining, entity.getId(), now);
        }
    }

    private static void sendCatchUp(ServerPlayer observer, int entityId, long now) {
        Map<AnimationCategory, AnimationEntry> slots = AnimationRegistry.get().getAll(entityId);

        for (AnimationEntry entry : slots.values()) {
            int progressTicks = (int) Math.min(entry.elapsedTicks(now), Integer.MAX_VALUE);
            AnimTriggerPayload catchUp = AnimTriggerPayload.catchUp(
                    entry.entityId(), entry.category().ordinal(), entry.animId(), progressTicks,
                    entry.filePath(), entry.playbackSpeed(),
                    entry.lookAtMask(), entry.vanillaMask(), entry.vanillaMoveMask());
            NetworkUtils.sendToPlayer(observer, catchUp);
            if (entry.isPaused()) {
                long frozenMs = entry.pausedAtScaledTicks() * 50L;
                NetworkUtils.sendToPlayer(observer, AnimPausePayload.pause(entry.entityId(), entry.category().ordinal(), frozenMs));
            }
            LOGGER.debug("[AnimHooks] catch-up: observer={} entity={} cat={} anim={} progress={}t speed={} paused={}",
                    observer.getName().getString(), entityId,
                    entry.category(), entry.animId(), progressTicks, entry.playbackSpeed(), entry.isPaused());
        }

        for (var pose : PoseRegistry.get().getAllPoses(entityId)) {
            NetworkUtils.sendToPlayer(observer, pose);
        }
    }

    // -------------------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------------------

    /**
     * Cleans the animation/pose registries when an entity is permanently removed from
     * the level, preventing its ID from accumulating as a stale entry.
     */
    @SubscribeEvent
    public static void onEntityLeavingLevel(net.neoforged.neoforge.event.entity.EntityLeaveLevelEvent event) {
        Entity entity = event.getEntity();
        if (entity.level() instanceof ServerLevel) {
            int eid = entity.getId();
            if (AnimationRegistry.get().hasAny(eid)) {
                AnimationRegistry.get().removeAll(eid);
            }
            PoseRegistry.get().removeAll(eid);
        }
    }
}
