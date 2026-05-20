package net.ye6isu.yebisulib.network;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.fml.loading.FMLEnvironment;
import net.neoforged.neoforge.network.handling.IPayloadContext;
import net.ye6isu.yebisulib.texture.network.TextureSyncPayload;

/**
 * Shared (server-loadable) proxy that routes S2C payloads to real client handlers.
 *
 * <h2>Why this exists</h2>
 * <p>NeoForge requires every {@code playToClient} channel to be registered on <em>both</em>
 * sides so they can negotiate channels at login. {@link NetworkRegistry} — which loads on
 * the dedicated server — passes handler references to {@code playToClient}. Those references
 * must belong to a class the server can load.</p>
 *
 * <p>This proxy contains <b>no client imports</b>. Each method guards the real handler call
 * with {@code if (dist == CLIENT)} and places the invocation inside a <em>local</em>
 * {@code Runnable}. Local variables are evaluated at runtime, so no invokedynamic bootstrap
 * entry for the client class appears in this class's constant pool → safe on the server.</p>
 *
 * <h2>Adding a new S2C payload — three steps</h2>
 * <ol>
 *   <li>Create the payload record implementing {@link BasePayload}.</li>
 *   <li>Create a {@code @OnlyIn(Dist.CLIENT)} handler with a static
 *       {@code handle(YourPayload, IPayloadContext)} method.</li>
 *   <li>Add a proxy method here and register it in {@link NetworkRegistry}:
 *       {@code registrar.playToClient(TYPE, CODEC, ClientHandlerProxy::onYourPayload);}</li>
 * </ol>
 *
 * <h2>Template</h2>
 * <pre>{@code
 * public static void onYourPayload(YourPayload payload, IPayloadContext ctx) {
 *     if (FMLEnvironment.dist == Dist.CLIENT) {
 *         Runnable call = () -> YourClientHandler.handle(payload, ctx);
 *         call.run();
 *     }
 * }
 * }</pre>
 */
public final class ClientHandlerProxy {

    private ClientHandlerProxy() {}

    // ---------------------------------------------------------------------------------
    // Texture system
    // ---------------------------------------------------------------------------------

    public static void onTextureSync(TextureSyncPayload payload, IPayloadContext ctx) {
        if (FMLEnvironment.dist == Dist.CLIENT) {
            Runnable call = () ->
                net.ye6isu.yebisulib.texture.network.TextureSyncClientHandler.handle(payload, ctx);
            call.run();
        }
    }

    // ---------------------------------------------------------------------------------
    // Entity variable sync
    // ---------------------------------------------------------------------------------

    public static void onVarSync(net.ye6isu.yebisuRPG.data.network.VarSyncPayload payload,
                                 IPayloadContext ctx) {
        if (FMLEnvironment.dist == Dist.CLIENT) {
            Runnable call = () ->
                net.ye6isu.yebisuRPG.data.network.VarSyncClientHandler.handle(payload, ctx);
            call.run();
        }
    }

    // ---------------------------------------------------------------------------------
    // Template for new S2C payloads
    // ---------------------------------------------------------------------------------
    //
    // public static void onYourPayload(YourPayload payload, IPayloadContext ctx) {
    //     if (FMLEnvironment.dist == Dist.CLIENT) {
    //         Runnable call = () -> YourClientHandler.handle(payload, ctx);
    //         call.run();
    //     }
    // }
}
