package net.ye6isu.yebisuRPG.client.debug;

import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.AbstractSliderButton;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

import java.util.function.Consumer;

@OnlyIn(Dist.CLIENT)
public class HandDebugScreen extends Screen {

    private static final float R_MIN = -180f, R_MAX = 180f;
    private static final float T_MIN = -3f,   T_MAX = 3f;

    public HandDebugScreen() {
        super(Component.literal("Hand Debug"));
    }

    @Override public boolean isPauseScreen() { return false; }

    @Override
    public void renderBackground(GuiGraphics g, int mx, int my, float pt) {
        // No background — keep world visible.
    }

    @Override
    protected void init() {
        HandDebugState.debugMode = true;

        int col1 = 10, col2 = width / 2 + 10;
        int y = 30, step = 22;
        int sw = width / 2 - 20;

        // Shared translation (top of left column)
        addSlider(col1, y,          sw, "TX", T_MIN, T_MAX, HandDebugState.tx,  v -> HandDebugState.tx  = v);
        addSlider(col1, y+step,     sw, "TY", T_MIN, T_MAX, HandDebugState.ty,  v -> HandDebugState.ty  = v);
        addSlider(col1, y+step*2,   sw, "TZ", T_MIN, T_MAX, HandDebugState.tz,  v -> HandDebugState.tz  = v);

        int ry = y + step * 4;

        // Left arm rotation (left column)
        addSlider(col1, ry,         sw, "L RX", R_MIN, R_MAX, HandDebugState.leftRX,  v -> HandDebugState.leftRX  = v);
        addSlider(col1, ry+step,    sw, "L RY", R_MIN, R_MAX, HandDebugState.leftRY,  v -> HandDebugState.leftRY  = v);
        addSlider(col1, ry+step*2,  sw, "L RZ", R_MIN, R_MAX, HandDebugState.leftRZ,  v -> HandDebugState.leftRZ  = v);

        // Right arm rotation (right column)
        addSlider(col2, ry,         sw, "R RX", R_MIN, R_MAX, HandDebugState.rightRX, v -> HandDebugState.rightRX = v);
        addSlider(col2, ry+step,    sw, "R RY", R_MIN, R_MAX, HandDebugState.rightRY, v -> HandDebugState.rightRY = v);
        addSlider(col2, ry+step*2,  sw, "R RZ", R_MIN, R_MAX, HandDebugState.rightRZ, v -> HandDebugState.rightRZ = v);

        addRenderableWidget(Button.builder(Component.literal("Reset"), btn -> resetAll())
            .bounds(width / 2 - 40, height - 30, 80, 20).build());
    }

    @Override
    public void render(GuiGraphics g, int mx, int my, float pt) {
        super.render(g, mx, my, pt);

        g.drawString(font, "TRANSLATE",  10, 16, 0xFFAAAAAA);
        g.drawString(font, "LEFT ARM",  10,  16 + 22*4, 0xFF00AAFF);
        g.drawString(font, "RIGHT ARM", width / 2 + 10, 16 + 22*4, 0xFFFFAA00);

        int by = height - 52;
        g.drawString(font,
            String.format("T:  X=%.2f  Y=%.2f  Z=%.2f",
                HandDebugState.tx, HandDebugState.ty, HandDebugState.tz),
            10, by, 0xFFAAAAAA);
        g.drawString(font,
            String.format("Left:  RX=%.1f  RY=%.1f  RZ=%.1f",
                HandDebugState.leftRX, HandDebugState.leftRY, HandDebugState.leftRZ),
            10, by + 12, 0xFF00AAFF);
        g.drawString(font,
            String.format("Right: RX=%.1f  RY=%.1f  RZ=%.1f",
                HandDebugState.rightRX, HandDebugState.rightRY, HandDebugState.rightRZ),
            10, by + 24, 0xFFFFAA00);
    }

    @Override
    public void onClose() {
        HandDebugState.debugMode = false;
        super.onClose();
    }

    private void addSlider(int x, int y, int w, String label, float min, float max,
                           float initial, Consumer<Float> onChange) {
        addRenderableWidget(new LabeledSlider(x, y, w, 20, label, min, max, initial, onChange));
    }

    private void resetAll() {
        HandDebugState.tx = 0f; HandDebugState.ty = 0f; HandDebugState.tz = 0f;
        HandDebugState.rightRX = HandDebugState.rightRY = HandDebugState.rightRZ = 0f;
        HandDebugState.leftRX  = HandDebugState.leftRY  = HandDebugState.leftRZ  = 0f;
        clearWidgets();
        init();
    }

    private static class LabeledSlider extends AbstractSliderButton {
        private final String label;
        private final float min, max;
        private final Consumer<Float> onChange;

        LabeledSlider(int x, int y, int w, int h, String label, float min, float max,
                      float initial, Consumer<Float> onChange) {
            super(x, y, w, h, Component.empty(), (initial - min) / (max - min));
            this.label    = label;
            this.min      = min;
            this.max      = max;
            this.onChange = onChange;
            updateMessage();
        }

        private float currentValue() { return min + (float) value * (max - min); }

        @Override protected void updateMessage() {
            setMessage(Component.literal(String.format("%s: %.2f", label, currentValue())));
        }

        @Override protected void applyValue() { onChange.accept(currentValue()); }
    }
}
