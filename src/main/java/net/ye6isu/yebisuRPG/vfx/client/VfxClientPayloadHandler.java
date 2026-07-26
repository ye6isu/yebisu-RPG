package net.ye6isu.yebisuRPG.vfx.client;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.neoforged.neoforge.network.handling.IPayloadContext;
import net.ye6isu.yebisuRPG.vfx.network.VfxRemovePayload;
import net.ye6isu.yebisuRPG.vfx.network.VfxStartPayload;

@OnlyIn(Dist.CLIENT)
public final class VfxClientPayloadHandler {

    private VfxClientPayloadHandler() {}

    public static void onStart(VfxStartPayload payload, IPayloadContext context) {
        context.enqueueWork(() -> ClientVfxManager.start(payload));
    }

    public static void onRemove(VfxRemovePayload payload, IPayloadContext context) {
        context.enqueueWork(() -> ClientVfxManager.remove(payload.instanceId()));
    }
}
