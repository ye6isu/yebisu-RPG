package net.ye6isu.yebisuRPG.client.renderer;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import net.minecraft.client.model.PlayerModel;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.entity.RenderLayerParent;
import net.minecraft.client.renderer.entity.layers.RenderLayer;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisulib.texture.MaskMode;
import net.ye6isu.yebisulib.texture.TextureComponent;
import net.ye6isu.yebisulib.texture.TextureManager;
import net.ye6isu.yebisulib.texture.TextureStack;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/client/renderer/PlayerTextureLayer.class */
@OnlyIn(Dist.CLIENT)
public class PlayerTextureLayer extends RenderLayer<AbstractClientPlayer, PlayerModel<AbstractClientPlayer>> {
    public PlayerTextureLayer(RenderLayerParent<AbstractClientPlayer, PlayerModel<AbstractClientPlayer>> parent) {
        super(parent);
    }

    public void render(PoseStack pose, MultiBufferSource buffers, int packedLight, AbstractClientPlayer player, float limbSwing, float limbSwingAmount, float partialTick, float ageInTicks, float netHeadYaw, float headPitch) {
        TextureStack stack = TextureManager.INSTANCE.getStack(player.getId());
        if (stack == null || stack.isEmpty()) {
            return;
        }
        for (TextureComponent component : stack.getLayers()) {
            RenderType renderType = toRenderType(component);
            VertexConsumer vc = buffers.getBuffer(renderType);
            getParentModel().renderToBuffer(pose, vc, packedLight, OverlayTexture.NO_OVERLAY);
        }
    }

    /* JADX INFO: renamed from: net.ye6isu.yebisuRPG.client.renderer.PlayerTextureLayer$1 */
    /* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/client/renderer/PlayerTextureLayer$1.class */
    static /* synthetic */ class C00011 {
        static final /* synthetic */ int[] $SwitchMap$net$ye6isu$yebisulib$texture$MaskMode = new int[MaskMode.values().length];

        static {
            try {
                $SwitchMap$net$ye6isu$yebisulib$texture$MaskMode[MaskMode.CUTOUT_BELOW.ordinal()] = 1;
            } catch (NoSuchFieldError e) {
            }
            try {
                $SwitchMap$net$ye6isu$yebisulib$texture$MaskMode[MaskMode.ALPHA_FROM_BASE.ordinal()] = 2;
            } catch (NoSuchFieldError e2) {
            }
        }
    }

    private static RenderType toRenderType(TextureComponent component) {
        switch (C00011.$SwitchMap$net$ye6isu$yebisulib$texture$MaskMode[component.getMaskMode().ordinal()]) {
            case ID_FLOAT:
                return RenderType.entityCutout(component.getTexture());
            case ID_BOOL:
                return RenderType.entityTranslucent(component.getTexture());
            default:
                return RenderType.entityTranslucentCull(component.getTexture());
        }
    }
}
