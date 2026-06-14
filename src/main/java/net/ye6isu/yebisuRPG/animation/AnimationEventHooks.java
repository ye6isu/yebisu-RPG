package net.ye6isu.yebisuRPG.animation;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.entity.player.PlayerEvent;
import net.neoforged.neoforge.event.tick.ServerTickEvent;
import net.ye6isu.yebisuRPG.network.animation.AnimTriggerPayload;
import net.ye6isu.yebisuRPG.network.util.NetworkUtils;
import net.ye6isu.yebisuRPG.yebisuRPG;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Server-side game-event subscriber for the custom animation system.
 *
 * <p>Three responsibilities:</p>
 * <ol>
 *   <li><b>Late-joiner catch-up</b> — {@link #onStartTracking} sends a progress-delta
 *       {@link AnimTriggerPayload} to any client that begins observing an entity that
 *       already has active animation slots.</li>
 *   <li><b>Login sync</b> — {@link #onPlayerLogin} mirrors the same catch-up for the
 *       joining player's own entity and any entities whose animations are already running
 *       in their starting chunk.</li>
 *   <li><b>Server-authoritative hurtbox validation</b> — {@link #onServerTick} reads the
 *       hurtbox-window sidecar files embedded in our animation assets, checks whether the
 *       current elapsed tick of each active ENTITY/ITEM_MAIN_HAND/ITEM_OFF_HAND animation
 *       falls inside a damage window, and executes the hit sweep entirely on the server so
 *       client-side modifications cannot forge damage entries.</li>
 * </ol>
 *
 * <p>No vanilla tick loops or entity AI methods are touched. All hooks are additive
 * listeners on NeoForge game-bus events.</p>
 */
@EventBusSubscriber(modid = yebisuRPG.MODID)
public final class AnimationEventHooks {

    private static final Logger LOGGER = LoggerFactory.getLogger(AnimationEventHooks.class);
    private static final Gson GSON = new Gson();

    // -------------------------------------------------------------------------
    // Hurtbox asset cache
    // -------------------------------------------------------------------------

    /**
     * Categories whose animations can carry hurtbox windows.
     * ARMOR categories are cosmetic-only and never carry damage windows.
     */
    private static final Set<AnimationCategory> HURTBOX_CATEGORIES = Collections.unmodifiableSet(
            EnumSet.of(
                    AnimationCategory.ENTITY,
                    AnimationCategory.ITEM_MAIN_HAND,
                    AnimationCategory.ITEM_OFF_HAND));

    /**
     * Tracks which (windowKey → Set<entityId>) targets have already been struck
     * within the current tick across all active sweep windows, preventing a target
     * from being damaged multiple times by overlapping segment AABBs in a single tick.
     *
     * Keyed by "attackerEntityId:animId:windowStartTick" so distinct windows on the
     * same animation never share a hit-set. Cleared at the start of each server tick.
     */
    private static final Map<String, Set<Integer>> TICK_HIT_SETS = new ConcurrentHashMap<>();

    /**
     * In-memory cache of parsed hurtbox window lists, keyed by animId.
     * Populated lazily on first reference to each animation; never evicted during a
     * session since animation asset files do not change at runtime.
     *
     * A cached empty list means the sidecar file was absent or had no windows —
     * the tick hook skips those entries cheaply without retrying the filesystem.
     */
    private static final ConcurrentHashMap<String, List<HurtboxWindow>> HURTBOX_CACHE =
            new ConcurrentHashMap<>();

    // -------------------------------------------------------------------------
    // Late-joiner catch-up: StartTracking
    // -------------------------------------------------------------------------

    /**
     * Fired on the server when a player's client begins tracking an entity
     * (i.e. the entity enters their render distance).
     *
     * <p>Iterates every active animation slot for the newly-tracked entity and sends
     * a catch-up {@link AnimTriggerPayload} with the elapsed progress delta so the
     * observer's playhead is immediately aligned with everyone else.</p>
     */
    @SubscribeEvent
    public static void onStartTracking(PlayerEvent.StartTracking event) {
        if (!(event.getEntity() instanceof ServerPlayer observer)) return;

        Entity tracked = event.getTarget();
        Map<AnimationCategory, AnimationEntry> slots =
                AnimationRegistry.get().getAll(tracked.getId());
        if (slots.isEmpty()) return;

        long now = tracked.level().getGameTime();

        for (AnimationEntry entry : slots.values()) {
            int progressTicks = (int) Math.min(entry.elapsedTicks(now), Integer.MAX_VALUE);
            AnimTriggerPayload catchUp = AnimTriggerPayload.catchUp(
                    entry.entityId(), entry.category(), entry.animId(), progressTicks,
                    entry.filePath(), entry.loopModeOverride());
            NetworkUtils.sendToPlayer(observer, catchUp);
            LOGGER.debug("[AnimHooks] StartTracking catch-up: observer={} entity={} cat={} anim={} progress={}t",
                    observer.getName().getString(), tracked.getId(),
                    entry.category(), entry.animId(), progressTicks);
        }
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
            Map<AnimationCategory, AnimationEntry> slots =
                    AnimationRegistry.get().getAll(entity.getId());
            if (slots.isEmpty()) continue;

            for (AnimationEntry entry : slots.values()) {
                int progressTicks = (int) Math.min(entry.elapsedTicks(now), Integer.MAX_VALUE);
                AnimTriggerPayload catchUp = AnimTriggerPayload.catchUp(
                        entry.entityId(), entry.category(), entry.animId(), progressTicks,
                        entry.filePath(), entry.loopModeOverride());
                NetworkUtils.sendToPlayer(joining, catchUp);
                LOGGER.debug("[AnimHooks] Login catch-up: joining={} entity={} cat={} anim={} progress={}t",
                        joining.getName().getString(), entity.getId(),
                        entry.category(), entry.animId(), progressTicks);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Server-authoritative hurtbox validation
    // -------------------------------------------------------------------------

    /**
     * Fired once per server tick after all entity AI and movement has resolved.
     *
     * <p>For every active animation entry in a hurtbox-capable category, this method:</p>
     * <ol>
     *   <li>Resolves the owning entity from the server level.</li>
     *   <li>Loads (or retrieves from cache) the animation's hurtbox sidecar data.</li>
     *   <li>Checks whether the current elapsed tick falls inside any {@link HurtboxWindow}.</li>
     *   <li>If so, sweeps an AABB along the weapon path points (transformed by the entity's
     *       facing vector) and calls {@code target.hurt()} on all hits — entirely server-side.</li>
     * </ol>
     *
     * <p>Vanilla damage pipeline ({@code LivingEntity.hurt()}) is called normally;
     * no vanilla logic is bypassed or overridden.</p>
     */
    @SubscribeEvent
    public static void onServerTick(ServerTickEvent.Post event) {
        // Per-tick hit sets are rebuilt fresh each tick — clear first.
        TICK_HIT_SETS.clear();

        AnimationRegistry registry = AnimationRegistry.get();

        for (Map.Entry<Integer, java.util.EnumMap<AnimationCategory, AnimationEntry>> outer
                : registry.snapshot().entrySet()) {

            int entityId = outer.getKey();

            for (AnimationEntry entry : outer.getValue().values()) {
                if (!HURTBOX_CATEGORIES.contains(entry.category())) continue;

                Entity attacker = resolveEntity(event.getServer(), entityId);
                if (attacker == null) continue;

                Level level = attacker.level();
                long elapsed = entry.elapsedTicks(level.getGameTime());

                List<HurtboxWindow> windows = loadHurtboxWindows(entry.animId());
                if (windows.isEmpty()) continue;

                for (HurtboxWindow window : windows) {
                    if (!window.contains(elapsed)) continue;
                    String windowKey = entityId + ":" + entry.animId() + ":" + window.startTick();
                    sweepHurtbox(attacker, window, level, windowKey);
                }
            }
        }
    }

    /**
     * Cleans the animation registry when an entity is permanently removed from
     * the level, preventing its ID from accumulating as a stale entry that
     * would be re-resolved (and fail) on every subsequent server tick.
     */
    @SubscribeEvent
    public static void onEntityLeavingLevel(net.neoforged.neoforge.event.entity.EntityLeaveLevelEvent event) {
        Entity entity = event.getEntity();
        if (entity.level() instanceof ServerLevel && AnimationRegistry.get().hasAny(entity.getId())) {
            AnimationRegistry.get().removeAll(entity.getId());
            LOGGER.debug("[AnimHooks] Cleared registry for removed entity={}", entity.getId());
        }
    }

    // -------------------------------------------------------------------------
    // Hurtbox sweep implementation
    // -------------------------------------------------------------------------

    /**
     * Executes one bounding-box sweep along the weapon path defined by {@code window},
     * applying the attacker's current facing rotation to transform the path points from
     * model-local space into world space.
     *
     * <p>Each adjacent pair of path points defines a segment. The AABB enclosing that
     * segment (expanded by {@link HurtboxWindow#SWEEP_RADIUS}) is tested against all
     * living entities in the level. Hits are resolved via the vanilla
     * {@link LivingEntity#hurt} call so all damage modifiers, effects, and events
     * apply normally.</p>
     */
    /**
     * Executes one bounding-box sweep along the weapon path defined by {@code window},
     * transforming model-local path points into world space via the attacker's yaw.
     *
     * <h2>Deduplication</h2>
     * <p>Each target entity can be struck at most once per window-key per tick.
     * The window key encodes attacker + animId + window start tick so distinct
     * windows on the same animation produce independent hit sets, while the same
     * window spanning multiple ticks does not re-damage the same target on
     * consecutive ticks within its active range.</p>
     *
     * <h2>Damage source</h2>
     * <p>Uses {@code mobAttack} when the attacker is a {@link LivingEntity} so that
     * knockback direction, death messages, and NeoForge {@code LivingHurtEvent}
     * attacker fields are populated correctly. Falls back to {@code generic} for
     * non-living attackers (e.g. block-placed turrets, summoned projectile entities)
     * rather than passing {@code null} to {@code mobAttack}.</p>
     */
    private static void sweepHurtbox(Entity attacker, HurtboxWindow window,
                                     Level level, String windowKey) {
        if (window.pathPoints().size() < 2) return;

        Vec3 origin = attacker.position().add(0, attacker.getBbHeight() * 0.5, 0);
        double yawRad = Math.toRadians(attacker.getYRot());
        double sin = Math.sin(yawRad);
        double cos = Math.cos(yawRad);

        // Transform model-local path points into world space via attacker yaw.
        List<Vec3> worldPath = new ArrayList<>(window.pathPoints().size());
        for (Vec3 local : window.pathPoints()) {
            worldPath.add(new Vec3(
                    origin.x + (local.x * cos - local.z * sin),
                    origin.y + local.y,
                    origin.z + (local.x * sin + local.z * cos)));
        }

        // Union all per-segment AABBs into a single broad-phase query box.
        AABB queryBox = null;
        for (int i = 0; i < worldPath.size() - 1; i++) {
            AABB seg = new AABB(worldPath.get(i), worldPath.get(i + 1))
                    .inflate(HurtboxWindow.SWEEP_RADIUS);
            queryBox = (queryBox == null) ? seg : queryBox.minmax(seg);
        }
        if (queryBox == null) return;

        // Correct damage source: mobAttack requires a non-null LivingEntity attacker.
        DamageSource source = (attacker instanceof LivingEntity le)
                ? level.damageSources().mobAttack(le)
                : level.damageSources().generic();

        Set<Integer> struckThisTick = TICK_HIT_SETS
                .computeIfAbsent(windowKey, k -> new HashSet<>());

        for (Entity candidate : level.getEntities(attacker, queryBox)) {
            if (!(candidate instanceof LivingEntity target)) continue;
            if (struckThisTick.contains(target.getId())) continue;
            // Fine-grained check: target AABB must actually overlap the sweep volume.
            if (!target.getBoundingBox().intersects(queryBox)) continue;
            if (target.hurt(source, window.damage())) {
                struckThisTick.add(target.getId());
            }
        }
    }

    // -------------------------------------------------------------------------
    // Hurtbox asset loading
    // -------------------------------------------------------------------------

    /**
     * Returns the cached (or freshly loaded) list of {@link HurtboxWindow}s for
     * the given animation ID.
     *
     * <p>Sidecar files live at:
     * {@code assets/yebisurpg/animations/<animId>_hurtbox.json}
     * inside the mod JAR / resource pack. An absent or malformed file results in
     * an empty list, which is cached so the loader is not retried on every tick.</p>
     */
    private static List<HurtboxWindow> loadHurtboxWindows(String animId) {
        return HURTBOX_CACHE.computeIfAbsent(animId, id -> {
            String path = "/assets/yebisurpg/animations/" + id + "_hurtbox.json";
            try (InputStream is = AnimationEventHooks.class.getResourceAsStream(path)) {
                if (is == null) return List.of();
                JsonObject root = GSON.fromJson(new InputStreamReader(is, StandardCharsets.UTF_8),
                        JsonObject.class);
                return parseHurtboxWindows(root);
            } catch (Exception e) {
                LOGGER.warn("[AnimHooks] Failed to load hurtbox data for '{}': {}", id, e.getMessage());
                return List.of();
            }
        });
    }

    /**
     * Parses the {@code windows} array from a hurtbox sidecar JSON object.
     *
     * Expected schema:
     * <pre>{@code
     * {
     *   "animation_id": "attack_slash",
     *   "windows": [
     *     {
     *       "start_tick": 4,
     *       "end_tick": 9,
     *       "path_points": [
     *         { "x": 0.3, "y": 1.2, "z": 0.0 },
     *         { "x": 0.8, "y": 0.9, "z": 0.4 }
     *       ]
     *     }
     *   ]
     * }
     * }</pre>
     */
    private static List<HurtboxWindow> parseHurtboxWindows(JsonObject root) {
        if (!root.has("windows")) return List.of();
        JsonArray arr = root.getAsJsonArray("windows");
        List<HurtboxWindow> result = new ArrayList<>(arr.size());

        for (JsonElement el : arr) {
            JsonObject w = el.getAsJsonObject();
            long  startTick = w.get("start_tick").getAsLong();
            long  endTick   = w.get("end_tick").getAsLong();
            float damage    = w.has("damage")
                    ? w.get("damage").getAsFloat()
                    : HurtboxWindow.DEFAULT_DAMAGE;

            List<Vec3> points = new ArrayList<>();
            for (JsonElement pe : w.getAsJsonArray("path_points")) {
                JsonObject p = pe.getAsJsonObject();
                points.add(new Vec3(
                        p.get("x").getAsDouble(),
                        p.get("y").getAsDouble(),
                        p.get("z").getAsDouble()));
            }
            result.add(new HurtboxWindow(startTick, endTick, damage,
                    Collections.unmodifiableList(points)));
        }
        return Collections.unmodifiableList(result);
    }

    // -------------------------------------------------------------------------
    // Entity resolution helper
    // -------------------------------------------------------------------------

    /**
     * Resolves an entity by integer ID across all currently loaded server levels.
     * Returns null if the entity is not found (unloaded chunk, removed entity, etc.).
     * A null return causes the tick hook to skip that entry without error.
     */
    private static Entity resolveEntity(net.minecraft.server.MinecraftServer server, int entityId) {
        for (ServerLevel level : server.getAllLevels()) {
            Entity e = level.getEntity(entityId);
            if (e != null) return e;
        }
        return null;
    }

    // -------------------------------------------------------------------------
    // HurtboxWindow inner record
    // -------------------------------------------------------------------------

    /**
     * Immutable representation of one active damage window within an animation.
     *
     * @param startTick  first animation-relative tick the hurtbox is live
     * @param endTick    last animation-relative tick the hurtbox is live (inclusive)
     * @param damage     flat damage value applied to each struck entity (half-hearts)
     * @param pathPoints model-local weapon path points (at least 2 required for a sweep)
     */
    public record HurtboxWindow(long startTick, long endTick, float damage, List<Vec3> pathPoints) {

        /** Half-width of the AABB inflated around each path segment during the sweep. */
        public static final double SWEEP_RADIUS = 0.4;

        /** Default damage when the sidecar JSON omits the "damage" field. */
        public static final float DEFAULT_DAMAGE = 2.0f;

        /** True if the given animation-relative tick falls inside this window. */
        public boolean contains(long elapsedTick) {
            return elapsedTick >= startTick && elapsedTick <= endTick;
        }
    }
}
