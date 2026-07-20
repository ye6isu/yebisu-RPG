package net.ye6isu.yebisuRPG.animation.client;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.animation.AnimationCategory;
import net.ye6isu.yebisuRPG.animation.AnimationLayerState;

/** Client implementation behind {@code ClientAnimationStateProxy}. */
@OnlyIn(Dist.CLIENT)
public final class ClientAnimationStateQuery {

    private ClientAnimationStateQuery() {}

    public static AnimationLayerState thirdPersonAction(int entityId) {
        AnimationPlayhead playhead = ClientAnimationEngine.INSTANCE.getPlayhead(
                entityId, AnimationCategory.ENTITY_THIRD_PERSON);
        if (playhead == null || !playhead.isPlaying()) return null;
        return new AnimationLayerState(
                playhead.animId(), playhead.filePath(), playhead.getCurrentTimeSecs());
    }
}
