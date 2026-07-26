package net.ye6isu.yebisuRPG.hud.client;

import com.mojang.blaze3d.systems.RenderSystem;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.LayeredDraw;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.player.Player;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.resource.PlayerResourceDefinition;
import net.ye6isu.yebisuRPG.resource.PlayerResourceRegistry;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@OnlyIn(Dist.CLIENT)
public final class ResourceBarHudRenderer implements LayeredDraw.Layer {
    private static final ResourceLocation FRAME_TEXTURE = ResourceLocation.fromNamespaceAndPath(
            yebisuRPG.MODID, "textures/hud/resource_bar.png");
    private static final ResourceLocation BACKING_TOP_TEXTURE = ResourceLocation.fromNamespaceAndPath(
            yebisuRPG.MODID, "textures/hud/top_resource_bar.png");
    private static final ResourceLocation BACKING_MIDDLE_TEXTURE = ResourceLocation.fromNamespaceAndPath(
            yebisuRPG.MODID, "textures/hud/mid_resource_bar.png");
    private static final ResourceLocation BACKING_BOTTOM_TEXTURE = ResourceLocation.fromNamespaceAndPath(
            yebisuRPG.MODID, "textures/hud/bottom_resource_bar.png");

    private static final int FRAME_WIDTH = 137;
    private static final int FRAME_HEIGHT = 10;
    private static final int FILL_WIDTH = 132;
    private static final int FILL_HEIGHT = 4;
    private static final int BACKING_WIDTH = 12;
    private static final int BACKING_CAP_HEIGHT = 5;
    private static final int LEFT_OFFSET = 1;
    private static final int BOTTOM_OFFSET = 3;
    private static final int BAR_GAP = 1;
    private static final float FILL_LERP_STRENGTH = 0.25F;

    private final Map<String, Float> displayedFractions = new HashMap<>();
    private Player trackedPlayer;

    @Override
    public void render(GuiGraphics graphics, DeltaTracker deltaTracker) {
        Minecraft minecraft = Minecraft.getInstance();
        Player player = minecraft.player;
        if (player == null || minecraft.options.hideGui || !HealthBarHudRenderer.isActive()) return;

        if (trackedPlayer != player) {
            trackedPlayer = player;
            displayedFractions.clear();
        }

        var resources = PlayerResourceRegistry.availableTo(player);
        if (resources.isEmpty()) return;

        int topFrameY = graphics.guiHeight() - BOTTOM_OFFSET - FRAME_HEIGHT
                - (resources.size() - 1) * (FRAME_HEIGHT + BAR_GAP);
        renderBacking(graphics, topFrameY - 3);

        int row = 0;
        for (PlayerResourceDefinition resource : resources) {
            int frameY = graphics.guiHeight() - BOTTOM_OFFSET - FRAME_HEIGHT
                    - row * (FRAME_HEIGHT + BAR_GAP);
            renderResourceBar(graphics, player, resource, LEFT_OFFSET, frameY);
            row++;
        }
    }

    private static void renderBacking(GuiGraphics graphics, int topY) {
        int bottomY = graphics.guiHeight() - BACKING_CAP_HEIGHT;
        int middleY = topY + BACKING_CAP_HEIGHT;
        int middleHeight = Math.max(0, bottomY - middleY);

        RenderSystem.enableBlend();
        RenderSystem.defaultBlendFunc();
        graphics.blit(BACKING_TOP_TEXTURE, 0, topY, BACKING_WIDTH, BACKING_CAP_HEIGHT,
                0.0F, 0.0F, BACKING_WIDTH, BACKING_CAP_HEIGHT, BACKING_WIDTH, BACKING_CAP_HEIGHT);
        if (middleHeight > 0) {
            graphics.blit(BACKING_MIDDLE_TEXTURE, 0, middleY, BACKING_WIDTH, middleHeight,
                    0.0F, 0.0F, BACKING_WIDTH, 1, BACKING_WIDTH, 1);
        }
        graphics.blit(BACKING_BOTTOM_TEXTURE, 0, bottomY, BACKING_WIDTH, BACKING_CAP_HEIGHT,
                0.0F, 0.0F, BACKING_WIDTH, BACKING_CAP_HEIGHT, BACKING_WIDTH, BACKING_CAP_HEIGHT);
    }

    private void renderResourceBar(GuiGraphics graphics, Player player,
                                   PlayerResourceDefinition resource, int frameX, int frameY) {
        double maximum = Math.max(1.0, resource.maximum(player));
        double current = Math.max(0.0, Math.min(resource.current(player), maximum));
        float targetFraction = (float) (current / maximum);
        float displayedFraction = displayedFractions.getOrDefault(resource.id(), targetFraction);
        displayedFraction += (targetFraction - displayedFraction) * FILL_LERP_STRENGTH;
        if (Math.abs(displayedFraction - targetFraction) < 0.0005F) displayedFraction = targetFraction;
        displayedFractions.put(resource.id(), displayedFraction);

        int fillX = frameX + (FRAME_WIDTH - FILL_WIDTH) / 2;
        int fillY = frameY + (FRAME_HEIGHT - FILL_HEIGHT) / 2;
        int filledWidth = Math.round(FILL_WIDTH * displayedFraction);
        int sourceFilledWidth = Math.max(1, Math.round(resource.barTextureWidth() * displayedFraction));
        ResourceLocation fillTexture = ResourceLocation.fromNamespaceAndPath(
                yebisuRPG.MODID, "textures/hud/" + resource.barTexture() + ".png");

        RenderSystem.enableBlend();
        RenderSystem.defaultBlendFunc();
        graphics.blit(FRAME_TEXTURE, frameX, frameY, FRAME_WIDTH, FRAME_HEIGHT,
                0.0F, 0.0F, FRAME_WIDTH, FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT);
        if (filledWidth > 0) {
            graphics.blit(fillTexture, fillX, fillY, filledWidth, FILL_HEIGHT,
                    0.0F, 0.0F, sourceFilledWidth, resource.barTextureHeight(),
                    resource.barTextureWidth(), resource.barTextureHeight());
        }

        String text = formatValue(current) + "/" + formatValue(maximum);
        var font = Minecraft.getInstance().font;
        int textX = frameX + (FRAME_WIDTH - font.width(text)) / 2;
        int textY = frameY + (FRAME_HEIGHT - font.lineHeight) / 2 + 1;
        graphics.drawString(font, text, textX, textY, 0xFFFFFFFF, true);
    }

    private static String formatValue(double value) {
        long rounded = Math.round(value);
        if (Math.abs(value - rounded) < 0.01) return String.valueOf(rounded);
        return String.format(Locale.ROOT, "%.1f", value);
    }
}
