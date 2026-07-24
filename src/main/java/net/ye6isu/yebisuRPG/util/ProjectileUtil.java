package net.ye6isu.yebisuRPG.util;

import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.projectile.Projectile;
import net.minecraft.world.phys.Vec3;

public final class ProjectileUtil {
    private ProjectileUtil() {
    }

    public static void fire(Entity source, String projectileId, double x, double y, double z, float power) {
        if (source == null || source.level().isClientSide()) return;
        if (!(source.level() instanceof ServerLevel level)) return;

        EntityType<?> type = BuiltInRegistries.ENTITY_TYPE.get(ResourceLocation.parse(projectileId));
        Entity created = type.create(level);
        if (!(created instanceof Projectile projectile)) return;

        Vec3 direction = new Vec3(x, y, z);
        if (direction.lengthSqr() < 1.0E-6) {
            direction = source.getLookAngle();
        }

        projectile.setOwner(source);
        projectile.moveTo(
                source.getX(),
                source.getEyeY() - 0.1,
                source.getZ(),
                source.getYRot(),
                source.getXRot()
        );
        projectile.shoot(direction.x, direction.y, direction.z, Math.max(0.0F, power), 0.0F);
        level.addFreshEntity(projectile);
    }
}
