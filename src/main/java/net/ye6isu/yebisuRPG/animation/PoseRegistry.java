package net.ye6isu.yebisuRPG.animation;

import net.ye6isu.yebisuRPG.network.BasePayload;
import net.ye6isu.yebisuRPG.network.animation.HandPosePayload;
import net.ye6isu.yebisuRPG.network.animation.ItemAnimPosePayload;
import net.ye6isu.yebisuRPG.network.animation.ThirdPersonPosePayload;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Server-side store of active poses (third-person, first-person hand, item).
 * Mirrors what was last broadcast so late joiners can be caught up.
 */
public final class PoseRegistry {

    private static final PoseRegistry INSTANCE = new PoseRegistry();

    private final ConcurrentHashMap<Integer, ThirdPersonPosePayload> thirdPersonPoses = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Integer, HandPosePayload> handPoses = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, ItemAnimPosePayload> itemPoses = new ConcurrentHashMap<>();

    private PoseRegistry() {}

    public static PoseRegistry get() { return INSTANCE; }

    private static long itemKey(int entityId, boolean mainHand) {
        return ((long) entityId << 1) | (mainHand ? 1 : 0);
    }

    // -- Third person pose --

    public void setThirdPersonPose(ThirdPersonPosePayload payload) {
        if (payload.isClear()) {
            thirdPersonPoses.remove(payload.entityId());
        } else {
            thirdPersonPoses.put(payload.entityId(), payload);
        }
    }

    public ThirdPersonPosePayload getThirdPersonPose(int entityId) {
        return thirdPersonPoses.get(entityId);
    }

    // -- Hand pose --

    public void setHandPose(HandPosePayload payload) {
        if (payload.isClear()) {
            handPoses.remove(payload.entityId());
        } else {
            handPoses.put(payload.entityId(), payload);
        }
    }

    public HandPosePayload getHandPose(int entityId) {
        return handPoses.get(entityId);
    }

    // -- Item pose --

    public void setItemPose(ItemAnimPosePayload payload) {
        if (payload.isClear()) {
            itemPoses.remove(itemKey(payload.entityId(), payload.isMainHand()));
        } else {
            itemPoses.put(itemKey(payload.entityId(), payload.isMainHand()), payload);
        }
    }

    // -- Bulk reads for catch-up --

    public List<BasePayload> getAllPoses(int entityId) {
        List<BasePayload> result = new ArrayList<>();
        ThirdPersonPosePayload tp = thirdPersonPoses.get(entityId);
        if (tp != null) result.add(tp);
        HandPosePayload hp = handPoses.get(entityId);
        if (hp != null) result.add(hp);
        ItemAnimPosePayload mainItem = itemPoses.get(itemKey(entityId, true));
        if (mainItem != null) result.add(mainItem);
        ItemAnimPosePayload offItem = itemPoses.get(itemKey(entityId, false));
        if (offItem != null) result.add(offItem);
        return result;
    }

    // -- Cleanup --

    public void removeAll(int entityId) {
        thirdPersonPoses.remove(entityId);
        handPoses.remove(entityId);
        itemPoses.remove(itemKey(entityId, true));
        itemPoses.remove(itemKey(entityId, false));
    }

    public void clear() {
        thirdPersonPoses.clear();
        handPoses.clear();
        itemPoses.clear();
    }
}
