package net.ye6isu.yebisuRPG.resource;

import net.minecraft.world.entity.player.Player;

import java.util.function.ObjDoubleConsumer;
import java.util.function.ToDoubleFunction;

/** Server-owned resource state plus the metadata needed by the client HUD. */
public record PlayerResourceDefinition(
        String id,
        int order,
        String filledTexture,
        int filledTextureWidth,
        int filledTextureHeight,
        String emptyTexture,
        int emptyTextureWidth,
        int emptyTextureHeight,
        double regenerationPerSecond,
        ToDoubleFunction<Player> currentValue,
        ObjDoubleConsumer<Player> currentValueSetter,
        ToDoubleFunction<Player> maximumValue
) {
    public PlayerResourceDefinition {
        filledTextureWidth = Math.max(1, filledTextureWidth);
        filledTextureHeight = Math.max(1, filledTextureHeight);
        emptyTextureWidth = Math.max(1, emptyTextureWidth);
        emptyTextureHeight = Math.max(1, emptyTextureHeight);
        regenerationPerSecond = Math.max(0.0, regenerationPerSecond);
    }

    public double current(Player player) {
        return Math.max(0.0, currentValue.applyAsDouble(player));
    }

    public double maximum(Player player) {
        return Math.max(0.0, maximumValue.applyAsDouble(player));
    }

    public void setCurrent(Player player, double value) {
        currentValueSetter.accept(player, Math.max(0.0, Math.min(maximum(player), value)));
    }
}
