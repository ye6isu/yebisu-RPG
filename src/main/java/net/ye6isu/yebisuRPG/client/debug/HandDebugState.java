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

    // Debug deltas — sliders/fields start at 0 and adjust relative to the base.
    public static float rightTX = 0f;
    public static float rightTY = 0f;
    public static float rightTZ = 0f;

    public static float leftTX = 0f;
    public static float leftTY = 0f;
    public static float leftTZ = 0f;

    public static float rightRX = 0f;
    public static float rightRY = 0f;
    public static float rightRZ = 0f;

    public static float leftRX = 0f;
    public static float leftRY = 0f;
    public static float leftRZ = 0f;

    private HandDebugState() {}
}
