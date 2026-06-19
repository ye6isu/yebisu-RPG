package net.ye6isu.yebisuRPG.mixin;

import net.minecraft.client.model.ElytraModel;
import net.minecraft.client.model.geom.ModelPart;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

@OnlyIn(Dist.CLIENT)
@Mixin(ElytraModel.class)
public interface AccessorElytraModel {
    @Accessor("leftWing")
    ModelPart getLeftWing();

    @Accessor("rightWing")
    ModelPart getRightWing();
}
