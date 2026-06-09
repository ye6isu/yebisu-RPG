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
 * First-person arm model built from the provided Bedrock geometry.
 *
 * Geometry hierarchy:
 *   root
 *    └─ right_arm  pivot [-5, 22, 0]  (relative to Camera pivot [0, 27, 4])
 *    └─ left_arm   pivot [ 5, 22, 0]
 *
 * The "Camera" bone is not a renderable part — it's just the origin.
 * We place the root at that camera origin and express each arm's pivot
 * as an offset from it.
 *
 * Bedrock → Java model conversion:
 *   partOffset.x  =  bedrockPivot.x  - cameraPivot.x
 *   partOffset.y  = -(bedrockPivot.y - cameraPivot.y)   (Y axis flips)
 *   partOffset.z  =  bedrockPivot.z  - cameraPivot.z
 *
 *   boxMin.x = cubeOrigin.x - bedrockPivot.x
 *   boxMin.y = -(cubeOrigin.y - bedrockPivot.y) - cubeHeight
 *   boxMin.z = cubeOrigin.z - bedrockPivot.z
 *
 * Camera pivot: [0, 27, 4]
 *
 * right_arm: bedrockPivot=[-5,22,0]  cubeOrigin=[-8,12,-2]  size=[4,12,4]
 *   partOffset = [-5-0, -(22-27), 0-4] = [-5, 5, -4]
 *   boxMin     = [-8-(-5), -(12-22)-12, -2-0] = [-3, -2, -2]
 *
 * left_arm: bedrockPivot=[5,22,0]  cubeOrigin=[4,12,-2]  size=[4,12,4]
 *   partOffset = [5-0, -(22-27), 0-4] = [5, 5, -4]
 *   boxMin     = [4-5, -(12-22)-12, -2-0] = [-1, -2, -2]
 *
 * UV from geometry (per-face box UVs, 64x64 skin):
 *   right_arm east=40,20  (standard vanilla right arm layout)
 *   left_arm  east=32,52  (standard vanilla left arm layout)
 */
@OnlyIn(Dist.CLIENT)
public final class FirstPersonHandModel extends Model {

    public final ModelPart rightArm;
    public final ModelPart leftArm;

    public FirstPersonHandModel(ModelPart root) {
        super(RenderType::entitySolid);
        this.rightArm = root.getChild("right_arm");
        this.leftArm  = root.getChild("left_arm");
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

        return LayerDefinition.create(mesh, 64, 64);
    }

    @Override
    public void renderToBuffer(PoseStack poseStack, VertexConsumer buffer,
                               int packedLight, int packedOverlay, int color) {
        rightArm.render(poseStack, buffer, packedLight, packedOverlay, color);
        leftArm.render(poseStack, buffer, packedLight, packedOverlay, color);
    }
}
