package net.ye6isu.yebisuRPG.vfx.client;

import net.minecraft.resources.ResourceLocation;

import java.util.List;

public record VfxDefinition(String id, int durationTicks, List<Plane> planes) {

    public record Plane(
            String id,
            ResourceLocation texture,
            double x,
            double y,
            double z,
            float rotationX,
            float rotationY,
            float rotationZ,
            float scaleX,
            float scaleY,
            float scaleZ,
            float width,
            float height,
            boolean billboard,
            boolean fullBright,
            int color,
            int rows,
            int ticksPerFrame,
            boolean textureLoop,
            int startTick,
            int endTick
    ) {}
}
