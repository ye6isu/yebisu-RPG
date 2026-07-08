package net.ye6isu.yebisuRPG.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import net.minecraft.client.model.EntityModel;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.entity.EnderDragonRenderer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.boss.enderdragon.EnderDragon;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.client.renderer.EntityTextureCompositor;
import net.ye6isu.yebisuRPG.texture.TextureOverlayManager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Redirects the dragon's body {@link RenderType} to its per-instance composite texture (see
 * {@link EntityTextureCompositor#getCompositeLocation}) when one is active.
 *
 * <p>{@link EnderDragonRenderer} doesn't extend {@code LivingEntityRenderer} (the dragon isn't a
 * {@code LivingEntity}), so {@code MixinLivingEntityRenderer}'s {@code getRenderType} hook never
 * runs for it — and its body {@code RenderType} is a {@code static final RENDER_TYPE} field baked
 * to the fixed vanilla dragon texture at class-load, not resolved dynamically per frame like
 * {@code LivingEntityRenderer.getRenderType()}. This mixin redirects the one
 * {@code buffer.getBuffer(RENDER_TYPE)} call in the non-death-animation render branch to a
 * dynamically-built cutout-no-cull {@code RenderType} pointed at the composite texture instead.</p>
 *
 * <p>{@code RenderLivingEvent.Pre}/{@code Post} — what normally drives
 * {@link EntityTextureCompositor#update} for every other entity — are only posted from
 * {@code LivingEntityRenderer.render}, which this renderer never calls into. So this mixin also
 * calls {@code update} itself at the head of {@code render}, same as
 * {@code EntityTextureRenderHooks.onRenderLiving} does for ordinary living entities.</p>
 */
@OnlyIn(Dist.CLIENT)
@Mixin(EnderDragonRenderer.class)
public abstract class MixinEnderDragonRenderer {

    @Inject(method = "render", at = @At("HEAD"))
    private void yebisurpg$updateComposite(
            EnderDragon entity, float entityYaw, float partialTicks,
            PoseStack poseStack, MultiBufferSource buffer, int packedLight, CallbackInfo ci) {
        EntityTextureCompositor.INSTANCE.update(entity);
    }

    @Redirect(method = "render", at = @At(value = "FIELD",
            target = "Lnet/minecraft/client/renderer/entity/EnderDragonRenderer;RENDER_TYPE:Lnet/minecraft/client/renderer/RenderType;"))
    private RenderType yebisurpg$redirectDragonBody(
            EnderDragon entity, float entityYaw, float partialTicks,
            PoseStack poseStack, MultiBufferSource buffer, int packedLight) {
        ResourceLocation composite = EntityTextureCompositor.INSTANCE.getCompositeLocation(entity.getId());
        return composite != null ? RenderType.entityCutoutNoCull(composite) : RenderType.entityCutoutNoCull(DRAGON_LOCATION);
    }

    /**
     * Suppresses the dragon's own glowing-eyes pass (drawn directly in {@code render}, not via a
     * separate {@code EyesLayer}-style render layer like every other glowing mob) whenever the
     * dragon has an active "Mask Over Base" overlay — same reasoning as {@code MixinEmissiveLayers}.
     *
     * <p>Verified via {@code javap} bytecode disassembly (source-level ordinal guessing was wrong
     * twice): the target is {@code DragonModel.renderToBuffer(PoseStack, VertexConsumer, int, int)}
     * — a method on the private inner {@code EnderDragonRenderer$DragonModel} class, not the
     * generic {@code EntityModel} supertype — and it appears 3 times in bytecode call-site order
     * (a 4th call in the death branch has a 5-arg overload with an extra {@code int} and doesn't
     * match): ordinal 0 = death decal, ordinal 1 = normal body, ordinal 2 = eyes.</p>
     */
    @Redirect(method = "render", at = @At(value = "INVOKE",
            target = "Lnet/minecraft/client/renderer/entity/EnderDragonRenderer$DragonModel;renderToBuffer(Lcom/mojang/blaze3d/vertex/PoseStack;Lcom/mojang/blaze3d/vertex/VertexConsumer;II)V",
            ordinal = 2))
    private void yebisurpg$suppressDragonEyes(
            EnderDragonRenderer.DragonModel model, PoseStack poseStack, VertexConsumer buffer, int packedLight, int packedOverlay,
            EnderDragon entity, float entityYaw, float partialTicks,
            PoseStack poseStack2, MultiBufferSource bufferSource, int packedLight2) {
        if (TextureOverlayManager.INSTANCE.hasMaskOverBase(entity.getId())) return;
        model.renderToBuffer(poseStack, buffer, packedLight, packedOverlay);
    }

    @Shadow
    @org.spongepowered.asm.mixin.Final
    private static ResourceLocation DRAGON_LOCATION;
}
