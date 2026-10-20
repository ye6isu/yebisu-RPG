package net.ye6isu.yebisuRPG.mixin;

import com.llamalad7.mixinextras.injector.wrapoperation.Operation;
import com.llamalad7.mixinextras.injector.wrapoperation.WrapOperation;
import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.GameRenderer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.ItemRenderer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.item.ItemDisplayContext;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.attribute.ModAttributes;
import org.jetbrains.annotations.Nullable;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Mutable;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@OnlyIn(Dist.CLIENT)
public class MixinScaleAttributesClient {

    // ── View bobbing ──────────────────────────────────────────────────────────

    @OnlyIn(Dist.CLIENT)
    @Mixin(GameRenderer.class)
    public abstract static class ViewBobbing {

        @Shadow @Mutable @Final Minecraft minecraft;

        @Unique private boolean yebisurpg$inBob = false;

        @Inject(method = "renderLevel(Lnet/minecraft/client/DeltaTracker;)V",
                at = @At(value = "INVOKE", shift = At.Shift.BEFORE,
                         target = "Lnet/minecraft/client/renderer/GameRenderer;bobView(Lcom/mojang/blaze3d/vertex/PoseStack;F)V"))
        private void yebisurpg$preBob(DeltaTracker dt, CallbackInfo ci) { yebisurpg$inBob = true; }

        @Inject(method = "renderLevel(Lnet/minecraft/client/DeltaTracker;)V",
                at = @At(value = "INVOKE", shift = At.Shift.AFTER,
                         target = "Lnet/minecraft/client/renderer/GameRenderer;bobView(Lcom/mojang/blaze3d/vertex/PoseStack;F)V"))
        private void yebisurpg$postBob(DeltaTracker dt, CallbackInfo ci) { yebisurpg$inBob = false; }

        @WrapOperation(method = "bobView(Lcom/mojang/blaze3d/vertex/PoseStack;F)V",
                       at = @At(value = "INVOKE", target = "Lcom/mojang/blaze3d/vertex/PoseStack;translate(FFF)V"))
        private void yebisurpg$scaleBob(PoseStack stack, float x, float y, float z, Operation<Void> op) {
            if (yebisurpg$inBob) {
                Entity cam = minecraft.getCameraEntity();
                if (cam instanceof LivingEntity le) {
                    AttributeInstance inst = le.getAttribute(ModAttributes.SCALE_VIEW_BOBBING);
                    if (inst != null && inst.getValue() != 1.0) {
                        float s = (float) inst.getValue();
                        x *= s; y *= s; z *= s;
                    }
                }
            }
            op.call(stack, x, y, z);
        }
    }

    // ── Held item size — third-person + any non-FP context ───────────────────
    // Your FP renderer already reads right_item_socket / left_item_socket scale
    // from animation, so this only fires for THIRD_PERSON and GUI contexts.
    // When the FP renderer cancels vanilla renderHandsWithItems, renderStatic is
    // called directly from renderHandWithItem() — that's already inside our FP
    // mixin so the PoseStack already has the animation socket scale applied.
    // We guard against double-scaling by skipping FIRST_PERSON contexts here.

    @OnlyIn(Dist.CLIENT)
    @Mixin(value = ItemRenderer.class, priority = 900)
    public abstract static class HeldItemScale {

        @Inject(
            method = "renderStatic(Lnet/minecraft/world/entity/LivingEntity;Lnet/minecraft/world/item/ItemStack;Lnet/minecraft/world/item/ItemDisplayContext;ZLcom/mojang/blaze3d/vertex/PoseStack;Lnet/minecraft/client/renderer/MultiBufferSource;Lnet/minecraft/world/level/Level;III)V",
            at = @At("HEAD")
        )
        private void yebisurpg$heldItemScaleHead(
                @Nullable LivingEntity entity, ItemStack item, ItemDisplayContext ctx,
                boolean leftHanded, PoseStack matrices, MultiBufferSource buffers,
                @Nullable Level level, int light, int overlay, int seed, CallbackInfo ci) {
            if (entity == null || item.isEmpty()) return;
            // Skip FP contexts — our FP mixin's item_socket bone already handles those.
            if (ctx == ItemDisplayContext.FIRST_PERSON_RIGHT_HAND || ctx == ItemDisplayContext.FIRST_PERSON_LEFT_HAND) return;
            // Only apply for held-item contexts (third person, GUI shows items too — skip GUI).
            if (ctx != ItemDisplayContext.THIRD_PERSON_RIGHT_HAND && ctx != ItemDisplayContext.THIRD_PERSON_LEFT_HAND) return;
            AttributeInstance inst = entity.getAttribute(ModAttributes.SCALE_HELD_ITEM);
            if (inst == null || inst.getValue() == 1.0) return;
            float s = (float) inst.getValue();
            matrices.pushPose();
            matrices.scale(s, s, s);
        }

        @Inject(
            method = "renderStatic(Lnet/minecraft/world/entity/LivingEntity;Lnet/minecraft/world/item/ItemStack;Lnet/minecraft/world/item/ItemDisplayContext;ZLcom/mojang/blaze3d/vertex/PoseStack;Lnet/minecraft/client/renderer/MultiBufferSource;Lnet/minecraft/world/level/Level;III)V",
            at = @At("RETURN")
        )
        private void yebisurpg$heldItemScaleReturn(
                @Nullable LivingEntity entity, ItemStack item, ItemDisplayContext ctx,
                boolean leftHanded, PoseStack matrices, MultiBufferSource buffers,
                @Nullable Level level, int light, int overlay, int seed, CallbackInfo ci) {
            if (entity == null || item.isEmpty()) return;
            if (ctx == ItemDisplayContext.FIRST_PERSON_RIGHT_HAND || ctx == ItemDisplayContext.FIRST_PERSON_LEFT_HAND) return;
            if (ctx != ItemDisplayContext.THIRD_PERSON_RIGHT_HAND && ctx != ItemDisplayContext.THIRD_PERSON_LEFT_HAND) return;
            AttributeInstance inst = entity.getAttribute(ModAttributes.SCALE_HELD_ITEM);
            if (inst == null || inst.getValue() == 1.0) return;
            matrices.popPose();
        }
    }
}
