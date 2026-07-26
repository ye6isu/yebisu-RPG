package net.ye6isu.yebisuRPG.keybind;

import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.ye6isu.yebisuRPG.util.DashUtil;
import net.minecraft.world.entity.LivingEntity;
import net.ye6isu.yebisuRPG.util.ProjectileUtil;
import net.ye6isu.yebisuRPG.util.ProjectJjkDashUtil;
import net.ye6isu.yebisuRPG.util.DashUtil;
import net.minecraft.world.entity.LivingEntity;
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
            case "wap" -> { ProjectJjkDashUtil.start(player, (double)((player.getLookAngle().x)), (double)((player.getLookAngle().y)), (double)((player.getLookAngle().z)), (double)(24), (int)((double)(2)), (int)((double)(2)), (double)(0.2), true); }
            case "woop" -> { DashUtil.start(player, (double)((player.getLookAngle().x)), (double)((player.getLookAngle().y)), (double)((player.getLookAngle().z)), (double)(20), (int)((double)(5)), DashUtil.Easing.EASE_OUT, null, null, "sphere", (double)(1.5), (double)(0), (double)(0), false); }
            // YCS_Ability_Use_Dispatch
            default -> {}
        }
    }
}
