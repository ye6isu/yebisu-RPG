package net.ye6isu.yebisuRPG.data;

import java.util.function.Supplier;
import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.world.entity.Entity;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.attachment.AttachmentType;
import net.neoforged.neoforge.attachment.IAttachmentHolder;
import net.neoforged.neoforge.attachment.IAttachmentSerializer;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.neoforged.neoforge.registries.NeoForgeRegistries;
import net.ye6isu.yebisuRPG.yebisuRPG;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/data/EntityVarCapability.class */
public final class EntityVarCapability {
    public static final DeferredRegister<AttachmentType<?>> ATTACHMENT_TYPES = DeferredRegister.create(NeoForgeRegistries.ATTACHMENT_TYPES, yebisuRPG.MODID);
    public static final Supplier<AttachmentType<EntityVarMap>> VARS = ATTACHMENT_TYPES.register("entity_vars", () -> {
        return AttachmentType.builder(EntityVarMap::new).serialize(new IAttachmentSerializer<CompoundTag, EntityVarMap>() { // from class: net.ye6isu.yebisuRPG.data.EntityVarCapability.1
            public EntityVarMap read(IAttachmentHolder holder, CompoundTag tag, HolderLookup.Provider registries) {
                EntityVarMap map = new EntityVarMap();
                map.load(tag, registries);
                return map;
            }

            public CompoundTag write(EntityVarMap map, HolderLookup.Provider registries) {
                return map.save(registries);
            }
        }).copyOnDeath().build();
    });

    private EntityVarCapability() {
    }

    public static void register(IEventBus modEventBus) {
        ATTACHMENT_TYPES.register(modEventBus);
    }

    public static EntityVarMap get(Entity entity) {
        return (EntityVarMap) entity.getData(VARS.get());
    }

    public static boolean hasData(Entity entity) {
        return entity.hasData(VARS.get()) && !((EntityVarMap) entity.getData(VARS.get())).getAll().isEmpty();
    }
}
