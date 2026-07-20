package net.ye6isu.yebisuRPG.keybind;

import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.neoforged.neoforge.attachment.AttachmentType;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.ye6isu.yebisuRPG.component.ModDataComponents;
import net.ye6isu.yebisuRPG.entityvar.ModAttachments;

import java.util.LinkedHashMap;
import java.util.Map;

/** Server-owned player ability loadout and cooldown helpers. */
public final class PlayerAbilities {

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
        long remaining = getCooldownEnd(player, abilityId) - player.level().getGameTime();
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
        long now = player.level().getGameTime();
        Map<String, Long> cooldowns = parseCooldowns(player.getData(ModAttachments.ABILITY_COOLDOWNS.get()));
        cooldowns.replaceAll((id, endTick) -> Math.max(0L, endTick - now));
        cooldowns.entrySet().removeIf(entry -> entry.getValue() <= 0L);
        player.setData(ModAttachments.ABILITY_COOLDOWNS.get(), writeCooldowns(cooldowns));
    }

    public static void resumeCooldowns(Player player) {
        if (player == null || player.level().isClientSide()) return;
        long now = player.level().getGameTime();
        Map<String, Long> cooldowns = parseCooldowns(player.getData(ModAttachments.ABILITY_COOLDOWNS.get()));
        cooldowns.replaceAll((id, remainingTicks) -> now + Math.max(0L, remainingTicks));
        cooldowns.entrySet().removeIf(entry -> entry.getValue() <= now);
        player.setData(ModAttachments.ABILITY_COOLDOWNS.get(), writeCooldowns(cooldowns));
    }

    private static long getCooldownEnd(Player player, String abilityId) {
        if (abilityId == null || abilityId.isBlank()) return 0L;
        return parseCooldowns(player.getData(ModAttachments.ABILITY_COOLDOWNS.get())).getOrDefault(abilityId, 0L);
    }

    private static void setCooldownEnd(Player player, String abilityId, long endTick) {
        if (abilityId == null || abilityId.isBlank()) return;
        Map<String, Long> cooldowns = parseCooldowns(player.getData(ModAttachments.ABILITY_COOLDOWNS.get()));
        long now = player.level().getGameTime();
        cooldowns.entrySet().removeIf(entry -> entry.getValue() <= now);
        cooldowns.put(abilityId, endTick);
        player.setData(ModAttachments.ABILITY_COOLDOWNS.get(), writeCooldowns(cooldowns));
    }

    private static Map<String, Long> parseCooldowns(String raw) {
        Map<String, Long> result = new LinkedHashMap<>();
        if (raw == null || raw.isBlank()) return result;
        for (String entry : raw.split(";")) {
            int sep = entry.lastIndexOf('=');
            if (sep <= 0 || sep >= entry.length() - 1) continue;
            try {
                result.put(entry.substring(0, sep), Long.parseLong(entry.substring(sep + 1)));
            } catch (NumberFormatException ignored) {
            }
        }
        return result;
    }

    private static String writeCooldowns(Map<String, Long> cooldowns) {
        StringBuilder out = new StringBuilder();
        for (Map.Entry<String, Long> entry : cooldowns.entrySet()) {
            String id = entry.getKey();
            if (id == null || id.isBlank() || id.indexOf(';') >= 0 || id.indexOf('=') >= 0) continue;
            if (!out.isEmpty()) out.append(';');
            out.append(id).append('=').append(entry.getValue());
        }
        return out.toString();
    }

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
