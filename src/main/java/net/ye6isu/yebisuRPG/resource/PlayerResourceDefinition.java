package net.ye6isu.yebisuRPG.resource;

import net.minecraft.world.entity.player.Player;

import java.util.function.ObjDoubleConsumer;
import java.util.function.ToDoubleFunction;

/** Server-owned resource state plus the metadata needed by the client HUD. */
public record PlayerResourceDefinition(
        String id,
        int order,
        String barTexture,
        int barTextureWidth,
        int barTextureHeight,
        ToDoubleFunction<Player> currentValue,
        ObjDoubleConsumer<Player> currentValueSetter,
        ToDoubleFunction<Player> maximumValue,
        ToDoubleFunction<Player> regenerationValue
) {
    public PlayerResourceDefinition {
        barTextureWidth = Math.max(1, barTextureWidth);
        barTextureHeight = Math.max(1, barTextureHeight);
    }

    public double current(Player player) {
        return Math.max(0.0, currentValue.applyAsDouble(player));
    }

    public double maximum(Player player) {
        return Math.max(0.0, maximumValue.applyAsDouble(player));
    }

    public double regeneration(Player player) {
        return Math.max(0.0, regenerationValue.applyAsDouble(player));
    }

    public void setCurrent(Player player, double value) {
        currentValueSetter.accept(player, Math.max(0.0, Math.min(maximum(player), value)));
    }
}
