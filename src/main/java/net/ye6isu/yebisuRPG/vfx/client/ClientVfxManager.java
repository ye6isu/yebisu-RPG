package net.ye6isu.yebisuRPG.vfx.client;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.renderer.LevelRenderer;
import net.minecraft.client.renderer.LightTexture;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.CameraType;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.util.Mth;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.neoforged.neoforge.client.event.RegisterClientReloadListenersEvent;
import net.neoforged.neoforge.client.event.RenderLevelStageEvent;
import net.ye6isu.yebisuRPG.texture.FrameLoopMode;
import net.ye6isu.yebisuRPG.texture.TextureFrameClock;
import net.ye6isu.yebisuRPG.vfx.network.VfxStartPayload;
import com.mojang.math.Axis;
import org.joml.Matrix4f;
import org.joml.Quaternionf;
import org.joml.Vector3f;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@OnlyIn(Dist.CLIENT)
public final class ClientVfxManager {

    private static final Map<UUID, Instance> ACTIVE = new HashMap<>();
    private static ClientLevel lastLevel;

    private ClientVfxManager() {}

    public static void start(VfxStartPayload payload) {
        ClientLevel level = Minecraft.getInstance().level;
        if (lastLevel != level) {
            ACTIVE.clear();
            lastLevel = level;
        }
        ACTIVE.put(payload.instanceId(), new Instance(
                payload.effectId(),
                new Vec3(payload.x(), payload.y(), payload.z()),
                payload.yawDegrees(),
                payload.pitchDegrees(),
                payload.anchorEntityId(),
                payload.followEntity(),
                payload.eyeLevel(),
                payload.followYaw(),
                payload.followPitch(),
                payload.viewSway(),
                payload.offsetX(),
                payload.offsetY(),
                payload.offsetZ(),
                payload.startTick()));
    }

    public static void remove(UUID instanceId) {
        ACTIVE.remove(instanceId);
    }

    public static void onRegisterReloadListeners(RegisterClientReloadListenersEvent event) {
        event.registerReloadListener(VfxDefinitionLoader.reloadListener());
    }

    public static void onRenderLevelStage(RenderLevelStageEvent event) {
        if (event.getStage() != RenderLevelStageEvent.Stage.AFTER_PARTICLES) return;
        Minecraft minecraft = Minecraft.getInstance();
        ClientLevel level = minecraft.level;
        if (level == null) {
            ACTIVE.clear();
            lastLevel = null;
            return;
        }
        if (lastLevel == null) {
            lastLevel = level;
        } else if (lastLevel != level) {
            ACTIVE.clear();
            lastLevel = level;
            return;
        }

        float partialTick = event.getPartialTick().getGameTimeDeltaPartialTick(false);
        double currentTick = level.getGameTime() + partialTick;
        MultiBufferSource.BufferSource buffers = minecraft.renderBuffers().bufferSource();
        Set<RenderType> usedTypes = new HashSet<>();

        Iterator<Map.Entry<UUID, Instance>> iterator = ACTIVE.entrySet().iterator();
        while (iterator.hasNext()) {
            Instance instance = iterator.next().getValue();
            VfxDefinition definition = VfxDefinitionLoader.get(instance.effectId());
            if (definition == null) {
                if (currentTick - instance.startTick() > 200.0) iterator.remove();
                continue;
            }

            double elapsed = currentTick - instance.startTick();
            if (elapsed >= definition.durationTicks() + 1.0) {
                iterator.remove();
                continue;
            }
            if (elapsed < 0.0) continue;

            InstanceTransform transform = resolveTransform(minecraft, event, level, instance, partialTick);
            if (transform == null) continue;
            for (VfxDefinition.Plane plane : definition.planes()) {
                if (elapsed < plane.startTick() || elapsed >= plane.endTick() + 1.0) continue;
                renderPlane(event, buffers, usedTypes, level, instance, transform, plane, elapsed);
            }
        }

        for (RenderType renderType : usedTypes) buffers.endBatch(renderType);
    }

