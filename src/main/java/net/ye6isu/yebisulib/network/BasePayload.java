package net.ye6isu.yebisulib.network;

import net.minecraft.network.protocol.common.custom.CustomPacketPayload;

/**
 * Marker interface for all yebisuLib network payloads.
 *
 * <p>Every payload record must:</p>
 * <ol>
 *   <li>Implement this interface.</li>
 *   <li>Declare a {@code public static final CustomPacketPayload.Type<T> TYPE} field.</li>
 *   <li>Declare a {@code public static final StreamCodec<?, T> STREAM_CODEC} field.</li>
 *   <li>Return {@code TYPE} from {@link #type()}.</li>
 * </ol>
 *
 * <h2>Minimal example</h2>
 * <pre>{@code
 * public record EnergySyncPayload(int energy, int maxEnergy) implements BasePayload {
 *
 *     public static final CustomPacketPayload.Type<EnergySyncPayload> TYPE =
 *         new CustomPacketPayload.Type<>(
 *             ResourceLocation.fromNamespaceAndPath("yebisurpg", "energy_sync"));
 *
 *     public static final StreamCodec<ByteBuf, EnergySyncPayload> STREAM_CODEC =
 *         StreamCodec.composite(
 *             ByteBufCodecs.VAR_INT, EnergySyncPayload::energy,
 *             ByteBufCodecs.VAR_INT, EnergySyncPayload::maxEnergy,
 *             EnergySyncPayload::new);
 *
 *     @Override
 *     public CustomPacketPayload.Type<? extends CustomPacketPayload> type() {
 *         return TYPE;
 *     }
 * }
 * }</pre>
 *
 * <h2>Codec cheat-sheet</h2>
 * <ul>
 *   <li>Integers  — {@code ByteBufCodecs.VAR_INT} (efficient for small values)</li>
 *   <li>Floats    — {@code ByteBufCodecs.FLOAT}</li>
 *   <li>Booleans  — {@code ByteBufCodecs.BOOL}</li>
 *   <li>Strings   — {@code ByteBufCodecs.stringUtf8(maxLen)}</li>
 *   <li>NBT       — {@code ByteBufCodecs.COMPOUND_TAG}</li>
 *   <li>BlockPos  — {@code BlockPos.STREAM_CODEC}</li>
 *   <li>ItemStack — {@code ItemStack.STREAM_CODEC} (needs {@code RegistryFriendlyByteBuf})</li>
 * </ul>
 *
 * <h2>Size limits</h2>
 * <ul>
 *   <li>Client → Server: 32 KiB maximum</li>
 *   <li>Server → Client: 1 MiB maximum</li>
 * </ul>
 */
public interface BasePayload extends CustomPacketPayload {

    @Override
    CustomPacketPayload.Type<? extends CustomPacketPayload> type();
}
