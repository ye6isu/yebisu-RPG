package net.ye6isu.yebisuRPG.keybind;

import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.neoforged.neoforge.attachment.AttachmentType;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.ye6isu.yebisuRPG.component.ModDataComponents;
import net.ye6isu.yebisuRPG.entityvar.ModAttachments;
import net.ye6isu.yebisuRPG.resource.PlayerResourceRegistry;

import java.util.LinkedHashMap;
import java.util.Map;

/** Server-owned player ability loadout and cooldown helpers. */
public final class PlayerAbilities {

    private static final String ACTIVE_COOLDOWNS_PREFIX = "active|";
    private static final String FROZEN_COOLDOWNS_PREFIX = "frozen|";

    private PlayerAbilities() {}

    public static boolean useSlot(Player player, int slot) {
        if (player == null || player.level().isClientSide()) return false;
        String abilityId = getEffectiveSlot(player, slot);
        return useAbilityId(player, abilityId);
    }

    public static boolean useItemSlot(Player player, int slot) {
        if (player == null || player.level().isClientSide()) return false;
        return useAbilityId(player, getItemAbilitySlot(player, slot));
    }

    public static boolean useAltSlot(Player player, int slot) {
        if (player == null || player.level().isClientSide()) return false;
        return useAbilityId(player, getAltSlot(player, slot));
    }

    private static boolean useAbilityId(Player player, String abilityId) {
        AbilityDefinition ability = AbilityRegistry.get(abilityId);
        if (ability == null) return false;
        if (cooldownRemainingTicks(player, abilityId) > 0) return false;
        if (!PlayerResourceRegistry.tryConsume(player, ability.resourceCosts())) return false;

        setCooldownEnd(player, abilityId, player.level().getGameTime() + ability.cooldownTicks());
        AbilityHandlers.dispatch(abilityId, player);
        return true;
    }

    public static String getSlot(Player player, int slot) {
        DeferredHolder<AttachmentType<?>, AttachmentType<String>> holder = slotHolder(slot);
        return holder != null ? player.getData(holder.get()) : "";
    }

    public static String getEffectiveSlot(Player player, int slot) {
        if (player == null) return "";
        String itemAbilityId = getItemSlot(player.getMainHandItem(), slot);
        return !itemAbilityId.isBlank() ? itemAbilityId : getSlot(player, slot);
    }

    public static String getItemSlot(ItemStack stack, int slot) {
        if (stack == null || stack.isEmpty()) return "";
        if (!stack.getOrDefault(ModDataComponents.ITEM_HAS_ABILITIES.get(), false)) return "";
        DeferredHolder<net.minecraft.core.component.DataComponentType<?>, net.minecraft.core.component.DataComponentType<String>> holder = itemSlotHolder(slot);
        return holder != null ? stack.getOrDefault(holder.get(), "") : "";
    }

    public static String getItemAbilitySlot(Player player, int slot) {
        return player != null ? getItemSlot(player.getMainHandItem(), slot) : "";
    }

    public static void setSlot(Player player, int slot, String abilityId) {
        DeferredHolder<AttachmentType<?>, AttachmentType<String>> holder = slotHolder(slot);
        if (holder == null) return;
        player.setData(holder.get(), abilityId != null ? abilityId : "");
    }

    public static String getAltSlot(Player player, int slot) {
        DeferredHolder<AttachmentType<?>, AttachmentType<String>> holder = altSlotHolder(slot);
        return holder != null ? player.getData(holder.get()) : "";
    }

    public static void setAltSlot(Player player, int slot, String abilityId) {
        DeferredHolder<AttachmentType<?>, AttachmentType<String>> holder = altSlotHolder(slot);
        if (holder == null) return;
        player.setData(holder.get(), abilityId != null ? abilityId : "");
    }

    public static long cooldownRemainingTicks(Player player, int slot) {
        return cooldownRemainingTicks(player, getEffectiveSlot(player, slot));
    }

