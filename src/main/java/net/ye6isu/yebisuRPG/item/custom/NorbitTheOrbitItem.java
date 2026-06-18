package net.ye6isu.yebisuRPG.item.custom;

//YCS_Import_START
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.LivingEntity;
import net.ye6isu.yebisuRPG.util.AoeShapes;
//YCS_Import_END

public class NorbitTheOrbitItem extends Item {
    public NorbitTheOrbitItem(Properties properties) {
        super(properties);
    }

    //YCS:useDuration:start
    @Override
    public int getUseDuration(ItemStack stack, LivingEntity entity) {
        return 1;
    }
    //YCS:useDuration:end

    //YCS:use:start
    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {
        player.startUsingItem(usedHand);
                if (player.level() instanceof net.minecraft.server.level.ServerLevel _sl) {
            net.minecraft.world.phys.Vec3[] _f = AoeShapes.frameFromEntity(player);
            net.minecraft.world.phys.Vec3 _c = player.getEyePosition();
            _c = _c.add(_f[0].scale((double)(0))).add(_f[1].scale((double)(0))).add(_f[2].scale((double)(4)));
            for (net.minecraft.world.entity.LivingEntity _iterEnt : AoeShapes.querySphere(_sl, _c, (double)(4), player, false, player.getEyePosition())) {
              _iterEnt.setDeltaMovement((double)((((double)((player.getX() + player.getLookAngle().normalize().x * (double)(4)))-(double)((_iterEnt.getX()))) / (Math.sqrt(((double)((player.getX() + player.getLookAngle().normalize().x * (double)(4)))-(double)((_iterEnt.getX())))*((double)((player.getX() + player.getLookAngle().normalize().x * (double)(4)))-(double)((_iterEnt.getX())))+((double)((player.getY() + player.getEyeHeight() + player.getLookAngle().normalize().y * (double)(4)))-(double)((_iterEnt.getY())))*((double)((player.getY() + player.getEyeHeight() + player.getLookAngle().normalize().y * (double)(4)))-(double)((_iterEnt.getY())))+((double)((player.getZ() + player.getLookAngle().normalize().z * (double)(4)))-(double)((_iterEnt.getZ())))*((double)((player.getZ() + player.getLookAngle().normalize().z * (double)(4)))-(double)((_iterEnt.getZ())))) > 0.001 ? Math.sqrt(((double)((player.getX() + player.getLookAngle().normalize().x * (double)(4)))-(double)((_iterEnt.getX())))*((double)((player.getX() + player.getLookAngle().normalize().x * (double)(4)))-(double)((_iterEnt.getX())))+((double)((player.getY() + player.getEyeHeight() + player.getLookAngle().normalize().y * (double)(4)))-(double)((_iterEnt.getY())))*((double)((player.getY() + player.getEyeHeight() + player.getLookAngle().normalize().y * (double)(4)))-(double)((_iterEnt.getY())))+((double)((player.getZ() + player.getLookAngle().normalize().z * (double)(4)))-(double)((_iterEnt.getZ())))*((double)((player.getZ() + player.getLookAngle().normalize().z * (double)(4)))-(double)((_iterEnt.getZ())))) : 1.0))), (double)((((double)((player.getY() + player.getEyeHeight() + player.getLookAngle().normalize().y * (double)(4)))-(double)((_iterEnt.getY()))) / (Math.sqrt(((double)((player.getX() + player.getLookAngle().normalize().x * (double)(4)))-(double)((_iterEnt.getX())))*((double)((player.getX() + player.getLookAngle().normalize().x * (double)(4)))-(double)((_iterEnt.getX())))+((double)((player.getY() + player.getEyeHeight() + player.getLookAngle().normalize().y * (double)(4)))-(double)((_iterEnt.getY())))*((double)((player.getY() + player.getEyeHeight() + player.getLookAngle().normalize().y * (double)(4)))-(double)((_iterEnt.getY())))+((double)((player.getZ() + player.getLookAngle().normalize().z * (double)(4)))-(double)((_iterEnt.getZ())))*((double)((player.getZ() + player.getLookAngle().normalize().z * (double)(4)))-(double)((_iterEnt.getZ())))) > 0.001 ? Math.sqrt(((double)((player.getX() + player.getLookAngle().normalize().x * (double)(4)))-(double)((_iterEnt.getX())))*((double)((player.getX() + player.getLookAngle().normalize().x * (double)(4)))-(double)((_iterEnt.getX())))+((double)((player.getY() + player.getEyeHeight() + player.getLookAngle().normalize().y * (double)(4)))-(double)((_iterEnt.getY())))*((double)((player.getY() + player.getEyeHeight() + player.getLookAngle().normalize().y * (double)(4)))-(double)((_iterEnt.getY())))+((double)((player.getZ() + player.getLookAngle().normalize().z * (double)(4)))-(double)((_iterEnt.getZ())))*((double)((player.getZ() + player.getLookAngle().normalize().z * (double)(4)))-(double)((_iterEnt.getZ())))) : 1.0))), (double)((((double)((player.getZ() + player.getLookAngle().normalize().z * (double)(4)))-(double)((_iterEnt.getZ()))) / (Math.sqrt(((double)((player.getX() + player.getLookAngle().normalize().x * (double)(4)))-(double)((_iterEnt.getX())))*((double)((player.getX() + player.getLookAngle().normalize().x * (double)(4)))-(double)((_iterEnt.getX())))+((double)((player.getY() + player.getEyeHeight() + player.getLookAngle().normalize().y * (double)(4)))-(double)((_iterEnt.getY())))*((double)((player.getY() + player.getEyeHeight() + player.getLookAngle().normalize().y * (double)(4)))-(double)((_iterEnt.getY())))+((double)((player.getZ() + player.getLookAngle().normalize().z * (double)(4)))-(double)((_iterEnt.getZ())))*((double)((player.getZ() + player.getLookAngle().normalize().z * (double)(4)))-(double)((_iterEnt.getZ())))) > 0.001 ? Math.sqrt(((double)((player.getX() + player.getLookAngle().normalize().x * (double)(4)))-(double)((_iterEnt.getX())))*((double)((player.getX() + player.getLookAngle().normalize().x * (double)(4)))-(double)((_iterEnt.getX())))+((double)((player.getY() + player.getEyeHeight() + player.getLookAngle().normalize().y * (double)(4)))-(double)((_iterEnt.getY())))*((double)((player.getY() + player.getEyeHeight() + player.getLookAngle().normalize().y * (double)(4)))-(double)((_iterEnt.getY())))+((double)((player.getZ() + player.getLookAngle().normalize().z * (double)(4)))-(double)((_iterEnt.getZ())))*((double)((player.getZ() + player.getLookAngle().normalize().z * (double)(4)))-(double)((_iterEnt.getZ())))) : 1.0))));
            }
        }
        return InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
    //YCS:use:end

}