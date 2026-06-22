package net.ye6isu.yebisuRPG.item.custom;

//YCS_Import_START
import net.minecraft.world.item.Item;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.entity.player.Player;
import net.ye6isu.yebisuRPG.util.DashUtil;
//YCS_Import_END

public class PlankItem extends Item {
    public PlankItem(Properties properties) {
        super(properties);
    }

    //YCS:use:start
    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {
        player.startUsingItem(usedHand);
                DashUtil.start(player, (double)((player.getLookAngle().x)), (double)((player.getLookAngle().y)), (double)((player.getLookAngle().z)), (double)(20), (int)((double)(6.6)), DashUtil.Easing.EASE_OUT, null, null, "sphere", (double)(1.5), (double)(0), (double)(0), false);
        return InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
    //YCS:use:end

}