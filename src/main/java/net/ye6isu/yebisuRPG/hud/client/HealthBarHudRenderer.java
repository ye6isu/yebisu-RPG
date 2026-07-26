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
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.util.Locale;

@OnlyIn(Dist.CLIENT)
public final class HealthBarHudRenderer implements LayeredDraw.Layer {
    private static final ResourceLocation FRAME_TEXTURE = ResourceLocation.fromNamespaceAndPath(
            yebisuRPG.MODID, "textures/hud/hp_bar_frame.png");
    private static final ResourceLocation FILL_TEXTURE = ResourceLocation.fromNamespaceAndPath(
            yebisuRPG.MODID, "textures/hud/hp_bar.png");

    private static final int FRAME_WIDTH = 182;
    private static final int FRAME_HEIGHT = 10;
    private static final int FILL_WIDTH = 176;
    private static final int FILL_HEIGHT = 4;
    private static final int XP_BAR_BOTTOM_OFFSET = 29;
    private static final float FILL_LERP_STRENGTH = 0.25F;

    private Player trackedPlayer;
    private float displayedHealthFraction = Float.NaN;

    public static boolean isActive() {
        Minecraft minecraft = Minecraft.getInstance();
        return minecraft.player != null
                && minecraft.gameMode != null
                && minecraft.gameMode.canHurtPlayer();
    }

    @Override
    public void render(GuiGraphics graphics, DeltaTracker deltaTracker) {
        Minecraft minecraft = Minecraft.getInstance();
        Player player = minecraft.player;
        if (player == null || minecraft.options.hideGui || !isActive()) return;

        int frameX = graphics.guiWidth() / 2 - FRAME_WIDTH / 2;
        int frameY = graphics.guiHeight() - XP_BAR_BOTTOM_OFFSET - FRAME_HEIGHT;
        int fillX = frameX + (FRAME_WIDTH - FILL_WIDTH) / 2;
        int fillY = frameY + (FRAME_HEIGHT - FILL_HEIGHT) / 2;

        float maxHealth = Math.max(1.0F, player.getMaxHealth());
        float health = Math.max(0.0F, Math.min(player.getHealth(), maxHealth));
        float targetHealthFraction = health / maxHealth;
        if (trackedPlayer != player || Float.isNaN(displayedHealthFraction)) {
            trackedPlayer = player;
            displayedHealthFraction = targetHealthFraction;
        } else {
            displayedHealthFraction += (targetHealthFraction - displayedHealthFraction) * FILL_LERP_STRENGTH;
            if (Math.abs(displayedHealthFraction - targetHealthFraction) < 0.0005F) {
                displayedHealthFraction = targetHealthFraction;
            }
        }
        int filledWidth = Math.round(FILL_WIDTH * displayedHealthFraction);

        RenderSystem.enableBlend();
        RenderSystem.defaultBlendFunc();
        graphics.blit(FRAME_TEXTURE, frameX, frameY, FRAME_WIDTH, FRAME_HEIGHT,
                0.0F, 0.0F, FRAME_WIDTH, FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT);
        if (filledWidth > 0) {
            graphics.blit(FILL_TEXTURE, fillX, fillY, filledWidth, FILL_HEIGHT,
                    0.0F, 0.0F, filledWidth, FILL_HEIGHT, FILL_WIDTH, FILL_HEIGHT);
        }

        String healthText = formatHealth(health) + "/" + formatHealth(maxHealth);
        int textX = frameX + (FRAME_WIDTH - minecraft.font.width(healthText)) / 2;
        int textY = frameY + (FRAME_HEIGHT - minecraft.font.lineHeight) / 2 + 1;
        graphics.drawString(minecraft.font, healthText, textX, textY, 0xFFFFFFFF, true);
    }

    private static String formatHealth(float value) {
        float rounded = Math.round(value);
        if (Math.abs(value - rounded) < 0.01F) return String.valueOf((int) rounded);
        return String.format(Locale.ROOT, "%.1f", value);
    }
}