    private static void renderPlane(
            RenderLevelStageEvent event,
            MultiBufferSource.BufferSource buffers,
            Set<RenderType> usedTypes,
            ClientLevel level,
            Instance instance,
            InstanceTransform transform,
            VfxDefinition.Plane plane,
            double elapsed
    ) {
        VfxDefinition.Position position = plane.positionAt(elapsed);
        VfxDefinition.Position rotation = plane.rotationAt(elapsed);
        VfxDefinition.Position scale = plane.scaleAt(elapsed);
        float rotationX = (float)rotation.x();
        float rotationY = (float)rotation.y();
        float rotationZ = (float)rotation.z();
        Vec3 worldPosition = transform.origin().add(rotateLocalOffset(
                transform,
                position.x(),
                position.y(),
                position.z()));
        Vec3 pivot = new Vec3(plane.pivotX(), plane.pivotY(), plane.pivotZ());
        Vec3 rotatedBackFromPivot = rotatePlaneOffset(
                -plane.pivotX(),
                -plane.pivotY(),
                -plane.pivotZ(),
                rotationX,
                rotationY,
                rotationZ);
        Vec3 worldPivot;
        Vec3 worldCenter;
        if (plane.billboard()) {
            Quaternionf cameraRotation = event.getCamera().rotation();
            worldPivot = worldPosition.add(rotateByQuaternion(cameraRotation, pivot));
            worldCenter = worldPosition.add(rotateByQuaternion(
                    cameraRotation,
                    pivot.add(rotatedBackFromPivot)));
        } else {
            worldPivot = transform.origin().add(rotateLocalOffset(
                    transform,
                    position.x() + plane.pivotX(),
                    position.y() + plane.pivotY(),
                    position.z() + plane.pivotZ()));
            worldCenter = transform.origin().add(rotateLocalOffset(
                    transform,
                    position.x() + plane.pivotX() + rotatedBackFromPivot.x,
                    position.y() + plane.pivotY() + rotatedBackFromPivot.y,
                    position.z() + plane.pivotZ() + rotatedBackFromPivot.z));
        }
        double scaledHalfWidth = plane.width() * Math.abs(scale.x()) * 0.5;
        double scaledHalfHeight = plane.height() * Math.abs(scale.y()) * 0.5;
        double radius = Math.sqrt(scaledHalfWidth * scaledHalfWidth + scaledHalfHeight * scaledHalfHeight);
        if (!event.getFrustum().isVisible(new AABB(
                worldCenter.x - radius,
                worldCenter.y - radius,
                worldCenter.z - radius,
                worldCenter.x + radius,
                worldCenter.y + radius,
                worldCenter.z + radius))) return;

        RenderType renderType = RenderType.entityTranslucent(plane.texture());
        usedTypes.add(renderType);
        VertexConsumer vertices = buffers.getBuffer(renderType);
        PoseStack poseStack = event.getPoseStack();
        Vec3 camera = event.getCamera().getPosition();

        poseStack.pushPose();
        Minecraft minecraft = Minecraft.getInstance();
        if (transform.cancelViewSway() && minecraft.options.bobView().get()) {
            cancelViewSway(poseStack, event, minecraft.player, event.getCamera().getPartialTickTime());
        }
        if (plane.billboard()) {
            poseStack.translate(
                    worldPivot.x - camera.x,
                    worldPivot.y - camera.y,
                    worldPivot.z - camera.z);
            poseStack.mulPose(event.getCamera().rotation());
            poseStack.mulPose(Axis.YP.rotationDegrees(rotationY));
            poseStack.mulPose(Axis.XP.rotationDegrees(rotationX));
            poseStack.mulPose(Axis.ZP.rotationDegrees(rotationZ));
            poseStack.translate(-plane.pivotX(), -plane.pivotY(), -plane.pivotZ());
        } else {
            poseStack.translate(
                    transform.origin().x - camera.x,
                    transform.origin().y - camera.y,
                    transform.origin().z - camera.z);
            poseStack.mulPose(Axis.YP.rotationDegrees(-transform.yawDegrees()));
            poseStack.mulPose(Axis.XP.rotationDegrees(transform.pitchDegrees()));
            poseStack.translate(
                    position.x() + plane.pivotX(),
                    position.y() + plane.pivotY(),
                    position.z() + plane.pivotZ());
            poseStack.mulPose(Axis.YP.rotationDegrees(rotationY));
            poseStack.mulPose(Axis.XP.rotationDegrees(rotationX));
            poseStack.mulPose(Axis.ZP.rotationDegrees(rotationZ));
            poseStack.translate(-plane.pivotX(), -plane.pivotY(), -plane.pivotZ());
        }
        poseStack.scale((float)scale.x(), (float)scale.y(), (float)scale.z());

        int frame = TextureFrameClock.frameAt(
                (long) Math.floor(instance.startTick() + elapsed),
                plane.ticksPerFrame(),
                plane.rows(),
                plane.textureLoop() ? FrameLoopMode.LOOP : FrameLoopMode.HOLD_LAST,
                instance.startTick() + plane.startTick());
        float v0 = (float) frame / plane.rows();
        float v1 = (float) (frame + 1) / plane.rows();
        float halfWidth = plane.width() * 0.5f;
        float halfHeight = plane.height() * 0.5f;
        int color = plane.color();
        int red = color >> 16 & 255;
        int green = color >> 8 & 255;
        int blue = color & 255;
        int alpha = Math.round(Mth.clamp(plane.opacityAt(elapsed), 0.0f, 1.0f) * 255.0f);
        int light = plane.fullBright()
                ? 0x00F000F0
                : samplePlaneLight(level, worldCenter);
        Matrix4f matrix = poseStack.last().pose();

        vertex(vertices, matrix, -halfWidth, -halfHeight, 0.0f, red, green, blue, alpha, 0.0f, v1, light);
        vertex(vertices, matrix, halfWidth, -halfHeight, 0.0f, red, green, blue, alpha, 1.0f, v1, light);
        vertex(vertices, matrix, halfWidth, halfHeight, 0.0f, red, green, blue, alpha, 1.0f, v0, light);
        vertex(vertices, matrix, -halfWidth, halfHeight, 0.0f, red, green, blue, alpha, 0.0f, v0, light);
        poseStack.popPose();
    }

