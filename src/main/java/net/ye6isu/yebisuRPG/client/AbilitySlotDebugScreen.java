package net.ye6isu.yebisuRPG.client;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import net.minecraft.world.entity.player.Player;
import net.ye6isu.yebisuRPG.keybind.AbilitySlotSetPayload;
import net.ye6isu.yebisuRPG.keybind.PlayerAbilities;
import net.ye6isu.yebisuRPG.network.util.NetworkUtils;

import java.util.ArrayList;
import java.util.List;

/** Simple in-game test screen for assigning ability string ids to the local player's slots. */
public final class AbilitySlotDebugScreen extends Screen {

    private final List<EditBox> fields = new ArrayList<>();

    public AbilitySlotDebugScreen() {
        super(Component.literal("Ability Slot Debug"));
    }

    @Override
    protected void init() {
        fields.clear();
        int panelWidth = Math.min(760, this.width - 16);
        int left = (this.width - panelWidth) / 2;
        int top = 36;
        Player player = Minecraft.getInstance().player;

        int columnWidth = panelWidth >= 720 ? 360 : panelWidth;
        addRows(player, left, top, false, 6);
        addRows(player, panelWidth >= 720 ? left + columnWidth : left, panelWidth >= 720 ? top : top + 172, true, 9);
    }

    @Override
    public void render(GuiGraphics graphics, int mouseX, int mouseY, float partialTick) {
        super.render(graphics, mouseX, mouseY, partialTick);
        int panelWidth = Math.min(760, this.width - 16);
        int left = (this.width - panelWidth) / 2;
        int top = 36;
        Player player = Minecraft.getInstance().player;
        int columnWidth = panelWidth >= 720 ? 360 : panelWidth;
        graphics.drawCenteredString(this.font, this.title, this.width / 2, 18, 0xFFFFFFFF);
        renderRows(graphics, player, left, top, false, 6);
        renderRows(graphics, player, panelWidth >= 720 ? left + columnWidth : left, panelWidth >= 720 ? top : top + 172, true, 9);
    }

    private void addRows(Player player, int left, int top, boolean alt, int count) {
        for (int slot = 1; slot <= count; slot++) {
            int y = top + 18 + (slot - 1) * 24;
            int currentSlot = slot;
            EditBox field = new EditBox(this.font, left + 70, y, 150, 20, Component.literal("Ability id"));
            field.setMaxLength(128);
            if (player != null) field.setValue(alt ? PlayerAbilities.getAltSlot(player, slot) : PlayerAbilities.getSlot(player, slot));
            fields.add(field);
            addRenderableWidget(field);

            addRenderableWidget(Button.builder(Component.literal("Set"), button ->
                    NetworkUtils.sendToServer(new AbilitySlotSetPayload(currentSlot, alt, field.getValue().trim()))
            ).bounds(left + 226, y, 46, 20).build());

            addRenderableWidget(Button.builder(Component.literal("Clear"), button -> {
                field.setValue("");
                NetworkUtils.sendToServer(new AbilitySlotSetPayload(currentSlot, alt, ""));
            }).bounds(left + 278, y, 58, 20).build());
        }
    }

    private void renderRows(GuiGraphics graphics, Player player, int left, int top, boolean alt, int count) {
        graphics.drawString(this.font, alt ? "Alt Ability Bar" : "Main Ability Bar", left, top, 0xFFFFFFFF, false);
        for (int slot = 1; slot <= count; slot++) {
            int y = top + 18 + (slot - 1) * 24;
            graphics.drawString(this.font, "Slot " + slot, left, y + 6, 0xFFFFFFFF, false);
            String current = player != null ? (alt ? PlayerAbilities.getAltSlot(player, slot) : PlayerAbilities.getSlot(player, slot)) : "";
            graphics.drawString(this.font, "Current: " + (current.isBlank() ? "(empty)" : current), left + 345, y + 6, 0xFFBFBFBF, false);
        }
    }

    @Override
    public boolean isPauseScreen() {
        return false;
    }
}
