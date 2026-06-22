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
//YCS_Import_END

public class ArerererItem extends Item {
    public ArerererItem(Properties properties) {
        super(properties);
    }

    //YCS:use:start
    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {
        player.startUsingItem(usedHand);
                if ((player.isCrouching())) {
          if (player instanceof Entity animEntity && !level.isClientSide()) {
              AnimationAPI.setThirdPersonPose(animEntity,
                  "pose",
                  "yebisurpg:animations/player.animation.json",
                  80, 51, 0, 0, 0);
          }
        } else {
          if (player instanceof Entity animEntity && !level.isClientSide()) {
              AnimationAPI.triggerAnimation(animEntity,
                  AnimationCategory.ENTITY_THIRD_PERSON,
                  "test",
                  "yebisurpg:animations/player.animation.json",
                  1f, 48, 51 | 1024, 0);
          }
        }
        return InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
    //YCS:use:end

}