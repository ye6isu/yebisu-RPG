package net.ye6isu.yebisuRPG.animation;

/**
 * Identifies which part of an entity or player the animation system is targeting.
 * Each category maps to a distinct render/bone pathway so they can be keyframed
 * and interrupted independently without colliding with one another.
 */
public enum AnimationCategory {

    /**
     * Primary skeletal bones of a custom mob, or a player executing a modded ability
     * (spellcast, dodge roll, etc.). Drives AnimationDefinition-based bone transforms
     * on the entity's model directly.
     */
    ENTITY,

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
    ARMOR_BOOTS
}
