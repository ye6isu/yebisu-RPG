package net.ye6isu.yebisuRPG.mixin;

import com.llamalad7.mixinextras.injector.ModifyReturnValue;
import net.minecraft.core.Holder;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityDimensions;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Pose;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.ye6isu.yebisuRPG.attribute.ModAttributes;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(LivingEntity.class)
public class MixinEntityDimensions {

    @Unique private float yebisurpg$lastHitboxW = 1.0f;
    @Unique private float yebisurpg$lastHitboxH = 1.0f;

    // getDimensions() is final but ModifyReturnValue works on final methods via bytecode instrumentation.
    @ModifyReturnValue(
        method = "getDimensions(Lnet/minecraft/world/entity/Pose;)Lnet/minecraft/world/entity/EntityDimensions;",
        at = @At("RETURN")
    )
    private EntityDimensions yebisurpg$scaleDimensions(EntityDimensions original, Pose pose) {
        LivingEntity self = (LivingEntity) (Object) this;
        float w = yebisurpg$getScale(self, ModAttributes.SCALE_HITBOX_WIDTH);
        float h = yebisurpg$getScale(self, ModAttributes.SCALE_HITBOX_HEIGHT);
        if (w == 1.0f && h == 1.0f) return original;
        return original.scale(w, h);
    }

    @Inject(method = "aiStep()V", at = @At("HEAD"))
    private void yebisurpg$refreshOnScaleChange(CallbackInfo ci) {
        LivingEntity self = (LivingEntity) (Object) this;
        float w = yebisurpg$getScale(self, ModAttributes.SCALE_HITBOX_WIDTH);
        float h = yebisurpg$getScale(self, ModAttributes.SCALE_HITBOX_HEIGHT);
        if (w != yebisurpg$lastHitboxW || h != yebisurpg$lastHitboxH) {
            yebisurpg$lastHitboxW = w;
            yebisurpg$lastHitboxH = h;
            boolean wasOnGround = self.onGround();
            self.refreshDimensions();
            self.setOnGround(wasOnGround);
        }
    }

    @Unique
    private static float yebisurpg$getScale(LivingEntity entity, Holder<Attribute> attr) {
        AttributeInstance inst = entity.getAttribute(attr);
        return inst != null ? (float) inst.getValue() : 1.0f;
    }
}
