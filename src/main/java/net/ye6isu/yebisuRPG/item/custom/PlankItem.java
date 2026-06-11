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
//YCS_Import_END

public class PlankItem extends Item {

    
    public PlankItem(Properties properties) {
        super(properties);
    }
    //YCS:use:start
    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {
        player.startUsingItem(usedHand);
        net.ye6isu.yebisuRPG.animation.AnimationAPI.triggerAnimation(player, net.ye6isu.yebisuRPG.animation.AnimationCategory.ENTITY, "tester");
        //YCS:use:body
        return net.minecraft.world.InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
    //YCS:use:end

}