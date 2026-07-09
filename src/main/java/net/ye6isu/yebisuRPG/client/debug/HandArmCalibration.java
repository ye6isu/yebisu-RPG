package net.ye6isu.yebisuRPG.client.debug;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

/**
 * Calibrated base offsets for first-person arm/leg placement, hand-tuned by eye
 * against the FirstPersonHandModel geometry. Not a live-adjustable debug tool —
 * an earlier "debugMode + slider" scaffold for tuning these at runtime was never
 * wired to any UI/keybind and has been removed; these are the final values it
 * would have produced.
 */
@OnlyIn(Dist.CLIENT)
public final class HandArmCalibration {

    public static final float BASE_RIGHT_TX = 0.0157f;
    public static final float BASE_RIGHT_TY = 1.6699f;
    public static final float BASE_RIGHT_TZ = 0.223599f;

    public static final float BASE_LEFT_TX  = -0.0157f;
    public static final float BASE_LEFT_TY  = 1.6699f;
    public static final float BASE_LEFT_TZ  = 0.223599f;

    public static final float BASE_RIGHT_RX = 0f;
    public static final float BASE_LEFT_RX  = 0f;

    public static final float BASE_RIGHT_LEG_TX =  0.0160f;
    public static final float BASE_RIGHT_LEG_TY =  1.6699f;
    public static final float BASE_RIGHT_LEG_TZ =  0.223597f;

    public static final float BASE_LEFT_LEG_TX  = -0.0160f;
    public static final float BASE_LEFT_LEG_TY  =  1.6699f;
    public static final float BASE_LEFT_LEG_TZ  =  0.223597f;

    private HandArmCalibration() {}
}
