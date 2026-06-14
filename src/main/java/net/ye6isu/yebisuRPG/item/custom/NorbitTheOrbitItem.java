package net.ye6isu.yebisuRPG.item.custom;

//YCS_Import_START
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.item.UseAnim;
//YCS_Import_END

public class NorbitTheOrbitItem extends Item {
    public NorbitTheOrbitItem(Properties properties) {
        super(properties);
    }

    //YCS:useAnimation:start
    @Override
    public net.minecraft.world.item.UseAnim getUseAnimation(ItemStack stack) {
        return net.minecraft.world.item.UseAnim.BOW;
    }
    //YCS:useAnimation:end

    //YCS:use:start
    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {
        player.startUsingItem(usedHand);
                if ((player.isCrouching())) {
          if (player instanceof net.minecraft.world.entity.Entity _se && !level.isClientSide()) {
              net.ye6isu.yebisuRPG.animation.AnimationAPI.stopFirstPersonAnimation(_se);
          }
        } else {
          if (player instanceof net.minecraft.world.entity.Entity _ae && !level.isClientSide()) {
              net.ye6isu.yebisuRPG.animation.AnimationAPI.triggerAnimation(_ae,
                  net.ye6isu.yebisuRPG.animation.AnimationCategory.ENTITY,
                  "anim3",
                  "yebisurpg:animations/animations.json",
                  null);
          }
        }
        return net.minecraft.world.InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
    //YCS:use:end

}