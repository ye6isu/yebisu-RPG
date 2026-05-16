package net.ye6isu.yebisulib.network;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.fml.loading.FMLEnvironment;
import net.neoforged.neoforge.network.handling.IPayloadContext;

/**
 * Shared (server-loadable) proxy that routes S2C payloads to real client handlers.
 *
 * <h2>Why this exists</h2>
 * <p>NeoForge requires every {@code playToClient} channel to be registered on <em>both</em>
 * sides so the two sides can negotiate channels at login. That forces {@link NetworkRegistry}
 * — which loads on the dedicated server — to pass a handler reference to
 * {@code playToClient}. That reference must belong to a class the server can load.
 * Any class that references {@code Minecraft} or other {@code net.minecraft.client.*}
 * types causes a {@code BootstrapMethodError} on the server because the JVM resolves
 * invokedynamic bootstrap entries at class-load time, before any runtime guard.</p>
 *
 * <p>This proxy contains <strong>no client imports</strong>. Each method guards the
 * real handler call with {@code if (dist == CLIENT)} and places the call inside a
 * <em>local</em> {@code Runnable} variable. Local variables are evaluated at runtime,
 * so no bootstrap entry for the client class appears in this class's constant pool.</p>
 *
 * <h2>Adding a new S2C payload — three steps</h2>
 * <ol>
 *   <li>Create the payload record implementing {@link BasePayload}.</li>
 *   <li>Create a {@code @OnlyIn(Dist.CLIENT)} handler class with a static
 *       {@code handle(YourPayload, IPayloadContext)} method.</li>
 *   <li>Add a proxy method here (copy the template below) and register it in
 *       {@link NetworkRegistry}:
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

    // Add proxy methods here as S2C payloads are introduced.
    // Example:
    //
    // public static void onEnergySync(EnergySyncPayload payload, IPayloadContext ctx) {
    //     if (FMLEnvironment.dist == Dist.CLIENT) {
    //         Runnable call = () -> EnergySyncClientHandler.handle(payload, ctx);
    //         call.run();
    //     }
    // }
}
