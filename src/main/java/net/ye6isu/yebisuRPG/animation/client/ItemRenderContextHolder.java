package net.ye6isu.yebisuRPG.animation.client;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

/**
 * Per-render-thread scratch data, written by MixinItemInHandLayer right before vanilla
 * dispatches third-person held-item rendering and read by GeoItemRenderer so it knows
 * which entity/hand is holding the item currently being rendered (BlockEntityWithoutLevelRenderer's
 * renderByItem carries no entity/hand context on its own).
 */
@OnlyIn(Dist.CLIENT)
public final class ItemRenderContextHolder {
    private ItemRenderContextHolder() {}

    public static final ThreadLocal<Integer> ENTITY_ID = ThreadLocal.withInitial(() -> -1);
    public static final ThreadLocal<Boolean> MAIN_HAND = ThreadLocal.withInitial(() -> true);
    public static final ThreadLocal<Boolean> ACTIVE = ThreadLocal.withInitial(() -> false);
}
