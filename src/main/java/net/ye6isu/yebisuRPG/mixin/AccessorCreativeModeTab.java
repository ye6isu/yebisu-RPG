package net.ye6isu.yebisuRPG.mixin;

import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.ItemStack;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

@Mixin(CreativeModeTab.class)
public interface AccessorCreativeModeTab {
    @Accessor("iconItemStack")
    void yebisurpg$setIconItemStack(ItemStack stack);
}
