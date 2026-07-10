package net.ye6isu.yebisuRPG.network.animation;

import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.ye6isu.yebisuRPG.network.BasePayload;

public record ThirdPersonPosePayload(
        int entityId,
        String animName,
        String filePath,
        int lookAtMask,
        int vanillaMask,
        int vanillaMoveMask,
        int allowActionsMask,
        int keepPosScaleMask
) implements BasePayload {

    public static final CustomPacketPayload.Type<ThirdPersonPosePayload> TYPE =
            new CustomPacketPayload.Type<>(
                    ResourceLocation.fromNamespaceAndPath("yebisurpg", "tp_pose"));

    // Pack vanillaMoveMask + allowActionsMask + keepPosScaleMask into one int
    // to stay within StreamCodec.composite's 6-field limit
    private int packedFlags() {
        int packed = vanillaMoveMask & 0x3FFFF;
        packed |= (allowActionsMask & 0x3F) << 18;
        packed |= (keepPosScaleMask & 0x3F) << 24;
        return packed;
    }

    private static ThirdPersonPosePayload fromPacked(int entityId, String animName, String filePath,
                                                      int lookAtMask, int vanillaMask, int packed) {
        return new ThirdPersonPosePayload(entityId, animName, filePath, lookAtMask, vanillaMask,
                packed & 0x3FFFF, (packed >> 18) & 0x3F, (packed >> 24) & 0x3F);
    }

    public static final StreamCodec<ByteBuf, ThirdPersonPosePayload> STREAM_CODEC =
            StreamCodec.composite(
                    ByteBufCodecs.VAR_INT,         ThirdPersonPosePayload::entityId,
                    ByteBufCodecs.stringUtf8(64),   ThirdPersonPosePayload::animName,
                    ByteBufCodecs.stringUtf8(256),  ThirdPersonPosePayload::filePath,
                    ByteBufCodecs.VAR_INT,          ThirdPersonPosePayload::lookAtMask,
                    ByteBufCodecs.VAR_INT,          ThirdPersonPosePayload::vanillaMask,
                    ByteBufCodecs.VAR_INT,          ThirdPersonPosePayload::packedFlags,
                    ThirdPersonPosePayload::fromPacked);

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() { return TYPE; }

    public boolean isClear() { return animName == null || animName.isEmpty(); }

    /** True if at least one body part is flagged to allow vanilla actions (eating, swinging, etc.) through. */
    public boolean hasAnyAllowActions() { return allowActionsMask != 0; }

    /** True if the camera-anchored first-person mannequin overlay is enabled (any limb) for this pose. */
    public boolean showInFirstPerson() {
        return (vanillaMoveMask & net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead.FP_ANY_LIMB) != 0;
    }

    /** Bitmask of which limbs (FP_RIGHT_ARM/FP_LEFT_ARM/FP_RIGHT_LEG/FP_LEFT_LEG) the first-person mannequin should render. */
    public int firstPersonLimbMask() {
        return vanillaMoveMask & net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead.FP_ANY_LIMB;
    }

    /** True if vanilla's first-person right arm/hand render should be hidden — independent of
     *  whether the mannequin is also showing that limb. */
    public boolean hideVanillaRightArm() {
        return (vanillaMoveMask & net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead.FP_HIDE_VANILLA_RIGHT_ARM) != 0;
    }

    /** True if vanilla's first-person left arm/hand render should be hidden — independent of
     *  whether the mannequin is also showing that limb. */
    public boolean hideVanillaLeftArm() {
        return (vanillaMoveMask & net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead.FP_HIDE_VANILLA_LEFT_ARM) != 0;
    }

    /**
     * True if this arm's "Allow Vanilla Actions" checkbox is set on the pose AND the entity is
     * actually eating/swinging/using an item right now. While this is true, first-person's
     * Show-in-Mannequin and Hide-Vanilla-Arm settings for this arm are meant to stand down —
     * vanilla should play its own normal first-person hand animation for that arm instead,
     * matching what already happens to the real third-person arm during the same vanilla action
     * (see {@code MixinPlayerModel}'s {@code allowActMask} handling).
     */
    public boolean isArmYieldingToVanillaAction(net.minecraft.world.entity.LivingEntity entity, boolean right) {
        int bit = right ? net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead.VAN_RIGHT_ARM
                        : net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead.VAN_LEFT_ARM;
        if ((allowActionsMask & bit) == 0) return false;
        return entity.isUsingItem() || entity.swinging;
    }

    /** Bitmask of which limbs the mannequin should render right now, with any arm currently
     *  yielding to a vanilla action (see {@link #isArmYieldingToVanillaAction}) masked out. */
    public int effectiveFirstPersonLimbMask(net.minecraft.world.entity.LivingEntity entity) {
        int mask = firstPersonLimbMask();
        if (isArmYieldingToVanillaAction(entity, true))  mask &= ~net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead.FP_RIGHT_ARM;
        if (isArmYieldingToVanillaAction(entity, false)) mask &= ~net.ye6isu.yebisuRPG.animation.client.AnimationPlayhead.FP_LEFT_ARM;
        return mask;
    }

    /** {@link #hideVanillaRightArm()}, further suppressed while the right arm is yielding to a
     *  vanilla action. */
    public boolean effectiveHideVanillaRightArm(net.minecraft.world.entity.LivingEntity entity) {
        return hideVanillaRightArm() && !isArmYieldingToVanillaAction(entity, true);
    }

    /** {@link #hideVanillaLeftArm()}, further suppressed while the left arm is yielding to a
     *  vanilla action. */
    public boolean effectiveHideVanillaLeftArm(net.minecraft.world.entity.LivingEntity entity) {
        return hideVanillaLeftArm() && !isArmYieldingToVanillaAction(entity, false);
    }

    public static ThirdPersonPosePayload set(int entityId, String animName, String filePath,
                                              int lookAtMask, int vanillaMask, int vanillaMoveMask,
                                              int allowActionsMask, int keepPosScaleMask) {
        return new ThirdPersonPosePayload(entityId,
                animName != null ? animName : "", filePath != null ? filePath : "",
                lookAtMask, vanillaMask, vanillaMoveMask, allowActionsMask, keepPosScaleMask);
    }

    public static ThirdPersonPosePayload clear(int entityId) {
        return new ThirdPersonPosePayload(entityId, "", "", 0, 0, 0, 0, 0);
    }
}
