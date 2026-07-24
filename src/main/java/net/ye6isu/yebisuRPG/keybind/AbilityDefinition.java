package net.ye6isu.yebisuRPG.keybind;

import java.util.LinkedHashMap;
import java.util.Map;

/** Static YCS ability metadata. Runtime per-player state lives in player attachments. */
public record AbilityDefinition(String id, String icon, double cooldownSeconds, Map<String, Double> resourceCosts) {

    public AbilityDefinition {
        if (id == null || id.isBlank()) throw new IllegalArgumentException("Ability id is required");
        icon = icon != null ? icon : "";
        cooldownSeconds = Math.max(0.0, cooldownSeconds);
        Map<String, Double> normalizedCosts = new LinkedHashMap<>();
        if (resourceCosts != null) {
            resourceCosts.forEach((resourceId, cost) -> {
                if (resourceId != null && !resourceId.isBlank() && cost != null && cost > 0.0) {
                    normalizedCosts.put(resourceId, cost);
                }
            });
        }
        resourceCosts = Map.copyOf(normalizedCosts);
    }

    public int cooldownTicks() {
        return (int) Math.ceil(cooldownSeconds * 20.0);
    }
}
