package net.ye6isu.yebisuRPG.entityvar;

import com.mojang.serialization.Codec;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.attachment.AttachmentType;
import net.neoforged.neoforge.registries.NeoForgeRegistries;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.yebisuRPG;

/**
 * Registers custom entity-attached variables (YCS "Entity Variables") as NeoForge
 * {@link AttachmentType}s. Unlike {@code ModDataComponents} (per-ItemStack), these are
 * attached per-entity and persist/sync automatically via NeoForge's built-in attachment
 * sync — read/write via {@code entity.getData(ModAttachments.YOUR_VAR.get())} and
 * {@code entity.setData(...)}.
 *
 * <p>YCS injects new variable declarations above the {@code YCS_Entity_Attachments}
 * marker below.</p>
 */
public final class ModAttachments {

    public static final DeferredRegister<AttachmentType<?>> ATTACHMENT_TYPES =
        DeferredRegister.create(NeoForgeRegistries.Keys.ATTACHMENT_TYPES, yebisuRPG.MODID);

    public static DeferredHolder<AttachmentType<?>, AttachmentType<Double>> registerDouble(String name, double defaultValue) {
        return ATTACHMENT_TYPES.register(name, () ->
            AttachmentType.builder(() -> defaultValue)
                .serialize(Codec.DOUBLE)
                .sync(ByteBufCodecs.DOUBLE)
                .build());
    }

    public static DeferredHolder<AttachmentType<?>, AttachmentType<Boolean>> registerBoolean(String name, boolean defaultValue) {
        return ATTACHMENT_TYPES.register(name, () ->
            AttachmentType.builder(() -> defaultValue)
                .serialize(Codec.BOOL)
                .sync(ByteBufCodecs.BOOL)
                .build());
    }

    public static DeferredHolder<AttachmentType<?>, AttachmentType<String>> registerString(String name, String defaultValue) {
        return ATTACHMENT_TYPES.register(name, () ->
            AttachmentType.builder(() -> defaultValue)
                .serialize(Codec.STRING)
                .sync(ByteBufCodecs.STRING_UTF8)
                .build());
    }

    public static DeferredHolder<AttachmentType<?>, AttachmentType<Long>> registerLong(String name, long defaultValue) {
        return ATTACHMENT_TYPES.register(name, () ->
            AttachmentType.builder(() -> defaultValue)
                .serialize(Codec.LONG)
                .sync(ByteBufCodecs.VAR_LONG)
                .build());
    }

    public static final DeferredHolder<AttachmentType<?>, AttachmentType<Boolean>> CHCKER = registerBoolean("chcker", false);
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<Double>> COUNTER = registerDouble("counter", 0);
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<String>> ABILITY_SLOT_1 = registerString("ability_slot_1", "");
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<String>> ABILITY_SLOT_2 = registerString("ability_slot_2", "");
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<String>> ABILITY_SLOT_3 = registerString("ability_slot_3", "");
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<String>> ABILITY_SLOT_4 = registerString("ability_slot_4", "");
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<String>> ABILITY_SLOT_5 = registerString("ability_slot_5", "");
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<String>> ABILITY_SLOT_6 = registerString("ability_slot_6", "");
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<String>> ALT_ABILITY_SLOT_1 = registerString("alt_ability_slot_1", "");
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<String>> ALT_ABILITY_SLOT_2 = registerString("alt_ability_slot_2", "");
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<String>> ALT_ABILITY_SLOT_3 = registerString("alt_ability_slot_3", "");
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<String>> ALT_ABILITY_SLOT_4 = registerString("alt_ability_slot_4", "");
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<String>> ALT_ABILITY_SLOT_5 = registerString("alt_ability_slot_5", "");
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<String>> ALT_ABILITY_SLOT_6 = registerString("alt_ability_slot_6", "");
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<String>> ALT_ABILITY_SLOT_7 = registerString("alt_ability_slot_7", "");
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<String>> ALT_ABILITY_SLOT_8 = registerString("alt_ability_slot_8", "");
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<String>> ALT_ABILITY_SLOT_9 = registerString("alt_ability_slot_9", "");
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<String>> ABILITY_COOLDOWNS = registerString("ability_cooldowns", "");
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<Long>> ABILITY_SLOT_1_COOLDOWN_END = registerLong("ability_slot_1_cooldown_end", 0L);
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<Long>> ABILITY_SLOT_2_COOLDOWN_END = registerLong("ability_slot_2_cooldown_end", 0L);
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<Long>> ABILITY_SLOT_3_COOLDOWN_END = registerLong("ability_slot_3_cooldown_end", 0L);
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<Long>> ABILITY_SLOT_4_COOLDOWN_END = registerLong("ability_slot_4_cooldown_end", 0L);
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<Long>> ABILITY_SLOT_5_COOLDOWN_END = registerLong("ability_slot_5_cooldown_end", 0L);
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<Long>> ABILITY_SLOT_6_COOLDOWN_END = registerLong("ability_slot_6_cooldown_end", 0L);
    // YCS_Entity_Attachments

    private ModAttachments() {}

    public static void register(IEventBus eventBus) {
        ATTACHMENT_TYPES.register(eventBus);
    }
}
