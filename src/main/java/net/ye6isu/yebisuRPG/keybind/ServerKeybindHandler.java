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

    public static void onAbilitySlotSet(AbilitySlotSetPayload payload, IPayloadContext ctx) {
        ctx.enqueueWork(() -> {
            if (!(ctx.player() instanceof ServerPlayer player)) return;
            int slot = Math.max(1, Math.min(payload.alt() ? 9 : 6, payload.slot()));
            String abilityId = payload.abilityId() != null ? payload.abilityId().trim() : "";
            if (payload.alt()) {
                PlayerAbilities.setAltSlot(player, slot, abilityId);
            } else {
                PlayerAbilities.setSlot(player, slot, abilityId);
            }
        });
    }
}
