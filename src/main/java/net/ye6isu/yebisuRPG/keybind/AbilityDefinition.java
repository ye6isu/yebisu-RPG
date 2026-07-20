package net.ye6isu.yebisuRPG.keybind;

/** Static YCS ability metadata. Runtime per-player state lives in player attachments. */
public record AbilityDefinition(String id, String icon, double cooldownSeconds) {

    public AbilityDefinition {
        if (id == null || id.isBlank()) throw new IllegalArgumentException("Ability id is required");
        icon = icon != null ? icon : "";
        cooldownSeconds = Math.max(0.0, cooldownSeconds);
    }

    public int cooldownTicks() {
        return (int) Math.ceil(cooldownSeconds * 20.0);
    }
}
