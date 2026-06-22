package net.ye6isu.yebisuRPG.item.custom;

//YCS_Import_START
import net.minecraft.world.item.Item;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.entity.player.Player;
import net.ye6isu.yebisuRPG.component.ModDataComponents;
//YCS_Import_END

public class ArerererItem extends Item {
    public ArerererItem(Properties properties) {
        super(properties);
    }

    //YCS:use:start
    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {
        player.startUsingItem(usedHand);
                if (((double)((player.getItemInHand(usedHand).getOrDefault(ModDataComponents.YCS_TESTER.get(), 0.0)))<(double)(3))) {
          player.getItemInHand(usedHand).set(ModDataComponents.YCS_TESTER.get(), (double)((((player.getItemInHand(usedHand).getOrDefault(ModDataComponents.YCS_TESTER.get(), 0.0)))+(1))));
        } else {
          player.getItemInHand(usedHand).set(ModDataComponents.YCS_TESTER.get(), (double)(0));
        }
        player.getItemInHand(usedHand).set(net.minecraft.core.component.DataComponents.CUSTOM_MODEL_DATA, new net.minecraft.world.item.component.CustomModelData((int)((double)((player.getItemInHand(usedHand).getOrDefault(ModDataComponents.YCS_TESTER.get(), 0.0)))) + 1));
        return InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
    //YCS:use:end

}