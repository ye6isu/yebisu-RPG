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
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Entity;
import net.ye6isu.yebisuRPG.animation.AnimationAPI;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.food.FoodProperties;
//YCS_Import_END

public class PlankItem extends Item {
    
    public PlankItem(Properties properties) {
        super(properties);
    }

    //YCS:use:start
    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {
        player.startUsingItem(usedHand);
                if ((player.isCrouching())) {
          if (player instanceof LivingEntity _armet) {
              var _ari = _armet.getAttribute(Attributes.MOVEMENT_SPEED);
              if (_ari != null) _ari.removeModifier(ResourceLocation.parse("yebisurpg:spd"));
          }
        } else {
          if (player instanceof LivingEntity _amet) {
              var _ai = _amet.getAttribute(Attributes.MOVEMENT_SPEED);
              if (_ai != null) {
                  var _amid = ResourceLocation.parse("yebisurpg:spd");
                  _ai.removeModifier(_amid);
                  _ai.addOrUpdateTransientModifier(new AttributeModifier(
                      _amid, (double)(2), AttributeModifier.Operation.ADD_VALUE));
              }
          }
        }
        return InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
    //YCS:use:end

}