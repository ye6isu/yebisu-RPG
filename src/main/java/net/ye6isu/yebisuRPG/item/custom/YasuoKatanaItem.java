package net.ye6isu.yebisuRPG.item.custom;

//YCS_Import_START
import net.minecraft.world.item.Item;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.Entity;
import net.ye6isu.yebisuRPG.animation.AnimationAPI;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.component.ModDataComponents;
//YCS_Import_END

public class YasuoKatanaItem extends Item {
    public YasuoKatanaItem(Properties properties) {
        super(properties);
    }

    //YCS:use:start
    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {
        player.startUsingItem(usedHand);
                if ((player.isCrouching())) {
          player.getItemInHand(usedHand).set(net.ye6isu.yebisuRPG.component.ModDataComponents.ITEM_STATE.get(), (int)((double)(1)));
          if (((double)((player.getItemInHand(usedHand).getOrDefault(ModDataComponents.YCS_AXE.get(), 0.0)))<(double)(3))) {
            player.getItemInHand(usedHand).set(ModDataComponents.YCS_AXE.get(), (double)((((player.getItemInHand(usedHand).getOrDefault(ModDataComponents.YCS_AXE.get(), 0.0)))+(1))));
          } else {
            player.getItemInHand(usedHand).set(ModDataComponents.YCS_AXE.get(), (double)(0));
          }
          player.getItemInHand(usedHand).set(net.minecraft.core.component.DataComponents.CUSTOM_MODEL_DATA, new net.minecraft.world.item.component.CustomModelData((int)((double)((player.getItemInHand(usedHand).getOrDefault(ModDataComponents.YCS_AXE.get(), 0.0)))) + 1));
        } else {
          player.getItemInHand(usedHand).set(net.ye6isu.yebisuRPG.component.ModDataComponents.ITEM_STATE.get(), (int)((double)(0)));
          if (((double)((player.getItemInHand(usedHand).getOrDefault(ModDataComponents.YCS_SWORD.get(), 0.0)))<(double)(2))) {
            player.getItemInHand(usedHand).set(ModDataComponents.YCS_SWORD.get(), (double)((((player.getItemInHand(usedHand).getOrDefault(ModDataComponents.YCS_SWORD.get(), 0.0)))+(1))));
          } else {
            player.getItemInHand(usedHand).set(ModDataComponents.YCS_SWORD.get(), (double)(0));
          }
          player.getItemInHand(usedHand).set(net.minecraft.core.component.DataComponents.CUSTOM_MODEL_DATA, new net.minecraft.world.item.component.CustomModelData((int)((double)((player.getItemInHand(usedHand).getOrDefault(ModDataComponents.YCS_SWORD.get(), 0.0)))) + 1));
        }
        if (player instanceof Entity animEntity && !level.isClientSide()) {
            AnimationAPI.triggerAnimation(animEntity,
                AnimationCategory.ENTITY,
                "testf",
                "yebisurpg:animations/fplayer.animation.json",
                1f, 0, 1024, 0);
        }
        return InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
    //YCS:use:end

}