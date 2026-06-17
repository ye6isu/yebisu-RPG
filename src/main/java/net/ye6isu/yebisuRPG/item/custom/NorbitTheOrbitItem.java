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
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.resources.ResourceLocation;
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
          if (player instanceof net.minecraft.world.entity.LivingEntity _armet) {
              var _ari = _armet.getAttribute(net.minecraft.world.entity.ai.attributes.Attributes.SCALE);
              if (_ari != null) _ari.removeModifier(net.minecraft.resources.ResourceLocation.parse("yebisurpg:testscale"));
          }
        } else {
          if (player instanceof net.minecraft.world.entity.LivingEntity _amet) {
              var _ai = _amet.getAttribute(net.minecraft.world.entity.ai.attributes.Attributes.SCALE);
              if (_ai != null) {
                  var _amid = net.minecraft.resources.ResourceLocation.parse("yebisurpg:testscale");
                  _ai.removeModifier(_amid);
                  _ai.addOrUpdateTransientModifier(new net.minecraft.world.entity.ai.attributes.AttributeModifier(
                      _amid, (double)(10), net.minecraft.world.entity.ai.attributes.AttributeModifier.Operation.ADD_MULTIPLIED_TOTAL));
              }
          }
        }
        return net.minecraft.world.InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
    //YCS:use:end

}