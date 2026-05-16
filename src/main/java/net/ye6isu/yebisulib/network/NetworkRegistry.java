package net.ye6isu.yebisulib.network;

import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.network.event.RegisterPayloadHandlersEvent;
import net.neoforged.neoforge.network.registration.PayloadRegistrar;

/**
 * Central registry for all S2C and C2S payloads in yebisuLib.
 *
 * <h2>Dedicated-server safety rules</h2>
 * <ul>
 *   <li><b>C2S</b> — register with {@code playToServer}. Server handlers must never
 *       import {@code net.minecraft.client.*}. Add directly below.</li>
 *   <li><b>S2C</b> — register with {@code playToClient(..., ClientHandlerProxy::method)}.
 *       The proxy lives in a shared class with no client imports; it guards the real
 *       {@code @OnlyIn(CLIENT)} handler behind a local {@code Runnable} resolved at
 *       runtime, not at class-load time. See {@link ClientHandlerProxy}.</li>
 * </ul>
 *
 * <h2>Adding a new packet — checklist</h2>
 * <ol>
 *   <li>Create a payload record implementing {@link BasePayload} (any package).</li>
 *   <li>For C2S: create a server-handler class, add {@code playToServer} below.</li>
 *   <li>For S2C: create a {@code @OnlyIn(CLIENT)} handler, add a proxy method to
 *       {@link ClientHandlerProxy}, add {@code playToClient} below.</li>
 *   <li>For high-frequency data (energy, stats): consider
 *       {@link net.ye6isu.yebisulib.network.util.NetworkThrottle NetworkThrottle} to avoid flooding 100+ clients.</li>
 * </ol>
 */
@EventBusSubscriber(modid = "yebisurpg")
public final class NetworkRegistry {

    /** Bump when the wire format changes incompatibly. */
    static final String NETWORK_VERSION = "1";

    private NetworkRegistry() {}

    @SubscribeEvent
    public static void register(final RegisterPayloadHandlersEvent event) {
        final PayloadRegistrar registrar = event.registrar(NETWORK_VERSION);

        // ---------------------------------------------------------------------------------
        // C2S  (client → server)
        // Safe to reference server-handler classes directly — they have no client imports.
        // ---------------------------------------------------------------------------------
        // registrar.playToServer(
        //     YourC2SPayload.TYPE,
        //     YourC2SPayload.STREAM_CODEC,
        //     YourServerHandler::handle
        // );

        // ---------------------------------------------------------------------------------
        // S2C  (server → client)
        // NEVER reference a @OnlyIn(CLIENT) class here — use ClientHandlerProxy instead.
        // ---------------------------------------------------------------------------------
        // registrar.playToClient(
        //     YourS2CPayload.TYPE,
        //     YourS2CPayload.STREAM_CODEC,
        //     ClientHandlerProxy::onYourPayload
        // );
    }

    /** Exposed so {@link ClientHandlerProxy} can reuse it without duplication. */
    public static String getNetworkVersion() {
        return NETWORK_VERSION;
    }
}
