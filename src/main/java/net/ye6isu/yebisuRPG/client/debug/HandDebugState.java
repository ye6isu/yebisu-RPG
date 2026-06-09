package net.ye6isu.yebisuRPG.client.debug;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

@OnlyIn(Dist.CLIENT)
public final class HandDebugState {

    public static boolean debugMode = false;

    // Base offset baked in — (0,0,0) in the debugger means correct position.
    public static final float BASE_TX = 0f;
    public static final float BASE_TY = 1.67f;
    public static final float BASE_TZ = 0.25f;

    // Debug delta — sliders start at 0 and adjust relative to the base.
    public static float tx = 0f;
    public static float ty = 0f;
    public static float tz = 0f;

    public static float rightRX = 0f;
    public static float rightRY = 0f;
    public static float rightRZ = 0f;

    public static float leftRX = 0f;
    public static float leftRY = 0f;
    public static float leftRZ = 0f;

    private HandDebugState() {}
}