    /**
     * Keeps a non-full-bright plane from turning dark as its center crosses into
     * a solid block. The quad still depth-tests normally; only its lighting is
     * sampled from the brightest immediately adjacent block boundary.
     */
    private static int samplePlaneLight(ClientLevel level, Vec3 worldPosition) {
        BlockPos center = BlockPos.containing(worldPosition);
        int light = LevelRenderer.getLightColor(level, center);
        int blockLight = LightTexture.block(light);
        int skyLight = LightTexture.sky(light);
        for (Direction direction : Direction.values()) {
            int adjacent = LevelRenderer.getLightColor(level, center.relative(direction));
            blockLight = Math.max(blockLight, LightTexture.block(adjacent));
            skyLight = Math.max(skyLight, LightTexture.sky(adjacent));
        }
        return LightTexture.pack(blockLight, skyLight);
    }

    /**
     * Removes walking view bob from the projection while preserving the camera's
     * yaw and pitch. Vanilla applies bob in camera space before the camera's
     * world-to-view rotation, so the inverse must be conjugated into world space
     * before it is added to this object pose.
     */
    private static void cancelViewSway(
            PoseStack poseStack,
            RenderLevelStageEvent event,
            Player player,
            float partialTick
    ) {
        if (player == null) return;

        float walkDelta = player.walkDist - player.walkDistO;
        float walkPhase = -(player.walkDist + walkDelta * partialTick);
        float bob = Mth.lerp(partialTick, player.oBob, player.bob);
        float translateX = Mth.sin(walkPhase * (float) Math.PI) * bob * 0.5F;
        float translateY = -Math.abs(Mth.cos(walkPhase * (float) Math.PI) * bob);
        float rotateZ = Mth.sin(walkPhase * (float) Math.PI) * bob * 3.0F;
        float rotateX = Math.abs(Mth.cos(walkPhase * (float) Math.PI - 0.2F) * bob) * 5.0F;

        Quaternionf cameraRotation = new Quaternionf(event.getCamera().rotation());
        poseStack.mulPose(cameraRotation);
        // Vanilla applies translate, Z rotation, then X rotation; undo it in reverse order.
        poseStack.mulPose(Axis.XP.rotationDegrees(-rotateX));
        poseStack.mulPose(Axis.ZP.rotationDegrees(-rotateZ));
        poseStack.translate(-translateX, -translateY, 0.0F);
        poseStack.mulPose(new Quaternionf(cameraRotation).conjugate());
    }

