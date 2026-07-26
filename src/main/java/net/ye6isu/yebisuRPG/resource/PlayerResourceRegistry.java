package net.ye6isu.yebisuRPG.resource;

import net.minecraft.world.entity.player.Player;
import net.ye6isu.yebisuRPG.attribute.ModAttributes;
import net.ye6isu.yebisuRPG.entityvar.ModAttachments;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/** Common resource registry used by server gameplay and client HUD rendering. */
public final class PlayerResourceRegistry {

    private static final String BASELINE_RESOURCE_ID = "stamina";
    private static final List<PlayerResourceDefinition> DEFINITIONS = new ArrayList<>();
    private static final Comparator<PlayerResourceDefinition> DISPLAY_ORDER = Comparator
            .comparingInt((PlayerResourceDefinition definition) -> BASELINE_RESOURCE_ID.equals(definition.id()) ? 0 : 1)
            .thenComparingInt(PlayerResourceDefinition::order)
            .thenComparing(PlayerResourceDefinition::id);

    private PlayerResourceRegistry() {}

    private static void register(PlayerResourceDefinition definition) {
        DEFINITIONS.add(definition);
    }

    public static List<PlayerResourceDefinition> all() {
        return DEFINITIONS.stream()
                .sorted(DISPLAY_ORDER)
                .toList();
    }

    public static List<PlayerResourceDefinition> availableTo(Player player) {
        Set<String> unlocked = unlockedResourceIds(player);
        return all().stream()
                .filter(definition -> isAvailable(definition.id(), unlocked))
                .toList();
    }

    public static PlayerResourceDefinition get(String id) {
        if (id == null || id.isBlank()) return null;
        return DEFINITIONS.stream().filter(definition -> id.equals(definition.id())).findFirst().orElse(null);
    }

    public static boolean tryConsume(Player player, Map<String, Double> costs) {
        if (costs == null || costs.isEmpty()) return true;
        Set<String> unlocked = unlockedResourceIds(player);
        for (Map.Entry<String, Double> entry : costs.entrySet()) {
            double cost = Math.max(0.0, entry.getValue());
            PlayerResourceDefinition definition = get(entry.getKey());
            if (cost > 0.0 && (definition == null
                    || !isAvailable(definition.id(), unlocked)
                    || definition.current(player) < cost)) return false;
        }
        for (Map.Entry<String, Double> entry : costs.entrySet()) {
            double cost = Math.max(0.0, entry.getValue());
            PlayerResourceDefinition definition = get(entry.getKey());
            if (cost > 0.0 && definition != null) definition.setCurrent(player, definition.current(player) - cost);
        }
        return true;
    }

    public static void regenerate(Player player) {
        Set<String> unlocked = unlockedResourceIds(player);
        for (PlayerResourceDefinition definition : DEFINITIONS) {
            if (!isAvailable(definition.id(), unlocked)) continue;
            double regeneration = definition.regeneration(player);
            if (regeneration > 0.0) {
                definition.setCurrent(player, definition.current(player) + regeneration);
            }
        }
    }

    public static boolean isAvailable(Player player, String resourceId) {
        return get(resourceId) != null && isAvailable(resourceId, unlockedResourceIds(player));
    }

    public static void setAvailable(Player player, String resourceId, boolean available) {
        if (resourceId == null || BASELINE_RESOURCE_ID.equals(resourceId) || get(resourceId) == null) return;

        Set<String> unlocked = new TreeSet<>(unlockedResourceIds(player));
        boolean changed = available ? unlocked.add(resourceId) : unlocked.remove(resourceId);
        if (changed) {
            player.setData(ModAttachments.UNLOCKED_RESOURCES.get(), String.join(",", unlocked));
        }
    }

    private static boolean isAvailable(String resourceId, Set<String> unlocked) {
        return BASELINE_RESOURCE_ID.equals(resourceId) || unlocked.contains(resourceId);
    }

    private static Set<String> unlockedResourceIds(Player player) {
        String encoded = player.getData(ModAttachments.UNLOCKED_RESOURCES.get());
        if (encoded == null || encoded.isBlank()) return Set.of();

        Set<String> ids = new HashSet<>();
        Arrays.stream(encoded.split(","))
                .map(String::trim)
                .filter(id -> !id.isEmpty())
                .forEach(ids::add);
        return ids;
    }

    static {
        register(new PlayerResourceDefinition("mana", 2, "mana_bar", 132, 4, player -> player.getData(ModAttachments.CURRENT_MANA.get()), (player, value) -> player.setData(ModAttachments.CURRENT_MANA.get(), value), player -> player.getAttributeValue(ModAttributes.MAX_MANA), player -> player.getAttributeValue(ModAttributes.MANA_REGENERATION)));
        register(new PlayerResourceDefinition("stamina", 0, "stamina_bar", 132, 4, player -> player.getData(ModAttachments.CURRENT_STAMINA.get()), (player, value) -> player.setData(ModAttachments.CURRENT_STAMINA.get(), value), player -> player.getAttributeValue(ModAttributes.MAX_STAMINA), player -> player.getAttributeValue(ModAttributes.STAMINA_REGENERATION)));
        register(new PlayerResourceDefinition("cursed_energy", 0, "cursed_energy_bar", 132, 4, player -> player.getData(ModAttachments.CURRENT_CURSED_ENERGY.get()), (player, value) -> player.setData(ModAttachments.CURRENT_CURSED_ENERGY.get(), value), player -> player.getAttributeValue(ModAttributes.MAX_CURSED_ENERGY), player -> player.getAttributeValue(ModAttributes.CURSED_ENERGY_REGENERATION)));
        // YCS_Player_Resources
    }
}
