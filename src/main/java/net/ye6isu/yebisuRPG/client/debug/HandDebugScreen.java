package net.ye6isu.yebisuRPG.client.debug;

import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.AbstractSliderButton;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;
import java.util.function.Supplier;

@OnlyIn(Dist.CLIENT)
public class HandDebugScreen extends Screen {

    private static final float R_MIN = -180f, R_MAX = 180f;
    private static final float T_MIN = -3f,   T_MAX = 3f;
    private static final float S_MIN = 0f,    S_MAX = 4f;

    private static final int FIELD_W = 52;
    private static final int GAP     = 4;

    private final List<SliderWithField> rows = new ArrayList<>();

    public HandDebugScreen() {
        super(Component.literal("Leg Debug"));
    }

    @Override public boolean isPauseScreen() { return false; }

    @Override
    public void renderBackground(GuiGraphics g, int mx, int my, float pt) {}

    @Override
    protected void init() {
        HandDebugState.debugMode = true;
        rows.clear();

        int colW    = width / 2 - 20;
        int sliderW = colW - FIELD_W - GAP;
        int col1    = 10, col2 = width / 2 + 10;
        int y = 30, step = 22;

        // ── Translation ──────────────────────────────────────────────────────
        rows.add(addRow(col1, y,        sliderW, "L TX", T_MIN, T_MAX, HandDebugState.leftLegTX,  v -> HandDebugState.leftLegTX  = v, () -> HandDebugState.leftLegTX));
        rows.add(addRow(col1, y+step,   sliderW, "L TY", T_MIN, T_MAX, HandDebugState.leftLegTY,  v -> HandDebugState.leftLegTY  = v, () -> HandDebugState.leftLegTY));
        rows.add(addRow(col1, y+step*2, sliderW, "L TZ", T_MIN, T_MAX, HandDebugState.leftLegTZ,  v -> HandDebugState.leftLegTZ  = v, () -> HandDebugState.leftLegTZ));

        rows.add(addRow(col2, y,        sliderW, "R TX", T_MIN, T_MAX, HandDebugState.rightLegTX, v -> HandDebugState.rightLegTX = v, () -> HandDebugState.rightLegTX));
        rows.add(addRow(col2, y+step,   sliderW, "R TY", T_MIN, T_MAX, HandDebugState.rightLegTY, v -> HandDebugState.rightLegTY = v, () -> HandDebugState.rightLegTY));
        rows.add(addRow(col2, y+step*2, sliderW, "R TZ", T_MIN, T_MAX, HandDebugState.rightLegTZ, v -> HandDebugState.rightLegTZ = v, () -> HandDebugState.rightLegTZ));

        // ── Rotation ─────────────────────────────────────────────────────────
        int ry = y + step * 4;

        rows.add(addRow(col1, ry,        sliderW, "L RX", R_MIN, R_MAX, HandDebugState.leftLegRX,  v -> HandDebugState.leftLegRX  = v, () -> HandDebugState.leftLegRX));
        rows.add(addRow(col1, ry+step,   sliderW, "L RY", R_MIN, R_MAX, HandDebugState.leftLegRY,  v -> HandDebugState.leftLegRY  = v, () -> HandDebugState.leftLegRY));
        rows.add(addRow(col1, ry+step*2, sliderW, "L RZ", R_MIN, R_MAX, HandDebugState.leftLegRZ,  v -> HandDebugState.leftLegRZ  = v, () -> HandDebugState.leftLegRZ));

        rows.add(addRow(col2, ry,        sliderW, "R RX", R_MIN, R_MAX, HandDebugState.rightLegRX, v -> HandDebugState.rightLegRX = v, () -> HandDebugState.rightLegRX));
        rows.add(addRow(col2, ry+step,   sliderW, "R RY", R_MIN, R_MAX, HandDebugState.rightLegRY, v -> HandDebugState.rightLegRY = v, () -> HandDebugState.rightLegRY));
        rows.add(addRow(col2, ry+step*2, sliderW, "R RZ", R_MIN, R_MAX, HandDebugState.rightLegRZ, v -> HandDebugState.rightLegRZ = v, () -> HandDebugState.rightLegRZ));

        // ── Scale ─────────────────────────────────────────────────────────────
        int sy = ry + step * 4;

        rows.add(addRow(col1, sy,        sliderW, "L SX", S_MIN, S_MAX, HandDebugState.leftLegSX,  v -> HandDebugState.leftLegSX  = v, () -> HandDebugState.leftLegSX));
        rows.add(addRow(col1, sy+step,   sliderW, "L SY", S_MIN, S_MAX, HandDebugState.leftLegSY,  v -> HandDebugState.leftLegSY  = v, () -> HandDebugState.leftLegSY));
        rows.add(addRow(col1, sy+step*2, sliderW, "L SZ", S_MIN, S_MAX, HandDebugState.leftLegSZ,  v -> HandDebugState.leftLegSZ  = v, () -> HandDebugState.leftLegSZ));

        rows.add(addRow(col2, sy,        sliderW, "R SX", S_MIN, S_MAX, HandDebugState.rightLegSX, v -> HandDebugState.rightLegSX = v, () -> HandDebugState.rightLegSX));
        rows.add(addRow(col2, sy+step,   sliderW, "R SY", S_MIN, S_MAX, HandDebugState.rightLegSY, v -> HandDebugState.rightLegSY = v, () -> HandDebugState.rightLegSY));
        rows.add(addRow(col2, sy+step*2, sliderW, "R SZ", S_MIN, S_MAX, HandDebugState.rightLegSZ, v -> HandDebugState.rightLegSZ = v, () -> HandDebugState.rightLegSZ));

        addRenderableWidget(Button.builder(Component.literal("Reset"), btn -> resetAll())
            .bounds(width / 2 - 40, height - 30, 80, 20).build());
    }

