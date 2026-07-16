package net.ye6isu.yebisuRPG.entity.custom;

import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.protocol.Packet;
import net.minecraft.network.protocol.game.ClientGamePacketListener;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.server.level.ServerEntity;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityDimensions;
import net.minecraft.world.entity.Pose;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.phys.AABB;
import net.neoforged.neoforge.entity.PartEntity;

/**
 * One extra, independently-hittable hitbox tracking a named bone on its parent
 * {@link YcsMobEntity} — the YCS analogue of vanilla's {@code EnderDragonPart}
 * (which uses the exact same {@link PartEntity} mechanism NeoForge exposes for
 * any modded multi-hitbox mob, not just the Ender Dragon). Used for things like
 * a boss's tail/head/wing each being separately hittable (e.g. a tail-swipe
 * ability that only checks for hits on the "tail" part).
 *
 * <p>Positioned every tick by {@link YcsMobEntity#tick()} via {@link
 * BonePoseSolver}, which recomputes the tracked bone's current world position
 * server-side (no client dependency — see {@link ServerGeoModelLoader}/{@link
 * ServerAnimationSampler}). Never spawned as its own tracked/synced entity on
 * the client ({@link #getAddEntityPacket} throws, matching {@code
 * EnderDragonPart}) — vanilla's own entity-selection queries (melee/projectile
 * hit-detection, {@code Level.getEntities}) already consult {@link
 * Entity#getParts()} for the parent automatically, so no client-side rendering
 * or networking of the part itself is needed for hit-detection to work.</p>
 */
public class YcsMobPartEntity extends PartEntity<YcsMobEntity> {

    private final YcsMobEntity parentMob;
    private final String partName;
    private final EntityDimensions size;

    public YcsMobPartEntity(YcsMobEntity parentMob, String partName, float width, float height) {
        super(parentMob);
        this.parentMob = parentMob;
        this.partName = partName;
        this.size = EntityDimensions.scalable(width, height);
        refreshDimensions();
    }

    public String partName() {
        return partName;
    }

    public void moveToBox(AABB box) {
        setPos((box.minX + box.maxX) * 0.5, box.minY, (box.minZ + box.maxZ) * 0.5);
        setBoundingBox(box);
    }

    @Override
    protected void defineSynchedData(SynchedEntityData.Builder builder) {}

    @Override
    protected void readAdditionalSaveData(CompoundTag compound) {}

    @Override
    protected void addAdditionalSaveData(CompoundTag compound) {}

    @Override
    public boolean isPickable() {
        return true;
    }

    @Override
    public ItemStack getPickResult() {
        return parentMob.getPickResult();
    }

    @Override
    public boolean hurt(DamageSource source, float amount) {
        if (isInvulnerableTo(source)) return false;
        return parentMob.hurtFromPart(this, source, amount);
    }

    @Override
    public boolean is(Entity entity) {
        return this == entity || parentMob == entity;
    }

    @Override
    public Packet<ClientGamePacketListener> getAddEntityPacket(ServerEntity entity) {
        throw new UnsupportedOperationException();
    }

    @Override
    public EntityDimensions getDimensions(Pose pose) {
        return size;
    }

    @Override
    public boolean shouldBeSaved() {
        return false;
    }
}
