package net.ye6isu.yebisuRPG.entity.client;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import net.minecraft.client.model.HierarchicalModel;
import net.minecraft.client.model.geom.ModelLayerLocation;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.model.geom.PartPose;
import net.minecraft.client.model.geom.builders.*;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.util.Mth;
import net.ye6isu.yebisuRPG.entity.custom.JoeEntity;
import net.ye6isu.yebisuRPG.yebisuRPG;

public class JoeModel<T extends JoeEntity> extends HierarchicalModel<T> {

    public static final ModelLayerLocation LAYER_LOCATION = new ModelLayerLocation(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "joe"), "main");

    private final ModelPart bone;
    private final ModelPart head;


    public JoeModel(ModelPart root) {
        this.bone = root.getChild("bone");
        this.head = this.bone.getChild("head");
    }

    public static LayerDefinition createBodyLayer() {
        MeshDefinition meshdefinition = new MeshDefinition();
        PartDefinition partdefinition = meshdefinition.getRoot();

        PartDefinition bone = partdefinition.addOrReplaceChild("bone", CubeListBuilder.create(), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition head = bone.addOrReplaceChild("head", CubeListBuilder.create().texOffs(0, 0).addBox(-3.0F, -3.0F, -3.0F, 6.0F, 6.0F, 6.0F, new CubeDeformation(0.0F))
                .texOffs(-6, 12).addBox(-3.0F, 2.0F, -3.0F, 6.0F, 0.0F, 6.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, -7.0F, 0.0F));

        PartDefinition coverLeft = head.addOrReplaceChild("coverLeft", CubeListBuilder.create(), PartPose.offset(3.0F, 3.0F, 0.0F));

        PartDefinition cube_r1 = coverLeft.addOrReplaceChild("cube_r1", CubeListBuilder.create().texOffs(12, 12).addBox(0.0F, 0.0F, -3.0F, 0.0F, 3.0F, 6.0F, new CubeDeformation(0.0F)), PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, -0.5236F));

        PartDefinition coverRight = head.addOrReplaceChild("coverRight", CubeListBuilder.create(), PartPose.offset(-3.0F, 3.0F, 0.0F));

        PartDefinition cube_r2 = coverRight.addOrReplaceChild("cube_r2", CubeListBuilder.create().texOffs(0, 12).addBox(0.0F, 0.0F, -3.0F, 0.0F, 3.0F, 6.0F, new CubeDeformation(0.0F)), PartPose.offsetAndRotation(0.0F, 0.0F, 0.0F, 0.0F, 0.0F, 0.5236F));

        PartDefinition leftLeg = bone.addOrReplaceChild("leftLeg", CubeListBuilder.create().texOffs(0, 21).addBox(-1.0F, 0.0F, 0.0F, 1.0F, 4.0F, 1.0F, new CubeDeformation(0.0F))
                .texOffs(4, 21).addBox(-1.0F, 4.0F, -1.0F, 1.0F, 1.0F, 2.0F, new CubeDeformation(0.0F)), PartPose.offset(2.0F, -5.0F, 0.0F));

        PartDefinition rightLeg = bone.addOrReplaceChild("rightLeg", CubeListBuilder.create().texOffs(10, 21).addBox(0.0F, 0.0F, 0.0F, 1.0F, 4.0F, 1.0F, new CubeDeformation(0.0F))
                .texOffs(14, 21).addBox(0.0F, 4.0F, -1.0F, 1.0F, 1.0F, 2.0F, new CubeDeformation(0.0F)), PartPose.offset(-2.0F, -5.0F, 0.0F));

        return LayerDefinition.create(meshdefinition, 32, 32);
    }

    @Override
    public void setupAnim(JoeEntity entity, float limbSwing, float limbSwingAmount, float ageInTicks, float netHeadYaw, float headPitch) {
        this.root().getAllParts().forEach(ModelPart::resetPose);
        this.applyHeadRotation(netHeadYaw, headPitch);

        this.animateWalk(JoeAnimations.ANIM_JOE_WALK, limbSwing, limbSwingAmount, 2f, 2.5f);
        this.animate(entity.idleAnimationState, JoeAnimations.ANIM_JOE_IDLE, ageInTicks, 1f);

    }

    private void applyHeadRotation(float headYaw, float headPitch) {
        headYaw = Mth.clamp(headYaw, -30f, 30f);
        headPitch = Mth.clamp(headPitch, -25f, 45);

        this.head.yRot = headYaw * ((float)Math.PI / 180f);
        this.head.xRot = headPitch *  ((float)Math.PI / 180f);
    }

    @Override
    public void renderToBuffer(PoseStack poseStack, VertexConsumer vertexConsumer, int packedLight, int packedOverlay, int color) {
        bone.render(poseStack, vertexConsumer, packedLight, packedOverlay, color);
    }

    @Override
    public ModelPart root() {
        return bone;
    }

}
