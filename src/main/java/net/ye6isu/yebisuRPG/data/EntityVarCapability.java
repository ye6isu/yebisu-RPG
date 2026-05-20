package net.ye6isu.yebisuRPG.data;

import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.Entity;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.attachment.AttachmentType;
import net.neoforged.neoforge.attachment.IAttachmentHolder;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.neoforged.neoforge.registries.NeoForgeRegistries;
import net.ye6isu.yebisuRPG.yebisuRPG;
import net.neoforged.bus.api.IEventBus;

import java.util.function.Supplier;

/**
 * Attaches an {@link EntityVarMap} to every entity via NeoForge's attachment system.
 *
 * <h2>Access pattern</h2>
 * <pre>{@code
 * // Server or client — get the map (creates it lazily on first access)
 * EntityVarMap vars = entity.getData(EntityVarCapability.VARS);
 *
 * // Define variables (idempotent — safe to call multiple times)
 * vars.define("mana",     EntityVar.ofInt(100));
 * vars.define("max_mana", EntityVar.ofInt(100));
 *
 * // Read / write
 * int mana = vars.getInt("mana");
 * vars.setInt("mana", mana - 10);
 * }</pre>
 *
 * <h2>Persistence</h2>
 * <p>The attachment is serialized to NBT automatically by NeoForge when the entity
 * is saved. Variables are restored on load with {@code dirty=true} so they are
 * re-synced to clients on the next sync window.</p>
 *
 * <h2>Multiplayer</h2>
 * <p>The attachment lives on the server. Clients receive values via
 * {@link net.ye6isu.yebisuRPG.data.network.VarSyncPayload} and store them in
 * {@link net.ye6isu.yebisuRPG.data.network.VarSyncClientCache}. Never read the
 * attachment directly on the client — always use the cache.</p>
 */
public final class EntityVarCapability {

    public static final DeferredRegister<AttachmentType<?>> ATTACHMENT_TYPES =
        DeferredRegister.create(NeoForgeRegistries.ATTACHMENT_TYPES, yebisuRPG.MODID);

    /**
     * The attachment key. Access via {@code entity.getData(EntityVarCapability.VARS)}.
     */
    public static final Supplier<AttachmentType<EntityVarMap>> VARS =
        ATTACHMENT_TYPES.register("entity_vars", () ->
            AttachmentType.<EntityVarMap>builder(EntityVarMap::new)
                .serialize(new net.neoforged.neoforge.attachment.IAttachmentSerializer<CompoundTag, EntityVarMap>() {
                    @Override
                    public EntityVarMap read(IAttachmentHolder holder, CompoundTag tag, HolderLookup.Provider registries) {
                        EntityVarMap map = new EntityVarMap();
                        map.load(tag, registries);
                        return map;
                    }

                    @Override
                    public CompoundTag write(EntityVarMap map, HolderLookup.Provider registries) {
                        return map.save(registries);
                    }
                })
                .copyOnDeath()   // persists through death respawn (useful for levels/xp)
                .build());

    private EntityVarCapability() {}

    public static void register(IEventBus modEventBus) {
        ATTACHMENT_TYPES.register(modEventBus);
    }

    /**
     * Convenience accessor — equivalent to {@code entity.getData(VARS.get())}.
     *
     * @param entity any entity on any side
     * @return the {@link EntityVarMap} for this entity (never null, created lazily)
     */
    public static EntityVarMap get(Entity entity) {
        return entity.getData(VARS.get());
    }

    /**
     * Returns {@code true} if the entity already has a var map with at least one variable.
     * Use this to avoid creating an empty map just to check for variables.
     */
    public static boolean hasData(Entity entity) {
        return entity.hasData(VARS.get())
            && !entity.getData(VARS.get()).getAll().isEmpty();
    }
}
