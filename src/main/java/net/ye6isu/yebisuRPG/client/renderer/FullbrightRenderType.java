package net.ye6isu.yebisuRPG.client.renderer;

import com.mojang.blaze3d.vertex.DefaultVertexFormat;
import com.mojang.blaze3d.vertex.VertexFormat;
import net.minecraft.client.renderer.RenderStateShard;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.ShaderInstance;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;

import java.util.HashMap;
import java.util.Map;

/**
 * Custom full-bright render type for first-person emissive glow.
 * Uses a custom shader that samples only the texture (Sampler0) and ignores
 * the lightmap (Sampler1) entirely — pixels are always rendered at full brightness.
 */
@OnlyIn(Dist.CLIENT)
public final class FullbrightRenderType {

    /** Set by ClientEvents.onRegisterShaders once the shader is loaded. */
    public static ShaderInstance shader = null;

    private static final Map<ResourceLocation, RenderType> CACHE = new HashMap<>();

    private FullbrightRenderType() {}

    public static RenderType get(ResourceLocation texture) {
        return CACHE.computeIfAbsent(texture, loc -> {
            RenderType.CompositeState state = RenderType.CompositeState.builder()
                .setShaderState(new RenderStateShard.ShaderStateShard(() -> shader))
                .setTextureState(new RenderStateShard.TextureStateShard(loc, false, false))
                .setTransparencyState(RenderStateShard.TRANSLUCENT_TRANSPARENCY)
                .setCullState(RenderStateShard.NO_CULL)
                .setWriteMaskState(RenderStateShard.COLOR_WRITE)
                .setDepthTestState(RenderStateShard.LEQUAL_DEPTH_TEST)
                .createCompositeState(false);
            return RenderType.create(
                "yebisurpg_fullbright",
                DefaultVertexFormat.NEW_ENTITY,
                VertexFormat.Mode.QUADS,
                1536,
                false,
                true,
                state
            );
        });
    }
}