    private SliderWithField addRow(int x, int y, int sliderW, String label,
                                   float min, float max, float initial,
                                   Consumer<Float> onChange, Supplier<Float> getter) {
        LabeledSlider slider = new LabeledSlider(x, y, sliderW, 20, label, min, max, initial, onChange);
        EditBox field = new EditBox(font, x + sliderW + GAP, y, FIELD_W, 20, Component.empty());
        field.setMaxLength(10);
        field.setValue(fmt(initial));
        field.setResponder(text -> {
            try {
                float v = Float.parseFloat(text.trim());
                v = Math.max(min, Math.min(max, v));
                onChange.accept(v);
                slider.setValueExact(v);
            } catch (NumberFormatException ignored) {}
        });
        addRenderableWidget(slider);
        addRenderableWidget(field);
        return new SliderWithField(slider, field, getter);
    }

    @Override
    public void render(GuiGraphics g, int mx, int my, float pt) {
        for (SliderWithField row : rows) {
            float live = row.getter.get();
            String want = fmt(live);
            if (!row.field.getValue().equals(want) && !row.field.isFocused()) {
                row.field.setValue(want);
            }
        }

        super.render(g, mx, my, pt);

        int c1 = 10, c2 = width / 2 + 10;
        g.drawString(font, "LEFT LEG",  c1, 16,           0xFF00AAFF);
        g.drawString(font, "RIGHT LEG", c2, 16,           0xFFFFAA00);
        g.drawString(font, "LEG ROT",   c1, 16 + 22 * 3,  0xFFAAAAAA);
        g.drawString(font, "LEG ROT",   c2, 16 + 22 * 3,  0xFFAAAAAA);
        g.drawString(font, "LEG SCALE", c1, 16 + 22 * 7,  0xFF88FF88);
        g.drawString(font, "LEG SCALE", c2, 16 + 22 * 7,  0xFF88FF88);

        int by = height - 42;
        g.drawString(font,
            String.format("Left  T: X=%.3f  Y=%.3f  Z=%.3f  R: X=%.2f  Y=%.2f  Z=%.2f  S: X=%.2f  Y=%.2f  Z=%.2f",
                HandDebugState.leftLegTX, HandDebugState.leftLegTY, HandDebugState.leftLegTZ,
                HandDebugState.leftLegRX, HandDebugState.leftLegRY, HandDebugState.leftLegRZ,
                HandDebugState.leftLegSX, HandDebugState.leftLegSY, HandDebugState.leftLegSZ),
            10, by, 0xFF00AAFF);

        g.drawString(font,
            String.format("Right T: X=%.3f  Y=%.3f  Z=%.3f  R: X=%.2f  Y=%.2f  Z=%.2f  S: X=%.2f  Y=%.2f  Z=%.2f",
                HandDebugState.rightLegTX, HandDebugState.rightLegTY, HandDebugState.rightLegTZ,
                HandDebugState.rightLegRX, HandDebugState.rightLegRY, HandDebugState.rightLegRZ,
                HandDebugState.rightLegSX, HandDebugState.rightLegSY, HandDebugState.rightLegSZ),
            10, by + 14, 0xFFFFAA00);
    }

    @Override
    public void onClose() {
        HandDebugState.debugMode = false;
        super.onClose();
    }

    private void resetAll() {
        HandDebugState.rightLegTX = HandDebugState.rightLegTY = HandDebugState.rightLegTZ = 0f;
        HandDebugState.leftLegTX  = HandDebugState.leftLegTY  = HandDebugState.leftLegTZ  = 0f;
        HandDebugState.rightLegRX = HandDebugState.rightLegRY = HandDebugState.rightLegRZ = 0f;
        HandDebugState.leftLegRX  = HandDebugState.leftLegRY  = HandDebugState.leftLegRZ  = 0f;
        HandDebugState.rightLegSX = HandDebugState.rightLegSY = HandDebugState.rightLegSZ = 1f;
        HandDebugState.leftLegSX  = HandDebugState.leftLegSY  = HandDebugState.leftLegSZ  = 1f;
        clearWidgets();
        init();
    }

    private static String fmt(float v) {
        return String.format("%.3f", v);
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

        void setValueExact(float v) {
            this.value = (v - min) / (max - min);
            updateMessage();
        }

        private float currentValue() { return min + (float) value * (max - min); }

        @Override protected void updateMessage() {
            setMessage(Component.literal(String.format("%s: %.3f", label, currentValue())));
        }

        @Override protected void applyValue() { onChange.accept(currentValue()); }
    }

    private record SliderWithField(LabeledSlider slider, EditBox field, Supplier<Float> getter) {}
}
