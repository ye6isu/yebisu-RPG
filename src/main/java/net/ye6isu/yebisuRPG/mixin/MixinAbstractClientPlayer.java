package net.ye6isu.yebisuRPG.mixin;

import net.minecraft.client.Minecraft;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.resources.PlayerSkin;
import net.ye6isu.yebisuRPG.client.debug.DebugSkinOverride;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(AbstractClientPlayer.class)
public abstract class MixinAbstractClientPlayer {

    @Inject(method = "getSkin", at = @At("RETURN"), cancellable = true)
    private void yebisu$overrideSkin(CallbackInfoReturnable<PlayerSkin> cir) {
        if (DebugSkinOverride.getMode() == DebugSkinOverride.Mode.OFF) return;
        AbstractClientPlayer self = (AbstractClientPlayer) (Object) this;
        if (self != Minecraft.getInstance().player) return;
        PlayerSkin override = DebugSkinOverride.override(cir.getReturnValue());
        if (override != null) cir.setReturnValue(override);
    }
}
