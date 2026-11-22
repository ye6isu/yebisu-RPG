package net.ye6isu.yebisuRPG.keybind;

import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.ye6isu.yebisuRPG.animation.AnimationAPI;
import net.ye6isu.yebisuRPG.util.DashUtil;
import net.ye6isu.yebisuRPG.util.ProjectileUtil;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
// YCS_Ability_Handler_Imports

/**
 * Dispatch target for YCS ability Blocky graphs. Ability ids are global string ids;
 * slots only decide which id is requested. Once {@link PlayerAbilities} accepts an
 * ability use and starts its cooldown, it calls this dispatcher for the id's compiled
 * Blocky behavior.
 */
public final class AbilityHandlers {

    private AbilityHandlers() {}

    public static void dispatch(String abilityId, Player player) {
        if (abilityId == null || abilityId.isBlank() || player == null || player.level().isClientSide()) return;
        Level level = player.level();
        ItemStack stack = player.getMainHandItem();
        switch (abilityId) {
            case "lol" -> { if (!level.isClientSide()) { player.setDeltaMovement(((player.getLookAngle().x) * (3)), ((player.getLookAngle().y) * (3)), ((player.getLookAngle().z) * (3))); player.hurtMarked = true; } if (!level.isClientSide() && player instanceof Entity animEntity_944242c9ce74) { AnimationAPI.triggerThirdPersonAnimation(animEntity_944242c9ce74, "test", "yebisurpg:animations/player.animation.json", (float)(1)); } }
            // YCS_Ability_Use_Dispatch
            default -> {}
        }
    }
}
