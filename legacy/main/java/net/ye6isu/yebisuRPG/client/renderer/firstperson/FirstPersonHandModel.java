package net.ye6isu.yebisuRPG.client.renderer.firstperson;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import net.minecraft.client.model.Model;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.model.geom.PartPose;
import net.minecraft.client.model.geom.builders.CubeListBuilder;
import net.minecraft.client.model.geom.builders.LayerDefinition;
import net.minecraft.client.model.geom.builders.MeshDefinition;
import net.minecraft.client.renderer.RenderType;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

/**
 * First-person arm + leg model built from the provided Bedrock geometry.
 *
 * Camera pivot: [0, 27, 4]
 *
 * Bedrock → Java conversion:
 *   partOffset.x  =  bedrockPivot.x - cameraPivot.x
 *   partOffset.y  = -(bedrockPivot.y - cameraPivot.y)
 *   partOffset.z  =  bedrockPivot.z - cameraPivot.z
 *   boxMin.x = cubeOrigin.x - bedrockPivot.x
 *   boxMin.y = -(cubeOrigin.y - bedrockPivot.y) - cubeHeight
 *   boxMin.z = cubeOrigin.z - bedrockPivot.z
 *
 * right_arm: pivot=[-8,21,-8]  offset=[-8, 6, -12]  box origin=[-11,11.07,-10] size=[4,12,4]
 *   boxMin = [-11-(-8), -(11.07-21)-12, -10-(-8)] = [-3, -1.07, -2]
 * left_arm:  pivot=[8,21,-8]   offset=[8, 6, -12]   box origin=[7,11.07,-10]  size=[4,12,4]
 *   boxMin = [7-8, -(11.07-21)-12, -10-(-8)] = [-1, -1.07, -2]
 *
 * right_leg: pivot=[-2,12,-8]  offset=[-2, 15, -12]  box origin=[-4,0,-10] size=[4,12,4]
 *   boxMin = [-4-(-2), -(0-12)-12, -10-(-8)] = [-2, 0, -2]
 * left_leg:  pivot=[2,12,-8]   offset=[2, 15, -12]   box origin=[0,0,-10]  size=[4,12,4]
 *   boxMin = [0-2, -(0-12)-12, -10-(-8)] = [-2, 0, -2]
 */
@OnlyIn(Dist.CLIENT)
public final class FirstPersonHandModel extends Model {

    public final ModelPart rightArm;
    public final ModelPart leftArm;
    public final ModelPart rightLeg;
    public final ModelPart leftLeg;

    public FirstPersonHandModel(ModelPart root) {
        super(RenderType::entitySolid);
        this.rightArm = root.getChild("right_arm");
        this.leftArm  = root.getChild("left_arm");
        this.rightLeg = root.getChild("right_leg");
        this.leftLeg  = root.getChild("left_leg");
    }

    public static LayerDefinition createLayer() {
        MeshDefinition mesh = new MeshDefinition();
        var root = mesh.getRoot();

        root.addOrReplaceChild("right_arm",
            CubeListBuilder.create()
                .texOffs(40, 16)
                .addBox(-3f, -2f, -2f, 4, 12, 4),
            PartPose.offset(-5f, 5f, -4f));

        root.addOrReplaceChild("left_arm",
            CubeListBuilder.create()
                .texOffs(32, 48)
                .addBox(-1f, -2f, -2f, 4, 12, 4),
            PartPose.offset(5f, 5f, -4f));

        root.addOrReplaceChild("right_leg",
            CubeListBuilder.create()
                .texOffs(0, 16)
                .addBox(-9f, -11.07f, -2f, 4, 12, 4),
            PartPose.offset(-2f, 15f, -12f));

        root.addOrReplaceChild("left_leg",
            CubeListBuilder.create()
                .texOffs(16, 48)
                .addBox(-2f, -0.07f, -2f, 4, 12, 4),
            PartPose.offset(9f, 4f, -12f));

        return LayerDefinition.create(mesh, 64, 64);
    }

    @Override
    public void renderToBuffer(PoseStack poseStack, VertexConsumer buffer,
                               int packedLight, int packedOverlay, int color) {
        rightArm.render(poseStack, buffer, packedLight, packedOverlay, color);
        leftArm.render(poseStack, buffer, packedLight, packedOverlay, color);
        rightLeg.render(poseStack, buffer, packedLight, packedOverlay, color);
        leftLeg.render(poseStack, buffer, packedLight, packedOverlay, color);
    }
}
