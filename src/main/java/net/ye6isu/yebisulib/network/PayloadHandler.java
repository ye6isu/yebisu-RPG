package net.ye6isu.yebisulib.network;

import net.neoforged.neoforge.network.handling.IPayloadContext;

/**
 * Functional interface for payload handler methods.
 *
 * <p>Both client and server handler classes follow this signature:</p>
 * <pre>{@code
 * public static void handle(MyPayload payload, IPayloadContext ctx) { ... }
 * }</pre>
 *
 * <p>Handlers run on the <b>main game thread</b> by default. For heavy work,
 * configure the registrar with {@code executesOn(HandlerThread.NETWORK)} and
 * use {@code ctx.enqueueWork(() -> ...)} to switch back to the main thread
 * when touching game state.</p>
 *
 * <h2>Server-handler checklist</h2>
 * <ul>
 *   <li>Cast {@code ctx.player()} to {@code ServerPlayer}.</li>
 *   <li>Validate all client-supplied values (range, null, permission).</li>
 *   <li>Never import {@code net.minecraft.client.*}.</li>
 * </ul>
 *
 * <h2>Client-handler checklist</h2>
 * <ul>
 *   <li>Annotate the class {@code @OnlyIn(Dist.CLIENT)}.</li>
 *   <li>Null-check {@code Minecraft.getInstance().player}.</li>
 *   <li>Register via {@link ClientHandlerProxy}, not directly in {@link NetworkRegistry}.</li>
 * </ul>
 *
 * @param <T> the payload type this handler processes
 */
@FunctionalInterface
public interface PayloadHandler<T extends BasePayload> {

    void handle(T payload, IPayloadContext ctx);
}
