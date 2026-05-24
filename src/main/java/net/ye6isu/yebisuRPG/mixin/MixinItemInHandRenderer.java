package net.ye6isu.yebisuRPG.mixin;

import net.minecraft.client.renderer.ItemInHandRenderer;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import org.spongepowered.asm.mixin.Mixin;

/** Placeholder — emissive glow handled by MixinPlayerRenderer. */
@Mixin(ItemInHandRenderer.class)
@OnlyIn(Dist.CLIENT)
public abstract class MixinItemInHandRenderer {
}
