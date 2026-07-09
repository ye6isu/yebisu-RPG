package net.ye6isu.yebisuRPG.item.custom;

import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.ye6isu.yebisuRPG.component.ModDataComponents;
import net.ye6isu.yebisuRPG.texture.TextureServerEvents;

public class AeeeeItem extends Item {
    public AeeeeItem(Properties properties) {
        super(properties);
    }
    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand) {
        player.startUsingItem(usedHand);
        if ((player.isCrouching())) {
              TextureServerEvents.removeByTexture(player, "yebisurpg:textures/overlay/petrified.png");
            } else {
              TextureServerEvents.setLayer(player, new net.ye6isu.yebisuRPG.texture.network.TextureSyncPayload.LayerData("yebisurpg:textures/overlay/flame.png", (int)(0), (byte)1, "yebisurpg:textures/overlay/flame_mask.png", "yebisurpg:textures/overlay/flame_emissive.png", 1, 4, false, (byte)0, 2, 0L, 1f, 0), true);
              TextureServerEvents.setLayer(player, new net.ye6isu.yebisuRPG.texture.network.TextureSyncPayload.LayerData("yebisurpg:textures/overlay/petrified.png", (int)(1), (byte)2, "", "", 1, 1, false, (byte)0, 4, 0L, 1f, 0), false);
        }
        return InteractionResultHolder.consume(player.getItemInHand(usedHand));
    }
    @Override
    public boolean hurtEnemy(ItemStack stack, LivingEntity target, LivingEntity attacker) {
        TextureServerEvents.setLayer(target, new net.ye6isu.yebisuRPG.texture.network.TextureSyncPayload.LayerData("yebisurpg:textures/overlay/petrified.png", (int)(0), (byte)2, "", "", 1, 1, false, (byte)0, 4, 0L, 1f, 0), false);
        return super.hurtEnemy(stack, target, attacker);
    }
    @Override
    public InteractionResult interactLivingEntity(ItemStack stack, Player player, LivingEntity interactionTarget, InteractionHand usedHand) {
        TextureServerEvents.removeByTexture(interactionTarget, "yebisurpg:textures/overlay/flame.png");
        return super.interactLivingEntity(stack, player, interactionTarget, usedHand);
    }
}
