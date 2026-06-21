package net.ye6isu.yebisuRPG.item.custom;

//YCS_Import_START
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.ye6isu.yebisuRPG.animation.AnimationAPI;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.util.AoeShapes;
import net.ye6isu.yebisuRPG.data.EntityVarCapability;
import net.ye6isu.yebisuRPG.data.EntityVar;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.item.UseAnim;
import net.minecraft.world.food.FoodProperties;
import net.minecraft.core.component.DataComponents;
import net.minecraft.world.item.component.CustomModelData;
//YCS_Import_END

public class PlankItem extends Item {
    
    public PlankItem(Properties properties) {
        super(properties);
    }

}