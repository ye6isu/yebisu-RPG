package net.ye6isu.yebisuRPG.client.debug;

import net.minecraft.client.resources.PlayerSkin;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.yebisuRPG;

import javax.annotation.Nullable;

@OnlyIn(Dist.CLIENT)
public final class DebugSkinOverride {

    public enum Mode { OFF, NORMAL, SLIM }

    private static Mode mode = Mode.OFF;

    private static final ResourceLocation TEX_NORMAL = ResourceLocation.fromNamespaceAndPath(
        yebisuRPG.MODID, "textures/player/normal.png");
    private static final ResourceLocation TEX_SLIM = ResourceLocation.fromNamespaceAndPath(
        yebisuRPG.MODID, "textures/player/slim.png");

    public static void cycle() {
        mode = switch (mode) {
            case OFF -> Mode.NORMAL;
            case NORMAL -> Mode.SLIM;
            case SLIM -> Mode.OFF;
        };
    }

    public static Mode getMode() { return mode; }

    @Nullable
    public static PlayerSkin override(PlayerSkin original) {
        if (mode == Mode.OFF) return null;
        ResourceLocation tex = mode == Mode.SLIM ? TEX_SLIM : TEX_NORMAL;
        PlayerSkin.Model model = mode == Mode.SLIM ? PlayerSkin.Model.SLIM : PlayerSkin.Model.WIDE;
        return new PlayerSkin(tex, null, original.capeTexture(), original.elytraTexture(), model, true);
    }

    private DebugSkinOverride() {}
}
