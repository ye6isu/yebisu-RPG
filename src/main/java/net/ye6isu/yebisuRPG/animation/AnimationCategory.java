package net.ye6isu.yebisuRPG.animation;

/**
 * Identifies which part of an entity or player the animation system is targeting.
 * Each category maps to a distinct render/bone pathway so they can be keyframed
 * and interrupted independently without colliding with one another.
 */
public enum AnimationCategory {

    /**
     * First-person animation — drives the custom arm/leg geometry rendered by
     * MixinItemInHandRenderer. Independent from ENTITY_THIRD_PERSON.
     */
    ENTITY,

    /**
     * Third-person animation — drives PlayerModel bones (rightArm, leftArm, body,
     * rightLeg, leftLeg, head) via MixinPlayerModel using HandAnimationLoader JSON.
     * Independent from ENTITY (first-person). Suppresses vanilla swing when active.
     */
    ENTITY_THIRD_PERSON,

    /**
     * The custom multi-part item structure held in the main hand slot.
     * Animates individual components (e.g. a rifle slide, spinning barrel) relative
     * to the holding position. Intercepted via MixinItemInHandRenderer.
     */
    ITEM_MAIN_HAND,

    /**
     * Same as ITEM_MAIN_HAND but for the off-hand slot.
     */
    ITEM_OFF_HAND,

    /**
     * Custom 3D geometry overlay on the helmet slot.
     * Intercepted via MixinPlayerRenderer before the armor layer is composited.
     */
    ARMOR_HELMET,

    /**
     * Custom 3D geometry overlay on the chestplate slot.
     */
    ARMOR_CHEST,

    /**
     * Custom 3D geometry overlay on the leggings slot.
     */
    ARMOR_LEGS,

    /**
     * Custom 3D geometry overlay on the boots slot.
     */
    ARMOR_BOOTS;

    private static final AnimationCategory[] VALUES = values();

    public static AnimationCategory fromOrdinal(int ordinal) {
        return VALUES[ordinal];
    }
}
