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

    // Slider width + gap + text-field width = column width
    private static final int FIELD_W = 52;
    private static final int GAP     = 4;

    // Keep references so we can sync slider↔field on reset
    private final List<SliderWithField> rows = new ArrayList<>();

    public HandDebugScreen() {
        super(Component.literal("Hand Debug"));
    }

    @Override public boolean isPauseScreen() { return false; }

    @Override
    public void renderBackground(GuiGraphics g, int mx, int my, float pt) {}

    @Override
    protected void init() {
        HandDebugState.debugMode = true;
        rows.clear();

        int colW  = width / 2 - 20;
        int sliderW = colW - FIELD_W - GAP;
        int col1  = 10, col2 = width / 2 + 10;
        int y = 30, step = 22;

        // ── Translation rows ─────────────────────────────────────────────
        rows.add(addRow(col1, y,        sliderW, "L TX", T_MIN, T_MAX, HandDebugState.leftTX,  v -> HandDebugState.leftTX  = v, () -> HandDebugState.leftTX));
        rows.add(addRow(col1, y+step,   sliderW, "L TY", T_MIN, T_MAX, HandDebugState.leftTY,  v -> HandDebugState.leftTY  = v, () -> HandDebugState.leftTY));
        rows.add(addRow(col1, y+step*2, sliderW, "L TZ", T_MIN, T_MAX, HandDebugState.leftTZ,  v -> HandDebugState.leftTZ  = v, () -> HandDebugState.leftTZ));

        rows.add(addRow(col2, y,        sliderW, "R TX", T_MIN, T_MAX, HandDebugState.rightTX, v -> HandDebugState.rightTX = v, () -> HandDebugState.rightTX));
        rows.add(addRow(col2, y+step,   sliderW, "R TY", T_MIN, T_MAX, HandDebugState.rightTY, v -> HandDebugState.rightTY = v, () -> HandDebugState.rightTY));
        rows.add(addRow(col2, y+step*2, sliderW, "R TZ", T_MIN, T_MAX, HandDebugState.rightTZ, v -> HandDebugState.rightTZ = v, () -> HandDebugState.rightTZ));

        // ── Rotation rows ────────────────────────────────────────────────
        int ry = y + step * 4;

        rows.add(addRow(col1, ry,        sliderW, "L RX", R_MIN, R_MAX, HandDebugState.leftRX,  v -> HandDebugState.leftRX  = v, () -> HandDebugState.leftRX));
        rows.add(addRow(col1, ry+step,   sliderW, "L RY", R_MIN, R_MAX, HandDebugState.leftRY,  v -> HandDebugState.leftRY  = v, () -> HandDebugState.leftRY));
        rows.add(addRow(col1, ry+step*2, sliderW, "L RZ", R_MIN, R_MAX, HandDebugState.leftRZ,  v -> HandDebugState.leftRZ  = v, () -> HandDebugState.leftRZ));

        rows.add(addRow(col2, ry,        sliderW, "R RX", R_MIN, R_MAX, HandDebugState.rightRX, v -> HandDebugState.rightRX = v, () -> HandDebugState.rightRX));
        rows.add(addRow(col2, ry+step,   sliderW, "R RY", R_MIN, R_MAX, HandDebugState.rightRY, v -> HandDebugState.rightRY = v, () -> HandDebugState.rightRY));
        rows.add(addRow(col2, ry+step*2, sliderW, "R RZ", R_MIN, R_MAX, HandDebugState.rightRZ, v -> HandDebugState.rightRZ = v, () -> HandDebugState.rightRZ));

        // ── Item translation rows ────────────────────────────────────────────
        int iy = ry + step * 4;

        rows.add(addRow(col1, iy,        sliderW, "L ITX", T_MIN, T_MAX, HandDebugState.leftITX,  v -> HandDebugState.leftITX  = v, () -> HandDebugState.leftITX));
        rows.add(addRow(col1, iy+step,   sliderW, "L ITY", T_MIN, T_MAX, HandDebugState.leftITY,  v -> HandDebugState.leftITY  = v, () -> HandDebugState.leftITY));
        rows.add(addRow(col1, iy+step*2, sliderW, "L ITZ", T_MIN, T_MAX, HandDebugState.leftITZ,  v -> HandDebugState.leftITZ  = v, () -> HandDebugState.leftITZ));

        rows.add(addRow(col2, iy,        sliderW, "R ITX", T_MIN, T_MAX, HandDebugState.rightITX, v -> HandDebugState.rightITX = v, () -> HandDebugState.rightITX));
        rows.add(addRow(col2, iy+step,   sliderW, "R ITY", T_MIN, T_MAX, HandDebugState.rightITY, v -> HandDebugState.rightITY = v, () -> HandDebugState.rightITY));
        rows.add(addRow(col2, iy+step*2, sliderW, "R ITZ", T_MIN, T_MAX, HandDebugState.rightITZ, v -> HandDebugState.rightITZ = v, () -> HandDebugState.rightITZ));

        // ── Item rotation rows ───────────────────────────────────────────────
        int irY = iy + step * 4;

        rows.add(addRow(col1, irY,        sliderW, "L IRX", R_MIN, R_MAX, HandDebugState.leftIRX,  v -> HandDebugState.leftIRX  = v, () -> HandDebugState.leftIRX));
        rows.add(addRow(col1, irY+step,   sliderW, "L IRY", R_MIN, R_MAX, HandDebugState.leftIRY,  v -> HandDebugState.leftIRY  = v, () -> HandDebugState.leftIRY));
        rows.add(addRow(col1, irY+step*2, sliderW, "L IRZ", R_MIN, R_MAX, HandDebugState.leftIRZ,  v -> HandDebugState.leftIRZ  = v, () -> HandDebugState.leftIRZ));

        rows.add(addRow(col2, irY,        sliderW, "R IRX", R_MIN, R_MAX, HandDebugState.rightIRX, v -> HandDebugState.rightIRX = v, () -> HandDebugState.rightIRX));
        rows.add(addRow(col2, irY+step,   sliderW, "R IRY", R_MIN, R_MAX, HandDebugState.rightIRY, v -> HandDebugState.rightIRY = v, () -> HandDebugState.rightIRY));
        rows.add(addRow(col2, irY+step*2, sliderW, "R IRZ", R_MIN, R_MAX, HandDebugState.rightIRZ, v -> HandDebugState.rightIRZ = v, () -> HandDebugState.rightIRZ));

        // ── Debug square (right hand) ────────────────────────────────────────
        int sqY = 30;
        int col3 = width * 3 / 4 - colW / 2;
        rows.add(addRow(col3, sqY,        sliderW, "SQ TX", T_MIN, T_MAX, HandDebugState.squareTX, v -> HandDebugState.squareTX = v, () -> HandDebugState.squareTX));
        rows.add(addRow(col3, sqY+step,   sliderW, "SQ TY", T_MIN, T_MAX, HandDebugState.squareTY, v -> HandDebugState.squareTY = v, () -> HandDebugState.squareTY));
        rows.add(addRow(col3, sqY+step*2, sliderW, "SQ TZ", T_MIN, T_MAX, HandDebugState.squareTZ, v -> HandDebugState.squareTZ = v, () -> HandDebugState.squareTZ));
        rows.add(addRow(col3, sqY+step*4, sliderW, "SQ RX", R_MIN, R_MAX, HandDebugState.squareRX, v -> HandDebugState.squareRX = v, () -> HandDebugState.squareRX));
        rows.add(addRow(col3, sqY+step*5, sliderW, "SQ RY", R_MIN, R_MAX, HandDebugState.squareRY, v -> HandDebugState.squareRY = v, () -> HandDebugState.squareRY));
        rows.add(addRow(col3, sqY+step*6, sliderW, "SQ RZ", R_MIN, R_MAX, HandDebugState.squareRZ, v -> HandDebugState.squareRZ = v, () -> HandDebugState.squareRZ));

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
        // Sync fields from live state each frame (handles slider drags updating the field).
        for (SliderWithField row : rows) {
            float live = row.getter.get();
            String want = fmt(live);
            if (!row.field.getValue().equals(want) && !row.field.isFocused()) {
                row.field.setValue(want);
            }
        }

        super.render(g, mx, my, pt);

        int c1 = 10, c2 = width / 2 + 10;
        g.drawString(font, "LEFT ARM",    c1, 16,           0xFF00AAFF);
        g.drawString(font, "RIGHT ARM",   c2, 16,           0xFFFFAA00);
        g.drawString(font, "ARM ROT",     c1, 16 + 22 * 3,  0xFFAAAAAA);
        g.drawString(font, "ARM ROT",     c2, 16 + 22 * 3,  0xFFAAAAAA);
        int c3 = width * 3 / 4 - (width / 2 - 20) / 2;
        g.drawString(font, "SQ OFFSET",   c3, 16,           0xFFFF44FF);
        g.drawString(font, "SQ ROTATION", c3, 16 + 22 * 3,  0xFFAAAAAA);
        g.drawString(font, "LEFT ITEM",   c1, 16 + 22 * 7,  0xFF00FF88);
        g.drawString(font, "RIGHT ITEM",  c2, 16 + 22 * 7,  0xFFFFCC44);
        g.drawString(font, "ITEM ROT",    c1, 16 + 22 * 11, 0xFFAAAAAA);
        g.drawString(font, "ITEM ROT",    c2, 16 + 22 * 11, 0xFFAAAAAA);

        // ── Live readout ─────────────────────────────────────────────────
        int by = height - 64;
        g.drawString(font, "--- Absolute (BASE + delta) ---", 10, by, 0xFF888888);

        g.drawString(font,
            String.format("Left  T: X=%.3f  Y=%.3f  Z=%.3f  |  R: X=%.2f  Y=%.2f  Z=%.2f",
                HandDebugState.BASE_LEFT_TX  + HandDebugState.leftTX,
                HandDebugState.BASE_LEFT_TY  + HandDebugState.leftTY,
                HandDebugState.BASE_LEFT_TZ  + HandDebugState.leftTZ,
                HandDebugState.BASE_LEFT_RX  + HandDebugState.leftRX,
                HandDebugState.leftRY, HandDebugState.leftRZ),
            10, by + 14, 0xFF00AAFF);

        g.drawString(font,
            String.format("Right T: X=%.3f  Y=%.3f  Z=%.3f  |  R: X=%.2f  Y=%.2f  Z=%.2f",
                HandDebugState.BASE_RIGHT_TX + HandDebugState.rightTX,
                HandDebugState.BASE_RIGHT_TY + HandDebugState.rightTY,
                HandDebugState.BASE_RIGHT_TZ + HandDebugState.rightTZ,
                HandDebugState.BASE_RIGHT_RX + HandDebugState.rightRX,
                HandDebugState.rightRY, HandDebugState.rightRZ),
            10, by + 28, 0xFFFFAA00);

        g.drawString(font,
            String.format("Left  delta: dTX=%.3f  dTY=%.3f  dTZ=%.3f  dRX=%.2f  dRY=%.2f  dRZ=%.2f",
                HandDebugState.leftTX,  HandDebugState.leftTY,  HandDebugState.leftTZ,
                HandDebugState.leftRX,  HandDebugState.leftRY,  HandDebugState.leftRZ),
            10, by + 44, 0xFF6688AA);

        g.drawString(font,
            String.format("Right delta: dTX=%.3f  dTY=%.3f  dTZ=%.3f  dRX=%.2f  dRY=%.2f  dRZ=%.2f",
                HandDebugState.rightTX, HandDebugState.rightTY, HandDebugState.rightTZ,
                HandDebugState.rightRX, HandDebugState.rightRY, HandDebugState.rightRZ),
            10, by + 56, 0xFFAA8833);
    }

    @Override
    public void onClose() {
        HandDebugState.debugMode = false;
        super.onClose();
    }

    private void resetAll() {
        HandDebugState.rightTX = HandDebugState.rightTY = HandDebugState.rightTZ = 0f;
        HandDebugState.leftTX  = HandDebugState.leftTY  = HandDebugState.leftTZ  = 0f;
        HandDebugState.rightRX = HandDebugState.rightRY = HandDebugState.rightRZ = 0f;
        HandDebugState.leftRX  = HandDebugState.leftRY  = HandDebugState.leftRZ  = 0f;
        HandDebugState.squareTX = HandDebugState.squareTY = HandDebugState.squareTZ = 0f;
        HandDebugState.squareRX = HandDebugState.squareRY = HandDebugState.squareRZ = 0f;
        HandDebugState.rightITX = HandDebugState.rightITY = HandDebugState.rightITZ = 0f;
        HandDebugState.leftITX  = HandDebugState.leftITY  = HandDebugState.leftITZ  = 0f;
        HandDebugState.rightIRX = HandDebugState.rightIRY = HandDebugState.rightIRZ = 0f;
        HandDebugState.leftIRX  = HandDebugState.leftIRY  = HandDebugState.leftIRZ  = 0f;
        clearWidgets();
        init();
    }

    private static String fmt(float v) {
        return String.format("%.3f", v);
    }

    // ── Slider that can be set programmatically from the text field ───────

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
