package net.ye6isu.yebisuRPG.entity;

import net.minecraft.world.damagesource.DamageSource;
import net.ye6isu.yebisuRPG.entity.custom.YcsMobEntity;
// YCS_Entity_Part_Hit_Imports

/**
 * Dispatch target for the "On Part Hit" Blocky graph, one per YCS entity that
 * has at least one configured hitbox part (see {@code ycs-data/entities/&lt;id&gt;.json}'s
 * {@code hitboxParts} and {@link net.ye6isu.yebisuRPG.entity.custom.YcsMobPartEntity}).
 * Mirrors {@code KeybindHandlers}'s dispatch-by-id pattern exactly, except keyed by
 * entity id instead of keybind id, and called from {@link
 * net.ye6isu.yebisuRPG.entity.custom.YcsMobEntity#onPartHit} rather than from client
 * input — a graph doesn't get its own case per *part*, since which part was hit is
 * exposed to the graph itself as a value (the "Hit Part Name" block) to branch on,
 * matching this file's single {@code case "<entityId>" -> { ... }} per entity.
 */
public final class EntityPartHitHandlers {

    private EntityPartHitHandlers() {}

    public static void dispatch(String entityId, String partName, YcsMobEntity self, DamageSource source, float damageAmount) {
        switch (entityId) {
            // YCS_Entity_Part_Hit_Dispatch
            default -> {}
        }
    }
}
