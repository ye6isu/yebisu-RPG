package net.ye6isu.yebisuRPG.keybind;

import net.minecraft.server.level.ServerPlayer;
import net.neoforged.neoforge.network.handling.IPayloadContext;

/** Server-side receiver for {@link KeybindTriggerPayload} — dispatches to the compiled Blocky handler. */
public final class ServerKeybindHandler {

    private ServerKeybindHandler() {}

    public static void onKeybindTrigger(KeybindTriggerPayload payload, IPayloadContext ctx) {
        ctx.enqueueWork(() -> {
            if (!(ctx.player() instanceof ServerPlayer player)) return;
            KeybindHandlers.dispatch(payload.keybindId(), payload.pressed(), player);
        });
    }
}
