package net.ye6isu.yebisuRPG.event;

import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.tags.TagKey;
import net.minecraft.world.item.Item;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.MovementInputUpdateEvent;
import net.ye6isu.yebisuRPG.yebisuRPG;

@EventBusSubscriber(modid = yebisuRPG.MODID, value = Dist.CLIENT)
public class YcsClientEvents {
    public static final TagKey<Item> NO_SLOWDOWN_TAG = TagKey.create(Registries.ITEM, ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "no_use_slowdown"));

    @SubscribeEvent
    public static void onMovementInputUpdate(MovementInputUpdateEvent event) {
        if (event.getEntity().isUsingItem()) {
            if (event.getEntity().getUseItem().is(NO_SLOWDOWN_TAG)) {
                event.getInput().forwardImpulse *= 5.0f;
                event.getInput().leftImpulse *= 5.0f;
            }
        }
    }
}
