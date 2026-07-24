package net.ye6isu.yebisuRPG.resource;

import net.minecraft.world.entity.ai.attributes.RangedAttribute;
import net.minecraft.world.entity.player.Player;
import net.ye6isu.yebisuRPG.attribute.ModAttributes;
import net.ye6isu.yebisuRPG.entityvar.ModAttachments;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/** Common resource registry used by server gameplay and client HUD rendering. */
public final class PlayerResourceRegistry {

    private static final List<PlayerResourceDefinition> DEFINITIONS = new ArrayList<>();

    private PlayerResourceRegistry() {}

    private static void register(PlayerResourceDefinition definition) {
        DEFINITIONS.add(definition);
    }

    public static List<PlayerResourceDefinition> all() {
        return DEFINITIONS.stream()
                .sorted(Comparator.comparingInt(PlayerResourceDefinition::order).thenComparing(PlayerResourceDefinition::id))
                .toList();
    }

    public static PlayerResourceDefinition get(String id) {
        if (id == null || id.isBlank()) return null;
        return DEFINITIONS.stream().filter(definition -> id.equals(definition.id())).findFirst().orElse(null);
    }

    public static boolean tryConsume(Player player, Map<String, Double> costs) {
        if (costs == null || costs.isEmpty()) return true;
        for (Map.Entry<String, Double> entry : costs.entrySet()) {
            double cost = Math.max(0.0, entry.getValue());
            PlayerResourceDefinition definition = get(entry.getKey());
            if (cost > 0.0 && (definition == null || definition.current(player) < cost)) return false;
        }
        for (Map.Entry<String, Double> entry : costs.entrySet()) {
            double cost = Math.max(0.0, entry.getValue());
            PlayerResourceDefinition definition = get(entry.getKey());
            if (cost > 0.0 && definition != null) definition.setCurrent(player, definition.current(player) - cost);
        }
        return true;
    }

    public static void regenerate(Player player) {
        for (PlayerResourceDefinition definition : DEFINITIONS) {
            if (definition.regenerationPerSecond() > 0.0) {
                definition.setCurrent(player, definition.current(player) + definition.regenerationPerSecond());
            }
        }
    }

    static {
        register(new PlayerResourceDefinition("stamina", 0, "stamina", 9, 9, "stamina_empty", 9, 9, 2, player -> player.getData(ModAttachments.STAMINA.get()), (player, value) -> player.setData(ModAttachments.STAMINA.get(), value), player -> ((RangedAttribute) ModAttributes.STAMINA.get()).getMaxValue()));
        register(new PlayerResourceDefinition("mana", 1, "mana", 18, 18, "mana_empty", 18, 18, 1, player -> player.getData(ModAttachments.MANA.get()), (player, value) -> player.setData(ModAttachments.MANA.get(), value), player -> ((RangedAttribute) ModAttributes.MANA.get()).getMaxValue()));
        register(new PlayerResourceDefinition("cursed", 0, "curseaad", 12, 12, "curseadddad", 12, 12, 1.5, player -> player.getData(ModAttachments.CURSED.get()), (player, value) -> player.setData(ModAttachments.CURSED.get(), value), player -> ((RangedAttribute) ModAttributes.CURSED.get()).getMaxValue()));
        // YCS_Player_Resources
    }
}
