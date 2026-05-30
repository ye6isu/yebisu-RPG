package net.ye6isu.yebisuRPG.item.custom;

import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.ye6isu.yebisuRPG.sound.ModSounds;

public class RawYe6isuItem extends Item {

    public RawYe6isuItem(Properties pProperties) {
        super(pProperties);
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level pLevel, Player pPlayer, InteractionHand pUsedHand) {
        ItemStack itemstack = pPlayer.getItemInHand(pUsedHand);

        // Play the sound at the player's position
        pLevel.playSound(
                null,                         // Player to exclude (null means everyone nearby hears it)
                pPlayer.blockPosition(),      // The exact position to play the sound
                ModSounds.RAW_YE6ISU.get(),   // The custom sound event you registered
                SoundSource.PLAYERS,          // The sound category (controlled by the 'Players' volume slider in settings)
                1.0F,                         // Volume (1.0 is default)
                1.0F                          // Pitch (1.0 is default pitch/speed)
        );

        // Return a successful interaction
        return InteractionResultHolder.sidedSuccess(itemstack, pLevel.isClientSide());
    }
}