package net.ye6isu.yebisuRPG.texture.network;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.neoforged.neoforge.network.handling.IPayloadContext;
import net.ye6isu.yebisuRPG.client.renderer.CompositeSkinManager;
import net.ye6isu.yebisuRPG.texture.*;

@OnlyIn(Dist.CLIENT)
public final class TextureSyncClientHandler {

    private TextureSyncClientHandler() {}

    public static void handle(TextureSyncPayload payload, IPayloadContext ctx) {
        if (payload.layers().isEmpty()) {
            TextureManager.INSTANCE.clear(payload.entityId());
            CompositeSkinManager.INSTANCE.invalidateById(payload.entityId());
            return;
        }

        TextureStack stack = new TextureStack();
        for (TextureSyncPayload.LayerData data : payload.layers()) {
            TextureSyncPayload.LayerBase base = data.base();
            TextureSyncPayload.LayerAnim anim = data.anim();

            TextureComponent.Builder builder = new TextureComponent.Builder(base.texturePath(), base.zIndex());

            if (base.hasMask() && !base.maskPath().isEmpty()) {
                builder.maskMode(toMaskMode(base.maskModeByte()), base.maskPath());
            } else {
                builder.maskMode(toMaskMode(base.maskModeByte()));
            }

            if (anim.columns() > 1 || anim.rows() > 1) {
                builder.spritesheet(anim.columns(), anim.rows());
                if (anim.isAnimated()) {
                    builder.animated(toAnimMode(anim.animModeByte()), anim.ticksPerFrame());
                }
            }

            if (data.emissive().hasEmissive()) {
                builder.emissive(data.emissive().emissivePath());
            }

            stack.add(builder.build());
        }

        TextureManager.INSTANCE.apply(payload.entityId(), stack);
        CompositeSkinManager.INSTANCE.invalidateById(payload.entityId());
    }

    private static MaskMode toMaskMode(byte b) {
        return switch (b) {
            case 1  -> MaskMode.CUTOUT_BELOW;
            case 2  -> MaskMode.ALPHA_FROM_BASE;
            default -> MaskMode.NORMAL;
        };
    }

    private static AnimationMode toAnimMode(byte b) {
        return switch (b) {
            case 1  -> AnimationMode.LOOP;
            case 2  -> AnimationMode.PLAY_ONCE;
            default -> AnimationMode.MANUAL;
        };
    }
}