    private static InstanceTransform resolveTransform(
            Minecraft minecraft,
            RenderLevelStageEvent event,
            ClientLevel level,
            Instance instance,
            float partialTick
    ) {
        if (!instance.followEntity()) {
            return new InstanceTransform(instance.origin(), instance.yawDegrees(), instance.pitchDegrees(), false);
        }

        Entity anchor = level.getEntity(instance.anchorEntityId());
        if (anchor == null || anchor.isRemoved()) return null;
        boolean firstPersonEyeAnchor = instance.eyeLevel()
                && minecraft.options.getCameraType() == CameraType.FIRST_PERSON
                && event.getCamera().getEntity() == anchor;
        if (firstPersonEyeAnchor) {
            Vec3 cameraPosition = event.getCamera().getPosition();
            Vec3 origin = cameraPosition.add(instance.offsetX(), instance.offsetY(), instance.offsetZ());
            float yawDegrees = instance.followYaw() ? event.getCamera().getYRot() : instance.yawDegrees();
            float pitchDegrees = instance.followPitch() ? event.getCamera().getXRot() : instance.pitchDegrees();
            return new InstanceTransform(origin, yawDegrees, pitchDegrees, !instance.viewSway());
        }

        Vec3 anchorPosition = anchor.getPosition(partialTick);
        Vec3 origin = new Vec3(
                anchorPosition.x + instance.offsetX(),
                anchorPosition.y + (instance.eyeLevel() ? anchor.getEyeHeight() : 0.0) + instance.offsetY(),
                anchorPosition.z + instance.offsetZ());
        float yawDegrees = instance.followYaw() ? anchor.getViewYRot(partialTick) : instance.yawDegrees();
        float pitchDegrees = instance.followPitch() ? anchor.getViewXRot(partialTick) : instance.pitchDegrees();
        return new InstanceTransform(origin, yawDegrees, pitchDegrees, false);
    }

    private static Vec3 rotateLocalOffset(InstanceTransform transform, double x, double y, double z) {
        double pitchRadians = Math.toRadians(transform.pitchDegrees());
        double pitchCos = Math.cos(pitchRadians);
        double pitchSin = Math.sin(pitchRadians);
        double pitchedY = y * pitchCos - z * pitchSin;
        double pitchedZ = y * pitchSin + z * pitchCos;

        double yawRadians = Math.toRadians(-transform.yawDegrees());
        double yawCos = Math.cos(yawRadians);
        double yawSin = Math.sin(yawRadians);
        return new Vec3(
                x * yawCos + pitchedZ * yawSin,
                pitchedY,
                -x * yawSin + pitchedZ * yawCos);
    }

    private static Vec3 rotatePlaneOffset(
            double x,
            double y,
            double z,
            float rotationX,
            float rotationY,
            float rotationZ
    ) {
        return new Vec3(x, y, z)
                .zRot((float)Math.toRadians(rotationZ))
                .xRot((float)Math.toRadians(rotationX))
                .yRot((float)Math.toRadians(rotationY));
    }

    private static Vec3 rotateByQuaternion(Quaternionf rotation, Vec3 value) {
        Vector3f result = new Vector3f((float)value.x, (float)value.y, (float)value.z);
        rotation.transform(result);
        return new Vec3(result.x, result.y, result.z);
    }

    private static void vertex(
            VertexConsumer vertices,
            Matrix4f matrix,
            float x,
            float y,
            float z,
            int red,
            int green,
            int blue,
            int alpha,
            float u,
            float v,
            int light
    ) {
        vertices.addVertex(matrix, x, y, z)
                .setColor(red, green, blue, alpha)
                .setUv(u, v)
                .setOverlay(OverlayTexture.NO_OVERLAY)
                .setLight(light)
                .setNormal(0.0f, 0.0f, 1.0f);
    }

    private record Instance(
            String effectId,
            Vec3 origin,
            float yawDegrees,
            float pitchDegrees,
            int anchorEntityId,
            boolean followEntity,
            boolean eyeLevel,
            boolean followYaw,
            boolean followPitch,
            boolean viewSway,
            double offsetX,
            double offsetY,
            double offsetZ,
            long startTick
    ) {}

    private record InstanceTransform(
            Vec3 origin,
            float yawDegrees,
            float pitchDegrees,
            boolean cancelViewSway
    ) {}
}
