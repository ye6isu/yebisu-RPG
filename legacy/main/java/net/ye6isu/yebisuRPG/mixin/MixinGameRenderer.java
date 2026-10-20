package net.ye6isu.yebisuRPG.mixin;

import net.minecraft.client.renderer.GameRenderer;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import org.spongepowered.asm.mixin.Mixin;

/** Reserved — first-person arm rendering is handled in MixinItemInHandRenderer. */
@OnlyIn(Dist.CLIENT)
@Mixin(GameRenderer.class)
public abstract class MixinGameRenderer {
}
