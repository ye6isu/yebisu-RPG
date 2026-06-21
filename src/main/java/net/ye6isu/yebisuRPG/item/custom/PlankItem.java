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
import net.ye6isu.yebisuRPG.util.AoeShapes;
import net.ye6isu.yebisuRPG.data.EntityVarCapability;
import net.ye6isu.yebisuRPG.data.EntityVar;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.attribute.ModAttributes;
import net.minecraft.world.item.UseAnim;
import net.minecraft.world.food.FoodProperties;
import net.minecraft.core.component.DataComponents;
import net.minecraft.world.item.component.CustomModelData;
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
                if (player instanceof LivingEntity _abset) {
            var _absi = _abset.getAttribute(ModAttributes.SCALE_HITBOX_HEIGHT);
            if (_absi != null) _absi.setBaseValue((double)(0.3));
        }
        DashUtil.start(player, (double)((player.getLookAngle().x)), (double)((player.getLookAngle().y)), (double)((player.getLookAngle().z)), (double)(20), (int)((double)(10)), DashUtil.Easing.EASE_OUT, (_dashSrc, _iterEnt) -> {
    if (_iterEnt instanceof LivingEntity _dt) { _dt.hurt(_iterEnt.level().damageSources().mobAttack(player instanceof LivingEntity _da ? _da : null), (float)(1)); }
}, () -> {
    if (player instanceof LivingEntity _abset) {
        var _absi = _abset.getAttribute(ModAttributes.SCALE_HITBOX_HEIGHT);
        if (_absi != null) _absi.setBaseValue((double)(1));
    }
}, "box", (double)(3), (double)(3), (double)(2), false);
        return InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
    //YCS:use:end

}