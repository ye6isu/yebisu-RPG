package net.ye6isu.yebisuRPG.texture.network;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.neoforged.neoforge.network.handling.IPayloadContext;
import net.ye6isu.yebisuRPG.texture.FrameLoopMode;
import net.ye6isu.yebisuRPG.texture.MaskMode;
import net.ye6isu.yebisuRPG.texture.TextureComponent;
import net.ye6isu.yebisuRPG.texture.TextureOverlayManager;
import net.ye6isu.yebisuRPG.texture.TextureStack;
import net.ye6isu.yebisuRPG.client.renderer.EntityTextureCompositor;

@OnlyIn(Dist.CLIENT)
public final class TextureSyncClientHandler {

    private TextureSyncClientHandler() {}

    public static void handle(TextureSyncPayload payload, IPayloadContext ctx) {
        if (payload.layers().isEmpty()) {
            TextureOverlayManager.INSTANCE.clear(payload.entityId());
            EntityTextureCompositor.INSTANCE.invalidateById(payload.entityId());
            return;
        }

        TextureStack stack = new TextureStack();
        for (TextureSyncPayload.LayerData data : payload.layers()) {
            TextureComponent.Builder builder = new TextureComponent.Builder(data.texturePath(), data.zIndex());

            if (data.hasMask()) {
                builder.maskMode(toMaskMode(data.maskModeByte()), data.maskPath());
            } else {
                builder.maskMode(toMaskMode(data.maskModeByte()));
            }

            if (data.columns() > 1 || data.rows() > 1) {
                builder.spritesheet(data.columns(), data.rows());
                if (data.playing()) {
                    builder.play(FrameLoopMode.fromByte(data.loopModeByte()), data.ticksPerFrame(), data.startTick(), data.speed());
                } else {
                    builder.restFrame(data.restFrame());
                }
            }

            if (data.hasEmissive()) {
                builder.emissive(data.emissivePath());
            }

            stack.add(builder.build());
        }

        TextureOverlayManager.INSTANCE.apply(payload.entityId(), stack);
        EntityTextureCompositor.INSTANCE.invalidateById(payload.entityId());
    }

    private static MaskMode toMaskMode(byte b) {
        return switch (b) {
            case 1  -> MaskMode.CUTOUT_BELOW;
            case 2  -> MaskMode.ALPHA_FROM_BASE;
            default -> MaskMode.NORMAL;
        };
    }
}
