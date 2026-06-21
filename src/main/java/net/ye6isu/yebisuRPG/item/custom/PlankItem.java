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
import net.minecraft.world.food.FoodProperties;
//YCS_Import_END

public class PlankItem extends Item {
    
    public PlankItem(Properties properties) {
        super(properties);
    }

    //YCS:hurtEnemy:start
    @Override
    public boolean hurtEnemy(ItemStack stack, LivingEntity target, LivingEntity attacker) {
                EntityVarCapability.get(target).define("testbool", EntityVar.ofBool(false)).setBool("testbool", true);
        return super.hurtEnemy(stack, target, attacker);
    }
    //YCS:hurtEnemy:end

    //YCS:use:start
    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {
        player.startUsingItem(usedHand);
                if (player.level() instanceof net.minecraft.server.level.ServerLevel _sl) {
            net.minecraft.world.phys.Vec3[] _f = AoeShapes.frameFromEntity(player);
            net.minecraft.world.phys.Vec3 _c = player.getEyePosition();
            AoeShapes.visualizeBox(_sl, _c, (double)(4), (double)(4), (double)(20), _f[2], _f[0], _f[1]);
            for (net.minecraft.world.entity.LivingEntity _iterEnt : AoeShapes.queryBox(_sl, _c, (double)(4), (double)(4), (double)(20), _f[2], _f[0], _f[1], player, true, player.getEyePosition())) {
              _iterEnt.setYRot(player.getYRot());
              if ((EntityVarCapability.get(_iterEnt).define("testbool", EntityVar.ofBool(false)).getBool("testbool"))) {
                if (_iterEnt instanceof LivingEntity _et) { _et.addEffect(new MobEffectInstance(MobEffects.LEVITATION, (int)(20), Math.max(0,(int)(32)-1))); }
              }
            }
        }
        return InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
    //YCS:use:end

}