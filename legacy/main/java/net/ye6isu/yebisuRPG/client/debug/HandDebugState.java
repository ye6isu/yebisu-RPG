package net.ye6isu.yebisuRPG.client.debug;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

@OnlyIn(Dist.CLIENT)
public final class HandDebugState {

    public static boolean debugMode = false;

    // Base offsets baked in — (0,0,0) delta means the correct calibrated position.
    public static final float BASE_RIGHT_TX = 0.0157f;
    public static final float BASE_RIGHT_TY = 1.6699f;
    public static final float BASE_RIGHT_TZ = 0.223599f;

    public static final float BASE_LEFT_TX  = -0.0157f;
    public static final float BASE_LEFT_TY  = 1.6699f;
    public static final float BASE_LEFT_TZ  = 0.223599f;

    // Baked-in rotation zero — no offset, 0,0,0 is straight.
    public static final float BASE_RIGHT_RX = 0f;
    public static final float BASE_LEFT_RX  = 0f;

    // Leg base calibration — adjust these to set the initial world position of each leg.
    public static final float BASE_RIGHT_LEG_TX =  0.0160f;
    public static final float BASE_RIGHT_LEG_TY =  1.6699f;
    public static final float BASE_RIGHT_LEG_TZ =  0.223597f;

    public static final float BASE_LEFT_LEG_TX  = -0.0160f;
    public static final float BASE_LEFT_LEG_TY  =  1.6699f;
    public static final float BASE_LEFT_LEG_TZ  =  0.223597f;

    // Leg debug deltas — sliders start at 0.
    public static float rightLegTX = 0f;
    public static float rightLegTY = 0f;
    public static float rightLegTZ = 0f;
    public static float rightLegRX = 0f;
    public static float rightLegRY = 0f;
    public static float rightLegRZ = 0f;
    public static float rightLegSX = 1f;
    public static float rightLegSY = 1f;
    public static float rightLegSZ = 1f;

    public static float leftLegTX = 0f;
    public static float leftLegTY = 0f;
    public static float leftLegTZ = 0f;
    public static float leftLegRX = 0f;
    public static float leftLegRY = 0f;
    public static float leftLegRZ = 0f;
    public static float leftLegSX = 1f;
    public static float leftLegSY = 1f;
    public static float leftLegSZ = 1f;

    private HandDebugState() {}
}