    public static long cooldownRemainingTicks(Player player, String abilityId) {
        if (abilityId == null || abilityId.isBlank()) return 0L;
        CooldownState state = parseCooldowns(player.getData(ModAttachments.ABILITY_COOLDOWNS.get()));
        long stored = state.values().getOrDefault(abilityId, 0L);
        long remaining = state.frozen() ? stored : stored - player.level().getGameTime();
        return Math.max(0L, remaining);
    }

    public static int slotFromKeybindId(String keybindId) {
        if (keybindId == null || !keybindId.startsWith("main_slot_")) return 0;
        try {
            int slot = Integer.parseInt(keybindId.substring("main_slot_".length()));
            return slot >= 1 && slot <= 6 ? slot : 0;
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    public static int altSlotFromKeybindId(String keybindId) {
        if (keybindId == null || !keybindId.startsWith("alt_slot_")) return 0;
        try {
            int slot = Integer.parseInt(keybindId.substring("alt_slot_".length()));
            return slot >= 1 && slot <= 9 ? slot : 0;
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    public static void freezeCooldowns(Player player) {
        if (player == null || player.level().isClientSide()) return;
        CooldownState state = parseCooldowns(player.getData(ModAttachments.ABILITY_COOLDOWNS.get()));
        if (state.frozen()) return;
        long now = player.level().getGameTime();
        Map<String, Long> cooldowns = state.values();
        cooldowns.replaceAll((id, endTick) -> Math.max(0L, endTick - now));
        cooldowns.entrySet().removeIf(entry -> entry.getValue() <= 0L);
        player.setData(ModAttachments.ABILITY_COOLDOWNS.get(), writeCooldowns(cooldowns, true));
    }

    public static void resumeCooldowns(Player player) {
        if (player == null || player.level().isClientSide()) return;
        long now = player.level().getGameTime();
        CooldownState state = parseCooldowns(player.getData(ModAttachments.ABILITY_COOLDOWNS.get()));
        Map<String, Long> cooldowns = state.values();
        if (state.frozen()) {
            cooldowns.replaceAll((id, remainingTicks) -> now + Math.max(0L, remainingTicks));
        } else if (state.legacy()) {
            cooldowns.replaceAll((id, storedValue) -> migrateLegacyCooldown(id, storedValue, now));
        }
        cooldowns.entrySet().removeIf(entry -> entry.getValue() <= now);
        player.setData(ModAttachments.ABILITY_COOLDOWNS.get(), writeCooldowns(cooldowns, false));
    }

    private static void setCooldownEnd(Player player, String abilityId, long endTick) {
        if (abilityId == null || abilityId.isBlank()) return;
        long now = player.level().getGameTime();
        CooldownState state = parseCooldowns(player.getData(ModAttachments.ABILITY_COOLDOWNS.get()));
        Map<String, Long> cooldowns = state.values();
        if (state.frozen()) {
            cooldowns.replaceAll((id, remainingTicks) -> now + Math.max(0L, remainingTicks));
        } else if (state.legacy()) {
            cooldowns.replaceAll((id, storedValue) -> migrateLegacyCooldown(id, storedValue, now));
        }
        cooldowns.entrySet().removeIf(entry -> entry.getValue() <= now);
        cooldowns.put(abilityId, endTick);
        player.setData(ModAttachments.ABILITY_COOLDOWNS.get(), writeCooldowns(cooldowns, false));
    }

    private static long migrateLegacyCooldown(String abilityId, long storedValue, long now) {
        AbilityDefinition ability = AbilityRegistry.get(abilityId);
        long maximumDuration = ability != null ? ability.cooldownTicks() : 0L;
        if (storedValue > maximumDuration) return storedValue;
        return now + Math.max(0L, storedValue);
    }

    private static CooldownState parseCooldowns(String raw) {
        Map<String, Long> result = new LinkedHashMap<>();
        if (raw == null || raw.isBlank()) return new CooldownState(false, false, result);
        boolean frozen = raw.startsWith(FROZEN_COOLDOWNS_PREFIX);
        boolean active = raw.startsWith(ACTIVE_COOLDOWNS_PREFIX);
        String body = frozen ? raw.substring(FROZEN_COOLDOWNS_PREFIX.length())
                : active ? raw.substring(ACTIVE_COOLDOWNS_PREFIX.length()) : raw;
        for (String entry : body.split(";")) {
            int sep = entry.lastIndexOf('=');
            if (sep <= 0 || sep >= entry.length() - 1) continue;
            try {
                result.put(entry.substring(0, sep), Long.parseLong(entry.substring(sep + 1)));
            } catch (NumberFormatException ignored) {
            }
        }
        return new CooldownState(frozen, !frozen && !active, result);
    }

    private static String writeCooldowns(Map<String, Long> cooldowns, boolean frozen) {
        StringBuilder out = new StringBuilder(frozen ? FROZEN_COOLDOWNS_PREFIX : ACTIVE_COOLDOWNS_PREFIX);
        for (Map.Entry<String, Long> entry : cooldowns.entrySet()) {
            String id = entry.getKey();
            if (id == null || id.isBlank() || id.indexOf(';') >= 0 || id.indexOf('=') >= 0) continue;
            if (out.length() > (frozen ? FROZEN_COOLDOWNS_PREFIX.length() : ACTIVE_COOLDOWNS_PREFIX.length())) out.append(';');
            out.append(id).append('=').append(entry.getValue());
        }
        return out.toString();
    }

    private record CooldownState(boolean frozen, boolean legacy, Map<String, Long> values) {}

    private static DeferredHolder<AttachmentType<?>, AttachmentType<String>> slotHolder(int slot) {
        return switch (slot) {
            case 1 -> ModAttachments.ABILITY_SLOT_1;
            case 2 -> ModAttachments.ABILITY_SLOT_2;
            case 3 -> ModAttachments.ABILITY_SLOT_3;
            case 4 -> ModAttachments.ABILITY_SLOT_4;
            case 5 -> ModAttachments.ABILITY_SLOT_5;
            case 6 -> ModAttachments.ABILITY_SLOT_6;
            default -> null;
        };
    }

    private static DeferredHolder<AttachmentType<?>, AttachmentType<String>> altSlotHolder(int slot) {
        return switch (slot) {
            case 1 -> ModAttachments.ALT_ABILITY_SLOT_1;
            case 2 -> ModAttachments.ALT_ABILITY_SLOT_2;
            case 3 -> ModAttachments.ALT_ABILITY_SLOT_3;
            case 4 -> ModAttachments.ALT_ABILITY_SLOT_4;
            case 5 -> ModAttachments.ALT_ABILITY_SLOT_5;
            case 6 -> ModAttachments.ALT_ABILITY_SLOT_6;
            case 7 -> ModAttachments.ALT_ABILITY_SLOT_7;
            case 8 -> ModAttachments.ALT_ABILITY_SLOT_8;
            case 9 -> ModAttachments.ALT_ABILITY_SLOT_9;
            default -> null;
        };
    }

    private static DeferredHolder<net.minecraft.core.component.DataComponentType<?>, net.minecraft.core.component.DataComponentType<String>> itemSlotHolder(int slot) {
        return switch (slot) {
            case 1 -> ModDataComponents.ITEM_ABILITY_SLOT_1;
            case 2 -> ModDataComponents.ITEM_ABILITY_SLOT_2;
            case 3 -> ModDataComponents.ITEM_ABILITY_SLOT_3;
            case 4 -> ModDataComponents.ITEM_ABILITY_SLOT_4;
            case 5 -> ModDataComponents.ITEM_ABILITY_SLOT_5;
            case 6 -> ModDataComponents.ITEM_ABILITY_SLOT_6;
            case 7 -> ModDataComponents.ITEM_ABILITY_SLOT_7;
            case 8 -> ModDataComponents.ITEM_ABILITY_SLOT_8;
            case 9 -> ModDataComponents.ITEM_ABILITY_SLOT_9;
            default -> null;
        };
    }

}
