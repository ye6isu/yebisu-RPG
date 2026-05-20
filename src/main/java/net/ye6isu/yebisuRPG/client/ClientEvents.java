package net.ye6isu.yebisuRPG.client;

/**
 * Client-side event handlers.
 *
 * <p>Render layers for the texture overlay system have been removed — the CPU
 * compositing path in {@link net.ye6isu.yebisuRPG.client.renderer.CompositeSkinManager}
 * bakes all overlays directly into the player's DynamicTexture and needs no
 * additional GPU render pass.</p>
 */
public final class ClientEvents {
    private ClientEvents() {}
}
