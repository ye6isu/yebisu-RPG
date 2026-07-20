package net.ye6isu.yebisuRPG.keybind.client;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

@OnlyIn(Dist.CLIENT)
public final class AbilityBarClientState {

    private static boolean altBarActive = false;

    private AbilityBarClientState() {}

    public static boolean isAltBarActive() {
        return altBarActive;
    }

    public static void toggleAltBar() {
        altBarActive = !altBarActive;
    }
}
