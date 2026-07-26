package net.ye6isu.yebisuRPG.hud.client;

import com.mojang.blaze3d.systems.RenderSystem;
import com.mojang.math.Axis;
import net.minecraft.client.AttackIndicatorStatus;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.LayeredDraw;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.GameType;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.keybind.client.AbilityBarClientState;

@OnlyIn(Dist.CLIENT)
public final class VerticalHotbarRenderer implements LayeredDraw.Layer {
    private static final ResourceLocation HOTBAR_SPRITE = ResourceLocation.withDefaultNamespace("hud/hotbar");
    private static final ResourceLocation SELECTION_SPRITE = ResourceLocation.withDefaultNamespace("hud/hotbar_selection");
    private static final ResourceLocation OFFHAND_SPRITE = ResourceLocation.withDefaultNamespace("hud/hotbar_offhand_right");
    private static final ResourceLocation ATTACK_BACKGROUND_SPRITE = ResourceLocation.withDefaultNamespace(
            "hud/hotbar_attack_indicator_background");
    private static final ResourceLocation ATTACK_PROGRESS_SPRITE = ResourceLocation.withDefaultNamespace(
            "hud/hotbar_attack_indicator_progress");

    private static final int HOTBAR_WIDTH = 22;
    private static final int HOTBAR_HEIGHT = 182;
    private static final int SLOT_SPACING = 20;

    private final LayeredDraw.Layer vanillaLayer;

    public VerticalHotbarRenderer(LayeredDraw.Layer vanillaLayer) {
        this.vanillaLayer = vanillaLayer;
    }

    @Override
    public void render(GuiGraphics graphics, DeltaTracker deltaTracker) {
        Minecraft minecraft = Minecraft.getInstance();
        Player player = minecraft.player;
        if (player == null || minecraft.gameMode == null) return;
        if (minecraft.gameMode.getPlayerMode() == GameType.SPECTATOR
                || !AbilityBarClientState.isAltBarActive()) {
            vanillaLayer.render(graphics, deltaTracker);
            return;
        }

        int hotbarX = graphics.guiWidth() - HOTBAR_WIDTH;
        int hotbarY = (graphics.guiHeight() - HOTBAR_HEIGHT) / 2;

        RenderSystem.enableBlend();
        graphics.pose().pushPose();
        try {
            graphics.pose().translate(hotbarX + HOTBAR_WIDTH, hotbarY, -90.0F);
            graphics.pose().mulPose(Axis.ZP.rotationDegrees(90.0F));
            graphics.blitSprite(HOTBAR_SPRITE, 0, 0, HOTBAR_HEIGHT, HOTBAR_WIDTH);
        } finally {
            graphics.pose().popPose();
        }

        int selected = player.getInventory().selected;
        int selectionX = hotbarX - 1;
        int selectionY = hotbarY - 1 + selected * SLOT_SPACING;
        graphics.pose().pushPose();
        try {
            graphics.pose().translate(selectionX, selectionY + 24, -90.0F);
            graphics.pose().mulPose(Axis.ZP.rotationDegrees(-90.0F));
            graphics.blitSprite(SELECTION_SPRITE, 0, 0, 24, 23);
        } finally {
            graphics.pose().popPose();
        }
        RenderSystem.disableBlend();

        int seed = 1;
        for (int slot = 0; slot < 9; slot++) {
            renderSlot(graphics, hotbarX + 3, hotbarY + 3 + slot * SLOT_SPACING,
                    deltaTracker, player, player.getInventory().getItem(slot), seed++);
        }

        ItemStack offhand = player.getOffhandItem();
        if (!offhand.isEmpty()) {
            int offhandX = hotbarX - 7;
            int offhandY = hotbarY - 31;
            RenderSystem.enableBlend();
            graphics.blitSprite(OFFHAND_SPRITE, offhandX, offhandY, 29, 24);
            RenderSystem.disableBlend();
            renderSlot(graphics, offhandX + 10, offhandY + 4, deltaTracker, player, offhand, seed);
        }

        if (minecraft.options.attackIndicator().get() == AttackIndicatorStatus.HOTBAR) {
            float strength = player.getAttackStrengthScale(0.0F);
            if (strength < 1.0F) {
                int indicatorX = hotbarX - 20;
                int indicatorY = hotbarY + 2;
                int progress = (int) (strength * 19.0F);
                RenderSystem.enableBlend();
                graphics.blitSprite(ATTACK_BACKGROUND_SPRITE, indicatorX, indicatorY, 18, 18);
                graphics.blitSprite(ATTACK_PROGRESS_SPRITE, 18, 18, 0, 18 - progress,
                        indicatorX, indicatorY + 18 - progress, 18, progress);
                RenderSystem.disableBlend();
            }
        }
    }

    private static void renderSlot(GuiGraphics graphics, int x, int y, DeltaTracker deltaTracker,
                                   Player player, ItemStack stack, int seed) {
        if (stack.isEmpty()) return;

        float popTime = stack.getPopTime() - deltaTracker.getGameTimeDeltaPartialTick(false);
        if (popTime > 0.0F) {
            float scale = 1.0F + popTime / 5.0F;
            graphics.pose().pushPose();
            graphics.pose().translate(x + 8.0F, y + 12.0F, 0.0F);
            graphics.pose().scale(1.0F / scale, (scale + 1.0F) / 2.0F, 1.0F);
            graphics.pose().translate(-(x + 8.0F), -(y + 12.0F), 0.0F);
        }

        graphics.renderItem(player, stack, x, y, seed);
        if (popTime > 0.0F) graphics.pose().popPose();
        graphics.renderItemDecorations(Minecraft.getInstance().font, stack, x, y);
    }
}
