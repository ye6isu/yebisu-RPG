package net.ye6isu.yebisuRPG.attribute;

import net.minecraft.core.registries.Registries;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.RangedAttribute;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.ye6isu.yebisuRPG.yebisuRPG;

/**
 * Registers custom {@link Attribute}s for yebisu RPG entities (YCS "Attributes").
 * Read/modify via the standard vanilla attribute API — {@code entity.getAttribute(ModAttributes.YOUR_ATTR.get())}
 * — the same way vanilla attributes are accessed; see the Get/Set Attribute Blocky blocks.
 *
 * <p>YCS injects new attribute declarations above the {@code YCS_Attributes}
 * marker below.</p>
 */
public final class ModAttributes {

    public static final DeferredRegister<Attribute> ATTRIBUTES =
        DeferredRegister.create(Registries.ATTRIBUTE, yebisuRPG.MODID);

    public static DeferredHolder<Attribute, Attribute> registerAttribute(String name, double min, double base, double max, boolean syncable) {
        return ATTRIBUTES.register(name, () -> {
            RangedAttribute attribute = new RangedAttribute(yebisuRPG.MODID + "." + name, base, min, max);
            return syncable ? attribute.setSyncable(true) : attribute;
        });
    }

    // YCS_Attributes

    private ModAttributes() {}

    public static void register(IEventBus eventBus) {
        ATTRIBUTES.register(eventBus);
    }
}
