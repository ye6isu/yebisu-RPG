package net.ye6isu.yebisuRPG.animation;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.fml.loading.FMLEnvironment;

/**
 * Dedicated-server-safe bridge for common entity code that needs the client's
 * already-synchronized animation playhead without directly loading client classes.
 */
public final class ClientAnimationStateProxy {

    private ClientAnimationStateProxy() {}

    public static AnimationLayerState thirdPersonAction(int entityId) {
        if (FMLEnvironment.dist != Dist.CLIENT) return null;
        try {
            Class<?> query = Class.forName(
                    "net.ye6isu.yebisuRPG.animation.client.ClientAnimationStateQuery");
            return (AnimationLayerState) query
                    .getMethod("thirdPersonAction", int.class)
                    .invoke(null, entityId);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Failed to query client entity animation state", e);
        }
    }
}
