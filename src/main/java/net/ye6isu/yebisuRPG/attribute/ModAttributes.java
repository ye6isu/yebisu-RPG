package net.ye6isu.yebisuRPG.attribute;

import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.RangedAttribute;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.yebisuRPG;

//YCS_Attributes_IMPORTS_START
//YCS_Attributes_IMPORTS_END

public final class ModAttributes {

    public static final DeferredRegister<Attribute> ATTRIBUTES =
        DeferredRegister.create(Registries.ATTRIBUTE, yebisuRPG.MODID);

    // ── Scale attributes (registered under yebisurpg namespace) ─────────────────
    public static final DeferredHolder<Attribute, Attribute> SCALE_BASE             = reg("scale.base",             "Scale (Base)",                  0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_WIDTH            = reg("scale.width",            "Scale (Width)",                 0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_HEIGHT           = reg("scale.height",           "Scale (Height)",                0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_EYE_HEIGHT       = reg("scale.eye_height",       "Scale (Eye Height)",            0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_HITBOX_WIDTH     = reg("scale.hitbox_width",     "Scale (Hitbox Width)",          0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_HITBOX_HEIGHT    = reg("scale.hitbox_height",    "Scale (Hitbox Height)",         0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_MODEL_WIDTH      = reg("scale.model_width",      "Scale (Model Width)",           0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_MODEL_HEIGHT     = reg("scale.model_height",     "Scale (Model Height)",          0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_THIRD_PERSON     = reg("scale.third_person",     "Scale (Third-Person Distance)", 0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_MOTION           = reg("scale.motion",           "Scale (Motion Speed)",          0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_FALLING          = reg("scale.falling",          "Scale (Falling Speed)",         0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_STEP_HEIGHT      = reg("scale.step_height",      "Scale (Step Height)",           0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_VIEW_BOBBING     = reg("scale.view_bobbing",     "Scale (View Bobbing)",          0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_VISIBILITY       = reg("scale.visibility",       "Scale (Visibility)",            0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_JUMP_HEIGHT      = reg("scale.jump_height",      "Scale (Jump Height)",           0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_FLIGHT           = reg("scale.flight",           "Scale (Flight Speed)",          0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_REACH            = reg("scale.reach",            "Scale (Reach)",                 0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_BLOCK_REACH      = reg("scale.block_reach",      "Scale (Block Reach)",           0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_ENTITY_REACH     = reg("scale.entity_reach",     "Scale (Entity Reach)",          0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_MINING_SPEED     = reg("scale.mining_speed",     "Scale (Mining Speed)",          0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_ATTACK_SPEED     = reg("scale.attack_speed",     "Scale (Attack Speed)",          0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_KNOCKBACK        = reg("scale.knockback",        "Scale (Knockback)",             0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_ATTACK           = reg("scale.attack",           "Scale (Attack)",                0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_DEFENSE          = reg("scale.defense",          "Scale (Defense)",               0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_HEALTH           = reg("scale.health",           "Scale (Health)",                0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_DROPS            = reg("scale.drops",            "Scale (Drops)",                 0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_HELD_ITEM        = reg("scale.held_item",        "Scale (Held Item)",             0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_PROJECTILES      = reg("scale.projectiles",      "Scale (Projectiles)",           0.0, Double.MAX_VALUE,  1.0);
    public static final DeferredHolder<Attribute, Attribute> SCALE_EXPLOSIONS       = reg("scale.explosions",       "Scale (Explosions)",            0.0, Double.MAX_VALUE,  1.0);

    //YCS_Attributes_START
    //YCS_Attributes_END

    private static DeferredHolder<Attribute, Attribute> reg(String path, String descKey, double min, double max, double def) {
        return ATTRIBUTES.register(path, () -> new RangedAttribute(descKey, def, min, max).setSyncable(true));
    }

    private ModAttributes() {}

    public static void register(IEventBus modEventBus) {
        ATTRIBUTES.register(modEventBus);
    }
}
